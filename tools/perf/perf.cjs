// Performance test: plays the game in Chromium with the CPU slowed down (like a cheap Android
// phone) and measures, per scenario:
//   FPS (average), p95 frame time, janky frames (> 50 ms), freezes (> 250 ms without a frame),
//   long tasks, JS heap and DOM node / event-listener growth (leaks), main-thread time per second.
//
//   node serve.cjs &                         (game on :5566)
//   node tools/perf/perf.cjs [cpu] [seconds] [out.md]
//      cpu      CPU slowdown factor (default 6 ≈ low-end phone; 1 = this computer)
//      seconds  length of each scenario (default 20)
//
// Pass/fail budgets are at the top. Exit code 1 if any scenario misses a budget.
const { chromium } = require('playwright');
const fs = require('fs');

const CPU = Number(process.argv[2]) || 6;
const SECS = Number(process.argv[3]) || 20;
const OUT = process.argv[4] || '';
const URL = 'http://localhost:5566/?shell=mobile&title=0&tutorial=0&daily=0&mini=0';
const BUDGET = { fps: 45, p95: 40, janky: 0.05, freezes: 0, heapGrowMB: 8, nodesGrow: 300, listenersGrow: 100 };

// --- scenario setups (run inside the page) ------------------------------------------------------
const SETUP = {
  'Ngày đầu (3 nhân viên)': () => {},
  'Công ty lớn: 6 phòng × 8 người, đang ở 1 phòng': () => {
    const g = __game.g, R = __game.rooms;
    g.money = 5e7; g.lifetimeEarnings = 1e8; g.day = 60;
    while (g.rooms.length < 6) g.rooms.push(R.freshRoom(2));
    g.rooms.forEach((r) => Object.assign(r, { level: 2, coffeeLevel: 3, assistantLevel: 3, decor: ['rug', 'lamp', 'sofa', 'shelf', 'aquarium', 'trophy'] }));
    const proto = g.staff[0];
    for (let i = g.staff.length; i < 48; i++) g.staff.push({ ...JSON.parse(JSON.stringify(proto)), id: i, room: Math.floor(i / 8), state: 'work', t: 0 });
    g.staff.forEach((e, i) => { e.room = Math.floor(i / 8); });
    R.syncOffice(g); __game.projects.refreshOffers(g, true);
    g.viewRoom = 0;
  },
  'Toàn cảnh toà nhà (6 phòng)': () => { SETUP_BIG(); __game.act.roomGo(-1); },
  'Nhiều người lười + quất liên tục': () => {
    SETUP_BIG();
    window.__whipper = setInterval(() => {
      const g = __game.g, v = __game.view;
      for (const e of g.staff) if (e.room === g.viewRoom && Math.random() < 0.3) Object.assign(e, { state: 'slack', slack: ['game', 'toptop', 'crypto', 'snack', 'call', 'meeting', 'sleep'][Math.floor(Math.random() * 7)], t: 1, dur: 30 });
      const h = v.hits.find((x) => x.e.state === 'slack');
      if (h) { const p = v.toClient((h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2); const el = document.getElementById('game'); for (const type of ['pointerdown']) el.dispatchEvent(new PointerEvent(type, { clientX: p.x, clientY: p.y, pointerType: 'touch', bubbles: true })); }
    }, 350);
  },
  'Mở / đóng các bảng liên tục': () => {
    SETUP_BIG();
    const opens = ['cv', 'projects', 'vip', 'achievements', 'staff', 'levels', 'inventory', 'depts', 'building', 'more'];
    let i = 0;
    window.__churn = setInterval(() => {
      const s = __game.ui.screens;
      if (s.open) __game.act.closeScreen(); else { const k = opens[i++ % opens.length]; s[k] && s[k](); }
      if (i % 7 === 0) { __game.act.roomStep(1); }
    }, 250);
  },
};
// shared "big company" helper, defined in the page before every scenario
const BIG = SETUP['Công ty lớn: 6 phòng × 8 người, đang ở 1 phòng'].toString();

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const [name, setup] of Object.entries(SETUP)) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, locale: 'vi-VN' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.__game);
    await page.evaluate(`window.SETUP_BIG = ${BIG};`);
    await page.evaluate(setup);
    await page.waitForTimeout(800);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    // frame + long-task collectors
    await page.evaluate(() => {
      window.__frames = []; window.__long = [];
      let last = performance.now();
      const loop = (now) => { window.__frames.push(now - last); last = now; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: false }); } catch {}
    });
    // garbage-collect before each sample so only memory that is really kept counts as growth
    const metric = async () => { await cdp.send('HeapProfiler.collectGarbage'); return Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value])); };
    const m0 = await metric();
    await page.waitForTimeout(SECS * 1000);
    const res0 = await page.evaluate(() => ({ frames: window.__frames.length }));
    await page.evaluate(() => { clearInterval(window.__whipper); clearInterval(window.__churn); if (__game.ui.screens.open) __game.act.closeScreen(); });
    await page.waitForTimeout(300);
    const m1 = await metric();
    void res0;
    const res = await page.evaluate(() => ({ frames: window.__frames.slice(5), long: window.__long, stuck: __game.ui && document.querySelector('#modal:not([hidden]), #reward:not([hidden]), #daily:not([hidden]), .fake-ad') ? 'dialog' : '' }));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const f = res.frames.sort((a, b) => a - b);
    const total = f.reduce((s, x) => s + x, 0) / 1000;
    const r = {
      name,
      fps: f.length / Math.max(0.001, total),
      p95: f[Math.floor(f.length * 0.95)] || 0,
      janky: f.filter((x) => x > 50).length / Math.max(1, f.length),
      freezes: f.filter((x) => x > 250).length,
      worst: f[f.length - 1] || 0,
      longTasks: res.long.length,
      heapGrowMB: (m1.JSHeapUsedSize - m0.JSHeapUsedSize) / 1048576,
      nodesGrow: m1.Nodes - m0.Nodes,
      listenersGrow: m1.JSEventListeners - m0.JSEventListeners,
      scriptPerSec: ((m1.ScriptDuration - m0.ScriptDuration) / SECS) * 1000,
      layoutsPerSec: (m1.LayoutCount - m0.LayoutCount) / SECS,
      errors,
    };
    r.ok = r.fps >= BUDGET.fps && r.p95 <= BUDGET.p95 && r.janky <= BUDGET.janky && r.freezes <= BUDGET.freezes
      && r.heapGrowMB <= BUDGET.heapGrowMB && r.nodesGrow <= BUDGET.nodesGrow && r.listenersGrow <= BUDGET.listenersGrow && !errors.length;
    rows.push(r);
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${name}: ${r.fps.toFixed(1)} fps · p95 ${r.p95.toFixed(1)} ms · janky ${(r.janky * 100).toFixed(1)}% · freezes ${r.freezes} (worst ${r.worst.toFixed(0)} ms) · long tasks ${r.longTasks} · heap ${r.heapGrowMB >= 0 ? '+' : ''}${r.heapGrowMB.toFixed(1)} MB · DOM ${r.nodesGrow >= 0 ? '+' : ''}${r.nodesGrow} · listeners ${r.listenersGrow >= 0 ? '+' : ''}${r.listenersGrow} · JS ${r.scriptPerSec.toFixed(0)} ms/s · layout ${r.layoutsPerSec.toFixed(1)}/s${errors.length ? ' · ERRORS ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
  await browser.close();
  if (OUT) {
    const md = [`# Whip Boss · đo hiệu năng (CPU chậm ×${CPU}, ${SECS} s mỗi kịch bản)`, '',
      `Ngưỡng đạt: ≥ ${BUDGET.fps} fps · p95 ≤ ${BUDGET.p95} ms · khung giật (>50 ms) ≤ ${BUDGET.janky * 100}% · không đơ (>250 ms) · heap tăng ≤ ${BUDGET.heapGrowMB} MB · DOM tăng ≤ ${BUDGET.nodesGrow} · listener tăng ≤ ${BUDGET.listenersGrow}`, '',
      '| Kịch bản | Kết quả | FPS | p95 (ms) | Khung giật | Đơ > 250 ms (lâu nhất) | Long task | Heap | DOM | Listener | JS (ms/s) |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
      ...rows.map((r) => `| ${r.name} | ${r.ok ? '✅' : '❌'} | ${r.fps.toFixed(1)} | ${r.p95.toFixed(1)} | ${(r.janky * 100).toFixed(1)}% | ${r.freezes} (${r.worst.toFixed(0)} ms) | ${r.longTasks} | ${r.heapGrowMB.toFixed(1)} MB | ${r.nodesGrow} | ${r.listenersGrow} | ${r.scriptPerSec.toFixed(0)} |`)];
    fs.writeFileSync(OUT, md.join('\n') + '\n');
  }
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
})();
