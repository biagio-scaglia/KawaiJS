import { SVG_ICONS } from '../icons.js';

export function showConfirmModal(
  rootEl: HTMLElement,
  options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }
): void {
  const existing = rootEl.querySelector('.kawa-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'kawa-modal-overlay';

  const card = document.createElement('div');
  card.className = 'kawa-modal-card kawa-confirm-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', options.title || 'Confirmation');

  const header = document.createElement('div');
  header.className = 'kawa-modal-header';

  const title = document.createElement('div');
  title.className = 'kawa-modal-title';
  title.innerHTML = `<span>${options.title || 'Confirmation'}</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', () => {
    overlay.remove();
    options.onCancel?.();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body';
  body.style.padding = '20px 8px';

  const msg = document.createElement('p');
  msg.className = 'kawa-confirm-msg';
  msg.textContent = options.message;
  msg.style.fontSize = '1.05rem';
  msg.style.color = '#e2e8f0';
  msg.style.textAlign = 'center';
  msg.style.margin = '0 0 24px 0';
  body.appendChild(msg);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '12px';
  actions.style.justifyContent = 'center';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'kawa-btn active';
  confirmBtn.style.padding = '8px 20px';
  confirmBtn.textContent = options.confirmText || 'Confirm';
  confirmBtn.addEventListener('click', () => {
    overlay.remove();
    options.onConfirm();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'kawa-btn';
  cancelBtn.style.padding = '8px 20px';
  cancelBtn.textContent = options.cancelText || 'Cancel';
  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    options.onCancel?.();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  body.appendChild(actions);

  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  rootEl.appendChild(overlay);
}
