import { SVG_ICONS } from '../icons.js';
import { formatRichText } from '../utils/rich-text.js';

export interface DialogueBoxCallbacks {
  onAdvance: () => void;
}

export class DialogueBoxComponent {
  public readonly el: HTMLDivElement;
  private readonly speakerTagEl: HTMLDivElement;
  private readonly dialogueTextEl: HTMLDivElement;
  private readonly indicatorEl: HTMLDivElement;

  private typewriterSpeed: number;
  private typewriterInterval: number | null = null;
  private isTypewriting = false;
  private fullCurrentText = '';
  private onTypewriterComplete?: () => void;

  constructor(typewriterSpeed = 20) {
    this.typewriterSpeed = typewriterSpeed;

    this.el = document.createElement('div');
    this.el.className = 'kawa-dialogue-box kawa-dialogue';
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', 'Dialogue');
    this.el.setAttribute('tabindex', '0');

    this.speakerTagEl = document.createElement('div');
    this.speakerTagEl.className = 'kawa-speaker-tag kawa-speaker';

    this.dialogueTextEl = document.createElement('div');
    this.dialogueTextEl.className = 'kawa-dialogue-text kawa-text';
    this.dialogueTextEl.setAttribute('aria-live', 'polite');

    this.indicatorEl = document.createElement('div');
    this.indicatorEl.className = 'kawa-continue-indicator';
    this.indicatorEl.setAttribute('aria-hidden', 'true');
    this.indicatorEl.innerHTML = SVG_ICONS.arrowDown;

    this.el.appendChild(this.speakerTagEl);
    this.el.appendChild(this.dialogueTextEl);
    this.el.appendChild(this.indicatorEl);
  }

  public setTypewriterSpeed(speed: number): void {
    this.typewriterSpeed = speed;
  }

  public getIsTypewriting(): boolean {
    return this.isTypewriting;
  }

  public render(
    dialogue: { speaker?: string; speakerDisplayName?: string; speakerColor?: string; text: string } | null | undefined,
    onComplete?: () => void
  ): void {
    if (!dialogue) {
      this.el.style.display = 'none';
      return;
    }

    this.el.style.display = 'block';

    // Speaker Tag
    if (dialogue.speakerDisplayName || dialogue.speaker) {
      this.speakerTagEl.textContent = dialogue.speakerDisplayName ?? dialogue.speaker ?? '';
      this.speakerTagEl.style.display = 'inline-block';
      if (dialogue.speakerColor) {
        this.speakerTagEl.style.backgroundColor = dialogue.speakerColor;
      } else {
        this.speakerTagEl.style.backgroundColor = '';
      }
    } else {
      this.speakerTagEl.style.display = 'none';
    }

    // Dialogue Text
    this.onTypewriterComplete = onComplete;
    this.fullCurrentText = dialogue.text;

    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    if (this.typewriterSpeed <= 0) {
      this.dialogueTextEl.innerHTML = formatRichText(this.fullCurrentText);
      this.isTypewriting = false;
      this.indicatorEl.style.opacity = '1';
      this.onTypewriterComplete?.();
    } else {
      this.startTypewriter(this.fullCurrentText);
    }
  }

  public finishTypewriter(): void {
    if (!this.isTypewriting) return;
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.isTypewriting = false;
    this.dialogueTextEl.innerHTML = formatRichText(this.fullCurrentText);
    this.indicatorEl.style.opacity = '1';
    this.onTypewriterComplete?.();
  }

  private startTypewriter(text: string): void {
    this.isTypewriting = true;
    this.indicatorEl.style.opacity = '0';
    this.dialogueTextEl.innerHTML = '';

    const formattedFull = formatRichText(text);

    // Extract text chunks or plain characters
    const temp = document.createElement('div');
    temp.innerHTML = formattedFull;
    const plainText = temp.textContent || '';

    let charIdx = 0;
    this.typewriterInterval = window.setInterval(() => {
      charIdx++;
      if (charIdx >= plainText.length) {
        this.finishTypewriter();
      } else {
        this.dialogueTextEl.textContent = plainText.slice(0, charIdx);
      }
    }, this.typewriterSpeed);
  }

  public destroy(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
  }
}
