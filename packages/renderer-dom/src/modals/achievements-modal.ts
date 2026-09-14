import type { StoryVM, AchievementState } from '@kawaijs/runtime';
import type { AchievementDefinition } from '@kawaijs/ast';
import { SVG_ICONS } from '../icons.js';
import { trapFocus } from '../utils/focus-trap.js';
import { escapeHtml } from '../utils/rich-text.js';

export function showAchievementsModal(
  rootEl: HTMLElement,
  vm: StoryVM,
  catalog: readonly AchievementDefinition[] = []
): void {
  const existing = rootEl.querySelector('.kawa-modal-overlay:not(.kawa-confirm-overlay)');
  if (existing) existing.remove();

  const unlocked = vm.getState().achievements;
  const byId = new Map<string, AchievementDefinition>();
  for (const a of catalog) byId.set(a.id, a);
  for (const a of Object.values(unlocked)) {
    if (!byId.has(a.id)) {
      byId.set(a.id, { id: a.id, title: a.title, description: a.description });
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'kawa-modal-overlay';

  const card = document.createElement('div');
  card.className = 'kawa-modal-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'Achievements');

  const header = document.createElement('div');
  header.className = 'kawa-modal-header';
  const title = document.createElement('div');
  title.className = 'kawa-modal-title';
  title.innerHTML = `${SVG_ICONS.bookmark} <span>Achievements</span>`;

  const releaseFocus = trapFocus(card);
  const close = (): void => {
    releaseFocus();
    overlay.remove();
  };

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    close();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body';

  const list = document.createElement('div');
  list.className = 'kawa-achievements-list';

  const entries = Array.from(byId.values());
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'kawa-slot-empty-text';
    empty.textContent = 'No achievements yet. Use unlock "id" in your script.';
    list.appendChild(empty);
  } else {
    for (const def of entries) {
      const got = unlocked[def.id] as AchievementState | undefined;
      const row = document.createElement('div');
      row.className = `kawa-achievement-row ${got ? 'unlocked' : 'locked'}`;
      row.innerHTML = `
        <div class="kawa-achievement-title">${escapeHtml(def.title || def.id)}</div>
        <div class="kawa-achievement-desc">${escapeHtml(
          got?.description || def.description || (got ? 'Unlocked' : 'Locked')
        )}</div>
        ${
          got
            ? `<div class="kawa-achievement-time">${new Date(got.unlockedAt).toLocaleString()}</div>`
            : ''
        }
      `;
      list.appendChild(row);
    }
  }

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'kawa-slot-btn kawa-slot-btn-link';
  exportBtn.style.width = '100%';
  exportBtn.style.marginTop = '12px';
  exportBtn.innerHTML = `${SVG_ICONS.save} <span>Export JSON</span>`;
  exportBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const payload = JSON.stringify(vm.exportAchievementsJson(), null, 2);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        exportBtn.querySelector('span')!.textContent = 'Copied!';
      } else {
        window.prompt('Achievements JSON:', payload);
      }
    } catch {
      window.prompt('Achievements JSON:', payload);
    }
  });

  body.appendChild(list);
  body.appendChild(exportBtn);
  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  rootEl.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}
