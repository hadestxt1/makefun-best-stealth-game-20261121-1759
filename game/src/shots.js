// Lamplight — A Quiet Heist: the staged scenes behind ?shot=title|play|
// alarm|win. Each one plays the real rules forward from a fresh world for
// a fixed number of steps, steered by a simple autopilot (sneak toward the
// next waypoint; crouch and wait when any guard's suspicion climbs), so the
// frame is what a real game looks like and the same seed always gives the
// same frame. Nothing here is drawn by hand: the screenshots are renders
// of the game itself.

import { STEP, TILE, HUD_H } from './config.js';
import {
  createWorld, stepWorld, stepCaught, maxDetection, isPlayerSeen,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN,
} from './world.js';

const SAMPLE = STEP;

/** Pixel centre of a tile. */
function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: HUD_H + (row + 0.5) * TILE };
}

/**
 * Sneak the thief along `waypoints` (tile [col, row] pairs). Crouches in
 * place while suspicion is high but no guard can currently see the thief,
 * so it decays; keeps moving while seen, since standing in a cone only
 * lets suspicion climb. Returns { ok, steps, reason }.
 */
export function drive(world, waypoints, maxSeconds = 400) {
  let wp = 0;
  let steps = 0;
  const maxSteps = Math.floor(maxSeconds / SAMPLE);
  while (wp < waypoints.length && steps < maxSteps) {
    if (world.status !== 'play') {
      // Reaching the exit mid-route is success, not failure.
      return { ok: world.status === 'levelclear' || world.status === 'win', reason: world.status, wp, steps };
    }
    const target = tileCenter(waypoints[wp][0], waypoints[wp][1]);
    const dx = target.x - world.player.x;
    const dy = target.y - world.player.y;
    if (Math.hypot(dx, dy) < 10) {
      wp += 1;
      continue;
    }
    let input = { mx: 0, my: 0, sneak: true, throwAt: null };
    if (maxDetection(world) <= 35 || isPlayerSeen(world)) {
      const len = Math.hypot(dx, dy);
      input = { mx: dx / len, my: dy / len, sneak: true, throwAt: null };
    }
    stepWorld(world, input);
    steps += 1;
  }
  return { ok: wp >= waypoints.length, reason: wp >= waypoints.length ? 'done' : 'timeout', wp, steps };
}

/** Step the world with no input for `seconds`. */
export function idle(world, seconds, sneak = true) {
  const n = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < n; i += 1) {
    if (world.status !== 'play') break;
    stepWorld(world, { mx: 0, my: 0, sneak, throwAt: null });
  }
}

/** Step with a fixed movement direction for `seconds`. */
export function moveFor(world, mx, my, seconds, sneak = false) {
  const n = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < n; i += 1) {
    if (world.status !== 'play') break;
    stepWorld(world, { mx, my, sneak, throwAt: null });
  }
}

// Level 1's full route: every jewel, then the exit. Each leg is a straight
// walkable line (checked against the map: no wall or crate between the two
// tile centres, diagonals included).
const ROUTE_1 = [
  [9, 1], [9, 7], [4, 8], [4, 11], [2, 12], [4, 13], [4, 17], [6, 18],
  [6, 9], [9, 9], [9, 8], [15, 8], [20, 8], [25, 8], [28, 8], [28, 10],
  [31, 10], [31, 8], [32, 8], [32, 2], [31, 2], [31, 1], [31, 2], [32, 2],
  [32, 7], [32, 8], [32, 10], [28, 10], [28, 8], [26, 8], [25, 8], [25, 16],
  [24, 18], [25, 17], [25, 12], [25, 8], [28, 8], [28, 10], [28, 12],
  [31, 12], [35, 12], [35, 13], [35, 14], [37, 14], [37, 17], [37, 18],
];

// Level 2's full route: every jewel, then the exit.
const ROUTE_2 = [
  [7, 1], [7, 7], [4, 8], [4, 11], [4, 17], [6, 18], [6, 9], [10, 9],
  [10, 8], [14, 8], [14, 7], [21, 7], [21, 8], [26, 8], [28, 8], [31, 8],
  [31, 2], [35, 2], [37, 1], [35, 2], [35, 7], [35, 8], [36, 9],
  [37, 10], [37, 12], [32, 12], [28, 12], [28, 10], [28, 8], [26, 8],
  [26, 12], [26, 17], [24, 18], [26, 17], [26, 12], [26, 8], [28, 8],
  [28, 10], [28, 12], [31, 12], [35, 12], [35, 13], [37, 14], [37, 17], [37, 18],
];

// Level 3's full route: every jewel, then the exit.
const ROUTE_3 = [
  [8, 1], [8, 7], [4, 8], [4, 11], [4, 17], [6, 18], [6, 9], [10, 9],
  [10, 8], [15, 8], [22, 8], [22, 12], [22, 17], [24, 18], [22, 17],
  [22, 12], [22, 10], [27, 10], [27, 7], [29, 7], [29, 8], [32, 8],
  [32, 2], [31, 2], [35, 2], [37, 1], [35, 2], [35, 7], [35, 8],
  [37, 9], [35, 8], [35, 7], [32, 7], [32, 8], [32, 10], [32, 12],
  [35, 12], [35, 13], [35, 14], [37, 14], [37, 17], [37, 18],
];

const ROUTES = [ROUTE_1, ROUTE_2, ROUTE_3];

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * title: the title card over a live floor. play: mid-sneak, a guard's cone
 * sweeping close by. alarm: the thief was nearly spotted. win: all three
 * floors cleared without being caught (the full routes, played for real).
 */
export function stageShot(name, world) {
  if (name === 'play') {
    const r = drive(world, [[9, 1], [9, 7], [9, 8], [15, 8]]);
    if (!r.ok) return { screen: SCREEN_PLAY, note: `play route failed: ${r.reason} at wp ${r.wp}` };
    moveFor(world, 1, 0, 1.2, true);
    return { screen: SCREEN_PLAY, note: `play staged in ${r.steps} steps` };
  }
  if (name === 'alarm') {
    const r = drive(world, [[9, 1], [9, 7], [9, 8], [15, 7], [17, 4]]);
    if (!r.ok) return { screen: SCREEN_PLAY, note: `alarm route failed: ${r.reason} at wp ${r.wp}` };
    // Lure a guard in with a pebble: it walks toward the clatter head-on,
    // straight at the thief, who steps onto the landing spot — so the guard
    // faces the thief the whole approach and suspicion climbs fast. Freeze
    // the moment it passes halfway: the guard staring, "?" overhead.
    const landing = tileCenter(17, 3);
    stepWorld(world, { mx: 0, my: 0, sneak: false, throwAt: landing });
    idle(world, 0.6);
    const onto = drive(world, [[17, 3]], 10);
    if (!onto.ok && world.status !== 'play') {
      return { screen: SCREEN_PLAY, note: `alarm route failed: ${onto.reason}` };
    }
    for (let i = 0; i < 600 && world.status === 'play'; i += 1) {
      if (maxDetection(world) >= 50) break;
      stepWorld(world, { mx: 0, my: 0, sneak: false, throwAt: null });
    }
    return { screen: SCREEN_PLAY, note: `alarm staged, detection ${Math.round(maxDetection(world))}` };
  }
  if (name === 'win') {
    for (let level = 0; level < ROUTES.length; level += 1) {
      const r = drive(world, ROUTES[level]);
      if (!r.ok) return { screen: SCREEN_PLAY, note: `win route failed level ${level + 1}: ${r.reason} at wp ${r.wp}` };
      if (world.status !== 'levelclear' && world.status !== 'win') {
        return { screen: SCREEN_PLAY, note: `win route ended level ${level + 1} as ${world.status}` };
      }
      if (world.status === 'win') return { screen: SCREEN_WIN, note: `win staged, score ${world.score}` };
      while (world.status === 'levelclear') stepCaught(world);
      if (world.status !== 'play') return { screen: SCREEN_PLAY, note: `level ${level + 1} did not advance (${world.status})` };
    }
    return { screen: SCREEN_PLAY, note: 'win route ended without a win' };
  }
  idle(world, 4, false);
  return { screen: SCREEN_TITLE, note: 'title staged' };
}
