/**
 * Lightweight focus trap for modal dialogs.
 * Returns a disposer that restores focus to the previously focused element.
 */
export function trapFocus(container: HTMLElement): () => void {
  const previouslyFocused =
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  const getFocusable = (): HTMLElement[] =>
    Array.from(
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', onKeyDown);

  const focusTimer = setTimeout(() => {
    const focusable = getFocusable();
    (focusable[0] ?? container).focus();
  }, 0);

  if (!container.hasAttribute('tabindex')) {
    container.setAttribute('tabindex', '-1');
  }

  return () => {
    clearTimeout(focusTimer);
    container.removeEventListener('keydown', onKeyDown);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try {
        previouslyFocused.focus();
      } catch {
        /* ignore */
      }
    }
  };
}
