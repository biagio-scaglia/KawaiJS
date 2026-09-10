import type { StoryVM, SaveSlot } from '@kawaijs/runtime';
import { SVG_ICONS } from '../icons.js';

export async function showSaveLoadModal(
  rootEl: HTMLElement,
  vm: StoryVM,
  mode: 'save' | 'load',
  onLoaded?: () => void
): Promise<void> {
  const existing = rootEl.querySelector('.kawa-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'kawa-modal-overlay';

  const card = document.createElement('div');
  card.className = 'kawa-modal-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', mode === 'save' ? 'Save Game' : 'Load Game');

  const header = document.createElement('div');
  header.className = 'kawa-modal-header';

  const title = document.createElement('div');
  title.className = 'kawa-modal-title';
  title.innerHTML = `${mode === 'save' ? SVG_ICONS.save : SVG_ICONS.load} <span>${mode === 'save' ? 'Save Game' : 'Load Game'}</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.addEventListener('click', () => overlay.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body';

  const grid = document.createElement('div');
  grid.className = 'kawa-slots-grid';

  const saveManager = vm.getSaveManager();
  const slots = await saveManager.listSlots(6);

  slots.forEach((slot: SaveSlot | null, idx: number) => {
    const slotNum = String(idx + 1);
    const slotCard = document.createElement('div');
    slotCard.className = 'kawa-slot-card';

    const slotHeader = document.createElement('div');
    slotHeader.className = 'kawa-slot-header';

    const badge = document.createElement('span');
    badge.className = 'kawa-slot-badge';
    badge.textContent = `Slot ${slotNum}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'kawa-slot-time';
    timeSpan.textContent = slot ? new Date(slot.timestamp).toLocaleString() : 'Empty';

    slotHeader.appendChild(badge);
    slotHeader.appendChild(timeSpan);
    slotCard.appendChild(slotHeader);

    if (slot) {
      const preview = document.createElement('div');
      preview.className = 'kawa-slot-preview';
      preview.textContent = slot.previewText || `Label: ${slot.snapshot.state.currentLabel}`;
      slotCard.appendChild(preview);
    } else {
      const emptyText = document.createElement('div');
      emptyText.className = 'kawa-slot-empty-text';
      emptyText.textContent = 'No save data';
      slotCard.appendChild(emptyText);
    }

    const actions = document.createElement('div');
    actions.className = 'kawa-slot-actions';

    if (mode === 'save') {
      const saveActionBtn = document.createElement('button');
      saveActionBtn.className = 'kawa-slot-btn kawa-slot-btn-save';
      saveActionBtn.innerHTML = `${SVG_ICONS.save} Save Here`;
      saveActionBtn.setAttribute('aria-label', `Save to slot ${slotNum}`);
      saveActionBtn.addEventListener('click', async () => {
        await vm.save(slotNum);
        overlay.remove();
        void showSaveLoadModal(rootEl, vm, 'save', onLoaded);
      });
      actions.appendChild(saveActionBtn);
    } else {
      if (slot) {
        const loadActionBtn = document.createElement('button');
        loadActionBtn.className = 'kawa-slot-btn kawa-slot-btn-load';
        loadActionBtn.innerHTML = `${SVG_ICONS.load} Load`;
        loadActionBtn.setAttribute('aria-label', `Load slot ${slotNum}`);
        loadActionBtn.addEventListener('click', async () => {
          const ok = await vm.load(slotNum);
          if (ok) {
            overlay.remove();
            onLoaded?.();
          }
        });
        actions.appendChild(loadActionBtn);
      }
    }

    if (slot) {
      const delBtn = document.createElement('button');
      delBtn.className = 'kawa-slot-btn kawa-slot-btn-del';
      delBtn.innerHTML = SVG_ICONS.trash;
      delBtn.title = 'Delete Save';
      delBtn.setAttribute('aria-label', `Delete slot ${slotNum}`);
      delBtn.addEventListener('click', async () => {
        await saveManager.deleteSlot(slotNum);
        overlay.remove();
        void showSaveLoadModal(rootEl, vm, mode, onLoaded);
      });
      actions.appendChild(delBtn);
    }

    slotCard.appendChild(actions);
    grid.appendChild(slotCard);
  });

  body.appendChild(grid);
  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  rootEl.appendChild(overlay);
}
