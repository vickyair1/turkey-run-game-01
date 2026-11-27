// Keyboard and pointer input. Held keys give steering (jump is edge
// triggered, slide is held); one-shot presses (start, restart, pause, mute)
// are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const JUMP = new Set(['Space', 'KeyW', 'ArrowUp']);
const SLIDE = new Set(['KeyS', 'ArrowDown', 'ControlLeft', 'ShiftLeft']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let slide = false;
  let actions = 0;
  let jumpQueued = false;

  window.addEventListener('keydown', (event) => {
    // A key can be two things at once: Space both jumps and confirms
    // (starts / restarts), so the checks are independent, not else-if.
    let handled = false;
    if (JUMP.has(event.code)) {
      if (!event.repeat) jumpQueued = true;
      handled = true;
    }
    if (SLIDE.has(event.code)) {
      slide = true;
      handled = true;
    }
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      handled = true;
    }
    if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      handled = true;
    }
    if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
      handled = true;
    }
    if (handled) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (SLIDE.has(event.code)) slide = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => { slide = false; });
  // A click or tap jumps — and on a menu screen it starts the run.
  target.addEventListener('pointerdown', () => {
    jumpQueued = true;
    actions |= ACTION_CONFIRM;
  });

  return {
    /** Edge-triggered jump, consumed once per call. */
    takeJump() {
      const took = jumpQueued;
      jumpQueued = false;
      return took;
    },
    slideHeld() { return slide; },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
