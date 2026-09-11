import type { StoryVM, SaveSlot } from '@kawaijs/runtime';
import { SVG_ICONS } from '../icons.js';
import { showConfirmModal } from './confirm-modal.js';

function cleanPreviewText(text: string): string {
  return text
    .replace(/\{[a-zA-Z0-9#=_., -]+\}/g, '')
    .replace(/\{(?:\/)[a-zA-Z0-9]+\}/g, '')
    .trim();
}

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
    const isOccupied = slot !== null;
    const slotCard = document.createElement('div');
    slotCard.className = `kawa-slot-card ${isOccupied ? 'kawa-slot-occupied' : 'kawa-slot-empty'}`;

    const slotHeader = document.createElement('div');
    slotHeader.className = 'kawa-slot-header';

    const badge = document.createElement('span');
    badge.className = `kawa-slot-badge ${isOccupied ? 'kawa-slot-badge-occupied' : 'kawa-slot-badge-empty'}`;
    badge.innerHTML = `${SVG_ICONS.bookmark} <span>Slot ${slotNum}</span>`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'kawa-slot-time';
    if (slot) {
      const d = new Date(slot.timestamp);
      const dateFormatted = d.toLocaleDateString(undefined, {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      const timeFormatted = d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      timeSpan.innerHTML = `${SVG_ICONS.clock} <span>${dateFormatted}, ${timeFormatted}</span>`;
      timeSpan.title = d.toLocaleString();
    } else {
      timeSpan.textContent = 'Empty';
    }

    slotHeader.appendChild(badge);
    slotHeader.appendChild(timeSpan);
    slotCard.appendChild(slotHeader);

    if (slot) {
      const preview = document.createElement('div');
      preview.className = 'kawa-slot-preview';

      const previewIcon = document.createElement('span');
      previewIcon.className = 'kawa-slot-preview-icon';
      previewIcon.innerHTML = SVG_ICONS.quote;

      const previewText = document.createElement('span');
      previewText.className = 'kawa-slot-preview-text';
      previewText.textContent = cleanPreviewText(slot.previewText || `Label: ${slot.snapshot.state.currentLabel}`);

      preview.appendChild(previewIcon);
      preview.appendChild(previewText);
      slotCard.appendChild(preview);
    } else {
      const emptyState = document.createElement('div');
      emptyState.className = 'kawa-slot-empty-content';

      const emptyIcon = document.createElement('span');
      emptyIcon.className = 'kawa-slot-empty-icon';
      emptyIcon.innerHTML = SVG_ICONS.plus;

      const emptyText = document.createElement('span');
      emptyText.className = 'kawa-slot-empty-text';
      emptyText.textContent = 'No save data';

      emptyState.appendChild(emptyIcon);
      emptyState.appendChild(emptyText);
      slotCard.appendChild(emptyState);
    }

    const actions = document.createElement('div');
    actions.className = 'kawa-slot-actions';

    if (mode === 'save') {
      const saveActionBtn = document.createElement('button');
      saveActionBtn.className = 'kawa-slot-btn kawa-slot-btn-save';
      const label = isOccupied ? 'Overwrite' : 'Save Here';
      saveActionBtn.innerHTML = `${SVG_ICONS.save} <span>${label}</span>`;
      saveActionBtn.setAttribute('aria-label', `${label} slot ${slotNum}`);
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
        loadActionBtn.innerHTML = `${SVG_ICONS.load} <span>Load</span>`;
        loadActionBtn.setAttribute('aria-label', `Load slot ${slotNum}`);
        loadActionBtn.addEventListener('click', async () => {
          const ok = await vm.load(slotNum);
          if (ok) {
            overlay.remove();
            onLoaded?.();
          }
        });
        actions.appendChild(loadActionBtn);
      } else {
        const emptyBtn = document.createElement('button');
        emptyBtn.className = 'kawa-slot-btn kawa-slot-btn-disabled';
        emptyBtn.disabled = true;
        emptyBtn.innerHTML = `${SVG_ICONS.load} <span>Empty</span>`;
        actions.appendChild(emptyBtn);
      }
    }

    if (slot) {
      const delBtn = document.createElement('button');
      delBtn.className = 'kawa-slot-btn kawa-slot-btn-del';
      delBtn.innerHTML = SVG_ICONS.trash;
      delBtn.title = 'Delete Save';
      delBtn.setAttribute('aria-label', `Delete slot ${slotNum}`);
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmModal(rootEl, {
          title: 'Delete Save',
          message: `Are you sure you want to delete Slot ${slotNum}? This cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          onConfirm: async () => {
            await saveManager.deleteSlot(slotNum);
            overlay.remove();
            void showSaveLoadModal(rootEl, vm, mode, onLoaded);
          }
        });
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
