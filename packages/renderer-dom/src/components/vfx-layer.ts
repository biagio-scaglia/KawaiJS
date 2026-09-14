import type { VfxState } from '@kawaijs/runtime';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation?: number;
  rotationSpeed?: number;
  swingAngle?: number;
  swingSpeed?: number;
}

function isLowPowerClient(): boolean {
  if (typeof window === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return true;
  if (typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    if (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900) return true;
  }
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === 'number' && mem > 0 && mem <= 4) return true;
  return false;
}

export class VfxLayerComponent {
  public readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private particles: Particle[] = [];
  private currentEffect: string | null = null;
  private animationFrameId: number | null = null;
  private tintEl: HTMLDivElement;
  private fogEl: HTMLDivElement;
  private suspended = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private readonly lowPower: boolean;
  private lastFrameTs = 0;
  private targetFrameMs: number;

  private boundResizeHandler?: () => void;
  private boundVisibilityHandler?: () => void;

  constructor() {
    this.lowPower = isLowPowerClient();
    this.targetFrameMs = this.lowPower ? 1000 / 30 : 1000 / 60;

    this.el = document.createElement('div');
    this.el.className = 'kawa-vfx-layer';
    this.el.setAttribute('aria-hidden', 'true');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'kawa-vfx-canvas';
    this.ctx =
      this.canvas.getContext('2d', { alpha: true, desynchronized: true }) ??
      this.canvas.getContext('2d');

    this.tintEl = document.createElement('div');
    this.tintEl.className = 'kawa-vfx-tint';
    this.tintEl.style.display = 'none';

    this.fogEl = document.createElement('div');
    this.fogEl.className = 'kawa-vfx-fog';
    this.fogEl.style.display = 'none';

    this.el.appendChild(this.canvas);
    this.el.appendChild(this.fogEl);
    this.el.appendChild(this.tintEl);

    this.initListeners();
  }

  public setVfx(vfxState: VfxState | null): void {
    if (this.destroyed) return;
    if (!vfxState || vfxState.effect === 'stop') {
      this.clear();
      return;
    }

    if (vfxState.color || vfxState.effect === 'tint') {
      this.tintEl.style.display = 'block';
      this.tintEl.style.backgroundColor = vfxState.color || 'rgba(244, 63, 94, 0.2)';
    } else {
      this.tintEl.style.display = 'none';
    }

    if (vfxState.effect === 'tint') {
      if (!this.currentEffect || this.currentEffect === 'tint') {
        this.currentEffect = 'tint';
        this.stopParticleLoop();
        this.fogEl.style.display = 'none';
      }
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (
      (prefersReducedMotion || this.lowPower) &&
      (vfxState.effect === 'rain' ||
        vfxState.effect === 'snow' ||
        vfxState.effect === 'sakura')
    ) {
      // Keep a static light overlay instead of continuous particle rAF on weak devices.
      if (prefersReducedMotion) {
        this.stopParticleLoop();
        this.currentEffect = vfxState.effect;
        this.fogEl.style.display = 'none';
        return;
      }
      // lowPower still gets particles, but fewer + 30fps (handled below)
    }

    if (vfxState.effect === 'fog') {
      this.currentEffect = 'fog';
      this.stopParticleLoop();
      this.fogEl.style.display = 'block';
      return;
    }

    this.fogEl.style.display = 'none';

    if (this.currentEffect === vfxState.effect) {
      return;
    }

    this.currentEffect = vfxState.effect;

    if (this.suspended) {
      this.stopParticleLoop();
      return;
    }

    this.startParticleEffect(vfxState.effect, vfxState.intensity);
  }

  public setSuspended(suspended: boolean): void {
    if (this.suspended === suspended) return;
    this.suspended = suspended;
    if (suspended) {
      this.stopParticleLoop();
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    } else if (
      this.currentEffect &&
      this.currentEffect !== 'tint' &&
      this.currentEffect !== 'fog' &&
      this.currentEffect !== 'stop'
    ) {
      this.startParticleEffect(this.currentEffect);
    }
  }

  public clear(): void {
    this.currentEffect = null;
    this.stopParticleLoop();
    this.particles = [];
    this.tintEl.style.display = 'none';
    this.fogEl.style.display = 'none';
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.clear();
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    if (typeof window !== 'undefined' && this.boundResizeHandler) {
      window.removeEventListener('resize', this.boundResizeHandler);
    }
    if (typeof document !== 'undefined' && this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    this.el.remove();
  }

  private syncCanvasSize(): void {
    const rect = this.el.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width || (typeof window !== 'undefined' ? window.innerWidth : 1280)));
    const cssH = Math.max(1, Math.floor(rect.height || (typeof window !== 'undefined' ? window.innerHeight : 720)));
    const dprRaw = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const dpr = this.lowPower ? Math.min(1, dprRaw) : Math.min(1.5, dprRaw);
    // Cap absolute buffer size to limit GPU memory on large phones
    const maxEdge = this.lowPower ? 960 : 1440;
    const scale = Math.min(1, maxEdge / Math.max(cssW, cssH));
    const w = Math.max(1, Math.floor(cssW * dpr * scale));
    const h = Math.max(1, Math.floor(cssH * dpr * scale));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private initListeners(): void {
    if (typeof window !== 'undefined') {
      this.boundResizeHandler = () => {
        if (this.destroyed) return;
        this.syncCanvasSize();
      };
      window.addEventListener('resize', this.boundResizeHandler, { passive: true });
      this.resizeTimer = setTimeout(this.boundResizeHandler, 50);
    }

    if (typeof document !== 'undefined') {
      this.boundVisibilityHandler = () => {
        if (this.destroyed || this.suspended) return;
        if (document.hidden) {
          this.stopParticleLoop();
        } else if (this.currentEffect && this.currentEffect !== 'tint' && this.currentEffect !== 'fog') {
          this.startParticleEffect(this.currentEffect);
        }
      };
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }
  }

  private particleBudget(intensity?: number | string): number {
    const base =
      typeof intensity === 'number' ? Math.min(150, Math.max(10, intensity * 50)) : 50;
    if (this.lowPower) return Math.min(22, Math.max(10, Math.floor(base * 0.4)));
    return Math.min(80, base);
  }

  private startParticleEffect(effect: string, intensity?: number | string): void {
    if (this.destroyed || this.suspended) return;
    this.stopParticleLoop();
    this.syncCanvasSize();
    const count = this.particleBudget(intensity);

    const w = this.canvas.width || 1280;
    const h = this.canvas.height || 720;
    this.particles = [];

    for (let i = 0; i < count; i++) {
      if (effect === 'sakura') {
        this.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 1 + Math.random() * 1.5,
          vy: 1.5 + Math.random() * 2,
          size: 6 + Math.random() * 8,
          alpha: 0.6 + Math.random() * 0.4,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.04,
          swingAngle: Math.random() * Math.PI * 2,
          swingSpeed: 0.02 + Math.random() * 0.03
        });
      } else if (effect === 'rain') {
        this.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: -2 - Math.random() * 2,
          vy: 12 + Math.random() * 10,
          size: 15 + Math.random() * 12,
          alpha: 0.4 + Math.random() * 0.5
        });
      } else if (effect === 'snow') {
        this.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 1 + Math.random() * 2,
          size: 3 + Math.random() * 4,
          alpha: 0.5 + Math.random() * 0.5,
          swingAngle: Math.random() * Math.PI * 2,
          swingSpeed: 0.02 + Math.random() * 0.02
        });
      }
    }

    this.lastFrameTs = 0;
    const loop = (timestamp: number) => {
      if (this.destroyed || this.suspended) return;
      if (this.lastFrameTs && timestamp - this.lastFrameTs < this.targetFrameMs) {
        this.animationFrameId = requestAnimationFrame(loop);
        return;
      }
      const dt = this.lastFrameTs
        ? Math.min(0.1, Math.max(0.001, (timestamp - this.lastFrameTs) / 1000))
        : 1 / 60;
      this.lastFrameTs = timestamp;
      const speedFactor = dt * 60;

      this.updateParticles(effect, speedFactor);
      this.renderParticles(effect);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopParticleLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastFrameTs = 0;
  }

  private updateParticles(effect: string, speedFactor = 1): void {
    const w = this.canvas.width || 1280;
    const h = this.canvas.height || 720;

    for (const p of this.particles) {
      if (effect === 'sakura') {
        p.swingAngle = (p.swingAngle || 0) + (p.swingSpeed || 0.02) * speedFactor;
        p.x += (p.vx + Math.sin(p.swingAngle) * 1.5) * speedFactor;
        p.y += p.vy * speedFactor;
        p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0.02) * speedFactor;

        if (p.y > h + 30) {
          p.y = -30;
          p.x = Math.random() * (w + 40) - 20;
        } else if (p.y < -40) {
          p.y = h + 20;
          p.x = Math.random() * (w + 40) - 20;
        }
        if (p.x > w + 40) p.x = -20;
        if (p.x < -40) p.x = w + 20;
      } else if (effect === 'rain') {
        p.x += p.vx * speedFactor;
        p.y += p.vy * speedFactor;
        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        if (p.x < -20) p.x = w + 10;
      } else if (effect === 'snow') {
        p.swingAngle = (p.swingAngle || 0) + (p.swingSpeed || 0.02) * speedFactor;
        p.x += (p.vx + Math.sin(p.swingAngle) * 0.8) * speedFactor;
        p.y += p.vy * speedFactor;
        if (p.y > h + 10) {
          p.y = -10;
          p.x = Math.random() * w;
        }
        if (p.x > w + 10) p.x = -10;
        if (p.x < -10) p.x = w + 10;
      }
    }
  }

  private renderParticles(effect: string): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      if (effect === 'sakura') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.55, p.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (effect === 'rain') {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.4, p.y + p.size);
        ctx.stroke();
      } else if (effect === 'snow') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
