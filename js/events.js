// Surprise visits ("easter egg"): a tax inspector, a labour inspector or a VIP client drops
// by for VISITS.duration seconds. Each has a rule; the outcome is paid when they leave.
//   g.visitPlan = { day, at } — today's visit time (dayTime seconds), or null
//   g.visit     = { kind, t, kpiSum, kpiN, whips, fined, watching, phaseLeft } while a visitor is in the office
// The labour inspector alternates between watching and looking at their phone (watching=false):
// whips are only written up while they watch.
import { VISITS, TUNING } from './config.js';
import { addGems } from './achievements.js';

const dayMult = (g) => 1 + TUNING.dayMult * (g.day - 1);

/** Morning: maybe schedule a visit for today. */
export function planVisit(g) {
  g.visit = null;
  g.visitPlan = null;
  if (g.day < 2 || Math.random() >= VISITS.chance) return;
  const len = TUNING.dayLength;
  g.visitPlan = { day: g.day, at: len * (0.12 + Math.random() * 0.55) };
}

/** Called every simulation step. Emits 'visitStart' / 'visitEnd' (with the result). */
export function updateVisit(g, dt, emit) {
  const p = g.visitPlan;
  if (!g.visit && p && p.day === g.day && g.dayTime >= p.at) {
    const kinds = Object.keys(VISITS.kinds);
    g.visit = { kind: p.kind || kinds[Math.floor(Math.random() * kinds.length)], t: 0, kpiSum: 0, kpiN: 0, whips: 0, fined: 0, watching: true, phaseLeft: 0, room: Math.max(0, g.viewRoom || 0) };
    g.visit.phaseLeft = phaseLength(g.visit.kind, true);
    g.visitPlan = null;
    emit('visitStart', g.visit);
  }
  const v = g.visit;
  if (!v) return;
  v.t += dt;
  v.kpiSum += g.kpi * dt; v.kpiN += dt;
  if (v.kind === 'labour' && v.t > 3) { // after walking in, alternate watching / distracted
    v.phaseLeft -= dt;
    if (v.phaseLeft <= 0) {
      v.watching = !v.watching;
      v.phaseLeft = phaseLength(v.kind, v.watching);
      emit(v.watching ? 'visitWatching' : 'visitDistracted', v);
    }
  }
  if (v.t >= VISITS.duration) emit('visitEnd', endVisit(g));
}

const phaseLength = (kind, watching) => {
  const [a, b] = VISITS.kinds[kind][watching ? 'watch' : 'distracted'] || [5, 5];
  return a + Math.random() * (b - a);
};

/** Is someone in the office who would write up a whip right now? */
export const inspectorWatching = (g) => !!g.visit && g.visit.kind === 'labour' && g.visit.watching;

/** The labour inspector writes up a manual whip they see. Returns the fine (0 if nobody saw it). */
export function whipWitnessed(g) {
  const v = g.visit;
  if (!inspectorWatching(g)) return 0;
  const fine = Math.min(g.money, Math.round(VISITS.kinds.labour.finePerWhip * dayMult(g)));
  g.money -= fine;
  v.whips++; v.fined += fine;
  return fine;
}

/** The assistant only dares to whip while the labour inspector looks away. */
export const assistantHides = (g) => inspectorWatching(g);

/** Visitor leaves: apply the outcome. Returns { kind, ok, gems, money, fine, kpi }. */
export function endVisit(g) {
  const v = g.visit;
  if (!v) return null;
  g.visit = null;
  const k = VISITS.kinds[v.kind];
  const kpi = v.kpiN ? v.kpiSum / v.kpiN : g.kpi;
  const out = { kind: v.kind, ok: false, gems: 0, money: 0, fine: 0, kpi };
  if (v.kind === 'tax') {
    out.ok = kpi >= k.kpi;
    if (out.ok) { out.gems = k.gems; addGems(g, k.gems); }
    else { out.fine = Math.floor(g.money * k.fine); g.money -= out.fine; }
  } else if (v.kind === 'labour') {
    out.ok = v.whips === 0;
    out.fine = v.fined;
    if (out.ok) { out.gems = k.gems; addGems(g, k.gems); }
  } else if (v.kind === 'vip') {
    out.ok = kpi >= k.kpi;
    if (out.ok) {
      out.money = Math.round(k.bonus * dayMult(g) / 10) * 10;
      g.money += out.money; g.lifetimeEarnings += out.money; g.today.revenue += out.money;
    }
  }
  g.records.visits = (g.records.visits || 0) + 1;
  if (out.ok) g.records.visitsPassed = (g.records.visitsPassed || 0) + 1;
  return out;
}
