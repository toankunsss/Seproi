// Staff care: rewarding employees (praise, cash bonus, gift, raise, team party) and firing.
// Motivation (e.motiv) is the lever: it scales how often someone slacks (see sim.js).
import { STAFF_ACTIONS as A, MOTIVATION as M, TUNING } from './config.js';
import { severanceOf } from './payroll.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
const dayMult = (g) => 1 + TUNING.dayMult * (g.day - 1);

/** Slack chance multiplier from motivation and salary level. */
export const motivFactor = (e) => (1.4 - 0.8 * ((e.motiv ?? M.start) / 100)) * (1 - A.raise.slackCut * (e.wage || 0));
/** Where motivation settles without rewards. */
export const motivBaseline = (e) => M.start + 10 * (e.wage || 0);

/** Price in đ of an action for employee e (or the whole team for 'party'). */
export function actionCost(g, kind, e) {
  const a = A[kind];
  if (kind === 'raise') return Math.round(a.cost * dayMult(g) * ((e.wage || 0) + 1) / 10) * 10;
  if (kind === 'party') return Math.round(a.cost * dayMult(g) * g.staff.length / 10) * 10;
  return Math.round((a.cost || 0) * dayMult(g) / 5) * 5;
}

/** Why the action can't be done now ('' = allowed). Vietnamese source text, translated by the UI. */
export function blocked(g, kind, e) {
  if (kind === 'praise' && e.praisedDay === g.day) return 'Đã khen hôm nay';
  if (kind === 'raise' && (e.wage || 0) >= A.raise.maxLevel) return 'Lương tối đa';
  if (kind === 'party' && g.partyDay === g.day) return 'Đã liên hoan hôm nay';
  if (kind === 'fire' && g.staff.length <= 1) return 'Cần giữ ít nhất 1 người';
  if (g.money < actionCost(g, kind, e)) return 'money';
  return '';
}

function apply(e, a) {
  if (a.motiv) e.motiv = clamp((e.motiv ?? M.start) + a.motiv);
  if (a.stress) e.stress = Math.max(0, e.stress + a.stress);
  if (a.energy) e.energy = Math.min(100, e.energy + a.energy);
  if (a.boost) e.boost = Math.max(e.boost, a.boost);
}

/** Perform a reward on employee e (or the team for 'party'). Returns true on success. */
export function reward(g, kind, e) {
  if (blocked(g, kind, e)) return false;
  g.money -= actionCost(g, kind, e);
  const a = A[kind];
  if (kind === 'party') { for (const x of g.staff) apply(x, a); g.partyDay = g.day; }
  else apply(e, a);
  if (kind === 'praise') e.praisedDay = g.day;
  if (kind === 'raise') e.wage = (e.wage || 0) + 1;
  if (kind === 'gift' && e.state === 'slack' && e.slack === 'sleep') { e.state = 'work'; e.t = 0; e.slack = null; }
  if (kind === 'bonus' || kind === 'gift') {
    if (e.state === 'slack' || e.state === 'angry') { e.state = 'work'; e.t = 0; e.slack = null; }
  }
  g.records.rewardsGiven = (g.records.rewardsGiven || 0) + 1;
  return true;
}

/**
 * Let employee e go: they are paid for the days already worked this month (no dodging payday by
 * firing the day before). The rest of the team gets nervous. Returns { e, severance }.
 */
export function fire(g, e) {
  if (blocked(g, 'fire', e)) return null;
  const i = g.staff.indexOf(e);
  if (i < 0) return null;
  const severance = Math.min(Math.floor(g.money), severanceOf(g, e));
  g.money -= severance;
  g.records.salariesPaid = (g.records.salariesPaid || 0) + severance;
  g.staff.splice(i, 1);
  for (const x of g.staff) apply(x, A.fire);
  g.records.fired = (g.records.fired || 0) + 1;
  return { e, severance };
}

/** Next free employee id (ids stay unique after someone is fired). */
export const nextStaffId = (g) => g.staff.reduce((m, e) => Math.max(m, e.id), -1) + 1;
