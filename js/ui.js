// DOM UI: HUD, shop, pressure leaderboard, day report and floating combat text.
import { WHIPS, COFFEE, ASSISTANT, STAFF_POOL, MAX_STAFF, OFFICE_LEVELS, DECOR_ITEMS, ROLES, RANKS, SLACKS, hireCost, TUNING } from './config.js';
import { incomeOf } from './sim.js';
import { createScreens, projectSummary } from './screens.js';
import { progressOf, penaltyOf } from './projects.js';
import { VISITS } from './config.js';
import { t, locale } from './i18n.js';
import { itemArtUrl } from './item-art.js';

export const fmt = (n) => {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString(locale());
};

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

const employeeName = (e) => e.nickname ? `${e.nickname} (${e.name})` : e.name;

export function clockText(g) {
  const mins = 9 * 60 + (g.dayTime / TUNING.dayLength) * 9 * 60;
  const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function pressureScore(e) { return e.whips * 10 + e.wrong * 25 + Math.round(e.stress); }

export function rankFor(kpi) {
  let r = RANKS[0];
  for (const x of RANKS) if (kpi * 100 >= x.min) r = x;
  return t(r.title);
}

// Pixel icons for the mobile tab bar (12x12 grid, drawn in currentColor).
const svg = (body) => `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
const r = (x, y, w, h, cls = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${cls ? ` class="${cls}"` : ''}/>`;
const ICON = {
  shop: svg(r(4, 1, 4, 1) + r(3, 2, 1, 1) + r(8, 2, 1, 1) + r(1, 3, 10, 7) + r(5, 6, 2, 1, 'cut')),
  decor: svg(r(2, 3, 8, 4) + r(0, 5, 2, 4) + r(10, 5, 2, 4) + r(2, 7, 8, 2) + r(1, 9, 1, 2) + r(10, 9, 1, 2)),
  board: svg(r(1, 10, 10, 1) + r(2, 6, 2, 4) + r(5, 2, 2, 8) + r(8, 5, 2, 5)),
  projects: svg(r(2, 1, 8, 11) + r(4, 0, 4, 2, 'cut2') + r(3, 4, 6, 1, 'cut') + r(3, 6, 6, 1, 'cut') + r(3, 8, 4, 1, 'cut')),
  vip: svg(r(3, 1, 6, 2) + r(1, 3, 10, 2) + r(2, 5, 8, 2) + r(3, 7, 6, 1) + r(4, 8, 4, 1) + r(5, 9, 2, 2) + r(4, 2, 2, 1, 'cut')),
  achievements: svg(r(3, 1, 6, 5) + r(1, 2, 2, 3) + r(9, 2, 2, 3) + r(4, 6, 4, 1) + r(5, 7, 2, 2) + r(3, 9, 6, 2) + r(5, 2, 1, 2, 'cut')),
  more: svg(r(1, 5, 2, 2) + r(5, 5, 2, 2) + r(9, 5, 2, 2)),
  sound: svg(r(1, 4, 2, 4) + r(3, 3, 1, 6) + r(4, 2, 1, 8)
    + r(7, 4, 1, 4, 'on') + r(9, 2, 1, 8, 'on')
    + [[7, 4], [8, 5], [9, 6], [10, 7], [10, 4], [9, 5], [8, 6], [7, 7]].map(([x, y]) => r(x, y, 1, 1, 'off')).join('')),
};

// Touch layout (phones). Portrait: info card on top, office in the middle, hint + coffee +
// tab bar at the bottom. Landscape fallback (tablets that ignore the orientation lock): the
// two groups become side columns. Uses the same data-k / data-a hooks as the desktop HUD,
// so update() drives both.
const MOBILE_HUD = `
    <div class="side info">
      <div class="stat money"><span class="coin"></span><b data-k="money">0</b><small data-k="rate"></small></div>
      <div class="stat day"><span data-k="day"></span><b data-k="clock">09:00</b></div>
      <div class="stat kpi"><span>KPI</span><div class="meter"><i data-k="kpiBar"></i></div><b data-k="kpi">100%</b></div>
      <button class="stat gems" data-a="vip"><span class="gem"></span><b data-k="gems">0</b></button>
      <div class="whipname" data-k="whip"></div>
      <div class="combo" data-k="combo"></div>
      <div class="assist" data-k="assist"></div>
    </div>
    <div class="side controls">
      <div class="hint" data-k="hint"></div>
      <div class="visitbar" data-k="visit" hidden></div>
      <button class="projbar" data-a="projects"><span class="pj-name" data-k="projName"></span>
        <span class="meter"><i data-k="projBar"></i></span><span class="pj-due" data-k="projDue"></span></button>
      <button class="px-btn coffee" data-a="coffee" data-k="coffee" hidden></button>
      <nav class="tabbar">
        <button class="tab" data-a="shop">${ICON.shop}<span>${t('Quản lý')}</span></button>
        <button class="tab" data-a="projects">${ICON.projects}<span>${t('Dự án')}</span><i class="dot" data-k="dotProjects" hidden></i></button>
        <button class="tab" data-a="vip">${ICON.vip}<span>${t('Kim cương')}</span></button>
        <button class="tab" data-a="achievements">${ICON.achievements}<span>${t('Thành tựu')}</span><i class="dot" data-k="dotAch" hidden></i></button>
        <button class="tab" data-a="more">${ICON.more}<span>${t('Thêm')}</span></button>
      </nav>
    </div>
    <div class="tag" data-k="tag" hidden></div>`;

/** Short coaching line under the office for new players (mobile only). */
function hintText(g) {
  const n = g.records.totalWhips;
  if (n < 3) return t('Chạm vào người có bong bóng để quất!');
  if (n < 8) return t('Đừng quất oan người đang làm việc!');
  return '';
}

export function createUI(root, g, act, { mobile = false } = {}) {
  const { hud, fx, panel, modal } = root;
  let panelOpen = false, lastPanelSig = '';
  const screens = createScreens({ g, act, modal, fmt, esc, mobile });

  hud.innerHTML = mobile ? MOBILE_HUD : `
    <div class="bar top">
      <div class="grip" title="${t('Giữ chuột và kéo để di chuyển game (thả gần taskbar sẽ tự hít vào)')}"></div>
      <div class="stat money"><span class="coin"></span><b data-k="money">0</b><small data-k="rate"></small></div>
      <div class="stat kpi"><span>KPI</span><div class="meter"><i data-k="kpiBar"></i></div><b data-k="kpi">100%</b></div>
      <div class="stat day"><span data-k="day"></span><b data-k="clock">09:00</b></div>
      <button class="stat gems" data-a="vip"><span class="gem"></span><b data-k="gems">0</b></button>
      <div class="spacer"></div>
      <button class="px-btn" data-a="shop">${t('Quản lý')}</button>
      <button class="px-btn" data-a="projects">${t('Dự án')}</button>
      <button class="px-btn" data-a="achievements">${t('Thành tựu')} <i class="dot" data-k="dotAch" hidden></i></button>
      <button class="px-btn" data-a="decor">${t('Nội thất')}</button>
      <button class="px-btn" data-a="board">${t('Áp lực')}</button>
      <button class="px-btn" data-a="more">${t('Thêm')}</button>
      <button class="px-btn" data-a="mode" data-k="modeBtn"></button>
      <button class="px-btn" data-a="pip" data-k="pipBtn" hidden>${t('Ghim nổi')}</button>
      <button class="px-btn icon" data-a="mute" data-k="mute" title="${t('Âm thanh')}">♪</button>
      <button class="px-btn icon quit" data-a="quit" title="${t('Thoát game')}">×</button>
    </div>
    <div class="bar bottom">
      <div class="whipname" data-k="whip"></div>
      <div class="combo" data-k="combo"></div>
      <div class="spacer"></div>
      <div class="assist" data-k="assist"></div>
      <div class="visitbar" data-k="visit" hidden></div>
      <button class="px-btn coffee" data-a="coffee" data-k="coffee" hidden></button>
    </div>
    <div class="tag" data-k="tag" hidden></div>`;

  const K = {};
  hud.querySelectorAll('[data-k]').forEach((el) => (K[el.dataset.k] = el));
  const onClick = (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    e.stopPropagation();
    const a = b.dataset.a;
    if (a === 'shop') togglePanel();
    else if (a === 'board') showBoard();
    else if (screens[a] && ['projects', 'vip', 'achievements', 'more', 'staff'].includes(a)) { ui.closePanel(); screens[a](); }
    else act[a] && act[a](b.dataset.arg);
  };
  hud.addEventListener('click', onClick);
  panel.addEventListener('click', onClick);
  modal.addEventListener('click', onClick);
  // Stop HUD/panel pointer events from reaching the canvas whip handler.
  for (const el of [hud, panel, modal]) el.addEventListener('pointerdown', (e) => { if (e.target.closest('button, .panel, .card')) e.stopPropagation(); });

  function set(el, text) { if (el && el.textContent !== text) el.textContent = text; }

  const ui = {
    setPipAvailable(ok) { if (K.pipBtn) K.pipBtn.hidden = !ok; },

    update() {
      const rate = g.staff.reduce((s, e) => s + incomeOf(g, e), 0);
      set(K.money, fmt(g.money) + ' đ');
      set(K.rate, `+${fmt(rate)}/s`);
      const kpi = Math.round(g.kpi * 100);
      set(K.kpi, kpi + '%');
      K.kpiBar.style.width = kpi + '%';
      K.kpiBar.className = kpi >= 75 ? 'good' : kpi >= 50 ? 'mid' : 'bad';
      set(K.day, t('Ngày {n}', { n: g.day }));
      set(K.clock, clockText(g));
      set(K.whip, t(WHIPS[g.whipLevel].name));
      set(K.combo, g.combo > 1 ? `COMBO x${g.combo}` : '');
      set(K.modeBtn, g.mode === 'office' ? t('Thu nhỏ') : t('Văn phòng'));
      set(K.mute, g.muted ? '×' : '♪');
      if (mobile) { hud.classList.toggle('muted', g.muted); set(K.hint, hintText(g)); }
      if (g.coffeeLevel >= 0) {
        K.coffee.hidden = false;
        const ready = g.coffeeCd <= 0;
        K.coffee.disabled = !ready;
        set(K.coffee, ready ? t('Cà phê sốc') : t('Cà phê {s}s', { s: Math.ceil(g.coffeeCd) }));
      }
      const cd = Math.max(0, Math.ceil(g.assistantCd));
      set(K.assist, g.assistantLevel < 0 ? '' : mobile ? t('Trợ lý: {s}s', { s: cd }) : t('Trợ lý Lv{lv} · {s}s', { lv: g.assistantLevel + 1, s: cd }));
      set(K.gems, String(g.gems));
      const pj = projectSummary(g);
      if (K.projName) {
        set(K.projName, pj ? t(pj.name) : t('Chưa có dự án'));
        const offers = g.projects.offers.length;
        set(K.projDue, pj ? `${Math.floor(pj.frac * 100)}% · ${pj.due}` : offers ? t('{n} hợp đồng đang chờ', { n: offers }) : t('Hết hợp đồng hôm nay'));
        K.projBar.style.width = pj ? Math.round(pj.frac * 100) + '%' : '0%';
        K.projName.parentElement.classList.toggle('idle', !pj);
      }
      const badges = screens.badges();
      if (K.dotAch) { K.dotAch.hidden = !badges.achievements; K.dotAch.textContent = badges.achievements || ''; }
      if (K.dotProjects) { K.dotProjects.hidden = !badges.projects; K.dotProjects.textContent = badges.projects || ''; }
      if (K.visit) {
        const v = g.visit;
        K.visit.hidden = !v;
        if (v) {
          const left = Math.max(0, Math.ceil(VISITS.duration - v.t));
          const k = VISITS.kinds[v.kind];
          const lookAway = v.kind === 'labour' && !v.watching && v.t >= 3;
          set(K.visit, `${t(k.name)} · ${lookAway ? t('Đang lướt điện thoại, quất nhanh!') : t(k.rule)} · ${left}s`);
          K.visit.classList.toggle('safe', lookAway);
        }
      }
      if (panelOpen) renderPanel();
      screens.tick();
    },

    /** Floating text at client coords. */
    popup(x, y, text, cls = '') {
      const el = document.createElement('div');
      el.className = 'pop ' + cls;
      el.textContent = text;
      const r = root.stage.getBoundingClientRect();
      el.style.top = Math.max(20, y - r.top) + 'px';
      fx.appendChild(el);
      // keep the whole text on screen (it is centred on x), also on narrow phones
      const half = Math.min(r.width / 2, el.offsetWidth / 2 + 6);
      el.style.left = Math.max(half, Math.min(r.width - half, x - r.left)) + 'px';
      setTimeout(() => el.remove(), 1300);
    },

    flash(kind) {
      root.stage.classList.remove('hit', 'wrong');
      void root.stage.offsetWidth;
      root.stage.classList.add(kind);
    },

    tag(x, y, e) {
      if (!e) { K.tag.hidden = true; return; }
      K.tag.hidden = false;
      const status = e.state === 'slack' ? t(SLACKS[e.slack].label) : e.state === 'strike' ? t('Đình công!') : e.state === 'angry' ? t('Ức chế') : t('Đang làm');
      K.tag.innerHTML = `<b>${esc(employeeName(e))}</b> · ${t(ROLES[e.role].label)}<br><span class="${e.state === 'slack' ? 'bad' : ''}">${status}</span>`;
      const r = root.stage.getBoundingClientRect();
      K.tag.style.left = x - r.left + 'px';
      K.tag.style.top = y - r.top + 'px';
    },

    /** End-of-day card. extras: { overdue, canExtend } from main.js. Ad buttons re-render it. */
    showReport(done) {
      reportDone = done;
      renderReport();
      act.nextDay = () => { modal.hidden = true; act.nextDay = null; reportDone = null; done(); };
    },
    refreshReport() { if (reportDone && !modal.hidden) renderReport(); },

    closePanel() { panelOpen = false; panel.hidden = true; },

    /** Pause card over everything (own layer, so an open dialog underneath is kept). */
    showPause(onResume) {
      let el = document.getElementById('pause');
      if (!el) {
        el = document.createElement('div');
        el.id = 'pause';
        document.body.appendChild(el);
        el.addEventListener('pointerdown', (e) => e.stopPropagation());
      }
      el.innerHTML = `<div class="pause-card">
          <div class="pause-icon"><i></i><i></i></div>
          <h2>${t('Tạm dừng')}</h2>
          <p>${t('Văn phòng đang tạm nghỉ, không ai lười được đâu.')}</p>
          <div class="pause-stats">${t('Ngày {n}', { n: g.day })} · ${clockText(g)} · ${fmt(g.money)} đ</div>
          <button class="px-btn big" data-resume>${t('Tiếp tục')}</button>
        </div>`;
      el.hidden = false;
      el.querySelector('[data-resume]').addEventListener('click', () => { el.hidden = true; onResume(); }, { once: true });
    },
    openShop() { if (!panelOpen) togglePanel(); },

    /**
     * Project reward card (own layer above dialogs, below ads and the pause card). Nothing is
     * paid until the player taps a button: data-a="projCollect" (x1) or "projDouble" (ad, x2 money).
     */
    showProjectReward(p) {
      let el = document.getElementById('reward');
      if (!el) {
        el = document.createElement('div');
        el.id = 'reward';
        document.body.appendChild(el);
        el.addEventListener('click', onClick);
        el.addEventListener('pointerdown', (e) => e.stopPropagation());
      }
      const early = p.deadline - (p.finishedDay ?? p.deadline);
      el.innerHTML = `<div class="reward-card">
          <div class="reward-rays"></div>
          <img class="reward-art" src="${itemArtUrl('trophy')}" alt="">
          <h2>${t('DỰ ÁN HOÀN THÀNH!')}</h2>
          <div class="reward-proj"><b>${esc(t(p.name))}</b><br>${t('Khách hàng: {c}', { c: esc(t(p.client)) })}
            ${early > 0 ? `<br><span class="reward-early">${t('Xong sớm {n} ngày!', { n: early })}</span>` : ''}</div>
          <div class="reward-list">
            <div class="reward-item"><span class="coin"></span><b data-count="${p.money}">+0 đ</b></div>
            <div class="reward-item"><span class="gem"></span><b>+${p.gems}</b></div>
          </div>
          <button class="px-btn ad wide" data-a="projDouble">▶ ${t('Xem quảng cáo: nhận x2 tiền (+{m} đ)', { m: fmt(p.money) })}</button>
          <button class="px-btn big" data-a="projCollect">${t('Nhận thưởng')}</button>
        </div>`;
      el.hidden = false;
      // count the money up
      const b = el.querySelector('[data-count]'), total = p.money, t0 = performance.now();
      const tick = (now) => {
        if (el.hidden || !b.isConnected) return;
        const k = Math.min(1, (now - t0) / 700);
        b.textContent = `+${fmt(total * (1 - (1 - k) ** 3))} đ`;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    hideProjectReward() { const el = document.getElementById('reward'); if (el) el.hidden = true; },
  };

  let reportDone = null;
  function renderReport() {
    const day = g.today;
    const avg = day.kpiN ? day.kpiSum / day.kpiN : g.kpi;
    const title = rankFor(avg);
    const p = g.projects.active;
    let proj = '';
    if (p) {
      const pct = Math.floor(progressOf(p) * 100);
      proj = g.day >= p.deadline
        ? `<div class="report-proj warn">${t('Dự án <b>{name}</b> mới xong {pct}% và hết hạn hôm nay!', { name: esc(t(p.name)), pct })}
            <br><b class="penalty">${t('Nếu thất bại: phạt hợp đồng {m} đ', { m: fmt(Math.min(g.money, penaltyOf(p))) })}</b>
            ${p.extended ? '<br>' + t('Đã gia hạn 1 lần, sang ngày mới dự án sẽ thất bại.') : `<br><button class="px-btn ad" data-a="adExtend">▶ ${t('Xem quảng cáo: gia hạn +1 ngày')}</button>`}</div>`
        : `<div class="report-proj">${t('Dự án <b>{name}</b>: {pct}% · hạn hết ngày {d}', { name: esc(t(p.name)), pct, d: p.deadline })}</div>`;
    }
    modal.hidden = false;
    modal.innerHTML = `
        <div class="card report">
          <h2>${t('Tan ca · Ngày {n}', { n: g.day })}</h2>
          <div class="rank">${title}</div>
          <table>
            <tr><td>${t('Doanh thu')}</td><td>${fmt(day.revenue)} đ</td></tr>
            <tr><td>${t('KPI trung bình')}</td><td>${Math.round(avg * 100)}%</td></tr>
            <tr><td>${t('Bắt quả tang')}</td><td>${day.catches}</td></tr>
            <tr><td>${t('Quất oan')}</td><td>${day.wrong}</td></tr>
            <tr><td>${t('Combo cao nhất')}</td><td>x${day.bestCombo}</td></tr>
          </table>
          ${proj}
          ${day.doubled ? `<div class="report-bonus">${t('Đã nhận thưởng quảng cáo ✓')}</div>`
            : `<button class="px-btn ad wide" data-a="adDouble">▶ ${t('Xem quảng cáo: nhận thêm {m} đ', { m: fmt(day.revenue) })}</button>`}
          <button class="px-btn big" data-a="nextDay">${t('Ngày làm việc mới')}</button>
        </div>`;
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    panel.hidden = !panelOpen;
    lastPanelSig = '';
    if (panelOpen) renderPanel();
  }

  const artBox = (id) => `<div class="item-art"><img src="${itemArtUrl(id)}" alt=""></div>`;
  function item(key, title, desc, cost, owned, maxed, disabledLabel = t('Tối đa'), art = key) {
    const can = !maxed && g.money >= cost;
    return `<div class="item has-art ${maxed ? 'maxed' : ''}">
      ${artBox(art)}
      <div class="info"><div class="title">${title}</div><div class="desc">${desc}</div></div>
      <button class="px-btn buy" data-a="buy" data-arg="${key}" ${can ? '' : 'disabled'}>${maxed ? disabledLabel : fmt(cost) + ' đ'}</button>
    </div>`;
  }

  function renderPanel() {
    // the 💎 whip is sold in the Kim cương shop, not here
    const wl = g.whipLevel, next = WHIPS[wl + 1] && !WHIPS[wl + 1].premium ? WHIPS[wl + 1] : null;
    const cl = g.coffeeLevel, al = g.assistantLevel;
    const n = g.staff.length, hire = STAFF_POOL[n];
    const office = OFFICE_LEVELS[g.officeLevel], nextOffice = OFFICE_LEVELS[g.officeLevel + 1];
    const officeReady = nextOffice && (g.lifetimeEarnings || 0) >= nextOffice.unlockRevenue;
    const affordability = [
      next && g.money >= next.cost,
      COFFEE[cl + 1] && g.money >= COFFEE[cl + 1].cost,
      ASSISTANT[al + 1] && g.money >= ASSISTANT[al + 1].cost,
      nextOffice && g.money >= nextOffice.cost,
    ].map(Boolean).join(',');
    const sig = [wl, cl, al, n, g.officeLevel, !!officeReady, affordability, g.candidates.length].join('|');
    if (sig === lastPanelSig) {
      const money = panel.querySelector('[data-panel-money]');
      if (money) money.textContent = `${fmt(g.money)} đ`;
      return;
    }
    const html = [
      `<div class="panel-head"><h2>${t('Nâng cấp & Quản lý')}</h2><button class="px-btn icon" data-a="shop">×</button></div>`,
      `<div class="money-line">${t('Quỹ:')} <b data-panel-money>${fmt(g.money)} đ</b></div>`,
      item('office',
        nextOffice ? `${t(office.name)} → ${t(nextOffice.name)}` : t(office.name),
        nextOffice
          ? (officeReady ? t('Đã đạt mốc doanh thu · mở {n} bàn làm việc.', { n: nextOffice.capacity }) : t('Cần tổng doanh thu {need} đ · hiện có {have} đ.', { need: fmt(nextOffice.unlockRevenue), have: fmt(g.lifetimeEarnings || 0) }))
          : t('Trụ sở tối đa · {n} bàn làm việc.', { n: office.capacity }),
        nextOffice ? nextOffice.cost : 0, true, !nextOffice || !officeReady, nextOffice ? t('Chưa đạt') : t('Tối đa'), `office:${nextOffice ? g.officeLevel + 1 : g.officeLevel}`),
      item('whip',
        next ? `${t('Roi:')} ${t(WHIPS[wl].name)} → ${t(next.name)}` : `${t('Roi:')} ${t(WHIPS[wl].name)}`,
        next ? t('Thưởng bắt quả tang {a} → {b} đ · hăng say {s}s · tầm quất rộng hơn', { a: WHIPS[wl].bonus, b: next.bonus, s: next.boost }) : t('Cây roi tối thượng. Cả văn phòng run rẩy.'),
        next ? next.cost : 0, true, !next, undefined, `whip:${next ? wl + 1 : wl}`),
      hire ? `<div class="item has-art">
        ${artBox('hire')}
        <div class="info"><div class="title">${t('Tuyển dụng · {n} CV đang chờ', { n: g.candidates.length })}</div>
        <div class="desc">${n < office.capacity ? t('{n}/{cap} bàn đã có người. Đọc CV và chọn người phù hợp.', { n, cap: office.capacity }) : t('Hết bàn ({n}/{cap}). Mở rộng văn phòng để tuyển thêm.', { n, cap: office.capacity })}</div></div>
        <button class="px-btn buy" data-a="interview">${t('Xem CV')}</button>
      </div>` : item('hire', t('Văn phòng đã kín chỗ'), t('{n}/{n} bàn', { n: MAX_STAFF }), 0, false, true, t('Hết chỗ')),
      `<div class="item has-art">
        ${artBox('staff')}
        <div class="info"><div class="title">${t('Nhân sự · {n} người', { n })}</div>
        <div class="desc">${t('Khen thưởng, tăng lương, liên hoan hoặc sa thải nhân viên.')}</div></div>
        <button class="px-btn buy" data-a="staff">${t('Mở')}</button>
      </div>`,
      item('coffee',
        cl < 0 ? t('Mua máy pha cà phê') : COFFEE[cl + 1] ? t('Máy cà phê Lv{a} → Lv{b}', { a: cl + 1, b: cl + 2 }) : t('Máy cà phê Lv{a}', { a: cl + 1 }),
        COFFEE[cl + 1] ? t('Nút "Cà phê sốc": +55 năng lượng, −30 áp lực, đánh thức kẻ ngủ gật. Hồi chiêu {s}s.', { s: COFFEE[cl + 1].cooldown }) : t('Espresso cấp công nghiệp.'),
        COFFEE[cl + 1] ? COFFEE[cl + 1].cost : 0, cl >= 0, !COFFEE[cl + 1], undefined, `coffee:${COFFEE[cl + 1] ? cl + 1 : cl}`),
      item('assistant',
        al < 0 ? t('Thuê Trợ lý giám sát') : ASSISTANT[al + 1] ? t('Trợ lý Lv{a} → Lv{b}', { a: al + 1, b: al + 2 }) : t('Trợ lý Lv{a}', { a: al + 1 }),
        ASSISTANT[al + 1] ? t('Tự quất kẻ lười mỗi {s}s (nửa tiền thưởng). Chạy cả khi bạn bận.', { s: ASSISTANT[al + 1].interval }) : t('Mắt diều hâu, không bỏ sót ai.'),
        ASSISTANT[al + 1] ? ASSISTANT[al + 1].cost : 0, al >= 0, !ASSISTANT[al + 1], undefined, `assistant:${ASSISTANT[al + 1] ? al + 1 : al}`),
      `<div class="panel-foot"><button class="px-btn danger" data-a="reset">${t('Chơi lại từ đầu')}</button></div>`,
    ].join('');
    panel.innerHTML = `<div class="panel">${html}</div>`;
    lastPanelSig = sig;
  }

  function showDecorStore() {
    modal.hidden = false;
    const rows = DECOR_ITEMS.map((item) => {
      const owned = g.decor.includes(item.id);
      const locked = g.officeLevel < item.level;
      const can = !owned && !locked && g.money >= item.cost;
      return `<div class="decor-row ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}">
        <div class="item-art">${itemArtUrl(item.id) ? `<img src="${itemArtUrl(item.id)}" alt="">` : `<div class="decor-preview decor-${item.id}" aria-hidden="true"></div>`}${owned ? '<i>✓</i>' : ''}</div>
        <div class="info"><div class="title">${t(item.name)}</div><div class="desc">${locked ? t('Cần văn phòng cấp {n}.', { n: item.level + 1 }) : t(item.desc)}</div></div>
        <button class="px-btn buy" data-a="buyDecor" data-arg="${item.id}" ${can ? '' : 'disabled'}>${owned ? t('Đã đặt') : fmt(item.cost) + ' đ'}</button>
      </div>`;
    }).join('');
    modal.innerHTML = `<div class="card decor-store">
      <div class="panel-head"><div><h2>${t('Cửa hàng nội thất')}</h2><small>${t(OFFICE_LEVELS[g.officeLevel].name)} · ${t('Quỹ')} ${fmt(g.money)} đ</small></div><button class="px-btn icon" data-a="closeModal">×</button></div>
      <div class="decor-list">${rows}</div>
    </div>`;
    act.closeModal = () => { modal.hidden = true; };
  }

  function showBoard() {
    const rows = [...g.staff].sort((a, b) => pressureScore(b) - pressureScore(a));
    const r = g.records;
    modal.hidden = false;
    modal.innerHTML = `
      <div class="card board">
        <div class="panel-head"><h2>${t('Bảng xếp hạng áp lực')}</h2><button class="px-btn icon" data-a="closeModal">×</button></div>
        <table>
          <tr class="th"><td>#</td><td>${t('Nhân viên')}</td><td>${t('Roi')}</td><td>${t('Oan')}</td><td>${t('Áp lực')}</td><td></td></tr>
          ${rows.map((e, i) => `<tr>
            <td>${i + 1}</td>
            <td><span class="dot" style="background:${e.look.shirt}"></span>${esc(employeeName(e))} <small>${t(ROLES[e.role].label)}</small></td>
            <td>${e.whips}</td><td>${e.wrong}</td>
            <td><div class="meter small"><i class="${e.stress > 75 ? 'bad' : e.stress > 40 ? 'mid' : 'good'}" style="width:${Math.min(100, e.stress)}%"></i></div></td>
            <td><button class="px-btn nick-btn" data-a="nickname" data-arg="${e.id}">${t('Đặt tên')}</button></td>
          </tr>`).join('')}
        </table>
        <h3>${t('Kỷ lục của Sếp')}</h3>
        <table>
          <tr><td>${t('Tổng số roi đã quất')}</td><td>${r.totalWhips}</td></tr>
          <tr><td>${t('Combo cao nhất')}</td><td>x${r.bestCombo}</td></tr>
          ${r.bestDays.map((d, i) => `<tr><td>${t('Top {i}: Ngày {d}', { i: i + 1, d: d.day })}</td><td>${fmt(d.revenue)} đ · KPI ${d.kpi}%</td></tr>`).join('')}
        </table>
      </div>`;
    act.closeModal = () => { modal.hidden = true; };
  }

  let nickFrom = 'board';
  function showNickname(id) {
    nickFrom = screens.open === 'staff' ? 'staff' : 'board';
    screens.close();
    const employee = g.staff.find((e) => e.id === Number(id));
    if (!employee) return;
    modal.hidden = false;
    modal.innerHTML = `
      <div class="card nickname-card">
        <div class="panel-head"><h2>${t('Đặt biệt danh')}</h2><button class="px-btn icon" data-a="closeModal">×</button></div>
        <p>${t('Tên thật:')} <b>${esc(employee.name)}</b> · ${t(ROLES[employee.role].label)}</p>
        <form id="nickname-form">
          <input name="nickname" maxlength="20" required value="${esc(employee.nickname)}" placeholder="${t('Nhập biệt danh')}">
          <button class="px-btn big" type="submit">${t('Lưu biệt danh')}</button>
        </form>
      </div>`;
    const form = modal.querySelector('#nickname-form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (act.setNickname(employee.id, new FormData(form).get('nickname'))) (nickFrom === 'staff' ? screens.staff() : showBoard());
    });
    form.elements.nickname.focus();
  }

  act.interview = () => { ui.closePanel(); screens.cv(); };
  ui.screens = screens;
  act.nickname = showNickname;
  act.decor = showDecorStore;
  act.buyDecor = (id) => { act.purchaseDecor(id); showDecorStore(); };

  return ui;
}
