// Rendering + layout for the two modes:
//   office — full isometric office
//   mini   — a thin taskbar strip of workstations
import {
  roomLayer, ROOM_SIZE, drawClockHands, drawDesk, drawMonitor, drawKeyboard, renderScreen,
  drawEmployee, drawBubble, drawZzz, drawCoffeeMachine, drawAssistant, drawOfficeDecor, assistantPos,
  PERSON_OFFSET, MINI_SLOT, MINI_H, drawMiniStation,
} from './sprites.js';
import { iso, rect } from './pixel.js';
import { TUNING, COFFEE } from './config.js';

// Desk slots in hiring order (grid coords of the desk anchor).
export const SLOTS = [[5, 2.4], [7.5, 2.4], [5, 6.1], [7.5, 6.1], [2.5, 2.4], [10, 2.4], [2.5, 6.1], [10, 6.1]];


export function createView(canvas) {
  const ctx = canvas.getContext('2d');
  const v = {
    canvas, ctx, mode: 'office', scale: 1, W: ROOM_SIZE.w, H: ROOM_SIZE.h,
    // Portrait camera (office mode): instead of the whole room, frame the part that matters
    // (staff desks, assistant, coffee machine) and zoom in on it. Set by v.frame(g).
    framed: false,
    focus: null, // { x0, y0, x1, y1 } in room pixels
    offX: 0, offY: 0,
    hits: [], // [{e, x0,y0,x1,y1, head}]
    hover: null,
  };

  v.resize = (cw, ch) => {
    v.offX = v.offY = 0;
    if (v.mode === 'office' && v.framed && v.focus) {
      Object.assign(v, cameraWindow(v.focus, cw, ch));
    } else if (v.mode === 'office') {
      v.W = ROOM_SIZE.w; v.H = ROOM_SIZE.h;
    } else {
      v.W = Math.max(MINI_SLOT * 3, v.staffCount * MINI_SLOT + 8); v.H = MINI_H;
    }
    let s = Math.min(cw / v.W, ch / v.H);
    // Integer scales keep pixels square. Phones have little room and very dense screens,
    // so `fineScale` allows 5% steps there (uneven pixels are invisible at 3x DPR).
    if (v.framed && v.mode === 'office') s = Math.min(s, MAX_SCALE);
    if (v.fineScale) s = Math.max(0.5, Math.floor(s * 20) / 20);
    else s = s >= 2 ? Math.floor(s) : Math.max(0.5, Math.floor(s * 4) / 4);
    v.scale = s;
    canvas.width = v.W; canvas.height = v.H;
    canvas.style.width = v.W * s + 'px';
    canvas.style.height = v.H * s + 'px';
    ctx.imageSmoothingEnabled = false;
  };
  v.staffCount = 3;

  /** Client coords → room/buffer pixels (accounts for the portrait camera). */
  v.toLocal = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) / v.scale + v.offX, y: (clientY - r.top) / v.scale + v.offY };
  };
  v.toClient = (x, y) => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (x - v.offX) * v.scale, y: r.top + (y - v.offY) * v.scale };
  };

  /**
   * Portrait camera target: bounding box of everything the player interacts with. Returns a
   * string key so the caller can tell when it changed (hire, assistant, coffee machine).
   */
  v.frame = (g) => {
    const P = roomLayer(g.officeLevel || 0).P;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (ax0, ay0, ax1, ay1) => { x0 = Math.min(x0, ax0); y0 = Math.min(y0, ay0); x1 = Math.max(x1, ax1); y1 = Math.max(y1, ay1); };
    g.staff.forEach((e, i) => {
      const p = P(SLOTS[i][0], SLOTS[i][1]);
      add(p.x + PERSON_OFFSET.x - 12, p.y - 50, p.x + 16, p.y + PERSON_OFFSET.y + 10); // desk, monitor, bubble, chair
    });
    if (g.assistantLevel >= 0) { const a = assistantPos(P); add(a.x - 12, a.y - 34, a.x + 12, a.y + 4); }
    if (g.coffeeLevel >= 0) { const c = P(0.15, 0.35); add(c.x - 12, c.y - 34, c.x + 16, c.y + 6); }
    v.focus = { x0, y0, x1, y1 };
    return [x0, y0, x1, y1].map(Math.round).join(',');
  };

  /** Employee under a buffer-space point, allowing `slop` pixels of whip reach. */
  v.pick = (x, y, slop = 0) => {
    let best = null, bestD = Infinity;
    for (const h of v.hits) {
      const dx = x < h.x0 ? h.x0 - x : x > h.x1 ? x - h.x1 : 0;
      const dy = y < h.y0 ? h.y0 - y : y > h.y1 ? y - h.y1 : 0;
      const d = Math.hypot(dx, dy);
      if (d <= slop && d < bestD) { best = h; bestD = d; }
    }
    return best;
  };

  v.render = (g, whip, t) => {
    const sx = whip.shake ? Math.round((Math.random() * 2 - 1) * whip.shake) : 0;
    const sy = whip.shake ? Math.round((Math.random() * 2 - 1) * whip.shake) : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (v.mode === 'mini' && v.transparentMini) {
      ctx.clearRect(0, 0, v.W, v.H);
    } else {
      ctx.fillStyle = v.mode === 'office' ? '#1a1626' : '#221c33';
      ctx.fillRect(0, 0, v.W, v.H);
    }
    ctx.translate(sx - v.offX, sy - v.offY);
    v.hits = [];
    if (v.mode === 'office') renderOffice(g, whip, t); else renderMini(g, t);
    whip.drawFx(ctx);
    whip.drawWhip(ctx, g.whipLevel);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  function renderOffice(g, whip, t) {
    const room = roomLayer(g.officeLevel || 0);
    ctx.drawImage(room.canvas, 0, 0);
    drawClockHands(ctx, room.P, g.dayTime / TUNING.dayLength);
    drawOfficeDecor(ctx, room.P, g.decor || [], t);
    if (g.coffeeLevel >= 0) drawCoffeeMachine(ctx, room.P, g.coffeeLevel, g.coffeeCd <= 0, t);

    // Depth-sorted stations (back to front).
    const order = g.staff.map((e, i) => ({ e, gx: SLOTS[i][0], gy: SLOTS[i][1] }))
      .sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
    const overlays = [];
    for (const { e, gx, gy } of order) {
      const p = room.P(gx, gy);
      const ax = Math.round(p.x), ay = Math.round(p.y);
      const typing = e.state === 'work';
      drawDesk(ctx, ax, ay, e.id);
      drawMonitor(ctx, ax, ay, renderScreen(e, t), e.state === 'slack' ? '#ff4a4a' : '#5cff7a');
      drawKeyboard(ctx, ax, ay, t, typing);
      const cx = ax + PERSON_OFFSET.x, cy = ay + PERSON_OFFSET.y;
      if (v.hover === e && e.state === 'slack') outline(cx, cy);
      const head = drawEmployee(ctx, cx, cy, e, t);
      v.hits.push({ e, x0: cx - 10, y0: ay - 34, x1: ax + 12, y1: cy + 1, head, anchor: { x: cx, y: cy } });
      overlays.push({ e, head });
    }
    if (g.assistantLevel >= 0) {
      const a = drawAssistant(ctx, room.P, g.assistantLevel, t, whip.swingT);
      v.assistantHand = a.hand;
    }
    for (const { e, head } of overlays) drawOverlay(e, head, t);
  }

  function renderMini(g, t) {
    // top edge glow when anyone slacks
    const slacking = g.staff.some((e) => e.state === 'slack');
    const blink = slacking && Math.floor(t * 3) % 2;
    if (blink && !v.transparentMini) rect(ctx, 0, 0, v.W, 1, '#ff2d3d');
    g.staff.forEach((e, i) => {
      const x = 4 + i * MINI_SLOT;
      const head = drawMiniStation(ctx, x, e, t);
      if (blink && e.state === 'slack') rect(ctx, x, MINI_H - 12, MINI_SLOT, 2, '#ff2d3d');
      v.hits.push({ e, x0: x, y0: 0, x1: x + MINI_SLOT - 2, y1: MINI_H, head, anchor: { x: x + 11, y: MINI_H - 2 } });
      drawOverlay(e, head, t, true);
    });
  }

  function drawOverlay(e, head, t, mini = false) {
    if (e.state === 'slack') {
      if (e.slack === 'sleep') drawZzz(ctx, head.x, head.y, t);
      const urgent = e.t > e.dur * 0.5;
      drawBubble(ctx, head.x + (mini ? 8 : 0), head.y + (mini ? 14 : 0), e.slack, t, urgent);
    }
    if (e.state === 'angry') {
      const k = (t * 3) % 1;
      rect(ctx, head.x - 6 + Math.round(k * -3), head.y - 2 - k * 8, 2, 2, 'rgba(255,255,255,0.8)');
      rect(ctx, head.x + 5 + Math.round(k * 3), head.y - 2 - k * 8, 2, 2, 'rgba(255,255,255,0.8)');
      rect(ctx, head.x + 3, head.y - 4, 3, 1, '#e0202a'); rect(ctx, head.x + 4, head.y - 5, 1, 3, '#e0202a');
    }
    if (e.state === 'work' && e.boost > 0 && Math.floor(t * 4) % 2) {
      rect(ctx, head.x + 5, head.y + 1, 1, 2, '#8fd8ff');
    }
    // stress bar under the chair when stressed
    if (e.stress > 35 && !mini) {
      const w = 12, fill = Math.round(Math.min(1, e.stress / 100) * w);
      const bx = head.x - 6, by = head.y + 34;
      rect(ctx, bx - 1, by - 1, w + 2, 3, '#1d1826');
      rect(ctx, bx, by, fill, 1, e.stress > 75 ? '#ff3d3d' : '#ffb030');
    }
  }

  function outline(cx, cy) {
    ctx.fillStyle = 'rgba(255,60,60,0.25)';
    ctx.fillRect(cx - 11, cy - 30, 22, 31);
  }

  return v;
}

/**
 * Grow the focus box (plus margins) to the screen's aspect ratio, keep it inside the room and
 * not smaller than MIN_VIEW, and pick the scale. Wide teams → zoomed out, small teams → close up.
 */
const MIN_VIEW = 176;  // room pixels: never zoom in further than this width
const MAX_SCALE = 2.4;
function cameraWindow(f, cw, ch) {
  const RW = ROOM_SIZE.w, RH = ROOM_SIZE.h, aspect = cw / ch;
  let x0 = f.x0 - 10, x1 = f.x1 + 10, y0 = f.y0 - 8, y1 = f.y1 + 8;
  let w = Math.max(x1 - x0, MIN_VIEW), h = y1 - y0;
  if (w / h < aspect) w = h * aspect; else h = w / aspect;
  w = Math.min(w, RW); h = Math.min(h, RH);
  const cx = (f.x0 + f.x1) / 2, cy = (f.y0 + f.y1) / 2;
  const ox = Math.max(0, Math.min(RW - w, cx - w / 2)), oy = Math.max(0, Math.min(RH - h, cy - h / 2));
  return { W: Math.round(w), H: Math.round(h), offX: Math.round(ox), offY: Math.round(oy) };
}

export function coffeeReadyFrac(g) {
  if (g.coffeeLevel < 0) return 0;
  return 1 - g.coffeeCd / COFFEE[g.coffeeLevel].cooldown;
}

export { iso, assistantPos };
