// Lamplight — A Quiet Heist: every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const TILE = 32;
export const COLS = 40;
export const ROWS = 20;
export const HUD_H = 80;
export const WIDTH = 1280;
export const HEIGHT = 720;
export const FIELD_W = COLS * TILE;
export const FIELD_H = ROWS * TILE;

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 11,
  walk: 138,
  sneak: 64,
  run: 196,
};

export const GUARD = {
  radius: 12,
  patrol: 64,
  chase: 122,
  investigate: 96,
  /** How far a guard can see, in pixels. */
  viewRange: 190,
  /** Half of the vision cone's angle. */
  halfAngle: 0.61,
  /** Seconds a guard waits at each patrol waypoint. */
  pause: 1.4,
  /** Seconds of lost sight before a chasing guard gives up and searches. */
  loseSight: 4,
  /** Seconds a guard looks around a last-seen spot before going back. */
  searchTime: 3,
};

/** Detection fill rates, per second, while the player is seen in a cone. */
export const DETECT = {
  close: 58,
  mid: 32,
  far: 18,
  /** Distance under which the "close" rate applies. */
  closeDist: 70,
  /** Distance under which the "mid" rate applies. */
  midDist: 130,
  decay: 26,
  /** Detection at which a guard stops and stares ("?"). */
  suspicious: 45,
  /** Detection at which a guard raises the alarm ("!"). */
  alarmed: 100,
  sneakMul: 0.55,
  shadowMul: 0.6,
  runMul: 1.5,
  /** A player crouched in a bush is unseen beyond this distance. */
  bushHideDist: 56,
};

/** Noise radii, in pixels. */
export const NOISE = {
  runPulse: 96,
  runInterval: 0.35,
  pebble: 150,
  pebbleRange: 320,
  pebbleCount: 3,
};

export const SCORE = {
  loot: 100,
  levelTimeBonus: 300,
  levelTimeRate: 2,
  ghostBonus: 200,
};

export const LIVES = 3;

export const PALETTE = {
  backdrop: '#0d0f14',
  floorA: '#232833',
  floorB: '#20242e',
  floorLine: '#2c3240',
  shadowFloor: '#171c28',
  shadowEdge: '#39415a',
  wall: '#3a4152',
  wallTop: '#565f75',
  wallDark: '#262b38',
  crate: '#6b4f2a',
  crateEdge: '#8a6a3c',
  crateDark: '#4a3519',
  bush: '#1e4d2e',
  bushLight: '#2f6b41',
  bushDark: '#143522',
  exit: '#39d98a',
  exitDark: '#1d7a4c',
  loot: '#f2c94c',
  lootDark: '#a8842a',
  player: '#7dd3fc',
  playerDark: '#0369a1',
  guard: '#f87171',
  guardDark: '#7f1d1d',
  cone: 'rgba(250, 204, 21, 0.20)',
  coneEdge: 'rgba(250, 204, 21, 0.45)',
  coneSus: 'rgba(251, 146, 60, 0.28)',
  coneSusEdge: 'rgba(251, 146, 60, 0.55)',
  coneAlarm: 'rgba(239, 68, 68, 0.32)',
  coneAlarmEdge: 'rgba(239, 68, 68, 0.6)',
  panel: '#161a23',
  panelEdge: '#2c3240',
  text: '#eef1f5',
  muted: '#8b93a3',
  gold: '#f2c94c',
  danger: '#ef4444',
  warn: '#fb923c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'lamplight.best';
