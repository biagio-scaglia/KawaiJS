import { SVG_ICONS } from '../icons.js';
import { formatRichText } from '../utils/rich-text.js';

export interface DialogueBoxCallbacks {
  onAdvance: () => void;
}

export class DialogueBoxComponent {
  public readonly el: HTMLDivElement;
  private readonly speakerTagEl: HTMLDivElement;
  private readonly dialogueTextEl: HTMLDivElement;
  private readonly announceEl: HTMLDivElement;
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
    // Visible typewriter must NOT be live — per-character updates spam screen readers.
    this.dialogueTextEl.setAttribute('aria-hidden', 'true');

    this.announceEl = document.createElement('div');
    this.announceEl.className = 'kawa-dialogue-announce';
    this.announceEl.setAttribute('aria-live', 'polite');
    this.announceEl.setAttribute('aria-atomic', 'true');
    // Visually hidden but available to AT
    this.announceEl.style.position = 'absolute';
    this.announceEl.style.width = '1px';
    this.announceEl.style.height = '1px';
    this.announceEl.style.padding = '0';
    this.announceEl.style.margin = '-1px';
    this.announceEl.style.overflow = 'hidden';
    this.announceEl.style.clip = 'rect(0, 0, 0, 0)';
    this.announceEl.style.whiteSpace = 'nowrap';
    this.announceEl.style.border = '0';

    this.indicatorEl = document.createElement('div');
    this.indicatorEl.className = 'kawa-continue-indicator';
    this.indicatorEl.setAttribute('aria-hidden', 'true');
    this.indicatorEl.innerHTML = SVG_ICONS.arrowDown;

    this.el.appendChild(this.speakerTagEl);
    this.el.appendChild(this.dialogueTextEl);
    this.el.appendChild(this.announceEl);
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
      this.announceEl.textContent = '';
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

    // Clear previous announcement while typing so AT only hears the finished line.
    this.announceEl.textContent = '';
    this.el.setAttribute('aria-busy', 'true');

    if (this.typewriterSpeed <= 0) {
      this.dialogueTextEl.innerHTML = formatRichText(this.fullCurrentText);
      this.isTypewriting = false;
      this.indicatorEl.style.opacity = '1';
      this.announceFinishedLine(dialogue);
      this.onTypewriterComplete?.();
    } else {
      this.startTypewriter(this.fullCurrentText, dialogue);
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
    const speaker = this.speakerTagEl.style.display === 'none' ? undefined : this.speakerTagEl.textContent || undefined;
    this.announceFinishedLine({
      speakerDisplayName: speaker,
      text: this.fullCurrentText
    });
    this.onTypewriterComplete?.();
  }

  private announceFinishedLine(dialogue: {
    speaker?: string;
    speakerDisplayName?: string;
    text: string;
  }): void {
    this.el.setAttribute('aria-busy', 'false');
    const who = dialogue.speakerDisplayName || dialogue.speaker;
    const plain = (() => {
      const temp = document.createElement('div');
      temp.innerHTML = formatRichText(dialogue.text);
      return temp.textContent || dialogue.text;
    })();
    this.announceEl.textContent = who ? `${who}: ${plain}` : plain;
  }

  private startTypewriter(
    text: string,
    dialogue: { speaker?: string; speakerDisplayName?: string; text: string }
  ): void {
    this.isTypewriting = true;
    this.indicatorEl.style.opacity = '0';
    this.dialogueTextEl.innerHTML = '';

    const formattedFull = formatRichText(text);

    // Extract text chunks or plain characters
    const temp = document.createElement('div');
    temp.innerHTML = formattedFull;
    const plainText = temp.textContent || '';
    const graphemes = Array.from(plainText);

    let charIdx = 0;
    this.typewriterInterval = window.setInterval(() => {
      charIdx++;
      if (charIdx >= graphemes.length) {
        this.finishTypewriter();
      } else {
        this.dialogueTextEl.textContent = graphemes.slice(0, charIdx).join('');
      }
    }, this.typewriterSpeed);

    // Keep dialogue ref for finish path via fullCurrentText / speakerTag
    void dialogue;
  }

  public destroy(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
  }
}
