import type { ChoiceOption } from '@kawaijs/ast';

export interface ChoiceMenuCallbacks {
  onSelect: (index: number) => void;
}

export class ChoiceMenuComponent {
  public readonly el: HTMLDivElement;
  private readonly callbacks: ChoiceMenuCallbacks;

  constructor(callbacks: ChoiceMenuCallbacks) {
    this.callbacks = callbacks;
    this.el = document.createElement('div');
    this.el.className = 'kawa-choice-container kawa-choices';
    this.el.setAttribute('role', 'group');
    this.el.setAttribute('aria-label', 'Choices');
    this.el.style.display = 'none';
  }

  public render(choices: readonly ChoiceOption[] | null | undefined): void {
    this.el.innerHTML = '';

    if (!choices || choices.length === 0) {
      this.el.style.display = 'none';
      return;
    }

    this.el.style.display = 'flex';

    choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'kawa-choice-btn';
      btn.textContent = choice.text;
      btn.setAttribute('tabindex', '0');
      btn.setAttribute('aria-label', `Option ${index + 1}: ${choice.text}`);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onSelect(index);
      });

      this.el.appendChild(btn);
    });

    // Auto-focus first choice for keyboard navigation
    const firstBtn = this.el.querySelector('button');
    if (firstBtn) {
      firstBtn.focus();
    }
  }

  public hide(): void {
    this.el.style.display = 'none';
    this.el.innerHTML = '';
  }
}
