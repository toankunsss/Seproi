// Projects ("nghiệp vụ"): client contracts. Every room of the building (rooms.js) has its own
// offers and can run one contract at a time, so a bigger company runs several at once.
//
// A project needs work points per role (dev / acc / des). Every working employee adds
// WORK_RATE x skill (x1.6 while boosted) points per second to their role (sim.js → addWork).
// Finish before the end of the deadline day → money (projects never pay 💎). Miss it → the project fails,
// unless the player extends it once (rewarded ad, see main.js).
// A finished project waits in g.projects.reward until the player collects it on the reward
// card (x2 money with a rewarded ad), so the payout is never silent.
//
// Offers are generated from the current team so they are always doable with a decent KPI:
// requirement = team output for that role over the project's days x a difficulty factor.
import { PROJECT_TYPES, CLIENTS, PROJECT_OFFERS, PROJECT_PENALTY, WORK_RATE, TUNING } from './config.js';
import { skillMult } from './cv.js';
import { projectMult } from './skills.js';
import { roomStaff } from './rooms.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** Expected work per day for each role with room r's staff (at 100% KPI). */
function teamOutput(g, r) {
  const out = { dev: 0, acc: 0, des: 0 };
  for (const e of roomStaff(g, r)) out[e.role] += WORK_RATE * skillMult(e.cv) * TUNING.dayLength;
  return out;
}

/** A contract sized for room r's team (null when the room is empty). */
export function makeOffer(g, r = 0) {
  const out = teamOutput(g, r);
  const types = PROJECT_TYPES.filter((t) => Object.keys(t.roles).every((k) => out[k] > 0));
  const pool = types.length ? types : PROJECT_TYPES.filter((t) => Object.keys(t.roles).some((k) => out[k] > 0));
  if (!pool.length) return null;
  const type = pick(pool);
  const days = 1 + Math.floor(Math.random() * 3);              // 1..3 days
  const difficulty = 0.4 + Math.random() * 0.3;                 // share of max team output needed
  const req = {};
  for (const [role, weight] of Object.entries(type.roles)) {
    if (out[role] > 0) req[role] = Math.max(40, Math.round(out[role] * days * difficulty * weight / 10) * 10);
  }
  const total = Object.values(req).reduce((a, b) => a + b, 0);
  const dayMult = 1 + TUNING.dayMult * (g.day - 1);
  const offer = {
    name: type.name, client: pick(CLIENTS), days, req,
    prog: Object.fromEntries(Object.keys(req).map((k) => [k, 0])),
    money: Math.round(total * 3.5 * dayMult / 10) * 10, // a solid bonus on top of normal income
    penalty: 0, // contract fine if the project fails (set just below)
    deadline: 0, extended: false,
  };
  offer.penalty = penaltyOf(offer);
  return offer;
}

/** New offers each morning for every room with staff (and whenever an empty room gets people). */
export function refreshOffers(g, force = false) {
  g.rooms.forEach((room, r) => {
    // staff moved, fired or poached: drop offers this room can no longer work on
    const out = teamOutput(g, r);
    const before = room.offers.length;
    room.offers = room.offers.filter((p) => Object.keys(p.req).every((k) => out[k] > 0));
    const pruned = room.offers.length < before;
    if (!force && room.offersDay === g.day && (room.offers.length || !pruned)) return;
    if (!roomStaff(g, r).length) { room.offers = []; room.offersDay = 0; return; }
    room.offers = Array.from({ length: PROJECT_OFFERS }, () => makeOffer(g, r)).filter(Boolean);
    room.offersDay = g.day;
  });
}

export const activeOf = (g, r) => (g.rooms[r] && g.rooms[r].project) || null;
/** Rooms with a contract in progress: [{ r, p }]. */
export const activeList = (g) => g.rooms.map((room, r) => ({ r, p: room.project })).filter((x) => x.p);
/** Offers waiting in rooms that are free to take one. */
export const openOffers = (g) => g.rooms.reduce((n, room) => n + (room.project ? 0 : room.offers.length), 0);

export function acceptOffer(g, r, i) {
  const room = g.rooms[r], p = room && room.offers[i];
  if (!p || room.project) return false;
  // Deadline = end of day (today + days - 1); taking it late in the day is the player's call.
  p.deadline = g.day + p.days - 1;
  room.project = p;
  room.offers.splice(i, 1);
  return true;
}

/** Contract fine for project p (older saves have no `penalty` field: derive it). */
export const penaltyOf = (p) => (p.penalty || Math.round((p.money * PROJECT_PENALTY) / 10) * 10);

/** Charge the fine (never below 0 funds). Returns what was actually paid. */
function charge(g, p) {
  const fine = Math.min(Math.floor(g.money), penaltyOf(p));
  g.money -= fine;
  g.records.projFines = (g.records.projFines || 0) + fine;
  return fine;
}

function drop(g, r) {
  const p = activeOf(g, r);
  if (!p) return null;
  g.rooms[r].project = null;
  g.projects.failed++;
  g.records.projStreak = 0;
  return { p, r, fine: charge(g, p) };
}
/** Cancel room r's project: counts as a failure and pays the fine. Returns { p, r, fine }. */
export const abandon = (g, r) => drop(g, r);

export const progressOf = (p) => {
  const roles = Object.keys(p.req);
  return roles.reduce((s, k) => s + Math.min(1, p.prog[k] / p.req[k]), 0) / roles.length;
};
export const isDone = (p) => Object.keys(p.req).every((k) => p.prog[k] >= p.req[k]);

/** Called by the simulation for each working employee of room r. Returns true when this completes it. */
export function addWork(g, r, role, amount) {
  const p = activeOf(g, r);
  if (!p || !(role in p.req) || p.prog[role] >= p.req[role]) return false;
  p.prog[role] = Math.min(p.req[role], p.prog[role] + amount);
  return isDone(p);
}

/** Room r's work is finished: count it and queue the reward until it is collected. */
export function finish(g, r) {
  const p = activeOf(g, r);
  if (!p || !isDone(p)) return null;
  g.projects.done++;
  g.records.projStreak++;
  g.records.bestProjStreak = Math.max(g.records.bestProjStreak, g.records.projStreak);
  if (p.days >= 3) g.records.bigProjects++;
  p.finishedDay = g.day;
  p.room = r;
  g.rooms[r].project = null;
  if (g.projects.reward) g.projects.queue.push(p); else g.projects.reward = p;
  return p;
}

/** Pay out the waiting reward; mult 2 = the rewarded-ad bonus. Returns { p, money }; the next one moves up. */
export function collect(g, mult = 1) {
  const p = g.projects.reward;
  if (!p) return null;
  const money = Math.round(p.money * mult * projectMult(g));
  g.money += money;
  g.lifetimeEarnings += money;
  g.today.revenue += money;
  g.today.project = (g.today.project || 0) + money;
  g.projects.reward = g.projects.queue.shift() || null;
  return { p, money };
}

/** End of day: rooms whose project is now overdue. */
export const overdueRooms = (g) => activeList(g).filter(({ p }) => g.day >= p.deadline).map(({ r }) => r);

export function extend(g, r) {
  const p = activeOf(g, r);
  if (!p || p.extended) return false;
  p.deadline += 1;
  p.extended = true;
  return true;
}

/** Deadline passed: room r's project fails and the contract fine is charged. Returns { p, r, fine }. */
export const fail = (g, r) => drop(g, r);
