export interface GamepadCallbacks {
  onAdvance: () => void;
  onRollback: () => void;
  onToggleAuto: () => void;
  onToggleSkip: () => void;
  onToggleMenu: () => void;
  onNavigateDown: () => void;
  onNavigateUp: () => void;
  onConfirm: () => void;
}

export interface BoundGamepadControls {
  destroy: () => void;
}

export function bindGamepadControls(callbacks: GamepadCallbacks): BoundGamepadControls {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.getGamepads) {
    return { destroy: () => {} };
  }

  let rafId: number | null = null;
  let destroyed = false;
  let lastButtonStates = new Map<number, boolean>();
  let lastAxisDown = false;
  let lastAxisUp = false;

  const poll = () => {
    if (destroyed) return;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

    if (pad && pad.connected) {
      const isPressed = (index: number): boolean => {
        const btn = pad.buttons[index];
        return typeof btn === 'object' ? btn.pressed : btn === 1.0;
      };

      const checkEdge = (index: number): boolean => {
        const current = isPressed(index);
        const prev = lastButtonStates.get(index) ?? false;
        lastButtonStates.set(index, current);
        return current && !prev;
      };

      // Button 0 (A / Cross): Confirm / Advance
      if (checkEdge(0)) {
        callbacks.onConfirm();
      }

      // Button 1 (B / Circle): Rollback
      if (checkEdge(1)) {
        callbacks.onRollback();
      }

      // Button 2 (X / Square): Skip
      if (checkEdge(2)) {
        callbacks.onToggleSkip();
      }

      // Button 3 (Y / Triangle): Auto
      if (checkEdge(3)) {
        callbacks.onToggleAuto();
      }

      // Button 9 (Start / Options / Menu): Menu
      if (checkEdge(9)) {
        callbacks.onToggleMenu();
      }

      // D-Pad Down (Btn 13) or Left Stick Down (Axis 1 > 0.5)
      const axisY = pad.axes[1] ?? 0;
      const dpadDown = isPressed(13);
      const stickDown = axisY > 0.5;
      const isDown = dpadDown || stickDown;

      if (isDown && !lastAxisDown) {
        callbacks.onNavigateDown();
      }
      lastAxisDown = isDown;

      // D-Pad Up (Btn 12) or Left Stick Up (Axis 1 < -0.5)
      const dpadUp = isPressed(12);
      const stickUp = axisY < -0.5;
      const isUp = dpadUp || stickUp;

      if (isUp && !lastAxisUp) {
        callbacks.onNavigateUp();
      }
      lastAxisUp = isUp;
    }

    rafId = requestAnimationFrame(poll);
  };

  rafId = requestAnimationFrame(poll);

  return {
    destroy: () => {
      destroyed = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  };
}
