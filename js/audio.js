// All sound is synthesized with the Web Audio API — no audio files.

let ac = null;
let master = null;
let noiseBuf = null;
let muted = false;

function ensure() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.6;
    const comp = ac.createDynamicsCompressor();
    master.connect(comp).connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

export function unlock() { ensure(); }

/** Shared context + master bus for music.js (null when Web Audio is unavailable). */
export function context() { return ensure() ? { ac, out: master } : null; }

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.6, ac.currentTime, 0.02);
}

function noise(t, dur, { type = 'bandpass', f0 = 1000, f1 = f0, q = 1, gain = 1, attack = 0.002 } = {}) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const flt = ac.createBiquadFilter();
  flt.type = type; flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t);
  flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt).connect(g).connect(master);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}

function tone(t, dur, { type = 'square', f0 = 440, f1 = f0, gain = 0.2, attack = 0.005 } = {}) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

/** Whoosh then a sharp supersonic crack. `level` 0..4 adds layers; `skin` = whip skin sound. */
export function whip(level = 0, delay = 0.13, skin = '') {
  if (!ensure()) return;
  const t = ac.currentTime;
  if (skin) { // cosmetic whip skins replace the crack with their own sound
    const c = t + delay;
    noise(t, delay + 0.02, { type: 'bandpass', f0: 300, f1: 1800, q: 1.2, gain: 0.25, attack: delay * 0.8 });
    if (skin === 'soft') noise(c, 0.12, { type: 'lowpass', f0: 900, f1: 300, q: 0.7, gain: 0.8, attack: 0.002 });
    if (skin === 'shutter') { noise(c, 0.03, { type: 'highpass', f0: 4000, f1: 3000, gain: 1, attack: 0.001 }); noise(c + 0.06, 0.03, { type: 'highpass', f0: 3000, f1: 2000, gain: 0.7, attack: 0.001 }); }
    if (skin === 'beep') { tone(c, 0.07, { type: 'square', f0: 1320, gain: 0.1 }); tone(c + 0.08, 0.07, { type: 'square', f0: 1760, gain: 0.1 }); }
    if (skin === 'splash') noise(c, 0.3, { type: 'bandpass', f0: 1200, f1: 300, q: 0.8, gain: 1, attack: 0.002 });
    return;
  }
  // swing whoosh
  noise(t, delay + 0.02, { type: 'bandpass', f0: 300, f1: 2400, q: 1.2, gain: 0.35, attack: delay * 0.8 });
  const c = t + delay;
  // the crack: very short, very bright
  noise(c, 0.045, { type: 'highpass', f0: 2500, f1: 1800, q: 0.7, gain: 1.6, attack: 0.001 });
  noise(c, 0.09, { type: 'bandpass', f0: 1400, f1: 500, q: 2, gain: 0.8, attack: 0.001 });
  tone(c, 0.05, { type: 'triangle', f0: 180, f1: 60, gain: 0.5, attack: 0.001 });
  if (level >= 2) noise(c + 0.01, 0.2, { type: 'bandpass', f0: 5000, f1: 3000, q: 4, gain: 0.25 }); // metal ring
  if (level === 3) { // electric zap
    tone(c, 0.18, { type: 'sawtooth', f0: 120, f1: 90, gain: 0.18 });
    tone(c, 0.12, { type: 'square', f0: 900, f1: 300, gain: 0.08 });
  }
  if (level >= 4) { // fire roar
    noise(c, 0.45, { type: 'lowpass', f0: 1200, f1: 150, q: 0.5, gain: 0.7, attack: 0.01 });
    tone(c, 0.3, { type: 'sawtooth', f0: 90, f1: 40, gain: 0.2 });
  }
}

export function ouch(pitch = 1) {
  if (!ensure()) return;
  const t = ac.currentTime + 0.14;
  const f = (380 + Math.random() * 120) * pitch;
  tone(t, 0.22, { type: 'square', f0: f, f1: f * 0.55, gain: 0.07, attack: 0.01 });
}

export function grumble() {
  if (!ensure()) return;
  const t = ac.currentTime + 0.14;
  tone(t, 0.35, { type: 'sawtooth', f0: 110, f1: 85, gain: 0.12, attack: 0.02 });
  tone(t + 0.05, 0.3, { type: 'square', f0: 140, f1: 100, gain: 0.05 });
}

export function coin(combo = 1) {
  if (!ensure()) return;
  const t = ac.currentTime + 0.16;
  const base = 880 * Math.pow(1.06, Math.min(combo, 12));
  tone(t, 0.06, { type: 'square', f0: base, gain: 0.06 });
  tone(t + 0.06, 0.12, { type: 'square', f0: base * 1.5, gain: 0.06 });
}

export function alert() {
  if (!ensure()) return;
  const t = ac.currentTime;
  tone(t, 0.12, { type: 'triangle', f0: 660, gain: 0.08 });
  tone(t + 0.1, 0.16, { type: 'triangle', f0: 520, gain: 0.07 });
}

export function buy() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.07, 0.12, { type: 'square', f0: f, gain: 0.06 }));
}

export function deny() {
  if (!ensure()) return;
  const t = ac.currentTime;
  tone(t, 0.15, { type: 'square', f0: 160, f1: 120, gain: 0.08 });
}

/** "Cà phê sốc": grinder buzz → pour → steam hiss → happy "ding". */
export function coffee() {
  if (!ensure()) return;
  const t = ac.currentTime;
  tone(t, 0.32, { type: 'sawtooth', f0: 95, f1: 120, gain: 0.05, attack: 0.02 });              // grinder
  noise(t, 0.32, { type: 'bandpass', f0: 2400, f1: 1800, q: 3, gain: 0.08, attack: 0.02 });
  for (let i = 0; i < 9; i++) {                                                                    // pouring bubbles
    const s2 = t + 0.32 + i * 0.055 + Math.random() * 0.02;
    tone(s2, 0.05, { type: 'sine', f0: 260 + Math.random() * 420, f1: 700 + Math.random() * 300, gain: 0.05 });
  }
  noise(t + 0.3, 0.55, { type: 'lowpass', f0: 900, f1: 380, gain: 0.1, attack: 0.08 });
  noise(t + 0.85, 0.45, { type: 'highpass', f0: 5000, f1: 7000, gain: 0.05, attack: 0.05 }); // steam
  [1318, 1760].forEach((f, i) => tone(t + 1.0 + i * 0.09, 0.28, { type: 'triangle', f0: f, gain: 0.07 }));
}

/** Boss skill "Tiếng gầm": a deep growl that swells, then the whole office jolts. */
export function roar() {
  if (!ensure()) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.35); o.frequency.exponentialRampToValueAtTime(55, t + 1.0);
  lfo.frequency.value = 28; lg.gain.value = 18; lfo.connect(lg).connect(o.frequency);           // rough throat rattle
  const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 900; flt.Q.value = 4;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
  o.connect(flt).connect(g).connect(master);
  o.start(t); lfo.start(t); o.stop(t + 1.1); lfo.stop(t + 1.1);
  noise(t, 0.9, { type: 'lowpass', f0: 1400, f1: 300, q: 1, gain: 0.25, attack: 0.08 });         // breath
  tone(t + 0.02, 0.25, { type: 'sine', f0: 60, f1: 35, gain: 0.35 });                           // chest thump
  [196, 262, 330].forEach((f, i) => tone(t + 0.9 + i * 0.06, 0.18, { type: 'square', f0: f, gain: 0.05 })); // staff snap to work
}

/** A skill point spent: rising magic arpeggio with shimmer. */
export function skill() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [523, 659, 784, 988, 1319].forEach((f, i) => { tone(t + i * 0.06, 0.22, { type: 'triangle', f0: f, gain: 0.06 }); tone(t + i * 0.06, 0.12, { type: 'sine', f0: f * 2, gain: 0.025 }); });
  noise(t + 0.25, 0.4, { type: 'highpass', f0: 6000, f1: 9000, gain: 0.04, attack: 0.05 });
}

/** Boss level up: short fanfare. */
export function levelUp() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [[523, 0], [523, 0.1], [523, 0.2], [698, 0.32], [880, 0.5], [1047, 0.62]].forEach(([f, d]) => tone(t + d, d > 0.55 ? 0.45 : 0.1, { type: 'square', f0: f, gain: 0.06 }));
  tone(t + 0.62, 0.45, { type: 'triangle', f0: 523, gain: 0.07 });
}

/** An item dropped: sparkle, longer and higher for rarer items (rarity 0..3). */
export function drop(rarity = 0) {
  if (!ensure()) return;
  const t = ac.currentTime;
  const n = 3 + rarity * 2;
  for (let i = 0; i < n; i++) tone(t + i * 0.05, 0.14, { type: 'triangle', f0: 1046 * Math.pow(1.12, i), gain: 0.05 });
  if (rarity >= 2) [784, 1047, 1319].forEach((f, i) => tone(t + n * 0.05 + 0.05, 0.5, { type: 'sine', f0: f, gain: 0.04 + i * 0.005 }));
}

/** Diamonds gained. */
export function gems() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [1568, 2093, 2637].forEach((f, i) => tone(t + i * 0.07, 0.3, { type: 'sine', f0: f, gain: 0.05 }));
  noise(t, 0.3, { type: 'highpass', f0: 7000, f1: 9000, gain: 0.03 });
}

/** A new room opens: hammer knocks then a little fanfare. */
export function build() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [0, 0.16, 0.32].forEach((d) => { noise(t + d, 0.08, { type: 'bandpass', f0: 1800, f1: 900, q: 4, gain: 0.35 }); tone(t + d, 0.06, { type: 'square', f0: 220, f1: 140, gain: 0.06 }); });
  [392, 523, 659, 784].forEach((f, i) => tone(t + 0.55 + i * 0.09, i === 3 ? 0.5 : 0.12, { type: 'square', f0: f, gain: 0.06 }));
}

/** Walking into another room / back to the building: door + footsteps. */
export function door() {
  if (!ensure()) return;
  const t = ac.currentTime;
  noise(t, 0.18, { type: 'bandpass', f0: 600, f1: 1200, q: 2, gain: 0.12, attack: 0.03 });
  tone(t + 0.02, 0.08, { type: 'square', f0: 330, f1: 280, gain: 0.03 });
  [0.2, 0.32].forEach((d) => noise(t + d, 0.04, { type: 'lowpass', f0: 500, gain: 0.15 }));
}

/** Whip landing on the weekly boss: heavy thud. */
export function thud() {
  if (!ensure()) return;
  const t = ac.currentTime + 0.12;
  tone(t, 0.18, { type: 'sine', f0: 140, f1: 50, gain: 0.3 });
  noise(t, 0.12, { type: 'lowpass', f0: 800, f1: 200, gain: 0.3 });
}

export function strike() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [392, 330, 262].forEach((f, i) => tone(t + i * 0.14, 0.18, { type: 'square', f0: f, gain: 0.07 }));
}

/** Office dog. */
export function bark() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [0, 0.18].forEach((d) => { tone(t + d, 0.1, { type: 'sawtooth', f0: 420, f1: 260, gain: 0.12 }); noise(t + d, 0.08, { type: 'bandpass', f0: 900, f1: 500, q: 2, gain: 0.3 }); });
}

export function bell() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [0, 0.25, 0.5].forEach((d) => {
    tone(t + d, 0.8, { type: 'sine', f0: 1046, gain: 0.08 });
    tone(t + d, 0.8, { type: 'sine', f0: 2093, gain: 0.03 });
  });
}
