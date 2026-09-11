import type { AssetType } from '../types.js';

export class StageLayerComponent {
  public readonly stageEl: HTMLDivElement;
  public readonly backgroundEl: HTMLDivElement;
  public readonly charactersEl: HTMLDivElement;
  public readonly modeBadgeEl: HTMLDivElement;

  private bgLayerA: HTMLDivElement;
  private bgLayerB: HTMLDivElement;
  private activeBgLayer: 'A' | 'B' = 'A';
  private currentBgUrl = '';

  private activeCharacters = new Map<string, { div: HTMLDivElement; img: HTMLImageElement; expression?: string; position?: string }>();
  private pendingRemovals = new Map<string, { div: HTMLDivElement; timer: ReturnType<typeof setTimeout> }>();
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

    this.modeBadgeEl = document.createElement('div');
    this.modeBadgeEl.className = 'kawa-mode-badge';
    this.modeBadgeEl.style.display = 'none';

    this.stageEl.appendChild(this.backgroundEl);
    this.stageEl.appendChild(this.charactersEl);
    this.stageEl.appendChild(this.modeBadgeEl);
  }

  public updateBackground(background: string | null | undefined, transition: string | null | undefined): void {
    if (!background) {
      this.currentBgUrl = '';
      this.bgLayerA.style.backgroundImage = '';
      this.bgLayerB.style.backgroundImage = '';
      this.bgLayerA.classList.remove('active');
      this.bgLayerB.classList.remove('active');
      return;
    }

    this.backgroundEl.dataset.transition = transition ?? 'none';
    const cleanBg = background.replace(/^bg[\s_]+/i, '').trim();
    const primaryUrl = this.assetResolver(cleanBg, 'background');

    if (primaryUrl !== this.currentBgUrl) {
      this.currentBgUrl = primaryUrl;

      if (transition === 'fade') {
        const nextLayer = this.activeBgLayer === 'A' ? this.bgLayerB : this.bgLayerA;
        const curLayer = this.activeBgLayer === 'A' ? this.bgLayerA : this.bgLayerB;

        nextLayer.style.backgroundImage = `url("${primaryUrl}")`;
        nextLayer.classList.add('active');
        curLayer.classList.remove('active');

        this.activeBgLayer = this.activeBgLayer === 'A' ? 'B' : 'A';
      } else {
        const curLayer = this.activeBgLayer === 'A' ? this.bgLayerA : this.bgLayerB;
        curLayer.style.backgroundImage = `url("${primaryUrl}")`;
        curLayer.classList.add('active');
      }
    }
  }

  public updateCharacters(
    characters: Record<string, { expression?: string; position?: string; transition?: string }>
  ): void {
    const presentChars = new Set(Object.keys(characters));

    // Remove characters no longer in scene
    for (const [id, entry] of this.activeCharacters.entries()) {
      if (!presentChars.has(id)) {
        entry.div.style.opacity = '0';
        entry.div.style.transform = `translateY(20px)`;
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
      const assetKey = expr ? `${id}/${expr}` : id;
      const primaryUrl = this.assetResolver(assetKey, 'character');

      if (!this.activeCharacters.has(id)) {
        const div = document.createElement('div');
        div.className = `kawa-sprite kawa-pos-${pos}`;
        div.dataset.character = id;
        if (expr) div.dataset.expression = expr;

        const img = document.createElement('img');
        img.src = primaryUrl;
        img.alt = `${id} ${expr ?? ''}`;

        div.appendChild(img);
        this.charactersEl.appendChild(div);

        this.activeCharacters.set(id, { div, img, expression: expr, position: pos });
      } else {
        const existing = this.activeCharacters.get(id)!;

        // Position change
        if (existing.position !== pos) {
          existing.div.className = `kawa-sprite kawa-pos-${pos}`;
          existing.position = pos;
        }

        // Expression change
        if (existing.expression !== expr) {
          existing.img.src = primaryUrl;
          existing.expression = expr;
          if (expr) {
            existing.div.dataset.expression = expr;
          } else {
            delete existing.div.dataset.expression;
          }
        }
      }
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

    const flash = document.createElement('div');
    flash.className = 'kawa-flash-overlay';
    this.stageEl.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
  }
}
