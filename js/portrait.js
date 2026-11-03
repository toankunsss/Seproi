// Portrait (phone) office: a grid of cubicles seen from behind the staff, under a back wall
// with windows, a clock, the coffee machine, the assistant and bought furniture.
//
// The isometric room (sprites.js roomLayer) is drawn for wide screens; squeezed into a tall
// phone screen it leaves the staff tiny. Here every employee gets a big, evenly sized cubicle
// whose whole area is the tap target, and the screen they are looking at is clearly visible.
//
//   ┌───────── wall (windows · clock · coffee · shelf · assistant) ─────────┐
//   │ [cubicle] [cubicle] [cubicle]                                          │
//   │ [cubicle] [cubicle] [  +  ]   ← empty desk: tap to hire               │
//   └───────────────────────────────────────────────────────────────────────┘
import { rect, px, line } from './pixel.js';
import {
  shade, renderScreen, drawEmployee, drawAssistant, drawOfficeDecor, drawSteam, drawVisitor,
} from './sprites.js';
import { TUNING, VISITS } from './config.js';

export const CELL = { w: 50, h: 60 };
const WALL_H = 50;          // back wall height (floor starts below it)
const MX = 4, GX = 6, GY = 4, TOP = 2, BOTTOM = 4;
const ROLE_PANEL = { dev: '#4a5a9a', acc: '#3f7a5a', des: '#8a4a78' };

/**
 * Grid for an office with `capacity` desks, sized for the space (cw x ch, CSS px) it gets:
 * 2 columns for the starter office (4 desks), 3 columns once it grows (6 desks), and 3 or 4
 * columns for the full office (8 desks) — whichever draws bigger on this screen. The spare
 * 9th cell of a 3x3 grid is a lounge corner.
 */
export function portraitLayout(capacity, cw = 400, ch = 600) {
  const options = capacity <= 4 ? [2] : capacity <= 6 ? [3] : [3, 4];
  let best = null;
  for (const cols of options) {
    const L = grid(capacity, cols);
    L.fit = Math.min(cw / L.W, ch / L.H);
    if (!best || L.fit > best.fit + 0.05) best = L;
  }
  return best;
}

function grid(capacity, cols) {
  const rows = Math.ceil(capacity / cols);
  const W = MX * 2 + cols * CELL.w + (cols - 1) * GX;
  const H = WALL_H + TOP + rows * CELL.h + (rows - 1) * GY + BOTTOM;
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    cells.push({ x: MX + c * (CELL.w + GX), y: WALL_H + TOP + r * (CELL.h + GY) });
  }
  return { cols, rows, W, H, capacity, cells };
}

/**
 * Draw the whole scene. Returns the hit areas:
 *   hits  — [{ e, x0, y0, x1, y1, head, stress }] one per employee (whole cubicle)
 *   slots — [{ x0, y0, x1, y1 }] empty desks (tap → hire)
 *   hand  — assistant's hand (where its auto-whip starts), or null
 */
export function drawPortraitOffice(ctx, L, g, t, whip) {
  drawFloor(ctx, L, g);
  const hand = drawWall(ctx, L, g, t, whip);
  const hits = [], slots = [];
  L.cells.forEach((c, i) => {
    const e = g.staff[i];
    if (e) {
      const head = drawCubicle(ctx, c.x, c.y, e, t);
      hits.push({ e, x0: c.x, y0: c.y, x1: c.x + CELL.w, y1: c.y + CELL.h, head, stress: { x: c.x + 9, y: c.y + CELL.h - 1 } });
    } else if (i < L.capacity) {
      drawEmptyDesk(ctx, c.x, c.y, t);
      slots.push({ x0: c.x, y0: c.y, x1: c.x + CELL.w, y1: c.y + CELL.h });
    } else {
      drawLounge(ctx, c.x, c.y, t);
    }
  });
  if (g.visit) drawVisitorWalk(ctx, L, g.visit, t);
  return { hits, slots, hand };
}

/** Surprise visitor: walks in from the left, inspects in the middle, walks out. */
function drawVisitorWalk(ctx, L, v, t) {
  const walk = 3, stay = VISITS.duration - walk;
  const mid = Math.round(L.W / 2) + 10, from = -8;
  let x = mid, walking = false;
  if (v.t < walk) { x = from + (mid - from) * (v.t / walk); walking = true; }
  else if (v.t > stay) { x = mid + (L.W + 8 - mid) * ((v.t - stay) / walk); walking = true; }
  const attention = v.kind === 'labour' && !walking ? (v.watching ? 'watching' : 'distracted') : null;
  drawVisitor(ctx, x, WALL_H + 1, v.kind, t, walking, attention);
}

// --- Floor & wall -----------------------------------------------------------------------------

function drawFloor(ctx, L, g) {
  for (let y = WALL_H; y < L.H; y += 8) for (let x = 0; x < L.W; x += 8) {
    rect(ctx, x, y, 8, 8, ((x + y) / 8) % 2 ? '#3f3a5c' : '#46406a');
  }
  if (g.decor.includes('rug')) {
    const w = Math.round(L.W * 0.46), x = Math.round((L.W - w) / 2);
    rect(ctx, x, WALL_H + 1, w, L.H - WALL_H - 2, '#a52d43');
    rect(ctx, x + 2, WALL_H + 3, w - 4, L.H - WALL_H - 6, '#d89b38');
    rect(ctx, x + 4, WALL_H + 5, w - 8, L.H - WALL_H - 10, '#8e2337');
  }
  rect(ctx, 0, WALL_H, L.W, 2, 'rgba(0,0,0,0.3)'); // shadow under the wall
}

function drawWall(ctx, L, g, t, whip) {
  const W = L.W, dayFrac = Math.min(1, g.dayTime / TUNING.dayLength);
  rect(ctx, 0, 0, W, WALL_H, '#574d7d');
  rect(ctx, 0, 0, W, 3, '#221c35');
  rect(ctx, 0, WALL_H - 14, W, 12, '#463b67');
  rect(ctx, 0, WALL_H - 14, W, 1, '#766aa3');
  rect(ctx, 0, WALL_H - 2, W, 2, '#2a2340');

  // Windows: sky follows the working day (morning blue → late-afternoon orange).
  const sky = dayFrac < 0.7 ? '#5aa7e8' : dayFrac < 0.88 ? '#e8a65a' : '#d2694e';
  const n = W > 140 ? 4 : 2;
  const cx = Math.round(W / 2);
  const spots = n === 4 ? [0.12, 0.3, 0.7, 0.88] : [0.2, 0.8];
  for (const f of spots) drawWindow(ctx, Math.round(W * f) - 11, 7, sky);
  drawClock(ctx, cx, 13, dayFrac);

  // Things standing against the wall, packed from both ends.
  const base = WALL_H - 1;
  let xl = 13, xr = W - 13;
  plant(ctx, 6, base);
  plant(ctx, W - 7, base);
  const decor = g.decor || [];
  const pos = {};
  if (g.coffeeLevel >= 0) { drawCoffee(ctx, xl, base, g.coffeeLevel, g.coffeeCd <= 0, t); xl += 18; }
  if (decor.includes('shelf')) { pos['0.4,1.1'] = { x: xl + 5, y: base }; pos['0,7.1'] = { x: xl + 8, y: base - 41 }; xl += 30; }
  let hand = null;
  if (g.assistantLevel >= 0) {
    const ax = xr - 6;
    hand = drawAssistant(ctx, () => ({ x: ax, y: base + 1 }), g.assistantLevel, t, whip.swingT).hand;
    xr -= 16;
  }
  if (decor.includes('lamp')) { pos['10.8,1.1'] = { x: xr - 6, y: base }; xr -= 14; }
  if (decor.includes('aquarium')) { drawAquarium(ctx, xr - 14, base, t); xr -= 30; }
  if (decor.includes('sofa') && xr - xl >= 28) drawSofa(ctx, Math.round((xl + xr) / 2), base);
  // Shelf, trophy and lamp are flat sprites in sprites.js: reuse them at our wall positions.
  const P = (gx, gy) => pos[`${gx},${gy}`] || { x: -999, y: -999 };
  drawOfficeDecor(ctx, P, decor.filter((id) => id === 'shelf' || id === 'trophy' || id === 'lamp'), t);
  return hand;
}

function drawWindow(ctx, x, y, sky) {
  rect(ctx, x, y, 22, 17, '#dfe6ff');
  rect(ctx, x + 1, y + 1, 20, 15, sky);
  rect(ctx, x + 2, y + 2, 7, 2, 'rgba(255,255,255,0.55)');
  for (const [bx, bw, bh] of [[1, 5, 6], [6, 4, 9], [10, 5, 5], [15, 6, 8]]) {
    rect(ctx, x + bx, y + 16 - bh, bw, bh, '#3b4f7a');
    px(ctx, x + bx + 1, y + 17 - bh + 1, '#ffe685');
  }
  rect(ctx, x + 10, y + 1, 2, 15, '#dfe6ff');
  rect(ctx, x - 1, y + 17, 24, 2, '#8a80b0');
}

function drawClock(ctx, cx, cy, dayFrac) {
  rect(ctx, cx - 5, cy - 6, 11, 13, '#2a2340');
  rect(ctx, cx - 6, cy - 5, 13, 11, '#2a2340');
  rect(ctx, cx - 4, cy - 5, 9, 11, '#f4f1ea');
  rect(ctx, cx - 5, cy - 4, 11, 9, '#f4f1ea');
  px(ctx, cx, cy - 4, '#2a2340'); px(ctx, cx, cy + 4, '#2a2340'); px(ctx, cx - 4, cy, '#2a2340'); px(ctx, cx + 4, cy, '#2a2340');
  const hours = 9 + dayFrac * 9;
  const ha = (hours / 12) * Math.PI * 2, ma = (hours % 1) * Math.PI * 2;
  line(ctx, cx, cy, Math.round(cx + Math.sin(ha) * 2.5), Math.round(cy - Math.cos(ha) * 2.5), '#2a2340');
  line(ctx, cx, cy, Math.round(cx + Math.sin(ma) * 4), Math.round(cy - Math.cos(ma) * 4), '#d02030');
}

function plant(ctx, x, base) {
  rect(ctx, x - 4, base - 6, 8, 6, '#c9774a');
  rect(ctx, x - 4, base - 6, 8, 1, '#e0935f');
  for (const [lx, ly] of [[0, -14], [-3, -11], [3, -11], [-4, -8], [4, -8], [0, -9]]) {
    rect(ctx, x + lx - 2, base + ly, 4, 3, '#2f8a4a');
    rect(ctx, x + lx - 1, base + ly - 1, 2, 1, '#4cb866');
  }
}

function drawCoffee(ctx, x, base, level, ready, t) {
  const cols = ['#4a4a55', '#8a2b2b', '#2b4a8a', '#c9a13a'];
  rect(ctx, x, base - 20, 15, 20, '#a9a4bf');
  rect(ctx, x, base - 20, 15, 2, '#d8d4e6');
  rect(ctx, x + 1, base - 18, 13, 5, cols[level] || cols[0]);
  rect(ctx, x + 3, base - 11, 9, 7, '#2a2836');
  rect(ctx, x + 6, base - 11, 3, 2, '#151515');
  rect(ctx, x + 5, base - 6, 5, 4, '#f5f5f5');
  px(ctx, x + 12, base - 16, ready ? (Math.floor(t * 3) % 2 ? '#5cff7a' : '#2a8a3a') : '#ff4a4a');
  if (ready) drawSteam(ctx, x + 4, base - 22, t);
}

function drawAquarium(ctx, cx, base, t) {
  rect(ctx, cx - 13, base - 9, 26, 9, '#6b4a30');
  rect(ctx, cx - 13, base - 9, 26, 1, '#8a6040');
  rect(ctx, cx - 11, base - 3, 2, 3, '#3f2a20'); rect(ctx, cx + 9, base - 3, 2, 3, '#3f2a20');
  rect(ctx, cx - 14, base - 29, 28, 20, '#2c667d');
  rect(ctx, cx - 12, base - 27, 24, 16, '#45bad0');
  rect(ctx, cx - 12, base - 14, 24, 3, '#d8c48a');
  rect(ctx, cx - 9, base - 19, 1, 5, '#2f8a4a'); rect(ctx, cx + 7, base - 21, 1, 7, '#2f8a4a');
  const swim = Math.round(Math.sin(t * 2) * 6);
  rect(ctx, cx - 2 + swim, base - 23, 5, 2, '#ffd34d');
  px(ctx, cx + 2 + swim, base - 23, '#222');
  rect(ctx, cx - 6 - Math.round(swim / 2), base - 18, 4, 2, '#ef6f64');
  px(ctx, cx + 4, base - 25 - (Math.floor(t * 2) % 3), '#d8f4ff');
}

function drawSofa(ctx, cx, base) {
  const x = cx - 13;
  rect(ctx, x + 2, base - 15, 22, 9, '#ad7be9');
  rect(ctx, x + 2, base - 15, 22, 1, '#c79cff');
  rect(ctx, x, base - 10, 26, 7, '#9a6bd8');
  rect(ctx, x, base - 11, 4, 9, '#704b9d');
  rect(ctx, x + 22, base - 11, 4, 9, '#704b9d');
  rect(ctx, x + 1, base - 3, 2, 3, '#3a2a52');
  rect(ctx, x + 23, base - 3, 2, 3, '#3a2a52');
}

// --- Cubicles --------------------------------------------------------------------------------

/** Partition + desk + monitor (screen facing us) + employee seen from behind. Returns head pos. */
function drawCubicle(ctx, x, y, e, t) {
  const panel = ROLE_PANEL[e.role] || '#4a4560';
  drawPartition(ctx, x, y, panel);
  // monitor (behind the desk), red frame while the employee slacks
  const slacking = e.state === 'slack';
  const urgent = slacking && e.t > e.dur * 0.5;
  if (slacking && (!urgent || Math.floor(t * 6) % 2)) rect(ctx, x + 23, y + 3, 24, 18, '#ff2d3d');
  rect(ctx, x + 24, y + 4, 22, 16, '#1a1822');
  rect(ctx, x + 25, y + 5, 20, 14, '#3a3848');
  ctx.drawImage(renderScreen(e, t), x + 27, y + 7);
  rect(ctx, x + 33, y + 20, 4, 2, '#2c2a36');
  drawDesk(ctx, x, y, e.id);
  // keyboard: keys flicker while typing
  rect(ctx, x + 26, y + 23, 14, 3, '#d8d4e0');
  if (e.state === 'work' && Math.floor(t * 10 + e.id) % 2) px(ctx, x + 28 + Math.floor((t * 23 + e.id * 5) % 10), y + 24, '#8a86a0');
  const head = drawEmployee(ctx, x + 15, y + CELL.h - 4, e, t);
  drawMood(ctx, x + 40, y + 42, e.motiv ?? 50, t);
  return head;
}

/** Motivation hint on the floor next to the chair: ♥ when keen (≥75), rain cloud when fed up (≤25). */
function drawMood(ctx, x, y, motiv, t) {
  const bob = Math.floor(t * 2) % 2;
  if (motiv >= 75) {
    const c = '#ff5a7a', y0 = y - bob;
    rect(ctx, x - 3, y0, 2, 1, c); rect(ctx, x + 1, y0, 2, 1, c);
    rect(ctx, x - 4, y0 + 1, 8, 2, c); rect(ctx, x - 3, y0 + 3, 6, 1, c); rect(ctx, x - 2, y0 + 4, 4, 1, c); px(ctx, x - 1, y0 + 5, c); px(ctx, x, y0 + 5, c);
    px(ctx, x - 3, y0 + 1, '#ffd0dc');
  } else if (motiv <= 25) {
    rect(ctx, x - 4, y, 8, 3, '#6a6680'); rect(ctx, x - 2, y - 1, 4, 1, '#6a6680'); rect(ctx, x - 5, y + 1, 10, 2, '#5a5670');
    px(ctx, x - 2, y + 4 + bob, '#7fb0ff'); px(ctx, x + 2, y + 5 - bob, '#7fb0ff');
  }
}

function drawPartition(ctx, x, y, color) {
  rect(ctx, x + 1, y + 1, CELL.w - 2, 18, shade(color, -0.25));
  rect(ctx, x + 2, y + 2, CELL.w - 4, 16, color);
  rect(ctx, x + 1, y + 1, CELL.w - 2, 1, shade(color, 0.35));
  for (let i = 0; i < 3; i++) rect(ctx, x + 5, y + 5 + i * 4, 10, 1, shade(color, -0.12)); // fabric lines
  rect(ctx, x + 6, y + 8, 6, 5, '#f3e7a0'); // sticky note
  rect(ctx, x + 7, y + 9, 4, 1, '#c9b860');
}

function drawDesk(ctx, x, y, seed) {
  rect(ctx, x + 2, y + 21, CELL.w - 4, 7, '#c08a58');
  rect(ctx, x + 2, y + 21, CELL.w - 4, 1, '#d9a874');
  rect(ctx, x + 2, y + 28, CELL.w - 4, 6, '#7c522f');
  rect(ctx, x + 2, y + 28, CELL.w - 4, 1, '#5e3d22');
  // a mug or papers, different per desk
  if (seed % 2) { rect(ctx, x + 6, y + 18, 4, 4, '#e8e0f0'); rect(ctx, x + 10, y + 19, 1, 2, '#e8e0f0'); }
  else { rect(ctx, x + 5, y + 20, 7, 2, '#f4f1ea'); rect(ctx, x + 6, y + 19, 7, 2, '#ffffff'); }
}

function drawChair(ctx, x, y) {
  rect(ctx, x - 5, y - 1, 11, 1, '#1d1b26');
  px(ctx, x - 6, y, '#111'); px(ctx, x + 6, y, '#111'); px(ctx, x, y, '#111');
  rect(ctx, x - 1, y - 5, 2, 4, '#3a3746');
  rect(ctx, x - 6, y - 8, 12, 3, '#34303f');
  rect(ctx, x - 5, y - 16, 10, 9, '#2b2836');
  rect(ctx, x - 5, y - 16, 10, 1, '#46415a');
}

function drawEmptyDesk(ctx, x, y, t) {
  drawPartition(ctx, x, y, '#4a4560');
  rect(ctx, x + 24, y + 4, 22, 16, '#1a1822');
  rect(ctx, x + 25, y + 5, 20, 14, '#3a3848');
  rect(ctx, x + 27, y + 7, 16, 10, '#15131c');
  rect(ctx, x + 33, y + 20, 4, 2, '#2c2a36');
  drawDesk(ctx, x, y, 0);
  drawChair(ctx, x + 15, y + CELL.h - 4);
  // "+" badge: free desk, tap to hire
  const bob = Math.floor(t * 2) % 2;
  const bx = x + CELL.w - 17, by = y + 36 - bob;
  rect(ctx, bx, by, 13, 13, '#1d1826');
  rect(ctx, bx + 1, by + 1, 11, 11, bob ? '#ffd34d' : '#e8b83a');
  rect(ctx, bx + 1, by + 11, 11, 1, '#b8862a');
  rect(ctx, bx + 5, by + 3, 3, 7, '#ffffff');
  rect(ctx, bx + 3, by + 5, 7, 3, '#ffffff');
  rect(ctx, bx + 5, by + 9, 3, 1, '#c99b3d');
}

function drawLounge(ctx, x, y, t) {
  // water cooler + plant: fills the spare cell of the 3x3 grid
  const cx = x + 18, base = y + CELL.h - 4;
  rect(ctx, cx - 5, base - 20, 10, 20, '#d8d4e6');
  rect(ctx, cx - 5, base - 20, 10, 1, '#f4f1ea');
  rect(ctx, cx - 4, base - 31, 8, 11, '#7ec8f0');
  rect(ctx, cx - 3, base - 30, 2, 8, '#bfe6ff');
  const k = Math.floor(t * 1.5) % 6;
  px(ctx, cx - 1, base - 22 - k, '#e8f6ff');
  rect(ctx, cx + 2, base - 14, 3, 2, '#5a6ee0');
  plant(ctx, x + 38, base);
}
