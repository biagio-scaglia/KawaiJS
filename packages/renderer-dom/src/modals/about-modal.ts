import { SVG_ICONS } from '../icons.js';
import type { MainMenuOptions } from '../types.js';

export function showAboutModal(rootEl: HTMLElement, options?: MainMenuOptions): void {
  const existing = rootEl.querySelector('.kawa-modal-overlay');
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

  const closeBtn = document.createElement('button');
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.setAttribute('aria-label', 'Close about modal');
  closeBtn.addEventListener('click', () => overlay.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body kawa-about-body';

  const gameTitle = options?.title || 'Kawaijs Visual Novel';
  const gameSub = options?.subtitle || 'A modern web-native visual novel';
  const customFooter = options?.customFooter || 'Powered by Kawaijs Engine';

  body.innerHTML = `
    <div class="kawa-about-content">
      <div class="kawa-about-logo-badge">🌸</div>
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
