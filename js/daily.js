// Daily features that bring players back, all offline on the phone's own clock:
//   - offline earnings: the assistant keeps the company running while the app is closed;
//     capHours away pays DAILY.offline.days work days of income (a game day is only 2.5 min,
//     so real time is scaled down), shown when you come back
//   - 7-day login gifts: one gift per calendar day; skipping a day restarts the streak
//   - daily quests: DAILY.questCount small goals per calendar day, 💎 each + a bonus for all
// Clock cheating: a clock moved backwards gives nothing (and lastSeen / last date never move back).
import { DAILY, ROLES, TUNING } from './config.js';
import { skillMult } from './cv.js';
import { addGems } from './achievements.js';
import { shareBonus } from './prestige.js';

const DAY_MS = 86400000;
const pad = (n) => String(n).padStart(2, '0');
/** Local calendar date 'YYYY-MM-DD'. */
export const dateKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dayIndex = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY_MS); };
const dayMult = (g) => 1 + TUNING.dayMult * (g.day - 1);

/** The save's daily block, created on first use. */
export function dailyState(g) {
  if (!g.daily) g.daily = { lastSeen: 0, login: { streak: 0, last: '', claimed: true }, quests: [], questDate: '', bonusClaimed: false };
  return g.daily;
}

// --- Offline earnings ---------------------------------------------------------------------
/** Normal income per second with everyone working at a typical 85% KPI. */
function incomeRate(g) {
  const perks = (g.perks.includes('aiClock') ? 1.15 : 1) * shareBonus(g);
  return g.staff.reduce((s, e) => s + ROLES[e.role].income * skillMult(e.cv), 0) * perks * dayMult(g) * 0.85;
}

/** What the assistant earned while the app was closed: { seconds, money } or null. */
export function offlineEarnings(g, now) {
  const d = dailyState(g);
  const last = d.lastSeen;
  if (!last || now <= last) return null;
  const away = (now - last) / 1000;
  if (away < DAILY.offline.minMinutes * 60) return null;
  const seconds = Math.min(away, DAILY.offline.capHours * 3600);
  const dayIncome = incomeRate(g) * TUNING.dayLength;
  const money = Math.round((dayIncome * DAILY.offline.days * (seconds / (DAILY.offline.capHours * 3600))) / 10) * 10;
  return money > 0 ? { seconds, money, capped: away > seconds } : null;
}

/** Remember when the player was last here (never moves backwards). */
export function touch(g, now) {
  const d = dailyState(g);
  d.lastSeen = Math.max(d.lastSeen || 0, now);
}

export function collectOffline(g, r, mult = 1) {
  const money = r.money * mult;
  g.money += money;
  g.lifetimeEarnings += money;
  return money;
}

// --- Login calendar -----------------------------------------------------------------------
/** Gift of calendar day `n` (1..7) with amounts resolved: { money, gems, boost }. */
export function loginGift(g, n) {
  const x = DAILY.login[(n - 1) % DAILY.login.length];
  return { money: x.money ? Math.round((x.money * DAILY.loginMoney * dayMult(g)) / 10) * 10 : 0, gems: x.gems || 0, boost: x.boost || '' };
}

/**
 * Called on launch / resume. Advances the streak on a new calendar day. Returns the day number
 * (1..7) whose gift is waiting to be claimed, or 0.
 */
export function checkLogin(g, now) {
  const L = dailyState(g).login;
  const today = dateKey(now);
  if (L.last === today) return L.claimed ? 0 : L.streak;
  if (L.last && dayIndex(today) < dayIndex(L.last)) return 0; // clock moved back
  const gap = L.last ? dayIndex(today) - dayIndex(L.last) : 1;
  L.streak = gap === 1 ? (L.streak % DAILY.login.length) + 1 : 1;
  L.last = today;
  L.claimed = false;
  return L.streak;
}

/** Claim today's gift (mult 2 = rewarded ad doubles it). Returns the gift given. */
export function claimLogin(g, mult = 1) {
  const L = dailyState(g).login;
  if (L.claimed || !L.streak) return null;
  const gift = loginGift(g, L.streak);
  if (gift.money) { g.money += gift.money * mult; g.lifetimeEarnings += gift.money * mult; }
  if (gift.gems) addGems(g, gift.gems * mult);
  if (gift.boost === 'hotBonus') g.hotBonus = Math.max(g.hotBonus || 0, 60);
  L.claimed = true;
  g.records.loginDays = (g.records.loginDays || 0) + 1;
  return { ...gift, money: gift.money * mult, gems: gift.gems * mult };
}

// --- Daily quests -------------------------------------------------------------------------
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** New quests on a new calendar day (never when the clock went backwards). */
export function refreshQuests(g, now) {
  const d = dailyState(g);
  const today = dateKey(now);
  if (d.questDate === today && d.quests.length) return false;
  if (d.questDate && dayIndex(today) < dayIndex(d.questDate)) return false;
  const pool = DAILY.quests.filter((q) => !q.need || q.need(g));
  const chosen = [];
  while (chosen.length < DAILY.questCount && pool.length) chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  d.quests = chosen.map((q) => ({ id: q.id, n: pick(q.n), base: q.best ? 0 : Number(q.stat(g)) || 0, max: 0, claimed: false }));
  d.questDate = today;
  d.bonusClaimed = false;
  return true;
}

/** [{ ...quest, def, progress, done }] for the UI. Also tracks "best" quests (combo). */
export function questList(g) {
  const d = dailyState(g);
  return d.quests.map((q) => {
    const def = DAILY.quests.find((x) => x.id === q.id);
    if (!def) return null;
    const v = Number(def.stat(g)) || 0;
    if (def.best) q.max = Math.max(q.max || 0, v);
    const progress = Math.min(q.n, def.best ? q.max : v - q.base);
    return { ...q, def, progress, done: progress >= q.n };
  }).filter(Boolean);
}

export function claimQuest(g, i) {
  const q = questList(g)[i];
  if (!q || !q.done || q.claimed) return 0;
  dailyState(g).quests[i].claimed = true;
  addGems(g, q.def.gems);
  return q.def.gems;
}

export const allQuestsClaimed = (g) => { const d = dailyState(g); return d.quests.length > 0 && d.quests.every((q) => q.claimed); };

export function claimQuestBonus(g) {
  const d = dailyState(g);
  if (d.bonusClaimed || !allQuestsClaimed(g)) return 0;
  d.bonusClaimed = true;
  addGems(g, DAILY.questBonus);
  return DAILY.questBonus;
}

/** Quests ready to claim (+1 for the bonus) — for the red dot on the Awards tab. */
export function questClaimable(g) {
  const ready = questList(g).filter((q) => q.done && !q.claimed).length;
  const d = dailyState(g);
  return ready + (allQuestsClaimed(g) && !d.bonusClaimed ? 1 : 0);
}
