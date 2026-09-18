import type { AssetType } from '../types.js';
import type { VfxState } from '@kawaijs/runtime';
import { VfxLayerComponent } from './vfx-layer.js';
import { escapeHtml } from '../utils/rich-text.js';
import { bindImageSrcFallbacks, characterAssetCandidates } from '../asset-fallbacks.js';

export class StageLayerComponent {
  public readonly stageEl: HTMLDivElement;
  public readonly backgroundEl: HTMLDivElement;
  public readonly charactersEl: HTMLDivElement;
  public readonly vfxLayer: VfxLayerComponent;
  public readonly cgEl: HTMLDivElement;
  public readonly modeBadgeEl: HTMLDivElement;

  private bgLayerA: HTMLDivElement;
  private bgLayerB: HTMLDivElement;
  private activeBgLayer: 'A' | 'B' = 'A';
  private currentBgUrl = '';

  private activeCharacters = new Map<
    string,
    {
      div: HTMLDivElement;
      img: HTMLImageElement;
      expression?: string;
      position?: string;
      transition?: string;
      z?: number;
      animToken?: number;
    }
  >();
  private pendingRemovals = new Map<string, { div: HTMLDivElement; timer: ReturnType<typeof setTimeout> }>();
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly assetResolver: (path: string, type: AssetType) => string;

  constructor(assetResolver: (path: string, type: AssetType) => string) {
    this.assetResolver = assetResolver;

    this.stageEl = document.createElement('div');
    this.stageEl.className = 'kawa-stage';
    this.stageEl.setAttribute('role', 'main');
    this.stageEl.setAttribute('aria-label', 'Visual Novel Stage');

    this.backgroundEl = document.createElement('div');
    this.backgroundEl.className = 'kawa-background';
    this.backgroundEl.setAttribute('aria-hidden', 'true');

    this.bgLayerA = document.createElement('div');
    this.bgLayerA.className = 'kawa-bg-layer active';
    this.bgLayerB = document.createElement('div');
    this.bgLayerB.className = 'kawa-bg-layer';

    this.backgroundEl.appendChild(this.bgLayerA);
    this.backgroundEl.appendChild(this.bgLayerB);

    this.charactersEl = document.createElement('div');
    this.charactersEl.className = 'kawa-characters kawa-sprites';
    this.charactersEl.setAttribute('aria-hidden', 'true');

    this.vfxLayer = new VfxLayerComponent();

    this.cgEl = document.createElement('div');
    this.cgEl.className = 'kawa-cg-layer';
    this.cgEl.style.display = 'none';

    this.modeBadgeEl = document.createElement('div');
    this.modeBadgeEl.className = 'kawa-mode-badge';
    this.modeBadgeEl.style.display = 'none';
    this.modeBadgeEl.setAttribute('aria-live', 'polite');
    this.modeBadgeEl.setAttribute('role', 'status');

    this.cgEl.setAttribute('aria-hidden', 'true');
    this.cgEl.setAttribute('role', 'presentation');
    this.stageEl.appendChild(this.backgroundEl);
    this.stageEl.appendChild(this.charactersEl);
    this.stageEl.appendChild(this.vfxLayer.el);
    this.stageEl.appendChild(this.cgEl);
    this.stageEl.appendChild(this.modeBadgeEl);
  }

  private bgVideoEl: HTMLVideoElement | null = null;
  private cgVideoEl: HTMLVideoElement | null = null;

  private isVideoPath(path: string): boolean {
    return /\.(webm|mp4|m4v|ogg|ogv)$/i.test(path) || path.startsWith('video:');
  }

  /** Safe CSS `url("...")` value — escapes quotes/backslashes that break background-image. */
  private cssUrl(url: string): string {
    const safe = String(url ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `url("${safe}")`;
  }

  public updateBackground(background: string | null | undefined, transition: string | null | undefined): void {
    if (!background) {
      this.currentBgUrl = '';
      this.bgLayerA.style.backgroundImage = '';
      this.bgLayerB.style.backgroundImage = '';
      this.bgLayerA.classList.remove('active');
      this.bgLayerB.classList.remove('active');
      if (this.bgVideoEl) {
        this.bgVideoEl.pause();
        this.bgVideoEl.remove();
        this.bgVideoEl = null;
      }
      return;
    }

    const transitionName = (transition ?? 'none').toLowerCase();
    this.backgroundEl.dataset.transition = transitionName;
    const cleanBg = background.replace(/^bg[\s_]+/i, '').replace(/^video:[\s_]*/i, '').trim();
    const isVideo = this.isVideoPath(background);
    const primaryUrl = this.assetResolver(cleanBg, 'background');

    if (primaryUrl !== this.currentBgUrl) {
      this.currentBgUrl = primaryUrl;

      if (isVideo) {
        // Video Background
        this.bgLayerA.classList.remove('active');
        this.bgLayerB.classList.remove('active');
        if (!this.bgVideoEl) {
          this.bgVideoEl = document.createElement('video');
          this.bgVideoEl.className = 'kawa-bg-video';
          this.bgVideoEl.autoplay = true;
          this.bgVideoEl.loop = true;
          this.bgVideoEl.muted = true;
          this.bgVideoEl.playsInline = true;
          this.bgVideoEl.setAttribute('aria-hidden', 'true');
          this.backgroundEl.appendChild(this.bgVideoEl);
        }
        this.bgVideoEl.src = primaryUrl;
        this.bgVideoEl.play().catch(() => {});
      } else {
        // Static Image Background
        if (this.bgVideoEl) {
          this.bgVideoEl.pause();
          this.bgVideoEl.remove();
          this.bgVideoEl = null;
        }

        const crossfade =
          transitionName === 'fade' ||
          transitionName === 'dissolve' ||
          transitionName === 'wipeleft' ||
          transitionName === 'wiperight' ||
          transitionName === 'wipeup' ||
          transitionName === 'wipedown' ||
          transitionName === 'circlewipe' ||
          transitionName === 'iris' ||
          transitionName === 'pushleft' ||
          transitionName === 'pushright' ||
          transitionName === 'pushup' ||
          transitionName === 'pushdown' ||
          transitionName === 'zoom' ||
          transitionName === 'blur' ||
          transitionName === 'glitch' ||
          transitionName === 'corrupt';

        if (crossfade) {
          const nextLayer = this.activeBgLayer === 'A' ? this.bgLayerB : this.bgLayerA;
          const curLayer = this.activeBgLayer === 'A' ? this.bgLayerA : this.bgLayerB;

          nextLayer.style.backgroundImage = this.cssUrl(primaryUrl);
          // Reset transition classes then apply for this transition
          const allTransClasses = [
            'kawa-wipe-from-left',
            'kawa-wipe-from-right',
            'kawa-wipe-from-up',
            'kawa-wipe-from-down',
            'kawa-wipe-circle',
            'kawa-push-from-left',
            'kawa-push-from-right',
            'kawa-push-from-up',
            'kawa-push-from-down',
            'kawa-zoom-in',
            'kawa-blur-transition',
            'kawa-glitch-transition'
          ];
          nextLayer.classList.remove(...allTransClasses);
          curLayer.classList.remove(...allTransClasses);

          if (transitionName === 'wipeleft') {
            nextLayer.classList.add('kawa-wipe-from-right');
          } else if (transitionName === 'wiperight') {
            nextLayer.classList.add('kawa-wipe-from-left');
          } else if (transitionName === 'wipeup') {
            nextLayer.classList.add('kawa-wipe-from-down');
          } else if (transitionName === 'wipedown') {
            nextLayer.classList.add('kawa-wipe-from-up');
          } else if (transitionName === 'circlewipe' || transitionName === 'iris') {
            nextLayer.classList.add('kawa-wipe-circle');
          } else if (transitionName === 'pushleft') {
            nextLayer.classList.add('kawa-push-from-right');
          } else if (transitionName === 'pushright') {
            nextLayer.classList.add('kawa-push-from-left');
          } else if (transitionName === 'pushup') {
            nextLayer.classList.add('kawa-push-from-down');
          } else if (transitionName === 'pushdown') {
            nextLayer.classList.add('kawa-push-from-up');
          } else if (transitionName === 'zoom') {
            nextLayer.classList.add('kawa-zoom-in');
          } else if (transitionName === 'blur') {
            nextLayer.classList.add('kawa-blur-transition');
          } else if (transitionName === 'glitch' || transitionName === 'corrupt') {
            nextLayer.classList.add('kawa-glitch-transition');
          }

          nextLayer.classList.add('active');
          curLayer.classList.remove('active');

          this.activeBgLayer = this.activeBgLayer === 'A' ? 'B' : 'A';
        } else {
          const curLayer = this.activeBgLayer === 'A' ? this.bgLayerA : this.bgLayerB;
          curLayer.style.backgroundImage = this.cssUrl(primaryUrl);
          curLayer.classList.add('active');
        }
      }
    }
  }

  public updateCharacters(
    characters: Record<
      string,
      {
        expression?: string;
        position?: string;
        transition?: string;
        layer?: string;
        z?: number;
        cssAnimation?: { name: string; durationMs?: number; token?: number };
      }
    >
  ): void {
    const presentChars = new Set(Object.keys(characters));

    // Remove characters no longer in scene
    for (const [id, entry] of this.activeCharacters.entries()) {
      if (!presentChars.has(id)) {
        entry.div.style.opacity = '0';
        // Preserve horizontal centering from .kawa-pos-* while fading out.
        entry.div.style.transform = 'translateX(-50%) translateY(20px)';
        const timer = setTimeout(() => {
          entry.div.remove();
          this.pendingRemovals.delete(id);
        }, 350);
        this.pendingRemovals.set(id, { div: entry.div, timer });
        this.activeCharacters.delete(id);
      }
    }

    // Add or update active characters
    for (const [id, charState] of Object.entries(characters)) {
      if (this.pendingRemovals.has(id)) {
        const pending = this.pendingRemovals.get(id)!;
        clearTimeout(pending.timer);
        pending.div.remove();
        this.pendingRemovals.delete(id);
      }

      const pos = charState.position ?? 'center';
      const expr = charState.expression;
      const z = typeof charState.z === 'number' ? charState.z : 10;
      const assetKey = expr ? `${id}/${expr}` : id;
      const candidates = characterAssetCandidates(assetKey, this.assetResolver);

      if (!this.activeCharacters.has(id)) {
        const div = document.createElement('div');
        div.className = `kawa-sprite kawa-pos-${pos}`;
        div.dataset.character = id;
        if (expr) div.dataset.expression = expr;
        if (charState.layer) div.dataset.layer = charState.layer;
        div.style.zIndex = String(z);

        const img = document.createElement('img');
        img.alt = `${id} ${expr ?? ''}`;
        img.decoding = 'async';
        bindImageSrcFallbacks(img, candidates, () => {
          img.style.display = 'none';
          if (!div.querySelector('.kawa-sprite-placeholder')) {
            const ph = document.createElement('div');
            ph.className = 'kawa-sprite-placeholder';
            ph.innerHTML = `<span class="kawa-sprite-placeholder-icon">👤</span><span class="kawa-sprite-placeholder-name">${escapeHtml(id)}</span>`;
            div.appendChild(ph);
          }
        });

        div.appendChild(img);
        this.charactersEl.appendChild(div);

        this.activeCharacters.set(id, { div, img, expression: expr, position: pos, z });
      } else {
        const existing = this.activeCharacters.get(id)!;

        // Position change
        if (existing.position !== pos) {
          existing.div.className = `kawa-sprite kawa-pos-${pos}`;
          // re-apply css anim class if any
          existing.position = pos;
        }

        if (existing.z !== z) {
          existing.div.style.zIndex = String(z);
          existing.z = z;
        }
        if (charState.layer) {
          existing.div.dataset.layer = charState.layer;
        }

        // Expression change
        if (existing.expression !== expr) {
          existing.img.style.display = 'block';
          bindImageSrcFallbacks(existing.img, candidates);
          existing.expression = expr;
          const ph = existing.div.querySelector('.kawa-sprite-placeholder');
          if (ph) ph.remove();
          if (expr) {
            existing.div.dataset.expression = expr;
          } else {
            delete existing.div.dataset.expression;
          }
        }

        // Sprite Animation/Transition if provided
        if (charState.transition) {
          existing.div.classList.remove('kawa-anim-bounce', 'kawa-anim-shake', 'kawa-anim-nod');
          void existing.div.offsetWidth; // Reflow
          existing.div.classList.add(`kawa-anim-${charState.transition}`);
        }
      }

      const entry = this.activeCharacters.get(id)!;
      // CSS-first animate directive
      if (charState.cssAnimation && charState.cssAnimation.token !== entry.animToken) {
        const anim = charState.cssAnimation.name;
        const className = `kawa-css-anim-${anim}`;
        entry.div.classList.forEach((cls) => {
          if (cls.startsWith('kawa-css-anim-')) entry.div.classList.remove(cls);
        });
        void entry.div.offsetWidth;
        entry.div.classList.add(className);
        if (charState.cssAnimation.durationMs) {
          entry.div.style.animationDuration = `${charState.cssAnimation.durationMs}ms`;
        } else {
          entry.div.style.removeProperty('animation-duration');
        }
        entry.animToken = charState.cssAnimation.token;
      }
    }
  }

  public updateVfx(vfxState: VfxState | null): void {
    this.vfxLayer.setVfx(vfxState);
  }

  public updateCG(cgPath: string | null): void {
    if (!cgPath) {
      this.cgEl.style.display = 'none';
      this.cgEl.style.backgroundImage = '';
      if (this.cgVideoEl) {
        this.cgVideoEl.pause();
        this.cgVideoEl.remove();
        this.cgVideoEl = null;
      }
    } else {
      const isVideo = this.isVideoPath(cgPath);
      const cleanCg = cgPath.replace(/^video:[\s_]*/i, '').trim();
      const url = this.assetResolver(cleanCg, 'background');

      if (isVideo) {
        this.cgEl.style.backgroundImage = '';
        if (!this.cgVideoEl) {
          this.cgVideoEl = document.createElement('video');
          this.cgVideoEl.className = 'kawa-cg-video';
          this.cgVideoEl.autoplay = true;
          this.cgVideoEl.loop = true;
          this.cgVideoEl.muted = true;
          this.cgVideoEl.playsInline = true;
          this.cgEl.appendChild(this.cgVideoEl);
        }
        this.cgVideoEl.src = url;
        this.cgVideoEl.play().catch(() => {});
      } else {
        if (this.cgVideoEl) {
          this.cgVideoEl.pause();
          this.cgVideoEl.remove();
          this.cgVideoEl = null;
        }
        this.cgEl.style.backgroundImage = this.cssUrl(url);
      }
      this.cgEl.style.display = 'block';
    }
  }

  public shakeScreen(type: 'shake' | 'vpunch' | 'hpunch' = 'shake'): void {
    this.stageEl.classList.remove('kawa-shake', 'kawa-vpunch', 'kawa-hpunch');
    void this.stageEl.offsetWidth; // Force reflow
    const cls = type === 'vpunch' ? 'kawa-vpunch' : type === 'hpunch' ? 'kawa-hpunch' : 'kawa-shake';
    this.stageEl.classList.add(cls);
  }

  public flashScreen(): void {
    const existing = this.stageEl.querySelector('.kawa-flash-overlay');
    if (existing) existing.remove();
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }

    const flash = document.createElement('div');
    flash.className = 'kawa-flash-overlay';
    this.stageEl.appendChild(flash);
    this.flashTimer = setTimeout(() => {
      this.flashTimer = null;
      flash.remove();
    }, 600);
  }

  public setSpeakingCharacter(characterId: string | null): void {
    const cleanId = characterId ? characterId.toLowerCase().trim() : null;
    for (const [charKey, charObj] of this.activeCharacters.entries()) {
      const matches = cleanId !== null && (charKey.toLowerCase() === cleanId || charKey.toLowerCase().startsWith(`${cleanId}/`));
      charObj.div.classList.toggle('kawa-speaking', matches);
    }
  }

  public destroy(): void {
    this.vfxLayer.destroy();
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
    for (const pending of this.pendingRemovals.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingRemovals.clear();
    this.activeCharacters.clear();
    if (this.bgVideoEl) {
      this.bgVideoEl.pause();
      this.bgVideoEl.remove();
      this.bgVideoEl = null;
    }
    if (this.cgVideoEl) {
      this.cgVideoEl.pause();
      this.cgVideoEl.remove();
      this.cgVideoEl = null;
    }
  }
}
