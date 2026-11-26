// Short vertical ad (TikTok / Reels / Shorts, 1080x1920): the boss with EVERYTHING maxed —
// top office (8 desks, all furniture, coffee + assistant Lv4), Diamond Whip, a legendary outfit,
// VIP crown, office cat — whipping a whole room of slackers, combo, coffee rush, the Roar skill,
// the weekly boss, then the 6-room building and an end card.
//
//   node serve.cjs &
//   AD_LANG=vi node tools/promo/ad.cjs <framesDir>     (AD_LANG=en for English captions + game UI)
//   then tools/promo/make-ad.sh does the sound track and the mp4.
// Same frame-exact recording as record.cjs (fake page clock, one screenshot per 1/30 s).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, 'ad-frames');
const LANG = process.env.AD_LANG || 'vi';
const FPS = 30, STEP = 1000 / FPS;
const URL = 'http://localhost:5566/?shell=mobile&title=0&tutorial=0&daily=0&mini=0';
const T = {
  vi: {
    hook: ['Cả phòng đang lười?!', 'QUẤT CHO TỈNH!'],
    combo: ['COMBO LIÊN HOÀN', 'Roi Kim Cương · thưởng gấp bội'],
    coffee: ['Cà phê sốc!', 'Đánh thức kẻ ngủ gật'],
    roar: ['TIẾNG GẦM CỦA SẾP', 'Cả phòng quay lại làm việc'],
    boss: ['Trùm lười nhất tuần!', 'Quất hắn để mở rương'],
    building: ['Từ 1 phòng lên cả tòa nhà', '6 phòng · 48 nhân viên'],
    outro: { line: 'Bắt quả tang · Quất · Giữ KPI', play: '▶ Tải miễn phí trên Google Play', small: 'Tiếng Việt · English · +10 ngôn ngữ' },
  },
  en: {
    hook: ['The whole office is slacking?!', 'WHIP THEM BACK TO WORK!'],
    combo: ['COMBO STREAK', 'Diamond Whip · huge rewards'],
    coffee: ['Coffee rush!', 'Wake up the sleepers'],
    roar: ["THE BOSS'S ROAR", 'Everyone back to work'],
    boss: ['Laziest boss of the week!', 'Whip him to open the chest'],
    building: ['From 1 room to a tower', '6 rooms · 48 staff'],
    outro: { line: 'Catch · Whip · Keep the KPI', play: '▶ Free on Google Play', small: '12 languages' },
  },
}[LANG];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, locale: LANG === 'vi' ? 'vi-VN' : 'en-US' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.clock.install({ time: new Date('2026-11-26T09:00:00') });
  await page.addInitScript((l) => { try { localStorage.clear(); localStorage.setItem('seproi.lang', l); } catch {} }, LANG);
  await page.goto(URL);
  await page.clock.runFor(1500);
  await page.evaluate(installOverlay);
  await page.evaluate((o) => { window.__adOutro = o; }, T.outro);

  // ---- max everything --------------------------------------------------------------------------
  await page.evaluate(async () => {
    const st = await import('/js/state.js'), cv = await import('/js/cv.js'), R = await import('/js/rooms.js');
    const inv = await import('/js/inventory.js'), C = await import('/js/config.js'), P = await import('/js/projects.js');
    const g = __game.g;
    g.muted = true;
    const DIAMOND = C.WHIPS.findIndex((w) => w.premium);
    Object.assign(g, { whipLevel: DIAMOND, money: 2486000, lifetimeEarnings: 9e6, day: 46, gems: 1250, perks: ['aiClock', 'secretary', 'massage', 'diamondWhip', 'noAds'] });
    g.cos = { ...(g.cos || {}), pet: 'cat' };
    g.iap = { tokens: [], vip: { active: true, checked: Date.now(), until: Date.now() + 30 * 864e5 }, vipGemDay: new Date().toDateString() };
    g.sk = { xp: 0, lvl: 28, pts: 0, ranks: { hawk: 3, charisma: 3, discipline: 3, business: 3, roar: 3 }, roarCd: 0 };
    const full = { level: 2, coffeeLevel: 3, assistantLevel: 3, decor: ['rug', 'lamp', 'sofa', 'shelf', 'aquarium', 'trophy'] };
    g.rooms = Array.from({ length: 6 }, () => ({ ...R.freshRoom(2), ...full }));
    const staff = [];
    for (let i = 0; i < 48; i++) {
      const e = i < 3 ? g.staff[i] : st.makeEmployee(i, cv.makeCandidate(g, { star: i % 5 === 0 }));
      Object.assign(e, { id: i, room: Math.floor(i / 8), state: 'work', energy: 100, stress: 0, motiv: 90, t: 0 });
      staff.push(e);
    }
    g.staff = staff;
    R.syncOffice(g); P.refreshOffers(g, true);
    // legendary outfit in every slot
    const S = inv.invState(g);
    for (let k = 0; k < 60 && Object.keys(S.eq).length < inv.SLOTS.length; k++) {
      const it = inv.addItem(g, inv.rollItem(g, 3));
      if (!S.eq[it.slot]) inv.equip(g, it.id);
    }
    S.fresh = 0;
    g.dayTime = 45; g.viewRoom = 0;
    for (const rm of g.rooms) rm.assistantCd = 99; // the assistant waits: the player does the whipping on camera
    __game.act.roomGo(0);
  });
  await page.clock.runFor(800);

  let n = 0, vt = 0;
  const events = [];
  const ev = (type) => events.push({ t: vt / 1000, type });
  let last = await page.evaluate(() => window.__promoCounters());
  async function play(sec, each) {
    const count = Math.round(sec * FPS);
    for (let i = 0; i < count; i++) {
      if (each) await each(i);
      await page.clock.runFor(STEP);
      vt += STEP;
      const c = await page.evaluate((vt) => window.__promoTick(vt), vt);
      if (c.whips > last.whips) ev('whip');
      if (c.catches > last.catches) ev('coin');
      last = c;
      await page.screenshot({ path: path.join(OUT, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
  }
  const G = (fn, arg) => page.evaluate(fn, arg);
  const caption = (pair) => G(([a, b]) => window.__promoCaption(a, b), pair || [null, null]);
  const slackAll = (kinds) => G((kinds) => { __game.g.staff.filter((e) => e.room === __game.g.viewRoom).forEach((e, i) => Object.assign(e, { state: 'slack', slack: kinds[i % kinds.length], t: 2 + i * 0.3, dur: 99, halfCaught: false })); }, kinds);
  async function tapAt(p) { if (!p) return; await G((p) => window.__promoRipple(p.x, p.y), p); await page.touchscreen.tap(p.x, p.y); }
  const staffPoint = (i) => G((i) => { const v = __game.view, h = v.hits[i]; return h ? v.toClient((h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2 - 4) : null; }, i);
  async function press(sel) {
    const p = await G((sel) => { const el = document.querySelector(sel); if (!el || el.hidden || el.disabled) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
    if (p) { await G((p) => window.__promoRipple(p.x, p.y), p); await G((sel) => document.querySelector(sel).click(), sel); ev('blip'); }
  }

  // ---- storyboard ------------------------------------------------------------------------------
  // 0. hook: the whole top office slacking
  await slackAll(['game', 'toptop', 'crypto', 'snack', 'game', 'meeting', 'toptop', 'sleep']);
  ev('intro');
  await caption(T.hook);
  await play(1.6);
  // 1. whipping spree → combo
  await caption(T.combo);
  for (const i of [0, 1, 2, 3, 4, 6]) { await tapAt(await staffPoint(i)); await play(0.42); }
  await play(0.5);
  // 2. coffee rush wakes the sleeper
  await caption(T.coffee);
  await G(() => { const g = __game.g; g.rooms[0].coffeeCd = 0; const e = g.staff.find((x) => x.room === 0 && x.slack === 'sleep'); if (!e) Object.assign(g.staff[7], { state: 'slack', slack: 'sleep', t: 3, dur: 99 }); });
  await play(0.6);
  await press('[data-a="coffee"]'); ev('fanfare');
  await play(1.2);
  // 3. the Roar: everyone slacking again → one button
  await slackAll(['toptop', 'game', 'call', 'crypto', 'snack', 'sleep', 'game', 'meeting']);
  await caption(T.roar);
  await play(1.0);
  await press('[data-a="roar"]'); ev('fanfare');
  await play(1.5);
  // 4. weekly boss
  await G(() => { const g = __game.g; g.boss = { hp: 9, max: 9, t: 0, at: 2, move: 99, dodge: 0, week: 7 }; g.bossWeek = 99; });
  ev('siren');
  await caption(T.boss);
  await play(0.9);
  for (let k = 0; k < 4; k++) {
    await G(() => { if (__game.g.boss) { __game.g.boss.dodge = 0; __game.g.boss.move = 99; } });
    const p = await G(() => { const r = __game.view.bossHit; return r ? __game.view.toClient((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2) : null; });
    await tapAt(p);
    await play(0.5);
  }
  ev('fanfare');
  await play(1.4);
  // 5. the 6-room building, some rooms on alert
  await G(() => { const g = __game.g; g.staff.forEach((e) => { if (e.room > 0 && Math.random() < 0.25) Object.assign(e, { state: 'slack', slack: 'game', t: 8, dur: 99 }); }); __game.act.roomGo(-1); });
  await caption(T.building);
  await play(2.6);
  // 6. end card
  await caption(null);
  await G(() => window.__promoCard('outro'));
  ev('outro');
  await play(3.6);

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
    const o = window.__adOutro || { line: 'Catch · Whip · Keep the KPI', play: '▶ Free on Google Play', small: '12 languages' };
    if (kind === 'outro') cardEl.innerHTML = `<img class="logo" src="${logoSrc}"><img class="name" src="${titleSrc}" alt="Whip Boss"><p>${o.line}</p><div class="play">${o.play}</div><small>${o.small}</small>`;
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
