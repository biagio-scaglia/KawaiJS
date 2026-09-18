/**
 * Modal overlay lifecycle: ensure focus traps are released when overlays
 * are dismissed via Escape, replacement, or gamepad — not only via Close buttons.
 */

const overlayClosers = new WeakMap<Element, () => void>();

/** Register the canonical close() for an overlay (must call releaseFocus + remove). */
export function registerModalCloser(overlay: HTMLElement, closer: () => void): void {
  overlayClosers.set(overlay, closer);
}

/**
 * Dismiss an overlay via its registered closer (restores focus).
 * Falls back to Element.remove() when no closer was registered.
 */
export function dismissModalOverlay(overlay: Element | null | undefined): boolean {
  if (!overlay || !overlay.isConnected) return false;
  const closer = overlayClosers.get(overlay);
  if (closer) {
    closer();
    return true;
  }
  overlay.remove();
  return true;
}

/**
 * Dismiss existing non-confirm / non-input modals before opening a new one.
 * Calls registered closers so previous focus traps are released.
 */
export function dismissExistingModals(
  rootEl: HTMLElement,
  selector = '.kawa-modal-overlay:not(.kawa-confirm-overlay):not(.kawa-input-overlay)'
): void {
  const existing = rootEl.querySelectorAll(selector);
  for (const el of existing) {
    dismissModalOverlay(el);
  }
}
