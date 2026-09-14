import { SVG_ICONS } from '../icons.js';
import type { MainMenuOptions } from '../types.js';
import { escapeHtml } from '../utils/rich-text.js';
import { trapFocus } from '../utils/focus-trap.js';

export function showAboutModal(rootEl: HTMLElement, options?: MainMenuOptions): void {
  const existing = rootEl.querySelector('.kawa-modal-overlay:not(.kawa-confirm-overlay)');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'kawa-modal-overlay';

  const card = document.createElement('div');
  card.className = 'kawa-modal-card kawa-about-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'About Visual Novel');

  const header = document.createElement('div');
  header.className = 'kawa-modal-header';

  const title = document.createElement('div');
  title.className = 'kawa-modal-title';
  title.innerHTML = `${SVG_ICONS.info} <span>About</span>`;

  const releaseFocus = trapFocus(card);
  const close = (): void => {
    releaseFocus();
    overlay.remove();
  };

  const closeBtn = document.createElement('button');
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.setAttribute('aria-label', 'Close about modal');
  closeBtn.addEventListener('click', close);

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body kawa-about-body';

  const gameTitle = escapeHtml(options?.title || 'Kawaijs Visual Novel');
  const gameSub = escapeHtml(options?.subtitle || 'A modern web-native visual novel');
  // customFooter is intentionally HTML for developer-authored footers; escape by default
  // unless it looks like intentional markup from the engine default.
  const rawFooter = options?.customFooter;
  const customFooter = rawFooter ? escapeHtml(rawFooter) : 'Powered by Kawaijs Engine';

  body.innerHTML = `
    <div class="kawa-about-content">
      <div class="kawa-about-logo-badge">${SVG_ICONS.sakura}</div>
      <h2 class="kawa-about-game-title">${gameTitle}</h2>
      <p class="kawa-about-game-sub">${gameSub}</p>
      <div class="kawa-about-divider"></div>
      <p class="kawa-about-info">Built with <strong>Kawaijs</strong> — a web-native visual novel engine and toolchain inspired by Ren'Py.</p>
      <div class="kawa-about-footer-text">${customFooter}</div>
    </div>
  `;

  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  rootEl.appendChild(overlay);
}
