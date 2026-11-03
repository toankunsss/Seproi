// Recruitment by CV: candidates are generated, the player reads their CV and hires or rejects.
// A CV is also what an employee keeps for life — its traits drive the simulation (sim.js):
//   skill 1..5 → income and project work      (x0.8 … x1.4)
//   lazy  1..5 → how often they slack          (x0.6 … x1.4)
//   grit  1..5 → stress taken from each whip   (x1.4 … x0.6)
//   fav        → the slacking habit their hobby gives away (70% of their slacks)
import {
  STAFF_POOL, ROLES, SLACK_KINDS, CV_NAMES, CV_LOOKS, CV_HOBBIES, CV_LINES, CV_QUOTES, hireCost,
} from './config.js';
import { rect, px } from './pixel.js';
import { shade } from './sprites.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const stars = () => 1 + Math.floor(Math.random() * 5);

export const skillMult = (cv) => 0.65 + 0.15 * (cv.skill || 3);   // 0.8 … 1.4
export const lazyMult = (cv) => 0.4 + 0.2 * (cv.lazy || 3);       // 0.6 … 1.4
export const stressMult = (cv) => 1.6 - 0.2 * (cv.grit || 3);     // 1.4 … 0.6

/** CV for the original staff (and old saves): average traits, look from STAFF_POOL. */
export function cvFromPool(i) {
  const p = STAFF_POOL[i % STAFF_POOL.length];
  return {
    name: p.name, role: p.role, age: 24 + (i * 3) % 9, exp: 1 + (i * 2) % 5,
    skill: 3, lazy: 3, grit: 3, fav: SLACK_KINDS[i % SLACK_KINDS.length], star: false,
    hobby: CV_HOBBIES[SLACK_KINDS[i % SLACK_KINDS.length]][0], line: CV_LINES[p.role][0], quote: CV_QUOTES[0],
    look: { skin: p.skin, hair: p.hair, shirt: p.shirt, style: p.style },
  };
}

/**
 * A fresh applicant. Roles the company lacks are more likely. `star` forces a top candidate:
 * 5★ skill, low laziness, high grit — rarer and pricier.
 */
export function makeCandidate(g, { star = Math.random() < 0.08 } = {}) {
  const counts = { dev: 0, acc: 0, des: 0 };
  for (const e of g.staff) counts[e.role]++;
  const roles = Object.keys(ROLES);
  const weights = roles.map((r) => 1 / (1 + counts[r]));
  let x = Math.random() * weights.reduce((a, b) => a + b, 0), role = roles[0];
  for (let i = 0; i < roles.length; i++) { x -= weights[i]; if (x <= 0) { role = roles[i]; break; } }
  const fav = pick(SLACK_KINDS);
  const cv = {
    name: pick(CV_NAMES), role, age: 21 + Math.floor(Math.random() * 20), exp: Math.floor(Math.random() * 9),
    skill: stars(), lazy: stars(), grit: stars(), fav, star,
    hobby: pick(CV_HOBBIES[fav]), line: pick(CV_LINES[role]), quote: pick(CV_QUOTES),
    look: { skin: pick(CV_LOOKS.skin), hair: pick(CV_LOOKS.hair), shirt: pick(CV_LOOKS.shirt), style: pick(CV_LOOKS.style) },
  };
  if (cv.look.style === 'bald') cv.look.hair = '#8a8a96';
  if (star) { cv.skill = 5; cv.lazy = 1 + Math.floor(Math.random() * 2); cv.grit = 4 + Math.floor(Math.random() * 2); cv.exp = Math.max(cv.exp, 5); }
  return cv;
}

/** Hiring fee: grows with team size, scaled by how good the CV is. */
export function hirePrice(g, cv) {
  const quality = 0.55 + 0.12 * cv.skill + 0.05 * (5 - cv.lazy) + 0.03 * cv.grit + (cv.star ? 0.35 : 0);
  return Math.round(hireCost(g.staff.length) * quality / 5) * 5;
}

export function refillCandidates(g, { star = false } = {}) {
  g.candidates = Array.from({ length: 3 }, (_, i) => makeCandidate(g, star && i === 0 ? { star: true } : undefined));
}

// --- Front-facing pixel portrait for the CV card ------------------------------------------

/** Draw a 16x16 face for `look` into ctx at (0,0). */
export function drawFace(ctx, look, star = false) {
  const { skin, hair, shirt, style } = look;
  ctx.clearRect(0, 0, 16, 16);
  rect(ctx, 0, 0, 16, 16, star ? '#3a2f12' : '#2a2340');
  // shoulders
  rect(ctx, 2, 13, 12, 3, shirt);
  rect(ctx, 6, 13, 4, 1, shade(shirt, 0.25));
  rect(ctx, 7, 12, 2, 2, shade(skin, -0.12));
  // hair behind the head
  if (style === 'long') rect(ctx, 3, 3, 10, 10, hair);
  if (style === 'bun') rect(ctx, 6, 0, 4, 2, hair);
  // face
  rect(ctx, 4, 3, 8, 9, skin);
  rect(ctx, 3, 6, 1, 3, skin); rect(ctx, 12, 6, 1, 3, skin);
  // hair on top
  if (style === 'bald') { rect(ctx, 4, 3, 8, 1, shade(skin, 0.2)); rect(ctx, 3, 5, 1, 2, hair); rect(ctx, 12, 5, 1, 2, hair); }
  else {
    rect(ctx, 4, 2, 8, 3, hair);
    rect(ctx, 3, 3, 1, 3, hair); rect(ctx, 12, 3, 1, 3, hair);
    if (style === 'spiky') for (let i = 4; i < 12; i += 2) px(ctx, i, 1, hair);
    if (style === 'short') rect(ctx, 4, 5, 2, 1, hair);
    if (style === 'long') { rect(ctx, 3, 3, 1, 9, hair); rect(ctx, 12, 3, 1, 9, hair); }
    if (style === 'bun') rect(ctx, 6, 2, 4, 1, hair);
  }
  // eyes, cheeks, mouth
  px(ctx, 6, 7, '#1d1826'); px(ctx, 9, 7, '#1d1826');
  px(ctx, 5, 9, shade(skin, -0.12)); px(ctx, 10, 9, shade(skin, -0.12));
  rect(ctx, 7, 10, 2, 1, '#a0503a');
  if (star) { px(ctx, 14, 1, '#ffd34d'); px(ctx, 13, 2, '#ffd34d'); px(ctx, 15, 2, '#ffd34d'); px(ctx, 14, 3, '#ffd34d'); px(ctx, 14, 2, '#fff3a0'); }
}

/** Data URL of the portrait (cached per look). */
const faceCache = new Map();
export function faceUrl(look, star = false) {
  const key = JSON.stringify(look) + star;
  if (faceCache.has(key)) return faceCache.get(key);
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const ctx = c.getContext('2d');
  drawFace(ctx, look, star);
  const url = c.toDataURL();
  faceCache.set(key, url);
  return url;
}
