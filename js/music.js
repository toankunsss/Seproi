// Background music: original 8-bit tunes synthesised live with Web Audio (no audio files).
//
// A tiny step sequencer schedules notes ~0.2 s ahead on the audio clock (setInterval only
// tops up the queue), so the beat stays steady even when the frame rate drops. Music goes
// through audio.js's master bus: the global mute and the rewarded-ad mute silence it too.
//
//   music.play('title' | 'office')   switch tune (starts as soon as audio is unlocked)
//   music.pause() / music.resume()   app in background, pause card
//   music.setEnabled(false)          "Nhạc nền" toggle (g.musicOff)
//
// Song format: one chord per bar; `lead` = 8 eighth notes per bar ('.' rest, '-' hold the
// previous note); `drums` = 16 steps per bar (k kick, s snare, h hat, '.' nothing).
import { context } from './audio.js';

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const hz = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return 440 * 2 ** ((NOTE[m[1]] + 12 * (+m[2] + 1) - 69) / 12); };
const CHORDS = { C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], Em: ['E', 'G', 'B'], Dm: ['D', 'F', 'A'] };
const root = (ch) => CHORDS[ch][0];

const SONGS = {
  // Title screen: a little dramatic, "the boss has arrived".
  title: {
    bpm: 100, vol: 0.5, arp: 'up',
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
    lead: [
      'A4 - C5 - E5 - A5 -', 'G5 - F5 - E5 - C5 -', 'E5 - G5 - C6 - B5 A5', 'B5 - - - G5 - D5 -',
      'A5 - E5 - C5 - E5 -', 'F5 - A5 - C6 - A5 -', 'G5 - E5 - C5 - E5 G5', 'B5 - - - - - . .',
    ],
    drums: 'k...h...s...h...',
  },
  // In the office: bouncy and busy, loops A A B A.
  office: {
    bpm: 118, vol: 0.42, arp: 'bounce',
    parts: {
      A: {
        chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
        lead: [
          'E5 . G5 . C6 - B5 G5', 'D5 . G5 . B5 - A5 G5', 'C5 . E5 . A5 - G5 E5', 'F5 - E5 - D5 - C5 .',
          'E5 . G5 . C6 - D6 C6', 'B5 . G5 . D5 - G5 .', 'A5 - G5 - F5 E5 D5 .', 'G5 - - - B4 . D5 .',
        ],
      },
      B: {
        chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
        lead: [
          'A4 C5 F5 C5 A5 - G5 F5', 'B4 D5 G5 D5 B5 - A5 G5', 'G5 . E5 . B4 . E5 G5', 'A5 - - . E5 . C5 .',
          'F5 . A5 . C6 - A5 F5', 'G5 . B5 . D6 - B5 G5', 'C6 - G5 - E5 - G5 .', 'C6 - - - . . . .',
        ],
      },
    },
    order: ['A', 'A', 'B', 'A'],
    drums: 'k.h.s.h.k.k.s.hh',
  },
};

/** Flatten a song into bars: [{ chord, lead: [8 tokens] }]. */
function bars(song) {
  const parts = song.parts ? song.order.map((k) => song.parts[k]) : [song];
  return parts.flatMap((p) => p.chords.map((chord, i) => ({ chord, lead: p.lead[i].split(/\s+/) })));
}

let enabled = true;
let wanted = null;   // tune to play when allowed
let paused = false;
let cur = null;      // { name, song, bars, step, next }
let bus = null;
let timer = 0;
let noise = null;

function setup() {
  const c = context();
  if (!c) return null;
  if (!bus) {
    bus = c.ac.createGain();
    bus.gain.value = 0;
    // soften the square waves a little
    const lp = c.ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5200;
    bus.connect(lp).connect(c.out);
    noise = c.ac.createBuffer(1, c.ac.sampleRate * 0.5, c.ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return c.ac;
}

function osc(ac, type, f, t, dur, gain, attack = 0.005) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + Math.max(attack, dur * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

function hit(ac, kind, t) {
  if (kind === 'k') {
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + 0.16);
    return;
  }
  const src = ac.createBufferSource();
  src.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = kind === 's' ? 'bandpass' : 'highpass';
  f.frequency.value = kind === 's' ? 1800 : 7000;
  const g = ac.createGain();
  const dur = kind === 's' ? 0.12 : 0.03;
  g.gain.setValueAtTime(kind === 's' ? 0.32 : 0.11, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t, Math.random() * 0.3, dur + 0.02);
}

/** Schedule one 16th step of the current tune at time t. */
function playStep(ac, t) {
  const { song, bars: B } = cur;
  const s16 = 60 / song.bpm / 4;
  const bar = B[Math.floor(cur.step / 16) % B.length];
  const s = cur.step % 16;
  const tones = CHORDS[bar.chord];
  // lead (on eighths), holding through '-'
  if (s % 2 === 0) {
    const i = s / 2, tok = bar.lead[i];
    if (tok && tok !== '.' && tok !== '-') {
      let len = 1;
      while (bar.lead[i + len] === '-') len++;
      osc(ac, 'square', hz(tok), t, len * 2 * s16 * 0.92, 0.085);
    }
  }
  // harmony arpeggio on 16ths, quiet triangle
  const order = song.arp === 'up' ? [0, 1, 2, 1] : [0, 2, 1, 2];
  const n = tones[order[s % 4]];
  const oct = NOTE[n] < NOTE[tones[0]] ? 5 : 4;
  osc(ac, 'triangle', hz(n + oct), t, s16 * 0.8, 0.06, 0.003);
  // bass: root on eighths, octave bounce
  if (s % 2 === 0) {
    const r = root(bar.chord);
    osc(ac, 'triangle', hz(r + (s % 4 === 0 ? 2 : 3)), t, s16 * 1.8, 0.32, 0.004);
  }
  const d = song.drums[s];
  if (d && d !== '.') hit(ac, d, t);
}

function tick() {
  const ac = setup();
  if (!ac || !cur) return;
  const s16 = 60 / cur.song.bpm / 4;
  if (cur.next < ac.currentTime) cur.next = ac.currentTime + 0.05; // after a stall, don't burst
  while (cur.next < ac.currentTime + 0.2) {
    playStep(ac, cur.next);
    cur.next += s16;
    cur.step++;
  }
}

function fade(to, time = 0.4) {
  const ac = setup();
  if (!ac) return;
  bus.gain.cancelScheduledValues(ac.currentTime);
  bus.gain.setValueAtTime(bus.gain.value, ac.currentTime);
  bus.gain.linearRampToValueAtTime(to, ac.currentTime + time);
}

function start() {
  if (!enabled || paused || !wanted) return;
  const ac = setup();
  if (!ac) return;
  if (!cur || cur.name !== wanted) cur = { name: wanted, song: SONGS[wanted], bars: bars(SONGS[wanted]), step: 0, next: ac.currentTime + 0.08 };
  fade(cur.song.vol, 0.6);
  if (!timer) timer = setInterval(tick, 40);
  tick();
}

function halt(keepPlace = true) {
  if (timer) { clearInterval(timer); timer = 0; }
  if (bus) fade(0, 0.25);
  if (!keepPlace) cur = null;
}

export function play(name) {
  if (!SONGS[name]) return;
  if (wanted === name && timer) return;
  wanted = name;
  if (cur && cur.name !== name) halt(false);
  start();
}
export function pause() { paused = true; halt(); }
export function resume() { paused = false; start(); }
export function setEnabled(on) { enabled = on; if (on) start(); else halt(false); }
export const playing = () => !!timer;
