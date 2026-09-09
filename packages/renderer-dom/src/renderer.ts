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

export interface DOMRendererOptions {
  container: HTMLElement;
  typewriterSpeed?: number; // ms per character, 0 for instant
  assetResolver?: (path: string, type: AssetType) => string;
}

export class DOMRenderer {
  private readonly vm: StoryVM;
  private readonly container: HTMLElement;
  private readonly typewriterSpeed: number;
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

  private dialogueBoxEl!: HTMLDivElement;
  private speakerTagEl!: HTMLDivElement;
  private dialogueTextEl!: HTMLDivElement;
  private choiceContainerEl!: HTMLDivElement;
  private backBtnEl!: HTMLButtonElement;

  private currentTypewriterInterval: number | null = null;
  private isTypewriting = false;
  private fullCurrentText = '';
  private isChoicePending = false;
  private unsubscribeVMState?: () => void;
  private boundKeyHandler?: (e: KeyboardEvent) => void;

  constructor(vm: StoryVM, options: DOMRendererOptions) {
    this.vm = vm;
    this.container = options.container;
    this.typewriterSpeed = options.typewriterSpeed ?? 20;
    this.assetResolver = options.assetResolver ?? defaultAssetResolver;

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
    if (this.boundKeyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyHandler);
    }
    this.container.innerHTML = '';
  }

  public shakeScreen(): void {
    if (!this.stageEl) return;
    this.stageEl.classList.remove('kawa-shake');
    // Trigger reflow to restart animation
    void this.stageEl.offsetWidth;
    this.stageEl.classList.add('kawa-shake');
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
    indicatorEl.innerHTML = '&#9660;';

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
    this.backBtnEl.textContent = 'Back';
    this.backBtnEl.setAttribute('aria-label', 'Rollback to previous dialogue');

    const histBtn = document.createElement('button');
    histBtn.className = 'kawa-btn';
    histBtn.textContent = 'History';
    histBtn.setAttribute('aria-label', 'Open dialogue history log');
    histBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showHistoryModal();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'kawa-btn';
    saveBtn.textContent = 'Save';
    saveBtn.setAttribute('aria-label', 'Open save game menu');
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSaveLoadModal('save');
    });

    const loadBtn = document.createElement('button');
    loadBtn.className = 'kawa-btn';
    loadBtn.textContent = 'Load';
    loadBtn.setAttribute('aria-label', 'Open load game menu');
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSaveLoadModal('load');
    });

    quickMenuEl.appendChild(this.backBtnEl);
    quickMenuEl.appendChild(histBtn);
    quickMenuEl.appendChild(saveBtn);
    quickMenuEl.appendChild(loadBtn);

    uiLayerEl.appendChild(this.choiceContainerEl);
    uiLayerEl.appendChild(this.dialogueBoxEl);
    uiLayerEl.appendChild(quickMenuEl);

    this.stageEl.appendChild(this.backgroundEl);
    this.stageEl.appendChild(this.charactersEl);
    this.stageEl.appendChild(uiLayerEl);

    this.rootEl.appendChild(this.stageEl);
    this.container.appendChild(this.rootEl);
  }

  private bindEvents(): void {
    // Clicking on dialogue advances or finishes typewriter
    this.dialogueBoxEl.addEventListener('click', () => {
      this.handleUserAdvance();
    });

    this.backBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.vm.rollback();
    });

    // Keyboard controls
    this.boundKeyHandler = (e: KeyboardEvent) => {
      // If modal is open, let Escape close it
      const modal = this.rootEl.querySelector('.kawa-modal-overlay');
      if (modal) {
        if (e.key === 'Escape') modal.remove();
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        // If focusing a button, let the default click happen
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
          return;
        }
        e.preventDefault();
        this.handleUserAdvance();
      } else if (e.code === 'Backspace') {
        e.preventDefault();
        this.vm.rollback();
      } else if (e.key === 's' || e.key === 'S') {
        this.showSaveLoadModal('save');
      } else if (e.key === 'l' || e.key === 'L') {
        this.showSaveLoadModal('load');
      } else if (e.key === 'h' || e.key === 'H') {
        this.showHistoryModal();
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
        // Update existing sprite classes and image if changed
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
      this.choiceContainerEl.style.display = 'none';
      const existingEnd = this.rootEl.querySelector('.kawa-ending-card');
      if (!existingEnd) {
        const endCard = document.createElement('div');
        endCard.className = 'kawa-ending-card';
        endCard.innerHTML = `
          <div class="kawa-ending-title">🌸 The End</div>
          <div class="kawa-ending-subtitle">Story complete! Thank you for playing.</div>
          <div style="display:flex;gap:12px;margin-top:16px;">
            <button class="kawa-btn kawa-btn-replay">🔄 Play Again</button>
            <button class="kawa-btn kawa-btn-load-end">📂 Load Slot</button>
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

    this.fullCurrentText = text;

    if (this.typewriterSpeed <= 0) {
      this.dialogueTextEl.textContent = text;
      this.isTypewriting = false;
      return;
    }

    this.isTypewriting = true;
    let index = 0;
    this.dialogueTextEl.textContent = '';

    this.currentTypewriterInterval = window.setInterval(() => {
      index += 1;
      this.dialogueTextEl.textContent = this.fullCurrentText.slice(0, index);
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
    this.dialogueTextEl.textContent = this.fullCurrentText;
    this.isTypewriting = false;
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
    title.textContent = mode === 'save' ? '💾 Save Game' : '📂 Load Game';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kawa-btn';
    closeBtn.textContent = '✕ Close';
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
        saveActionBtn.textContent = 'Save Here';
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
          loadActionBtn.textContent = 'Load';
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
        delBtn.textContent = '🗑';
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
    title.textContent = '📜 Dialogue History';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kawa-btn';
    closeBtn.textContent = '✕ Close';
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
        txt.textContent = entry.text;
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
