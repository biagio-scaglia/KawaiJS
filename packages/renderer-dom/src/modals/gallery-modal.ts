import type { StoryVM } from '@kawaijs/runtime';
import { SVG_ICONS } from '../icons.js';
import type { AssetType, GalleryItem } from '../types.js';
import { escapeHtml } from '../utils/rich-text.js';
import { trapFocus } from '../utils/focus-trap.js';

function sanitizeUrl(url: string): string {
  const trimmed = (url || '').trim();
  // Allow http(s), root-relative, and same-dir relative paths.
  if (/^(https?:|\/|\.\/)/i.test(trimmed)) {
    return trimmed.replace(/["'<>\\]/g, '');
  }
  // Only image data URLs — block data:text/html and similar XSS vectors.
  if (/^data:image\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^data:/i.test(trimmed)) {
    return '';
  }
  // Relative asset paths — strip quotes/parentheses that break CSS/HTML attrs
  return trimmed.replace(/["'()<>\\]/g, '');
}

export function showGalleryModal(
  rootEl: HTMLElement,
  vm: StoryVM,
  galleryItems: readonly GalleryItem[] = [],
  assetResolver: (path: string, type: AssetType) => string
): void {
  const existing = rootEl.querySelector('.kawa-modal-overlay:not(.kawa-confirm-overlay)');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'kawa-modal-overlay';

  const card = document.createElement('div');
  card.className = 'kawa-modal-card kawa-gallery-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'CG Gallery');

  const header = document.createElement('div');
  header.className = 'kawa-modal-header';

  const title = document.createElement('div');
  title.className = 'kawa-modal-title';
  title.innerHTML = `<span>CG &amp; Event Gallery</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.setAttribute('aria-label', 'Close gallery modal');

  const releaseFocus = trapFocus(card);
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    releaseFocus();
    overlay.remove();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body kawa-gallery-body';

  const unlocked = vm.getState().unlockedCGs || {};

  if (galleryItems.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'kawa-gallery-empty';
    emptyNotice.textContent = 'No event illustrations registered in gallery.';
    body.appendChild(emptyNotice);
  } else {
    const grid = document.createElement('div');
    grid.className = 'kawa-gallery-grid';

    for (const item of galleryItems) {
      const isUnlocked = Boolean(unlocked[item.id] || unlocked[item.image]);
      const cardEl = document.createElement('button');
      cardEl.type = 'button';
      cardEl.className = `kawa-gallery-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      cardEl.setAttribute('aria-label', isUnlocked ? item.title : 'Locked CG');

      if (isUnlocked) {
        const imgUrl = sanitizeUrl(assetResolver(item.thumbnail || item.image, 'background'));
        cardEl.innerHTML = `
          <div class="kawa-gallery-thumb-container">
            <img class="kawa-gallery-thumb" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />
          </div>
          <div class="kawa-gallery-info">
            <div class="kawa-gallery-title">${escapeHtml(item.title)}</div>
            ${item.description ? `<div class="kawa-gallery-desc">${escapeHtml(item.description)}</div>` : ''}
          </div>
        `;
        cardEl.addEventListener('click', (e) => {
          e.preventDefault();
          showLightbox(rootEl, sanitizeUrl(assetResolver(item.image, 'background')), item.title);
        });
      } else {
        cardEl.innerHTML = `
          <div class="kawa-gallery-thumb-container kawa-gallery-locked">
            <div class="kawa-gallery-lock-icon" aria-hidden="true">🔒</div>
            <span>Locked</span>
          </div>
          <div class="kawa-gallery-info">
            <div class="kawa-gallery-title">???</div>
            <div class="kawa-gallery-desc">Keep playing to unlock</div>
          </div>
        `;
        cardEl.disabled = true;
      }
      grid.appendChild(cardEl);
    }
    body.appendChild(grid);
  }

  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  rootEl.appendChild(overlay);
}

function showLightbox(rootEl: HTMLElement, fullImageUrl: string, titleText: string): void {
  const lightbox = document.createElement('div');
  lightbox.className = 'kawa-gallery-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', titleText);
  lightbox.innerHTML = `
    <div class="kawa-gallery-lightbox-content">
      <img src="${escapeHtml(fullImageUrl)}" alt="${escapeHtml(titleText)}" class="kawa-gallery-lightbox-img" />
      <div class="kawa-gallery-caption">${escapeHtml(titleText)}</div>
      <button class="kawa-gallery-lightbox-close" aria-label="Close image lightbox">${SVG_ICONS.close}</button>
    </div>
  `;

  const releaseFocus = trapFocus(lightbox);

  const close = (): void => {
    releaseFocus();
    lightbox.remove();
  };

  lightbox.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('kawa-gallery-lightbox') || target.closest('.kawa-gallery-lightbox-close')) {
      close();
    }
  });

  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });

  rootEl.appendChild(lightbox);
}
