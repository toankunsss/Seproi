// Pixel-art pictures for the 💎 shop, so players see what they are buying.
// Each item is drawn on a 24x24 grid (same procedural style as sprites.js) and cached as a
// data URL for <img>. Add a drawer here when you add an item to PREMIUM_ITEMS (config.js).
import { rect, px, line } from './pixel.js';

const S = 24;

const DRAW = {
  // Wall time clock with an AI "eye" scanning the staff
  aiClock(c) {
    rect(c, 5, 3, 14, 18, '#2a2836'); rect(c, 6, 4, 12, 16, '#4a4a5c');
    rect(c, 7, 5, 10, 6, '#0f1a24');                      // screen
    rect(c, 8, 7, 8, 2, '#1f6a8a'); rect(c, 11, 6, 2, 4, '#6ff0ff'); px(c, 11, 7, '#ffffff'); // eye
    rect(c, 8, 13, 8, 2, '#1d1826');                      // card slot
    rect(c, 9, 15, 6, 4, '#f4f1ea'); rect(c, 10, 16, 4, 1, '#c8c0a8'); // time card
    px(c, 16, 13, '#5cff7a'); px(c, 7, 13, '#ff4a4a');
    rect(c, 3, 9, 2, 1, '#6ff0ff'); rect(c, 19, 9, 2, 1, '#6ff0ff'); // scan beams
    px(c, 2, 8, '#6ff0ff'); px(c, 21, 8, '#6ff0ff');
  },
  // Reclining massage chair with vibration lines
  massage(c) {
    rect(c, 6, 4, 6, 12, '#7b4fc4'); rect(c, 7, 5, 4, 10, '#a77ae9');      // backrest
    rect(c, 7, 6, 4, 1, '#c79cff'); rect(c, 7, 9, 4, 1, '#c79cff'); rect(c, 7, 12, 4, 1, '#c79cff');
    rect(c, 6, 14, 13, 5, '#7b4fc4'); rect(c, 7, 15, 11, 2, '#a77ae9');    // seat
    rect(c, 15, 17, 5, 3, '#5b3e82');                                       // leg rest
    rect(c, 5, 12, 3, 4, '#432c70'); rect(c, 16, 12, 3, 3, '#432c70');     // arms
    rect(c, 8, 19, 2, 3, '#2b2836'); rect(c, 15, 20, 2, 2, '#2b2836');
    for (const [x, y] of [[2, 6], [3, 9], [2, 12], [20, 5], [21, 8]]) { px(c, x, y, '#ffd34d'); px(c, x + 1, y + 1, '#ffd34d'); }
  },
  // Secretary in a suit with glasses and a clipboard
  secretary(c) {
    rect(c, 8, 2, 8, 3, '#1a1210'); rect(c, 7, 4, 10, 7, '#1a1210');       // hair (bun)
    rect(c, 10, 0, 4, 2, '#1a1210');
    rect(c, 8, 4, 8, 7, '#f1c7a0');                                         // face
    rect(c, 8, 6, 3, 2, '#2a2340'); rect(c, 13, 6, 3, 2, '#2a2340'); rect(c, 11, 6, 2, 1, '#2a2340'); // glasses
    px(c, 9, 6, '#9fd8ff'); px(c, 14, 6, '#9fd8ff');
    rect(c, 11, 9, 2, 1, '#c0503a');
    rect(c, 6, 12, 12, 10, '#2b2d42'); rect(c, 11, 12, 2, 5, '#f4f4f4'); px(c, 11, 13, '#d02030'); px(c, 12, 14, '#d02030');
    rect(c, 14, 14, 7, 8, '#8a6a3a'); rect(c, 15, 15, 5, 6, '#f4f1ea');    // clipboard
    rect(c, 16, 16, 3, 1, '#4a4560'); rect(c, 16, 18, 3, 1, '#4a4560'); rect(c, 16, 13, 3, 2, '#c0c0cc');
  },
  // The diamond whip: crystal handle, cyan rope, diamond tip
  diamondWhip(c) {
    rect(c, 2, 17, 4, 5, '#29a8d8'); rect(c, 3, 18, 2, 3, '#e8fbff');      // handle
    rect(c, 2, 16, 4, 1, '#ffd34d');
    const rope = [[6, 15], [8, 13], [10, 12], [12, 10], [14, 9], [16, 7], [17, 5]];
    for (let i = 0; i < rope.length - 1; i++) line(c, rope[i][0], rope[i][1], rope[i + 1][0], rope[i + 1][1], '#4fb8e8', 2);
    // diamond tip
    rect(c, 18, 1, 5, 2, '#e8fbff'); rect(c, 17, 3, 7, 2, '#6ff0ff'); rect(c, 18, 5, 5, 1, '#29a8d8'); rect(c, 19, 6, 3, 1, '#29a8d8'); px(c, 20, 7, '#29a8d8');
    px(c, 19, 2, '#ffffff');
    for (const [x, y] of [[14, 2], [22, 10], [11, 5]]) { px(c, x, y, '#ffffff'); px(c, x - 1, y, '#9ff4ff'); px(c, x + 1, y, '#9ff4ff'); px(c, x, y - 1, '#9ff4ff'); px(c, x, y + 1, '#9ff4ff'); }
  },
  // Red bonus envelope with a "x2" and flames
  hotBonus(c) {
    for (const [x, h] of [[5, 6], [9, 8], [13, 7], [17, 6]]) { rect(c, x, 9 - h + 4, 3, h, '#ff6a1a'); rect(c, x + 1, 9 - h + 6, 1, h - 2, '#ffd34d'); }
    rect(c, 3, 9, 18, 13, '#c0202a'); rect(c, 3, 9, 18, 2, '#e04050');
    rect(c, 3, 9, 18, 1, '#ffd34d');
    rect(c, 9, 13, 6, 6, '#ffd34d'); rect(c, 10, 14, 4, 4, '#c0202a');   // gold seal
    px(c, 10, 14, '#ffd34d'); px(c, 13, 14, '#ffd34d'); px(c, 11, 15, '#ffd34d'); px(c, 12, 16, '#ffd34d'); px(c, 10, 17, '#ffd34d'); px(c, 13, 17, '#ffd34d'); // x
  },
  // Premium coffee: gold-rimmed cup on a saucer, rich steam
  espresso(c) {
    for (let i = 0; i < 3; i++) { px(c, 8 + i * 3, 3 + (i % 2), '#ffffff'); px(c, 9 + i * 3, 5, '#e8e0f0'); px(c, 8 + i * 3, 7 - (i % 2), '#ffffff'); }
    rect(c, 5, 9, 13, 9, '#f4f1ea'); rect(c, 5, 9, 13, 2, '#ffd34d');    // cup + gold rim
    rect(c, 6, 10, 11, 1, '#5a2e1a');                                      // coffee
    rect(c, 18, 11, 3, 5, '#f4f1ea'); rect(c, 19, 12, 1, 3, '#2a2340');  // handle
    rect(c, 7, 13, 9, 1, '#ffd34d');                                       // gold band
    rect(c, 2, 18, 20, 2, '#d8d4e6'); rect(c, 4, 20, 16, 1, '#a9a4bf');  // saucer
    rect(c, 10, 14, 3, 2, '#7a4a2a');
  },
  // A CV with a golden star stamp
  starCv(c) {
    rect(c, 4, 2, 14, 19, '#f4f1ea'); rect(c, 4, 2, 14, 1, '#ffffff'); rect(c, 17, 2, 1, 19, '#c8c0a8');
    rect(c, 6, 4, 4, 5, '#3d6fd6'); rect(c, 7, 5, 2, 2, '#f1c7a0');        // photo
    rect(c, 11, 4, 5, 1, '#4a4560'); rect(c, 11, 6, 4, 1, '#a99fc9'); rect(c, 11, 8, 5, 1, '#a99fc9');
    for (let y = 11; y < 19; y += 2) rect(c, 6, y, 9, 1, '#a99fc9');
    // star stamp
    const sx = 16, sy = 15;
    rect(c, sx, sy - 3, 2, 2, '#ffd34d'); rect(c, sx - 3, sy - 1, 8, 2, '#ffd34d'); rect(c, sx - 2, sy + 1, 6, 2, '#ffd34d');
    rect(c, sx - 2, sy + 3, 2, 2, '#ffd34d'); rect(c, sx + 2, sy + 3, 2, 2, '#ffd34d'); px(c, sx, sy, '#fff3a0');
  },
  // Gold trophy (project reward card)
  trophy(c) {
    rect(c, 6, 3, 12, 2, '#ffe38a'); rect(c, 6, 5, 12, 6, '#ffd34d'); rect(c, 7, 11, 10, 2, '#ffd34d'); rect(c, 9, 13, 6, 1, '#e0a030');
    rect(c, 3, 5, 3, 1, '#e0a030'); rect(c, 2, 6, 2, 3, '#e0a030'); rect(c, 3, 9, 3, 1, '#e0a030');   // handles
    rect(c, 18, 5, 3, 1, '#e0a030'); rect(c, 20, 6, 2, 3, '#e0a030'); rect(c, 18, 9, 3, 1, '#e0a030');
    rect(c, 7, 5, 2, 6, '#fff3a0');                                                                  // shine
    rect(c, 15, 5, 2, 7, '#e0a030');
    rect(c, 11, 14, 2, 3, '#c8862a'); rect(c, 8, 17, 8, 2, '#c8862a'); rect(c, 7, 19, 10, 3, '#6b3f1d'); rect(c, 9, 20, 6, 1, '#ffd34d');
    px(c, 11, 7, '#c8862a'); rect(c, 10, 8, 3, 1, '#c8862a'); px(c, 11, 9, '#c8862a');             // star
  },
  // Money bag full of đ
  cash(c) {
    rect(c, 9, 3, 6, 2, '#8a6a3a'); rect(c, 10, 5, 4, 2, '#6b4a2a');      // tie
    rect(c, 6, 7, 12, 3, '#c9a15a'); rect(c, 4, 10, 16, 10, '#c9a15a'); rect(c, 5, 20, 14, 2, '#a07a3a');
    rect(c, 5, 10, 3, 9, '#e0c07a');
    rect(c, 10, 12, 4, 1, '#3a2a1a'); rect(c, 10, 12, 1, 6, '#3a2a1a'); rect(c, 10, 17, 4, 1, '#3a2a1a'); rect(c, 13, 13, 1, 4, '#3a2a1a'); rect(c, 9, 14, 3, 1, '#3a2a1a'); // đ
    rect(c, 15, 11, 1, 2, '#3a2a1a'); rect(c, 14, 12, 2, 1, '#3a2a1a');
    for (const [x, y] of [[2, 18], [20, 17], [19, 21]]) { rect(c, x, y, 3, 2, '#ffd34d'); px(c, x + 1, y, '#fff3a0'); }
  },
};

const cache = new Map();

/** Data URL of the picture for premium item `id` ('' if there is no drawing). */
export function itemArtUrl(id) {
  if (cache.has(id)) return cache.get(id);
  const draw = DRAW[id];
  if (!draw) return '';
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  draw(ctx);
  const url = canvas.toDataURL();
  cache.set(id, url);
  return url;
}

export const hasArt = (id) => id in DRAW;
