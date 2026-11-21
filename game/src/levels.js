// Lamplight — A Quiet Heist: the three museum floors.
//
// Legend (40 columns by 20 rows, one character a tile):
//   #  wall — blocks movement and sight
//   .  floor
//   ,  shadow — dim floor; guards spot you half as fast here
//   C  crate — cover; blocks movement and sight
//   B  bush — a hiding spot; crouched inside, a guard cannot see you
//        unless it is very close
//   L  loot — a jewel worth 100 points
//   P  where the thief starts
//   E  the exit — reach it unseen to clear the floor
//
// Guard patrols are waypoint lists of [column, row] tile centres; a guard
// walks them in order, waits at each, and loops. Waypoints must sit on
// floor, shadow or bush tiles, and the straight lines between them must be
// walkable (walls and crates block; shadow and bush do not).

export const TILE_CHARS = new Set(['#', '.', ',', 'C', 'B', 'L', 'P', 'E']);

const LEVEL_1 = {
  name: 'The Quiet Gallery',
  seed: 101,
  map: [
    '########################################',
    '#P.........#..........#........L.......#',
    '#..........#..........#................#',
    '#...C......#....B.....#.....####.......#',
    '#...C......#..........#.....#..#...C...#',
    '#..........#...,,,,,..#.....#..#.......#',
    '#..........#...,,,,,..#.....#..#...B...#',
    '#..........####,,,,,######..#..#.......#',
    '#.............................#........#',
    '#..B.......C.......C......#..#..B......#',
    '#......######...######.....#...........#',
    '#......#....#...#....#.....#..#....#####',
    '#.L....#....#...#....#..C..#........#..#',
    '#......#....#...#....#.....#.....C.....#',
    '#..C...#....#...#....#.....####....B...#',
    '#......#....#...#....#.....#........#..#',
    '#......#....#...#....#.....#...C....#..#',
    '#.B....#....#...#....#.....#........#..#',
    '#.....L#....#...#....#..L..#........#E.#',
    '########################################',
  ],
  patrols: [
    [[14, 2], [20, 2], [20, 6], [14, 6]],
    [[28, 10], [28, 12], [32, 12], [32, 10]],
  ],
};

const LEVEL_2 = {
  name: 'The Vault Floor',
  seed: 202,
  map: [
    '########################################',
    '#P......#.......,,,,,......#.........L.#',
    '#.......#.......,,,,,......#...........#',
    '#..C....#..B....,,,,,......#....###....#',
    '#..C....#.......,,,,,......#....#.#....#',
    '#.......#.......,,,,,......#....#.#.C..#',
    '#.......######..,,,,,......#....#.#....#',
    '#..........................#...........#',
    '#..B.....C......#####............#.....#',
    '#..........C....#...#......#..B..#..L..#',
    '#......######...#...#..C...#.....#.....#',
    '#......#....#...#...#......#.....####..#',
    '#......#....#...#...#..B...#...........#',
    '#......#....#...#...#......#.....C.....#',
    '#..C...#....#...#...#......####.....B..#',
    '#......#....#...#...#......#........#..#',
    '#......#....#...#...#......#...C....#..#',
    '#.B....#....#...#...#......#........#..#',
    '#.....L#....#...#....#..L..#........#E.#',
    '########################################',
  ],
  patrols: [
    [[14, 2], [20, 2], [20, 5], [14, 5]],
    [[28, 10], [28, 12], [32, 12], [32, 10]],
    [[4, 2], [7, 2], [7, 5], [4, 5]],
  ],
};

const LEVEL_3 = {
  name: "The Director's Wing",
  seed: 303,
  map: [
    '########################################',
    '#P.......,,,,,,,,,,......C...........L.#',
    '#........,,,,,,,,,,....................#',
    '#..B.....#......C......#....####.......#',
    '#........#............#....#..#...C....#',
    '#........#.....B......#....#..#........#',
    '#........######.......#....#..#...B....#',
    '#......................................#',
    '#..B.....C......,,,,,,......C.....#....#',
    '#..........C....,,,,,,......#..B..#..L.#',
    '#......######...#,,,,,,.....#.....#....#',
    '#......#....#...#,,,,,,.....#....####..#',
    '#......#....#...#,,,,,,..C..#........#.#',
    '#......#....#...#,,,,,,.....#.....C....#',
    '#..C...#....#...#,,,,,,.....####....B..#',
    '#......#....#...#....#......#.......#..#',
    '#......#....#...#....#......#...C...#..#',
    '#.B....#....#...#....#......#.......#..#',
    '#.....L#....#...#....#..L...#.......#E.#',
    '########################################',
  ],
  patrols: [
    [[13, 2], [21, 2], [21, 5], [13, 5]],
    [[24, 3], [26, 3], [26, 6], [24, 6]],
    [[30, 10], [30, 12], [32, 12], [32, 10]],
    [[3, 2], [7, 2], [7, 5], [3, 5]],
  ],
};

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];

/** A tile blocks walking when it is a wall or a crate. */
export function blocksWalk(ch) {
  return ch === '#' || ch === 'C';
}

/** A tile blocks a guard's sight when it is a wall or a crate. */
export function blocksSight(ch) {
  return ch === '#' || ch === 'C';
}

/**
 * Parse one level's map into a grid plus the named spots: player start,
 * exit, and loot tiles. The map strings are left untouched.
 */
export function parseLevel(level) {
  const grid = level.map.map((row) => row.split(''));
  let start = null;
  let exit = null;
  const loot = [];
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      const ch = grid[row][col];
      if (ch === 'P') start = { col, row };
      if (ch === 'E') exit = { col, row };
      if (ch === 'L') loot.push({ col, row });
    }
  }
  return { name: level.name, seed: level.seed, grid, start, exit, loot, patrols: level.patrols };
}

/** The tile character at a column/row, '#' outside the map. */
export function tileAt(grid, col, row) {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return '#';
  return grid[row][col];
}
