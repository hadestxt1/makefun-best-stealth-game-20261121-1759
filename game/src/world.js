// Lamplight — A Quiet Heist: the simulation. Pure logic, no DOM: the same
// module runs in the browser and in a headless check, on a fixed step, so a
// staged scene always plays out the same way.
//
// The thief sneaks through a museum floor at night. Guards walk patrols and
// see in cones; walls and crates block their sight, bushes hide a crouched
// thief, shadow slows how fast they spot you. Get every jewel, reach the
// exit unseen. Run and you are loud; sneak and you are slow. A thrown
// pebble draws a guard to the noise.

import {
  TILE, COLS, ROWS, HUD_H, STEP, PLAYER, GUARD, DETECT, NOISE, SCORE, LIVES,
} from './config.js';
import { LEVELS, parseLevel, tileAt, blocksWalk, blocksSight } from './levels.js';
import { mulberry32, range } from './rng.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVEL_CLEAR = 'levelclear';
export const SCREEN_WIN = 'win';
export const SCREEN_GAME_OVER = 'gameover';

export const EVENT_CAUGHT = 1;
export const EVENT_LEVEL_CLEAR = 2;
export const EVENT_LOOT = 4;
export const EVENT_ALARM = 8;
export const EVENT_PEBBLE = 16;

const TAU = Math.PI * 2;

function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: HUD_H + (row + 0.5) * TILE };
}

function clampAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** True when the segment between two points crosses no wall or crate. */
export function hasLineOfSight(grid, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const x = ax + (dx * i) / steps;
    const y = ay + (dy * i) / steps;
    const col = Math.floor(x / TILE);
    const row = Math.floor((y - HUD_H) / TILE);
    if (blocksSight(tileAt(grid, col, row))) return false;
  }
  return true;
}

/** Push a circle out of the tiles it overlaps; returns the corrected centre. */
function collide(grid, x, y, radius) {
  const minCol = Math.floor((x - radius) / TILE);
  const maxCol = Math.floor((x + radius) / TILE);
  const minRow = Math.floor((y - HUD_H - radius) / TILE);
  const maxRow = Math.floor((y - HUD_H + radius) / TILE);
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (!blocksWalk(tileAt(grid, col, row))) continue;
      const bx = col * TILE;
      const by = HUD_H + row * TILE;
      const nearX = Math.max(bx, Math.min(x, bx + TILE));
      const nearY = Math.max(by, Math.min(y, by + TILE));
      const dx = x - nearX;
      const dy = y - nearY;
      const d2 = dx * dx + dy * dy;
      if (d2 >= radius * radius) continue;
      if (d2 === 0) {
        // Centre inside the tile: push out along the smallest overlap.
        const left = x - bx;
        const right = bx + TILE - x;
        const top = y - by;
        const bottom = by + TILE - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = bx - radius;
        else if (m === right) x = bx + TILE + radius;
        else if (m === top) y = by - radius;
        else y = by + TILE + radius;
      } else {
        const d = Math.sqrt(d2);
        x += (dx / d) * (radius - d);
        y += (dy / d) * (radius - d);
      }
    }
  }
  return { x, y };
}

function makeGuard(patrol, index) {
  const first = tileCenter(patrol[0][0], patrol[0][1]);
  const second = tileCenter(patrol[1][0], patrol[1][1]);
  return {
    x: first.x,
    y: first.y,
    angle: angleTo(first.x, first.y, second.x, second.y),
    waypoint: 1,
    pause: 0,
    state: 'patrol',
    detect: 0,
    lastSeen: null,
    lostTimer: 0,
    searchTimer: 0,
    investigate: null,
    heard: null,
    index,
  };
}

function floorDecor(seed) {
  const rng = mulberry32(seed);
  const dots = [];
  for (let i = 0; i < 260; i += 1) {
    dots.push({
      x: range(rng, 0, COLS * TILE),
      y: HUD_H + range(rng, 0, ROWS * TILE),
      r: range(rng, 1, 2.4),
      a: range(rng, 0.04, 0.12),
    });
  }
  return dots;
}

/** A fresh world for one floor. `levelIndex` is 0-based. */
export function createWorld(levelIndex) {
  const level = parseLevel(LEVELS[levelIndex]);
  const start = tileCenter(level.start.col, level.start.row);
  const exit = tileCenter(level.exit.col, level.exit.row);
  return {
    levelIndex,
    level,
    grid: level.grid,
    decor: floorDecor(level.seed),
    player: {
      x: start.x, y: start.y, angle: 0, sneak: false, moving: false,
      runPulse: 0, stepSound: 0,
    },
    guards: level.patrols.map((patrol, i) => makeGuard(patrol, i)),
    loot: level.loot.map((spot) => ({ ...tileCenter(spot.col, spot.row), taken: false })),
    exit,
    pebbles: NOISE.pebbleCount,
    pebble: null,
    lives: LIVES,
    time: 0,
    score: 0,
    lootGot: 0,
    alertedEver: false,
    screen: SCREEN_PLAY,
    status: 'play',
    caughtTimer: 0,
    message: '',
    messageTimer: 0,
    best: null,
  };
}

/** The tile under a point, or '#' outside the floor. */
export function tileUnder(world, x, y) {
  return tileAt(world.grid, Math.floor(x / TILE), Math.floor((y - HUD_H) / TILE));
}

function playerHiddenInBush(world) {
  return tileUnder(world, world.player.x, world.player.y) === 'B';
}

function playerInShadow(world) {
  return tileUnder(world, world.player.x, world.player.y) === ',';
}

function setMessage(world, text, seconds = 3) {
  world.message = text;
  world.messageTimer = seconds;
}

/** A guard hears a noise at a point and goes to look. */
function hearNoise(world, x, y, radius) {
  for (const guard of world.guards) {
    if (guard.state === 'chase') continue;
    const d = Math.hypot(guard.x - x, guard.y - y);
    if (d > radius) continue;
    if (guard.state !== 'investigate' || !guard.investigate) {
      guard.investigate = { x, y };
      guard.state = 'investigate';
      guard.searchTimer = GUARD.searchTime;
    }
  }
}

function moveGuardToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const want = Math.atan2(dy, dx);
  const diff = clampAngle(want - guard.angle);
  const turn = 6.5 * dt;
  guard.angle += Math.max(-turn, Math.min(turn, diff));
  const step = Math.min(d, speed * dt);
  guard.x += Math.cos(guard.angle) * step;
  guard.y += Math.sin(guard.angle) * step;
  return d <= speed * dt + 1;
}

function updateGuard(world, guard, dt) {
  const grid = world.grid;
  const player = world.player;
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const toPlayer = angleTo(guard.x, guard.y, player.x, player.y);
  const inCone = Math.abs(clampAngle(toPlayer - guard.angle)) < GUARD.halfAngle
    && dist < GUARD.viewRange;
  const seen = inCone && hasLineOfSight(grid, guard.x, guard.y, player.x, player.y)
    && !(playerHiddenInBush(world) && dist > DETECT.bushHideDist);

  if (seen) {
    let rate = dist < DETECT.closeDist ? DETECT.close
      : dist < DETECT.midDist ? DETECT.mid : DETECT.far;
    if (player.sneak) rate *= DETECT.sneakMul;
    if (playerInShadow(world)) rate *= DETECT.shadowMul;
    if (!player.sneak && player.moving) rate *= DETECT.runMul;
    guard.detect = Math.min(100, guard.detect + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.lostTimer = 0;
    if (guard.detect >= DETECT.alarmed && guard.state !== 'chase') {
      guard.state = 'chase';
      world.alertedEver = true;
      setMessage(world, 'Spotted! Break line of sight!', 2.5);
    } else if (guard.detect >= DETECT.suspicious && guard.state === 'patrol') {
      guard.state = 'suspicious';
      setMessage(world, 'A guard thinks it saw something…', 2.5);
    }
  } else {
    guard.detect = Math.max(0, guard.detect - DETECT.decay * dt);
    if (guard.state === 'suspicious' && guard.detect < 30) guard.state = 'patrol';
  }

  if (guard.state === 'patrol') {
    if (guard.pause > 0) {
      guard.pause -= dt;
      guard.angle += 0.9 * dt;
      return;
    }
    const wp = world.level.patrols[guard.index][guard.waypoint];
    const target = tileCenter(wp[0], wp[1]);
    const fixed = collide(grid, guard.x, guard.y, GUARD.radius);
    guard.x = fixed.x;
    guard.y = fixed.y;
    if (moveGuardToward(guard, target.x, target.y, GUARD.patrol, dt)) {
      guard.waypoint = (guard.waypoint + 1) % world.level.patrols[guard.index].length;
      guard.pause = GUARD.pause;
    }
  } else if (guard.state === 'suspicious') {
    if (guard.lastSeen) {
      const want = angleTo(guard.x, guard.y, guard.lastSeen.x, guard.lastSeen.y);
      const diff = clampAngle(want - guard.angle);
      guard.angle += Math.max(-5 * dt, Math.min(5 * dt, diff));
    }
  } else if (guard.state === 'chase') {
    if (seen) {
      guard.lostTimer = 0;
    } else {
      guard.lostTimer += dt;
      if (guard.lostTimer > GUARD.loseSight) {
        guard.state = 'search';
        guard.searchTimer = GUARD.searchTime;
      }
    }
    const target = guard.lastSeen ?? { x: player.x, y: player.y };
    const fixed = collide(grid, guard.x, guard.y, GUARD.radius);
    guard.x = fixed.x;
    guard.y = fixed.y;
    moveGuardToward(guard, target.x, target.y, GUARD.chase, dt);
  } else if (guard.state === 'search') {
    guard.searchTimer -= dt;
    guard.angle += 1.6 * dt;
    if (guard.searchTimer <= 0) {
      guard.state = 'patrol';
      guard.detect = Math.max(0, guard.detect - 40);
    }
  } else if (guard.state === 'investigate') {
    const point = guard.investigate;
    const fixed = collide(grid, guard.x, guard.y, GUARD.radius);
    guard.x = fixed.x;
    guard.y = fixed.y;
    if (point && moveGuardToward(guard, point.x, point.y, GUARD.investigate, dt)) {
      guard.searchTimer -= dt;
      guard.angle += 1.4 * dt;
      if (guard.searchTimer <= 0) {
        guard.state = 'patrol';
        guard.investigate = null;
      }
    }
  }
}

/**
 * One fixed step. `input` is { mx, my, sneak, throwAt } where mx/my are
 * -1..1 movement axes and throwAt is { x, y } or null. Returns a bitmask
 * of EVENT_* flags for sounds and the HUD.
 */
export function stepWorld(world, input, dt = STEP) {
  let events = 0;
  if (world.status !== 'play') return events;
  world.time += dt;
  if (world.messageTimer > 0) world.messageTimer -= dt;

  const player = world.player;
  const len = Math.hypot(input.mx, input.my);
  const nx = len > 0 ? input.mx / len : 0;
  const ny = len > 0 ? input.my / len : 0;
  const speed = input.sneak ? PLAYER.sneak : PLAYER.walk;
  player.sneak = Boolean(input.sneak);
  player.moving = len > 0;
  if (len > 0) {
    player.angle = Math.atan2(ny, nx);
    player.x += nx * speed * dt;
    player.y += ny * speed * dt;
    const fixed = collide(world.grid, player.x, player.y, PLAYER.radius);
    player.x = fixed.x;
    player.y = fixed.y;
    player.x = Math.max(PLAYER.radius, Math.min(COLS * TILE - PLAYER.radius, player.x));
    player.y = Math.max(HUD_H + PLAYER.radius, Math.min(HUD_H + ROWS * TILE - PLAYER.radius, player.y));
    // Running is loud: a pulse of noise every few steps.
    if (!input.sneak) {
      player.runPulse -= dt;
      if (player.runPulse <= 0) {
        player.runPulse = NOISE.runInterval;
        hearNoise(world, player.x, player.y, NOISE.runPulse);
      }
    }
  }

  if (input.throwAt && world.pebbles > 0 && !world.pebble) {
    const dx = input.throwAt.x - player.x;
    const dy = input.throwAt.y - player.y;
    const d = Math.hypot(dx, dy);
    const rangeLimit = Math.min(d, NOISE.pebbleRange);
    const tx = player.x + (d > 0 ? (dx / d) * rangeLimit : 0);
    const ty = player.y + (d > 0 ? (dy / d) * rangeLimit : 0);
    world.pebbles -= 1;
    world.pebble = { sx: player.x, sy: player.y, tx, ty, t: 0, dur: 0.45 };
    events |= EVENT_PEBBLE;
  }
  if (world.pebble) {
    const peb = world.pebble;
    peb.t += dt;
    const k = Math.min(1, peb.t / peb.dur);
    peb.x = peb.sx + (peb.tx - peb.sx) * k;
    peb.y = peb.sy + (peb.ty - peb.sy) * k;
    if (k >= 1) {
      hearNoise(world, peb.tx, peb.ty, NOISE.pebble);
      setMessage(world, 'The pebble clatters — a guard turns to look.', 2.5);
      world.pebble = null;
    }
  }

  for (const guard of world.guards) updateGuard(world, guard, dt);

  for (const jewel of world.loot) {
    if (!jewel.taken && Math.hypot(player.x - jewel.x, player.y - jewel.y) < 24) {
      jewel.taken = true;
      world.lootGot += 1;
      world.score += SCORE.loot;
      events |= EVENT_LOOT;
    }
  }

  for (const guard of world.guards) {
    if (guard.state === 'chase'
      && Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.radius + PLAYER.radius + 2) {
      world.lives -= 1;
      world.status = 'caught';
      world.caughtTimer = 1.4;
      events |= EVENT_CAUGHT;
      if (world.lives <= 0) {
        world.screen = SCREEN_GAME_OVER;
        world.status = 'gameover';
      }
      return events;
    }
  }

  if (Math.hypot(player.x - world.exit.x, player.y - world.exit.y) < 26) {
    const timeBonus = Math.max(0, SCORE.levelTimeBonus - Math.floor(world.time) * SCORE.levelTimeRate);
    world.score += timeBonus;
    if (world.levelIndex + 1 >= LEVELS.length) {
      if (!world.alertedEver) world.score += SCORE.ghostBonus;
      world.screen = SCREEN_WIN;
      world.status = 'win';
    } else {
      world.screen = SCREEN_LEVEL_CLEAR;
      world.status = 'levelclear';
      world.caughtTimer = 2.2;
    }
    events |= EVENT_LEVEL_CLEAR;
  }
  return events;
}

/** After a catch, wait out the timer, then put the thief back at the start. */
export function stepCaught(world, dt = STEP) {
  if (world.status === 'caught') {
    world.caughtTimer -= dt;
    if (world.caughtTimer <= 0) {
      const fresh = createWorld(world.levelIndex);
      fresh.score = world.score;
      fresh.lootGot = world.lootGot;
      fresh.lives = world.lives;
      fresh.time = world.time;
      fresh.alertedEver = world.alertedEver;
      fresh.loot = world.loot;
      fresh.best = world.best;
      Object.assign(world, fresh);
      world.screen = SCREEN_PLAY;
      world.status = 'play';
      setMessage(world, 'Caught! Back to the start — quieter this time.', 3);
    }
  } else if (world.status === 'levelclear') {
    world.caughtTimer -= dt;
    if (world.caughtTimer <= 0) {
      const next = createWorld(world.levelIndex + 1);
      next.score = world.score;
      next.lootGot = world.lootGot;
      next.lives = world.lives;
      next.time = world.time;
      next.alertedEver = world.alertedEver;
      next.best = world.best;
      Object.assign(world, next);
      world.screen = SCREEN_PLAY;
      world.status = 'play';
      setMessage(world, `${world.level.name} — stay out of the light.`, 3.5);
    }
  }
}

/** Whether any guard can currently see the thief. */
export function isPlayerSeen(world) {
  const player = world.player;
  for (const guard of world.guards) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist >= GUARD.viewRange) continue;
    const toPlayer = angleTo(guard.x, guard.y, player.x, player.y);
    if (Math.abs(clampAngle(toPlayer - guard.angle)) >= GUARD.halfAngle) continue;
    if (!hasLineOfSight(world.grid, guard.x, guard.y, player.x, player.y)) continue;
    if (playerHiddenInBush(world) && dist > DETECT.bushHideDist) continue;
    return true;
  }
  return false;
}

/** The highest detection across guards, for the HUD meter. */
export function maxDetection(world) {
  return world.guards.reduce((m, g) => Math.max(m, g.detect), 0);
}

/** Whether any guard is currently chasing the thief. */
export function anyAlarmed(world) {
  return world.guards.some((g) => g.state === 'chase');
}

/** A one-line rank for the win screen. */
export function rankFor(world) {
  if (!world.alertedEver && world.lootGot === world.level.loot.length * LEVELS.length) return 'GHOST';
  if (world.lootGot === world.level.loot.length * LEVELS.length) return 'SHADOW';
  return 'SNEAK';
}
