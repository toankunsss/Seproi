// Records the Google Play promo video (English) from the real game, frame by frame.
//
//   node tools/promo/record.cjs <framesDir>      (needs `node serve.cjs` running on :5566)
//
// The page clock is faked (Playwright clock), so every frame advances the game by exactly
// 1/30 s no matter how long a screenshot takes; CSS animations are stepped by hand for the
// same reason. A scripted storyboard drives the game through its public debug handle
// (window.__game) and an overlay (#promo) draws captions, tap ripples and the end card.
// It opens on the game's own title screen and taps Start.
// Writes <framesDir>/f00000.jpg … and <framesDir>/events.json (timestamps for the sound track).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, 'frames');
const FPS = 30, STEP = 1000 / FPS;
const URL = process.env.PROMO_URL || 'http://localhost:5566/?shell=mobile';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...devices['Pixel 7'], viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, locale: 'en-US',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.clock.install({ time: new Date('2026-11-03T08:00:00') });
  await page.addInitScript(() => { try { localStorage.setItem('seproi.lang', 'en'); } catch {} });
  await page.goto(URL);
  await page.clock.runFor(1200);
  await page.evaluate(installOverlay);

  let n = 0, vt = 0;
  const events = [];
  const ev = (type) => events.push({ t: vt / 1000, type });
  let last = await page.evaluate(() => window.__promoCounters());

  /** Render `sec` seconds of video. `each(frameIndex)` runs before every frame. */
  async function play(sec, each) {
    const count = Math.round(sec * FPS);
    for (let i = 0; i < count; i++) {
      if (each) await each(i);
      await page.clock.runFor(STEP);
      vt += STEP;
      const c = await page.evaluate((vt) => window.__promoTick(vt), vt);
      // sound effects from what actually happened in the game this frame
      if (c.whips > last.whips) ev('whip');
      if (c.catches > last.catches) ev('coin');
      if (c.done > last.done) ev('fanfare');
      if (c.visit && !last.visit) ev('siren');
      if (c.money < last.money - 20 && !c.spent) ev('fine');
      last = c;
      await page.screenshot({ path: path.join(OUT, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
  }
  const G = (fn, arg) => page.evaluate(fn, arg);
  const caption = (text, sub = '') => G(([a, b]) => window.__promoCaption(a, b), [text, sub]);
  const card = (kind) => G((k) => window.__promoCard(k), kind);
  const slack = (id, kind) => G(([id, kind]) => { const e = __game.g.staff.find((x) => x.id === id) || __game.g.staff[id]; if (e) Object.assign(e, { state: 'slack', slack: kind, t: 3, dur: 60 }); }, [id, kind]);
  async function tapStaff(id) {
    const p = await G((id) => {
      const v = __game.view, h = v.hits.find((x) => x.e.id === id) || v.hits[id];
      if (!h) return null;
      return v.toClient((h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2 - 4);
    }, id);
    if (!p) return;
    await G((p) => window.__promoRipple(p.x, p.y), p);
    await page.touchscreen.tap(p.x, p.y);
  }
  async function press(selector) {
    const ok = await G((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      window.__promoRipple(r.left + r.width / 2, r.top + r.height / 2);
      el.click();
      return true;
    }, selector);
    if (ok) ev('blip'); else console.warn('missing', selector);
  }
  const spend = (on) => G((on) => { window.__promoSpent = on; }, on);

  // ---------------------------------------------------------------- storyboard
  // 0. The game's title screen, then tap Start
  await G(() => { __game.g.muted = true; });
  ev('intro');
  await play(2.6);
  await press('#title .title-play');
  ev('whip');
  await play(0.9);

  // 1. Core loop: catch slackers, build a combo
  await caption('Lazy staff?', 'WHIP THEM BACK TO WORK!');
  const order = [[1, 'toptop'], [0, 'game'], [2, 'sleep'], [1, 'crypto'], [0, 'toptop'], [2, 'game']];
  await play(0.6);
  for (const [id, kind] of order) {
    await slack(id, kind);
    await play(0.55);
    await tapStaff(id);
    await play(0.75);
  }
  await play(0.5);

  // 2. Recruitment by CV
  await G(async () => {
    const cv = await import('/js/cv.js');
    __game.g.money = 4000;
    cv.refillCandidates(__game.g, { star: true });
    __game.act.interview();
  });
  await caption('Hire from CVs', 'Find a ★★★★★ superstar');
  await play(1.6);
  await spend(true); await press('[data-a="cvHire"][data-arg="0"]');
  await play(1.2); await spend(false);
  await press('#modal [data-a="closeScreen"]');
  await play(0.6);

  // 3. Projects
  await caption('Take on projects', 'Beat the deadline: cash + diamonds');
  await press('.tab[data-a="projects"]');
  await play(1.3);
  await press('[data-a="projAccept"][data-arg="0"]');
  await play(0.7);
  await press('#modal [data-a="closeScreen"]');
  await play(2.4, async (i) => {
    await G((f) => { const a = __game.g.projects.active; if (!a) return; for (const r in a.req) a.prog[r] = Math.min(a.req[r] - 0.2, a.req[r] * f); }, Math.min(1, (i + 1) / 60));
  });
  await play(1.4);

  // 4. Labour inspector: watching vs. on the phone
  await G(() => {
    const g = __game.g;
    g.visit = null; g.visitPlan = { day: g.day, at: g.dayTime };
    const r = Math.random; Math.random = () => 0.4; setTimeout(() => { Math.random = r; }, 50); // → labour
  });
  await caption('Surprise inspection!', "Don't let them see the whip…");
  await play(3.3);
  await G(() => { const v = __game.g.visit; if (v) { v.watching = true; v.phaseLeft = 30; } __game.g.money = Math.max(__game.g.money, 800); });
  await slack(0, 'game');
  await play(0.6);
  await tapStaff(0);
  await play(1.6);
  await G(() => { const v = __game.g.visit; if (v) { v.watching = false; v.phaseLeft = 30; } });
  await caption("They're not looking…", 'WHIP FAST!');
  await play(0.5);
  for (const [id, kind] of [[1, 'sleep'], [2, 'toptop'], [3, 'crypto']]) {
    await slack(id, kind); await play(0.35); await tapStaff(id); await play(0.5);
  }
  await play(0.6);
  await G(() => { __game.g.visit = null; });

  // 5. Staff care
  await G(() => { __game.g.money = Math.max(__game.g.money, 3000); __game.ui.screens.staff(); });
  await caption('Bonuses, raises, parties…', "…or YOU'RE FIRED!");
  await play(1.2);
  await spend(true);
  const firstId = await G(() => __game.g.staff[0].id);
  await press(`[data-a="staffDo"][data-arg="bonus:${firstId}"]`); await play(0.9);
  await press(`[data-a="staffDo"][data-arg="raise:${firstId}"]`); await play(0.9);
  await press('[data-a="staffDo"][data-arg="party:"]'); await play(1.1);
  await spend(false);
  await press('#modal [data-a="closeScreen"]');
  await play(0.4);

  // 6. Diamond shop + achievements
  await G(() => { __game.g.gems = 260; __game.ui.screens.vip(); });
  await caption('Diamond Shop', 'Perks & rare items');
  await play(0.8);
  await play(1.6, (i) => G((f) => { const c = document.querySelector('#modal .card'); if (c) c.scrollTop = (c.scrollHeight - c.clientHeight) * f; }, Math.min(1, (i + 1) / 40)));
  await G(() => { const c = document.querySelector('#modal .card'); if (c) c.scrollTop = 0; });
  await play(0.3);
  await press('[data-a="vipBuy"][data-arg="aiClock"]');
  await play(1.0);
  await G(() => { const r = __game.g.records; r.catches = Math.max(r.catches, 120); r.bestCombo = Math.max(r.bestCombo, 6); __game.ui.screens.achievements(); });
  await caption('50 achievements', 'Unlock rewards');
  await play(0.9);
  await press('[data-a="achClaim"][data-arg="catch10"]'); await play(0.6);
  await press('[data-a="achClaim"][data-arg="catch100"]'); await play(0.6);
  await press('[data-a="achClaim"][data-arg="combo5"]'); await play(0.8);
  await press('#modal [data-a="closeScreen"]');

  // 7. Late game: full HQ, assistant + diamond whip, big combo
  await G(async () => {
    const st = await import('/js/state.js'), cv = await import('/js/cv.js');
    const g = __game.g;
    Object.assign(g, { officeLevel: 2, whipLevel: 5, assistantLevel: 3, coffeeLevel: 3, decor: ['rug', 'lamp', 'sofa', 'shelf', 'aquarium', 'trophy'], perks: ['aiClock', 'secretary', 'massage', 'diamondWhip'], money: 98450, day: 24 });
    while (g.staff.length < 8) g.staff.push(st.makeEmployee(g.staff.reduce((m, e) => Math.max(m, e.id), -1) + 1, cv.makeCandidate(g)));
    g.staff.forEach((e, i) => { e.motiv = i % 3 ? 85 : 50; });
    g.dayTime = 120;
  });
  await caption('Build an office empire', 'Stricter boss, higher KPI!');
  await play(0.8);
  const kinds = ['game', 'toptop', 'sleep', 'crypto'];
  const ids = await G(() => __game.g.staff.map((e) => e.id));
  for (let k = 0; k < 9; k++) {
    const id = ids[(k * 3) % ids.length];
    await slack(id, kinds[k % 4]);
    if (k % 3 === 0) await slack(ids[(k * 3 + 4) % ids.length], kinds[(k + 1) % 4]); // the assistant grabs these
    await play(0.3);
    await tapStaff(id);
    await play(0.42);
  }
  await play(0.8);

  // 8. Outro card
  await caption(null);
  await card('outro');
  ev('outro');
  await play(4.2);

  fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify({ fps: FPS, duration: vt / 1000, frames: n, events }, null, 1));
  console.log(`frames: ${n} (${(vt / 1000).toFixed(1)}s), events: ${events.length}, page errors: ${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 5));
  await browser.close();
})();

// ----------------------------------------------------------------------------- in-page overlay
async function installOverlay() {
  // brand art for the end card, drawn by the game's own code (js/brand.js)
  const brand = await import('/js/brand.js');
  const logoSrc = brand.logoUrl(256);
  const ts = brand.titleSize();
  const tc = document.createElement('canvas');
  tc.width = ts.w; tc.height = ts.h;
  brand.drawTitle(tc.getContext('2d'), 0, 0, 1);
  const titleSrc = tc.toDataURL();

  const css = document.createElement('style');
  css.textContent = `
    #promo { position: fixed; inset: 0; z-index: 100; pointer-events: none; font-family: 'VT323', monospace; }
    #promo .cap { position: absolute; left: 0; right: 0; top: 0; padding: 14px 12px 12px; text-align: center;
      background: linear-gradient(#0c0916f2 70%, #0c091600); }
    #promo .cap b { display: block; font-size: 40px; line-height: 1; color: #ffd34d; font-weight: normal;
      text-shadow: 3px 0 #7a1a00, -3px 0 #7a1a00, 0 3px #7a1a00, 0 -3px #7a1a00, 4px 4px #000; }
    #promo .cap i { display: block; margin-top: 4px; font-style: normal; font-size: 26px; color: #fff; text-shadow: 2px 2px #000; }
    #promo .rip { position: absolute; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%;
      border: 4px solid #fff; box-shadow: 0 0 0 3px #0008; }
    #promo .dot { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: #ffffffcc; }
    #promo .card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; background: radial-gradient(circle at 50% 40%, #3a2f6a, #120f1c 70%); color: #f3ecff; }
    #promo .card .logo { width: 150px; height: 150px; image-rendering: pixelated; margin-bottom: 22px;
      box-shadow: 0 0 0 4px #0f0c18, 0 0 0 8px #ffd34d, 0 0 0 12px #0f0c18, 0 0 40px 14px #ffd34d55; }
    #promo .card .name { width: 300px; image-rendering: pixelated; filter: drop-shadow(5px 7px 0 #0008); }
    #promo .card p { margin: 10px 24px 0; font-size: 30px; line-height: 1.05; }
    #promo .card .play { margin-top: 26px; padding: 12px 18px; font-size: 30px; color: #fff; background: #2f6a3f;
      box-shadow: 0 0 0 4px #0f0c18, 0 0 26px #5cff7a66; }
    #promo .card small { display: block; margin-top: 14px; font-size: 22px; color: #a99fc9; }`;
  document.head.appendChild(css);
  const root = document.createElement('div');
  root.id = 'promo';
  document.body.appendChild(root);

  let cap = null, cardKind = null, cardStart = 0, now = 0;
  const ripples = [];
  const capEl = document.createElement('div'); capEl.className = 'cap'; root.appendChild(capEl);
  const cardEl = document.createElement('div'); cardEl.className = 'card'; root.appendChild(cardEl);

  window.__promoSpent = false;
  window.__promoCaption = (text, sub) => { cap = text ? { text, sub, start: now } : null; };
  window.__promoRipple = (x, y) => ripples.push({ x, y, start: now });
  window.__promoCard = (kind) => {
    cardKind = kind; cardStart = now;
    if (kind === 'outro') cardEl.innerHTML = `<img class="logo" src="${logoSrc}"><img class="name" src="${titleSrc}" alt="Whip Boss"><p>Catch · Whip · Keep the KPI</p><div class="play">▶ Free on Google Play</div><small>English · Tiếng Việt</small>`;
  };
  window.__promoCounters = () => {
    const g = window.__game.g;
    return { whips: g.records.totalWhips, catches: g.records.catches, done: g.projects.done, visit: !!g.visit, money: g.money, spent: window.__promoSpent };
  };
  window.__promoTick = (vt) => {
    now = vt;
    // step every CSS animation/transition by exactly one frame (they run on real time otherwise)
    for (const a of document.getAnimations()) {
      if (a.__pv === undefined) { a.pause(); a.__pv = 0; } else a.__pv += 1000 / 30;
      try { a.currentTime = a.__pv; } catch {}
    }
    // caption: slide down + fade in over 0.25 s
    if (cap) {
      const k = Math.min(1, (vt - cap.start) / 250);
      capEl.style.display = 'block';
      capEl.style.opacity = k;
      capEl.style.transform = `translateY(${(1 - k) * -30}px)`;
      const html = `<b>${cap.text}</b>${cap.sub ? `<i>${cap.sub}</i>` : ''}`;
      if (capEl.innerHTML !== html) capEl.innerHTML = html;
    } else capEl.style.display = 'none';
    // title cards fade in/out
    if (cardKind) {
      const k = Math.min(1, (vt - cardStart) / 300);
      cardEl.style.display = 'flex'; cardEl.style.opacity = k;
      const logo = cardEl.querySelector('.logo');
      if (logo) logo.style.transform = `scale(${1 + 0.06 * Math.sin(vt / 180)}) rotate(${Math.sin(vt / 300) * 6}deg)`;
    } else cardEl.style.display = 'none';
    // tap ripples
    root.querySelectorAll('.rip, .dot').forEach((el) => el.remove());
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], age = (vt - r.start) / 450;
      if (age > 1) { ripples.splice(i, 1); continue; }
      const ring = document.createElement('div'); ring.className = 'rip';
      ring.style.left = r.x + 'px'; ring.style.top = r.y + 'px';
      ring.style.transform = `scale(${0.4 + age * 1.1})`; ring.style.opacity = 1 - age;
      root.appendChild(ring);
      if (age < 0.35) { const d = document.createElement('div'); d.className = 'dot'; d.style.left = r.x + 'px'; d.style.top = r.y + 'px'; root.appendChild(d); }
    }
    return window.__promoCounters();
  };
}
