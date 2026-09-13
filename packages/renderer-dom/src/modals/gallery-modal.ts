import type { StoryVM } from '@kawaijs/runtime';
import { SVG_ICONS } from '../icons.js';
import type { AssetType, GalleryItem } from '../types.js';

export function showGalleryModal(
  rootEl: HTMLElement,
  vm: StoryVM,
  galleryItems: readonly GalleryItem[] = [],
  assetResolver: (path: string, type: AssetType) => string
): void {
  const existing = rootEl.querySelector('.kawa-modal-overlay');
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
  title.innerHTML = `<span>🖼️ CG & Event Gallery</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.setAttribute('aria-label', 'Close gallery modal');
  closeBtn.addEventListener('click', () => overlay.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body kawa-gallery-body';

  const unlocked = vm.getState().unlockedCGs || {};

  if (galleryItems.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'kawa-gallery-empty';
    emptyNotice.innerHTML = `<p>No event illustrations registered in gallery.</p>`;
    body.appendChild(emptyNotice);
  } else {
    const grid = document.createElement('div');
    grid.className = 'kawa-gallery-grid';

    for (const item of galleryItems) {
      const isUnlocked = Boolean(unlocked[item.id] || unlocked[item.image]);
      const itemEl = document.createElement('div');
      itemEl.className = `kawa-gallery-item ${isUnlocked ? 'unlocked' : 'locked'}`;

      if (isUnlocked) {
        const imgUrl = assetResolver(item.thumbnail || item.image, 'background');
        itemEl.innerHTML = `
          <div class="kawa-gallery-thumb" style="background-image:url('${imgUrl}')"></div>
          <div class="kawa-gallery-label">${item.title}</div>
        `;
        itemEl.addEventListener('click', () => {
          showLightbox(rootEl, assetResolver(item.image, 'background'), item.title);
        });
      } else {
        itemEl.innerHTML = `
          <div class="kawa-gallery-thumb locked-thumb">🔒</div>
          <div class="kawa-gallery-label">Locked</div>
        `;
      }
      grid.appendChild(itemEl);
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
  lightbox.innerHTML = `
    <div class="kawa-lightbox-content">
      <img src="${fullImageUrl}" alt="${titleText}" class="kawa-lightbox-img" />
      <div class="kawa-lightbox-caption">${titleText}</div>
    </div>
  `;
  lightbox.addEventListener('click', () => lightbox.remove());
  rootEl.appendChild(lightbox);
}
