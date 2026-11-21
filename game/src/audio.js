// Lamplight — A Quiet Heist: tiny synthesized sounds, no audio files.
// Everything is a short oscillator blip through WebAudio, created on the
// first user gesture so the browser's autoplay rules stay happy.

let ctx = null;
let muted = false;

function audio() {
  if (ctx) return ctx;
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) return null;
  ctx = new AudioContext();
  return ctx;
}

/** Call from a user gesture so the context is allowed to start. */
export function unlockAudio() {
  const ac = audio();
  if (ac && ac.state === 'suspended') void ac.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function blip(freq, dur, type = 'sine', gain = 0.08, slideTo = null) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
  amp.gain.setValueAtTime(gain, ac.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  osc.connect(amp);
  amp.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + dur);
}

/** A soft footstep tick. */
export function footstep() {
  blip(190, 0.06, 'triangle', 0.03, 120);
}

/** Two rising notes when a jewel is pocketed. */
export function pickup() {
  blip(660, 0.09, 'sine', 0.09);
  setTimeout(() => blip(990, 0.12, 'sine', 0.09), 70);
}

/** The alarm sting when a guard spots the thief. */
export function alarm() {
  blip(220, 0.22, 'sawtooth', 0.07, 440);
  setTimeout(() => blip(220, 0.22, 'sawtooth', 0.07, 440), 160);
}

/** A low thud when the thief is caught. */
export function caught() {
  blip(140, 0.3, 'sawtooth', 0.1, 60);
}

/** A small arpeggio for the clean getaway. */
export function win() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'sine', 0.09), i * 110));
}

/** A click when a pebble is thrown. */
export function throwPebble() {
  blip(900, 0.05, 'square', 0.04, 500);
}
