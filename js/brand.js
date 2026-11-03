// Game logo / app icon: the Boss in sunglasses cracking a golden whip, drawn as pixel art on a
// 32x32 grid so it stays crisp at any size. Used by the title screen and by the asset
// generator (tools/brand/make-brand.cjs → favicon, app icons, splash screens, store icon).

const G = 32;

/**
 * Draw the logo into ctx at (x, y) with size `size` (pixels, square).
 * opts.background: draw the round-cornered purple backdrop (false for adaptive-icon foregrounds).
 * opts.figure: false draws only the backdrop (adaptive-icon background layer).
 * opts.t: time in seconds, animates the whip crack sparkle when > 0.
 */
export function drawLogo(ctx, x, y, size, { background = true, figure = true, t = 0 } = {}) {
  const u = size / G;
  const R = (gx, gy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + gx * u), Math.round(y + gy * u), Math.ceil(w * u), Math.ceil(h * u)); };
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (background) {
    // backdrop: deep purple with stepped rings, soft rays and a glow disc behind the boss
    R(0, 0, 32, 32, '#24183f');
    ['#2d2052', '#362867', '#40307c'].forEach((c, i) => R(2 + i * 3, 2 + i * 3, 28 - i * 6, 28 - i * 6, c));
    const ray = '#5b46a8';
    for (const [gx, gy, w, h] of [[15, 0, 2, 6], [0, 15, 6, 2], [26, 15, 6, 2], [3, 3, 3, 3], [26, 3, 3, 3], [3, 26, 3, 3], [26, 26, 3, 3]]) R(gx, gy, w, h, ray);
    R(7, 6, 18, 18, '#5a44a6'); R(6, 8, 20, 14, '#5a44a6'); // glow disc behind the boss (stepped circle)
    R(8, 7, 16, 16, '#6c56c4'); R(7, 9, 18, 12, '#6c56c4');
  }
  if (!figure) { ctx.restore(); return; }

  // suit shoulders
  R(5, 25, 22, 7, '#232539');
  R(6, 25, 20, 1, '#3a3d5c');
  R(13, 24, 6, 8, '#f4f4f4');           // shirt
  R(15, 24, 2, 2, '#d02030'); R(14, 26, 4, 5, '#d02030'); R(15, 31, 2, 1, '#a01020'); // tie
  R(12, 24, 2, 6, '#3a3d5c'); R(18, 24, 2, 6, '#3a3d5c'); // lapels
  // neck + head
  R(13, 21, 6, 4, '#d9a57a');
  R(10, 9, 12, 13, '#f1c7a0');
  R(9, 13, 1, 5, '#f1c7a0'); R(22, 13, 1, 5, '#f1c7a0');   // ears
  R(10, 20, 12, 2, '#e3b48a');                             // jaw shade
  // slick hair with a side part
  R(9, 6, 14, 4, '#1a1210'); R(9, 9, 2, 4, '#1a1210'); R(21, 9, 2, 3, '#1a1210');
  R(11, 5, 10, 1, '#1a1210'); R(12, 6, 5, 1, '#4a3a30');
  // angry brows + sunglasses
  R(11, 11, 4, 1, '#1a1210'); R(17, 11, 4, 1, '#1a1210'); R(14, 12, 1, 1, '#1a1210'); R(17, 12, 1, 1, '#1a1210');
  R(10, 13, 12, 1, '#111111');
  R(10, 13, 5, 4, '#111111'); R(17, 13, 5, 4, '#111111'); R(15, 14, 2, 1, '#111111');
  R(11, 14, 2, 1, '#9fd8ff'); R(18, 14, 2, 1, '#9fd8ff'); // lens glint
  // smirk
  R(13, 18, 6, 1, '#7a2a1a'); R(18, 17, 1, 1, '#7a2a1a');
  // raised fist (right) gripping a brown whip handle with a gold pommel
  R(24, 9, 3, 9, '#6b3f1d'); R(24, 9, 1, 9, '#8a5a2a');      // handle
  R(23, 17, 5, 4, '#f1c7a0'); R(23, 18, 5, 1, '#d9a57a');    // fist
  R(24, 21, 3, 2, '#ffd34d');                                 // pommel
  R(22, 21, 2, 5, '#232539'); R(26, 21, 2, 5, '#232539');    // sleeve
  // the lash: thick near the handle, thinning as it arcs over the head to the top-left
  const rope = '#ffcf5a', ropeD = '#c8862a';
  for (const [gx, gy, w, h] of [[24, 7, 2, 2], [23, 5, 2, 2], [21, 3, 2, 2], [19, 2, 2, 2], [17, 1, 2, 2], [14, 1, 3, 1], [11, 1, 3, 1], [9, 2, 2, 1], [7, 3, 2, 1], [5, 4, 2, 1]]) { R(gx, gy, w, h, rope); R(gx, gy + h, w, 1, ropeD); }
  // crack sparkle at the tip (pulses when animated)
  const big = t ? (Math.floor(t * 4) % 2 === 0) : true;
  R(3, 5, 1, 1, '#ffffff'); R(2, 4, 1, 1, '#ffe38a'); R(4, 4, 1, 1, '#ffe38a'); R(2, 6, 1, 1, '#ffe38a'); R(4, 6, 1, 1, '#ffe38a');
  if (big) { R(3, 3, 1, 1, '#ffffff'); R(1, 5, 1, 1, '#ffffff'); R(3, 7, 1, 1, '#ffffff'); R(5, 5, 1, 1, '#ffffff'); }
  ctx.restore();
}

/** Data URL of the logo at `size` px (for <img>). */
export function logoUrl(size = 256, opts) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  drawLogo(c.getContext('2d'), 0, 0, size, opts);
  return c.toDataURL();
}

// --- Title lettering -----------------------------------------------------------------------
// "WHIP BOSS" as chunky pixel letters with a dark outline and a 3D drop, drawn here rather than
// with a font so the title, the store graphic and the promo video look identical (and accented
// capitals like Ế still work). One grid unit = `u` pixels.
const GLYPHS = {
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
};
// Ế: circumflex + acute above the E (rows -4..-2)
const MARKS = { 'Ế': { base: 'E', px: [[0, -2], [1, -3], [2, -2], [4, -2], [5, -3]] } };
const NAME = 'WHIP BOSS';
const top = (text) => ([...text].some((ch) => MARKS[ch]) ? 4 : 0); // room above the letters for accents

const TITLE_COLORS = [
  { face: '#ffd34d', low: '#ffb030', drop: '#c8862a' }, // first word: gold
  { face: '#ff6a78', low: '#e83a4c', drop: '#8a2030' }, // second word: red
];

/** Size in grid units of drawTitle's output for `text`. */
export function titleSize(text = NAME) {
  let w = 0;
  for (const ch of text) w += ch === ' ' ? 3 : (GLYPHS[MARKS[ch]?.base || ch]?.[0].length || 0) + 1;
  return { w: w - 1 + 2, h: top(text) + 7 + 2 + 1 }; // + outline (1 each side) + drop (1)
}

/** Draw `text` with its top-left corner at (x, y); words alternate gold / red. */
export function drawTitle(ctx, x, y, u, text = NAME, edge = '#0f0c18') {
  const TOP = top(text);
  const cells = []; // [gx, gy, wordIndex, isFaceLowerHalf]
  let cx = 1, word = 0;
  for (const ch of text) {
    if (ch === ' ') { cx += 3; word++; continue; }
    const mark = MARKS[ch];
    const rows = GLYPHS[mark ? mark.base : ch];
    if (!rows) continue;
    rows.forEach((row, ry) => [...row].forEach((c, rx) => { if (c === '#') cells.push([cx + rx, TOP + 1 + ry, word, ry >= 4]); }));
    if (mark) for (const [mx, my] of mark.px) cells.push([cx + mx, TOP + 1 + my, word, false]);
    cx += rows[0].length + 1;
  }
  const R = (gx, gy, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + gx * u), Math.round(y + gy * u), Math.ceil(u), Math.ceil(u)); };
  // outline around face + drop, then the drop, then the face
  for (const [gx, gy] of cells) for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) R(gx + dx, gy + dy, edge);
  for (const [gx, gy, w] of cells) R(gx, gy + 1, TITLE_COLORS[w % 2].drop);
  for (const [gx, gy, w, low] of cells) R(gx, gy, low ? TITLE_COLORS[w % 2].low : TITLE_COLORS[w % 2].face);
}
