// Game state + persistence. Only durable fields are saved; transient ones
// (animation timers, current slack) are rebuilt on load.
import { STARTING_STAFF, GEMS_START, MOTIVATION } from './config.js';
import { cvFromPool } from './cv.js';
import { backup } from './platform.js';
import { ensureRooms, freshRoom } from './rooms.js';

export const SAVE_KEY = 'whipboss.save.v1';

/** Employee number `i` (= desk index) hired from `cv` (see cv.js). */
export function makeEmployee(i, cv = cvFromPool(i), extra = {}) {
  return {
    id: i, name: cv.name, nickname: extra.nickname || '', role: cv.role, look: cv.look, cv,
    state: 'work', slack: null, t: 0, dur: 0,
    energy: 70 + Math.random() * 30, stress: 0, boost: 0,
    whips: 0, wrong: 0, flash: 0,
    motiv: MOTIVATION.start, wage: 0, praisedDay: 0, // staff care (staff.js)
    hiredDay: extra.hiredDay || 0,  // payroll: first month paid pro rata (payroll.js)
    room: extra.room || 0,          // room of the building they sit in (rooms.js)
  };
}

const freshRecords = () => ({
  bestCombo: 0, totalWhips: 0, bestDays: [],
  catches: 0, bestKpi: 0, fairDays: 0, starsHired: 0, strikes: 0, adsWatched: 0,
  // counters for achievements (old saves get these defaults on load)
  caught: { game: 0, toptop: 0, sleep: 0, crypto: 0, snack: 0, call: 0, meeting: 0, toilet: 0 }, // catches by slacking kind
  assistCatches: 0, coffees: 0, boostsUsed: 0, gemsEarned: 0, peakMoney: 0,
  projStreak: 0, bestProjStreak: 0, bigProjects: 0,
});

export function newGame() {
  const g = {
    money: 0, day: 1, dayTime: 0,
    lifetimeEarnings: 0, officeLevel: 0, decor: [],
    whipLevel: 0, coffeeLevel: -1, assistantLevel: -1,
    coffeeCd: 0, assistantCd: 0,
    kpi: 1, combo: 0, comboT: 0,
    staff: Array.from({ length: STARTING_STAFF }, (_, i) => makeEmployee(i)),
    today: freshDay(),
    records: freshRecords(),
    // meta progression
    gems: GEMS_START,
    candidates: [],          // CVs waiting on the desk (cv.js)
    candidatesDay: 0,        // day the pile was last refilled
    // contracts live per room (rooms.js: g.rooms[r].project / offers); finished ones wait here
    projects: { reward: null, queue: [], done: 0, failed: 0 },
    rooms: [freshRoom(0)],   // the building (rooms.js)
    viewRoom: 0,             // room shown in detail, -1 = building overview
    claimed: [],             // achievement ids already rewarded
    perks: [],               // premium perks owned (config PREMIUM_ITEMS)
    partyDay: 0,             // last day of a team party (staff.js)
    visit: null, visitPlan: null, // surprise visits (events.js)
    hotBonus: 0,             // seconds of x2 income left (premium boost)
    ads: { day: 0, gems: 0 },// rewarded-ad counters for daily caps
    muted: false, musicOff: false, mode: 'office',
    tutorial: 0,             // first-time tutorial step (tutorial.js; 99 = done)
    shares: 0, sold: 0, bestRun: 0, // selling the company (prestige.js)
  };
  return g;
}

export function freshDay() {
  return { revenue: 0, project: 0, catches: 0, wrong: 0, bestCombo: 0, kpiSum: 0, kpiN: 0, doubled: false };
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newGame();
    const s = JSON.parse(raw);
    const base = newGame();
    const g = Object.assign(base, s, { combo: 0, comboT: 0 });
    // nested objects: keep defaults for fields older saves don't have
    g.records = { ...freshRecords(), ...(s.records || {}) };
    g.records.caught = { ...freshRecords().caught, ...(g.records.caught || {}) };
    g.projects = { ...newGame().projects, ...(s.projects || {}) };
    if (!Array.isArray(s.rooms)) delete g.rooms; // old save: rebuilt from officeLevel below
    // saves from before the tutorial existed: only brand-new games get it
    if (s.tutorial === undefined) g.tutorial = g.day > 1 || g.records.totalWhips > 0 ? 99 : 0;
    g.ads = { ...newGame().ads, ...(s.ads || {}) };
    g.today = { ...freshDay(), ...(s.today || {}) };
    for (const k of ['candidates', 'claimed', 'perks']) if (!Array.isArray(g[k])) g[k] = [];
    if (!Number.isFinite(g.gems)) g.gems = GEMS_START;
    g.officeLevel = Math.max(0, Math.min(2, Number(g.officeLevel) || 0));
    g.lifetimeEarnings = Math.max(0, Number(s.lifetimeEarnings ?? s.money) || 0);
    g.decor = Array.isArray(g.decor) ? g.decor : [];
    g.staff = s.staff.map((e, i) => ({
      ...makeEmployee(e.id ?? i, e.cv || cvFromPool(e.id ?? i), { nickname: e.nickname }),
      energy: e.energy, stress: e.stress, whips: e.whips, wrong: e.wrong,
      motiv: e.motiv ?? MOTIVATION.start, wage: e.wage || 0, praisedDay: e.praisedDay || 0, hiredDay: e.hiredDay || 0, room: e.room || 0,
    }));
    if (!g.rooms) {
      if (g.staff.length > 6) g.officeLevel = Math.max(g.officeLevel, 2);
      else if (g.staff.length > 4) g.officeLevel = Math.max(g.officeLevel, 1);
    }
    return ensureRooms(g);
  } catch (err) {
    console.warn('[save] could not read', err);
    return newGame();
  }
}

let lastSaved = '';

export function save(g) {
  try {
    const data = {
      ...g,
      staff: g.staff.map((e) => ({
        id: e.id, nickname: e.nickname || '', cv: e.cv,
        energy: e.energy, stress: e.stress, whips: e.whips, wrong: e.wrong,
        motiv: e.motiv, wage: e.wage, praisedDay: e.praisedDay, hiredDay: e.hiredDay || 0, room: e.room || 0,
      })),
    };
    const json = JSON.stringify(data);
    if (json === lastSaved) return;
    lastSaved = json;
    localStorage.setItem(SAVE_KEY, json);
    backup(SAVE_KEY, json);
  } catch (err) {
    console.warn('[save] could not write', err);
  }
}

/** Returns a promise that settles once the native backup copy is gone too. */
export function wipe() {
  lastSaved = '';
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  return backup(SAVE_KEY, null);
}
