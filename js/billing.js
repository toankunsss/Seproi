// Real-money purchases through Google Play Billing (@capgo/native-purchases, Billing Library 9):
//   - "Whip Boss VIP" monthly subscription (IAP.vip): no automatic ads, rewards of ad buttons
//     given straight away, IAP.vipDailyGems 💎 a day, a VIP crown on the boss
//   - diamond packs (IAP.packs): consumable, 💎 go straight into the save
//
// There is no server: the game trusts Google Play's answer on this phone. VIP status is asked
// from the store at launch, after a purchase and on "Khôi phục"; offline it stays on for
// IAP.graceDays after the last successful check. Each diamond purchase token is granted once
// (g.iap.tokens), and purchases the app missed (crash, pending payment) are granted at the next launch.
//
// Outside the phone app (browser / tests) purchases are simulated: `?iap=sim` or the dev server.
import { native, plugin } from './platform.js';
import { IAP } from './config.js';

const store = () => plugin('NativePurchases');
const DAY = 86400000;
const params = new URLSearchParams(location.search);
export const simulated = () => !store() && (params.get('iap') === 'sim' || /localhost|127\.0\.0\.1/.test(location.hostname));
export const available = () => !!store() || simulated();

/** Player-facing prices by product id, e.g. { gems_200: '25.000 ₫' } (empty until the store answers). */
export const prices = {};
let vipOffer = null; // { planIdentifier, offerToken } of the subscription base plan

export const iapState = (g) => g.iap || (g.iap = { tokens: [], vip: null, vipGemDay: '' });
/** Is this save VIP right now? */
export function isVip(g) {
  const v = iapState(g).vip;
  if (!v || !v.active) return false;
  if (v.until && Date.now() > v.until) return false;                   // simulated / expired
  return Date.now() - (v.checked || 0) < IAP.graceDays * DAY;           // offline grace
}

/** Connect to the store: prices, VIP status, missed diamond purchases. onChange() after updates. */
export async function initBilling(g, onChange = () => {}) {
  const S = store();
  if (!S) {
    if (simulated()) {
      prices[IAP.vip.id] = '49.000 ₫';
      IAP.packs.forEach((p, i) => { prices[p.id] = ['25.000 ₫', '79.000 ₫', '199.000 ₫'][i]; });
      onChange();
    }
    return;
  }
  try {
    const { isBillingSupported } = await S.isBillingSupported();
    if (!isBillingSupported) return;
    const subs = await S.getProducts({ productIdentifiers: [IAP.vip.id], productType: 'subs' }).catch(() => ({ products: [] }));
    const plan = subs.products.find((p) => p.identifier === IAP.vip.plan) || subs.products[0];
    if (plan) { prices[IAP.vip.id] = plan.priceString; vipOffer = { planIdentifier: plan.identifier, offerToken: plan.offerToken }; }
    const packs = await S.getProducts({ productIdentifiers: IAP.packs.map((p) => p.id), productType: 'inapp' }).catch(() => ({ products: [] }));
    for (const p of packs.products) prices[p.identifier] = p.priceString;
    onChange();
    await refresh(g);
    onChange();
  } catch (err) { console.warn('[billing] init', err); }
}

/** Ask the store what this account owns: VIP on/off, and grant diamond purchases not granted yet. */
export async function refresh(g) {
  const S = store();
  if (!S) return;
  const st = iapState(g);
  try {
    const { purchases } = await S.getPurchases({ productType: 'subs' });
    const active = purchases.some((t) => t.productIdentifier === IAP.vip.id && t.purchaseState === '1');
    st.vip = { active, checked: Date.now() };
    // an active subscription that was never acknowledged (app closed mid-purchase): acknowledge it
    for (const t of purchases) if (t.productIdentifier === IAP.vip.id && t.purchaseState === '1' && t.isAcknowledged === false && t.purchaseToken) await S.acknowledgePurchase({ purchaseToken: t.purchaseToken }).catch(() => {});
  } catch (err) { console.warn('[billing] subs', err); /* offline: keep the cached state */ }
  try {
    const { purchases } = await S.getPurchases({ productType: 'inapp' });
    for (const t of purchases) {
      const pack = IAP.packs.find((p) => p.id === t.productIdentifier);
      if (pack && t.purchaseState === '1') { grantPack(g, pack, t.purchaseToken); await S.consumePurchase({ purchaseToken: t.purchaseToken }).catch(() => {}); }
    }
  } catch (err) { console.warn('[billing] inapp', err); }
}

function grantPack(g, pack, token) {
  const st = iapState(g);
  if (token && st.tokens.includes(token)) return 0;
  if (token) { st.tokens.push(token); if (st.tokens.length > 200) st.tokens.splice(0, st.tokens.length - 200); }
  g.gems += pack.gems;
  g.records.gemsBought = (g.records.gemsBought || 0) + pack.gems;
  g.records.gemsEarned = (g.records.gemsEarned || 0) + pack.gems;
  return pack.gems;
}

/**
 * Buy something. Resolves { ok, gems?, pending?, cancelled?, error? }.
 * kind 'vip' → the subscription; otherwise a diamond pack id.
 */
export async function buy(g, kind) {
  const S = store();
  if (!S) {
    if (!simulated()) return { error: 'unavailable' };
    if (!confirm(`[TEST] ${kind}: ${prices[kind === 'vip' ? IAP.vip.id : kind] || ''}?`)) return { cancelled: true };
    if (kind === 'vip') { iapState(g).vip = { active: true, checked: Date.now(), until: Date.now() + 30 * DAY }; return { ok: true }; }
    const pack = IAP.packs.find((p) => p.id === kind);
    return pack ? { ok: true, gems: grantPack(g, pack, 'sim-' + Date.now()) } : { error: 'unknown' };
  }
  try {
    if (kind === 'vip') {
      const t = await S.purchaseProduct({ productIdentifier: IAP.vip.id, productType: 'subs', planIdentifier: (vipOffer && vipOffer.planIdentifier) || IAP.vip.plan, ...(vipOffer && vipOffer.offerToken ? { offerToken: vipOffer.offerToken } : {}) });
      if (t.purchaseState === '0') return { pending: true };
      iapState(g).vip = { active: true, checked: Date.now() };
      return { ok: true };
    }
    const pack = IAP.packs.find((p) => p.id === kind);
    if (!pack) return { error: 'unknown' };
    const t = await S.purchaseProduct({ productIdentifier: pack.id, productType: 'inapp', isConsumable: true });
    if (t.purchaseState === '0') return { pending: true }; // paid later (cash, bank): granted at a later launch
    return { ok: true, gems: grantPack(g, pack, t.purchaseToken) };
  } catch (err) {
    const msg = String((err && (err.message || err.code)) || err);
    if (/cancel/i.test(msg)) return { cancelled: true };
    console.warn('[billing] buy', err);
    return { error: msg };
  }
}

/** "Khôi phục giao dịch": re-read what the account owns. */
export async function restore(g) {
  const S = store();
  if (!S) return false;
  try { await S.restorePurchases(); } catch {}
  await refresh(g);
  return isVip(g);
}

/** Open Google Play's subscription page (cancel / change payment). */
export async function manage() {
  const S = store();
  if (S) { try { await S.manageSubscriptions(); return; } catch {} }
  window.open('https://play.google.com/store/account/subscriptions', '_blank');
}

/** VIP daily diamonds: once per calendar day. Returns the amount granted (0 if not VIP / already today). */
export function claimVipDaily(g, today = new Date().toDateString()) {
  const st = iapState(g);
  if (!isVip(g) || st.vipGemDay === today) return 0;
  st.vipGemDay = today;
  g.gems += IAP.vipDailyGems;
  g.records.gemsEarned = (g.records.gemsEarned || 0) + IAP.vipDailyGems;
  return IAP.vipDailyGems;
}

void native;
