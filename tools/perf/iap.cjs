// VIP subscription + diamond packs (billing.js), with the browser's simulated store:
// shop UI, buying a pack, subscribing, VIP perks (instant ad rewards, no automatic ads,
// daily diamonds, avatar frame), persistence, selling the company, offline grace.
//
//   node serve.cjs &
//   node tools/perf/iap.cjs [screenshot-dir]
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  const out = process.argv[2] || '';
  let pass = 0, total = 0;
  const ok = (n, v, d = '') => { total++; if (v) pass++; console.log((v ? 'PASS  ' : 'FAIL  ') + n + (d ? '  — ' + d : '')); };
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'vi-VN', hasTouch: true, isMobile: true });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const G = (f, a) => p.evaluate(f, a);
  const shot = (name, opt = {}) => (out ? p.screenshot({ path: `${out}/${name}.png`, ...opt }) : null);
  const vip = () => G(async () => (await import('/js/billing.js')).isVip(__game.g));
  await p.goto('http://localhost:5566/?shell=mobile&title=0&tutorial=0&daily=0&mini=0&inter=sim&iap=sim'); await p.waitForFunction(() => window.__game);
  await p.waitForTimeout(600);

  await p.click('.tab[data-a="vip"]'); await p.waitForTimeout(400);
  ok('💎 shop: VIP card with monthly price + 3 diamond packs with prices', await p.isVisible('.vip-card') && /\/ tháng/.test(await G(() => document.querySelector('.vip-card').textContent)) && (await p.$$('[data-a="buyGems"]:not([disabled])')).length === 3);
  await shot('shop');
  const g0 = await G(() => __game.g.gems);
  await p.click('[data-a="buyGems"][data-arg="gems_700"]'); await p.waitForTimeout(500);
  ok('Buy the 700 pack → +700 💎', (await G(() => __game.g.gems)) === g0 + 700, `${g0} → ${await G(() => __game.g.gems)}`);

  const g1 = await G(() => __game.g.gems);
  await p.click('[data-a="vipSubscribe"]'); await p.waitForTimeout(600);
  ok('Subscribe VIP → VIP on, card says active, today\'s +30 💎', (await vip()) && /Đang hoạt động/.test(await G(() => document.querySelector('.vip-card').textContent)) && (await G(() => __game.g.gems)) === g1 + 30);
  await shot('shop-vip');
  ok('Daily VIP diamonds only once per day', await G(async () => (await import('/js/billing.js')).claimVipDaily(__game.g) === 0));
  await G(() => __game.act.closeScreen()); await p.waitForTimeout(300);
  ok('Avatar gets the VIP frame', await G(() => document.querySelector('.avatar').classList.contains('vip')));
  await shot('hud-vip', { clip: { x: 0, y: 0, width: 390, height: 150 } });

  const g2 = await G(() => __game.g.gems);
  await G(() => __game.act.adGems()); await p.waitForTimeout(300);
  ok('VIP: "+5 💎 ad" pays at once, no ad shown', (await G(() => __game.g.gems)) === g2 + 5 && !(await p.isVisible('.fake-ad')));

  await G(() => { const g = __game.g; g.day = 5; g.ads.interAt = 0; g.ads.inter = 0; g.staff.forEach((e) => { e.state = 'work'; }); g.dayTime = 149.9; }); await p.waitForTimeout(700);
  await p.click('[data-a="nextDay"]'); await p.waitForTimeout(500);
  ok('VIP: no automatic ad between days', !(await p.isVisible('.fake-ad.inter')) && (await G(() => __game.g.day)) === 6);

  await G(() => dispatchEvent(new Event('pagehide'))); await p.reload(); await p.waitForFunction(() => window.__game); await p.waitForTimeout(500);
  ok('VIP kept after reload', await vip());
  const kept = await G(async () => { const pr = await import('/js/prestige.js'); const g = __game.g; g.lifetimeEarnings = 2e6; g.cos = g.cos || {}; g.cos.owned = ['gold']; pr.sellCompany(g); return { vip: (await import('/js/billing.js')).isVip(g), cos: ((g.cos && g.cos.owned) || []).join() }; });
  ok('Selling the company keeps VIP and 💎 skins', kept.vip && kept.cos === 'gold', JSON.stringify(kept));
  const off = await G(async () => { const B = await import('/js/billing.js'); const v = __game.g.iap.vip; const save = { ...v }; v.until = 0; v.checked = Date.now() - 4 * 86400000; const r = B.isVip(__game.g); Object.assign(v, save); return r; });
  ok('No store check for 4 days (offline) → VIP pauses until the next check', off === false);
  ok('No JS errors', errs.length === 0, errs.join(' | '));
  console.log(`${pass}/${total} đạt`); await b.close();
  process.exit(pass === total ? 0 : 1);
})();
