import { trapFocus } from '../utils/focus-trap.js';

/**
 * Modal text prompt for the KawaScript `input` directive.
 */
export function showInputModal(
  rootEl: HTMLElement,
  options: {
    prompt: string;
    defaultValue?: string;
    confirmText?: string;
    onSubmit: (value: string) => void;
  }
): void {
  const existing = rootEl.querySelector('.kawa-input-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'kawa-modal-overlay kawa-input-overlay';
  overlay.style.zIndex = '10040';

  const card = document.createElement('div');
  card.className = 'kawa-modal-card kawa-input-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', options.prompt);

  const title = document.createElement('div');
  title.className = 'kawa-modal-title';
  title.style.marginBottom = '16px';
  title.textContent = options.prompt;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'kawa-input-field';
  input.value = options.defaultValue ?? '';
  input.setAttribute('aria-label', options.prompt);
  input.autocomplete = 'off';
  input.maxLength = 64;

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '10px';
  actions.style.marginTop = '18px';

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'kawa-btn active';
  confirmBtn.textContent = options.confirmText || 'OK';

  const releaseFocus = trapFocus(card);

  const submit = (): void => {
    const value = input.value.trim() || 'Player';
    releaseFocus();
    overlay.remove();
    options.onSubmit(value);
  };

  confirmBtn.addEventListener('click', (e) => {
    e.preventDefault();
    submit();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  actions.appendChild(confirmBtn);
  card.appendChild(title);
  card.appendChild(input);
  card.appendChild(actions);
  overlay.appendChild(card);
  rootEl.appendChild(overlay);

  window.setTimeout(() => input.focus(), 0);
}
