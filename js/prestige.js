// Selling the company (prestige). Once the company has earned PRESTIGE.minRevenue in total, the
// boss can sell it to an investor for shares ("cổ phần") and start over in a small office.
// Every share permanently adds PRESTIGE.perShare to all income (staff work, catches, offline),
// so each new run goes faster than the last.
//
// Kept: 💎, premium perks (the Diamond Whip stays in hand), claimed achievements, records,
// tutorial / daily / settings. Reset: money, day, staff, office, upgrades, furniture, projects.
import { PRESTIGE, WHIPS } from './config.js';
import { newGame } from './state.js';

const DIAMOND_WHIP = WHIPS.findIndex((w) => w.premium);

/** Shares the investor would pay for this run (diminishing: square root of revenue). */
export const sharesFor = (g) => Math.floor(Math.sqrt((g.lifetimeEarnings || 0) / PRESTIGE.revenuePerShare));
export const canSell = (g) => (g.lifetimeEarnings || 0) >= PRESTIGE.minRevenue && sharesFor(g) > 0;
/** Income multiplier from shares owned. */
export const shareBonus = (g) => 1 + PRESTIGE.perShare * (g.shares || 0);

/** Sell: returns the shares gained (0 if not allowed). Mutates g into a fresh run. */
export function sellCompany(g) {
  if (!canSell(g)) return 0;
  const gained = sharesFor(g);
  const keep = {
    gems: g.gems, perks: g.perks, claimed: g.claimed, records: g.records,
    tutorial: 99, daily: g.daily, muted: g.muted, musicOff: g.musicOff, mode: g.mode,
    shares: (g.shares || 0) + gained, sold: (g.sold || 0) + 1,
    bestRun: Math.max(g.bestRun || 0, Math.floor(g.lifetimeEarnings || 0)),
  };
  const fresh = newGame();
  for (const k of Object.keys(g)) delete g[k];
  Object.assign(g, fresh, keep);
  if (g.perks.includes('diamondWhip')) g.whipLevel = DIAMOND_WHIP; // bought with 💎: stays
  return gained;
}
