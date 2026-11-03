// DOM UI: HUD, shop, pressure leaderboard, day report and floating combat text.
import { WHIPS, COFFEE, ASSISTANT, STAFF_POOL, MAX_STAFF, OFFICE_LEVELS, DECOR_ITEMS, ROLES, RANKS, SLACKS, hireCost, TUNING } from './config.js';
import { incomeOf } from './sim.js';
import { createScreens, projectSummary } from './screens.js';
import { progressOf } from './projects.js';

export const fmt = (n) => {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('vi-VN');
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
  return r.title;
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
      <div class="stat day"><span data-k="day">Ngày 1</span><b data-k="clock">09:00</b></div>
      <div class="stat kpi"><span>KPI</span><div class="meter"><i data-k="kpiBar"></i></div><b data-k="kpi">100%</b></div>
      <button class="stat gems" data-a="vip"><span class="gem"></span><b data-k="gems">0</b></button>
      <div class="whipname" data-k="whip"></div>
      <div class="combo" data-k="combo"></div>
      <div class="assist" data-k="assist"></div>
    </div>
    <div class="side controls">
      <div class="hint" data-k="hint"></div>
      <button class="projbar" data-a="projects"><span class="pj-name" data-k="projName">Chưa có dự án</span>
        <span class="meter"><i data-k="projBar"></i></span><span class="pj-due" data-k="projDue">Chạm để nhận việc</span></button>
      <button class="px-btn coffee" data-a="coffee" data-k="coffee" hidden>Cà phê sốc</button>
      <nav class="tabbar">
        <button class="tab" data-a="shop">${ICON.shop}<span>Quản lý</span></button>
        <button class="tab" data-a="projects">${ICON.projects}<span>Dự án</span><i class="dot" data-k="dotProjects" hidden></i></button>
        <button class="tab" data-a="vip">${ICON.vip}<span>Kim cương</span></button>
        <button class="tab" data-a="achievements">${ICON.achievements}<span>Thành tựu</span><i class="dot" data-k="dotAch" hidden></i></button>
        <button class="tab" data-a="more">${ICON.more}<span>Thêm</span></button>
      </nav>
    </div>
    <div class="tag" data-k="tag" hidden></div>`;

/** Short coaching line under the office for new players (mobile only). */
function hintText(g) {
  const n = g.records.totalWhips;
  if (n < 3) return 'Chạm vào người có bong bóng để quất!';
  if (n < 8) return 'Đừng quất oan người đang làm việc!';
  return '';
}

export function createUI(root, g, act, { mobile = false } = {}) {
  const { hud, fx, panel, modal } = root;
  let panelOpen = false, lastPanelSig = '';
  const screens = createScreens({ g, act, modal, fmt, esc });

  hud.innerHTML = mobile ? MOBILE_HUD : `
    <div class="bar top">
      <div class="grip" title="Giữ chuột và kéo để di chuyển game (thả gần taskbar sẽ tự hít vào)"></div>
      <div class="stat money"><span class="coin"></span><b data-k="money">0</b><small data-k="rate"></small></div>
      <div class="stat kpi"><span>KPI</span><div class="meter"><i data-k="kpiBar"></i></div><b data-k="kpi">100%</b></div>
      <div class="stat day"><span data-k="day">Ngày 1</span><b data-k="clock">09:00</b></div>
      <button class="stat gems" data-a="vip"><span class="gem"></span><b data-k="gems">0</b></button>
      <div class="spacer"></div>
      <button class="px-btn" data-a="shop">Quản lý</button>
      <button class="px-btn" data-a="projects">Dự án</button>
      <button class="px-btn" data-a="achievements">Thành tựu <i class="dot" data-k="dotAch" hidden></i></button>
      <button class="px-btn" data-a="decor">Nội thất</button>
      <button class="px-btn" data-a="board">Áp lực</button>
      <button class="px-btn" data-a="mode" data-k="modeBtn">Thu nhỏ</button>
      <button class="px-btn" data-a="pip" data-k="pipBtn" hidden>Ghim nổi</button>
      <button class="px-btn icon" data-a="mute" data-k="mute" title="Âm thanh">♪</button>
      <button class="px-btn icon quit" data-a="quit" title="Thoát game">×</button>
    </div>
    <div class="bar bottom">
      <div class="whipname" data-k="whip"></div>
      <div class="combo" data-k="combo"></div>
      <div class="spacer"></div>
      <div class="assist" data-k="assist"></div>
      <button class="px-btn coffee" data-a="coffee" data-k="coffee" hidden>Cà phê sốc</button>
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
    else if (screens[a] && ['projects', 'vip', 'achievements', 'more'].includes(a)) { ui.closePanel(); screens[a](); }
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
      set(K.day, `Ngày ${g.day}`);
      set(K.clock, clockText(g));
      set(K.whip, WHIPS[g.whipLevel].name);
      set(K.combo, g.combo > 1 ? `COMBO x${g.combo}` : '');
      set(K.modeBtn, g.mode === 'office' ? 'Thu nhỏ' : 'Văn phòng');
      set(K.mute, mobile ? (g.muted ? 'Âm: Tắt' : 'Âm: Bật') : g.muted ? '×' : '♪');
      if (mobile) { hud.classList.toggle('muted', g.muted); set(K.hint, hintText(g)); }
      if (g.coffeeLevel >= 0) {
        K.coffee.hidden = false;
        const ready = g.coffeeCd <= 0;
        K.coffee.disabled = !ready;
        set(K.coffee, ready ? 'Cà phê sốc' : `Cà phê ${Math.ceil(g.coffeeCd)}s`);
      }
      const cd = Math.max(0, Math.ceil(g.assistantCd));
      set(K.assist, g.assistantLevel < 0 ? '' : mobile ? `Trợ lý: ${cd}s` : `Trợ lý Lv${g.assistantLevel + 1} · ${cd}s`);
      set(K.gems, String(g.gems));
      const pj = projectSummary(g);
      if (K.projName) {
        set(K.projName, pj ? pj.name : 'Chưa có dự án');
        set(K.projDue, pj ? `${Math.floor(pj.frac * 100)}% · ${pj.due}` : 'Chạm để nhận việc');
        K.projBar.style.width = pj ? Math.round(pj.frac * 100) + '%' : '0%';
        K.projName.parentElement.classList.toggle('idle', !pj);
      }
      const badges = screens.badges();
      if (K.dotAch) { K.dotAch.hidden = !badges.achievements; K.dotAch.textContent = badges.achievements || ''; }
      if (K.dotProjects) K.dotProjects.hidden = !badges.projects;
      if (panelOpen) renderPanel();
      screens.tick();
    },

    /** Floating text at client coords. */
    popup(x, y, text, cls = '') {
      const el = document.createElement('div');
      el.className = 'pop ' + cls;
      el.textContent = text;
      const r = root.stage.getBoundingClientRect();
      el.style.left = Math.max(60, Math.min(r.width - 60, x - r.left)) + 'px';
      el.style.top = Math.max(20, y - r.top) + 'px';
      fx.appendChild(el);
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
      const status = e.state === 'slack' ? SLACKS[e.slack].label : e.state === 'strike' ? 'Đình công!' : e.state === 'angry' ? 'Ức chế' : 'Đang làm';
      K.tag.innerHTML = `<b>${esc(employeeName(e))}</b> · ${ROLES[e.role].label}<br><span class="${e.state === 'slack' ? 'bad' : ''}">${status}</span>`;
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
    openShop() { if (!panelOpen) togglePanel(); },
  };

  let reportDone = null;
  function renderReport() {
    const t = g.today;
    const avg = t.kpiN ? t.kpiSum / t.kpiN : g.kpi;
    const title = rankFor(avg);
    const p = g.projects.active;
    let proj = '';
    if (p) {
      const pct = Math.floor(progressOf(p) * 100);
      proj = g.day >= p.deadline
        ? `<div class="report-proj warn">Dự án <b>${esc(p.name)}</b> mới xong ${pct}% và hết hạn hôm nay!
            ${p.extended ? '<br>Đã gia hạn 1 lần, sang ngày mới dự án sẽ thất bại.' : '<br><button class="px-btn ad" data-a="adExtend">▶ Xem quảng cáo: gia hạn +1 ngày</button>'}</div>`
        : `<div class="report-proj">Dự án <b>${esc(p.name)}</b>: ${pct}% · hạn hết ngày ${p.deadline}</div>`;
    }
    modal.hidden = false;
    modal.innerHTML = `
        <div class="card report">
          <h2>Tan ca · Ngày ${g.day}</h2>
          <div class="rank">${title}</div>
          <table>
            <tr><td>Doanh thu</td><td>${fmt(t.revenue)} đ</td></tr>
            <tr><td>KPI trung bình</td><td>${Math.round(avg * 100)}%</td></tr>
            <tr><td>Bắt quả tang</td><td>${t.catches}</td></tr>
            <tr><td>Quất oan</td><td>${t.wrong}</td></tr>
            <tr><td>Combo cao nhất</td><td>x${t.bestCombo}</td></tr>
          </table>
          ${proj}
          ${t.doubled ? '<div class="report-bonus">Đã nhận thưởng quảng cáo ✓</div>'
            : `<button class="px-btn ad wide" data-a="adDouble">▶ Xem quảng cáo: nhận thêm ${fmt(t.revenue)} đ</button>`}
          <button class="px-btn big" data-a="nextDay">Ngày làm việc mới</button>
        </div>`;
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    panel.hidden = !panelOpen;
    lastPanelSig = '';
    if (panelOpen) renderPanel();
  }

  function item(key, title, desc, cost, owned, maxed, disabledLabel = 'Tối đa') {
    const can = !maxed && g.money >= cost;
    return `<div class="item ${maxed ? 'maxed' : ''}">
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
      `<div class="panel-head"><h2>Nâng cấp & Quản lý</h2><button class="px-btn icon" data-a="shop">×</button></div>`,
      `<div class="money-line">Quỹ: <b data-panel-money>${fmt(g.money)} đ</b></div>`,
      item('office',
        nextOffice ? `${office.name} → ${nextOffice.name}` : office.name,
        nextOffice
          ? (officeReady ? `Đã đạt mốc doanh thu · mở ${nextOffice.capacity} bàn làm việc.` : `Cần tổng doanh thu ${fmt(nextOffice.unlockRevenue)} đ · hiện có ${fmt(g.lifetimeEarnings || 0)} đ.`)
          : `Trụ sở tối đa · ${office.capacity} bàn làm việc.`,
        nextOffice ? nextOffice.cost : 0, true, !nextOffice || !officeReady, nextOffice ? 'Chưa đạt' : 'Tối đa'),
      item('whip',
        next ? `Roi: ${WHIPS[wl].name} → ${next.name}` : `Roi: ${WHIPS[wl].name}`,
        next ? `Thưởng bắt quả tang ${WHIPS[wl].bonus} → ${next.bonus} đ · hăng say ${next.boost}s · tầm quất rộng hơn` : 'Cây roi tối thượng. Cả văn phòng run rẩy.',
        next ? next.cost : 0, true, !next),
      hire ? `<div class="item">
        <div class="info"><div class="title">Tuyển dụng · ${g.candidates.length} CV đang chờ</div>
        <div class="desc">${n < office.capacity ? `${n}/${office.capacity} bàn đã có người. Đọc CV và chọn người phù hợp.` : `Hết bàn (${n}/${office.capacity}). Mở rộng văn phòng để tuyển thêm.`}</div></div>
        <button class="px-btn buy" data-a="interview">Xem CV</button>
      </div>` : item('hire', 'Văn phòng đã kín chỗ', `${MAX_STAFF}/${MAX_STAFF} bàn`, 0, false, true, 'Hết chỗ'),
      item('coffee',
        cl < 0 ? 'Mua máy pha cà phê' : COFFEE[cl + 1] ? `Máy cà phê Lv${cl + 1} → Lv${cl + 2}` : `Máy cà phê Lv${cl + 1}`,
        COFFEE[cl + 1] ? `Nút "Cà phê sốc": +55 năng lượng, −30 áp lực, đánh thức kẻ ngủ gật. Hồi chiêu ${COFFEE[cl + 1].cooldown}s.` : 'Espresso cấp công nghiệp.',
        COFFEE[cl + 1] ? COFFEE[cl + 1].cost : 0, cl >= 0, !COFFEE[cl + 1]),
      item('assistant',
        al < 0 ? 'Thuê Trợ lý giám sát' : ASSISTANT[al + 1] ? `Trợ lý Lv${al + 1} → Lv${al + 2}` : `Trợ lý Lv${al + 1}`,
        ASSISTANT[al + 1] ? `Tự quất kẻ lười mỗi ${ASSISTANT[al + 1].interval}s (nửa tiền thưởng). Chạy cả khi bạn bận.` : 'Mắt diều hâu, không bỏ sót ai.',
        ASSISTANT[al + 1] ? ASSISTANT[al + 1].cost : 0, al >= 0, !ASSISTANT[al + 1]),
      `<div class="panel-foot"><button class="px-btn danger" data-a="reset">Chơi lại từ đầu</button></div>`,
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
        <div class="decor-preview decor-${item.id}" aria-hidden="true"></div>
        <div class="info"><div class="title">${item.name}</div><div class="desc">${locked ? `Cần văn phòng cấp ${item.level + 1}.` : item.desc}</div></div>
        <button class="px-btn buy" data-a="buyDecor" data-arg="${item.id}" ${can ? '' : 'disabled'}>${owned ? 'Đã đặt' : fmt(item.cost) + ' đ'}</button>
      </div>`;
    }).join('');
    modal.innerHTML = `<div class="card decor-store">
      <div class="panel-head"><div><h2>Cửa hàng nội thất</h2><small>${OFFICE_LEVELS[g.officeLevel].name} · Quỹ ${fmt(g.money)} đ</small></div><button class="px-btn icon" data-a="closeModal">×</button></div>
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
        <div class="panel-head"><h2>Bảng xếp hạng áp lực</h2><button class="px-btn icon" data-a="closeModal">×</button></div>
        <table>
          <tr class="th"><td>#</td><td>Nhân viên</td><td>Roi</td><td>Oan</td><td>Áp lực</td><td></td></tr>
          ${rows.map((e, i) => `<tr>
            <td>${i + 1}</td>
            <td><span class="dot" style="background:${e.look.shirt}"></span>${esc(employeeName(e))} <small>${ROLES[e.role].label}</small></td>
            <td>${e.whips}</td><td>${e.wrong}</td>
            <td><div class="meter small"><i class="${e.stress > 75 ? 'bad' : e.stress > 40 ? 'mid' : 'good'}" style="width:${Math.min(100, e.stress)}%"></i></div></td>
            <td><button class="px-btn nick-btn" data-a="nickname" data-arg="${e.id}">Đặt tên</button></td>
          </tr>`).join('')}
        </table>
        <h3>Kỷ lục của Sếp</h3>
        <table>
          <tr><td>Tổng số roi đã quất</td><td>${r.totalWhips}</td></tr>
          <tr><td>Combo cao nhất</td><td>x${r.bestCombo}</td></tr>
          ${r.bestDays.map((d, i) => `<tr><td>Top ${i + 1}: Ngày ${d.day}</td><td>${fmt(d.revenue)} đ · KPI ${d.kpi}%</td></tr>`).join('')}
        </table>
      </div>`;
    act.closeModal = () => { modal.hidden = true; };
  }

  function showNickname(id) {
    const employee = g.staff.find((e) => e.id === Number(id));
    if (!employee) return;
    modal.hidden = false;
    modal.innerHTML = `
      <div class="card nickname-card">
        <div class="panel-head"><h2>Đặt biệt danh</h2><button class="px-btn icon" data-a="closeModal">×</button></div>
        <p>Tên thật: <b>${esc(employee.name)}</b> · ${ROLES[employee.role].label}</p>
        <form id="nickname-form">
          <input name="nickname" maxlength="20" required value="${esc(employee.nickname)}" placeholder="Nhập biệt danh">
          <button class="px-btn big" type="submit">Lưu biệt danh</button>
        </form>
      </div>`;
    const form = modal.querySelector('#nickname-form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (act.setNickname(employee.id, new FormData(form).get('nickname'))) showBoard();
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
