// The building: the company starts in one room and grows into a cross-section of rooms
// (BUILD.perFloor per floor). Each room has its own office level (4 / 6 / 8 desks), its own
// staff (e.room), its own client contract (projects.js) and its own KPI and alert light.
//
//   g.rooms    = [{ level, project, offers, offersDay, kpi }]
//   e.room     = index of the room an employee sits in
//   g.viewRoom = room shown in detail; -1 = the building overview (no whipping there)
//
// g.officeLevel is kept as the best room level, for achievements, decor and old code paths.
import { OFFICE_LEVELS, BUILD, PAYROLL, TUNING } from './config.js';
import { t } from './i18n.js';

export const freshRoom = (level = 0) => ({ level, project: null, offers: [], offersDay: 0, kpi: 1 });

/** Make sure g has a valid building (new games, old saves, campaign states). */
export function ensureRooms(g) {
  const pr = g.projects || (g.projects = {});
  if (!Array.isArray(g.rooms) || !g.rooms.length) {
    // old save: one room at the old office level, holding the old contract and offers
    const r = freshRoom(Math.max(0, Math.min(2, Number(g.officeLevel) || 0)));
    if (pr.active) r.project = pr.active;
    if (Array.isArray(pr.offers)) { r.offers = pr.offers; r.offersDay = pr.offersDay || 0; }
    g.rooms = [r];
  }
  delete pr.active; delete pr.offers; delete pr.offersDay;
  if (!Array.isArray(pr.queue)) pr.queue = [];
  g.rooms = g.rooms.slice(0, BUILD.rooms.length).map((r) => ({ ...freshRoom(), ...r, level: Math.max(0, Math.min(2, Number(r.level) || 0)), offers: Array.isArray(r.offers) ? r.offers : [] }));
  for (const e of g.staff || []) if (!(e.room >= 0 && e.room < g.rooms.length)) e.room = 0;
  // nobody sits on a desk that doesn't exist: overflow moves to rooms with space
  for (let r = 0; r < g.rooms.length; r++) {
    const over = roomStaff(g, r).slice(capOf(g, r));
    for (const e of over) { const to = freeRoom(g); e.room = to >= 0 ? to : r; }
  }
  if (!(g.viewRoom >= -1 && g.viewRoom < g.rooms.length)) g.viewRoom = 0;
  syncOffice(g);
  return g;
}

/** g.officeLevel = best room level (achievements, decor unlocks). */
export function syncOffice(g) { g.officeLevel = g.rooms.reduce((m, r) => Math.max(m, r.level), 0); }

export const roomName = (r) => t('Phòng {n}', { n: r + 1 });
export const floorOf = (r) => Math.floor(r / BUILD.perFloor);
export const capOf = (g, r) => OFFICE_LEVELS[g.rooms[r].level].capacity;
export const roomStaff = (g, r) => g.staff.filter((e) => (e.room || 0) === r);
export const freeDesks = (g, r) => capOf(g, r) - roomStaff(g, r).length;
export const totalCap = (g) => g.rooms.reduce((s, _, r) => s + capOf(g, r), 0);

/** A room with a free desk: `prefer` if it has one, else the first; -1 when the building is full. */
export function freeRoom(g, prefer = -1) {
  if (prefer >= 0 && prefer < g.rooms.length && freeDesks(g, prefer) > 0) return prefer;
  return g.rooms.findIndex((_, r) => freeDesks(g, r) > 0);
}

/** Move employee e to room r (if it has a free desk). */
export function moveStaff(g, e, r) {
  if (!e || r === e.room || r < 0 || r >= g.rooms.length || freeDesks(g, r) <= 0) return false;
  e.room = r;
  return true;
}

// --- building new rooms ---------------------------------------------------------------------
/** The next room to build: { index, unlockRevenue, cost } or null when the building is complete. */
export function nextRoom(g) {
  const i = g.rooms.length, b = BUILD.rooms[i];
  return b ? { index: i, ...b } : null;
}
export const canBuild = (g) => { const n = nextRoom(g); return !!n && (g.lifetimeEarnings || 0) >= n.unlockRevenue && g.money >= n.cost; };
/** Pay for and open the next room (level 0, empty). Returns its index or -1. */
export function buildRoom(g) {
  const n = nextRoom(g);
  if (!n || (g.lifetimeEarnings || 0) < n.unlockRevenue || g.money < n.cost) return -1;
  g.money -= n.cost;
  g.rooms.push(freshRoom(0));
  g.records.roomsBuilt = (g.records.roomsBuilt || 0) + 1;
  syncOffice(g);
  return n.index;
}

// --- upgrading a room -----------------------------------------------------------------------
/** Next level of room r: { level, name, capacity, unlockRevenue, cost } or null at max. */
export function upgradeOf(g, r) {
  const room = g.rooms[r], next = room && OFFICE_LEVELS[room.level + 1];
  if (!next) return null;
  const k = 1 + BUILD.upgradeStep * r;
  return { ...next, level: room.level + 1, unlockRevenue: Math.round(next.unlockRevenue * k), cost: Math.round(next.cost * k / 100) * 100 };
}
export function upgradeRoom(g, r) {
  const u = upgradeOf(g, r);
  if (!u || (g.lifetimeEarnings || 0) < u.unlockRevenue || g.money < u.cost) return false;
  g.money -= u.cost;
  g.rooms[r].level = u.level;
  syncOffice(g);
  return true;
}

/** Daily rent of the whole building (payroll.js). */
export const rentOf = (g) => (g.rooms || [{ level: g.officeLevel || 0 }]).reduce((s, r) => s + (PAYROLL.rent[r.level] || 0), 0);

// --- monitoring -----------------------------------------------------------------------------
/** Per-room KPI, a moving average like the company KPI (sim.js calls this every tick). */
export function tickRooms(g, dt) {
  const k = 1 - Math.exp(-dt / TUNING.kpiTau);
  g.rooms.forEach((room, r) => {
    const people = roomStaff(g, r);
    if (!people.length) { room.kpi = 1; return; }
    const working = people.filter((e) => e.state === 'work' || e.state === 'hurt').length;
    room.kpi += (working / people.length - room.kpi) * k;
  });
}

/**
 * Alert light of room r for the building overview:
 *   { level: 0 ok · 1 watch · 2 red, slackers, strike, boss, visit, late, kpi }
 */
export function roomAlert(g, r) {
  const people = roomStaff(g, r), room = g.rooms[r];
  const slackers = people.filter((e) => e.state === 'slack').length;
  const strike = people.some((e) => e.state === 'strike');
  const boss = !!g.boss && g.staff[g.boss.at] && (g.staff[g.boss.at].room || 0) === r;
  const visit = !!g.visit && (g.visit.room || 0) === r;
  const p = room.project;
  const late = !!p && g.day >= p.deadline && !Object.keys(p.req).every((k) => p.prog[k] >= p.req[k]);
  const kpi = Math.round((room.kpi ?? 1) * 100);
  let level = 0;
  if (slackers || kpi < 85 || late) level = 1;
  if (slackers >= 2 || strike || boss || kpi < 65 || (slackers && people.some((e) => e.state === 'slack' && e.t > 6))) level = 2;
  return { level, slackers, strike, boss, visit, late, kpi, staff: people.length };
}

/** Rooms other than `except` currently on red. */
export const redRooms = (g, except = -2) => g.rooms.map((_, r) => r).filter((r) => r !== except && roomAlert(g, r).level === 2);

/**
 * A view of g that holds only room r (for drawing a room in detail): same object underneath
 * (reads fall through to g), with `staff` and `officeLevel` of that room.
 */
export function roomScope(g, r) {
  const s = Object.create(g);
  s.staff = roomStaff(g, r);
  s.officeLevel = g.rooms[r] ? g.rooms[r].level : 0;
  s.visit = g.visit && (g.visit.room || 0) === r ? g.visit : null;
  return s;
}
