// Rendering + layout for the two modes:
//   office — full isometric office
//   mini   — a thin taskbar strip of workstations
import {
  roomLayer, ROOM_SIZE, drawClockHands, drawDesk, drawMonitor, drawKeyboard, renderScreen,
  drawEmployee, drawBubble, drawZzz, drawCoffeeMachine, drawAssistant, drawDecorItem, assistantPos,
  PERSON_OFFSET, MINI_SLOT, MINI_H, drawMiniStation, COFFEE_BOX,
} from './sprites.js';
import { iso, rect, glyphs } from './pixel.js';
import { TUNING, COFFEE, DECOR_ITEMS, COFFEE_POS, ROOMS, ROOM_W, nextRoom } from './config.js';

// Default desk slots in hiring order (grid coords of the desk anchor).
export const SLOTS = [[5, 2.4], [7.5, 2.4], [5, 6.1], [7.5, 6.1], [2.5, 2.4], [10, 2.4], [2.5, 6.1], [10, 6.1]];
/** Default desk slots of every bought room (room k = the same pattern shifted 12 tiles along gx). */
export const slotsFor = (rooms) => Array.from({ length: rooms }, (_, k) => SLOTS.map(([x, y]) => [x + k * ROOM_W, y])).flat();
// Click/drag bounds of a desk + its chair around the desk anchor, screen px.
const DESK_BOX = [-24, -34, 18, 10];

const decorDef = (kind) => DECOR_ITEMS.find((d) => d.id === kind);

/** Where employee `e` (staff index i) sits: a moved desk, else the i-th default slot. */
export function deskPos(g, e, i) {
  const p = g.layout.desks[e.id];
  return p ? [p.gx, p.gy] : SLOTS[i] || SLOTS[SLOTS.length - 1];
}
export const coffeePos = (g) => g.layout.coffee || { gx: COFFEE_POS[0], gy: COFFEE_POS[1] };

export function createView(canvas) {
  const ctx = canvas.getContext('2d');
  const v = {
    canvas, ctx, mode: 'office', scale: 1, W: ROOM_SIZE.w, H: ROOM_SIZE.h,
    hits: [], // [{e, x0,y0,x1,y1, head}]
    movables: [], // [{ref, x0,y0,x1,y1, depth}] — things right-drag can pick up
    hover: null,
    moving: null, // { ref, ok } while right-dragging
    // Office camera: world-pixel offset of the view's top-left corner. The office grows
    // sideways as rooms are bought, so the view scrolls over it.
    cam: { x: 0, y: 0 }, camTarget: null, world: { w: ROOM_SIZE.w, h: ROOM_SIZE.h },
    miniSlot: MINI_SLOT,
  };

  v.resize = (cw, ch) => {
    if (v.mode === 'office') {
      // Pixel scale is chosen so one room fits; a bigger window shows more of the office.
      let s = Math.min(cw / ROOM_SIZE.w, ch / ROOM_SIZE.h);
      s = s >= 2 ? Math.floor(s) : Math.max(0.5, Math.floor(s * 4) / 4);
      v.scale = s;
      v.W = Math.floor(cw / s); v.H = Math.floor(ch / s);
    } else {
      // Seats get narrower when the company outgrows the strip (assumes 2x pixels).
      const n = Math.max(1, v.staffCount);
      v.miniSlot = Math.max(20, Math.min(MINI_SLOT, Math.floor((cw / 2 - 8) / n)));
      v.W = Math.max(MINI_SLOT * 3, n * v.miniSlot + 8); v.H = MINI_H;
      let s = Math.min(cw / v.W, ch / v.H);
      s = s >= 2 ? Math.floor(s) : Math.max(0.5, Math.floor(s * 4) / 4);
      v.scale = s;
    }
    canvas.width = v.W; canvas.height = v.H;
    canvas.style.width = v.W * v.scale + 'px';
    canvas.style.height = v.H * v.scale + 'px';
    ctx.imageSmoothingEnabled = false;
    v.clampCam();
  };
  v.staffCount = 3;

  const camOn = () => v.mode === 'office';

  /** Client coords → world pixels (buffer pixels + camera in office mode). */
  v.toLocal = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) / v.scale, y = (clientY - r.top) / v.scale;
    return camOn() ? { x: x + Math.round(v.cam.x), y: y + Math.round(v.cam.y) } : { x, y };
  };
  v.toClient = (x, y) => {
    const r = canvas.getBoundingClientRect();
    if (camOn()) { x -= Math.round(v.cam.x); y -= Math.round(v.cam.y); }
    return { x: r.left + x * v.scale, y: r.top + y * v.scale };
  };

  // --- camera -------------------------------------------------------------------------------
  /** Keep the camera over the office; centre the office when it is smaller than the view. */
  const fit = (c, view, world) => world <= view ? (world - view) / 2 : Math.max(0, Math.min(world - view, c));
  v.clampCam = () => {
    v.cam.x = fit(v.cam.x, v.W, v.world.w);
    v.cam.y = fit(v.cam.y, v.H, v.world.h);
    if (v.camTarget) { v.camTarget.x = fit(v.camTarget.x, v.W, v.world.w); v.camTarget.y = fit(v.camTarget.y, v.H, v.world.h); }
  };
  /** World-pixel point the camera centres on to show room k. */
  const roomCentre = (k) => { const p = iso(k * ROOM_W + ROOM_W / 2, 4.5); return { x: p.x + ROOM_SIZE.ox, y: p.y + ROOM_SIZE.oy - 20 }; };
  v.focusRoom = (k, snap = false) => {
    const c = roomCentre(k);
    v.camTarget = { x: c.x - v.W / 2, y: c.y - v.H / 2 };
    v.clampCam();
    if (snap) { v.cam.x = v.camTarget.x; v.cam.y = v.camTarget.y; v.camTarget = null; v.clampCam(); }
  };
  v.pan = (dx, dy) => { v.camTarget = null; v.cam.x += dx; v.cam.y += dy; v.clampCam(); };
  v.updateCam = (dt) => {
    if (!v.camTarget) return;
    const k = 1 - Math.exp(-dt * 10);
    v.cam.x += (v.camTarget.x - v.cam.x) * k;
    v.cam.y += (v.camTarget.y - v.cam.y) * k;
    v.clampCam();
    if (v.camTarget && Math.abs(v.cam.x - v.camTarget.x) < 0.5 && Math.abs(v.cam.y - v.camTarget.y) < 0.5) v.camTarget = null;
  };
  /** Index of the room nearest the middle of the view. */
  v.roomInView = (rooms) => {
    const cx = v.cam.x + v.W / 2 - ROOM_SIZE.ox;
    const gx = cx / 16 + 4.5;
    return Math.max(0, Math.min(rooms - 1, Math.floor(gx / ROOM_W)));
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

  /** The front-most movable object under a buffer-space point (office mode). */
  v.pickMovable = (x, y) => {
    let best = null;
    for (const m of v.movables) {
      if (x >= m.x0 && x <= m.x1 && y >= m.y0 && y <= m.y1 && (!best || m.depth >= best.depth)) best = m;
    }
    return best;
  };

  /** Buffer-space point → grid coords on the office floor. */
  v.toGrid = (x, y) => {
    const sx = x - ROOM_SIZE.ox, sy = y - ROOM_SIZE.oy;
    return { gx: (sx / 16 + sy / 8) / 2, gy: (sy / 8 - sx / 16) / 2 };
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
    if (camOn()) ctx.translate(sx - Math.round(v.cam.x), sy - Math.round(v.cam.y));
    else ctx.translate(sx, sy);
    v.hits = [];
    v.movables = [];
    if (v.mode === 'office') renderOffice(g, whip, t); else renderMini(g, t);
    whip.drawFx(ctx);
    if (!v.moving) whip.drawTool(ctx, g);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  function renderOffice(g, whip, t) {
    const rooms = g.rooms || 1;
    const room = roomLayer(g.officeLevel || 0, rooms, ROOMS, !!nextRoom(g));
    if (v.world.w !== room.W || v.world.h !== room.H) { v.world = { w: room.W, h: room.H }; v.clampCam(); }
    ctx.drawImage(room.canvas, 0, 0);
    drawClockHands(ctx, room.P, g.dayTime / TUNING.dayLength);
    v.movables = [];
    const box = (ref, p, b, depth) => ({ ref, x0: p.x + b[0], y0: p.y + b[1], x1: p.x + b[2], y1: p.y + b[3], depth });

    // Everything standing on the floor is drawn back-to-front by grid depth (gx + gy).
    const items = [];
    for (const d of g.decor) {
      const def = decorDef(d.kind);
      if (!def) continue;
      const p = room.P(d.gx, d.gy);
      const m = box({ type: 'decor', item: d }, p, def.box, d.gx + d.gy + (def.depth || 0));
      v.movables.push(m);
      if (def.flat) drawDecorItem(ctx, room.P, d, t);   // rugs lie under everything
      else items.push({ depth: m.depth, m, draw: () => drawDecorItem(ctx, room.P, d, t) });
    }
    if (g.coffeeLevel >= 0) {
      const cp = coffeePos(g);
      const m = box({ type: 'coffee' }, room.P(cp.gx, cp.gy), COFFEE_BOX, cp.gx + cp.gy + 1.3);
      v.movables.push(m);
      items.push({ depth: m.depth, m, draw: () => drawCoffeeMachine(ctx, room.P, g.coffeeLevel, g.coffeeCd <= 0, t, cp) });
    }
    const overlays = [];
    g.staff.forEach((e, i) => {
      const [gx, gy] = deskPos(g, e, i);
      const p = room.P(gx, gy);
      const ax = Math.round(p.x), ay = Math.round(p.y);
      const m = box({ type: 'desk', e }, { x: ax, y: ay }, DESK_BOX, gx + gy + 0.6);
      v.movables.push(m);
      items.push({
        depth: m.depth, m,
        draw: () => {
          drawDesk(ctx, ax, ay, e.id);
          drawMonitor(ctx, ax, ay, renderScreen(e, t), e.state === 'slack' ? '#ff4a4a' : '#5cff7a');
          drawKeyboard(ctx, ax, ay, t, e.state === 'work');
          const cx = ax + PERSON_OFFSET.x, cy = ay + PERSON_OFFSET.y;
          if (v.hover === e && e.state === 'slack') outline(cx, cy);
          const head = drawEmployee(ctx, cx, cy, e, t);
          v.hits.push({ e, x0: cx - 10, y0: ay - 34, x1: ax + 12, y1: cy + 1, head, anchor: { x: cx, y: cy } });
          overlays.push({ e, head });
        },
      });
    });
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    if (g.assistantLevel >= 0) {
      const a = drawAssistant(ctx, room.P, g.assistantLevel, t, whip.swingT);
      v.assistantHand = a.hand;
    }
    for (const { e, head } of overlays) drawOverlay(e, head, t);

    // Right-drag feedback: frame the object being moved (red = can't drop here).
    const mv = v.moving;
    if (mv) {
      const m = v.movables.find((x) => sameRef(x.ref, mv.ref));
      if (m) frame(m, mv.ok ? '#ffd34d' : '#ff3d4a', t);
    } else if (v.moveHover) {
      const m = v.movables.find((x) => sameRef(x.ref, v.moveHover.ref));
      if (m) frame(m, 'rgba(255,255,255,0.55)', t);
    }
  }

  function sameRef(a, b) {
    return a.type === b.type && (a.type === 'coffee' || (a.type === 'desk' ? a.e === b.e : a.item === b.item));
  }

  function frame(m, color, t) {
    const dash = Math.floor(t * 8) % 2;
    for (let x = m.x0; x <= m.x1; x += 2) {
      if ((x / 2 + dash) % 2 < 1) { rect(ctx, x, m.y0, 1, 1, color); rect(ctx, x, m.y1, 1, 1, color); }
    }
    for (let y = m.y0; y <= m.y1; y += 2) {
      if ((y / 2 + dash) % 2 < 1) { rect(ctx, m.x0, y, 1, 1, color); rect(ctx, m.x1, y, 1, 1, color); }
    }
  }

  function renderMini(g, t) {
    // top edge glow when anyone slacks
    const slacking = g.staff.some((e) => e.state === 'slack');
    const blink = slacking && Math.floor(t * 3) % 2;
    if (blink && !v.transparentMini) rect(ctx, 0, 0, v.W, 1, '#ff2d3d');
    const slot = v.miniSlot;
    g.staff.forEach((e, i) => {
      const x = 4 + i * slot;
      const head = drawMiniStation(ctx, x, e, t, slot);
      if (blink && e.state === 'slack') rect(ctx, x, MINI_H - 12, slot, 2, '#ff2d3d');
      v.hits.push({ e, x0: x, y0: 0, x1: x + slot - 2, y1: MINI_H, head, anchor: { x: x + 11, y: MINI_H - 2 } });
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
    if (e.bonk > 0) {
      // dizzy stars circling the head after a baton hit
      for (let i = 0; i < 3; i++) {
        const a = t * 7 + (i * Math.PI * 2) / 3;
        const sx = head.x + Math.cos(a) * 7, sy = head.y - 2 + Math.sin(a) * 2.5;
        rect(ctx, sx - 1, sy, 3, 1, '#ffd34d'); rect(ctx, sx, sy - 1, 1, 3, '#ffd34d');
      }
    }
    if (e.zap > 0 && Math.floor(t * 20) % 2) {
      rect(ctx, head.x - 6, head.y - 3, 1, 3, '#8fe8ff'); rect(ctx, head.x + 6, head.y + 1, 1, 3, '#ffffff');
      glyphs(ctx, '!', head.x - 1, head.y - 10, '#8fe8ff');
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

export function coffeeReadyFrac(g) {
  if (g.coffeeLevel < 0) return 0;
  return 1 - g.coffeeCd / COFFEE[g.coffeeLevel].cooldown;
}

export { iso, assistantPos };
