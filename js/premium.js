// 💎 shop: permanent perks and consumable boosts (data in config.js PREMIUM_ITEMS).
import { PREMIUM_ITEMS, WHIPS, ASSISTANT } from './config.js';
import { refillCandidates } from './cv.js';

const DIAMOND_WHIP = WHIPS.findIndex((w) => w.premium);

/** Why an item can't be bought right now ('' = it can). */
export function blockedReason(g, item) {
  if (item.kind === 'perk' && g.perks.includes(item.id)) return 'Đã sở hữu';
  if (item.id === 'secretary' && g.assistantLevel < ASSISTANT.length - 1) return item.needs;
  if (item.id === 'diamondWhip' && g.whipLevel < DIAMOND_WHIP - 1) return item.needs;
  if (item.id === 'cash' && !g.records.bestDays.length) return 'Cần hoàn thành 1 ngày';
  if (g.gems < item.gems) return 'Chưa đủ 💎';
  return '';
}

/** Spend 💎 and apply the item. Returns a short message for the popup, or '' if refused. */
export function buyPremium(g, id) {
  const item = PREMIUM_ITEMS.find((x) => x.id === id);
  if (!item || blockedReason(g, item)) return '';
  g.gems -= item.gems;
  switch (id) {
    case 'diamondWhip': g.whipLevel = DIAMOND_WHIP; break;
    case 'hotBonus': g.hotBonus += 60; break;
    case 'espresso':
      for (const e of g.staff) {
        e.boost = Math.max(e.boost, 30); e.stress = 0; e.energy = 100;
        if (e.state === 'slack' || e.state === 'strike' || e.state === 'angry') { e.state = 'work'; e.t = 0; e.slack = null; }
      }
      break;
    case 'starCv': refillCandidates(g, { star: true }); break;
    case 'cash': {
      const best = g.records.bestDays[0].revenue;
      g.money += best; g.lifetimeEarnings += best;
      break;
    }
  }
  if (item.kind === 'perk') g.perks.push(id);
  return item.name;
}
