/**
 * Build a CSS `url("...")` value safe for assignment to style.backgroundImage.
 * Escapes backslashes and double-quotes that would break the declaration.
 */
export function cssUrl(url: string): string {
  const safe = String(url ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `url("${safe}")`;
}

/** Transition modifier classes applied to dual background layers. */
export const BG_TRANSITION_CLASSES = [
  'kawa-wipe-from-left',
  'kawa-wipe-from-right',
  'kawa-wipe-from-up',
  'kawa-wipe-from-down',
  'kawa-wipe-circle',
  'kawa-push-from-left',
  'kawa-push-from-right',
  'kawa-push-from-up',
  'kawa-push-from-down',
  'kawa-zoom-in',
  'kawa-blur-transition',
  'kawa-glitch-transition'
] as const;

export function clearBgTransitionClasses(...els: HTMLElement[]): void {
  for (const el of els) {
    el.classList.remove(...BG_TRANSITION_CLASSES);
  }
}
