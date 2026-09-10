import type { StoryVM } from '@kawaijs/runtime';
import { SVG_ICONS } from '../icons.js';
import { formatRichText } from '../utils/rich-text.js';

export function showHistoryModal(rootEl: HTMLElement, vm: StoryVM): void {
  const existing = rootEl.querySelector('.kawa-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'kawa-modal-overlay';

  const card = document.createElement('div');
  card.className = 'kawa-modal-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'Dialogue History');

  const header = document.createElement('div');
  header.className = 'kawa-modal-header';

  const title = document.createElement('div');
  title.className = 'kawa-modal-title';
  title.innerHTML = `${SVG_ICONS.history} <span>Dialogue History</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.setAttribute('aria-label', 'Close history modal');
  closeBtn.addEventListener('click', () => overlay.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body';

  const entries = vm.getHistoryManager().getEntries();
  if (entries.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.textContent = 'No dialogue history yet.';
    emptyMsg.style.opacity = '0.6';
    body.appendChild(emptyMsg);
  } else {
    for (const entry of entries) {
      const item = document.createElement('div');
      item.className = 'kawa-history-item';
      if (entry.speakerDisplayName) {
        const spk = document.createElement('div');
        spk.className = 'kawa-history-speaker';
        spk.textContent = entry.speakerDisplayName;
        item.appendChild(spk);
      }
      const txt = document.createElement('div');
      txt.innerHTML = formatRichText(entry.text);
      item.appendChild(txt);
      body.appendChild(item);
    }
  }

  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  rootEl.appendChild(overlay);
}
