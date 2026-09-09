import type { StoryState, StoryVM } from '@kawaijs/runtime';

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
    const clean = path.replace(/^bg\s+/, '').trim();
    return clean.includes('.') ? `assets/backgrounds/${clean}` : `assets/backgrounds/${clean}.png`;
  }

  if (type === 'character') {
    const clean = path.replace(/_/g, '/').replace(/\s+/g, '/').trim();
    return clean.includes('.') ? `assets/characters/${clean}` : `assets/characters/${clean}.png`;
  }

  if (type === 'audio') {
    return path.includes('.') ? `assets/audio/${path}` : `assets/audio/${path}.mp3`;
  }

  return path;
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
  private backgroundEl!: HTMLDivElement;
  private charactersEl!: HTMLDivElement;
  private dialogueBoxEl!: HTMLDivElement;
  private speakerTagEl!: HTMLDivElement;
  private dialogueTextEl!: HTMLDivElement;
  private choiceContainerEl!: HTMLDivElement;
  private backBtnEl!: HTMLButtonElement;

  private currentTypewriterInterval: number | null = null;
  private isTypewriting = false;
  private fullCurrentText = '';
  private unsubscribeVMState?: () => void;

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
    this.container.innerHTML = '';
  }

  private buildDOM(): void {
    this.container.innerHTML = '';

    this.rootEl = document.createElement('div');
    this.rootEl.className = 'kawa-root';

    const stageEl = document.createElement('div');
    stageEl.className = 'kawa-stage';

    this.backgroundEl = document.createElement('div');
    this.backgroundEl.className = 'kawa-background';

    this.charactersEl = document.createElement('div');
    this.charactersEl.className = 'kawa-characters kawa-sprites';

    const uiLayerEl = document.createElement('div');
    uiLayerEl.className = 'kawa-ui-layer';

    // Choice Container
    this.choiceContainerEl = document.createElement('div');
    this.choiceContainerEl.className = 'kawa-choice-container kawa-choices';
    this.choiceContainerEl.style.display = 'none';

    // Dialogue Box
    this.dialogueBoxEl = document.createElement('div');
    this.dialogueBoxEl.className = 'kawa-dialogue-box kawa-dialogue';

    this.speakerTagEl = document.createElement('div');
    this.speakerTagEl.className = 'kawa-speaker-tag kawa-speaker';

    this.dialogueTextEl = document.createElement('div');
    this.dialogueTextEl.className = 'kawa-dialogue-text kawa-text';

    const indicatorEl = document.createElement('div');
    indicatorEl.className = 'kawa-continue-indicator';
    indicatorEl.innerHTML = '&#9660;';

    this.dialogueBoxEl.appendChild(this.speakerTagEl);
    this.dialogueBoxEl.appendChild(this.dialogueTextEl);
    this.dialogueBoxEl.appendChild(indicatorEl);

    // Quick Menu
    const quickMenuEl = document.createElement('nav');
    quickMenuEl.className = 'kawa-quick-menu';

    this.backBtnEl = document.createElement('button');
    this.backBtnEl.className = 'kawa-btn';
    this.backBtnEl.textContent = 'Back';

    const histBtn = document.createElement('button');
    histBtn.className = 'kawa-btn';
    histBtn.textContent = 'History';
    histBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showHistoryModal();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'kawa-btn';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.vm.save('1');
      alert('Game saved to Slot 1!');
    });

    const loadBtn = document.createElement('button');
    loadBtn.className = 'kawa-btn';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const loaded = await this.vm.load('1');
      if (loaded) {
        alert('Game loaded from Slot 1!');
      } else {
        alert('No save found in Slot 1.');
      }
    });

    quickMenuEl.appendChild(this.backBtnEl);
    quickMenuEl.appendChild(histBtn);
    quickMenuEl.appendChild(saveBtn);
    quickMenuEl.appendChild(loadBtn);

    uiLayerEl.appendChild(this.choiceContainerEl);
    uiLayerEl.appendChild(this.dialogueBoxEl);
    uiLayerEl.appendChild(quickMenuEl);

    stageEl.appendChild(this.backgroundEl);
    stageEl.appendChild(this.charactersEl);
    stageEl.appendChild(uiLayerEl);

    this.rootEl.appendChild(stageEl);
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
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.handleUserAdvance();
      } else if (e.code === 'Backspace') {
        e.preventDefault();
        this.vm.rollback();
      }
    });
  }

  private handleUserAdvance(): void {
    if (this.isTypewriting) {
      // Instantly finish text
      this.finishTypewriter();
    } else {
      this.vm.next();
    }
  }

  private render(state: StoryState): void {
    // Update rollback button state
    this.backBtnEl.disabled = !this.vm.canRollback();

    // Render background
    if (state.visual.background) {
      const bgUrl = this.assetResolver(state.visual.background, 'background');
      this.backgroundEl.style.backgroundImage = `url("${bgUrl}")`;
      this.backgroundEl.style.opacity = '1';
    } else {
      this.backgroundEl.style.opacity = '0';
    }

    // Render character sprites
    this.charactersEl.innerHTML = '';
    for (const [charId, charState] of Object.entries(state.visual.characters)) {
      const spriteDiv = document.createElement('div');
      const posClass = `kawa-pos-${charState.position ?? 'center'}`;
      spriteDiv.className = `kawa-sprite ${posClass}`;
      spriteDiv.dataset.character = charId;
      if (charState.expression) {
        spriteDiv.dataset.expression = charState.expression;
      }

      const img = document.createElement('img');
      const charAssetKey = charState.expression ? `${charId}/${charState.expression}` : charId;
      img.src = this.assetResolver(charAssetKey, 'character');
      img.alt = `${charId} ${charState.expression ?? ''}`;
      img.onerror = () => {
        // Try flat filename e.g. yumia_happy.png if yumia/happy.png fails
        if (charState.expression && !img.dataset.fallbackTried) {
          img.dataset.fallbackTried = 'true';
          img.src = this.assetResolver(`${charId}_${charState.expression}`, 'character');
          return;
        }
        // Fallback placeholder sprite if image is missing
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
      };

      spriteDiv.appendChild(img);
      this.charactersEl.appendChild(spriteDiv);
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

      state.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'kawa-choice-btn kawa-choice';
        btn.textContent = choice.text;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.vm.choose(index);
        });
        this.choiceContainerEl.appendChild(btn);
      });
    } else {
      this.choiceContainerEl.style.display = 'none';
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

  private showHistoryModal(): void {
    const existing = this.rootEl.querySelector('.kawa-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'kawa-modal-overlay';

    const card = document.createElement('div');
    card.className = 'kawa-modal-card';

    const header = document.createElement('div');
    header.className = 'kawa-modal-header';

    const title = document.createElement('div');
    title.className = 'kawa-modal-title';
    title.textContent = 'Dialogue History';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kawa-btn';
    closeBtn.textContent = '✕ Close';
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
