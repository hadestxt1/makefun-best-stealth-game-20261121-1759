// Lamplight — A Quiet Heist: everything the player sees, drawn on one
// canvas. Top-down, flat colours with a night-museum palette: the floor is
// dark stone, shadow is darker still, crates and bushes are cover you can
// read at a glance, guards are red with yellow cones, the exit glows green.

import {
  TILE, COLS, ROWS, HUD_H, WIDTH, HEIGHT, GUARD, DETECT, PALETTE, FONT,
} from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_CLEAR, SCREEN_WIN, SCREEN_GAME_OVER, maxDetection, anyAlarmed, rankFor } from './world.js';
import { LEVELS } from './levels.js';

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, world) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = world.grid[row][col];
      const x = col * TILE;
      const y = HUD_H + row * TILE;
      if (ch === '#') continue;
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === ',') {
        ctx.fillStyle = PALETTE.shadowFloor;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = PALETTE.shadowEdge;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        ctx.setLineDash([]);
      }
    }
  }
  ctx.fillStyle = '#ffffff';
  for (const dot of world.decor) {
    ctx.globalAlpha = dot.a;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let col = 0; col <= COLS; col += 1) {
    ctx.moveTo(col * TILE + 0.5, HUD_H);
    ctx.lineTo(col * TILE + 0.5, HUD_H + ROWS * TILE);
  }
  for (let row = 0; row <= ROWS; row += 1) {
    ctx.moveTo(0, HUD_H + row * TILE + 0.5);
    ctx.lineTo(COLS * TILE, HUD_H + row * TILE + 0.5);
  }
  ctx.stroke();
}

function drawWalls(ctx, world) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (world.grid[row][col] !== '#') continue;
      const x = col * TILE;
      const y = HUD_H + row * TILE;
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(x, y, TILE, 5);
      ctx.fillStyle = PALETTE.wallDark;
      ctx.fillRect(x, y + TILE - 4, TILE, 4);
    }
  }
}

function drawCrates(ctx, world) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (world.grid[row][col] !== 'C') continue;
      const x = col * TILE + 2;
      const y = HUD_H + row * TILE + 2;
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(x, y, TILE - 4, TILE - 4);
      ctx.strokeStyle = PALETTE.crateEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE - 6, TILE - 6);
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + TILE - 6, y + TILE - 6);
      ctx.moveTo(x + TILE - 6, y + 2);
      ctx.lineTo(x + 2, y + TILE - 6);
      ctx.stroke();
      ctx.fillStyle = PALETTE.crateDark;
      ctx.fillRect(x + 4, y + 4, 4, 4);
      ctx.fillRect(x + TILE - 12, y + 4, 4, 4);
      ctx.fillRect(x + 4, y + TILE - 12, 4, 4);
      ctx.fillRect(x + TILE - 12, y + TILE - 12, 4, 4);
    }
  }
}

function drawBushes(ctx, world) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (world.grid[row][col] !== 'B') continue;
      const cx = col * TILE + TILE / 2;
      const cy = HUD_H + row * TILE + TILE / 2;
      ctx.fillStyle = PALETTE.bushDark;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = PALETTE.bush;
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 3, 9, 0, TAU);
      ctx.arc(cx + 6, cy - 5, 8, 0, TAU);
      ctx.arc(cx + 5, cy + 6, 8, 0, TAU);
      ctx.arc(cx - 6, cy + 6, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = PALETTE.bushLight;
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 4, 3.5, 0, TAU);
      ctx.arc(cx + 5, cy + 2, 3, 0, TAU);
      ctx.fill();
    }
  }
}

function drawLootAndExit(ctx, world, t) {
  const pulse = 0.75 + 0.25 * Math.sin(t * 3);
  ctx.fillStyle = PALETTE.exitDark;
  rr(ctx, world.exit.x - 15, world.exit.y - 15, 30, 30, 6);
  ctx.fill();
  ctx.strokeStyle = PALETTE.exit;
  ctx.globalAlpha = pulse;
  ctx.lineWidth = 3;
  rr(ctx, world.exit.x - 15, world.exit.y - 15, 30, 30, 6);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.exit;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', world.exit.x, world.exit.y - 24);
  ctx.fillStyle = PALETTE.exit;
  ctx.beginPath();
  ctx.moveTo(world.exit.x, world.exit.y - 8);
  ctx.lineTo(world.exit.x + 7, world.exit.y + 7);
  ctx.lineTo(world.exit.x - 7, world.exit.y + 7);
  ctx.closePath();
  ctx.fill();

  for (const jewel of world.loot) {
    if (jewel.taken) continue;
    const bob = Math.sin(t * 2 + jewel.x) * 2;
    ctx.save();
    ctx.translate(jewel.x, jewel.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.lootDark;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = PALETTE.loot;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#fff7d6';
    ctx.fillRect(-3, -3, 4, 4);
    ctx.restore();
  }
}

function coneStyle(state) {
  if (state === 'chase') return [PALETTE.coneAlarm, PALETTE.coneAlarmEdge];
  if (state === 'suspicious' || state === 'investigate' || state === 'search') {
    return [PALETTE.coneSus, PALETTE.coneSusEdge];
  }
  return [PALETTE.cone, PALETTE.coneEdge];
}

function drawCones(ctx, world) {
  for (const guard of world.guards) {
    const [fill, edge] = coneStyle(guard.state);
    const grad = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, GUARD.viewRange);
    grad.addColorStop(0, fill);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, GUARD.viewRange, guard.angle - GUARD.halfAngle, guard.angle + GUARD.halfAngle);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(
      guard.x + Math.cos(guard.angle - GUARD.halfAngle) * GUARD.viewRange,
      guard.y + Math.sin(guard.angle - GUARD.halfAngle) * GUARD.viewRange,
    );
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(
      guard.x + Math.cos(guard.angle + GUARD.halfAngle) * GUARD.viewRange,
      guard.y + Math.sin(guard.angle + GUARD.halfAngle) * GUARD.viewRange,
    );
    ctx.stroke();
  }
}

function drawGuard(ctx, guard, t) {
  const bob = guard.state === 'patrol' ? Math.sin(t * 6 + guard.index * 2) * 1.5 : 0;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 11, 4, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = guard.state === 'chase' ? PALETTE.danger : PALETTE.guard;
  ctx.beginPath();
  ctx.arc(0, 0, GUARD.radius, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(0, 0, GUARD.radius - 4, 0, TAU);
  ctx.fill();
  // Facing tick: the nose of the guard.
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(guard.angle) * 6, Math.sin(guard.angle) * 6);
  ctx.lineTo(Math.cos(guard.angle) * 16, Math.sin(guard.angle) * 16);
  ctx.stroke();
  // Helmet brim.
  ctx.strokeStyle = '#450a0a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, GUARD.radius - 1, guard.angle - 1.1, guard.angle + 1.1);
  ctx.stroke();
  ctx.restore();

  if (guard.state === 'suspicious' || guard.state === 'search' || guard.state === 'investigate') {
    ctx.fillStyle = PALETTE.warn;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', guard.x, guard.y - 24);
  } else if (guard.state === 'chase') {
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', guard.x, guard.y - 24);
  }

  if (guard.detect > 2) {
    const w = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, guard.x - w / 2, guard.y - 38, w, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = guard.detect >= DETECT.alarmed ? PALETTE.danger : PALETTE.warn;
    rr(ctx, guard.x - w / 2, guard.y - 38, (w * guard.detect) / 100, 5, 2.5);
    ctx.fill();
  }
}

function drawPlayer(ctx, world, t) {
  const p = world.player;
  const hidden = world.grid[Math.floor((p.y - HUD_H) / TILE)]?.[Math.floor(p.x / TILE)] === 'B';
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 10, 4, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = hidden ? 0.45 : 1;
  // Cloak: a hooded triangle pointing where the thief faces.
  ctx.rotate(p.angle);
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-9, -10);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0c4a6e';
  ctx.beginPath();
  ctx.arc(4, 0, 3.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (p.sneak) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('sneaking', p.x, p.y + 24);
  }
  if (world.pebble) {
    ctx.fillStyle = '#d1d5db';
    ctx.beginPath();
    ctx.arc(world.pebble.x, world.pebble.y, 4, 0, TAU);
    ctx.fill();
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, HUD_H - 2, WIDTH, 2);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('LAMPLIGHT', 18, 30);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('a quiet heist', 18, 56);

  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(`${world.levelIndex + 1} / ${LEVELS.length} — ${world.level.name}`, 250, 26);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`Score ${world.score}   •   Time ${formatTime(world.time)}   •   Lives ${'♥'.repeat(world.lives)}${'♡'.repeat(Math.max(0, 3 - world.lives))}`, 250, 52);

  // Loot diamonds (this floor only).
  const totalLoot = world.level.loot.length;
  const levelLoot = world.loot.filter((jewel) => jewel.taken).length;
  for (let i = 0; i < totalLoot; i += 1) {
    const x = 640 + i * 26;
    ctx.save();
    ctx.translate(x, 30);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i < levelLoot ? PALETTE.loot : '#3a4152';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`loot ${levelLoot}/${totalLoot}`, 640, 56);

  // Pebbles.
  ctx.fillStyle = PALETTE.text;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`pebbles ${'●'.repeat(world.pebbles)}${'○'.repeat(Math.max(0, 3 - world.pebbles))} — click to throw`, 800, 30);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('WASD move · Shift sneak · click throws a pebble', 800, 56);

  // Detection meter: the worst guard's suspicion.
  const det = maxDetection(world);
  const alarmed = anyAlarmed(world);
  ctx.textAlign = 'right';
  ctx.fillStyle = alarmed ? PALETTE.danger : det >= DETECT.suspicious ? PALETTE.warn : PALETTE.muted;
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(alarmed ? 'ALARM!' : det >= DETECT.suspicious ? 'SUSPICIOUS' : 'UNSEEN', WIDTH - 18, 26);
  ctx.fillStyle = '#2c3240';
  rr(ctx, WIDTH - 218, 40, 200, 12, 6);
  ctx.fill();
  ctx.fillStyle = alarmed ? PALETTE.danger : det >= DETECT.suspicious ? PALETTE.warn : PALETTE.gold;
  if (det > 0) {
    rr(ctx, WIDTH - 218, 40, (200 * det) / 100, 12, 6);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.fillText('detection', WIDTH - 18, 66);
  ctx.textAlign = 'left';

  if (world.messageTimer > 0 && world.message) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const w = ctx.measureText(world.message).width + 28;
    rr(ctx, (WIDTH - w) / 2, HEIGHT - 44, w, 30, 15);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(world.message, WIDTH / 2, HEIGHT - 28);
    ctx.textAlign = 'left';
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 8, 12, 0.72)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const w = 620;
  const h = 120 + lines.length * 30;
  const x = (WIDTH - w) / 2;
  const y = (HEIGHT - h) / 2;
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillText(title, WIDTH / 2, y + 52);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `16px ${FONT}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, y + 102 + i * 30);
  });
  ctx.textAlign = 'left';
}

/** Draw the whole frame for the world's current screen. */
export function render(ctx, world, t) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawFloor(ctx, world);
  drawLootAndExit(ctx, world, t);
  drawCrates(ctx, world);
  drawBushes(ctx, world);
  drawCones(ctx, world);
  drawWalls(ctx, world);
  for (const guard of world.guards) drawGuard(ctx, guard, t);
  drawPlayer(ctx, world, t);
  drawHud(ctx, world);

  if (world.screen === SCREEN_TITLE) {
    overlay(ctx, 'LAMPLIGHT', [
      'A quiet heist — three museum floors, one thief, no alarms.',
      'Sneak past the guards. Take the jewels. Reach the green exit.',
      'WASD / arrows to move · hold Shift to sneak · click to throw a pebble',
      'Press Enter or click to begin',
    ], PALETTE.gold);
  } else if (world.screen === SCREEN_LEVEL_CLEAR) {
    overlay(ctx, 'FLOOR CLEAR', [
      `You slipped out with ${world.lootGot} jewel${world.lootGot === 1 ? '' : 's'} so far.`,
      'The next floor is waiting…',
    ], PALETTE.exit);
  } else if (world.screen === SCREEN_WIN) {
    overlay(ctx, 'CLEAN GETAWAY', [
      `Rank: ${rankFor(world)}   •   Score ${world.score}   •   Time ${formatTime(world.time)}`,
      world.alertedEver ? 'You were spotted at least once — the ghost rank slipped away.'
        : 'Never once spotted. The museum never knew you were there.',
      'Press R to play again',
    ], PALETTE.gold);
  } else if (world.screen === SCREEN_GAME_OVER) {
    overlay(ctx, 'CAUGHT', [
      'The guards finally got their hands on you.',
      'Press R to try the floor again',
    ], PALETTE.danger);
  }
}
