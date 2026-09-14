/**
 * Minimal touch / swipe helpers for mobile VN play.
 */

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export interface BoundTouchControls {
  destroy(): void;
}

const SWIPE_MIN_DIST_PX = 48;
const SWIPE_MAX_OFF_AXIS_PX = 80;
const SWIPE_MAX_DURATION_MS = 600;

/**
 * Bind horizontal swipe gestures on an element.
 * Left = advance, Right = rollback (Ren'Py-ish phone UX).
 */
export function bindSwipeControls(el: HTMLElement, handlers: SwipeHandlers): BoundTouchControls {
  let startX = 0;
  let startY = 0;
  let startT = 0;
  let tracking = false;

  const onStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0]!;
    startX = t.clientX;
    startY = t.clientY;
    startT = Date.now();
    tracking = true;
  };

  const onEnd = (e: TouchEvent): void => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = Date.now() - startT;
    if (dt > SWIPE_MAX_DURATION_MS) return;
    if (Math.abs(dy) > SWIPE_MAX_OFF_AXIS_PX) return;
    if (Math.abs(dx) < SWIPE_MIN_DIST_PX) return;

    if (dx < 0) handlers.onSwipeLeft?.();
    else handlers.onSwipeRight?.();
  };

  const onCancel = (): void => {
    tracking = false;
  };

  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchend', onEnd, { passive: true });
  el.addEventListener('touchcancel', onCancel, { passive: true });

  return {
    destroy() {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onCancel);
    }
  };
}
