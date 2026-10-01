// Game state + persistence. Only durable fields are saved; transient ones
// (animation timers, current slack) are rebuilt on load.
import { STAFF_POOL, ROLES, GRADES, OFFICE_LEVELS, DECOR_ITEMS, STARTING_DECOR, ROOMS } from './config.js';
import { traitStats } from './cv.js';

const SAVE_KEY = 'whipboss.save.v1';

// Staff of saves made before CV hiring existed (indexed by their old id).
const LEGACY_POOL = [
  ['Tuấn', 'dev', '#f1c7a0', '#2b1d14', '#3d6fd6', 'short'], ['Linh', 'acc', '#f5d0b0', '#1a1210', '#e0607e', 'long'],
  ['Hùng', 'des', '#d9a57a', '#6b3a1e', '#46b37a', 'spiky'], ['Mai', 'dev', '#f1c7a0', '#c9643a', '#9a64d6', 'bun'],
  ['Nam', 'acc', '#c98e62', '#141014', '#e3a33b', 'short'], ['Trang', 'des', '#f5d0b0', '#40281a', '#34a4c4', 'long'],
  ['Đức', 'dev', '#e0ac80', '#8a8a96', '#d65a3d', 'bald'], ['Hoa', 'acc', '#f1c7a0', '#e8c35a', '#5a6ee0', 'bun'],
];

/**
 * Build an employee from durable data: a founding-team entry, an accepted CV, or a saved record.
 * Fields: name, short, role, grade, salary, traits, look, cv, joinDay, nickname.
 */
export function makeEmployee(id, d, joinDay = 1) {
  const traits = d.traits || [];
  return {
    id, name: d.name, short: d.short || d.name.split(' ').pop(), nickname: d.nickname || '',
    role: ROLES[d.role] ? d.role : 'dev', grade: GRADES[d.grade] ? d.grade : 'junior',
    salary: d.salary || ROLES[d.role]?.salary || 2500,
    traits, mods: traitStats(traits),
    look: d.look || { skin: d.skin, hair: d.hair, shirt: d.shirt, style: d.style },
    cv: d.cv || null,
    joinDay: d.joinDay ?? joinDay,
    // runtime
    state: 'work', slack: null, t: 0, dur: 0,
    energy: d.energy ?? 70 + Math.random() * 30, stress: d.stress || 0, boost: 0,
    whips: d.whips || 0, wrong: d.wrong || 0, flash: 0, zap: 0, bonk: 0,
  };
}

/** An accepted CV → the durable data makeEmployee() takes. */
export function cvToStaff(cv) {
  const { name, short, role, grade, salary, traits, look, age, years, school, company, skills, hobby, quote } = cv;
  return { name, short, role, grade, salary, traits, look, cv: { age, years, school, company, skills, hobby, quote } };
}

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function newGame() {
  return {
    money: 0, day: 1, dayTime: 0,
    calendarStart: isoDate(new Date()), lastPayDay: 1, lastPayroll: null,
    lifetimeEarnings: 0, officeLevel: 0, rooms: 1,
    decor: STARTING_DECOR.map((d, i) => ({ uid: i + 1, ...d })), decorUid: STARTING_DECOR.length + 1,
    layout: { desks: {}, coffee: null },
    tool: 'whip', whipLevel: 0, batonLevel: -1, taserLevel: -1,
    coffeeLevel: -1, assistantLevel: -1, coffeeCd: 0, assistantCd: 0,
    kpi: 1, combo: 0, comboT: 0,
    staff: STAFF_POOL.map((p, i) => makeEmployee(i, p)),
    nextId: STAFF_POOL.length,
    cvs: [], cvUid: 1, jobReq: { name: '', role: '', grade: '' },
    today: freshDay(),
    records: { bestCombo: 0, totalWhips: 0, bestDays: [] },
    muted: false, mode: 'office',
  };
}

export function freshDay() {
  return { revenue: 0, catches: 0, wrong: 0, bestCombo: 0, kpiSum: 0, kpiN: 0 };
}

const DURABLE = ['id', 'name', 'short', 'nickname', 'role', 'grade', 'salary', 'traits', 'look', 'cv', 'joinDay', 'energy', 'stress', 'whips', 'wrong'];

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newGame();
    const s = JSON.parse(raw);
    const g = Object.assign(newGame(), s, { combo: 0, comboT: 0 });

    g.staff = (s.staff || []).map((e) => {
      if (e.look) return makeEmployee(e.id, e);
      // Older save: rebuild from the legacy pool by id.
      const [short, role, skin, hair, shirt, style] = LEGACY_POOL[e.id] || LEGACY_POOL[0];
      return makeEmployee(e.id, { ...e, name: short, short, role, look: { skin, hair, shirt, style } });
    });
    g.nextId = Math.max(g.nextId || 0, ...g.staff.map((e) => e.id + 1));

    // Furniture: older saves stored a list of ids and had two plants baked into the room art.
    if (!Array.isArray(s.decor) || s.decor.some((d) => typeof d === 'string')) {
      const owned = (Array.isArray(s.decor) ? s.decor : []).filter((id) => DECOR_ITEMS.some((x) => x.id === id));
      g.decor = [...STARTING_DECOR, ...owned.map((kind) => {
        const def = DECOR_ITEMS.find((x) => x.id === kind);
        return { kind, gx: def.pos[0], gy: def.pos[1] };
      })].map((d, i) => ({ uid: i + 1, ...d }));
      g.decorUid = g.decor.length + 1;
    }
    g.layout = { desks: {}, coffee: null, ...(s.layout || {}) };

    g.officeLevel = Math.max(0, Math.min(OFFICE_LEVELS.length - 1, Number(g.officeLevel) || 0));
    g.rooms = Math.max(1, Math.min(ROOMS.length, Number(g.rooms) || 1));
    if (g.rooms > 1) g.officeLevel = OFFICE_LEVELS.length - 1;
    while (g.staff.length > OFFICE_LEVELS[g.officeLevel].capacity && g.officeLevel < OFFICE_LEVELS.length - 1) g.officeLevel++;
    g.lifetimeEarnings = Math.max(0, Number(s.lifetimeEarnings ?? s.money) || 0);
    if (!s.calendarStart) {
      const d = new Date(); d.setDate(d.getDate() - (g.day - 1));
      g.calendarStart = isoDate(d);
    }
    if (!s.lastPayDay) g.lastPayDay = g.day;
    if (!['whip', 'baton', 'taser'].includes(g.tool)) g.tool = 'whip';
    if (!Array.isArray(g.cvs)) g.cvs = [];
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
      staff: g.staff.map((e) => Object.fromEntries(DURABLE.map((k) => [k, e[k]]))),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[save] could not write', err);
  }
}

export function wipe() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}
