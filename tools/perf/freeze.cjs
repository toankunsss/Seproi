// Freeze test: puts the game into each "stuck" state a player could hit (a dialog that vanished
// while the game waits for it, the end-of-day card lost, a mini-game gone…) and checks that the
// watchdog gives the game back within a few seconds and logs it. Also checks the error log, the
// FPS meter and the bug report.
//
//   node serve.cjs &
//   node tools/perf/freeze.cjs
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  let pass = 0, total = 0;
  const ok = (n, v, d = '') => { total++; if (v) pass++; console.log((v ? 'PASS  ' : 'FAIL  ') + n + (d ? '  — ' + d : '')); };
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });
  await c.addInitScript(() => { localStorage.removeItem('whipboss.diag.v1'); });
  const p = await c.newPage(); p.on('dialog', (d) => d.accept());
  const G = (f, a) => p.evaluate(f, a);
  await p.goto('http://localhost:5566/?shell=mobile&title=0&tutorial=0&daily=0&mini=0'); await p.waitForFunction(() => window.__game);
  await p.waitForTimeout(500);
  const runs = async () => { const t0 = await G(() => __game.g.dayTime); await p.waitForTimeout(600); return (await G(() => __game.g.dayTime)) > t0; };
  // recovered = the game runs again, or the dialog it waits for is back on screen
  const recovers = async (label, dialog = '') => {
    const blocked = await G(() => __game.blockedBy());
    const frozen = !(await runs());
    await p.waitForTimeout(4600);
    const back = (await runs()) || (!!dialog && await G((s) => { const el = document.querySelector(s); return !!el && !el.hidden; }, dialog));
    const logged = await G((l) => __game.diag.entries().some((e) => e.k === 'watchdog' && e.m.includes(l)), label);
    ok(`Stuck "${label}" (game held by: ${blocked || 'none'}) → watchdog releases it and logs it`, frozen && back && logged, JSON.stringify({ frozen, back, logged }));
  };

  // 1. project reward card disappears while the game waits for it
  await G(() => { const g = __game.g, pr = __game.projects; pr.acceptOffer(g, 0, 0); const a = g.rooms[0].project; for (const k in a.req) a.prog[k] = a.req[k] - 0.01; g.staff.forEach((e) => { e.state = 'work'; e.boost = 0; }); });
  await p.waitForFunction(() => { const el = document.getElementById('reward'); return el && !el.hidden; }, null, { timeout: 8000 });
  await G(() => { document.getElementById('reward').hidden = true; });
  await recovers('reward', '#reward'); // the card is shown again
  await G(() => { const el = document.getElementById('reward'); if (el && !el.hidden) el.querySelector('[data-a="projCollect"]').click(); });
  await p.waitForTimeout(400);

  // 2. a mini-game overlay vanishes
  await G(() => __game.act.miniStart('mouse')); await p.waitForTimeout(400);
  await G(() => { const el = document.getElementById('mini'); el.hidden = true; el.innerHTML = ''; });
  await recovers('mini');

  // 3. the pause card is lost
  await G(() => { document.dispatchEvent(new Event('visibilitychange')); });
  await G(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(300);
  await G(() => { const el = document.getElementById('pause'); if (el) el.hidden = true; });
  await recovers('pause');

  // 4. the end-of-day card is closed without starting the next day
  const day = await G(() => __game.g.day);
  await G(() => { __game.g.dayTime = 149.95; }); await p.waitForTimeout(800);
  await G(() => { document.getElementById('modal').hidden = true; });
  await p.waitForTimeout(4800);
  ok('Stuck "report": end-of-day card lost → the next day starts by itself', (await G(() => __game.g.day)) === day + 1 && await runs());

  // 5. JS errors are kept for the bug report
  await G(() => { setTimeout(() => { throw new Error('test boom'); }); Promise.reject(new Error('test reject')); });
  await p.waitForTimeout(300);
  const log = await G(() => __game.diag.entries().map((e) => e.k + ':' + e.m).join('\n'));
  ok('Errors and rejected promises are logged', /test boom/.test(log) && /test reject/.test(log));

  // 6. FPS meter + bug report from the More screen
  await G(() => __game.ui.screens.more()); await p.waitForTimeout(300);
  await p.click('[data-a="fpsToggle"]'); await p.waitForTimeout(1500);
  ok('"Hiện FPS" shows a live FPS meter', /FPS/.test(await G(() => (document.getElementById('fpsmeter') || {}).textContent || '')));
  await G(() => { window.__copied = ''; navigator.share = undefined; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } }); });
  await p.click('[data-a="bugReport"]'); await p.waitForTimeout(400);
  const rep = await G(() => window.__copied);
  ok('"Gửi báo lỗi" builds a report with version, device, FPS and the log', /Whip Boss 1\.0\.\d/.test(rep) && /Device:/.test(rep) && /FPS now/.test(rep) && /watchdog/.test(rep) && /test boom/.test(rep), rep.split('\n').slice(0, 4).join(' / '));
  await p.click('[data-a="fpsToggle"]');
  console.log(`${pass}/${total} đạt`);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
