// Achievements: milestones that pay out 💎 when the player claims them.
import { ACHIEVEMENTS } from './config.js';

/** [{ ...achievement, value, done, claimed }] in display order: claimable, in progress, claimed. */
export function achievementList(g) {
  const rank = (a) => (a.done && !a.claimed ? 0 : a.claimed ? 2 : 1);
  return ACHIEVEMENTS.map((a) => {
    const value = Math.min(a.goal, Number(a.stat(g)) || 0);
    const claimed = g.claimed.includes(a.id);
    return { ...a, value, done: value >= a.goal, claimed };
  }).sort((x, y) => rank(x) - rank(y));
}

export const claimableCount = (g) => ACHIEVEMENTS.filter((a) => !g.claimed.includes(a.id) && (Number(a.stat(g)) || 0) >= a.goal).length;

export function claim(g, id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || g.claimed.includes(id) || (Number(a.stat(g)) || 0) < a.goal) return 0;
  g.claimed.push(id);
  g.gems += a.gems;
  return a.gems;
}
