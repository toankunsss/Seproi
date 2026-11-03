// Rendering + layout:
//   office   — full isometric office (desktop, and the phone's landscape fallback)
//   portrait — phone office: cubicle grid under a back wall (portrait.js), set via v.portrait
//   mini     — a thin taskbar strip of workstations (desktop shell)
import {
  roomLayer, ROOM_SIZE, drawClockHands, drawDesk, drawMonitor, drawKeyboard, renderScreen,
  drawEmployee, drawBubble, drawMood, drawZzz, drawBoss, drawTypeTag, drawCoffeeMachine, drawAssistant, drawOfficeDecor, assistantPos, drawVisitor,
  PERSON_OFFSET, MINI_SLOT, MINI_H, drawMiniStation,
} from './sprites.js';
import { iso, rect } from './pixel.js';
import { TUNING, COFFEE, dayLen } from './config.js';
import { aboutToSlack } from './skills.js';
import { portraitLayout, drawPortraitOffice } from './portrait.js';

// Desk slots in hiring order (grid coords of the desk anchor).
export const SLOTS = [[5, 2.4], [7.5, 2.4], [5, 6.1], [7.5, 6.1], [2.5, 2.4], [10, 2.4], [2.5, 6.1], [10, 6.1]];


export function createView(canvas) {
  const ctx = canvas.getContext('2d');
  const v = {
    canvas, ctx, mode: 'office', scale: 1, W: ROOM_SIZE.w, H: ROOM_SIZE.h,
    portrait: false, // phone held upright: draw the cubicle grid instead of the iso room
    capacity: 4,     // desks in the current office (portrait grid size)
    layout: null,
    hits: [],  // [{e, x0,y0,x1,y1, head}]
    slots: [], // portrait: empty desks [{x0,y0,x1,y1}]
    hover: null,
  };

  v.resize = (cw, ch) => {
    if (v.mode === 'office' && v.portrait) {
      v.layout = portraitLayout(v.capacity, cw, ch);
      v.W = v.layout.W; v.H = v.layout.H;
    } else if (v.mode === 'office') {
      v.W = ROOM_SIZE.w; v.H = ROOM_SIZE.h;
    } else {
      v.W = Math.max(MINI_SLOT * 3, v.staffCount * MINI_SLOT + 8); v.H = MINI_H;
    }
    let s = Math.min(cw / v.W, ch / v.H);
    // Integer scales keep pixels square. Phones have little room and very dense screens,
    // so `fineScale` allows 5% steps there (uneven pixels are invisible at 3x DPR).
    if (v.fineScale) s = Math.max(0.5, Math.floor(s * 20) / 20);
    else s = s >= 2 ? Math.floor(s) : Math.max(0.5, Math.floor(s * 4) / 4);
    v.scale = s;
    canvas.width = v.W; canvas.height = v.H;
    canvas.style.width = v.W * s + 'px';
    canvas.style.height = v.H * s + 'px';
    ctx.imageSmoothingEnabled = false;
  };
  v.staffCount = 3;

  /** Client coords → buffer pixels. */
  v.toLocal = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) / v.scale, y: (clientY - r.top) / v.scale };
  };
  v.toClient = (x, y) => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + x * v.scale, y: r.top + y * v.scale };
  };

  /** Portrait: empty desk under a buffer-space point (tap → hire), or null. */
  v.pickSlot = (x, y) => v.slots.find((s) => x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1) || null;

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
    v.g = g;
    const sx = whip.shake ? Math.round((Math.random() * 2 - 1) * whip.shake) : 0;
    const sy = whip.shake ? Math.round((Math.random() * 2 - 1) * whip.shake) : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (v.mode === 'mini' && v.transparentMini) {
      ctx.clearRect(0, 0, v.W, v.H);
    } else {
      ctx.fillStyle = v.mode === 'office' ? '#1a1626' : '#221c33';
      ctx.fillRect(0, 0, v.W, v.H);
    }
    ctx.translate(sx, sy);
    v.hits = [];
    v.slots = [];
    if (v.mode === 'office' && v.portrait) renderPortrait(g, whip, t);
    else if (v.mode === 'office') renderOffice(g, whip, t);
    else renderMini(g, t);
    whip.drawFx(ctx);
    whip.drawWhip(ctx, g.whipLevel);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  function renderOffice(g, whip, t) {
    const room = roomLayer(g.officeLevel || 0);
    ctx.drawImage(room.canvas, 0, 0);
    drawClockHands(ctx, room.P, g.dayTime / dayLen(g));
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
    if (g.visit) {
      const p = room.P(3 + Math.min(1, g.visit.t / 3) * 3, 8.2);
      const attention = g.visit.kind === 'labour' && g.visit.t >= 3 ? (g.visit.watching ? 'watching' : 'distracted') : null;
      drawVisitor(ctx, p.x, p.y, g.visit.kind, t, g.visit.t < 3, attention);
    }
    for (const { e, head } of overlays) drawOverlay(e, head, t);
    drawBossAt(g, t, (h) => ({ x: h.anchor.x + 16, y: h.anchor.y }));
  }

  /** Weekly boss next to the desk of staff g.boss.at (pos maps a hit area to his floor point). */
  function drawBossAt(g, t, pos) {
    v.bossHit = null;
    const b = g.boss;
    const h = b && v.hits[Math.min(b.at, v.hits.length - 1)];
    if (!h) return;
    const p = pos(h);
    v.bossHit = drawBoss(ctx, p.x, p.y, t, b.hp / b.max, b.dodge > 0);
  }
  /** Is the point (local canvas coords) on the boss? Generous for fingers. */
  v.hitsBoss = (x, y, slop = 6) => {
    const r = v.bossHit;
    return !!r && x >= r.x0 - slop && x <= r.x1 + slop && y >= r.y0 - slop && y <= r.y1 + slop;
  };

  function renderPortrait(g, whip, t) {
    const r = drawPortraitOffice(ctx, v.layout, g, t, whip);
    v.hits = r.hits;
    v.slots = r.slots;
    v.assistantHand = r.hand;
    for (const h of r.hits) drawOverlay(h.e, h.head, t, { stress: h.stress });
    drawBossAt(g, t, (h) => ({ x: h.x1 - 13, y: h.y1 - 2 }));
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
      drawOverlay(e, head, t, { mini: true });
    });
  }

  function drawOverlay(e, head, t, { mini = false, stress = null } = {}) {
    if (!mini && v.g && aboutToSlack(v.g, e) && Math.floor(t * 3) % 2) { // hawk eye skill
      rect(ctx, head.x - 2, head.y - 13, 5, 8, '#1d1826'); rect(ctx, head.x - 1, head.y - 12, 3, 4, '#ffd34d'); rect(ctx, head.x - 1, head.y - 7, 3, 1, '#ffd34d');
    }
    const type = e.cv && e.cv.type;
    if (type && !mini && (type !== 'spy' || e.cv.revealed)) drawTypeTag(ctx, head.x + 6, head.y + 1, type);
    if (e.state === 'slack') {
      if (e.slack === 'sleep') drawZzz(ctx, head.x, head.y, t);
      // "fake meeting" is sneaky: its bubble only shows half the time
      if (e.slack === 'meeting' && Math.floor(t * 1.4 + e.id) % 2) return;
      const urgent = e.t > e.dur * 0.5;
      drawBubble(ctx, head.x + (mini ? 8 : 0), head.y + (mini ? 14 : 0), e.slack, t, urgent);
    } else if (!mini) {
      // mood above the head (the slacking bubble takes that spot while it shows)
      drawMood(ctx, head.x, head.y - 10, e.motiv ?? 50, t);
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
      const bx = stress ? stress.x : head.x - 6, by = stress ? stress.y : head.y + 34;
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
