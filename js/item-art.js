// Pixel-art pictures for the shops (💎 shop, Manage panel, furniture store), so players see
// what they are buying. Each item is drawn on a 24x24 grid (same procedural style as
// sprites.js) and cached as a data URL for <img>. Ids may carry a level: 'whip:3' calls
// DRAW.whip(ctx, 3). Add a drawer here when you add an item to PREMIUM_ITEMS / DECOR_ITEMS.
import { rect, px, line } from './pixel.js';
import { WHIPS, ACHIEVEMENTS, WHIP_SKINS } from './config.js';
import { drawCat, drawDog } from './sprites.js';

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
  // --- Manage panel ---------------------------------------------------------------------
  // Whip of level n, in its own colours; metal spikes / electric sparks / flames by fx.
  whip(c, n) {
    const W = WHIPS[n] || WHIPS[0];
    rect(c, 3, 17, 3, 3, '#6b3f1d'); rect(c, 5, 15, 3, 3, '#6b3f1d'); rect(c, 7, 13, 2, 3, '#8a5a2a'); // handle
    rect(c, 2, 19, 2, 2, '#ffd34d'); px(c, 4, 16, '#8a5a2a');
    const pts = [[9, 12], [10, 10], [11, 8], [12, 6], [14, 5], [16, 4], [18, 4], [19, 6], [20, 8], [20, 10]];
    pts.forEach(([x, y], i) => rect(c, x, y, i < 4 ? 2 : 1 + (i < 7 ? 1 : 0), 2, W.rope));
    rect(c, 20, 11, 2, 2, W.tip); px(c, 21, 13, W.tip);
    if (W.fx === 'metal') for (const [x, y] of [[11, 7], [14, 4], [18, 3], [21, 8]]) px(c, x, y, '#e8e8f0');
    if (W.fx === 'elec') { for (const [x, y] of [[22, 10], [19, 13], [23, 13], [17, 2]]) px(c, x, y, W.tip === '#e8fbff' ? '#e8fbff' : '#8fe8ff'); rect(c, 21, 14, 1, 2, '#fff'); }
    if (W.fx === 'fire') { rect(c, 19, 12, 4, 3, '#ff6a20'); rect(c, 20, 10, 2, 2, '#ffb030'); px(c, 20, 13, '#fff3a0'); px(c, 18, 9, '#ff6a20'); px(c, 22, 8, '#ffb030'); }
    if (W.premium) { rect(c, 16, 15, 5, 3, '#9ff4ff'); rect(c, 17, 14, 3, 5, '#9ff4ff'); px(c, 18, 15, '#ffffff'); }
  },
  // Coffee machine; the panel colour shows the level (same colours as in the office).
  coffee(c, n) {
    const cols = ['#4a4a55', '#8a2b2b', '#2b4a8a', '#c9a13a'];
    rect(c, 5, 3, 14, 18, '#a9a4bf'); rect(c, 5, 3, 14, 2, '#d8d4e6'); rect(c, 5, 19, 14, 2, '#7a7690');
    rect(c, 6, 6, 12, 5, cols[Math.max(0, n)] || cols[0]);
    for (let i = 0; i <= Math.max(0, n); i++) px(c, 7 + i * 2, 8, '#ffd34d');
    rect(c, 8, 12, 8, 6, '#2a2836'); rect(c, 11, 12, 2, 2, '#151515');
    rect(c, 9, 15, 5, 3, '#f5f5f5'); rect(c, 14, 15, 1, 2, '#f5f5f5'); rect(c, 10, 15, 3, 1, '#6b3f1d');
    px(c, 10, 13, '#d8f4ff'); px(c, 12, 11, '#d8f4ff'); px(c, 11, 1, '#d8f4ff'); px(c, 13, 2, '#d8f4ff');
    px(c, 17, 4, '#5cff7a');
  },
  // Supervising assistant: suit, sunglasses, clipboard and a small whip; stars = level.
  assistant(c, n) {
    rect(c, 8, 3, 8, 7, '#f1c7a0'); rect(c, 8, 2, 8, 2, '#3a2a1a'); rect(c, 7, 3, 1, 3, '#3a2a1a');
    rect(c, 8, 6, 8, 2, '#111'); px(c, 9, 6, '#9fd8ff'); px(c, 13, 6, '#9fd8ff');
    rect(c, 10, 9, 4, 1, '#a0503a');
    rect(c, 6, 11, 12, 10, '#2f3a5a'); rect(c, 11, 11, 2, 6, '#f4f4f4'); rect(c, 11, 12, 2, 4, '#d02030');
    rect(c, 3, 13, 5, 7, '#8a6a3a'); rect(c, 4, 14, 3, 5, '#f4f1ea'); px(c, 5, 15, '#4a4560'); px(c, 5, 17, '#4a4560');
    rect(c, 18, 12, 2, 6, '#6b3f1d'); rect(c, 19, 6, 1, 6, '#c89a5a'); rect(c, 20, 4, 2, 2, '#c89a5a');
    for (let i = 0; i <= Math.max(0, n); i++) rect(c, 6 + i * 4, 21, 3, 2, '#ffd34d');
  },
  // Office building, bigger with each level.
  office(c, n) {
    rect(c, 0, 21, 24, 3, '#3a3550');
    const lit = (x, y) => rect(c, x, y, 2, 2, (x * 7 + y * 3) % 5 ? '#ffd34d' : '#5a4a8a');
    if (n <= 0) {
      rect(c, 5, 11, 14, 10, '#c9774a'); rect(c, 4, 9, 16, 3, '#d65a3d'); rect(c, 4, 9, 16, 1, '#ff8a6a');
      rect(c, 7, 15, 4, 6, '#3a2a1a'); lit(13, 14); lit(16, 14);
    } else if (n === 1) {
      rect(c, 3, 7, 18, 14, '#5a6ee0'); rect(c, 3, 7, 18, 1, '#8a9cff'); rect(c, 2, 5, 20, 2, '#3a4aa0');
      for (const y of [9, 13]) for (const x of [5, 9, 13, 17]) lit(x, y);
      rect(c, 10, 17, 4, 4, '#2a2340');
    } else {
      rect(c, 6, 2, 12, 19, '#2a2a3a'); rect(c, 6, 2, 12, 1, '#5a5a7a'); rect(c, 2, 10, 4, 11, '#3a3a50'); rect(c, 18, 12, 4, 9, '#3a3a50');
      for (let y = 5; y < 18; y += 3) for (const x of [8, 11, 14]) lit(x, y);
      rect(c, 8, 3, 8, 1, '#ffd34d'); rect(c, 10, 18, 4, 3, '#ffd34d'); rect(c, 11, 19, 2, 2, '#2a2340');
      rect(c, 11, 0, 2, 2, '#ff3d4a');
    }
  },
  // A CV on the desk with a photo and a gold star stamp.
  hire(c) {
    rect(c, 5, 2, 14, 20, '#f4f1ea'); rect(c, 5, 2, 14, 1, '#ffffff'); rect(c, 18, 3, 1, 19, '#c8c0a8');
    rect(c, 7, 4, 5, 6, '#9ad'); rect(c, 8, 5, 3, 3, '#f1c7a0'); rect(c, 8, 4, 3, 1, '#3a2a1a'); rect(c, 7, 8, 5, 2, '#3d6fd6');
    for (const y of [12, 14, 16, 18]) rect(c, 7, y, y === 18 ? 6 : 10, 1, '#8a86a0');
    rect(c, 13, 5, 4, 1, '#4a4560'); rect(c, 13, 7, 3, 1, '#8a86a0');
    rect(c, 15, 16, 5, 2, '#ffd34d'); rect(c, 16, 15, 3, 4, '#ffd34d'); px(c, 17, 14, '#ffd34d'); px(c, 17, 19, '#ffd34d'); px(c, 16, 16, '#fff3a0');
  },
  // Whip skin n (WHIP_SKINS)
  skin(c, n) {
    const S = WHIP_SKINS[n] || WHIP_SKINS[0];
    rect(c, 3, 17, 3, 3, S.handle); rect(c, 5, 15, 3, 3, S.handle); rect(c, 7, 13, 2, 3, S.handle);
    const pts = [[9, 12], [10, 10], [11, 8], [12, 6], [14, 5], [16, 4], [18, 4], [19, 6], [20, 8], [20, 10]];
    pts.forEach(([x, y], i) => rect(c, x, y, i < 4 ? 2 : 1 + (i < 7 ? 1 : 0), 2, S.rope));
    rect(c, 20, 11, 2, 2, S.tip);
    if (S.id === 'rau') for (const [x, y] of [[10, 9], [13, 4], [17, 3], [21, 7]]) { rect(c, x, y, 2, 1, '#5cc85a'); }
    if (S.id === 'selfie') { rect(c, 18, 11, 5, 8, '#15151c'); rect(c, 19, 12, 3, 5, '#2de2e6'); }
    if (S.id === 'cable') { rect(c, 19, 12, 4, 3, '#e8e8f0'); rect(c, 20, 15, 1, 2, '#c0c0cc'); rect(c, 22, 15, 1, 2, '#c0c0cc'); }
    if (S.id === 'mop') { rect(c, 17, 11, 7, 6, '#f4f1ea'); for (let x = 17; x < 24; x += 2) rect(c, x, 17, 1, 3, '#d8d0a0'); }
    if (S.id === 'tet') { rect(c, 18, 12, 5, 6, '#d02030'); rect(c, 19, 13, 3, 4, '#ffd34d'); }
    if (S.id === 'neon') for (const [x, y] of [[9, 11], [12, 5], [16, 3], [21, 9]]) px(c, x, y, '#ffffff');
  },
  // Office pets
  cat(c) { drawCat(c, 12, 20, 0); },
  dog(c) { drawDog(c, 11, 21, 0, true); },
  // --- Boss skills (skills.js) -------------------------------------------------------------
  // Hawk eye: a sharp eye with a "!" spotting a slacker
  skhawk(c) {
    rect(c, 2, 8, 20, 9, '#1d1826'); rect(c, 4, 7, 16, 11, '#1d1826');
    rect(c, 4, 9, 16, 7, '#f4f1ea'); rect(c, 6, 8, 12, 9, '#f4f1ea');
    rect(c, 9, 9, 6, 7, '#c8862a'); rect(c, 10, 10, 4, 5, '#ffd34d'); rect(c, 11, 11, 2, 3, '#111'); px(c, 10, 10, '#ffffff');
    rect(c, 3, 5, 6, 1, '#ffd34d'); rect(c, 15, 5, 6, 1, '#ffd34d'); px(c, 12, 4, '#ffd34d'); // sharp brows
    rect(c, 20, 0, 3, 5, '#ff3d4a'); rect(c, 20, 6, 3, 2, '#ff3d4a'); // "!"
  },
  // Inspiring leader: megaphone with hearts
  skcharisma(c) {
    rect(c, 3, 9, 4, 6, '#3d6fd6'); rect(c, 7, 7, 3, 10, '#5a8ae6'); rect(c, 10, 5, 3, 14, '#7aa8ff'); rect(c, 13, 3, 2, 18, '#a8c8ff');
    rect(c, 4, 15, 2, 4, '#2a4a9a');
    const h = (x, y) => { rect(c, x, y, 2, 1, '#ff5a7a'); rect(c, x + 3, y, 2, 1, '#ff5a7a'); rect(c, x - 1, y + 1, 7, 2, '#ff5a7a'); rect(c, x, y + 3, 5, 1, '#ff5a7a'); rect(c, x + 1, y + 4, 3, 1, '#ff5a7a'); px(c, x + 2, y + 5, '#ff5a7a'); };
    h(17, 2); h(18, 11);
  },
  // Soft discipline: a shield crossed by a whip
  skdiscipline(c) {
    rect(c, 5, 2, 14, 2, '#1d1826'); rect(c, 4, 4, 16, 10, '#1d1826'); rect(c, 6, 14, 12, 4, '#1d1826'); rect(c, 9, 18, 6, 3, '#1d1826'); rect(c, 11, 21, 2, 1, '#1d1826');
    rect(c, 6, 3, 12, 10, '#46b37a'); rect(c, 7, 13, 10, 4, '#46b37a'); rect(c, 10, 17, 4, 3, '#46b37a');
    rect(c, 6, 3, 6, 10, '#5cc88a');
    line(c, 4, 20, 20, 4, '#6b3f1d'); line(c, 5, 20, 21, 4, '#c89a5a'); rect(c, 2, 20, 4, 3, '#ffd34d');
  },
  // Negotiator: handshake over a rising chart
  skbusiness(c) {
    rect(c, 2, 20, 20, 1, '#8a86a0'); rect(c, 3, 15, 3, 5, '#3c9a5a'); rect(c, 8, 12, 3, 8, '#3c9a5a'); rect(c, 13, 8, 3, 12, '#3c9a5a'); rect(c, 18, 4, 3, 16, '#3c9a5a');
    line(c, 2, 13, 20, 2, '#ffd34d'); rect(c, 18, 1, 3, 3, '#ffd34d');
    rect(c, 4, 9, 7, 4, '#f1c7a0'); rect(c, 11, 9, 8, 4, '#d9a57a'); rect(c, 2, 8, 3, 6, '#3d6fd6'); rect(c, 18, 8, 4, 6, '#2a2a3a');
    rect(c, 9, 10, 4, 2, '#e3b48a');
  },
  // Roar: a shouting boss face with sound waves
  skroar(c) {
    rect(c, 3, 5, 12, 13, '#f1c7a0'); rect(c, 3, 3, 12, 3, '#1a1210'); rect(c, 3, 9, 12, 2, '#111');
    px(c, 5, 9, '#9fd8ff'); px(c, 11, 9, '#9fd8ff');
    rect(c, 6, 12, 6, 5, '#7a1a1a'); rect(c, 7, 13, 4, 3, '#d02030'); rect(c, 6, 12, 6, 1, '#ffffff');
    rect(c, 4, 6, 3, 1, '#1a1210'); rect(c, 11, 6, 3, 1, '#1a1210');
    for (const [x, y, h] of [[17, 8, 7], [19, 6, 11], [21, 4, 15]]) rect(c, x, y, 1, h, '#ffd34d');
    rect(c, 5, 18, 8, 4, '#d02030');
  },
  // Org chart (departments)
  dept(c) {
    rect(c, 8, 2, 8, 5, '#ffd34d'); rect(c, 9, 3, 6, 3, '#fff3a0');
    rect(c, 11, 7, 2, 3, '#8a86a0'); rect(c, 3, 10, 18, 2, '#8a86a0'); rect(c, 3, 12, 2, 2, '#8a86a0'); rect(c, 11, 12, 2, 2, '#8a86a0'); rect(c, 19, 12, 2, 2, '#8a86a0');
    rect(c, 0, 14, 7, 6, '#3d6fd6'); rect(c, 8, 14, 8, 6, '#3c9a5a'); rect(c, 17, 14, 7, 6, '#8a4a78');
    rect(c, 2, 16, 3, 2, '#f4f1ea'); rect(c, 10, 16, 4, 2, '#f4f1ea'); rect(c, 19, 16, 3, 2, '#f4f1ea');
  },
  // Two employees and a heart (staff care).
  staff(c) {
    rect(c, 3, 8, 7, 7, '#f5d0b0'); rect(c, 3, 7, 7, 2, '#e8c35a'); rect(c, 2, 8, 1, 6, '#e8c35a'); rect(c, 2, 15, 9, 7, '#e0607e');
    px(c, 5, 11, '#1d1826'); px(c, 8, 11, '#1d1826'); rect(c, 5, 13, 3, 1, '#a0503a');
    rect(c, 13, 8, 7, 7, '#d9a57a'); rect(c, 13, 7, 7, 2, '#2b1d14'); rect(c, 12, 15, 9, 7, '#46b37a');
    px(c, 15, 11, '#1d1826'); px(c, 18, 11, '#1d1826'); rect(c, 15, 13, 3, 1, '#a0503a');
    const h = '#ff5a7a'; rect(c, 9, 1, 2, 1, h); rect(c, 13, 1, 2, 1, h); rect(c, 8, 2, 8, 2, h); rect(c, 9, 4, 6, 1, h); rect(c, 10, 5, 4, 1, h); rect(c, 11, 6, 2, 1, h); px(c, 9, 2, '#ffd0dc');
  },

  // --- Furniture store ------------------------------------------------------------------
  rug(c) {
    rect(c, 2, 8, 20, 10, '#a52d43'); rect(c, 3, 9, 18, 8, '#d89b38'); rect(c, 4, 10, 16, 6, '#8e2337');
    rect(c, 9, 12, 6, 2, '#d89b38'); for (let x = 2; x < 22; x += 2) { px(c, x, 7, '#d89b38'); px(c, x, 18, '#d89b38'); }
  },
  lamp(c) {
    rect(c, 7, 3, 10, 6, '#ffe9a8'); rect(c, 6, 8, 12, 2, '#e8cf86'); rect(c, 8, 4, 2, 4, '#fff7d0');
    rect(c, 11, 10, 2, 9, '#4a4560'); rect(c, 8, 19, 8, 2, '#2a2836');
    rect(c, 4, 11, 2, 1, '#fff3a0'); rect(c, 18, 11, 2, 1, '#fff3a0'); px(c, 3, 13, '#fff3a0'); px(c, 20, 13, '#fff3a0');
  },
  sofa(c) {
    rect(c, 4, 7, 16, 8, '#ad7be9'); rect(c, 4, 7, 16, 1, '#c79cff'); rect(c, 2, 12, 20, 6, '#9a6bd8');
    rect(c, 1, 11, 4, 8, '#704b9d'); rect(c, 19, 11, 4, 8, '#704b9d'); rect(c, 11, 8, 1, 6, '#8a5ac0');
    rect(c, 2, 19, 2, 2, '#3a2a52'); rect(c, 20, 19, 2, 2, '#3a2a52');
  },
  shelf(c) {
    rect(c, 4, 2, 16, 20, '#7c522f'); rect(c, 5, 3, 14, 18, '#5e3d22');
    const books = ['#d65a3d', '#3d6fd6', '#46b37a', '#e3a33b', '#9a64d6', '#34a4c4'];
    for (const y of [3, 9, 15]) {
      rect(c, 5, y + 5, 14, 1, '#c08a58');
      for (let i = 0; i < 6; i++) rect(c, 6 + i * 2, y + (i % 3 === 1 ? 1 : 0), 2, 5 - (i % 3 === 1 ? 1 : 0), books[(i + y) % 6]);
    }
  },
  aquarium(c) {
    rect(c, 2, 4, 20, 14, '#2c667d'); rect(c, 3, 5, 18, 12, '#45bad0'); rect(c, 3, 14, 18, 3, '#d8c48a');
    rect(c, 5, 10, 1, 4, '#2f8a4a'); rect(c, 17, 8, 1, 6, '#2f8a4a'); rect(c, 18, 10, 1, 3, '#2f8a4a');
    rect(c, 8, 8, 4, 2, '#ffd34d'); px(c, 7, 8, '#ffb030'); px(c, 7, 9, '#ffb030'); px(c, 11, 8, '#222');
    rect(c, 13, 11, 3, 2, '#ef6f64'); px(c, 16, 11, '#d0504a'); px(c, 13, 11, '#222');
    px(c, 10, 6, '#d8f4ff'); px(c, 15, 7, '#d8f4ff');
    rect(c, 3, 18, 18, 3, '#6b4a30'); rect(c, 4, 21, 2, 2, '#3f2a20'); rect(c, 18, 21, 2, 2, '#3f2a20');
  },
  // Achievement medal (index into ACHIEVEMENTS)
  badge(c, n) {
    const a = ACHIEVEMENTS[n] || ACHIEVEMENTS[0];
    const T = TIERS[badgeTier(a)];
    // ribbon
    rect(c, 6, 0, 4, 8, '#d63a3a'); rect(c, 14, 0, 4, 8, '#3d6fd6'); rect(c, 9, 4, 6, 4, '#2a1d14');
    rect(c, 7, 0, 1, 7, '#ff6a6a'); rect(c, 15, 0, 1, 7, '#6a9aff');
    // medal: stepped circle, rim + face + highlight
    const rows = [[8, 8], [6, 12], [5, 14], [4, 16], [4, 16], [3, 18], [3, 18], [3, 18], [3, 18], [3, 18], [4, 16], [4, 16], [5, 14], [6, 12], [8, 8]];
    rows.forEach(([x, w], i) => rect(c, x, 7 + i, w, 1, T.rim));
    rows.slice(1, -1).forEach(([x, w], i) => rect(c, x + 1, 8 + i, w - 2, 1, T.face));
    rect(c, 7, 9, 3, 1, T.hi); rect(c, 6, 10, 1, 2, T.hi);
    // glyph
    GLYPHS[glyphFor(a.id)].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') px(c, 8 + x, 10 + y, GLYPH_COLORS[ch]); }));
  },
  // Gold trophy (project reward card, furniture store)
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

// --- Achievement badges ------------------------------------------------------------------
// A medal whose metal shows the reward tier (bronze / silver / gold / diamond) with a 9x9 glyph
// for the kind of achievement. 'badge:<index in ACHIEVEMENTS>'.
const GLYPH_COLORS = { '#': '#2a1d14', w: '#ffffff', r: '#d63a3a', y: '#ffd34d', b: '#3d6fd6', g: '#2f9a4a', k: '#f1c7a0' };
const GLYPHS = {
  eye: ['.........', '..#####..', '.#wwwww#.', '#ww###ww#', '#ww#b#ww#', '#ww###ww#', '.#wwwww#.', '..#####..', '.........'],
  bolt: ['....###..', '...#rr#..', '..#rr#...', '.#rrrr#..', '..#rr#...', '.#rr#....', '#rr#.....', '#r#......', '##.......'],
  calendar: ['.#.....#.', '#########', '#rrrrrrr#', '#wwwwwww#', '#w#w#w#w#', '#wwwwwww#', '#w#w#w#w#', '#wwwwwww#', '#########'],
  coin: ['..#####..', '.#yyyyy#.', '#yy###yy#', '#yy#yyyy#', '#yy###yy#', '#yyyy#yy#', '#yy###yy#', '.#yyyyy#.', '..#####..'],
  person: ['...###...', '..#kkk#..', '..#kkk#..', '...###...', '.#######.', '#bbbbbbb#', '#bbbbbbb#', '#bbbbbbb#', '#########'],
  star: ['....#....', '...#y#...', '####y####', '#yyyyyyy#', '.#yyyyy#.', '..#yyy#..', '.#yy#yy#.', '.#y#.#y#.', '.##...##.'],
  building: ['..#####..', '..#w#w#..', '..#####..', '..#w#w#..', '#########', '#w#w#w#w#', '#########', '#w#w#w#w#', '#########'],
  whip: ['.......##', '......#r.', '.....#...', '....#....', '...#.....', '..#......', '.##......', '###......', '##.......'],
  lamp: ['..#####..', '.#yyyyy#.', '#yyyyyyy#', '.#######.', '....#....', '....#....', '....#....', '..#####..', '.........'],
  case: ['...###...', '..#...#..', '#########', '#bbbbbbb#', '#bbb#bbb#', '#bbbbbbb#', '#bbbbbbb#', '#########', '.........'],
  shield: ['#########', '#ggggggw#', '#gggggw##', '#w#ggw#g#', '#gw#w#gg#', '.#gw#gg#.', '..#ggg#..', '...#g#...', '....#....'],
  fist: ['.#.#.#...', '#k#k#k#..', '#kkkkkk#.', '#kkkkkk#.', '#kkkkkk#.', '.#kkkk#..', '..####...', '..#rr#...', '..####...'],
  pad: ['.........', '.#######.', '#bbbbbbb#', '#b#bbbrb#', '###bbbbb#', '#b#bbgbb#', '#bbbbbbb#', '.##...##.', '.........'],
  phone: ['..#####..', '..#rrr#..', '..#rwr#..', '..#rrr#..', '..#rrr#..', '..#rrr#..', '..#####..', '..##w##..', '..#####..'],
  zzz: ['#######..', '.....#...', '....#....', '...#.....', '..#......', '.#######.', '......###', '.......#.', '......###'],
  chart: ['........#', '.......##', '#.....#.#', '##...#...', '#.#.#....', '#..#.....', '#........', '#........', '#########'],
  cup: ['..#.#.#..', '...#.#...', '#######..', '#wwwww###', '#wwwww#.#', '#wwwww###', '.#www#...', '..###....', '#######..'],
  glasses: ['.........', '.........', '####.####', '#bb###bb#', '####.####', '.........', '..#...#..', '...###...', '.........'],
  gem: ['..#####..', '.#bwbbb#.', '#bbbbbbb#', '.#bbbbb#.', '..#bbb#..', '...#b#...', '....#....', '.........', '.........'],
  crown: ['.........', '#...#...#', '##.###.##', '#y#yyy#y#', '#yyyyyyy#', '#yryyyry#', '#########', '.........', '.........'],
  rocket: ['....#....', '...#w#...', '...#w#...', '..#wrw#..', '..#www#..', '.#w#w#w#.', '.#.#y#.#.', '...yry...', '....r....'],
};
function glyphFor(id) {
  if (/^catch/.test(id)) return 'eye';
  if (/^combo/.test(id)) return 'bolt';
  if (/^(day5k|day20k|earn|peak)/.test(id)) return 'coin';
  if (/^day/.test(id)) return 'calendar';
  if (/^(staff|nick)/.test(id)) return 'person';
  if (/^star/.test(id)) return 'star';
  if (/^office/.test(id)) return 'building';
  if (/^whip/.test(id)) return 'whip';
  if (/^decor/.test(id)) return 'lamp';
  if (/^(proj|streak|bigProj)/.test(id)) return 'case';
  if (/^(kpi|fair)/.test(id)) return 'shield';
  if (/^strike/.test(id)) return 'fist';
  if (/^gamer/.test(id)) return 'pad';
  if (/^toptop/.test(id)) return 'phone';
  if (/^sleep/.test(id)) return 'zzz';
  if (/^crypto/.test(id)) return 'chart';
  if (/^coffee/.test(id)) return 'cup';
  if (/^assist/.test(id)) return 'glasses';
  if (/^gems/.test(id)) return 'gem';
  if (/^perks/.test(id)) return 'crown';
  return 'rocket';
}
const TIERS = [
  { max: 5, rim: '#7a3f18', face: '#d08a4a', hi: '#f0b070' },       // bronze
  { max: 15, rim: '#5a5a70', face: '#c8c8d8', hi: '#ffffff' },      // silver
  { max: 30, rim: '#9a6410', face: '#ffd34d', hi: '#fff3a0' },      // gold
  { max: Infinity, rim: '#1f5a8a', face: '#8fe8ff', hi: '#e8fbff' }, // diamond
];
export const badgeTier = (a) => TIERS.findIndex((x) => a.gems <= x.max);

const cache = new Map();

/** Data URL of the picture for premium item `id` ('' if there is no drawing). */
export function itemArtUrl(id) {
  if (cache.has(id)) return cache.get(id);
  const [name, arg] = String(id).split(':');
  const draw = DRAW[name];
  if (!draw) return '';
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  draw(ctx, arg === undefined ? undefined : Number(arg));
  const url = canvas.toDataURL();
  cache.set(id, url);
  return url;
}

export const hasArt = (id) => String(id).split(':')[0] in DRAW;
