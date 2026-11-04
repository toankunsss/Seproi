// Diagnostics for testers and players who report "the game froze":
//   - every JS error and unhandled promise rejection is kept (last 30) in localStorage
//   - frame watch: a gap of more than 1 s between frames while the app is visible is logged as a freeze
//   - main.js → watchdog logs the cases where it had to unstick a paused game
//   - FPS meter overlay (Thêm → Hiện FPS) and a text report to send (Thêm → Gửi báo lỗi)
// Nothing leaves the phone unless the player sends the report themselves.
import { VERSION } from './config.js';

const KEY = 'whipboss.diag.v1';
const MAX = 30;
let data = { log: [], meter: false };
try { data = { ...data, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} };

/** Add an entry: kind = 'error' | 'freeze' | 'watchdog'. */
export function record(kind, msg) {
  data.log.push({ k: kind, m: String(msg).slice(0, 300), t: Date.now(), v: VERSION });
  if (data.log.length > MAX) data.log.splice(0, data.log.length - MAX);
  persist();
}
export const entries = () => data.log.slice();
export function clear() { data.log = []; persist(); }

addEventListener('error', (e) => record('error', `${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}:${e.colno}`));
addEventListener('unhandledrejection', (e) => record('error', `promise: ${(e.reason && (e.reason.stack || e.reason.message)) || e.reason}`.split('\n').slice(0, 2).join(' ')));

// --- frame watch + FPS -----------------------------------------------------------------------------
export const stats = { fps: 0, worst: 0, slow: 0, frames: 0 };
let acc = 0, n = 0, worst = 0, slow = 0, hiddenUntil = 0;
document.addEventListener('visibilitychange', () => { hiddenUntil = performance.now() + 1500; });

/** Called by the game loop with the real time between two frames (ms) and what was going on. */
export function frame(ms, what = '') {
  stats.frames++;
  acc += ms; n++;
  if (ms > worst) worst = ms;
  if (ms > 50) slow++;
  // a long gap while the app is on screen = the phone froze for that long
  if (ms > 1000 && !document.hidden && performance.now() > hiddenUntil) record('freeze', `${Math.round(ms)} ms ${what}`);
  if (acc >= 1000) {
    stats.fps = Math.round((n * 1000) / acc); stats.worst = Math.round(worst); stats.slow = slow;
    acc = 0; n = 0; worst = 0; slow = 0;
    if (meterEl) meterEl.textContent = `${stats.fps} FPS · max ${stats.worst} ms`;
  }
}

let meterEl = null;
export const meterOn = () => !!data.meter;
export function setMeter(on) {
  data.meter = !!on; persist();
  if (on && !meterEl) {
    meterEl = document.createElement('div');
    meterEl.id = 'fpsmeter';
    document.body.appendChild(meterEl);
  } else if (!on && meterEl) { meterEl.remove(); meterEl = null; }
}
if (data.meter) setMeter(true);

/** Plain-text report for a tester to paste into a message. */
export function report(extra = {}) {
  const s = screen || {}, nav = navigator;
  const lines = [
    `Whip Boss ${VERSION} · ${new Date().toISOString()}`,
    `Device: ${nav.userAgent}`,
    `Screen: ${innerWidth}x${innerHeight} @${devicePixelRatio} (${s.width}x${s.height}) · cores ${nav.hardwareConcurrency || '?'} · RAM ${nav.deviceMemory || '?'} GB`,
    `FPS now: ${stats.fps} · worst frame last second: ${stats.worst} ms`,
    ...Object.entries(extra).map(([k, v]) => `${k}: ${v}`),
    '',
    `Log (${data.log.length}):`,
    ...data.log.slice(-20).map((e) => `${new Date(e.t).toISOString().slice(5, 19)} [${e.k}] v${e.v} ${e.m}`),
  ];
  return lines.join('\n');
}
