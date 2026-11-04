// Detailed monitor screens for the phone office (portrait.js): 20x14 pixels, one little scene
// per activity, so a quick look shows who is working and who is "working". The isometric room
// keeps the smaller 16x10 screens of sprites.js → renderScreen.
//
//   work: dev (IDE) · acc (spreadsheet + chart) · des (design tool)
//   slack: game (platformer) · toptop (short-video feed) · crypto (candles) · snack (food app)
//          meeting (video call) · call (chat) · sleep / toilet (screensaver, lock screen)
//   strike: screen off
import { rect, px, glyphs, hash } from './pixel.js';

export const HD = { w: 20, h: 14 };
const cache = new Map();
function surface(id) {
  let s = cache.get(id);
  if (!s) {
    const c = document.createElement('canvas');
    c.width = HD.w; c.height = HD.h;
    s = [c, c.getContext('2d')];
    cache.set(id, s);
  }
  return s;
}

const CODE = ['#7fd1ff', '#c3e88d', '#f78c6c', '#c792ea', '#ffcb6b', '#89ddff'];
const blink = (t, hz = 2) => Math.floor(t * hz) % 2 === 0;

/** Render employee e's screen at time t (cached canvas per employee). */
export function renderScreenHD(e, t) {
  const [c, x] = surface(e.id);
  x.clearRect(0, 0, HD.w, HD.h);
  const mode = e.state === 'slack' ? e.slack : e.state === 'strike' ? 'off' : e.role;
  const speed = e.boost > 0 ? 3 : 1;
  const ph = t + (e.id || 0) * 0.71;
  (DRAW[mode] || DRAW.off)(x, ph, speed);
  if (e.state === 'hurt' && Math.floor(t * 20) % 2) { x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(0, 0, HD.w, HD.h); }
  return c;
}

const DRAW = {
  // --- work -----------------------------------------------------------------------------------
  dev(x, t, speed) {
    rect(x, 0, 0, 20, 14, '#1b1f2b');
    rect(x, 0, 0, 20, 2, '#2a3042'); rect(x, 1, 0, 6, 2, '#1b1f2b'); px(x, 2, 1, '#e0a030'); rect(x, 8, 1, 4, 1, '#4a5270');
    rect(x, 0, 2, 3, 11, '#232838');
    const off = Math.floor(t * 3 * speed);
    for (let r = 0; r < 5; r++) {
      const n = r + off, y = 3 + r * 2;
      px(x, 1, y, '#4a5270');
      const ind = Math.floor(hash(n * 3.1) * 3) * 2;
      let cx = 4 + ind;
      for (let k = 0; k < 3 && cx < 19; k++) {
        const w = 2 + Math.floor(hash(n * 5 + k) * 5);
        rect(x, cx, y, Math.min(w, 19 - cx), 1, CODE[Math.floor(hash(n * 7.7 + k) * CODE.length)]);
        cx += w + 1;
      }
    }
    if (blink(t)) rect(x, 4, 11, 1, 1, '#ffffff');
    rect(x, 0, 13, 20, 1, speed > 1 ? '#e0a030' : '#3d6fd6');
  },
  acc(x, t, speed) {
    rect(x, 0, 0, 20, 14, '#f4f6f0');
    rect(x, 0, 0, 20, 2, '#2f8a4a'); for (let i = 0; i < 3; i++) px(x, 1 + i * 2, 1, '#ffffff');
    rect(x, 0, 2, 20, 1, '#dbe3d3');
    for (let gx = 3; gx < 13; gx += 4) rect(x, gx, 3, 1, 11, '#c9d3c0');
    for (let gy = 5; gy < 14; gy += 2) rect(x, 0, gy, 13, 1, '#e3e9dc');
    const f = Math.floor(t * 4 * speed);
    for (let i = 0; i < 12; i++) {
      const cx = 1 + (i % 3) * 4, cy = 4 + Math.floor(i / 3) * 2;
      if (hash(i + f * 0.3) > 0.25) rect(x, cx, cy, 2 + (i % 2), 1, i % 5 === 0 ? '#c0392b' : '#333');
    }
    const sel = f % 12; rect(x, (sel % 3) * 4, 3 + Math.floor(sel / 3) * 2, 5, 3, 'rgba(47,138,74,0.35)');
    // chart panel
    rect(x, 14, 3, 6, 11, '#ffffff'); rect(x, 14, 3, 1, 11, '#c9d3c0');
    for (let b = 0; b < 3; b++) {
      const h = 2 + Math.floor((Math.sin(t * speed + b * 1.7) + 1) * 3);
      rect(x, 15 + b * 2, 13 - h, 1, h, ['#2f8a4a', '#3a8ee6', '#e0a030'][b]);
    }
  },
  des(x, t, speed) {
    rect(x, 0, 0, 20, 14, '#e8e6ef');
    rect(x, 0, 0, 3, 14, '#2e2e38');
    ['#e0404a', '#ffcb3d', '#46b37a', '#3a8ee6', '#c792ea'].forEach((col, i) => px(x, 1, 1 + i * 2, col));
    rect(x, 16, 0, 4, 14, '#3a3a46');
    for (let i = 0; i < 4; i++) rect(x, 17, 1 + i * 3, 2, 2, ['#ffcb3d', '#3a8ee6', '#e0404a', '#46b37a'][i]);
    rect(x, 4, 1, 11, 12, '#ffffff');
    const k = (t * 0.5 * speed) % 1;
    rect(x, 5, 3, 5, 5, '#ffcb3d'); rect(x, 9, 7, 5, 4, '#3a8ee6'); rect(x, 6, 4, 3, 3, '#e0404a');
    px(x, 12, 3, '#46b37a'); rect(x, 11, 2, 3, 1, '#46b37a');
    // dashed selection that follows the cursor
    const cx = 5 + Math.floor(k * 8), cy = 2 + Math.floor(Math.abs(Math.sin(t * 2)) * 8);
    for (let i = 0; i < 5; i += 2) { px(x, cx + i, cy - 1, '#3a8ee6'); px(x, cx + i, cy + 4, '#3a8ee6'); }
    rect(x, cx + 3, cy + 2, 1, 2, '#000'); px(x, cx + 4, cy + 3, '#000');
  },

  // --- slacking -------------------------------------------------------------------------------
  game(x, t) {
    // sky, clouds, hills
    rect(x, 0, 0, 20, 14, '#5c94fc');
    const sc = t * 6;
    for (let i = 0; i < 2; i++) {
      const cx = Math.floor((30 - ((sc * 0.4 + i * 13) % 30))) - 6;
      rect(x, cx, 2 + i * 2, 5, 1, '#ffffff'); rect(x, cx + 1, 1 + i * 2, 3, 1, '#ffffff');
    }
    for (let i = 0; i < 2; i++) {
      const hx = Math.floor(28 - ((sc * 0.7 + i * 14) % 28)) - 6;
      rect(x, hx, 9, 7, 2, '#3fa24a'); rect(x, hx + 2, 8, 3, 1, '#3fa24a'); px(x, hx + 3, 9, '#2c7a36');
    }
    // brick ground
    rect(x, 0, 11, 20, 3, '#c84c0c');
    rect(x, 0, 11, 20, 1, '#f8b878');
    const go = Math.floor(sc) % 4;
    for (let bx = -go; bx < 20; bx += 4) { px(x, bx, 12, '#7a2a00'); px(x, bx + 2, 13, '#7a2a00'); }
    // pipe
    const pxp = Math.floor(26 - (sc % 30));
    rect(x, pxp, 7, 4, 4, '#20a020'); rect(x, pxp - 1, 6, 6, 2, '#30c030'); px(x, pxp, 8, '#80f080');
    // coin
    const cxn = Math.floor(22 - ((sc * 1.0 + 7) % 26));
    const spin = Math.floor(t * 8) % 4;
    rect(x, cxn + (spin === 2 ? 1 : 0), 4, spin === 2 ? 1 : 2, 3, '#ffd34d');
    // enemy mushroom walking towards the hero
    const ex = Math.floor(19 - ((sc * 1.3) % 24));
    rect(x, ex, 9, 3, 2, '#8a4a2a'); rect(x, ex - 1, 8, 5, 1, '#a65a32'); px(x, ex, 9, '#fff'); px(x, ex + 2, 9, '#fff');
    // hero: cap, face, overalls, jumping
    const j = Math.round(Math.abs(Math.sin(t * 4.5)) * 5);
    const hy = 7 - j;
    rect(x, 5, hy, 3, 1, '#e0302a'); px(x, 8, hy, '#e0302a');
    rect(x, 5, hy + 1, 3, 1, '#f8b878');
    rect(x, 5, hy + 2, 3, 2, '#2848c8'); px(x, 5, hy + 2, '#e0302a');
    // HUD: hearts + score
    px(x, 1, 1, '#ff3d4a'); px(x, 3, 1, '#ff3d4a'); px(x, 5, 1, blink(t, 1) ? '#ff3d4a' : '#5c94fc');
    glyphs(x, String(10 + (Math.floor(t * 2) % 90)), 12, 0, '#ffffff');
  },
  toptop(x, t) {
    const clip = Math.floor(t / 2.6), k = (t / 2.6) % 1;
    const bgs = [['#ff3d7f', '#7a1d4a'], ['#2de2e6', '#145a6a'], ['#ffcb3d', '#7a5a14'], ['#9a64d6', '#3a2460']];
    const [a, b] = bgs[clip % bgs.length];
    const swipe = k < 0.12 ? Math.round((1 - k / 0.12) * 14) : 0; // new clip slides in
    rect(x, 0, 0, 20, 14, '#000000');
    rect(x, 0, swipe, 20, 14, b);
    rect(x, 2, 1 + swipe, 12, 10, a);
    // dancer
    const d = Math.floor(t * 5) % 2;
    const dx = 7, dy = 3 + swipe;
    rect(x, dx, dy, 2, 2, '#f1c7a0'); rect(x, dx, dy - 1, 2, 1, '#2b1d14');
    rect(x, dx - 1, dy + 2, 4, 3, '#ffffff');
    px(x, d ? dx - 2 : dx - 2, d ? dy + 1 : dy + 3, '#f1c7a0'); px(x, d ? dx + 3 : dx + 3, d ? dy + 3 : dy + 1, '#f1c7a0');
    rect(x, dx - 1 + d, dy + 5, 1, 2, '#2b2836'); rect(x, dx + 2 - d, dy + 5, 1, 2, '#2b2836');
    // right rail: like, comment, share
    const beat = Math.floor(t * 3) % 3 === 0;
    rect(x, 16, 3, 3, 2, beat ? '#ff3d4a' : '#ffffff'); px(x, 17, 5, beat ? '#ff3d4a' : '#ffffff');
    rect(x, 16, 7, 3, 2, '#ffffff'); px(x, 16, 9, '#ffffff');
    px(x, 16, 11, '#ffffff'); px(x, 17, 10, '#ffffff'); px(x, 18, 11, '#ffffff');
    // caption + progress
    rect(x, 1, 12, 7, 1, '#ffffff'); rect(x, 9, 12, 4, 1, '#aaaaaa');
    rect(x, 0, 13, 20, 1, '#444444'); rect(x, 0, 13, Math.round(k * 20), 1, '#ffffff');
  },
  crypto(x, t) {
    rect(x, 0, 0, 20, 14, '#0b0e13');
    const base = Math.floor(t * 1.6);
    const up = hash(base * 1.3) > 0.45;
    // header: coin + ticker
    rect(x, 1, 0, 3, 3, '#f7931a'); px(x, 2, 1, '#ffffff');
    rect(x, 5, 1, 7, 1, '#3a4252');
    rect(x, 13, 0, 7, 3, up ? '#0f3a33' : '#3a1214');
    glyphs(x, up ? '+' : '-', 14, -1, up ? '#26a69a' : '#ef5350');
    glyphs(x, '%', 17, -1, up ? '#26a69a' : '#ef5350');
    // grid
    for (let gx = 2; gx < 20; gx += 4) for (let gy = 5; gy < 14; gy += 3) px(x, gx, gy, '#1a2230');
    // candles
    let y = 9;
    for (let i = 0; i < 9; i++) {
      const d = hash(base + i) > 0.45 ? -1 : 1;
      const col = d < 0 ? '#26a69a' : '#ef5350';
      const h = 1 + Math.floor(hash(base * 3 + i) * 3);
      rect(x, 1 + i * 2, y - 1, 1, h + 2, col === '#26a69a' ? '#14524b' : '#6a1f1e');
      rect(x, 1 + i * 2, y, 1, h, col);
      y = Math.max(4, Math.min(12, y + d * Math.floor(hash(i + base * 5) * 3)));
    }
    // price line + big arrow
    for (let gx = 0; gx < 20; gx += 2) px(x, gx, y, up ? '#26a69a' : '#ef5350');
    if (blink(t, 3)) {
      const c = up ? '#26a69a' : '#ef5350', ay = up ? 4 : 9;
      if (up) { px(x, 18, ay, c); rect(x, 17, ay + 1, 3, 1, c); rect(x, 18, ay + 2, 1, 2, c); }
      else { rect(x, 18, ay, 1, 2, c); rect(x, 17, ay + 2, 3, 1, c); px(x, 18, ay + 3, c); }
    }
  },
  snack(x, t) {
    rect(x, 0, 0, 20, 14, '#fff3e6');
    rect(x, 0, 0, 20, 3, '#ff6a2a'); rect(x, 1, 1, 5, 1, '#ffffff'); px(x, 18, 1, '#ffffff');
    // bowl of noodles with steam
    rect(x, 4, 7, 9, 1, '#f4d27a'); rect(x, 3, 8, 11, 2, '#c0392b'); rect(x, 4, 10, 9, 1, '#8a2a20'); rect(x, 6, 11, 5, 1, '#8a2a20');
    px(x, 6, 7, '#46b37a'); px(x, 10, 7, '#e0a030');
    const s = Math.floor(t * 3) % 3;
    px(x, 6 + (s === 1 ? 1 : 0), 5 - s % 2, '#c8c0b8'); px(x, 9, 4 + s % 2, '#c8c0b8'); px(x, 11 - (s === 2 ? 1 : 0), 5, '#c8c0b8');
    // price + order button
    glyphs(x, '$', 15, 5, '#2f8a4a');
    rect(x, 14, 11, 5, 2, blink(t) ? '#ff6a2a' : '#e0502a'); px(x, 16, 11, '#ffffff'); rect(x, 15, 12, 3, 1, '#ffffff');
    // star rating
    for (let i = 0; i < 4; i++) px(x, 2 + i * 2, 12, '#ffcb3d');
  },
  meeting(x, t) {
    rect(x, 0, 0, 20, 14, '#1d2a3a');
    const faces = [['#f1c7a0', '#2b1d14', '#3d6fd6'], ['#d9a57a', '#141014', '#e0607e'], ['#f5d0b0', '#c9643a', '#46b37a'], null];
    const talk = Math.floor(t * 1.2) % 3;
    for (let i = 0; i < 4; i++) {
      const cx = 1 + (i % 2) * 9, cy = 1 + Math.floor(i / 2) * 5;
      rect(x, cx, cy, 8, 4, i === talk ? '#46b37a' : '#2a3a52');
      rect(x, cx + 1, cy + 1, 6, 3, '#34465f');
      const f = faces[i];
      if (f) {
        rect(x, cx + 3, cy + 1, 2, 2, f[0]); rect(x, cx + 3, cy + 1, 2, 1, f[1]); rect(x, cx + 2, cy + 3, 4, 1, f[2]);
        if (i === talk && blink(t, 6)) px(x, cx + 4, cy + 2, '#8a3a3a');
      } else { // camera off: initials
        rect(x, cx + 3, cy + 1, 2, 2, '#6a5acd');
      }
    }
    // controls: mic (muted), camera, hang up
    rect(x, 5, 11, 2, 2, '#6a7a90'); px(x, 7, 11, '#ef5350');
    rect(x, 9, 11, 2, 2, '#6a7a90');
    rect(x, 13, 11, 3, 2, '#e0404a');
  },
  call(x, t) {
    rect(x, 0, 0, 20, 14, '#e8edf3');
    rect(x, 0, 0, 20, 3, '#3d6fd6'); rect(x, 1, 1, 2, 1, '#ffffff'); rect(x, 4, 1, 5, 1, '#bcd2ff'); px(x, 18, 1, '#5cff7a');
    // messages scroll up one by one
    const n = Math.floor(t * 0.9);
    for (let i = 0; i < 4; i++) {
      const m = n - 3 + i;
      if (m < 0) continue;
      const mine = hash(m * 2.3) > 0.5, w = 4 + Math.floor(hash(m) * 7), y = 4 + i * 2;
      if (mine) rect(x, 19 - w, y, w, 1, '#5ac46a'); else rect(x, 1, y, w, 1, '#ffffff');
    }
    // typing dots
    const d = Math.floor(t * 4) % 3;
    for (let i = 0; i < 3; i++) px(x, 2 + i * 2, 12, i === d ? '#3d6fd6' : '#a0a8b8');
  },
  sleep(x, t) {
    rect(x, 0, 0, 20, 14, '#0a0d1e');
    for (let i = 0; i < 7; i++) if ((Math.floor(t * 2) + i) % 3) px(x, Math.floor(hash(i * 3) * 20), Math.floor(hash(i * 7) * 14), '#3a4a8a');
    const bx = Math.floor(Math.abs(((t * 4) % 34) - 17)), by = Math.floor(Math.abs(((t * 2.7) % 18) - 9));
    const col = ['#3a6bd6', '#7a5ad6', '#3a9ab0'][Math.floor(t / 3) % 3];
    glyphs(x, 'Z', Math.min(16, bx), Math.min(9, by), col);
  },
  toilet(x, t) { // lock screen: wallpaper + big clock, nobody at the desk
    rect(x, 0, 0, 20, 14, '#1c2440');
    rect(x, 0, 9, 20, 5, '#2a3a5c'); rect(x, 3, 8, 6, 1, '#2a3a5c'); rect(x, 12, 7, 5, 2, '#2a3a5c');
    const mins = 10 + (Math.floor(t / 4) % 50);
    glyphs(x, '11', 2, 2, '#ffffff'); if (blink(t, 1)) { px(x, 10, 3, '#ffffff'); px(x, 10, 5, '#ffffff'); } glyphs(x, String(mins), 12, 2, '#ffffff');
    rect(x, 8, 11, 4, 1, '#8a96b8');
  },
  off(x, t) {
    rect(x, 0, 0, 20, 14, '#08080c');
    rect(x, 2, 1, 6, 1, '#16161e'); px(x, 3, 2, '#16161e'); // dull reflection
    px(x, 18, 12, blink(t, 1) ? '#e0404a' : '#5a1a1e');
  },
};
DRAW.default = DRAW.off;
