// Lamplight — A Quiet Heist: keyboard and mouse, read fresh every frame.
// WASD or arrows move, Shift sneaks, a click throws a pebble at the point
// clicked (the world decides whether one is left).

import { WIDTH, HEIGHT } from './config.js';

const KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

export function createInput(canvas) {
  const held = new Set();
  const state = {
    /** A pebble target in game pixels, consumed by the next step. */
    throwAt: null,
    /** True on the frame Enter was pressed. */
    enter: false,
    /** True on the frame R was pressed. */
    restart: false,
    /** True on the frame M was pressed. */
    mute: false,
    /** True on the frame the canvas was clicked. */
    clicked: false,
  };

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Enter') state.enter = true;
    if (event.code === 'KeyR') state.restart = true;
    if (event.code === 'KeyM') state.mute = true;
    if (KEYS[event.code]) {
      held.add(KEYS[event.code]);
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    if (KEYS[event.code]) held.delete(KEYS[event.code]);
  });
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    state.throwAt = { x, y };
    state.clicked = true;
  });

  return {
    state,
    /** Movement axes and sneak for this frame; call once per step. */
    read() {
      const mx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      const my = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      const out = { mx, my, sneak: held.has('sneak'), throwAt: state.throwAt };
      state.throwAt = null;
      return out;
    },
    /** Clear the one-frame flags after the frame has used them. */
    clearFrame() {
      state.enter = false;
      state.restart = false;
      state.mute = false;
      state.clicked = false;
    },
  };
}
