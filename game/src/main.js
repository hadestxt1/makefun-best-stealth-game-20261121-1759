// Lamplight — A Quiet Heist: boot, the frame loop, and the staged shots.
// Open game/index.html in desktop Chrome and play. With ?shot=title|play|
// alarm|win the page stages that scene from the real rules and freezes
// it, so a screenshot is a render of the game itself.

import { WIDTH, HEIGHT, STEP, BEST_KEY } from './config.js';
import {
  createWorld, stepWorld, stepCaught,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_GAME_OVER,
  EVENT_CAUGHT, EVENT_LEVEL_CLEAR, EVENT_LOOT, EVENT_ALARM, EVENT_PEBBLE,
} from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import * as audio from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = WIDTH;
canvas.height = HEIGHT;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const input = createInput(canvas);

let world = createWorld(0);
try {
  const saved = window.localStorage.getItem(BEST_KEY);
  if (saved) world.best = JSON.parse(saved);
} catch {
  world.best = null;
}

let screen = SCREEN_TITLE;
let elapsed = 0;
let last = 0;
let accumulator = 0;

function saveBest() {
  if (world.screen !== SCREEN_WIN) return;
  const best = world.best ?? { score: 0, time: Infinity };
  if (world.score > best.score) {
    world.best = { score: world.score, time: world.time };
    try {
      window.localStorage.setItem(BEST_KEY, JSON.stringify(world.best));
    } catch {
      // Private mode or no storage: the game still plays.
    }
  }
}

function announce(text) {
  statusEl.textContent = text;
}

if (shotName) {
  // A staged shot: run the real rules forward, then freeze the frame.
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  world.screen = staged.screen;
  document.title = `Lamplight — shot ${shotName}`;
  render(ctx, world, 2.5);
  announce(`Lamplight, staged scene ${shotName}: ${staged.note ?? ''}`);
} else {
  world.screen = SCREEN_TITLE;
  screen = SCREEN_TITLE;
  announce('Lamplight, a quiet heist. Press Enter or click to begin.');

  canvas.addEventListener('pointerdown', () => {
    audio.unlockAudio();
    if (screen === SCREEN_TITLE) {
      screen = SCREEN_PLAY;
      world.screen = SCREEN_PLAY;
      announce('Sneak past the guards. Take the jewels. Reach the green exit.');
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    elapsed += dt;
    accumulator += dt;

    if (input.state.enter && screen === SCREEN_TITLE) {
      audio.unlockAudio();
      screen = SCREEN_PLAY;
      world.screen = SCREEN_PLAY;
      announce('Sneak past the guards. Take the jewels. Reach the green exit.');
    }
    if (input.state.restart && (screen === SCREEN_WIN || screen === SCREEN_GAME_OVER)) {
      const best = world.best;
      world = createWorld(0);
      world.best = best;
      screen = SCREEN_PLAY;
      world.screen = SCREEN_PLAY;
    }
    if (input.state.mute) audio.toggleMute();
    if (input.state.clicked) audio.unlockAudio();

    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const keys = input.read();
        let events = 0;
        if (world.status === 'play') {
          events = stepWorld(world, keys);
        } else {
          stepCaught(world);
        }
        if (events & EVENT_LOOT) audio.pickup();
        if (events & EVENT_ALARM) audio.alarm();
        if (events & EVENT_CAUGHT) audio.caught();
        if (events & EVENT_LEVEL_CLEAR) audio.win();
        if (events & EVENT_PEBBLE) audio.throwPebble();
        if (world.status === 'play' && world.player.moving && !world.player.sneak) {
          world.player.stepSound -= STEP;
          if (world.player.stepSound <= 0) {
            world.player.stepSound = 0.32;
            audio.footstep();
          }
        }
        if (world.status === 'win') {
          screen = SCREEN_WIN;
          saveBest();
          announce(`Clean getaway. Rank and score ${world.score}.`);
        } else if (world.status === 'gameover') {
          screen = SCREEN_GAME_OVER;
          announce('Caught. Press R to try again.');
        }
        world.screen = screen;
      }
    }
    input.clearFrame();
    render(ctx, world, elapsed);
  }
  requestAnimationFrame(frame);
}
