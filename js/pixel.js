// Low-level pixel drawing. Everything is drawn with integer fillRect calls so the
// low-res buffer stays crisp when CSS scales it up with image-rendering: pixelated.

export const TW = 32; // iso tile width
export const TH = 16; // iso tile height

/** Grid (gx, gy, gz) → screen. gz is height in screen pixels. */
export function iso(gx, gy, gz = 0) {
  return { x: (gx - gy) * (TW / 2), y: (gx + gy) * (TH / 2) - gz };
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Scanline fill of a convex polygon, sampled at pixel centres (no anti-aliasing). */
export function poly(ctx, pts, color) {
  ctx.fillStyle = color;
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const y0 = Math.floor(minY), y1 = Math.ceil(maxY);
  for (let y = y0; y < y1; y++) {
    const sy = y + 0.5;
    let xl = Infinity, xr = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a.y <= sy && b.y > sy) || (b.y <= sy && a.y > sy)) {
        const x = a.x + ((sy - a.y) / (b.y - a.y)) * (b.x - a.x);
        xl = Math.min(xl, x); xr = Math.max(xr, x);
      }
    }
    if (xl < xr) {
      const a = Math.round(xl), b = Math.round(xr);
      if (b > a) ctx.fillRect(a, y, b - a, 1);
    }
  }
}

/** Pixel line (Bresenham) with optional square thickness. */
export function line(ctx, x0, y0, x1, y1, color, t = 1) {
  ctx.fillStyle = color;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const o = Math.floor(t / 2);
  for (let guard = 0; guard < 2000; guard++) {
    ctx.fillRect(x0 - o, y0 - o, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Iso floor diamond for one tile whose top corner is at (x, y). */
export function diamond(ctx, x, y, color, w = TW, h = TH) {
  ctx.fillStyle = color;
  const half = h / 2;
  for (let r = 0; r < h; r++) {
    const hw = r < half ? (r + 1) * (w / h) : (h - r) * (w / h);
    ctx.fillRect(Math.round(x - hw), y + r, Math.round(hw * 2), 1);
  }
}

/**
 * Iso box. (gx, gy) is the back (north) corner of the footprint, w along gx, d along gy,
 * h in pixels. Draws top, left (+gy) and right (+gx) faces, offset by (ox, oy).
 */
export function isoBox(ctx, ox, oy, gx, gy, w, d, h, top, left, right, gz = 0) {
  const P = (a, b, z) => { const p = iso(a, b, z); return { x: p.x + ox, y: p.y + oy }; };
  const n = P(gx, gy, gz + h), e = P(gx + w, gy, gz + h), s = P(gx + w, gy + d, gz + h), wv = P(gx, gy + d, gz + h);
  const eb = P(gx + w, gy, gz), sb = P(gx + w, gy + d, gz), wb = P(gx, gy + d, gz);
  poly(ctx, [wv, s, sb, wb], left);
  poly(ctx, [s, e, eb, sb], right);
  poly(ctx, [n, e, s, wv], top);
}

// --- Tiny 3x5 bitmap font for in-world glyphs ---------------------------------
const GLYPHS = {
  Z: ['111', '001', '010', '100', '111'],
  z: ['000', '111', '010', '100', '111'],
  $: ['010', '111', '110', '011', '111'],
  '!': ['010', '010', '010', '000', '010'],
  '?': ['111', '001', '010', '000', '010'],
  '+': ['000', '010', '111', '010', '000'],
  '-': ['000', '000', '111', '000', '000'],
  '%': ['101', '001', '010', '100', '101'],
};

export function glyphs(ctx, text, x, y, color, scale = 1) {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) {
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
        if (g[r][c] === '1') ctx.fillRect(cx + c * scale, Math.round(y) + r * scale, scale, scale);
      }
    }
    cx += 4 * scale;
  }
}

/** Deterministic hash → [0,1), handy for per-desk variation without storing it. */
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
