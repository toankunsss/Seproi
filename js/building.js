// Building overview: the company as a cross-section of rooms (two per floor), drawn small so
// the boss can watch every room at once. Each room shows its desks and people, its KPI and an
// alert frame (yellow = watch it, blinking red = trouble: slackers, a strike, the weekly boss,
// a late contract…). Tap a room to go into it; tap the "+" slot to build the next room.
//
//      ┌──── roof · WHIP BOSS sign ────┐
//      │ [ room 5 ]      [ room 6 ]    │  floor 3
//      │ [ room 3 ]      [ room 4 ]    │  floor 2
//      │ [ room 1 ]      [ room 2 ]    │  floor 1
//      └──────── lobby · street ───────┘
import { rect, px, glyphs, glyphsWidth, hash } from './pixel.js';
import { shade } from './sprites.js';
import { BUILD, dayLen } from './config.js';
import { roomStaff, roomAlert, capOf, nextRoom } from './rooms.js';

const RW = 86, RH = 60, WALL = 4, SLAB = 5, MX = 8, ROOF = 30, GROUND = 18;
const FLOORS = Math.ceil(BUILD.rooms.length / BUILD.perFloor);
const LEVEL_WALL = ['#574d7d', '#4a5f8f', '#6a4d7d'];

/** Fixed layout (buffer pixels) with the screen rect of every room slot. */
export function buildingLayout() {
  const W = MX * 2 + WALL * 3 + RW * 2;
  const H = ROOF + FLOORS * (RH + SLAB) + GROUND;
  const cells = [];
  for (let i = 0; i < FLOORS * BUILD.perFloor; i++) {
    const f = Math.floor(i / BUILD.perFloor), c = i % BUILD.perFloor;
    cells.push({ r: i, x: MX + WALL + c * (RW + WALL), y: H - GROUND - (f + 1) * (RH + SLAB) + SLAB });
  }
  return { W, H, cells };
}

const fmtK = (n) => (n >= 1e6 ? (Math.round(n / 1e5) / 10 + 'M').replace('.0M', 'M') : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n)));

/**
 * Draw the overview. Returns hits: [{ r, kind: 'room' | 'build' | 'locked', x0, y0, x1, y1 }].
 */
export function drawBuilding(ctx, L, g, t) {
  const hits = [];
  const built = g.rooms.length;
  // shell of the building (only up to the highest floor in use + the floor being offered)
  const floorsUp = Math.min(FLOORS, Math.floor(Math.min(built, BUILD.rooms.length - 1) / BUILD.perFloor) + 1);
  const shellTop = L.H - GROUND - floorsUp * (RH + SLAB);
  // static parts come from two cached layers: the sky (behind the clouds) and the building frame
  ctx.drawImage(layer('sky', `${L.W}x${L.H}|${skyColors(g).join()}`, L, (c) => drawSky(c, L, g)), 0, 0);
  drawClouds(ctx, L, t);
  ctx.drawImage(layer('frame', `${L.W}x${L.H}|${built}`, L, (c) => {
    rect(c, MX, shellTop - 4, L.W - MX * 2, L.H - GROUND - shellTop + 4, '#2a2340');
    for (let f = floorsUp; f < FLOORS; f++) drawScaffold(c, L, L.H - GROUND - (f + 1) * (RH + SLAB), f);
    for (const cell of L.cells) {
      if (Math.floor(cell.r / BUILD.perFloor) >= floorsUp) continue;
      if (cell.r === built) hatch(c, cell.x, cell.y);
      else if (cell.r > built) drawLocked(c, cell.x, cell.y);
      if (cell.r % BUILD.perFloor === 0) rect(c, MX, cell.y + RH, L.W - MX * 2, SLAB, '#3a3152');
    }
  }), 0, 0);
  drawRoof(ctx, L, shellTop - 4, t);
  for (const c of L.cells) {
    const f = Math.floor(c.r / BUILD.perFloor);
    if (f >= floorsUp) continue;
    if (c.r < built) {
      const a = roomAlert(g, c.r);
      drawRoom(ctx, c.x, c.y, g, c.r, a, t);
      hits.push({ r: c.r, kind: 'room', x0: c.x, y0: c.y, x1: c.x + RW, y1: c.y + RH });
    } else if (c.r === built) {
      const n = nextRoom(g), ready = n && (g.lifetimeEarnings || 0) >= n.unlockRevenue;
      drawBuildSlot(ctx, c.x, c.y, n, ready, g.money >= (n ? n.cost : Infinity), t);
      hits.push({ r: c.r, kind: 'build', x0: c.x, y0: c.y, x1: c.x + RW, y1: c.y + RH });
    } else {
      hits.push({ r: c.r, kind: 'locked', x0: c.x, y0: c.y, x1: c.x + RW, y1: c.y + RH });
    }
  }
  drawStreet(ctx, L, g, t);
  return hits;
}

// --- background -------------------------------------------------------------------------------
const layers = {};
/** Offscreen layer `name`, redrawn by `draw` only when `key` changes. */
function layer(name, key, L, draw) {
  let l = layers[name];
  if (!l) l = layers[name] = { c: document.createElement('canvas'), key: '' };
  if (l.key !== key) {
    l.c.width = L.W; l.c.height = L.H;
    const x = l.c.getContext('2d');
    x.clearRect(0, 0, L.W, L.H);
    draw(x);
    l.key = key;
  }
  return l.c;
}

function skyColors(g) {
  const dayFrac = Math.min(1, g.dayTime / dayLen(g));
  return dayFrac < 0.7 ? ['#4f93d8', '#6fb0ea'] : dayFrac < 0.88 ? ['#d88a4f', '#e8a65a'] : ['#7a4a78', '#d2694e'];
}

function drawSky(ctx, L, g) {
  const sky = skyColors(g);
  rect(ctx, 0, 0, L.W, L.H, sky[1]);
  rect(ctx, 0, 0, L.W, Math.round(L.H * 0.45), sky[0]);
  // far skyline on both sides
  for (let x = 0; x < L.W; x += 9) {
    const h = 20 + Math.round(hash(x + 77) * 50);
    rect(ctx, x, L.H - GROUND - h, 8, h, 'rgba(60,50,100,0.35)');
  }
}

function drawClouds(ctx, L, t) {
  for (let i = 0; i < 4; i++) {
    const x = Math.round(((t * (2 + i) + hash(i * 9) * 300) % (L.W + 40)) - 20), y = 6 + Math.round(hash(i * 5 + 1) * 40);
    rect(ctx, x, y, 14, 3, 'rgba(255,255,255,0.75)'); rect(ctx, x + 3, y - 2, 7, 2, 'rgba(255,255,255,0.75)');
  }
}

function drawRoof(ctx, L, y, t) {
  rect(ctx, MX - 3, y - 3, L.W - MX * 2 + 6, 4, '#1d1826');
  rect(ctx, MX - 3, y - 3, L.W - MX * 2 + 6, 1, '#4a4068');
  // sign on two poles
  const text = 'WHIP BOSS', w = glyphsWidth(text, 2) + 10, sx = Math.round((L.W - w) / 2), sy = y - 20;
  rect(ctx, sx + 6, sy + 13, 2, 5, '#1d1826'); rect(ctx, sx + w - 8, sy + 13, 2, 5, '#1d1826');
  rect(ctx, sx, sy, w, 14, '#1d1826');
  rect(ctx, sx + 1, sy + 1, w - 2, 12, '#a52d43');
  const blink = Math.floor(t * 1.5) % 6 === 0;
  glyphs(ctx, text, sx + 5, sy + 2, blink ? '#ffffff' : '#ffd34d', 2);
  // antenna with a red light
  rect(ctx, L.W - MX - 14, y - 16, 1, 13, '#1d1826');
  px(ctx, L.W - MX - 14, y - 17, Math.floor(t * 2) % 2 ? '#ff3d3d' : '#6a1d24');
}

function drawScaffold(ctx, L, y, f) {
  const x0 = MX, w = L.W - MX * 2, h = RH + SLAB;
  for (let x = x0; x <= x0 + w; x += 22) rect(ctx, x, y, 2, h, 'rgba(201,119,74,0.55)');
  for (let yy = y + 6; yy < y + h; yy += 18) rect(ctx, x0, yy, w, 2, 'rgba(201,119,74,0.55)');
  if (f === FLOORS - 1) { // crane hook on the top floor
    rect(ctx, x0 + w - 30, y - 6, 30, 2, '#e0a030');
    rect(ctx, x0 + w - 18, y - 4, 1, 14, '#1d1826');
    rect(ctx, x0 + w - 20, y + 10, 5, 3, '#e0a030');
  }
}

function drawStreet(ctx, L, g, t) {
  const y = L.H - GROUND;
  rect(ctx, 0, y, L.W, GROUND, '#3b3550');
  rect(ctx, 0, y, L.W, 2, '#5a5278');
  rect(ctx, 0, y + 10, L.W, 8, '#24202f');
  for (let x = Math.floor(-t * 12) % 14; x < L.W; x += 14) rect(ctx, x, y + 13, 7, 1, '#8a8299');
  // lobby door under the middle of the building
  const dx = Math.round(L.W / 2) - 7;
  rect(ctx, dx, y - 1, 14, 3, '#ffd34d');
  // a little car passing now and then
  const cx = Math.round(((t * 25) % (L.W + 60)) - 30);
  rect(ctx, cx, y + 11, 14, 4, '#d65a3d'); rect(ctx, cx + 3, y + 9, 7, 2, '#d65a3d');
  rect(ctx, cx + 4, y + 9, 2, 1, '#bfe3ff'); rect(ctx, cx + 7, y + 9, 2, 1, '#bfe3ff');
  px(ctx, cx + 2, y + 15, '#111'); px(ctx, cx + 11, y + 15, '#111');
}

// --- rooms --------------------------------------------------------------------------------------
function drawRoom(ctx, x, y, g, r, a, t) {
  const room = g.rooms[r];
  const wall = LEVEL_WALL[room.level] || LEVEL_WALL[0];
  // back wall, floor, window
  rect(ctx, x, y, RW, RH, shade(wall, -0.15));
  rect(ctx, x, y, RW, 24, wall);
  rect(ctx, x, y + 24, RW, 1, shade(wall, 0.25));
  for (let fx = x; fx < x + RW; fx += 6) rect(ctx, fx, y + 25, 3, RH - 25, 'rgba(255,255,255,0.04)');
  const dayFrac = Math.min(1, g.dayTime / dayLen(g));
  const sky = dayFrac < 0.7 ? '#5aa7e8' : dayFrac < 0.88 ? '#e8a65a' : '#d2694e';
  for (const wx of [x + 26, x + 52]) { rect(ctx, wx, y + 5, 14, 10, '#dfe6ff'); rect(ctx, wx + 1, y + 6, 12, 8, sky); rect(ctx, wx + 6, y + 6, 1, 8, '#dfe6ff'); }
  if (room.level >= 2) rect(ctx, x, y + 22, RW, 2, '#d89b38'); // gold trim in a top room
  // desks: two rows
  const cap = capOf(g, r), cols = Math.ceil(cap / 2), people = roomStaff(g, r);
  for (let i = 0; i < cap; i++) {
    const row = Math.floor(i / cols), col = i % cols;
    const span = (RW - 12) / cols;
    const dx = Math.round(x + 6 + col * span + span / 2), dy = y + 37 + row * 14;
    drawMiniDesk(ctx, dx, dy, people[i], t);
  }
  // project clipboard + progress
  const p = room.project;
  if (p) {
    const k = Object.keys(p.req), frac = k.reduce((s, q) => s + Math.min(1, p.prog[q] / p.req[q]), 0) / k.length;
    rect(ctx, x + 3, y + 13, 6, 8, '#c9a46a'); rect(ctx, x + 4, y + 14, 4, 6, '#f4f1ea'); rect(ctx, x + 5, y + 12, 2, 2, '#6a6a7a');
    rect(ctx, x + 10, y + 18, 13, 3, '#1d1826');
    rect(ctx, x + 11, y + 19, Math.round(11 * frac), 1, a.late ? '#ff5050' : '#7fd0ff');
  }
  // label plate and KPI
  rect(ctx, x + 2, y + 2, glyphsWidth(`P${r + 1}`) + 4, 9, '#1d1826');
  glyphs(ctx, `P${r + 1}`, x + 4, y + 4, '#ffffff');
  const kp = `${a.kpi}%`, kw = glyphsWidth(kp) + 4;
  rect(ctx, x + RW - kw - 2, y + 2, kw, 9, '#1d1826');
  glyphs(ctx, kp, x + RW - kw, y + 4, a.kpi >= 85 ? '#5cff7a' : a.kpi >= 65 ? '#ffd34d' : '#ff5050');
  // boss / visitor badges
  if (a.boss) drawBadge(ctx, x + RW - 12, y + 14, '#8a2be2', '!', t);
  if (a.visit) drawBadge(ctx, x + RW - 24, y + 14, '#3d6fd6', '?', t);
  // alert frame
  if (a.level === 2) {
    const on = Math.floor(t * 4) % 2;
    frame(ctx, x, y, RW, RH, on ? '#ff2d3d' : '#8a1d24', 2);
    if (on) { rect(ctx, x + RW / 2 - 4, y + 2, 9, 11, '#ff2d3d'); glyphs(ctx, '!', x + RW / 2 - 1, y + 5, '#ffffff'); }
  } else if (a.level === 1) {
    frame(ctx, x, y, RW, RH, '#e0a030', 1);
  }
  if (!people.length) { // empty room: invite to hire
    rect(ctx, x + RW / 2 - 12, y + 27, 25, 9, 'rgba(29,24,38,0.8)');
    glyphs(ctx, '+', x + RW / 2 - 1, y + 29, Math.floor(t * 2) % 2 ? '#ffd34d' : '#ffffff');
  }
}

function frame(ctx, x, y, w, h, col, th) {
  rect(ctx, x, y, w, th, col); rect(ctx, x, y + h - th, w, th, col);
  rect(ctx, x, y, th, h, col); rect(ctx, x + w - th, y, th, h, col);
}

function drawBadge(ctx, x, y, col, ch, t) {
  const bob = Math.floor(t * 3) % 2;
  rect(ctx, x, y - bob, 9, 9, '#1d1826'); rect(ctx, x + 1, y + 1 - bob, 7, 7, col);
  glyphs(ctx, ch, x + 3, y + 2 - bob, '#ffffff');
}

/** A desk seen from the side, 10 px wide, with its person (or nobody). */
function drawMiniDesk(ctx, x, y, e, t) {
  rect(ctx, x - 5, y + 4, 11, 2, '#8a5a3a');          // desk top
  rect(ctx, x - 4, y + 6, 1, 4, '#5a3a24'); rect(ctx, x + 4, y + 6, 1, 4, '#5a3a24');
  const slack = e && e.state === 'slack';
  rect(ctx, x + 1, y, 4, 4, '#1d1826');                // monitor
  rect(ctx, x + 2, y + 1, 2, 2, !e ? '#2a2836' : slack ? (Math.floor(t * 4) % 2 ? '#ff4a4a' : '#ffb030') : '#5cff7a');
  if (!e) return;
  const L = e.look || {};
  const hurt = e.flash > 0 && Math.floor(t * 20) % 2;
  const typing = e.state === 'work' && Math.floor(t * 6 + e.id) % 2;
  const hx = x - 4, hy = y - 4 + (e.state === 'slack' && e.slack === 'sleep' ? 2 : 0);
  rect(ctx, hx, hy + 3, 4, 5, hurt ? '#ffffff' : L.shirt || '#3d6fd6');  // body
  rect(ctx, hx, hy, 4, 3, hurt ? '#ffffff' : L.skin || '#f1c7a0');       // head
  rect(ctx, hx, hy, 4, 1, L.hair || '#2b1d14');
  if (typing) px(ctx, hx + 4, hy + 5, L.skin || '#f1c7a0');
  if (slack) {
    const blink = Math.floor(t * 3 + e.id) % 2;
    if (e.slack === 'sleep') glyphs(ctx, 'z', hx - 1, hy - 7, '#ffffff');
    else if (blink) { rect(ctx, hx - 1, hy - 8, 5, 7, '#ff2d3d'); px(ctx, hx + 1, hy - 7, '#fff'); px(ctx, hx + 1, hy - 6, '#fff'); px(ctx, hx + 1, hy - 5, '#fff'); px(ctx, hx + 1, hy - 3, '#fff'); }
  } else if (e.state === 'strike') {
    rect(ctx, hx - 2, hy - 7, 8, 5, '#f4f1ea'); rect(ctx, hx - 1, hy - 6, 6, 1, '#d02030'); rect(ctx, hx + 1, hy - 2, 1, 2, '#6b4a30');
  } else if (e.state === 'angry') {
    px(ctx, hx + 4, hy - 1, '#ff3d3d'); px(ctx, hx + 5, hy - 2, '#ff3d3d');
  }
}

/** Diagonal hatching of the empty plot (static: drawn into the cached frame layer). */
function hatch(ctx, x, y) {
  rect(ctx, x, y, RW, RH, '#1d1826');
  for (let i = -RH; i < RW; i += 10) for (let k = 0; k < RH; k++) { const xx = x + i + k; if (xx >= x && xx < x + RW && (k % 2 === 0)) px(ctx, xx, y + k, 'rgba(201,119,74,0.18)'); }
}

function drawBuildSlot(ctx, x, y, n, ready, afford, t) {
  const pulse = ready && Math.floor(t * 2) % 2;
  frame(ctx, x, y, RW, RH, ready ? (pulse ? '#ffd34d' : '#c8862a') : '#4a4068', 1);
  const cx = x + Math.round(RW / 2);
  // big plus
  const col = ready ? (afford ? '#ffd34d' : '#e0a030') : '#6a6088';
  rect(ctx, cx - 7, y + 15, 15, 5, col); rect(ctx, cx - 2, y + 10, 5, 15, col);
  if (!n) return;
  const price = fmtK(n.cost);
  glyphs(ctx, price, cx - Math.round(glyphsWidth(price) / 2), y + 32, ready ? '#ffffff' : '#8a86a0');
  if (!ready) { // padlock: revenue milestone not reached yet
    rect(ctx, cx - 4, y + 42, 9, 7, '#8a86a0'); rect(ctx, cx - 2, y + 39, 5, 3, '#8a86a0'); rect(ctx, cx - 1, y + 40, 3, 2, '#1d1826');
    px(ctx, cx, y + 45, '#1d1826');
  }
}

function drawLocked(ctx, x, y) {
  rect(ctx, x, y, RW, RH, '#241d36');
  for (let yy = y + 4; yy < y + RH; yy += 8) for (let xx = x + ((yy / 8) % 2 ? 0 : 6); xx < x + RW - 2; xx += 12) rect(ctx, xx, yy, 10, 5, '#2c2442');
}
