// Procedural pixel-art sprites. Nothing is loaded from disk: every sprite is drawn
// from rectangles/polygons so it stays crisp and tiny.
import { iso, rect, px, poly, line, diamond, isoBox, glyphs, hash } from './pixel.js';

// --- colour helpers ------------------------------------------------------------
const shadeCache = new Map();
export function shade(hex, amt) {
  const key = hex + amt;
  let v = shadeCache.get(key);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  v = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  shadeCache.set(key, v);
  return v;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Draw a flat image onto an iso wall/screen by shifting each column (slope ±0.5). */
export function skewBlit(ctx, img, x, y, dir = 1) {
  for (let c = 0; c < img.width; c++) {
    const dy = dir > 0 ? Math.floor(c / 2) : -Math.floor(c / 2);
    ctx.drawImage(img, c, 0, 1, img.height, Math.round(x) + c, Math.round(y) + dy, 1, img.height);
  }
}

// --- Room ---------------------------------------------------------------------
export const ROOM = { w: 12, d: 9, wallH: 58 };
export const ROOM_SIZE = { w: 352, h: 238, ox: 152, oy: 66 };

function windowArt() {
  const [c, x] = canvas(34, 26);
  rect(x, 0, 0, 34, 26, '#e7e0ff');
  const sky = ['#6fb0ec', '#80bcf0', '#93c9f4', '#a8d6f7', '#bde2fa'];
  for (let i = 0; i < 24; i++) rect(x, 1, 1 + i, 32, 1, sky[Math.min(4, Math.floor(i / 5))]);
  rect(x, 5, 5, 7, 2, '#ffffff'); rect(x, 7, 4, 4, 1, '#ffffff');
  rect(x, 21, 8, 6, 1, '#f1f7ff');
  const bh = [9, 14, 7, 12, 17, 10, 6, 13];
  let bx = 1;
  bh.forEach((h, i) => {
    const w = 3 + (i % 3);
    rect(x, bx, 25 - h, w, h, i % 2 ? '#5b7ba6' : '#4d6a93');
    for (let wy = 25 - h + 2; wy < 24; wy += 3) for (let wx = bx + 1; wx < bx + w - 1; wx += 2) {
      if (hash(wx * 7 + wy) > 0.55) px(x, wx, wy, '#ffe38a');
    }
    bx += w;
  });
  rect(x, 16, 1, 2, 24, '#e7e0ff');
  rect(x, 1, 12, 32, 1, '#e7e0ff');
  rect(x, 0, 25, 34, 1, '#bdb3e0');
  return c;
}

function whiteboardArt() {
  const [c, x] = canvas(40, 24);
  rect(x, 0, 0, 40, 24, '#b9b4c9');
  rect(x, 1, 1, 38, 21, '#f6f7fb');
  // KPI chart
  rect(x, 4, 4, 1, 14, '#555');
  rect(x, 4, 17, 30, 1, '#555');
  const pts = [15, 14, 12, 13, 9, 10, 6, 4];
  for (let i = 0; i < pts.length - 1; i++) line(x, 6 + i * 4, pts[i], 10 + i * 4, pts[i + 1], '#e0404a');
  glyphs(x, '%', 30, 4, '#3a6bd6');
  rect(x, 6, 20, 10, 1, '#3a6bd6');
  rect(x, 18, 20, 6, 1, '#46a36a');
  rect(x, 0, 22, 40, 2, '#8d88a0');
  return c;
}

function posterArt() {
  const [c, x] = canvas(18, 24);
  rect(x, 0, 0, 18, 24, '#1b1526');
  rect(x, 1, 1, 16, 22, '#e0404a');
  // a raised fist... er, a whip icon + "!!!"
  line(x, 4, 18, 9, 9, '#3a1d10', 2);
  line(x, 9, 9, 14, 5, '#ffd34d');
  px(x, 14, 4, '#ffffff');
  glyphs(x, '!!!', 3, 3, '#ffffff');
  rect(x, 3, 20, 12, 1, '#ffffff');
  return c;
}

function clockArt(t) {
  const [c, x] = canvas(12, 12);
  const R = [[4, 0, 4], [2, 1, 8], [1, 2, 10], [1, 3, 10], [0, 4, 12], [0, 5, 12], [0, 6, 12], [0, 7, 12], [1, 8, 10], [1, 9, 10], [2, 10, 8], [4, 11, 4]];
  for (const [a, y, w] of R) rect(x, a, y, w, 1, '#2a2438');
  for (const [a, y, w] of R) if (y > 0 && y < 11) rect(x, a + 1, y, w - 2, 1, '#fbf7ee');
  return c;
}

const roomCache = new Map();
/** Static background: floor, walls and wall décor. Cached. */
export function roomLayer(level = 0) {
  if (roomCache.has(level)) return roomCache.get(level);
  const { w: W, h: H, ox, oy } = ROOM_SIZE;
  const [c, x] = canvas(W, H);
  const P = (gx, gy, gz = 0) => { const p = iso(gx, gy, gz); return { x: p.x + ox, y: p.y + oy }; };
  const wh = ROOM.wallH;

  // Walls
  poly(x, [P(0, 0, wh), P(0, ROOM.d, wh), P(0, ROOM.d, 0), P(0, 0, 0)], '#6a5f93');   // left wall
  poly(x, [P(0, 0, wh), P(ROOM.w, 0, wh), P(ROOM.w, 0, 0), P(0, 0, 0)], '#574d7d');   // right wall
  // wainscot
  poly(x, [P(0, 0, 16), P(0, ROOM.d, 16), P(0, ROOM.d, 0), P(0, 0, 0)], '#57497a');
  poly(x, [P(0, 0, 16), P(ROOM.w, 0, 16), P(ROOM.w, 0, 0), P(0, 0, 0)], '#463b67');
  poly(x, [P(0, 0, 17), P(0, ROOM.d, 17), P(0, ROOM.d, 16), P(0, 0, 16)], '#8a7db8');
  poly(x, [P(0, 0, 17), P(ROOM.w, 0, 17), P(ROOM.w, 0, 16), P(0, 0, 16)], '#766aa3');
  // wall caps
  poly(x, [P(0, 0, wh + 3), P(0, ROOM.d, wh + 3), P(0, ROOM.d, wh), P(0, 0, wh)], '#2a2340');
  poly(x, [P(0, 0, wh + 3), P(ROOM.w, 0, wh + 3), P(ROOM.w, 0, wh), P(0, 0, wh)], '#221c35');

  // Floor: two-tone carpet tiles with a walkway
  for (let gy = 0; gy < ROOM.d; gy++) for (let gx = 0; gx < ROOM.w; gx++) {
    const p = P(gx, gy);
    const aisle = gy === 4 || gy === 5;
    const open = level >= 2 || (level >= 1 ? gx >= 1 && gx <= 10 : gx >= 3 && gx <= 8);
    const base = !open ? ((gx + gy) % 2 ? '#29263a' : '#302c44')
      : aisle ? ((gx + gy) % 2 ? '#8a7a66' : '#96866f')
      : ((gx + gy) % 2 ? '#3f3a5c' : '#46406a');
    diamond(x, p.x, p.y, base);
  }
  // Gold edge marks the currently usable floor; it moves outward on expansion.
  const left = level >= 2 ? 0 : level >= 1 ? 1 : 3;
  const right = level >= 2 ? 12 : level >= 1 ? 11 : 9;
  line(x, P(left, 0).x, P(left, 0).y, P(left, ROOM.d).x, P(left, ROOM.d).y, '#c99b3d');
  line(x, P(right, 0).x, P(right, 0).y, P(right, ROOM.d).x, P(right, ROOM.d).y, '#c99b3d');
  // Floor edge / baseboard shadow
  line(x, P(0, 0).x, P(0, 0).y, P(0, ROOM.d).x, P(0, ROOM.d).y, '#241f38');
  line(x, P(0, 0).x, P(0, 0).y, P(ROOM.w, 0).x, P(ROOM.w, 0).y, '#241f38');

  // Wall décor
  const win = windowArt();
  for (const gx of [2.4, 5.9, 9.4]) { const p = P(gx, 0, 50); skewBlit(x, win, p.x, p.y, 1); }
  const wb = whiteboardArt();
  { const p = P(0, 5.8, 46); skewBlit(x, wb, p.x, p.y, -1); }
  const po = posterArt();
  { const p = P(0, 8.2, 46); skewBlit(x, po, p.x, p.y, -1); }
  { const p = P(0, 2.6, 44); skewBlit(x, clockArt(), p.x, p.y, -1); }

  // Plants
  plant(x, P(11.2, 8.2));
  plant(x, P(0.8, 8.3));

  const layer = { canvas: c, P };
  roomCache.set(level, layer);
  return layer;
}

function plant(x, p) {
  const ox = p.x, oy = p.y;
  isoBox(x, ox, oy, -0.3, -0.3, 0.6, 0.6, 9, '#c9774a', '#a45a36', '#83452a');
  const leaves = [[0, -22], [-5, -17], [5, -18], [-3, -25], [3, -26], [-7, -12], [7, -13], [0, -14]];
  for (const [lx, ly] of leaves) {
    rect(x, ox + lx - 3, oy + ly, 6, 4, '#2f8a4a');
    rect(x, ox + lx - 2, oy + ly - 1, 4, 1, '#4cb866');
  }
}

/** Purchased furniture. Kept dynamic so small animations (lamp/fish) stay alive. */
export function drawOfficeDecor(ctx, P, owned = [], t = 0) {
  const has = (id) => owned.includes(id);
  if (has('rug')) {
    const p = P(6, 4.25);
    poly(ctx, [
      { x: p.x, y: p.y - 11 }, { x: p.x + 42, y: p.y + 10 },
      { x: p.x, y: p.y + 31 }, { x: p.x - 42, y: p.y + 10 },
    ], '#a52d43');
    poly(ctx, [
      { x: p.x, y: p.y - 7 }, { x: p.x + 34, y: p.y + 10 },
      { x: p.x, y: p.y + 27 }, { x: p.x - 34, y: p.y + 10 },
    ], '#d89b38');
    poly(ctx, [
      { x: p.x, y: p.y - 3 }, { x: p.x + 27, y: p.y + 10 },
      { x: p.x, y: p.y + 23 }, { x: p.x - 27, y: p.y + 10 },
    ], '#8e2337');
  }
  if (has('sofa')) {
    const p = P(1.25, 5.2);
    isoBox(ctx, p.x, p.y, 0, 0, 2.2, 1.05, 10, '#9a6bd8', '#674694', '#523777');
    isoBox(ctx, p.x, p.y, 0, 0, 2.2, 0.25, 22, '#ad7be9', '#704b9d', '#5b3e82');
    rect(ctx, p.x - 21, p.y - 13, 5, 17, '#5b3e82');
    rect(ctx, p.x + 16, p.y + 5, 5, 17, '#523777');
  }
  if (has('shelf')) {
    const p = P(0.4, 1.1);
    rect(ctx, p.x - 5, p.y - 41, 28, 39, '#4a2e20');
    rect(ctx, p.x - 2, p.y - 38, 22, 32, '#7a4c2e');
    for (let y = 0; y < 3; y++) {
      rect(ctx, p.x, p.y - 35 + y * 10, 18, 6, y === 0 ? '#d96d55' : y === 1 ? '#5aa1c5' : '#d6ad45');
      rect(ctx, p.x + 6, p.y - 35 + y * 10, 3, 6, '#efe5c7');
    }
  }
  if (has('lamp')) {
    const p = P(10.8, 1.1);
    rect(ctx, p.x - 1, p.y - 30, 2, 29, '#665844');
    rect(ctx, p.x - 6, p.y - 32, 12, 3, '#574225');
    const glow = Math.floor(t * 2) % 2 ? '#ffe685' : '#ffd45a';
    poly(ctx, [{ x: p.x - 7, y: p.y - 38 }, { x: p.x + 7, y: p.y - 38 }, { x: p.x + 5, y: p.y - 30 }, { x: p.x - 5, y: p.y - 30 }], glow);
  }
  if (has('aquarium')) {
    const p = P(10.65, 7.45);
    isoBox(ctx, p.x, p.y, -0.7, -0.35, 1.4, 0.7, 9, '#765136', '#523624', '#3f2a20');
    rect(ctx, p.x - 14, p.y - 30, 28, 20, '#2c667d');
    rect(ctx, p.x - 12, p.y - 28, 24, 16, '#45bad0');
    const swim = Math.round(Math.sin(t * 2) * 6);
    rect(ctx, p.x - 2 + swim, p.y - 23, 5, 2, '#ffd34d');
    px(ctx, p.x + 2 + swim, p.y - 23, '#222');
    rect(ctx, p.x - 10 - swim / 2, p.y - 17, 4, 2, '#ef6f64');
  }
  if (has('trophy')) {
    const p = P(0, 7.1, 38);
    rect(ctx, p.x - 5, p.y - 4, 12, 3, '#6d4324');
    rect(ctx, p.x - 1, p.y - 13, 4, 9, '#d99022');
    rect(ctx, p.x - 6, p.y - 22, 14, 10, '#ffd34d');
    rect(ctx, p.x - 9, p.y - 20, 4, 5, '#ffd34d');
    rect(ctx, p.x + 7, p.y - 20, 4, 5, '#ffd34d');
    px(ctx, p.x, p.y - 19, '#fff3a0');
  }
}

/** Wall clock hands (dynamic, drawn over the cached room). */
export function drawClockHands(ctx, P, dayFrac) {
  const p = P(0, 2.6, 44);
  const cx = p.x + 6, cy = p.y + 5; // approximate centre after skew
  const hours = 9 + dayFrac * 9;
  const ha = ((hours % 12) / 12) * Math.PI * 2 - Math.PI / 2;
  const ma = ((hours % 1)) * Math.PI * 2 - Math.PI / 2;
  line(ctx, cx, cy, cx + Math.cos(ma) * 4, cy + Math.sin(ma) * 4 - Math.cos(ma) * 1.5, '#e0404a');
  line(ctx, cx, cy, cx + Math.cos(ha) * 3, cy + Math.sin(ha) * 3 - Math.cos(ha), '#2a2438');
}

// --- Workstation ---------------------------------------------------------------

// Desk footprint around the station anchor (grid units) and its height.
const DESK = { gx: -0.75, gy: -0.45, w: 1.5, d: 0.85, h: 10 };
export const PERSON_OFFSET = { x: -13, y: 8 };      // chair position relative to the desk anchor
export const MONITOR = { x: -8, y: -32, w: 18, h: 13 }; // bezel top-left (before skew)

export function drawDesk(ctx, ax, ay, seed) {
  isoBox(ctx, ax, ay, DESK.gx, DESK.gy, DESK.w, DESK.d, DESK.h, '#c08a58', '#9a6a40', '#7c522f');
  // top highlight edge
  const a = iso(DESK.gx, DESK.gy + DESK.d, DESK.h), b = iso(DESK.gx + DESK.w, DESK.gy + DESK.d, DESK.h);
  line(ctx, ax + a.x, ay + a.y, ax + b.x, ay + b.y, '#d8a472');
  // clutter: mug or papers
  if (hash(seed) > 0.5) {
    rect(ctx, ax + 11, ay - 12, 3, 3, '#f2f2f2'); px(ctx, ax + 14, ay - 11, '#f2f2f2'); rect(ctx, ax + 11, ay - 12, 3, 1, '#6b3a1e');
  } else {
    poly(ctx, [{ x: ax + 9, y: ay - 13 }, { x: ax + 15, y: ay - 10 }, { x: ax + 12, y: ay - 8 }, { x: ax + 6, y: ay - 11 }], '#f4f1e6');
    poly(ctx, [{ x: ax + 9, y: ay - 14 }, { x: ax + 15, y: ay - 11 }, { x: ax + 12, y: ay - 9 }, { x: ax + 6, y: ay - 12 }], '#ffffff');
  }
}

/** Monitor with a live screen image (16x10), skewed onto the desk. */
export function drawMonitor(ctx, ax, ay, screen, glow) {
  const x0 = ax + MONITOR.x, y0 = ay + MONITOR.y;
  const W = MONITOR.w, H = MONITOR.h;
  const sk = (dx, dy) => ({ x: x0 + dx, y: y0 + dy + Math.floor(dx / 2) });
  // stand + foot
  const s = sk(8, H);
  rect(ctx, s.x, s.y, 2, 4, '#2c2a36');
  poly(ctx, [{ x: s.x - 3, y: s.y + 3 }, { x: s.x + 4, y: s.y + 6 }, { x: s.x + 2, y: s.y + 7 }, { x: s.x - 5, y: s.y + 4 }], '#2c2a36');
  // back thickness
  poly(ctx, [sk(1, -1), sk(W + 1, -1), sk(W + 1, H - 1), sk(1, H - 1)], '#1a1822');
  // bezel
  poly(ctx, [sk(0, 0), sk(W, 0), sk(W, H), sk(0, H)], '#3a3848');
  poly(ctx, [sk(0, H - 1), sk(W, H - 1), sk(W, H), sk(0, H)], '#2a2836');
  skewBlit(ctx, screen, x0 + 1, y0 + 1, 1);
  if (glow) {
    const g = sk(W - 3, H - 2); px(ctx, g.x, g.y, glow);
  }
}

export function drawKeyboard(ctx, ax, ay, t, typing) {
  const a = { x: ax - 9, y: ay - 13 }, b = { x: ax + 1, y: ay - 8 };
  poly(ctx, [a, b, { x: b.x - 3, y: b.y + 2 }, { x: a.x - 3, y: a.y + 2 }], '#cfd0dc');
  for (let i = 0; i < 5; i++) {
    const k = typing && Math.floor(t * 12 + i * 3) % 5 === 0 ? '#8a8ca0' : '#a9abbd';
    px(ctx, a.x + i * 2, a.y + i + 1, k);
  }
}

// --- Screens ------------------------------------------------------------------
const screens = new Map();
function screenCanvas(id) {
  let s = screens.get(id);
  if (!s) { s = canvas(16, 10); screens.set(id, s); }
  return s;
}

const CODE_COLS = ['#7fd1ff', '#c3e88d', '#f78c6c', '#c792ea', '#ffcb6b'];

/** Render employee `e`'s screen for time t into a cached 16x10 canvas. */
export function renderScreen(e, t) {
  const [c, x] = screenCanvas(e.id);
  x.clearRect(0, 0, 16, 10);
  const mode = e.state === 'slack' ? e.slack : e.state === 'strike' ? 'off' : e.role;
  const speed = e.boost > 0 ? 3 : 1;
  switch (mode) {
    case 'dev': {
      rect(x, 0, 0, 16, 10, '#1b1f2b');
      const off = Math.floor(t * 3 * speed);
      for (let r = 0; r < 5; r++) {
        const n = r + off;
        const ind = Math.floor(hash(n * 3.1) * 3) * 2;
        const w = 3 + Math.floor(hash(n) * 10);
        rect(x, 1 + ind, 1 + r * 2, Math.min(w, 14 - ind), 1, CODE_COLS[Math.floor(hash(n * 7.7) * 5)]);
      }
      if (Math.floor(t * 2) % 2) rect(x, 2, 9, 2, 1, '#ffffff');
      break;
    }
    case 'acc': {
      rect(x, 0, 0, 16, 10, '#f4f6f0');
      rect(x, 0, 0, 16, 2, '#3c9a5a');
      for (let gx = 0; gx < 16; gx += 4) rect(x, gx, 2, 1, 8, '#c9d3c0');
      for (let gy = 4; gy < 10; gy += 2) rect(x, 0, gy, 16, 1, '#dbe3d3');
      const f = Math.floor(t * 4 * speed);
      for (let i = 0; i < 9; i++) {
        const cx = 1 + (i % 3) * 4 + (i % 2), cy = 3 + Math.floor(i / 3) * 2;
        if (hash(i + f) > 0.3) rect(x, cx, cy, 2, 1, '#333');
      }
      const sel = f % 9; rect(x, (sel % 3) * 4, 2 + Math.floor(sel / 3) * 2, 5, 3, 'rgba(60,154,90,0.35)');
      break;
    }
    case 'des': {
      rect(x, 0, 0, 16, 10, '#fafafa');
      rect(x, 0, 0, 3, 10, '#2e2e38');
      ['#e0404a', '#ffcb3d', '#46b37a', '#3a8ee6'].forEach((col, i) => px(x, 1, 1 + i * 2, col));
      const k = (t * 0.6 * speed) % 1;
      rect(x, 5, 2, 5, 5, '#ffcb3d');
      rect(x, 8, 5, 6, 3, '#3a8ee6');
      rect(x, 6, 3, 3, 3, '#e0404a');
      const cx = 4 + Math.floor(k * 10), cy = 2 + Math.floor(Math.abs(Math.sin(t * 2)) * 6);
      px(x, cx, cy, '#000'); px(x, cx + 1, cy + 1, '#000');
      break;
    }
    case 'game': {
      rect(x, 0, 0, 16, 10, '#5c94fc');
      rect(x, 0, 8, 16, 2, '#c84c0c');
      rect(x, 0, 8, 16, 1, '#f8b878');
      const sc = Math.floor(t * 8) % 16;
      rect(x, (14 - sc + 16) % 16, 2, 3, 1, '#ffffff');
      rect(x, (8 - sc + 16) % 16, 5, 2, 3, '#20a020');
      const jump = Math.abs(Math.sin(t * 6)) * 4;
      rect(x, 4, 5 - Math.round(jump), 2, 3, '#e0302a');
      px(x, 4, 5 - Math.round(jump), '#f8b878');
      if (Math.floor(t * 4) % 2) px(x, 10, 3, '#ffd700');
      break;
    }
    case 'crypto': {
      rect(x, 0, 0, 16, 10, '#0b0e13');
      const base = Math.floor(t * 2);
      let y = 5;
      for (let i = 0; i < 8; i++) {
        const d = hash(base + i) > 0.45 ? -1 : 1;
        const col = d < 0 ? '#26a69a' : '#ef5350';
        const h = 1 + Math.floor(hash(base * 3 + i) * 3);
        rect(x, 1 + i * 2, y - 1, 1, h + 2, shade(col, -0.4));
        rect(x, 1 + i * 2, y, 1, h, col);
        y = Math.max(1, Math.min(8, y + d * Math.floor(hash(i + base * 5) * 3)));
      }
      glyphs(x, '%', 12, 0, Math.floor(t * 3) % 2 ? '#ef5350' : '#26a69a');
      break;
    }
    case 'toptop': case 'sleep': {
      // screensaver
      rect(x, 0, 0, 16, 10, '#0c1024');
      const bx = Math.floor(Math.abs(((t * 5) % 24) - 12)), by = Math.floor(Math.abs(((t * 3.3) % 14) - 7));
      rect(x, Math.min(13, bx), Math.min(8, by), 3, 2, mode === 'sleep' ? '#3a4a8a' : '#7a5ad6');
      break;
    }
    case 'off':
      rect(x, 0, 0, 16, 10, '#08080c');
      px(x, 14, 8, '#e0404a');
      break;
  }
  if (e.state === 'hurt' && Math.floor(t * 20) % 2) { x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(0, 0, 16, 10); }
  return c;
}

// --- People --------------------------------------------------------------------

/**
 * Employee seen from behind, sitting on an office chair. (x, y) = floor point under the chair.
 * Returns the head position so callers can hang bubbles / effects off it.
 */
export function drawEmployee(ctx, x, y, e, t) {
  const L = e.look;
  const white = e.flash > 0 && Math.floor(t * 30) % 2 === 0;
  const angry = e.state === 'angry' || e.state === 'strike';
  const shirt = white ? '#ffffff' : L.shirt, shirtD = white ? '#ffe0e0' : shade(L.shirt, -0.3);
  const hair = white ? '#ffffff' : L.hair;
  const skin = white ? '#ffffff' : angry ? '#f08070' : L.skin;
  let dx = 0, dy = 0, hx = 0, hy = 0, handA = 0, handB = 0, armsUp = false;
  const phase = t + e.id * 0.37;

  switch (e.state) {
    case 'work': {
      const f = e.boost > 0 ? 16 : 8;
      handA = Math.floor(phase * f) % 2; handB = 1 - handA;
      hy = Math.floor(phase * 2) % 4 === 0 ? 1 : 0;
      break;
    }
    case 'slack':
      if (e.slack === 'game') { dx = Math.sin(phase * 14) > 0 ? 1 : 0; handA = Math.floor(phase * 20) % 2; handB = Math.floor(phase * 17) % 2; }
      if (e.slack === 'toptop') { hy = 2; }
      if (e.slack === 'sleep') { hx = 3; hy = 5; }
      if (e.slack === 'crypto') { hy = Math.floor(phase * 1.5) % 2; if (Math.floor(phase * 0.7) % 3 === 0) dy = -1; }
      break;
    case 'hurt': dy = e.t < 0.3 ? -4 : -1; armsUp = true; break;
    case 'angry': dx = Math.floor(phase * 30) % 2 ? 1 : -1; break;
    case 'strike': armsUp = true; break;
  }
  const bx = Math.round(x + dx), by = Math.round(y + dy);

  // chair base (does not jump)
  rect(ctx, x - 5, y - 1, 11, 1, '#1d1b26');
  px(ctx, x - 6, y, '#111'); px(ctx, x + 6, y, '#111'); px(ctx, x, y, '#111');
  rect(ctx, x - 1, y - 5, 2, 4, '#3a3746');
  rect(ctx, x - 6, y - 8, 12, 3, '#34303f');
  rect(ctx, x - 6, y - 8, 12, 1, '#4a4558');

  // torso
  rect(ctx, bx - 5, by - 17, 10, 9, shirt);
  rect(ctx, bx - 5, by - 17, 1, 9, shirtD);
  rect(ctx, bx + 4, by - 17, 1, 9, shirtD);
  rect(ctx, bx - 4, by - 17, 8, 1, shade(shirt, 0.2));

  // arms
  if (armsUp) {
    rect(ctx, bx - 7, by - 23, 2, 7, shirtD); rect(ctx, bx + 5, by - 23, 2, 7, shirtD);
    rect(ctx, bx - 7, by - 25, 2, 2, skin); rect(ctx, bx + 5, by - 25, 2, 2, skin);
  } else {
    rect(ctx, bx - 7, by - 16, 2, 5, shirtD);
    rect(ctx, bx + 5, by - 16, 2, 4, shirtD);
    rect(ctx, bx + 7, by - 17 - handA, 2, 2, skin);
    rect(ctx, bx - 8, by - 12 - handB, 2, 2, skin);
  }

  // chair back
  rect(ctx, x - 5, y - 14, 10, 7, '#2b2836');
  rect(ctx, x - 5, y - 14, 10, 1, '#46415a');
  rect(ctx, x - 5, y - 14, 1, 7, '#3a3548');

  // head
  const hX = bx - 4 + hx, hY = by - 26 + hy;
  rect(ctx, bx - 1, by - 18, 2, 1, shade(skin, -0.15));
  rect(ctx, hX - 1, hY + 4, 1, 2, skin);
  rect(ctx, hX + 8, hY + 4, 1, 2, skin);
  switch (L.style) {
    case 'bald':
      rect(ctx, hX, hY, 8, 8, skin);
      rect(ctx, hX + 2, hY + 1, 3, 1, shade(skin, 0.25));
      rect(ctx, hX, hY + 5, 8, 3, hair);
      break;
    case 'long':
      rect(ctx, hX, hY, 8, 8, hair);
      rect(ctx, hX - 1, hY + 3, 10, 9, hair);
      rect(ctx, hX + 2, hY, 4, 1, shade(hair, 0.3));
      break;
    case 'bun':
      rect(ctx, hX, hY, 8, 8, hair);
      rect(ctx, hX + 2, hY - 3, 4, 3, hair);
      rect(ctx, hX + 3, hY - 3, 2, 1, shade(hair, 0.3));
      rect(ctx, hX + 2, hY, 4, 1, shade(hair, 0.25));
      break;
    case 'spiky':
      rect(ctx, hX, hY, 8, 8, hair);
      for (let i = 0; i < 8; i += 2) px(ctx, hX + i, hY - 1, hair);
      rect(ctx, hX + 1, hY, 5, 1, shade(hair, 0.3));
      break;
    default:
      rect(ctx, hX, hY, 8, 8, hair);
      rect(ctx, hX + 2, hY, 4, 1, shade(hair, 0.3));
  }
  // neck gap under short hair
  if (L.style !== 'long') rect(ctx, hX + 2, hY + 7, 4, 1, skin);

  // props
  if (e.state === 'slack' && e.slack === 'toptop') {
    const pxl = bx - 10, pyl = by - 24;
    rect(ctx, pxl, pyl, 4, 6, '#15151c');
    const c1 = Math.floor(phase * 3) % 2 ? '#ff3d7f' : '#2de2e6';
    rect(ctx, pxl + 1, pyl + 1, 2, 4, c1);
    rect(ctx, pxl + 3, pyl + 3, 2, 2, skin);
  }
  if (e.state === 'strike') {
    rect(ctx, bx - 1, by - 38, 1, 14, '#7a5230');
    rect(ctx, bx - 9, by - 42, 17, 9, '#f6f1e2');
    rect(ctx, bx - 9, by - 42, 17, 1, '#c8c0a8');
    glyphs(ctx, '!!!!', bx - 8, by - 40, '#e0404a');
  }
  return { x: hX + 4, y: hY };
}

/** Speech bubble with an activity icon, hung above an employee's head. */
export function drawBubble(ctx, x, y, kind, t, urgent) {
  const bx = Math.round(x - 7), by = Math.round(y - 16 - (Math.floor(t * 3) % 2));
  const border = urgent && Math.floor(t * 6) % 2 ? '#ff2d3d' : '#1d1826';
  rect(ctx, bx, by, 15, 11, border);
  rect(ctx, bx + 1, by + 1, 13, 9, '#ffffff');
  rect(ctx, bx + 5, by + 11, 3, 1, border);
  px(ctx, bx + 6, by + 12, border);
  rect(ctx, bx + 6, by + 10, 1, 1, '#ffffff');
  const ix = bx + 2, iy = by + 2;
  switch (kind) {
    case 'game':
      rect(ctx, ix + 1, iy + 2, 9, 4, '#5a5a6e'); rect(ctx, ix, iy + 3, 11, 3, '#5a5a6e');
      px(ctx, ix + 2, iy + 3, '#fff'); rect(ctx, ix + 1, iy + 4, 3, 1, '#fff'); px(ctx, ix + 2, iy + 5, '#fff');
      px(ctx, ix + 8, iy + 3, '#e0404a'); px(ctx, ix + 7, iy + 4, '#46b37a');
      break;
    case 'toptop':
      rect(ctx, ix + 3, iy, 5, 7, '#15151c');
      rect(ctx, ix + 4, iy + 1, 3, 4, Math.floor(t * 4) % 2 ? '#ff3d7f' : '#2de2e6');
      px(ctx, ix + 9, iy + 1 - (Math.floor(t * 4) % 2), '#ff3d7f');
      break;
    case 'sleep':
      glyphs(ctx, 'Z', ix + 1, iy + 1, '#3a6bd6');
      glyphs(ctx, 'z', ix + 6, iy + 2, '#7a9be8');
      break;
    case 'crypto':
      line(ctx, ix, iy + 6, ix + 3, iy + 2, '#26a69a');
      line(ctx, ix + 3, iy + 2, ix + 6, iy + 5, '#ef5350');
      line(ctx, ix + 6, iy + 5, ix + 10, iy, '#26a69a');
      break;
  }
}

/** Little "z" glyphs drifting up from a sleeper. */
export function drawZzz(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3) % 1;
    const col = k > 0.7 ? '#9fb2e8' : '#dfe6ff';
    glyphs(ctx, 'z', x + 6 + k * 6 + i, y - 4 - k * 14, col);
  }
}

export function drawSteam(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.8 + i / 3) % 1;
    const c = k > 0.6 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)';
    rect(ctx, x + Math.round(Math.sin((k + i) * 6) * 2) + i * 3, y - k * 12, 2, 2, c);
  }
}

// --- Coffee machine & assistant ------------------------------------------------
export function drawCoffeeMachine(ctx, P, level, ready, t) {
  const p = P(0.15, 0.35);
  isoBox(ctx, p.x, p.y, 0, 0, 1.0, 1.6, 12, '#d8d4e6', '#a9a4bf', '#8c87a4');
  const cols = ['#4a4a55', '#8a2b2b', '#2b4a8a', '#c9a13a'];
  isoBox(ctx, p.x, p.y, 0.15, 0.3, 0.7, 0.7, 16, shade(cols[level], 0.15), cols[level], shade(cols[level], -0.3), 12);
  const q = iso(0.5, 1.0, 16);
  rect(ctx, p.x + q.x - 2, p.y + q.y - 1, 3, 3, '#151515');
  rect(ctx, p.x + q.x - 1, p.y + q.y + 2, 2, 2, '#f5f5f5');
  px(ctx, p.x + q.x + 2, p.y + q.y - 8, ready ? (Math.floor(t * 3) % 2 ? '#5cff7a' : '#2a8a3a') : '#ff4a4a');
  if (ready) drawSteam(ctx, p.x + q.x - 3, p.y + q.y - 22, t);
}

export function assistantPos(P) { return P(11.1, 1.3); }

export function drawAssistant(ctx, P, level, t, swingT) {
  const p = assistantPos(P);
  const x = Math.round(p.x), y = Math.round(p.y + (Math.floor(t * 2) % 2));
  const suit = ['#2b2d42', '#2b2d42', '#3a2b52', '#111'][level] || '#2b2d42';
  rect(ctx, x - 4, y - 1, 3, 1, '#111'); rect(ctx, x + 1, y - 1, 3, 1, '#111');
  rect(ctx, x - 3, y - 8, 2, 7, shade(suit, -0.2)); rect(ctx, x + 1, y - 8, 2, 7, shade(suit, -0.2));
  rect(ctx, x - 4, y - 16, 8, 9, suit);
  rect(ctx, x - 1, y - 16, 2, 4, '#f4f4f4'); px(ctx, x, y - 15, '#d02030'); px(ctx, x, y - 14, '#d02030');
  // arms: right arm raises the mini whip while swinging
  const swing = swingT > 0;
  rect(ctx, x - 6, y - 15, 2, 7, suit);
  rect(ctx, x - 6, y - 8, 2, 2, '#f1c7a0');
  if (swing) { rect(ctx, x + 4, y - 20, 2, 6, suit); rect(ctx, x + 4, y - 22, 2, 2, '#f1c7a0'); }
  else { rect(ctx, x + 4, y - 15, 2, 7, suit); rect(ctx, x + 4, y - 8, 2, 2, '#f1c7a0'); rect(ctx, x + 5, y - 13, 4, 5, '#c8a878'); rect(ctx, x + 6, y - 12, 2, 1, '#fff'); }
  // head, front-facing, with shades
  rect(ctx, x - 3, y - 23, 7, 7, '#f1c7a0');
  rect(ctx, x - 3, y - 24, 7, 2, '#1a1210');
  rect(ctx, x - 3, y - 21, 7, 2, '#111');
  px(ctx, x - 2, y - 21, '#5a6ee0');
  rect(ctx, x - 1, y - 18, 3, 1, '#b0705a');
  return { hand: { x: x + 5, y: y - 22 } };
}

// --- Mini bar (taskbar) station ---------------------------------------------------
export const MINI_SLOT = 38;
export const MINI_H = 46;

export function drawMiniStation(ctx, x, e, t) {
  // desk strip
  rect(ctx, x, MINI_H - 12, MINI_SLOT, 12, '#7c522f');
  rect(ctx, x, MINI_H - 12, MINI_SLOT, 2, '#c08a58');
  // monitor (flat)
  const scr = renderScreen(e, t);
  rect(ctx, x + 17, MINI_H - 30, 18, 13, '#3a3848');
  ctx.drawImage(scr, x + 18, MINI_H - 29);
  rect(ctx, x + 25, MINI_H - 17, 3, 5, '#2c2a36');
  return drawEmployee(ctx, x + 11, MINI_H - 2, e, t);
}
