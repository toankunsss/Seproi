// Boss equipment: six slots (hat, glasses, suit, tie, watch, shoes). Items drop at random when you
// catch slackers (more with a big combo), from the weekly boss chest, from 3-star campaign levels
// and from perfect mini-games. Each item has a look, a rarity and one small bonus; what the boss
// wears shows on the avatar (HUD, top left) and on the inventory screen.
//
//   g.inv = { items: [{ id, slot, look, rarity, stat, value }], eq: { slot: itemId }, next, fresh }
import { TUNING } from './config.js';

export const SLOTS = ['hat', 'glasses', 'suit', 'tie', 'watch', 'shoes'];
export const SLOT_NAME = { hat: 'Mũ', glasses: 'Kính', suit: 'Áo vest', tie: 'Cà vạt', watch: 'Đồng hồ', shoes: 'Giày' };

export const RARITY = [
  { name: 'Thường', color: '#b8b4c8', mult: 1, weight: 62, sell: 120 },
  { name: 'Hiếm', color: '#5aa0ff', mult: 2, weight: 27, sell: 350 },
  { name: 'Sử thi', color: '#c07aff', mult: 3.3, weight: 9, sell: 900 },
  { name: 'Huyền thoại', color: '#ffb030', mult: 5, weight: 2, sell: 2500 },
];

// stat → text (Vietnamese source) and value at "common"; reach is in canvas pixels
export const STATS = {
  catch: { text: 'Tiền bắt quả tang +{v}%', base: 3 },
  income: { text: 'Thu nhập nhân viên +{v}%', base: 2 },
  reach: { text: 'Tầm quất +{v}', base: 1 },
  combo: { text: 'Giữ combo lâu hơn {v}%', base: 6 },
  guard: { text: 'Giảm phạt quất oan {v}%', base: 6 },
  coffee: { text: 'Cà phê hồi nhanh hơn {v}%', base: 4 },
};
const SLOT_STATS = { hat: ['catch', 'combo'], glasses: ['reach', 'catch'], suit: ['income', 'guard'], tie: ['income', 'combo'], watch: ['coffee', 'combo'], shoes: ['reach', 'guard'] };

export const LOOKS = {
  hat: [{ name: 'Mũ phớt', c: '#3a2a1a', s: 'fedora' }, { name: 'Mũ lưỡi trai đỏ', c: '#d02030', s: 'cap' }, { name: 'Vương miện giấy', c: '#ffd34d', s: 'crown' }, { name: 'Mũ len Tết', c: '#e03a3a', s: 'beanie' }],
  glasses: [{ name: 'Kính râm', c: '#111111', l: '#9fd8ff' }, { name: 'Kính cận', c: '#4a4a60', l: '#e8f4ff' }, { name: 'Kính 3D', c: '#f4f4f4', l: '#ff3d4a', l2: '#3d8aff' }, { name: 'Kính kim cương', c: '#8fe8ff', l: '#e8fbff' }],
  suit: [{ name: 'Vest đen công sở', c: '#232539', d: '#3a3d5c' }, { name: 'Vest đỏ quyền lực', c: '#a01a2a', d: '#c83a4a' }, { name: 'Áo hoa Hawaii', c: '#2a9a7a', d: '#ffd34d', s: 'flowers' }, { name: 'Vest kim tuyến', c: '#c8a020', d: '#fff3a0', s: 'sparkle' }],
  tie: [{ name: 'Cà vạt đỏ', c: '#d02030' }, { name: 'Nơ bướm', c: '#111111', s: 'bow' }, { name: 'Cà vạt vàng', c: '#ffd34d' }, { name: 'Cà vạt LED', c: '#2de2e6', s: 'led' }],
  watch: [{ name: 'Đồng hồ nhựa', c: '#3d6fd6' }, { name: 'Đồng hồ vàng', c: '#ffd34d' }, { name: 'Đồng hồ thông minh', c: '#111111', l: '#5cff7a' }, { name: 'Rolex KPI', c: '#c0c0cc', l: '#ffd34d' }],
  shoes: [{ name: 'Dép tổ ong', c: '#3d6fd6' }, { name: 'Giày tây', c: '#2a1a10' }, { name: 'Giày thể thao', c: '#f4f4f4', l: '#d02030' }, { name: 'Giày vàng', c: '#ffd34d' }],
};

export const INV_CAP = 40;
export const DROP = { catch: 0.02, perCombo: 0.002, mini: 0.15 };

export function invState(g) {
  if (!g.inv) g.inv = { items: [], eq: {}, next: 1, fresh: 0 };
  return g.inv;
}

const dayMult = (g) => 1 + TUNING.dayMult * (g.day - 1);
export const itemName = (it) => LOOKS[it.slot][it.look].name;
export const statText = (it) => STATS[it.stat].text;

/** New random item (not yet in the inventory). minRarity raises the floor (boss chest, levels). */
export function rollItem(g, minRarity = 0) {
  const inv = invState(g);
  const pool = RARITY.map((r, i) => (i >= minRarity ? r.weight : 0));
  let x = Math.random() * pool.reduce((a, b) => a + b, 0), rarity = 0;
  for (let i = 0; i < pool.length; i++) { if ((x -= pool[i]) < 0) { rarity = i; break; } rarity = i; }
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const stat = SLOT_STATS[slot][Math.floor(Math.random() * 2)];
  const value = stat === 'reach' ? rarity + 1 : Math.round(STATS[stat].base * RARITY[rarity].mult);
  return { id: inv.next++, slot, look: Math.floor(Math.random() * LOOKS[slot].length), rarity, stat, value };
}

/** Put an item in the bag. A full bag sells its weakest unequipped item. Returns the item. */
export function addItem(g, it) {
  const inv = invState(g);
  inv.items.push(it);
  inv.fresh = (inv.fresh || 0) + 1;
  if (inv.items.length > INV_CAP) {
    const worn = new Set(Object.values(inv.eq));
    const spare = inv.items.filter((x) => !worn.has(x.id) && x !== it).sort((a, b) => a.rarity - b.rarity || a.value - b.value)[0];
    if (spare) sell(g, spare.id);
  }
  g.records.itemsFound = (g.records.itemsFound || 0) + 1;
  return it;
}

/** Catch drop roll (manual catches only). Returns the item or null. */
export function maybeDrop(g, combo = 1) {
  if (Math.random() >= DROP.catch + DROP.perCombo * Math.min(combo, 20)) return null;
  return addItem(g, rollItem(g));
}

export function equip(g, id) {
  const inv = invState(g);
  const it = inv.items.find((x) => x.id === id);
  if (!it) return false;
  inv.eq[it.slot] = it.id;
  return true;
}
export function unequip(g, slot) { delete invState(g).eq[slot]; }

export function sell(g, id) {
  const inv = invState(g);
  const i = inv.items.findIndex((x) => x.id === id);
  if (i < 0) return 0;
  const it = inv.items[i];
  if (inv.eq[it.slot] === id) delete inv.eq[it.slot];
  inv.items.splice(i, 1);
  const money = Math.round((RARITY[it.rarity].sell * dayMult(g)) / 10) * 10;
  g.money += money;
  return money;
}

/** Item worn in a slot (or null). */
export function worn(g, slot) {
  const inv = invState(g);
  return inv.items.find((x) => x.id === inv.eq[slot]) || null;
}

/** Sum of a stat over the equipped items (catch / income / combo / guard / coffee in %, reach in px). */
export function bonus(g, stat) {
  if (!g.inv) return 0;
  let s = 0;
  for (const slot of SLOTS) { const it = worn(g, slot); if (it && it.stat === stat) s += it.value; }
  return stat === 'guard' ? Math.min(60, s) : stat === 'coffee' ? Math.min(50, s) : s;
}

// --- drawing ----------------------------------------------------------------------------------
/** The boss, full body on a 20x34 grid at (x, y), u px per cell, wearing g's equipment. */
export function drawBossFigure(ctx, x, y, u, g) {
  const R = (gx, gy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + gx * u), Math.round(y + gy * u), Math.ceil(w * u), Math.ceil(h * u)); };
  const look = (slot) => { const it = g && worn(g, slot); return it ? LOOKS[slot][it.look] : null; };
  const suit = look('suit'), tie = look('tie'), hat = look('hat'), gl = look('glasses'), watch = look('watch'), shoes = look('shoes');
  const sc = suit ? suit.c : '#e8e4f0', sd = suit ? suit.d : '#c8c4d8';
  // legs + shoes
  R(6, 25, 3, 7, '#2a2a3a'); R(11, 25, 3, 7, '#2a2a3a');
  const shoe = shoes ? shoes.c : '#5a3a20';
  R(5, 31, 4, 2, shoe); R(11, 31, 4, 2, shoe);
  if (shoes && shoes.l) { R(5, 31, 4, 1, shoes.l); R(11, 31, 4, 1, shoes.l); }
  // torso + arms
  R(5, 13, 10, 12, sc); R(5, 13, 10, 1, sd);
  R(3, 14, 2, 9, sc); R(15, 14, 2, 9, sc);
  R(3, 23, 2, 2, '#f1c7a0'); R(15, 23, 2, 2, '#f1c7a0');
  if (suit && suit.s === 'flowers') for (const [a, b] of [[6, 15], [12, 17], [7, 20], [13, 22], [3, 17], [15, 19]]) { R(a, b, 1, 1, '#ffd34d'); R(a + 1, b, 1, 1, '#ff6a8a'); }
  if (suit && suit.s === 'sparkle') for (const [a, b] of [[6, 15], [13, 18], [7, 22], [4, 19], [15, 16]]) R(a, b, 1, 1, '#fff3a0');
  R(8, 13, 4, 7, '#f4f4f4'); // shirt
  if (suit) { R(7, 13, 1, 8, sd); R(12, 13, 1, 8, sd); } // lapels
  if (tie) {
    if (tie.s === 'bow') { R(7, 13, 2, 2, tie.c); R(11, 13, 2, 2, tie.c); R(9, 13, 2, 2, tie.c); }
    else { R(9, 13, 2, 2, tie.c); R(9, 15, 2, 5, tie.c); R(9, 20, 2, 1, tie.c); if (tie.s === 'led') R(9, 16, 2, 1, '#ffffff'); }
  }
  if (watch) { R(3, 21, 2, 1, watch.c); if (watch.l) R(4, 21, 1, 1, watch.l); }
  // neck + head
  R(8, 11, 4, 2, '#d9a57a');
  R(6, 3, 8, 9, '#f1c7a0');
  R(5, 6, 1, 3, '#f1c7a0'); R(14, 6, 1, 3, '#f1c7a0');
  R(6, 2, 8, 2, '#1a1210'); R(6, 4, 1, 2, '#1a1210'); R(13, 4, 1, 2, '#1a1210'); // slick hair
  R(7, 6, 2, 1, '#1a1210'); R(11, 6, 2, 1, '#1a1210'); // brows
  if (gl) {
    R(6, 7, 8, 1, gl.c); R(7, 7, 2, 2, gl.c); R(11, 7, 2, 2, gl.c);
    R(7, 7, 2, 1, gl.l); R(11, 7, 2, 1, gl.l2 || gl.l);
  } else { R(7, 8, 1, 1, '#1d1826'); R(12, 8, 1, 1, '#1d1826'); }
  R(8, 10, 4, 1, '#7a2a1a'); R(12, 9, 1, 1, '#7a2a1a'); // smirk
  // hats
  if (hat) {
    if (hat.s === 'fedora') { R(5, 2, 10, 1, hat.c); R(7, 0, 6, 2, hat.c); R(7, 1, 6, 1, '#d02030'); }
    if (hat.s === 'cap') { R(6, 1, 8, 2, hat.c); R(12, 2, 4, 1, hat.c); R(9, 1, 1, 1, '#ffffff'); }
    if (hat.s === 'crown') { R(6, 1, 8, 2, hat.c); R(6, 0, 1, 1, hat.c); R(9, 0, 2, 1, hat.c); R(13, 0, 1, 1, hat.c); R(9, 1, 2, 1, '#d02030'); }
    if (hat.s === 'beanie') { R(6, 0, 8, 3, hat.c); R(6, 2, 8, 1, '#ffd34d'); R(9, -1, 2, 1, '#ffffff'); }
  }
}

/** Icon of an item (16x16 grid) for the inventory. */
export function drawItemIcon(ctx, it, u = 1) {
  const R = (gx, gy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(gx * u, gy * u, w * u, h * u); };
  const L = LOOKS[it.slot][it.look];
  switch (it.slot) {
    case 'hat':
      if (L.s === 'crown') { R(3, 7, 10, 5, L.c); R(3, 5, 2, 2, L.c); R(7, 4, 2, 3, L.c); R(11, 5, 2, 2, L.c); R(7, 8, 2, 2, '#d02030'); }
      else if (L.s === 'cap') { R(4, 5, 8, 6, L.c); R(10, 9, 5, 2, L.c); R(7, 6, 2, 2, '#ffffff'); }
      else if (L.s === 'beanie') { R(4, 5, 8, 7, L.c); R(4, 10, 8, 2, '#ffd34d'); R(7, 3, 2, 2, '#ffffff'); }
      else { R(2, 10, 12, 2, L.c); R(4, 5, 8, 5, L.c); R(4, 8, 8, 1, '#d02030'); }
      break;
    case 'glasses':
      R(2, 6, 12, 1, L.c); R(2, 6, 5, 4, L.c); R(9, 6, 5, 4, L.c); R(3, 7, 3, 2, L.l); R(10, 7, 3, 2, L.l2 || L.l); break;
    case 'suit':
      R(3, 3, 10, 11, L.c); R(1, 4, 2, 8, L.c); R(13, 4, 2, 8, L.c); R(6, 3, 4, 6, '#f4f4f4'); R(7, 4, 2, 6, '#d02030');
      if (L.s === 'flowers') { R(4, 10, 1, 1, '#ffd34d'); R(11, 6, 1, 1, '#ff6a8a'); R(10, 11, 1, 1, '#ffd34d'); }
      if (L.s === 'sparkle') { R(4, 6, 1, 1, '#fff3a0'); R(11, 10, 1, 1, '#fff3a0'); }
      break;
    case 'tie':
      if (L.s === 'bow') { R(3, 6, 4, 4, L.c); R(9, 6, 4, 4, L.c); R(7, 7, 2, 2, L.c); }
      else { R(6, 2, 4, 2, L.c); R(6, 4, 4, 8, L.c); R(7, 12, 2, 2, L.c); if (L.s === 'led') R(6, 7, 4, 1, '#ffffff'); }
      break;
    case 'watch':
      R(6, 1, 4, 14, '#4a4560'); R(4, 4, 8, 8, L.c); R(5, 5, 6, 6, L.l || '#f4f4f4'); R(7, 6, 1, 3, '#1d1826'); R(8, 8, 2, 1, '#1d1826'); break;
    case 'shoes':
      R(2, 8, 6, 4, L.c); R(2, 6, 3, 2, L.c); R(9, 8, 6, 4, L.c); R(9, 6, 3, 2, L.c); R(2, 12, 13, 1, '#1d1826'); if (L.l) { R(2, 10, 6, 1, L.l); R(9, 10, 6, 1, L.l); }
      break;
  }
}

const cache = new Map();
/** Data URL of an item icon (cached by slot + look). */
export function itemIconUrl(it) {
  const key = `${it.slot}:${it.look}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 16;
  drawItemIcon(c.getContext('2d'), it);
  const url = c.toDataURL(); cache.set(key, url); return url;
}

/** Data URL of the boss avatar: `full` = whole body, otherwise head and shoulders. */
export function bossUrl(g, full = false) {
  const c = document.createElement('canvas');
  c.width = 20; c.height = full ? 34 : 20;
  const ctx = c.getContext('2d');
  if (!full) { ctx.fillStyle = '#3a2a6a'; ctx.fillRect(0, 0, 20, 20); }
  drawBossFigure(ctx, 0, full ? 1 : 2, 1, g);
  return c.toDataURL();
}

/** Signature of what is worn (to redraw the avatar only when it changes). */
export const wornSig = (g) => (g.inv ? SLOTS.map((s) => { const it = worn(g, s); return it ? it.look : '-'; }).join('') : '');
