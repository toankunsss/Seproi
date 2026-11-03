// Simulation: employee behaviour, economy, day cycle, coffee & assistant.
// Pure-ish: mutates the game object and reports what happened through `emit`.
import { ROLES, SLACKS, SLACK_KINDS, WHIPS, COFFEE, ASSISTANT, WORK_RATE, MOTIVATION, TUNING as T, dayLen } from './config.js';
import { skillMult, lazyMult, stressMult } from './cv.js';
import { addWork } from './projects.js';
import { motivFactor, motivBaseline } from './staff.js';
import { updateVisit, assistantHides } from './events.js';
import { shareBonus } from './prestige.js';
import { updateBoss } from './boss.js';
import { bonus } from './inventory.js';

const rand = (a, b) => a + Math.random() * (b - a);

export const hasPerk = (g, id) => g.perks.includes(id);

export function incomeOf(g, e) {
  if (e.state !== 'work' && e.state !== 'hurt') return 0;
  const boost = e.boost > 0 ? T.boostMult : 1;
  const perks = (hasPerk(g, 'aiClock') ? 1.15 : 1) * (g.hotBonus > 0 ? 2 : 1) * shareBonus(g) * (1 + bonus(g, 'income') / 100);
  return ROLES[e.role].income * skillMult(e.cv) * boost * perks * (1 + T.dayMult * (g.day - 1));
}

/** Assistant whip interval (the "Thư ký riêng" perk makes it 2s). */
export const assistantInterval = (g) => (hasPerk(g, 'secretary') ? 2 : ASSISTANT[g.assistantLevel].interval);

export const isSlacking = (e) => e.state === 'slack';

/** End-of-day ad bonus: a share of today's revenue, not counting project money. */
export const dayAdBonus = (g) => Math.floor(Math.max(0, g.today.revenue - (g.today.project || 0)) * T.adDayBonus);

export function update(g, dt, emit) {
  // Day clock
  g.dayTime += dt;
  const len = dayLen(g);
  if (g.dayTime >= len) { g.dayTime = len; emit('dayEnd'); return; }
  const mods = g.mods || {};

  const coffee = g.coffeeLevel >= 0 ? COFFEE[g.coffeeLevel] : null;
  const decay = T.stressDecay * (hasPerk(g, 'massage') ? 2 : 1);
  if (g.hotBonus > 0) g.hotBonus = Math.max(0, g.hotBonus - dt);
  let working = 0, income = 0, finished = false;

  for (const e of g.staff) {
    e.t += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.boost = Math.max(0, e.boost - dt);
    e.stress = Math.max(0, e.stress - decay * dt);
    // motivation slowly settles back to its baseline (rewards wear off, salary raises stick)
    const base = motivBaseline(e), m = e.motiv ?? MOTIVATION.start, step = MOTIVATION.drift * dt;
    e.motiv = m > base ? Math.max(base, m - step) : Math.min(base, m + step);
    if (coffee) e.energy = Math.min(100, e.energy + coffee.regen * dt);

    switch (e.state) {
      case 'work': {
        e.energy = Math.max(0, e.energy - T.energyDrain * (mods.drain || 1) * dt * (e.boost > 0 ? 0.5 : 1));
        if (e.boost <= 0) {
          const tired = 1 - e.energy / 100;
          const p = (T.slackBase + T.slackTired * tired * tired) * lazyMult(e.cv) * motivFactor(e) * (mods.slack || 1) * (g.boss ? 1.6 : 1) * dt;
          if (Math.random() < p) {
            e.state = 'slack'; e.t = 0; e.dur = rand(T.slackMin, T.slackMax);
            // the hobby on their CV gives their favourite way to slack away
            e.slack = mods.slackKind && Math.random() < 0.65 ? mods.slackKind
              : e.cv.fav && Math.random() < 0.7 ? e.cv.fav : SLACK_KINDS[Math.floor(Math.random() * SLACK_KINDS.length)];
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
        if (e.t >= T.strikeTime) { toWork(e); e.stress = 40; e.motiv = Math.min(e.motiv, MOTIVATION.afterStrike); emit('strikeEnd', e); }
        break;
    }
    if (e.state !== 'strike' && e.stress >= 100) {
      e.state = 'strike'; e.t = 0; e.slack = null;
      g.records.strikes++;
      emit('strike', e);
    }

    const inc = incomeOf(g, e);
    if (inc > 0) {
      working++;
      // project work: same people who earn money also push the active contract forward
      if (addWork(g, e.role, WORK_RATE * skillMult(e.cv) * (e.boost > 0 ? T.boostMult : 1) * dt)) finished = true;
    }
    income += inc;
  }
  if (finished) emit('projectDone');
  updateVisit(g, dt, emit);
  updateBoss(g, dt, emit);

  const earned = income * dt;
  g.money += earned;
  g.lifetimeEarnings = (g.lifetimeEarnings || 0) + earned;
  g.today.revenue += earned;
  if (g.money > g.records.peakMoney) g.records.peakMoney = g.money;

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
  if (g.assistantLevel >= 0 && !assistantHides(g)) {
    g.assistantCd -= dt;
    if (g.assistantCd <= 0) {
      const slackers = g.staff.filter(isSlacking);
      if (slackers.length) {
        const target = slackers.reduce((a, b) => (b.t > a.t ? b : a));
        g.assistantCd = assistantInterval(g);
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
    g.records.caught[e.slack] = (g.records.caught[e.slack] || 0) + 1;
    if (auto) g.records.assistCatches++;
    e.state = 'hurt'; e.t = 0; e.slack = null;
    e.energy = Math.min(100, e.energy + 45);
    e.boost = w.boost;
    e.stress += T.stressCatch * stressMult(e.cv);
    e.whips++;
    g.records.catches++;
    e.motiv = Math.max(0, (e.motiv ?? MOTIVATION.start) + MOTIVATION.catch);
    let reward;
    // catch rewards grow with the company like salaries do, so whipping stays worth it
    const day = (1 + T.dayMult * (g.day - 1)) * shareBonus(g) * (1 + bonus(g, 'catch') / 100);
    if (auto) {
      reward = Math.round(w.bonus * 0.5 * day);
    } else {
      g.combo = g.comboT > 0 ? g.combo + 1 : 1;
      g.comboT = T.comboWindow * (1 + bonus(g, 'combo') / 100);
      g.today.bestCombo = Math.max(g.today.bestCombo, g.combo);
      g.records.bestCombo = Math.max(g.records.bestCombo, g.combo);
      reward = Math.round(w.bonus * Math.min(T.comboCap, 1 + (g.combo - 1) * 0.5) * day);
    }
    g.money += reward;
    g.lifetimeEarnings = (g.lifetimeEarnings || 0) + reward;
    g.today.revenue += reward;
    g.today.catches++;
    return { kind: 'catch', reward, excuse };
  }

  // Innocent (working, already hurt, or angry): unfair!
  e.state = 'angry'; e.t = 0;
  e.stress += T.stressWrong * stressMult(e.cv);
  e.motiv = Math.max(0, (e.motiv ?? MOTIVATION.start) + MOTIVATION.wrong);
  e.wrong++;
  e.whips++;
  g.combo = 0; g.comboT = 0;
  g.kpi = Math.max(0, g.kpi - 0.05);
  const penalty = Math.min(g.money, T.wrongPenalty * (1 + g.whipLevel) * ((g.mods && g.mods.wrongMult) || 1) * (1 - bonus(g, 'guard') / 100));
  g.money -= penalty;
  g.today.wrong++;
  return { kind: 'wrong', reward: -Math.round(penalty) };
}

export function useCoffee(g) {
  if (g.coffeeLevel < 0 || g.coffeeCd > 0) return false;
  g.coffeeCd = COFFEE[g.coffeeLevel].cooldown * (1 - bonus(g, 'coffee') / 100);
  g.records.coffees++;
  for (const e of g.staff) {
    e.energy = Math.min(100, e.energy + 55);
    e.stress = Math.max(0, e.stress - 30);
    if (e.state === 'slack' && e.slack === 'sleep') { e.state = 'work'; e.t = 0; e.slack = null; }
  }
  return true;
}
