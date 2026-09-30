// Simulation: employee behaviour, economy, day cycle, coffee & assistant.
// Pure-ish: mutates the game object and reports what happened through `emit`.
import { ROLES, SLACKS, SLACK_KINDS, WHIPS, COFFEE, ASSISTANT, TUNING as T } from './config.js';

const rand = (a, b) => a + Math.random() * (b - a);

export function incomeOf(g, e) {
  if (e.state !== 'work' && e.state !== 'hurt') return 0;
  const boost = e.boost > 0 ? T.boostMult : 1;
  return ROLES[e.role].income * boost * (1 + T.dayMult * (g.day - 1));
}

export const isSlacking = (e) => e.state === 'slack';

export function update(g, dt, emit) {
  // Day clock
  g.dayTime += dt;
  if (g.dayTime >= T.dayLength) { g.dayTime = T.dayLength; emit('dayEnd'); return; }

  const coffee = g.coffeeLevel >= 0 ? COFFEE[g.coffeeLevel] : null;
  let working = 0, income = 0;

  for (const e of g.staff) {
    e.t += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.boost = Math.max(0, e.boost - dt);
    e.stress = Math.max(0, e.stress - T.stressDecay * dt);
    if (coffee) e.energy = Math.min(100, e.energy + coffee.regen * dt);

    switch (e.state) {
      case 'work': {
        e.energy = Math.max(0, e.energy - T.energyDrain * dt * (e.boost > 0 ? 0.5 : 1));
        if (e.boost <= 0) {
          const tired = 1 - e.energy / 100;
          const p = (T.slackBase + T.slackTired * tired * tired) * dt;
          if (Math.random() < p) {
            e.state = 'slack'; e.t = 0; e.dur = rand(T.slackMin, T.slackMax);
            e.slack = SLACK_KINDS[Math.floor(Math.random() * SLACK_KINDS.length)];
            emit('slack', e);
          }
        }
        break;
      }
      case 'slack':
        e.energy = Math.min(100, e.energy + 2 * dt);
        if (e.t >= e.dur) { toWork(e); e.energy = Math.min(100, e.energy + 20); }
        break;
      case 'hurt':
        if (e.t >= T.hurtTime) toWork(e);
        break;
      case 'angry':
        if (e.t >= 1.6) toWork(e);
        break;
      case 'strike':
        if (e.t >= T.strikeTime) { toWork(e); e.stress = 40; emit('strikeEnd', e); }
        break;
    }
    if (e.state !== 'strike' && e.stress >= 100) {
      e.state = 'strike'; e.t = 0; e.slack = null;
      emit('strike', e);
    }

    const inc = incomeOf(g, e);
    if (inc > 0) working++;
    income += inc;
  }

  const earned = income * dt;
  g.money += earned;
  g.lifetimeEarnings = (g.lifetimeEarnings || 0) + earned;
  g.today.revenue += earned;

  // KPI = moving average of the share of staff actually working
  const frac = g.staff.length ? working / g.staff.length : 1;
  const k = 1 - Math.exp(-dt / T.kpiTau);
  g.kpi += (frac - g.kpi) * k;
  g.today.kpiSum += frac * dt; g.today.kpiN += dt;

  // Combo decays
  if (g.combo > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }

  // Coffee cooldown
  if (g.coffeeCd > 0) g.coffeeCd = Math.max(0, g.coffeeCd - dt);

  // Assistant auto-whips a slacker on an interval
  if (g.assistantLevel >= 0) {
    g.assistantCd -= dt;
    if (g.assistantCd <= 0) {
      const slackers = g.staff.filter(isSlacking);
      if (slackers.length) {
        const target = slackers.reduce((a, b) => (b.t > a.t ? b : a));
        g.assistantCd = ASSISTANT[g.assistantLevel].interval;
        emit('assistant', target);
      } else {
        g.assistantCd = 0.5; // check again soon
      }
    }
  }
}

function toWork(e) { e.state = 'work'; e.t = 0; e.slack = null; }

/**
 * Apply a whip hit. Returns { kind: 'catch' | 'wrong' | 'strike', reward } so the
 * caller can drive effects. `auto` = hit by the assistant (half reward, no combo).
 */
export function whipEmployee(g, e, { auto = false } = {}) {
  const w = WHIPS[g.whipLevel];
  g.records.totalWhips++;
  e.flash = 0.25;

  if (e.state === 'strike') return { kind: 'strike', reward: 0 };

  if (e.state === 'slack') {
    const excuse = SLACKS[e.slack].excuse;
    e.state = 'hurt'; e.t = 0; e.slack = null;
    e.energy = Math.min(100, e.energy + 45);
    e.boost = w.boost;
    e.stress += T.stressCatch;
    e.whips++;
    let reward;
    if (auto) {
      reward = Math.round(w.bonus * 0.5);
    } else {
      g.combo = g.comboT > 0 ? g.combo + 1 : 1;
      g.comboT = T.comboWindow;
      g.today.bestCombo = Math.max(g.today.bestCombo, g.combo);
      g.records.bestCombo = Math.max(g.records.bestCombo, g.combo);
      reward = Math.round(w.bonus * (1 + (g.combo - 1) * 0.5));
    }
    g.money += reward;
    g.lifetimeEarnings = (g.lifetimeEarnings || 0) + reward;
    g.today.revenue += reward;
    g.today.catches++;
    return { kind: 'catch', reward, excuse };
  }

  // Innocent (working, already hurt, or angry): unfair!
  e.state = 'angry'; e.t = 0;
  e.stress += T.stressWrong;
  e.wrong++;
  e.whips++;
  g.combo = 0; g.comboT = 0;
  g.kpi = Math.max(0, g.kpi - 0.05);
  const penalty = Math.min(g.money, T.wrongPenalty * (1 + g.whipLevel));
  g.money -= penalty;
  g.today.wrong++;
  return { kind: 'wrong', reward: -Math.round(penalty) };
}

export function useCoffee(g) {
  if (g.coffeeLevel < 0 || g.coffeeCd > 0) return false;
  g.coffeeCd = COFFEE[g.coffeeLevel].cooldown;
  for (const e of g.staff) {
    e.energy = Math.min(100, e.energy + 55);
    e.stress = Math.max(0, e.stress - 30);
    if (e.state === 'slack' && e.slack === 'sleep') { e.state = 'work'; e.t = 0; e.slack = null; }
  }
  return true;
}
