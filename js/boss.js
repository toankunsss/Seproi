// Weekly boss: every BOSS.every days the "Siêu Nhân Viên Lười" (Super Slacker) shows up in the
// office in the morning. He teleports from desk to desk, sometimes puts up a shield (dodge), and
// while he is around everybody slacks 60% more (sim.js). Tap him to whip him: each hit takes
// whip-dependent damage. Beat him before he leaves for a chest; let him go and he walks off
// with some of the company fund and the team's motivation.
//
//   g.boss = { hp, max, t, at, move, dodge, week }  while he is in the office
//   g.bossWeek = last week a boss was spawned (one per week, reloads can't re-roll)
import { BOSS, TUNING, dayLen } from './config.js';

const dayMult = (g) => 1 + TUNING.dayMult * (g.day - 1);
export const weekOf = (g) => Math.floor(g.day / BOSS.every);
export const isBossDay = (g) => g.day % BOSS.every === 0;

/** Damage of one manual whip on the boss. */
export const bossDamage = (g) => 1 + BOSS.damagePerWhipLevel * g.whipLevel;

/** Spawn check + movement. Called from sim.update. */
export function updateBoss(g, dt, emit) {
  if (g.mods || g.mode === 'mini' || !g.staff.length) return; // not in campaign levels / taskbar strip
  if (!g.boss) {
    if (isBossDay(g) && g.bossWeek !== weekOf(g) && g.dayTime >= dayLen(g) * BOSS.arriveAt) {
      const week = weekOf(g);
      const max = Math.round(BOSS.hp + BOSS.hpPerWeek * (week - 1));
      g.boss = { hp: max, max, t: 0, at: Math.floor(Math.random() * g.staff.length), move: BOSS.moveEvery, dodge: 0, week };
      g.bossWeek = week;
      emit('bossStart', g.boss);
    }
    return;
  }
  const b = g.boss;
  b.t += dt;
  b.dodge = Math.max(0, b.dodge - dt);
  b.move -= dt;
  if (b.move <= 0) {
    b.move = BOSS.moveEvery * (0.7 + Math.random() * 0.6);
    let next = Math.floor(Math.random() * g.staff.length);
    if (g.staff.length > 1 && next === b.at) next = (next + 1) % g.staff.length;
    b.at = next;
    if (Math.random() < BOSS.dodgeChance) b.dodge = BOSS.dodgeTime;
    emit('bossMove', b);
  }
  if (b.t >= BOSS.stay) emit('bossLose', loseBoss(g));
}

/** A tap landed on the boss. Returns 'dodge' | 'hit' | 'win'. */
export function hitBoss(g) {
  const b = g.boss;
  if (!b) return null;
  if (b.dodge > 0) return 'dodge';
  b.hp = Math.max(0, b.hp - bossDamage(g));
  b.move = Math.min(b.move, 0.35); // he flees after being hit
  return b.hp <= 0 ? 'win' : 'hit';
}

/** Boss beaten: chest. Returns { money, gems, week }. */
export function winBoss(g) {
  const b = g.boss;
  g.boss = null;
  const money = Math.round((BOSS.chestMoney * dayMult(g) * (1 + 0.25 * (b.week - 1))) / 10) * 10;
  g.money += money; g.lifetimeEarnings += money; g.today.revenue += money;
  g.bossWins = (g.bossWins || 0) + 1;
  for (const e of g.staff) e.motiv = Math.min(100, (e.motiv ?? 50) + 10); // the team cheers
  return { money, gems: BOSS.chestGems, week: b.week };
}

/** Boss walked off: steals part of the fund, the team loses heart. Returns { stolen }. */
export function loseBoss(g) {
  g.boss = null;
  const stolen = Math.min(Math.floor(g.money), Math.round(g.money * BOSS.steal));
  g.money -= stolen;
  g.bossLosses = (g.bossLosses || 0) + 1;
  for (const e of g.staff) e.motiv = Math.max(0, (e.motiv ?? 50) - 10);
  return { stolen };
}
