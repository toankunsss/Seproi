// Game state + persistence. Only durable fields are saved; transient ones
// (animation timers, current slack) are rebuilt on load.
import { STAFF_POOL, STARTING_STAFF } from './config.js';

const SAVE_KEY = 'whipboss.save.v1';

export function makeEmployee(i, profile = {}) {
  const p = STAFF_POOL[i];
  return {
    id: i, name: p.name, nickname: profile.nickname || '', role: p.role, look: p,
    profile: {
      age: profile.age || '',
      experience: profile.experience || '',
      motivation: profile.motivation || '',
      interviewedAt: profile.interviewedAt || null,
    },
    state: 'work', slack: null, t: 0, dur: 0,
    energy: 70 + Math.random() * 30, stress: 0, boost: 0,
    whips: 0, wrong: 0, flash: 0,
  };
}

export function newGame() {
  return {
    money: 0, day: 1, dayTime: 0,
    lifetimeEarnings: 0, officeLevel: 0, decor: [],
    whipLevel: 0, coffeeLevel: -1, assistantLevel: -1,
    coffeeCd: 0, assistantCd: 0,
    kpi: 1, combo: 0, comboT: 0,
    staff: Array.from({ length: STARTING_STAFF }, (_, i) => makeEmployee(i)),
    today: freshDay(),
    records: { bestCombo: 0, totalWhips: 0, bestDays: [] },
    muted: false, mode: 'office',
  };
}

export function freshDay() {
  return { revenue: 0, catches: 0, wrong: 0, bestCombo: 0, kpiSum: 0, kpiN: 0 };
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newGame();
    const s = JSON.parse(raw);
    const g = Object.assign(newGame(), s, { combo: 0, comboT: 0 });
    g.officeLevel = Math.max(0, Math.min(2, Number(g.officeLevel) || 0));
    g.lifetimeEarnings = Math.max(0, Number(s.lifetimeEarnings ?? s.money) || 0);
    g.decor = Array.isArray(g.decor) ? g.decor : [];
    g.staff = s.staff.map((e) => ({
      ...makeEmployee(e.id, { nickname: e.nickname, ...(e.profile || {}) }),
      energy: e.energy, stress: e.stress, whips: e.whips, wrong: e.wrong,
    }));
    if (g.staff.length > 6) g.officeLevel = Math.max(g.officeLevel, 2);
    else if (g.staff.length > 4) g.officeLevel = Math.max(g.officeLevel, 1);
    return g;
  } catch (err) {
    console.warn('[save] could not read', err);
    return newGame();
  }
}

export function save(g) {
  try {
    const data = {
      ...g,
      staff: g.staff.map((e) => ({
        id: e.id, nickname: e.nickname || '', profile: e.profile || {},
        energy: e.energy, stress: e.stress, whips: e.whips, wrong: e.wrong,
      })),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[save] could not write', err);
  }
}

export function wipe() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}
