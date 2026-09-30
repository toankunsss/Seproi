// The boss's whip: a verlet rope hanging from the handle that lashes out to the
// click point, plus sparks, shockwaves, lightning and screen shake.
import { WHIPS } from './config.js';
import { rect, px, line } from './pixel.js';

const N = 16;
const SEG = 3.6;
const rand = (a, b) => a + Math.random() * (b - a);

export function createWhip() {
  const pts = Array.from({ length: N }, () => ({ x: 0, y: 0, ox: 0, oy: 0 }));
  const w = {
    handle: { x: -100, y: -100 },
    visible: false,
    strike: null,
    particles: [],
    rings: [],
    bolts: [],
    lashes: [],
    shake: 0,
    swingT: 0, // assistant arm pose timer
    get busy() { return !!this.strike; },
  };

  w.place = (x, y, snap = false) => {
    const hx = x + 12, hy = y + 16;
    w.handle.x = hx; w.handle.y = hy;
    if (snap) pts.forEach((p, i) => { p.x = p.ox = hx - i * 0.5; p.y = p.oy = hy + i * SEG; });
  };

  /** Start a lash toward (tx, ty). onCrack fires when the tip arrives. */
  w.lash = (tx, ty, level, onCrack) => {
    const h = w.handle;
    w.strike = {
      t: 0, dur: 0.13, level, onCrack,
      from: { x: h.x, y: h.y }, to: { x: tx, y: ty },
      back: { x: h.x + 30, y: h.y - 34 }, // wind-up point over the shoulder
    };
  };

  w.update = (dt) => {
    const h = w.handle;
    if (w.strike) {
      const s = w.strike;
      s.t += dt;
      const p = Math.min(1, s.t / s.dur);
      const e = p * p * (3 - 2 * p);
      // Quadratic bezier from the handle; control & end sweep from behind to the target.
      const cx = lerp(s.back.x, (h.x + s.to.x) / 2, e), cy = lerp(s.back.y - 20, Math.min(h.y, s.to.y) - 26, e);
      const ex = lerp(s.back.x - 6, s.to.x, e), ey = lerp(s.back.y - 30, s.to.y, e);
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        const nx = a * h.x + b * cx + c * ex, ny = a * h.y + b * cy + c * ey;
        pts[i].ox = pts[i].x; pts[i].oy = pts[i].y;
        pts[i].x = nx; pts[i].y = ny;
      }
      if (p >= 1) {
        w.strike = null;
        crack(s.to.x, s.to.y, s.level);
        // recoil: give the rope a little bounce back toward the handle
        pts.forEach((pt, i) => { pt.ox = pt.x + (s.to.x - h.x) * 0.02 * (i / N); pt.oy = pt.y + 3 * (i / N); });
        s.onCrack && s.onCrack();
      }
    } else {
      // Verlet with gravity; point 0 pinned to the handle.
      const g = 520 * dt * dt;
      for (let i = 1; i < N; i++) {
        const p = pts[i];
        const vx = (p.x - p.ox) * 0.93, vy = (p.y - p.oy) * 0.93;
        p.ox = p.x; p.oy = p.y;
        p.x += vx; p.y += vy + g;
      }
      pts[0].x = h.x; pts[0].y = h.y;
      for (let k = 0; k < 8; k++) {
        for (let i = 1; i < N; i++) {
          const a = pts[i - 1], b = pts[i];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const diff = (d - SEG) / d;
          if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
          else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
        }
        pts[0].x = h.x; pts[0].y = h.y;
      }
    }

    for (const p of w.particles) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.vx *= 1 - 2 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    w.particles = w.particles.filter((p) => p.life > 0);
    for (const r of w.rings) r.t += dt;
    w.rings = w.rings.filter((r) => r.t < r.dur);
    for (const b of w.bolts) b.t += dt;
    w.bolts = w.bolts.filter((b) => b.t < 0.18);
    for (const l of w.lashes) l.t += dt;
    w.lashes = w.lashes.filter((l) => l.t < 0.22);
    w.shake = Math.max(0, w.shake - dt * 18);
    w.swingT = Math.max(0, w.swingT - dt);
  };

  function crack(x, y, level) {
    const fx = WHIPS[level].fx;
    w.shake = 3 + level * 1.5;
    w.rings.push({ x, y, t: 0, dur: 0.22, r: 10 + level * 3, color: fx === 'elec' ? '#8fe8ff' : fx === 'fire' ? '#ffb030' : '#ffffff' });
    const pal = {
      wood: ['#ffffff', '#ffe38a', '#ffb347'],
      metal: ['#ffffff', '#e0e0f0', '#ffe38a', '#a0a0b8'],
      elec: ['#ffffff', '#8fe8ff', '#3ab8ff', '#d0f8ff'],
      fire: ['#fff4a0', '#ffb030', '#ff6a1a', '#e0301a'],
    }[fx];
    const n = 12 + level * 6;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(40, 130 + level * 25);
      w.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        g: fx === 'fire' ? -60 : 260, life: rand(0.25, 0.6), max: 0.6,
        color: pal[Math.floor(Math.random() * pal.length)], size: Math.random() < 0.3 ? 2 : 1,
      });
    }
    if (fx === 'elec') for (let i = 0; i < 4; i++) w.bolts.push(makeBolt(x, y, rand(0, Math.PI * 2), 14 + Math.random() * 10));
    if (fx === 'fire') for (let i = 0; i < 14; i++) {
      w.particles.push({ x: x + rand(-6, 6), y: y + rand(-3, 3), vx: rand(-10, 10), vy: rand(-50, -20), g: -40, life: rand(0.4, 0.9), max: 0.9, color: pal[Math.floor(Math.random() * 3)], size: 2 });
    }
  }

  function makeBolt(x, y, ang, len) {
    const seg = [];
    let cx = x, cy = y;
    for (let i = 0; i < 5; i++) {
      const nx = cx + Math.cos(ang) * len / 5 + rand(-3, 3), ny = cy + Math.sin(ang) * len / 5 + rand(-3, 3);
      seg.push([cx, cy, nx, ny]);
      cx = nx; cy = ny;
    }
    return { seg, t: 0 };
  }

  /** Assistant's quick lash from (fx,fy) to (tx,ty). */
  w.autoLash = (fx, fy, tx, ty, level) => {
    w.lashes.push({ fx, fy, tx, ty, t: 0 });
    w.swingT = 0.35;
    crack(tx, ty, Math.min(level, 1));
    w.shake = 1.5;
  };

  w.drawFx = (ctx) => {
    for (const r of w.rings) {
      const k = r.t / r.dur, rad = r.r * (0.3 + k);
      if (Math.floor(r.t * 40) % 2 === 0 || k < 0.5) circle(ctx, r.x, r.y, rad, r.color);
    }
    if (w.rings.length) {
      // crack star
      const r = w.rings[w.rings.length - 1];
      if (r.t < 0.08) {
        const L = 7;
        line(ctx, r.x - L, r.y, r.x + L, r.y, '#ffffff');
        line(ctx, r.x, r.y - L, r.x, r.y + L, '#ffffff');
        line(ctx, r.x - 4, r.y - 4, r.x + 4, r.y + 4, '#fff6b0');
        line(ctx, r.x - 4, r.y + 4, r.x + 4, r.y - 4, '#fff6b0');
      }
    }
    for (const b of w.bolts) for (const s of b.seg) line(ctx, s[0], s[1], s[2], s[3], Math.floor(b.t * 40) % 2 ? '#ffffff' : '#8fe8ff');
    for (const p of w.particles) {
      if (p.life < 0.12 && Math.floor(p.life * 60) % 2) continue;
      rect(ctx, p.x, p.y, p.size, p.size, p.color);
    }
    for (const l of w.lashes) {
      const mx = (l.fx + l.tx) / 2, my = Math.min(l.fy, l.ty) - 14;
      let lx = l.fx, ly = l.fy;
      for (let i = 1; i <= 10; i++) {
        const u = i / 10, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        const nx = a * l.fx + b * mx + c * l.tx, ny = a * l.fy + b * my + c * l.ty;
        line(ctx, lx, ly, nx, ny, '#3a2418');
        lx = nx; ly = ny;
      }
    }
  };

  w.drawWhip = (ctx, level) => {
    if (!w.visible && !w.strike) return;
    const W = WHIPS[level];
    // rope
    for (let i = 1; i < N; i++) {
      const a = pts[i - 1], b = pts[i];
      const tip = i >= N - 3;
      line(ctx, a.x, a.y, b.x, b.y, tip ? W.tip : W.rope, i < N / 2.5 ? 2 : 1);
    }
    const t = pts[N - 1];
    px(ctx, t.x, t.y, W.fx === 'elec' ? '#ffffff' : W.tip);
    if (W.fx === 'fire' && Math.random() < 0.6) px(ctx, t.x + rand(-1, 1), t.y - 2, '#ffb030');
    if (W.fx === 'elec' && Math.random() < 0.3) px(ctx, t.x + rand(-2, 2), t.y + rand(-2, 2), '#8fe8ff');
    // handle
    const h = w.handle;
    line(ctx, h.x, h.y, h.x + 5, h.y + 8, '#2a160c', 3);
    line(ctx, h.x, h.y, h.x + 5, h.y + 8, level >= 3 ? '#ffd34d' : '#6e4428', 1);
    rect(ctx, h.x + 4, h.y + 7, 3, 3, level >= 2 ? '#c0c0cc' : '#3a2418');
  };

  return w;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function circle(ctx, cx, cy, r, color) {
  const steps = Math.max(12, Math.floor(r * 4));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    px(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, color);
  }
}
