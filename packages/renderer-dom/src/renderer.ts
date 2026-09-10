import type { StoryVM, StoryState, SaveSlot } from '@kawaijs/runtime';
import { SVG_ICONS } from './icons.js';
import {
  type DOMRendererOptions,
  type MainMenuOptions,
  type AssetType,
  defaultAssetResolver
} from './types.js';
import { StageLayerComponent } from './components/stage-layer.js';
import { DialogueBoxComponent } from './components/dialogue-box.js';
import { ChoiceMenuComponent } from './components/choice-menu.js';
import { QuickMenuComponent } from './components/quick-menu.js';
import { MainMenuComponent } from './components/main-menu.js';
import { showSaveLoadModal } from './modals/save-load-modal.js';
import { showSettingsModal } from './modals/settings-modal.js';
import { showHistoryModal } from './modals/history-modal.js';
import { showAboutModal } from './modals/about-modal.js';

export * from './icons.js';
export * from './types.js';
export * from './utils/rich-text.js';
export * from './modals/save-load-modal.js';
export * from './modals/settings-modal.js';
export * from './modals/history-modal.js';
export * from './modals/about-modal.js';
export * from './modals/confirm-modal.js';
export * from './components/main-menu.js';
export * from './components/dialogue-box.js';
export * from './components/choice-menu.js';
export * from './components/quick-menu.js';
export * from './components/stage-layer.js';

export class DOMRenderer {
  private readonly vm: StoryVM;
  private readonly container: HTMLElement;
  private typewriterSpeed: number;
  private autoDelayMs: number;
  private readonly assetResolver: (path: string, type: AssetType) => string;
  private readonly mainMenuOptions?: MainMenuOptions;

  private rootEl!: HTMLDivElement;
  private stageLayer!: StageLayerComponent;
  private dialogueBox!: DialogueBoxComponent;
  private choiceMenu!: ChoiceMenuComponent;
  private quickMenu!: QuickMenuComponent;
  private mainMenu!: MainMenuComponent;

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
    this.mainMenuOptions = options.mainMenu;

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

    // Default: Show Ren'Py-style Main Menu before entering story, unless disabled
    if (this.mainMenuOptions && this.mainMenuOptions.enabled !== false) {
      this.showMainMenu();
    } else {
      this.render(this.vm.getState());
    }
  }

  public destroy(): void {
    if (this.unsubscribeVMState) {
      this.unsubscribeVMState();
    }
    if (this.dialogueBox) {
      this.dialogueBox.destroy();
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
    this.stageLayer.shakeScreen(type);
  }

  public flashScreen(): void {
    this.stageLayer.flashScreen();
  }

  public toggleAutoMode(force?: boolean): void {
    this.isAutoMode = force !== undefined ? force : !this.isAutoMode;
    if (this.isAutoMode && this.isSkipMode) {
      this.toggleSkipMode(false);
    }
    this.updateModeUI();

    if (this.isAutoMode && !this.dialogueBox.getIsTypewriting()) {
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
          if (this.dialogueBox.getIsTypewriting()) {
            this.dialogueBox.finishTypewriter();
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

  public showMainMenu(): void {
    if (this.isAutoMode) this.toggleAutoMode(false);
    if (this.isSkipMode) this.toggleSkipMode(false);
    this.mainMenu.show();
  }

  public hideMainMenu(): void {
    this.mainMenu.hide();
  }

  public isMainMenuActive(): boolean {
    return this.mainMenu.isActive();
  }

  public startNewGame(): void {
    this.vm.start();
    this.hideMainMenu();
    this.mainMenuOptions?.onStart?.();
  }

  public async continueLatestGame(): Promise<boolean> {
    const saveManager = this.vm.getSaveManager();
    const slots = await saveManager.listSlots(10);
    const validSlots = slots.filter((s): s is SaveSlot => s !== null);
    if (validSlots.length === 0) return false;

    validSlots.sort((a, b) => b.timestamp - a.timestamp);
    const latest = validSlots[0]!;
    const ok = await this.vm.load(latest.id);
    if (ok) {
      this.hideMainMenu();
      return true;
    }
    return false;
  }

  public async showSaveLoadModal(mode: 'save' | 'load'): Promise<void> {
    await showSaveLoadModal(this.rootEl, this.vm, mode, () => {
      this.hideMainMenu();
    });
  }

  public showSettingsModal(): void {
    showSettingsModal(this.rootEl, {
      typewriterSpeed: this.typewriterSpeed,
      autoDelayMs: this.autoDelayMs,
      onSettingsChange: (s) => {
        this.typewriterSpeed = s.typewriterSpeed;
        this.autoDelayMs = s.autoDelayMs;
        this.dialogueBox.setTypewriterSpeed(this.typewriterSpeed);
        this.saveSettings();
      }
    });
  }

  public showHistoryModal(): void {
    showHistoryModal(this.rootEl, this.vm);
  }

  public showAboutModal(): void {
    showAboutModal(this.rootEl, this.mainMenuOptions);
  }

  private updateModeUI(): void {
    this.quickMenu.setAutoActive(this.isAutoMode);
    this.quickMenu.setSkipActive(this.isSkipMode);

    if (this.isSkipMode) {
      this.stageLayer.modeBadgeEl.innerHTML = `${SVG_ICONS.skip} SKIP`;
      this.stageLayer.modeBadgeEl.style.display = 'inline-flex';
    } else if (this.isAutoMode) {
      this.stageLayer.modeBadgeEl.innerHTML = `${SVG_ICONS.auto} AUTO`;
      this.stageLayer.modeBadgeEl.style.display = 'inline-flex';
    } else {
      this.stageLayer.modeBadgeEl.style.display = 'none';
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

    this.stageLayer = new StageLayerComponent(this.assetResolver);

    const uiLayerEl = document.createElement('div');
    uiLayerEl.className = 'kawa-ui-layer';

    this.choiceMenu = new ChoiceMenuComponent({
      onSelect: (index) => {
        this.vm.choose(index);
      }
    });

    this.dialogueBox = new DialogueBoxComponent(this.typewriterSpeed);

    this.quickMenu = new QuickMenuComponent({
      onTitle: () => this.showMainMenu(),
      onBack: () => {
        if (this.isAutoMode) this.toggleAutoMode(false);
        if (this.isSkipMode) this.toggleSkipMode(false);
        this.vm.rollback();
      },
      onHistory: () => this.showHistoryModal(),
      onAuto: () => this.toggleAutoMode(),
      onSkip: () => this.toggleSkipMode(),
      onSave: () => void this.showSaveLoadModal('save'),
      onLoad: () => void this.showSaveLoadModal('load'),
      onSettings: () => this.showSettingsModal()
    });

    uiLayerEl.appendChild(this.choiceMenu.el);
    uiLayerEl.appendChild(this.dialogueBox.el);
    uiLayerEl.appendChild(this.quickMenu.el);

    this.stageLayer.stageEl.appendChild(uiLayerEl);

    this.mainMenu = new MainMenuComponent(
      this.rootEl,
      this.vm,
      this.mainMenuOptions,
      {
        onStartNewGame: () => this.startNewGame(),
        onContinueGame: () => this.continueLatestGame(),
        assetResolver: this.assetResolver,
        getSettingsConfig: () => ({
          typewriterSpeed: this.typewriterSpeed,
          autoDelayMs: this.autoDelayMs,
          onSettingsChange: (s) => {
            this.typewriterSpeed = s.typewriterSpeed;
            this.autoDelayMs = s.autoDelayMs;
            this.dialogueBox.setTypewriterSpeed(this.typewriterSpeed);
            this.saveSettings();
          }
        })
      }
    );

    this.mainMenu.mount(this.stageLayer.stageEl);

    this.rootEl.appendChild(this.stageLayer.stageEl);
    this.container.appendChild(this.rootEl);
  }

  private bindEvents(): void {
    // Clicking on dialogue box advances or finishes typewriter
    this.dialogueBox.el.addEventListener('click', () => {
      if (this.isAutoMode) this.toggleAutoMode(false);
      if (this.isSkipMode) this.toggleSkipMode(false);
      this.handleUserAdvance();
    });

    // Keyboard controls
    this.boundKeyHandler = (e: KeyboardEvent) => {
      const modal = this.rootEl.querySelector('.kawa-modal-overlay');
      if (modal) {
        if (e.key === 'Escape') modal.remove();
        return;
      }

      if (this.isMainMenuActive()) {
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
        void this.showSaveLoadModal('save');
      } else if (e.key === 'l' || e.key === 'L') {
        void this.showSaveLoadModal('load');
      } else if (e.key === 'h' || e.key === 'H') {
        this.showHistoryModal();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'o' || e.key === 'O') {
        this.showSettingsModal();
      } else if (e.key === 'Escape') {
        this.showMainMenu();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.boundKeyHandler);
    }
  }

  private handleUserAdvance(): void {
    if (this.isMainMenuActive()) return;

    if (this.dialogueBox.getIsTypewriting()) {
      this.dialogueBox.finishTypewriter();
    } else {
      this.vm.next();
    }
  }

  private render(state: StoryState): void {
    this.quickMenu.setBackDisabled(!this.vm.canRollback());

    // 1. Background scene
    this.stageLayer.updateBackground(state.visual.background, state.visual.transition);

    // 2. Character sprites
    this.stageLayer.updateCharacters(state.visual.characters);

    // 3. Branching Choice Menu
    this.choiceMenu.render(state.choices);

    // 4. Dialogue Box
    this.dialogueBox.render(state.dialogue, () => {
      if (this.isAutoMode && !state.isFinished && (!state.choices || state.choices.length === 0)) {
        this.scheduleAutoAdvance();
      }
    });

    // 5. Ending Screen if finished
    if (state.isFinished) {
      this.renderEndingCard();
    } else {
      const endingEl = this.stageLayer.stageEl.querySelector('.kawa-ending-card');
      if (endingEl) endingEl.remove();
    }
  }

  private renderEndingCard(): void {
    const existing = this.stageLayer.stageEl.querySelector('.kawa-ending-card');
    if (existing) existing.remove();

    const endingCard = document.createElement('div');
    endingCard.className = 'kawa-ending-card';
    endingCard.setAttribute('role', 'alert');
    endingCard.setAttribute('aria-label', 'Story Finished');

    endingCard.innerHTML = `
      <div class="kawa-ending-title">The End</div>
      <div class="kawa-ending-subtitle">Thank you for playing!</div>
    `;

    const restartBtn = document.createElement('button');
    restartBtn.className = 'kawa-choice-btn';
    restartBtn.style.marginTop = '16px';
    restartBtn.innerHTML = `${SVG_ICONS.replay} Play Again`;
    restartBtn.addEventListener('click', () => {
      endingCard.remove();
      this.startNewGame();
    });

    const menuBtn = document.createElement('button');
    menuBtn.className = 'kawa-choice-btn';
    menuBtn.style.marginTop = '10px';
    menuBtn.innerHTML = `${SVG_ICONS.home} Main Menu`;
    menuBtn.addEventListener('click', () => {
      endingCard.remove();
      this.showMainMenu();
    });

    endingCard.appendChild(restartBtn);
    endingCard.appendChild(menuBtn);
    this.stageLayer.stageEl.appendChild(endingCard);
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
}
