import type { StoryPackage } from '@kawaijs/ast';
import type { StoryVM, StoryState, SaveSlot, AudioEvent } from '@kawaijs/runtime';
import { AudioManager } from '@kawaijs/audio';
import { SVG_ICONS } from './icons.js';
import {
  type DOMRendererOptions,
  type MainMenuOptions,
  type AssetType,
  type AudioManagerLike,
  type GalleryItem,
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
import { showGalleryModal } from './modals/gallery-modal.js';

import { ViewportAdapter } from './layout/viewport-adapter.js';

export * from './icons.js';
export * from './types.js';
export * from './utils/rich-text.js';
export * from './layout/viewport-adapter.js';
export * from './modals/save-load-modal.js';
export * from './modals/settings-modal.js';
export * from './modals/history-modal.js';
export * from './modals/about-modal.js';
export * from './modals/gallery-modal.js';
export * from './modals/confirm-modal.js';
export * from './components/main-menu.js';
export * from './components/dialogue-box.js';
export * from './components/choice-menu.js';
export * from './components/quick-menu.js';
export * from './components/stage-layer.js';
export * from './components/vfx-layer.js';
export function extractGalleryItems(story?: StoryPackage): GalleryItem[] {
  if (!story || !story.labels) return [];
  const itemsMap = new Map<string, GalleryItem>();
  for (const label of Object.values(story.labels)) {
    for (const inst of label) {
      if (inst.type === 'cg' && inst.image) {
        const id = inst.unlockId ?? inst.image;
        if (!itemsMap.has(id)) {
          const rawBase = (inst.unlockId || inst.image).split(/[/\\]/).pop() || '';
          const cleanName = rawBase.replace(/^cg[\s_]+/i, '').replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
          const title = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : 'Event CG';
          itemsMap.set(id, {
            id,
            title,
            image: inst.image
          });
        }
      }
    }
  }
  return Array.from(itemsMap.values());
}

export class DOMRenderer {
  private readonly vm: StoryVM;
  private readonly container: HTMLElement;
  private readonly options: DOMRendererOptions;
  private typewriterSpeed: number;
  private autoDelayMs: number;
  private musicVolume: number;
  private soundVolume: number;
  private readonly assetResolver: (path: string, type: AssetType) => string;
  private readonly mainMenuOptions?: MainMenuOptions;
  private readonly audioManager?: AudioManagerLike;

  private rootEl!: HTMLDivElement;
  private stageLayer!: StageLayerComponent;
  private dialogueBox!: DialogueBoxComponent;
  private choiceMenu!: ChoiceMenuComponent;
  private quickMenu!: QuickMenuComponent;
  private mainMenu!: MainMenuComponent;
  private viewportAdapter?: ViewportAdapter;

  private isAutoMode = false;
  private isSkipMode = false;
  private autoTimer: number | null = null;
  private skipInterval: number | null = null;

  private unsubscribeVMState?: () => void;
  private unsubscribeCamera?: () => void;
  private unsubscribeAudio?: () => void;
  private unsubscribeError?: () => void;
  private boundKeyHandler?: (e: KeyboardEvent) => void;

  constructor(vm: StoryVM, options: DOMRendererOptions) {
    this.vm = vm;
    this.container = options.container;
    this.options = options;
    this.typewriterSpeed = options.typewriterSpeed ?? 20;
    this.autoDelayMs = options.autoDelayMs ?? 1800;
    this.assetResolver = options.assetResolver ?? defaultAssetResolver;

    let finalMainMenu = options.mainMenu;
    if (finalMainMenu?.enabled !== false && (!finalMainMenu?.galleryItems || finalMainMenu.galleryItems.length === 0)) {
      const autoItems = extractGalleryItems(this.vm.getStory());
      if (autoItems.length > 0) {
        finalMainMenu = {
          ...finalMainMenu,
          galleryItems: autoItems
        };
      }
    }
    this.mainMenuOptions = finalMainMenu;

    this.audioManager = options.audioManager ?? (typeof window !== 'undefined' ? new AudioManager() : undefined);
    this.musicVolume = this.audioManager?.getMusicVolume?.() ?? 0.8;
    this.soundVolume = this.audioManager?.getSoundVolume?.() ?? 1.0;

    // Load saved settings if present
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('kawaijs_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.typewriterSpeed === 'number') this.typewriterSpeed = parsed.typewriterSpeed;
          if (typeof parsed.autoDelayMs === 'number') this.autoDelayMs = parsed.autoDelayMs;
          if (typeof parsed.musicVolume === 'number') {
            this.musicVolume = parsed.musicVolume;
            this.audioManager?.setMusicVolume(this.musicVolume);
          }
          if (typeof parsed.soundVolume === 'number') {
            this.soundVolume = parsed.soundVolume;
            this.audioManager?.setSoundVolume(this.soundVolume);
          }
        }
      } catch {}
    }

    this.buildDOM();
    this.bindEvents();

    this.unsubscribeVMState = this.vm.onStateChange((state) => {
      this.render(state);
    });

    this.unsubscribeCamera = this.vm.onCameraEvent((e) => {
      if (e.action === 'flash') {
        this.flashScreen();
      } else {
        this.shakeScreen(e.action);
      }
    });

    this.unsubscribeAudio = this.vm.onAudioEvent((event: AudioEvent) => {
      if (!this.audioManager) return;

      if (event.action === 'play' && event.track) {
        const url = this.assetResolver(event.track, 'audio');
        if (event.channel === 'music') {
          this.audioManager.playMusic?.(url, { fadein: event.fade, loop: event.loop });
        } else if (event.channel === 'sound') {
          this.audioManager.playSound?.(url);
        } else if (event.channel === 'voice') {
          this.audioManager.playVoice?.(url);
        }
      } else if (event.action === 'stop') {
        if (event.channel === 'music') {
          this.audioManager.stopMusic?.({ fadeout: event.fade });
        } else if (event.channel === 'sound') {
          this.audioManager.stopSound?.();
        } else if (event.channel === 'voice') {
          this.audioManager.stopVoice?.();
        }
      }
    });

    this.unsubscribeError = this.vm.onError((err) => {
      this.showErrorToast(err.message);
      this.options.onError?.(err);
    });

    // Default: Show Ren'Py-style Main Menu before entering story, unless explicitly disabled
    if (this.mainMenuOptions?.enabled !== false) {
      this.showMainMenu();
    } else {
      this.render(this.vm.getState());
    }
  }

  public destroy(): void {
    if (this.unsubscribeVMState) {
      this.unsubscribeVMState();
    }
    if (this.unsubscribeCamera) {
      this.unsubscribeCamera();
    }
    if (this.unsubscribeAudio) {
      this.unsubscribeAudio();
    }
    if (this.audioManager && typeof this.audioManager.destroy === 'function') {
      this.audioManager.destroy();
    }
    if (this.unsubscribeError) {
      this.unsubscribeError();
    }
    if (this.dialogueBox) {
      this.dialogueBox.destroy();
    }
    if (this.stageLayer) {
      this.stageLayer.destroy();
    }
    if (this.viewportAdapter) {
      this.viewportAdapter.destroy();
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

  public showErrorToast(message: string): void {
    const existing = this.rootEl.querySelector('.kawa-error-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'kawa-error-toast';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span>⚠️</span>
      <span class="kawa-error-toast-msg">${message}</span>
      <button class="kawa-error-toast-close" aria-label="Dismiss error">${SVG_ICONS.close}</button>
    `;

    toast.querySelector('.kawa-error-toast-close')?.addEventListener('click', () => {
      toast.remove();
    });

    this.rootEl.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 8000);
  }

  public getViewportAdapter(): ViewportAdapter | undefined {
    return this.viewportAdapter;
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
      musicVolume: this.musicVolume,
      soundVolume: this.soundVolume,
      onSettingsChange: (s) => {
        this.typewriterSpeed = s.typewriterSpeed;
        this.autoDelayMs = s.autoDelayMs;
        if (s.musicVolume !== undefined) {
          this.musicVolume = s.musicVolume;
          this.audioManager?.setMusicVolume(this.musicVolume);
        }
        if (s.soundVolume !== undefined) {
          this.soundVolume = s.soundVolume;
          this.audioManager?.setSoundVolume(this.soundVolume);
        }
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

  public showGalleryModal(): void {
    const galleryItems = this.mainMenuOptions?.galleryItems ?? [];
    showGalleryModal(this.rootEl, this.vm, galleryItems, (path) =>
      this.assetResolver(path, 'background')
    );
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
          musicVolume: this.musicVolume,
          soundVolume: this.soundVolume,
          onSettingsChange: (s) => {
            this.typewriterSpeed = s.typewriterSpeed;
            this.autoDelayMs = s.autoDelayMs;
            if (s.musicVolume !== undefined) {
              this.musicVolume = s.musicVolume;
              this.audioManager?.setMusicVolume(this.musicVolume);
            }
            if (s.soundVolume !== undefined) {
              this.soundVolume = s.soundVolume;
              this.audioManager?.setSoundVolume(this.soundVolume);
            }
            this.dialogueBox.setTypewriterSpeed(this.typewriterSpeed);
            this.saveSettings();
          }
        })
      }
    );

    this.mainMenu.mount(this.stageLayer.stageEl);

    this.rootEl.appendChild(this.stageLayer.stageEl);
    this.container.appendChild(this.rootEl);

    this.viewportAdapter = new ViewportAdapter(
      this.container,
      this.stageLayer.stageEl,
      this.options.virtualCanvas
    );
  }

  private bindEvents(): void {
    // Clicking on stage or dialogue box advances or finishes typewriter
    this.stageLayer.stageEl.addEventListener('click', (e) => {
      if (this.isMainMenuActive()) return;
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('.kawa-quick-menu') ||
        target.closest('.kawa-choice-container') ||
        target.closest('.kawa-modal-overlay') ||
        target.closest('.kawa-ending-card')
      ) {
        return;
      }
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
        if (
          document.activeElement &&
          (document.activeElement.tagName === 'BUTTON' ||
            document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA')
        ) {
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
      return;
    }

    const state = this.vm.getState();
    if (state.choices && state.choices.length > 0) {
      return;
    }

    this.vm.next();
  }

  private render(state: StoryState): void {
    this.quickMenu.setBackDisabled(!this.vm.canRollback());

    // 1. Background scene
    this.stageLayer.updateBackground(state.visual.background, state.visual.transition);

    // 2. Character sprites
    this.stageLayer.updateCharacters(state.visual.characters);

    // 3. VFX & Atmospheric Layer
    this.stageLayer.updateVfx(state.visual.vfx);

    // 4. Fullscreen CG Layer
    this.stageLayer.updateCG(state.visual.activeCG);

    // 5. Branching Choice Menu
    this.choiceMenu.render(state.choices);

    // 6. Dialogue Box
    this.dialogueBox.render(state.dialogue, () => {
      if (this.isAutoMode && !state.isFinished && (!state.choices || state.choices.length === 0)) {
        this.scheduleAutoAdvance();
      }
    });

    // 7. Ending Screen if finished
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
            autoDelayMs: this.autoDelayMs,
            musicVolume: this.musicVolume,
            soundVolume: this.soundVolume
          })
        );
      } catch {}
    }
  }
}
