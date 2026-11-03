// Projects ("nghiệp vụ"): client contracts the company takes on.
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

const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** Expected work per day for each role with the current staff (at 100% KPI). */
function teamOutput(g) {
  const out = { dev: 0, acc: 0, des: 0 };
  for (const e of g.staff) out[e.role] += WORK_RATE * skillMult(e.cv) * TUNING.dayLength;
  return out;
}

export function makeOffer(g) {
  const out = teamOutput(g);
  const types = PROJECT_TYPES.filter((t) => Object.keys(t.roles).every((r) => out[r] > 0));
  const type = pick(types.length ? types : PROJECT_TYPES.filter((t) => Object.keys(t.roles).some((r) => out[r] > 0)));
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
    prog: Object.fromEntries(Object.keys(req).map((r) => [r, 0])),
    money: Math.round(total * 3.5 * dayMult / 10) * 10, // a solid bonus on top of normal income
    penalty: 0, // contract fine if the project fails (set just below)
    deadline: 0, extended: false,
  };
  offer.penalty = penaltyOf(offer);
  return offer;
}

/** New offers each morning (and on first launch). */
export function refreshOffers(g, force = false) {
  if (!force && g.projects.offersDay === g.day && g.projects.offers.length) return;
  g.projects.offers = Array.from({ length: PROJECT_OFFERS }, () => makeOffer(g));
  g.projects.offersDay = g.day;
}

export function acceptOffer(g, i) {
  const p = g.projects.offers[i];
  if (!p || g.projects.active) return false;
  // Deadline = end of day (today + days - 1); taking it late in the day is the player's call.
  p.deadline = g.day + p.days - 1;
  g.projects.active = p;
  g.projects.offers.splice(i, 1);
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

/** Cancel the active project: counts as a failure and pays the fine. Returns { p, fine }. */
export function abandon(g) {
  const p = g.projects.active;
  if (!p) return null;
  g.projects.active = null;
  g.projects.failed++;
  g.records.projStreak = 0;
  return { p, fine: charge(g, p) };
}

export const progressOf = (p) => {
  const roles = Object.keys(p.req);
  return roles.reduce((s, r) => s + Math.min(1, p.prog[r] / p.req[r]), 0) / roles.length;
};
export const isDone = (p) => Object.keys(p.req).every((r) => p.prog[r] >= p.req[r]);

/** Called by the simulation for each working employee. Returns true when this completes it. */
export function addWork(g, role, amount) {
  const p = g.projects.active;
  if (!p || !(role in p.req) || p.prog[role] >= p.req[role]) return false;
  p.prog[role] = Math.min(p.req[role], p.prog[role] + amount);
  return isDone(p);
}

/** Work finished: count it, and park it in g.projects.reward until collected. */
export function finish(g) {
  const p = g.projects.active;
  if (!p) return null;
  g.projects.done++;
  g.records.projStreak++;
  g.records.bestProjStreak = Math.max(g.records.bestProjStreak, g.records.projStreak);
  if (p.days >= 3) g.records.bigProjects++;
  p.finishedDay = g.day;
  g.projects.active = null;
  g.projects.reward = p;
  return p;
}

/** Pay out the waiting reward; mult 2 = the rewarded-ad bonus. Returns { p, money }. */
export function collect(g, mult = 1) {
  const p = g.projects.reward;
  if (!p) return null;
  const money = Math.round(p.money * mult * projectMult(g));
  g.money += money;
  g.lifetimeEarnings += money;
  g.today.revenue += money;
  g.today.project = (g.today.project || 0) + money;
  g.projects.reward = null;
  return { p, money };
}

/** End of day: is the active project now overdue? */
export const overdue = (g) => !!g.projects.active && g.day >= g.projects.active.deadline;

export function extend(g) {
  const p = g.projects.active;
  if (!p || p.extended) return false;
  p.deadline += 1;
  p.extended = true;
  return true;
}

/** Deadline passed: the project fails and the contract fine is charged. Returns { p, fine }. */
export function fail(g) {
  const p = g.projects.active;
  if (!p) return null;
  g.projects.active = null;
  g.projects.failed++;
  g.records.projStreak = 0;
  return { p, fine: charge(g, p) };
}
