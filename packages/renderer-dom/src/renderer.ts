import type { StoryPackage } from '@kawaijs/ast';
import type { StoryState, StoryVM, SaveSlot } from '@kawaijs/runtime';

export type AssetType = 'background' | 'character' | 'audio';

export function defaultAssetResolver(path: string, type: AssetType): string {
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('/') ||
    path.startsWith('./')
  ) {
    return path;
  }

  if (type === 'background') {
    const clean = path.replace(/^bg[\s_]+/i, '').trim();
    return clean.includes('.') ? `assets/backgrounds/${clean}` : `assets/backgrounds/${clean}.svg`;
  }

  if (type === 'character') {
    const clean = path.replace(/_/g, '/').replace(/\s+/g, '/').trim();
    return clean.includes('.') ? `assets/characters/${clean}` : `assets/characters/${clean}.svg`;
  }

  if (type === 'audio') {
    return path.includes('.') ? `assets/audio/${path}` : `assets/audio/${path}.mp3`;
  }

  return path;
}

/**
 * Preload all background and character assets mentioned in a story to eliminate visual flashes.
 */
export function preloadStoryAssets(story: StoryPackage, assetResolver: (path: string, type: AssetType) => string = defaultAssetResolver): void {
  if (typeof window === 'undefined') return;

  const bgSet = new Set<string>();
  const charSet = new Set<string>();

  for (const label of Object.values(story.labels)) {
    for (const inst of label) {
      if (inst.type === 'scene' && inst.background) {
        const clean = inst.background.replace(/^bg[\s_]+/i, '').trim();
        bgSet.add(clean);
      } else if (inst.type === 'show') {
        const key = inst.expression ? `${inst.character}/${inst.expression}` : inst.character;
        charSet.add(key);
      }
    }
  }

  for (const bg of bgSet) {
    const img = new Image();
    img.src = assetResolver(bg, 'background');
  }

  for (const char of charSet) {
    const img = new Image();
    img.src = assetResolver(char, 'character');
  }
}

export const SVG_ICONS = {
  back: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  history: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>',
  save: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  load: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  skip: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  volumeOn: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  volumeMute: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  replay: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
};

/**
 * Parses inline rich text markup: {b}...{/b}, {i}...{/i}, {color=#hex}...{/color}, {size=1.2em}...{/size}
 */
export function formatRichText(raw: string): string {
  let formatted = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // {b}...{/b}
  formatted = formatted.replace(/\{b\}(.*?)\{\/b\}/gi, '<strong class="kawa-bold">$1</strong>');
  // {i}...{/i}
  formatted = formatted.replace(/\{i\}(.*?)\{\/i\}/gi, '<em class="kawa-italic">$1</em>');
  // {color=#hex}...{/color}
  formatted = formatted.replace(/\{color=([^}]+)\}(.*?)\{\/color\}/gi, '<span style="color:$1">$2</span>');
  // {size=1.2em}...{/size}
  formatted = formatted.replace(/\{size=([^}]+)\}(.*?)\{\/size\}/gi, '<span style="font-size:$1">$2</span>');

  return formatted;
}

export interface DOMRendererOptions {
  container: HTMLElement;
  typewriterSpeed?: number; // ms per character, 0 for instant
  autoDelayMs?: number; // delay before auto-advancing
  assetResolver?: (path: string, type: AssetType) => string;
}

export class DOMRenderer {
  private readonly vm: StoryVM;
  private readonly container: HTMLElement;
  private typewriterSpeed: number;
  private autoDelayMs: number;
  private readonly assetResolver: (path: string, type: AssetType) => string;

  private rootEl!: HTMLDivElement;
  private stageEl!: HTMLDivElement;
  private backgroundEl!: HTMLDivElement;
  private bgLayerA!: HTMLDivElement;
  private bgLayerB!: HTMLDivElement;
  private activeBgLayer: 'A' | 'B' = 'A';
  private currentBgUrl = '';

  private charactersEl!: HTMLDivElement;
  private activeCharacters = new Map<string, { div: HTMLDivElement; img: HTMLImageElement; expression?: string; position?: string }>();

  private modeBadgeEl!: HTMLDivElement;
  private dialogueBoxEl!: HTMLDivElement;
  private speakerTagEl!: HTMLDivElement;
  private dialogueTextEl!: HTMLDivElement;
  private choiceContainerEl!: HTMLDivElement;
  private backBtnEl!: HTMLButtonElement;
  private autoBtnEl!: HTMLButtonElement;
  private skipBtnEl!: HTMLButtonElement;

  private currentTypewriterInterval: number | null = null;
  private isTypewriting = false;
  private fullCurrentText = '';
  private isChoicePending = false;
  private isAutoMode = false;
  private isSkipMode = false;
  private autoTimer: number | null = null;
  private skipInterval: number | null = null;

  private unsubscribeVMState?: () => void;
  private boundKeyHandler?: (e: KeyboardEvent) => void;

  constructor(vm: StoryVM, options: DOMRendererOptions) {
    this.vm = vm;
    this.container = options.container;
    this.typewriterSpeed = options.typewriterSpeed ?? 20;
    this.autoDelayMs = options.autoDelayMs ?? 1800;
    this.assetResolver = options.assetResolver ?? defaultAssetResolver;

    // Load saved settings if present
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('kawaijs_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.typewriterSpeed === 'number') this.typewriterSpeed = parsed.typewriterSpeed;
          if (typeof parsed.autoDelayMs === 'number') this.autoDelayMs = parsed.autoDelayMs;
        }
      } catch {}
    }

    this.buildDOM();
    this.bindEvents();

    this.unsubscribeVMState = this.vm.onStateChange((state) => {
      this.render(state);
    });

    // Render current initial state
    this.render(this.vm.getState());
  }

  public destroy(): void {
    if (this.unsubscribeVMState) {
      this.unsubscribeVMState();
    }
    if (this.currentTypewriterInterval) {
      clearInterval(this.currentTypewriterInterval);
    }
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
    }
    if (this.skipInterval) {
      clearInterval(this.skipInterval);
    }
    if (this.boundKeyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyHandler);
    }
    this.container.innerHTML = '';
  }

  public shakeScreen(type: 'shake' | 'vpunch' | 'hpunch' = 'shake'): void {
    if (!this.stageEl) return;
    this.stageEl.classList.remove('kawa-shake', 'kawa-vpunch', 'kawa-hpunch');
    // Trigger reflow
    void this.stageEl.offsetWidth;
    const cls = type === 'vpunch' ? 'kawa-vpunch' : type === 'hpunch' ? 'kawa-hpunch' : 'kawa-shake';
    this.stageEl.classList.add(cls);
  }

  public flashScreen(): void {
    if (!this.stageEl) return;
    const existing = this.stageEl.querySelector('.kawa-flash-overlay');
    if (existing) existing.remove();

    const flash = document.createElement('div');
    flash.className = 'kawa-flash-overlay';
    this.stageEl.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
  }

  public toggleAutoMode(force?: boolean): void {
    this.isAutoMode = force !== undefined ? force : !this.isAutoMode;
    if (this.isAutoMode && this.isSkipMode) {
      this.toggleSkipMode(false);
    }
    this.updateModeUI();

    if (this.isAutoMode && !this.isTypewriting) {
      this.scheduleAutoAdvance();
    } else if (!this.isAutoMode && this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }

  public toggleSkipMode(force?: boolean): void {
    this.isSkipMode = force !== undefined ? force : !this.isSkipMode;
    if (this.isSkipMode && this.isAutoMode) {
      this.toggleAutoMode(false);
    }
    this.updateModeUI();

    if (this.isSkipMode) {
      if (this.autoTimer) {
        clearTimeout(this.autoTimer);
        this.autoTimer = null;
      }
      if (!this.skipInterval) {
        this.skipInterval = window.setInterval(() => {
          const state = this.vm.getState();
          if (state.isFinished || (state.choices && state.choices.length > 0)) {
            this.toggleSkipMode(false);
            return;
          }
          if (this.isTypewriting) {
            this.finishTypewriter();
          }
          this.vm.next();
        }, 55);
      }
    } else {
      if (this.skipInterval) {
        clearInterval(this.skipInterval);
        this.skipInterval = null;
      }
    }
  }

  private updateModeUI(): void {
    if (this.autoBtnEl) {
      this.autoBtnEl.classList.toggle('active', this.isAutoMode);
    }
    if (this.skipBtnEl) {
      this.skipBtnEl.classList.toggle('active', this.isSkipMode);
    }
    if (this.modeBadgeEl) {
      if (this.isSkipMode) {
        this.modeBadgeEl.innerHTML = `${SVG_ICONS.skip} SKIP`;
        this.modeBadgeEl.style.display = 'inline-flex';
      } else if (this.isAutoMode) {
        this.modeBadgeEl.innerHTML = `${SVG_ICONS.auto} AUTO`;
        this.modeBadgeEl.style.display = 'inline-flex';
      } else {
        this.modeBadgeEl.style.display = 'none';
      }
    }
  }

  private scheduleAutoAdvance(): void {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
    if (!this.isAutoMode) return;

    const state = this.vm.getState();
    if (state.isFinished || (state.choices && state.choices.length > 0)) {
      return;
    }

    const duration = Math.max(800, this.autoDelayMs + (state.dialogue?.text.length ?? 0) * 15);
    this.autoTimer = window.setTimeout(() => {
      if (this.isAutoMode) {
        const cur = this.vm.getState();
        if (!cur.isFinished && (!cur.choices || cur.choices.length === 0)) {
          this.vm.next();
        }
      }
    }, duration);
  }

  private buildDOM(): void {
    this.container.innerHTML = '';

    this.rootEl = document.createElement('div');
    this.rootEl.className = 'kawa-root';

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

    // Mode Badge (Auto / Skip indicator)
    this.modeBadgeEl = document.createElement('div');
    this.modeBadgeEl.className = 'kawa-mode-badge';
    this.modeBadgeEl.style.display = 'none';

    const uiLayerEl = document.createElement('div');
    uiLayerEl.className = 'kawa-ui-layer';

    // Choice Container
    this.choiceContainerEl = document.createElement('div');
    this.choiceContainerEl.className = 'kawa-choice-container kawa-choices';
    this.choiceContainerEl.setAttribute('role', 'group');
    this.choiceContainerEl.setAttribute('aria-label', 'Choices');
    this.choiceContainerEl.style.display = 'none';

    // Dialogue Box
    this.dialogueBoxEl = document.createElement('div');
    this.dialogueBoxEl.className = 'kawa-dialogue-box kawa-dialogue';
    this.dialogueBoxEl.setAttribute('role', 'region');
    this.dialogueBoxEl.setAttribute('aria-label', 'Dialogue');
    this.dialogueBoxEl.setAttribute('tabindex', '0');

    this.speakerTagEl = document.createElement('div');
    this.speakerTagEl.className = 'kawa-speaker-tag kawa-speaker';

    this.dialogueTextEl = document.createElement('div');
    this.dialogueTextEl.className = 'kawa-dialogue-text kawa-text';
    this.dialogueTextEl.setAttribute('aria-live', 'polite');

    const indicatorEl = document.createElement('div');
    indicatorEl.className = 'kawa-continue-indicator';
    indicatorEl.setAttribute('aria-hidden', 'true');
    indicatorEl.innerHTML = SVG_ICONS.arrowDown;

    this.dialogueBoxEl.appendChild(this.speakerTagEl);
    this.dialogueBoxEl.appendChild(this.dialogueTextEl);
    this.dialogueBoxEl.appendChild(indicatorEl);

    // Quick Menu
    const quickMenuEl = document.createElement('nav');
    quickMenuEl.className = 'kawa-quick-menu';
    quickMenuEl.setAttribute('role', 'toolbar');
    quickMenuEl.setAttribute('aria-label', 'Game Menu');

    this.backBtnEl = document.createElement('button');
    this.backBtnEl.className = 'kawa-btn';
    this.backBtnEl.innerHTML = `${SVG_ICONS.back} <span>Back</span>`;
    this.backBtnEl.setAttribute('aria-label', 'Rollback to previous dialogue');

    const histBtn = document.createElement('button');
    histBtn.className = 'kawa-btn';
    histBtn.innerHTML = `${SVG_ICONS.history} <span>History</span>`;
    histBtn.setAttribute('aria-label', 'Open dialogue history log');
    histBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showHistoryModal();
    });

    this.autoBtnEl = document.createElement('button');
    this.autoBtnEl.className = 'kawa-btn';
    this.autoBtnEl.innerHTML = `${SVG_ICONS.auto} <span>Auto</span>`;
    this.autoBtnEl.setAttribute('aria-label', 'Toggle Auto Forward Mode');
    this.autoBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleAutoMode();
    });

    this.skipBtnEl = document.createElement('button');
    this.skipBtnEl.className = 'kawa-btn';
    this.skipBtnEl.innerHTML = `${SVG_ICONS.skip} <span>Skip</span>`;
    this.skipBtnEl.setAttribute('aria-label', 'Toggle Fast Forward Skip Mode');
    this.skipBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSkipMode();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'kawa-btn';
    saveBtn.innerHTML = `${SVG_ICONS.save} <span>Save</span>`;
    saveBtn.setAttribute('aria-label', 'Open save game menu');
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSaveLoadModal('save');
    });

    const loadBtn = document.createElement('button');
    loadBtn.className = 'kawa-btn';
    loadBtn.innerHTML = `${SVG_ICONS.load} <span>Load</span>`;
    loadBtn.setAttribute('aria-label', 'Open load game menu');
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSaveLoadModal('load');
    });

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'kawa-btn';
    settingsBtn.innerHTML = `${SVG_ICONS.settings} <span>Settings</span>`;
    settingsBtn.setAttribute('aria-label', 'Open Settings Menu');
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSettingsModal();
    });

    quickMenuEl.appendChild(this.backBtnEl);
    quickMenuEl.appendChild(histBtn);
    quickMenuEl.appendChild(this.autoBtnEl);
    quickMenuEl.appendChild(this.skipBtnEl);
    quickMenuEl.appendChild(saveBtn);
    quickMenuEl.appendChild(loadBtn);
    quickMenuEl.appendChild(settingsBtn);

    uiLayerEl.appendChild(this.choiceContainerEl);
    uiLayerEl.appendChild(this.dialogueBoxEl);
    uiLayerEl.appendChild(quickMenuEl);

    this.stageEl.appendChild(this.backgroundEl);
    this.stageEl.appendChild(this.charactersEl);
    this.stageEl.appendChild(this.modeBadgeEl);
    this.stageEl.appendChild(uiLayerEl);

    this.rootEl.appendChild(this.stageEl);
    this.container.appendChild(this.rootEl);
  }

  private bindEvents(): void {
    // Clicking on dialogue advances or finishes typewriter
    this.dialogueBoxEl.addEventListener('click', () => {
      if (this.isAutoMode) {
        this.toggleAutoMode(false);
      }
      if (this.isSkipMode) {
        this.toggleSkipMode(false);
      }
      this.handleUserAdvance();
    });

    this.backBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isAutoMode) this.toggleAutoMode(false);
      if (this.isSkipMode) this.toggleSkipMode(false);
      this.vm.rollback();
    });

    // Keyboard controls
    this.boundKeyHandler = (e: KeyboardEvent) => {
      const modal = this.rootEl.querySelector('.kawa-modal-overlay');
      if (modal) {
        if (e.key === 'Escape') modal.remove();
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
          return;
        }
        e.preventDefault();
        if (this.isAutoMode) this.toggleAutoMode(false);
        if (this.isSkipMode) this.toggleSkipMode(false);
        this.handleUserAdvance();
      } else if (e.code === 'Backspace') {
        e.preventDefault();
        if (this.isAutoMode) this.toggleAutoMode(false);
        if (this.isSkipMode) this.toggleSkipMode(false);
        this.vm.rollback();
      } else if (e.key === 'a' || e.key === 'A') {
        this.toggleAutoMode();
      } else if (e.key === 'Tab' || e.key === 'Control') {
        e.preventDefault();
        this.toggleSkipMode();
      } else if (e.key === 's' || e.key === 'S') {
        this.showSaveLoadModal('save');
      } else if (e.key === 'l' || e.key === 'L') {
        this.showSaveLoadModal('load');
      } else if (e.key === 'h' || e.key === 'H') {
        this.showHistoryModal();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'o' || e.key === 'O') {
        this.showSettingsModal();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.boundKeyHandler);
    }
  }

  private handleUserAdvance(): void {
    if (this.isTypewriting) {
      this.finishTypewriter();
    } else {
      this.vm.next();
    }
  }

  private render(state: StoryState): void {
    this.isChoicePending = false;
    this.backBtnEl.disabled = !this.vm.canRollback();

    // 1. Dual-Layer Background Crossfading
    if (state.visual.background) {
      this.backgroundEl.dataset.transition = state.visual.transition ?? 'none';
      const rawBg = state.visual.background;
      const cleanBg = rawBg.replace(/^bg[\s_]+/i, '').trim();
      const baseName = cleanBg.replace(/\.(svg|png|jpg|jpeg|webp)$/i, '');
      const primaryUrl = this.assetResolver(cleanBg, 'background');

      if (primaryUrl !== this.currentBgUrl) {
        this.currentBgUrl = primaryUrl;
        const incomingLayer = this.activeBgLayer === 'A' ? this.bgLayerB : this.bgLayerA;
        const outgoingLayer = this.activeBgLayer === 'A' ? this.bgLayerA : this.bgLayerB;

        incomingLayer.style.backgroundImage = `url("${primaryUrl}")`;
        incomingLayer.classList.add('active');
        outgoingLayer.classList.remove('active');
        this.activeBgLayer = this.activeBgLayer === 'A' ? 'B' : 'A';

        // Verify and fallback if image fails to load
        const testImg = new Image();
        testImg.onerror = () => {
          const fallbackPng = this.assetResolver(`${baseName}.png`, 'background');
          const img2 = new Image();
          img2.onload = () => {
            incomingLayer.style.backgroundImage = `url("${fallbackPng}")`;
          };
          img2.onerror = () => {
            incomingLayer.style.backgroundImage = 'radial-gradient(ellipse at center, #334155 0%, #0f172a 100%)';
          };
          img2.src = fallbackPng;
        };
        testImg.src = primaryUrl;
      }
    } else {
      this.currentBgUrl = '';
      this.bgLayerA.classList.remove('active');
      this.bgLayerB.classList.remove('active');
    }

    // 2. Character Sprites DOM Reconciliation
    const currentChars = state.visual.characters;
    const currentIds = new Set(Object.keys(currentChars));

    // Remove sprites no longer active
    for (const [id, record] of this.activeCharacters.entries()) {
      if (!currentIds.has(id)) {
        record.div.remove();
        this.activeCharacters.delete(id);
      }
    }

    // Add or update active sprites
    for (const [charId, charState] of Object.entries(currentChars)) {
      const posClass = `kawa-pos-${charState.position ?? 'center'}`;
      const charAssetKey = charState.expression ? `${charId}/${charState.expression}` : charId;
      const primarySpriteUrl = this.assetResolver(charAssetKey, 'character');

      let existing = this.activeCharacters.get(charId);
      if (!existing) {
        const spriteDiv = document.createElement('div');
        spriteDiv.className = `kawa-sprite ${posClass}`;
        spriteDiv.dataset.character = charId;
        if (charState.expression) {
          spriteDiv.dataset.expression = charState.expression;
        }

        const img = document.createElement('img');
        img.src = primarySpriteUrl;
        img.alt = `${charId} ${charState.expression ?? ''}`;

        let fallbackStep = 0;
        img.onerror = () => {
          fallbackStep++;
          if (fallbackStep === 1) {
            img.src = this.assetResolver(`${charAssetKey}.svg`, 'character');
          } else if (fallbackStep === 2 && charState.expression) {
            img.src = this.assetResolver(`${charId}_${charState.expression}`, 'character');
          } else if (fallbackStep === 3 && charState.expression) {
            img.src = this.assetResolver(`${charId}_${charState.expression}.svg`, 'character');
          } else {
            img.style.display = 'none';
            spriteDiv.style.width = '220px';
            spriteDiv.style.height = '420px';
            spriteDiv.style.background = 'rgba(244, 63, 94, 0.25)';
            spriteDiv.style.border = '2px dashed #f43f5e';
            spriteDiv.style.borderRadius = '16px';
            spriteDiv.style.display = 'flex';
            spriteDiv.style.alignItems = 'center';
            spriteDiv.style.justifyContent = 'center';
            spriteDiv.style.color = '#ffffff';
            spriteDiv.style.fontWeight = '600';
            spriteDiv.style.fontSize = '1.1rem';
            spriteDiv.textContent = `${charId}\n(${charState.expression ?? 'normal'})`;
          }
        };

        spriteDiv.appendChild(img);
        this.charactersEl.appendChild(spriteDiv);

        existing = {
          div: spriteDiv,
          img,
          expression: charState.expression,
          position: charState.position
        };
        this.activeCharacters.set(charId, existing);
      } else {
        existing.div.className = `kawa-sprite ${posClass}`;
        if (charState.expression) {
          existing.div.dataset.expression = charState.expression;
        } else {
          delete existing.div.dataset.expression;
        }
        if (existing.expression !== charState.expression) {
          existing.expression = charState.expression;
          existing.img.style.display = 'block';
          existing.img.src = primarySpriteUrl;
        }
      }
    }

    // Render dialogue
    if (state.dialogue) {
      this.dialogueBoxEl.style.display = 'block';

      if (state.dialogue.speakerDisplayName) {
        this.speakerTagEl.style.display = 'inline-block';
        this.speakerTagEl.textContent = state.dialogue.speakerDisplayName;
        if (state.dialogue.speakerColor) {
          this.speakerTagEl.style.backgroundColor = state.dialogue.speakerColor;
        }
      } else {
        this.speakerTagEl.style.display = 'none';
      }

      this.startTypewriter(state.dialogue.text);
    } else {
      this.dialogueBoxEl.style.display = 'none';
    }

    // Render choices
    if (state.choices && state.choices.length > 0) {
      if (this.isAutoMode) this.toggleAutoMode(false);
      if (this.isSkipMode) this.toggleSkipMode(false);

      this.choiceContainerEl.innerHTML = '';
      this.choiceContainerEl.style.display = 'flex';
      this.choiceContainerEl.style.pointerEvents = 'auto';
      this.choiceContainerEl.style.opacity = '1';

      state.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'kawa-choice-btn kawa-choice';
        btn.textContent = choice.text;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.isChoicePending) return;
          this.isChoicePending = true;
          this.choiceContainerEl.style.pointerEvents = 'none';
          this.choiceContainerEl.style.opacity = '0.5';
          this.vm.choose(index);
        });
        this.choiceContainerEl.appendChild(btn);
      });
    } else {
      this.choiceContainerEl.style.display = 'none';
    }

    // Render Ending Card if Story is Finished
    if (state.isFinished) {
      if (this.isAutoMode) this.toggleAutoMode(false);
      if (this.isSkipMode) this.toggleSkipMode(false);

      this.choiceContainerEl.style.display = 'none';
      const existingEnd = this.rootEl.querySelector('.kawa-ending-card');
      if (!existingEnd) {
        const endCard = document.createElement('div');
        endCard.className = 'kawa-ending-card';
        endCard.innerHTML = `
          <div class="kawa-ending-title">The End</div>
          <div class="kawa-ending-subtitle">Story complete! Thank you for playing.</div>
          <div style="display:flex;gap:12px;margin-top:16px;">
            <button class="kawa-btn kawa-btn-replay">${SVG_ICONS.replay} Play Again</button>
            <button class="kawa-btn kawa-btn-load-end">${SVG_ICONS.load} Load Slot</button>
          </div>
        `;
        endCard.querySelector('.kawa-btn-replay')?.addEventListener('click', () => {
          this.vm.jump('start');
        });
        endCard.querySelector('.kawa-btn-load-end')?.addEventListener('click', () => {
          this.showSaveLoadModal('load');
        });
        this.rootEl.appendChild(endCard);
      }
    } else {
      const existingEnd = this.rootEl.querySelector('.kawa-ending-card');
      if (existingEnd) existingEnd.remove();
    }
  }

  private startTypewriter(text: string): void {
    if (this.currentTypewriterInterval) {
      clearInterval(this.currentTypewriterInterval);
    }
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }

    this.fullCurrentText = text;

    if (this.typewriterSpeed <= 0 || this.isSkipMode) {
      this.dialogueTextEl.innerHTML = formatRichText(text);
      this.isTypewriting = false;
      if (this.isAutoMode) this.scheduleAutoAdvance();
      return;
    }

    this.isTypewriting = true;
    let index = 0;
    this.dialogueTextEl.innerHTML = '';

    this.currentTypewriterInterval = window.setInterval(() => {
      index += 1;
      this.dialogueTextEl.innerHTML = formatRichText(this.fullCurrentText.slice(0, index));
      if (index >= this.fullCurrentText.length) {
        this.finishTypewriter();
      }
    }, this.typewriterSpeed);
  }

  private finishTypewriter(): void {
    if (this.currentTypewriterInterval) {
      clearInterval(this.currentTypewriterInterval);
      this.currentTypewriterInterval = null;
    }
    this.dialogueTextEl.innerHTML = formatRichText(this.fullCurrentText);
    this.isTypewriting = false;

    if (this.isAutoMode) {
      this.scheduleAutoAdvance();
    }
  }

  public showSettingsModal(): void {
    const existing = this.rootEl.querySelector('.kawa-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'kawa-modal-overlay';

    const card = document.createElement('div');
    card.className = 'kawa-modal-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Settings');

    const header = document.createElement('div');
    header.className = 'kawa-modal-header';

    const title = document.createElement('div');
    title.className = 'kawa-modal-title';
    title.innerHTML = `${SVG_ICONS.settings} <span>Settings</span>`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kawa-btn';
    closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
    closeBtn.setAttribute('aria-label', 'Close settings modal');
    closeBtn.addEventListener('click', () => overlay.remove());

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'kawa-modal-body kawa-settings-group';

    // 1. Text Speed Slider
    const speedRow = document.createElement('div');
    speedRow.className = 'kawa-setting-row';
    const speedVal = this.typewriterSpeed;
    speedRow.innerHTML = `
      <div class="kawa-setting-header">
        <span>Text Speed</span>
        <span class="kawa-setting-value" id="kawa-speed-val">${speedVal === 0 ? 'Instant' : `${speedVal}ms`}</span>
      </div>
      <input type="range" class="kawa-slider" id="kawa-speed-slider" min="0" max="60" step="5" value="${speedVal}">
    `;
    const speedInput = speedRow.querySelector('#kawa-speed-slider') as HTMLInputElement;
    const speedValEl = speedRow.querySelector('#kawa-speed-val') as HTMLElement;
    speedInput.addEventListener('input', () => {
      this.typewriterSpeed = Number(speedInput.value);
      speedValEl.textContent = this.typewriterSpeed === 0 ? 'Instant' : `${this.typewriterSpeed}ms`;
      this.saveSettings();
    });

    // 2. Auto Forward Delay Slider
    const autoRow = document.createElement('div');
    autoRow.className = 'kawa-setting-row';
    const autoVal = (this.autoDelayMs / 1000).toFixed(1);
    autoRow.innerHTML = `
      <div class="kawa-setting-header">
        <span>Auto Forward Delay</span>
        <span class="kawa-setting-value" id="kawa-auto-val">${autoVal}s</span>
      </div>
      <input type="range" class="kawa-slider" id="kawa-auto-slider" min="500" max="5000" step="250" value="${this.autoDelayMs}">
    `;
    const autoInput = autoRow.querySelector('#kawa-auto-slider') as HTMLInputElement;
    const autoValEl = autoRow.querySelector('#kawa-auto-val') as HTMLElement;
    autoInput.addEventListener('input', () => {
      this.autoDelayMs = Number(autoInput.value);
      autoValEl.textContent = `${(this.autoDelayMs / 1000).toFixed(1)}s`;
      this.saveSettings();
    });

    // 3. Audio Volume Sliders
    const musicRow = document.createElement('div');
    musicRow.className = 'kawa-setting-row';
    musicRow.innerHTML = `
      <div class="kawa-setting-header">
        <span>${SVG_ICONS.volumeOn} Music Volume</span>
        <span class="kawa-setting-value" id="kawa-music-val">80%</span>
      </div>
      <input type="range" class="kawa-slider" id="kawa-music-slider" min="0" max="100" step="5" value="80">
    `;

    const sfxRow = document.createElement('div');
    sfxRow.className = 'kawa-setting-row';
    sfxRow.innerHTML = `
      <div class="kawa-setting-header">
        <span>${SVG_ICONS.volumeOn} SFX Volume</span>
        <span class="kawa-setting-value" id="kawa-sfx-val">100%</span>
      </div>
      <input type="range" class="kawa-slider" id="kawa-sfx-slider" min="0" max="100" step="5" value="100">
    `;

    body.appendChild(speedRow);
    body.appendChild(autoRow);
    body.appendChild(musicRow);
    body.appendChild(sfxRow);

    card.appendChild(header);
    card.appendChild(body);
    overlay.appendChild(card);
    this.rootEl.appendChild(overlay);
  }

  private saveSettings(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'kawaijs_settings',
          JSON.stringify({
            typewriterSpeed: this.typewriterSpeed,
            autoDelayMs: this.autoDelayMs
          })
        );
      } catch {}
    }
  }

  public async showSaveLoadModal(mode: 'save' | 'load'): Promise<void> {
    const existing = this.rootEl.querySelector('.kawa-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'kawa-modal-overlay';

    const card = document.createElement('div');
    card.className = 'kawa-modal-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', mode === 'save' ? 'Save Game' : 'Load Game');

    const header = document.createElement('div');
    header.className = 'kawa-modal-header';

    const title = document.createElement('div');
    title.className = 'kawa-modal-title';
    title.innerHTML = `${mode === 'save' ? SVG_ICONS.save : SVG_ICONS.load} <span>${mode === 'save' ? 'Save Game' : 'Load Game'}</span>`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kawa-btn';
    closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.addEventListener('click', () => overlay.remove());

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'kawa-modal-body';

    const grid = document.createElement('div');
    grid.className = 'kawa-slots-grid';

    const saveManager = this.vm.getSaveManager();
    const slots = await saveManager.listSlots(6);

    slots.forEach((slot: SaveSlot | null, idx: number) => {
      const slotNum = String(idx + 1);
      const slotCard = document.createElement('div');
      slotCard.className = 'kawa-slot-card';

      const slotHeader = document.createElement('div');
      slotHeader.className = 'kawa-slot-header';

      const badge = document.createElement('span');
      badge.className = 'kawa-slot-badge';
      badge.textContent = `Slot ${slotNum}`;

      const timeSpan = document.createElement('span');
      timeSpan.className = 'kawa-slot-time';
      timeSpan.textContent = slot ? new Date(slot.timestamp).toLocaleString() : 'Empty';

      slotHeader.appendChild(badge);
      slotHeader.appendChild(timeSpan);
      slotCard.appendChild(slotHeader);

      if (slot) {
        const preview = document.createElement('div');
        preview.className = 'kawa-slot-preview';
        preview.textContent = slot.previewText || `Label: ${slot.snapshot.state.currentLabel}`;
        slotCard.appendChild(preview);
      } else {
        const emptyText = document.createElement('div');
        emptyText.className = 'kawa-slot-empty-text';
        emptyText.textContent = 'No save data';
        slotCard.appendChild(emptyText);
      }

      const actions = document.createElement('div');
      actions.className = 'kawa-slot-actions';

      if (mode === 'save') {
        const saveActionBtn = document.createElement('button');
        saveActionBtn.className = 'kawa-slot-btn kawa-slot-btn-save';
        saveActionBtn.innerHTML = `${SVG_ICONS.save} Save Here`;
        saveActionBtn.setAttribute('aria-label', `Save to slot ${slotNum}`);
        saveActionBtn.addEventListener('click', async () => {
          await this.vm.save(slotNum);
          overlay.remove();
          this.showSaveLoadModal('save');
        });
        actions.appendChild(saveActionBtn);
      } else {
        if (slot) {
          const loadActionBtn = document.createElement('button');
          loadActionBtn.className = 'kawa-slot-btn kawa-slot-btn-load';
          loadActionBtn.innerHTML = `${SVG_ICONS.load} Load`;
          loadActionBtn.setAttribute('aria-label', `Load slot ${slotNum}`);
          loadActionBtn.addEventListener('click', async () => {
            const ok = await this.vm.load(slotNum);
            if (ok) overlay.remove();
          });
          actions.appendChild(loadActionBtn);
        }
      }

      if (slot) {
        const delBtn = document.createElement('button');
        delBtn.className = 'kawa-slot-btn kawa-slot-btn-del';
        delBtn.innerHTML = SVG_ICONS.trash;
        delBtn.title = 'Delete Save';
        delBtn.setAttribute('aria-label', `Delete slot ${slotNum}`);
        delBtn.addEventListener('click', async () => {
          await saveManager.deleteSlot(slotNum);
          overlay.remove();
          this.showSaveLoadModal(mode);
        });
        actions.appendChild(delBtn);
      }

      slotCard.appendChild(actions);
      grid.appendChild(slotCard);
    });

    body.appendChild(grid);
    card.appendChild(header);
    card.appendChild(body);
    overlay.appendChild(card);
    this.rootEl.appendChild(overlay);
  }

  public showHistoryModal(): void {
    const existing = this.rootEl.querySelector('.kawa-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'kawa-modal-overlay';

    const card = document.createElement('div');
    card.className = 'kawa-modal-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Dialogue History');

    const header = document.createElement('div');
    header.className = 'kawa-modal-header';

    const title = document.createElement('div');
    title.className = 'kawa-modal-title';
    title.innerHTML = `${SVG_ICONS.history} <span>Dialogue History</span>`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kawa-btn';
    closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
    closeBtn.setAttribute('aria-label', 'Close history modal');
    closeBtn.addEventListener('click', () => overlay.remove());

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'kawa-modal-body';

    const entries = this.vm.getHistoryManager().getEntries();
    if (entries.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.textContent = 'No dialogue history yet.';
      emptyMsg.style.opacity = '0.6';
      body.appendChild(emptyMsg);
    } else {
      for (const entry of entries) {
        const item = document.createElement('div');
        item.className = 'kawa-history-item';
        if (entry.speakerDisplayName) {
          const spk = document.createElement('div');
          spk.className = 'kawa-history-speaker';
          spk.textContent = entry.speakerDisplayName;
          item.appendChild(spk);
        }
        const txt = document.createElement('div');
        txt.innerHTML = formatRichText(entry.text);
        item.appendChild(txt);
        body.appendChild(item);
      }
    }

    card.appendChild(header);
    card.appendChild(body);
    overlay.appendChild(card);
    this.rootEl.appendChild(overlay);
  }
}
