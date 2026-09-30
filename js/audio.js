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

/** Whoosh then a sharp supersonic crack. `level` 0..4 adds layers. */
export function whip(level = 0, delay = 0.13) {
  if (!ensure()) return;
  const t = ac.currentTime;
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

export function coffee() {
  if (!ensure()) return;
  const t = ac.currentTime;
  for (let i = 0; i < 8; i++) {
    const s = t + i * 0.07 + Math.random() * 0.03;
    tone(s, 0.06, { type: 'sine', f0: 300 + Math.random() * 500, f1: 800, gain: 0.05 });
  }
  noise(t, 0.6, { type: 'lowpass', f0: 700, f1: 400, gain: 0.12, attack: 0.1 });
  tone(t + 0.65, 0.3, { type: 'triangle', f0: 1318, gain: 0.07 });
}

export function strike() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [392, 330, 262].forEach((f, i) => tone(t + i * 0.14, 0.18, { type: 'square', f0: f, gain: 0.07 }));
}

export function bell() {
  if (!ensure()) return;
  const t = ac.currentTime;
  [0, 0.25, 0.5].forEach((d) => {
    tone(t + d, 0.8, { type: 'sine', f0: 1046, gain: 0.08 });
    tone(t + d, 0.8, { type: 'sine', f0: 2093, gain: 0.03 });
  });
}
