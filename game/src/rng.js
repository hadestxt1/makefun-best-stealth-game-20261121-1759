// Lamplight — A Quiet Heist: a small seeded generator, so a level, its floor
// speckles and every staged screenshot come out the same on every run.
// mulberry32: a tiny, well-known PRNG; the seed is a plain number.

/** Make a generator that returns a float in [0, 1) from an integer seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** An integer in [min, max]. */
export function int(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element of an array. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
