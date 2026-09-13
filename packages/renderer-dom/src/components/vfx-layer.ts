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

export class VfxLayerComponent {
  public readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private particles: Particle[] = [];
  private currentEffect: string | null = null;
  private animationFrameId: number | null = null;
  private tintEl: HTMLDivElement;
  private fogEl: HTMLDivElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'kawa-vfx-layer';
    this.el.setAttribute('aria-hidden', 'true');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'kawa-vfx-canvas';
    this.ctx = this.canvas.getContext('2d');

    this.tintEl = document.createElement('div');
    this.tintEl.className = 'kawa-vfx-tint';
    this.tintEl.style.display = 'none';

    this.fogEl = document.createElement('div');
    this.fogEl.className = 'kawa-vfx-fog';
    this.fogEl.style.display = 'none';

    this.el.appendChild(this.canvas);
    this.el.appendChild(this.fogEl);
    this.el.appendChild(this.tintEl);

    this.initResize();
  }

  public setVfx(vfxState: VfxState | null): void {
    if (!vfxState || vfxState.effect === 'stop') {
      this.clear();
      return;
    }

    if (this.currentEffect === vfxState.effect && vfxState.effect !== 'tint') {
      return;
    }

    this.currentEffect = vfxState.effect;

    // Reset overlay elements
    this.tintEl.style.display = 'none';
    this.fogEl.style.display = 'none';

    if (vfxState.effect === 'tint') {
      this.stopParticleLoop();
      this.tintEl.style.display = 'block';
      this.tintEl.style.backgroundColor = vfxState.color || 'rgba(244, 63, 94, 0.2)';
      return;
    }

    if (vfxState.effect === 'fog') {
      this.stopParticleLoop();
      this.fogEl.style.display = 'block';
      return;
    }

    this.startParticleEffect(vfxState.effect, vfxState.intensity);
  }

  public clear(): void {
    this.currentEffect = null;
    this.stopParticleLoop();
    this.tintEl.style.display = 'none';
    this.fogEl.style.display = 'none';
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public destroy(): void {
    this.clear();
    this.el.remove();
  }

  private initResize(): void {
    const updateSize = () => {
      const rect = this.el.getBoundingClientRect();
      const w = rect.width || 1280;
      const h = rect.height || 720;
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateSize);
      setTimeout(updateSize, 50);
    }
  }

  private startParticleEffect(effect: string, intensity?: number | string): void {
    this.stopParticleLoop();
    const count = typeof intensity === 'number' ? Math.min(150, Math.max(10, intensity * 50)) : 50;

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

    const loop = () => {
      this.updateParticles(effect);
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
  }

  private updateParticles(effect: string): void {
    const w = this.canvas.width || 1280;
    const h = this.canvas.height || 720;

    for (const p of this.particles) {
      if (effect === 'sakura') {
        p.swingAngle = (p.swingAngle || 0) + (p.swingSpeed || 0.02);
        p.x += p.vx + Math.sin(p.swingAngle) * 1.2;
        p.y += p.vy;
        p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0.02);

        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        if (p.x > w + 20) {
          p.x = -20;
        }
      } else if (effect === 'rain') {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > h) {
          p.y = -20;
          p.x = Math.random() * (w + 100);
        }
      } else if (effect === 'snow') {
        p.swingAngle = (p.swingAngle || 0) + (p.swingSpeed || 0.02);
        p.x += p.vx + Math.sin(p.swingAngle) * 0.8;
        p.y += p.vy;
        if (p.y > h + 10) {
          p.y = -10;
          p.x = Math.random() * w;
        }
      }
    }
  }

  private renderParticles(effect: string): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (effect === 'sakura') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = '#fda4af'; // Soft sakura pink
        ctx.beginPath();
        // Draw petal curve
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect === 'rain') {
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 1.5, p.y + p.size);
        ctx.stroke();
      } else if (effect === 'snow') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
