// DOM UI: HUD, shop, recruitment (CVs), furniture store, pressure leaderboard, day report
// and floating combat text.
import {
  WHIPS, COFFEE, ASSISTANT, MAX_STAFF, OFFICE_LEVELS, DECOR_ITEMS, ROLES, ROLE_KEYS, GRADES, GRADE_KEYS,
  TRAITS, RANKS, SLACKS, TUNING, PAYDAY, ROOMS, capacityOf, nextRoom,
} from './config.js';
import { incomeOf, toolLevel, TOOL_TRACKS, TOOL_LABELS, dateOf, fmtDate, nextPayday, payrollDue } from './sim.js';
import { cvOutput } from './cv.js';
import { portraitURL, decorPreviewURL } from './sprites.js';

export const fmt = (n) => {
  const neg = n < 0;
  n = Math.floor(Math.abs(n));
  let s;
  if (n >= 1e6) s = (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
  else if (n >= 1e4) s = (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  else s = n.toLocaleString('vi-VN');
  return (neg ? '−' : '') + s;
};

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

// 16x16 pixel icons for the tool switcher: [x, y, w, h, color] rects.
const ICONS = {
  whip: [[2, 11, 3, 3, '#6e4428'], [4, 10, 2, 2, '#9a6034'], [6, 8, 2, 2, '#c07a3c'], [8, 5, 2, 3, '#c07a3c'], [10, 3, 2, 2, '#e0a050'], [12, 2, 2, 2, '#ffd34d']],
  baton: [[2, 12, 3, 3, '#2a160c'], [4, 10, 3, 3, '#6e4428'], [6, 8, 3, 3, '#c9a05a'], [8, 6, 3, 3, '#c9a05a'], [10, 4, 3, 3, '#d8b070'], [12, 2, 3, 3, '#e8c890']],
  taser: [[3, 5, 9, 6, '#1d1d28'], [4, 8, 7, 1, '#ffd34d'], [6, 11, 3, 4, '#111'], [1, 5, 2, 1, '#c0c0cc'], [1, 9, 2, 1, '#c0c0cc'], [0, 6, 1, 3, '#8fe8ff'], [13, 4, 1, 2, '#8fe8ff']],
};
const icon = (kind) => `<svg class="ico" viewBox="0 0 16 16" shape-rendering="crispEdges">${ICONS[kind].map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`).join('')}</svg>`;

const employeeName = (e) => e.nickname ? `${e.nickname} (${e.name})` : e.name;
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

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

/** Monthly payroll if everyone stays: sum of salaries. Next payout is prorated. */
export function payrollInfo(g) {
  const day = nextPayday(g);
  return {
    day, date: dateOf(g, day), inDays: day - g.day,
    monthly: g.staff.reduce((s, e) => s + e.salary, 0),
    due: payrollDue(g, day).reduce((s, l) => s + l.pay, 0),
  };
}

export function createUI(root, g, act) {
  const { hud, fx, panel, modal } = root;
  let panelOpen = false, lastPanelSig = '', lastToolSig = '';

  hud.innerHTML = `
    <div class="bar top">
      <div class="grip" title="Giữ chuột và kéo để di chuyển game (thả gần taskbar sẽ tự hít vào)"></div>
      <div class="stat money"><span class="coin"></span><b data-k="money">0</b><small data-k="rate"></small></div>
      <div class="stat kpi"><span>KPI</span><div class="meter"><i data-k="kpiBar"></i></div><b data-k="kpi">100%</b></div>
      <div class="stat day" data-k="dayBox"><span data-k="day">T2 01/10</span><b data-k="clock">09:00</b></div>
      <div class="spacer"></div>
      <button class="px-btn" data-a="shop">Quản lý</button>
      <button class="px-btn hire-btn" data-a="recruit">Tuyển dụng</button>
      <button class="px-btn" data-a="decor">Nội thất</button>
      <button class="px-btn" data-a="board">Áp lực</button>
      <button class="px-btn" data-a="mode" data-k="modeBtn">Thu nhỏ</button>
      <button class="px-btn" data-a="pip" data-k="pipBtn" hidden>Ghim nổi</button>
      <button class="px-btn icon" data-a="mute" data-k="mute" title="Âm thanh">♪</button>
      <button class="px-btn icon quit" data-a="quit" title="Thoát game">×</button>
    </div>
    <div class="bar bottom">
      <div class="tools" data-k="tools"></div>
      <div class="combo" data-k="combo"></div>
      <div class="spacer"></div>
      <div class="rooms-nav" data-k="roomsNav" hidden>
        <button class="px-btn icon" data-a="roomPrev" title="Phòng bên trái (←)">◀</button>
        <span data-k="roomName">Phòng chính</span>
        <button class="px-btn icon" data-a="roomNext" title="Phòng bên phải (→)">▶</button>
      </div>
      <div class="spacer"></div>
      <div class="payday" data-k="payday"></div>
      <div class="assist" data-k="assist"></div>
      <button class="px-btn coffee" data-a="coffee" data-k="coffee" hidden>Cà phê sốc</button>
    </div>
    <div class="tag" data-k="tag" hidden></div>`;

  const K = {};
  hud.querySelectorAll('[data-k]').forEach((el) => (K[el.dataset.k] = el));
  const onClick = (e) => {
    const b = e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    e.stopPropagation();
    const a = b.dataset.a;
    if (a === 'shop') togglePanel();
    else if (a === 'board') showBoard();
    else if (a === 'recruit') showRecruit();
    else act[a] && act[a](b.dataset.arg);
  };
  hud.addEventListener('click', onClick);
  panel.addEventListener('click', onClick);
  modal.addEventListener('click', onClick);
  // Stop HUD/panel pointer events from reaching the canvas whip handler.
  for (const el of [hud, panel, modal]) el.addEventListener('pointerdown', (e) => { if (e.target.closest('button, .panel, .card, .tools')) e.stopPropagation(); });

  function set(el, text) { if (el && el.textContent !== text) el.textContent = text; }

  function renderRoomsNav() {
    const n = g.rooms || 1, ghost = nextRoom(g);
    K.roomsNav.hidden = g.mode !== 'office' || (n === 1 && !ghost);
    if (K.roomsNav.hidden) return;
    const k = act.currentRoom ? act.currentRoom() : 0;
    set(K.roomName, k >= n ? `+ ${ghost.name} · ${fmt(ghost.cost)} đ` : `${ROOMS[k].name} (${k + 1}/${n})`);
    act.roomPrev = () => act.focusRoom(k - 1);
    act.roomNext = () => act.focusRoom(k + 1);
  }

  function renderTools() {
    const sig = [g.tool, g.whipLevel, g.batonLevel, g.taserLevel].join('|');
    if (sig === lastToolSig) return;
    lastToolSig = sig;
    K.tools.innerHTML = ['whip', 'baton', 'taser'].map((kind, i) => {
      const lv = toolLevel(g, kind);
      const owned = lv >= 0;
      const name = owned ? TOOL_TRACKS[kind][lv].name : `${TOOL_LABELS[kind]} (chưa mua)`;
      return `<button class="px-btn tool tool-${kind} ${g.tool === kind ? 'active' : ''}" data-a="tool" data-arg="${kind}" ${owned ? '' : 'disabled'} title="Phím ${i + 1} · ${esc(name)}">
        ${icon(kind)}<span>${owned ? esc(name) : TOOL_LABELS[kind]}</span></button>`;
    }).join('');
  }

  const ui = {
    setPipAvailable(ok) { K.pipBtn.hidden = !ok; },

    update() {
      const rate = g.staff.reduce((s, e) => s + incomeOf(g, e), 0);
      set(K.money, fmt(g.money) + ' đ');
      K.money.classList.toggle('debt', g.money < 0);
      set(K.rate, `+${fmt(rate)}/s`);
      const kpi = Math.round(g.kpi * 100);
      set(K.kpi, kpi + '%');
      K.kpiBar.style.width = kpi + '%';
      K.kpiBar.className = kpi >= 75 ? 'good' : kpi >= 50 ? 'mid' : 'bad';
      const today = dateOf(g);
      set(K.day, `${WEEKDAY[today.getDay()]} ${fmtDate(today)}`);
      set(K.clock, clockText(g));
      const pay = payrollInfo(g);
      K.dayBox.title = `Ngày ${g.day} · Trả lương ${fmtDate(pay.date)}: ~${fmt(pay.due)} đ`;
      set(K.payday, pay.inDays === 0 ? `Hôm nay trả lương` : `Lương ${fmtDate(pay.date)} · ${pay.inDays} ngày · ~${fmt(pay.due)} đ`);
      K.payday.classList.toggle('soon', pay.inDays <= 2);
      K.payday.classList.toggle('short', g.money < pay.due);
      renderTools();
      renderRoomsNav();
      set(K.combo, g.combo > 1 ? `COMBO x${g.combo}` : '');
      set(K.modeBtn, g.mode === 'office' ? 'Thu nhỏ' : 'Văn phòng');
      set(K.mute, g.muted ? '×' : '♪');
      if (g.coffeeLevel >= 0) {
        K.coffee.hidden = false;
        const ready = g.coffeeCd <= 0;
        K.coffee.disabled = !ready;
        set(K.coffee, ready ? 'Cà phê sốc' : `Cà phê ${Math.ceil(g.coffeeCd)}s`);
      }
      set(K.assist, g.assistantLevel >= 0 ? `Trợ lý Lv${g.assistantLevel + 1} · ${Math.max(0, Math.ceil(g.assistantCd))}s` : '');
      if (panelOpen) renderPanel();
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
      K.tag.innerHTML = `<b>${esc(employeeName(e))}</b><br>${ROLES[e.role].label} · ${GRADES[e.grade].label} · ${fmt(e.salary)} đ/tháng<br><span class="${e.state === 'slack' ? 'bad' : ''}">${status}</span>`;
      const r = root.stage.getBoundingClientRect();
      K.tag.style.left = x - r.left + 'px';
      K.tag.style.top = y - r.top + 'px';
    },

    showReport(done) {
      const t = g.today;
      const avg = t.kpiN ? t.kpiSum / t.kpiN : g.kpi;
      const title = rankFor(avg);
      const pay = payrollInfo(g);
      const tomorrowPay = pay.inDays === 1;
      modal.hidden = false;
      modal.innerHTML = `
        <div class="card">
          <h2>Tan ca · ${fmtDate(dateOf(g))}</h2>
          <div class="rank">${title}</div>
          <table>
            <tr><td>Doanh thu</td><td>${fmt(t.revenue)} đ</td></tr>
            <tr><td>KPI trung bình</td><td>${Math.round(avg * 100)}%</td></tr>
            <tr><td>Bắt quả tang</td><td>${t.catches}</td></tr>
            <tr><td>Quất oan</td><td>${t.wrong}</td></tr>
            <tr><td>Combo cao nhất</td><td>x${t.bestCombo}</td></tr>
            <tr class="${tomorrowPay ? 'warn' : ''}"><td>${tomorrowPay ? 'Ngày mai trả lương' : `Trả lương ${fmtDate(pay.date)}`}</td><td>~${fmt(pay.due)} đ</td></tr>
          </table>
          ${tomorrowPay && g.money < pay.due ? '<p class="form-error">Quỹ chưa đủ trả lương — nhân viên sẽ bức xúc!</p>' : ''}
          <button class="px-btn big" data-a="nextDay">Ngày làm việc mới</button>
        </div>`;
      act.nextDay = () => { modal.hidden = true; act.nextDay = null; done(); };
    },

    closePanel() { panelOpen = false; panel.hidden = true; },
  };

  function togglePanel() {
    panelOpen = !panelOpen;
    panel.hidden = !panelOpen;
    lastPanelSig = '';
    if (panelOpen) renderPanel();
  }

  function item(key, title, desc, cost, maxed, disabledLabel = 'Tối đa') {
    const can = !maxed && g.money >= cost;
    return `<div class="item ${maxed ? 'maxed' : ''}">
      <div class="info"><div class="title">${title}</div><div class="desc">${desc}</div></div>
      <button class="px-btn buy" data-a="buy" data-arg="${key}" ${can ? '' : 'disabled'}>${maxed ? disabledLabel : fmt(cost) + ' đ'}</button>
    </div>`;
  }

  function toolItem(kind, intro) {
    const track = TOOL_TRACKS[kind], lv = toolLevel(g, kind), next = track[lv + 1];
    const cur = track[lv];
    const title = !cur ? `Mua ${TOOL_LABELS[kind]}: ${next.name}` : next ? `${TOOL_LABELS[kind]}: ${cur.name} → ${next.name}` : `${TOOL_LABELS[kind]}: ${cur.name}`;
    const desc = next
      ? `${intro} Thưởng ${next.bonus} đ · hăng say ${next.boost}s${next.chain ? ` · lan sang ${next.chain} người` : ''}.`
      : 'Cấp tối đa.';
    return item(kind, title, desc, next ? next.cost : 0, !next);
  }

  function renderPanel() {
    const wl = g.whipLevel, next = WHIPS[wl + 1];
    const cl = g.coffeeLevel, al = g.assistantLevel;
    const n = g.staff.length;
    const office = OFFICE_LEVELS[g.officeLevel], nextOffice = OFFICE_LEVELS[g.officeLevel + 1];
    const cap = capacityOf(g);
    const room = nextRoom(g), rooms = g.rooms || 1;
    const pay = payrollInfo(g);
    const html = [
      `<div class="panel-head"><h2>Nâng cấp & Quản lý</h2><button class="px-btn icon" data-a="shop">×</button></div>`,
      `<div class="money-line">Quỹ: <b data-panel-money>${fmt(g.money)} đ</b> · Quỹ lương tháng ${fmt(pay.monthly)} đ · trả ngày ${PAYDAY} hằng tháng</div>`,
      item('office',
        nextOffice ? `${office.name} → ${nextOffice.name}` : office.name,
        nextOffice ? `Mở rộng lên ${nextOffice.capacity} bàn làm việc (đang dùng ${n}/${cap}).` : `Phòng chính đã tối đa · mở thêm phòng bên cạnh ở dòng dưới.`,
        nextOffice ? nextOffice.cost : 0, !nextOffice),
      nextOffice ? '' : item('room',
        room ? `Mở phòng mới: ${room.name}` : `Đã mở đủ ${ROOMS.length} phòng`,
        room ? `Nối thêm một phòng bên cạnh, +8 bàn (đang có ${rooms} phòng · ${n}/${cap} bàn). Cũng có thể bấm vào ô phòng mờ có dấu + trong văn phòng.` : `${cap} bàn làm việc trên ${rooms} phòng.`,
        room ? room.cost : 0, !room),
      `<div class="item">
        <div class="info"><div class="title">Tuyển nhân viên · ${n}/${cap} bàn</div>
        <div class="desc">${n < cap ? 'Đăng tin theo tên và vị trí, chọn CV ưng ý rồi Accept.' : 'Hết bàn trống — mở rộng văn phòng hoặc mở phòng mới để tuyển thêm.'}</div></div>
        <button class="px-btn buy" data-a="recruit">Tuyển dụng</button>
      </div>`,
      item('whip',
        next ? `Roi: ${WHIPS[wl].name} → ${next.name}` : `Roi: ${WHIPS[wl].name}`,
        next ? `Thưởng ${WHIPS[wl].bonus} → ${next.bonus} đ · hăng say ${next.boost}s · tầm quất rộng hơn.` : 'Cây roi tối thượng. Cả văn phòng run rẩy.',
        next ? next.cost : 0, !next),
      toolItem('baton', 'Đánh gần, thưởng to, choáng lâu — nhưng nạn nhân áp lực hơn.'),
      toolItem('taser', 'Chích tức thì, tầm xa, tia điện lan sang kẻ lười bên cạnh.'),
      item('coffee',
        cl < 0 ? 'Mua máy pha cà phê' : COFFEE[cl + 1] ? `Máy cà phê Lv${cl + 1} → Lv${cl + 2}` : `Máy cà phê Lv${cl + 1}`,
        COFFEE[cl + 1] ? `Nút "Cà phê sốc": +55 năng lượng, −30 áp lực, đánh thức kẻ ngủ gật. Hồi chiêu ${COFFEE[cl + 1].cooldown}s.` : 'Espresso cấp công nghiệp.',
        COFFEE[cl + 1] ? COFFEE[cl + 1].cost : 0, !COFFEE[cl + 1]),
      item('assistant',
        al < 0 ? 'Thuê Trợ lý giám sát' : ASSISTANT[al + 1] ? `Trợ lý Lv${al + 1} → Lv${al + 2}` : `Trợ lý Lv${al + 1}`,
        ASSISTANT[al + 1] ? `Tự quất kẻ lười mỗi ${ASSISTANT[al + 1].interval}s (nửa tiền thưởng). Chạy cả khi bạn bận.` : 'Mắt diều hâu, không bỏ sót ai.',
        ASSISTANT[al + 1] ? ASSISTANT[al + 1].cost : 0, !ASSISTANT[al + 1]),
      `<div class="panel-foot"><button class="px-btn danger" data-a="reset">Chơi lại từ đầu</button></div>`,
    ].join('');
    if (html === lastPanelSig) return;
    panel.innerHTML = `<div class="panel">${html}</div>`;
    lastPanelSig = html;
  }

  // --- Recruitment ---------------------------------------------------------------------------

  function cvCard(cv, full) {
    const out = cvOutput(cv);
    const stars = Math.max(1, Math.min(5, Math.round(out / 0.9)));
    const traits = cv.traits.map((k) => `<span class="trait ${TRAITS[k].good ? 'good' : 'bad'}">${TRAITS[k].label}</span>`).join('');
    const can = !full && g.money >= cv.fee;
    return `<article class="cv">
      <header>
        <img class="portrait" src="${portraitURL(cv.look)}" alt="">
        <div><div class="cv-name">${esc(cv.name)}${cv.matched ? ' <span class="match">đúng yêu cầu</span>' : ''}</div>
        <div class="cv-role">${ROLES[cv.role].label} · ${GRADES[cv.grade].label}</div>
        <div class="cv-meta">${cv.age} tuổi · ${cv.years ? `${cv.years} năm kinh nghiệm` : 'chưa có kinh nghiệm'}</div></div>
      </header>
      <dl>
        <dt>Học vấn</dt><dd>${esc(cv.school)}</dd>
        <dt>Từng làm</dt><dd>${esc(cv.company)}</dd>
        <dt>Kỹ năng</dt><dd>${cv.skills.map(esc).join(', ')}</dd>
        <dt>Sở thích</dt><dd>${esc(cv.hobby)}</dd>
        <dt>Năng suất</dt><dd class="stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} <small>${out.toFixed(1)} đ/s</small></dd>
      </dl>
      <div class="traits">${traits}</div>
      <blockquote>“${esc(cv.quote)}”</blockquote>
      <div class="cv-pay"><span>Lương <b>${fmt(cv.salary)} đ</b>/tháng</span><span>Phí tuyển ${fmt(cv.fee)} đ</span></div>
      <div class="cv-actions">
        <button class="px-btn danger" data-a="cvReject" data-arg="${cv.uid}">Hủy</button>
        <button class="px-btn accept" data-a="cvAccept" data-arg="${cv.uid}" ${can ? '' : 'disabled'}>Accept</button>
      </div>
    </article>`;
  }

  function showRecruit(message = '') {
    const cap = capacityOf(g);
    const full = g.staff.length >= cap;
    const r = g.jobReq || {};
    const opt = (keys, map, sel) => keys.map((k) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${map[k].label}</option>`).join('');
    modal.hidden = false;
    modal.innerHTML = `
      <div class="card recruit">
        <div class="panel-head"><div><h2>Tuyển dụng</h2>
          <small>${g.staff.length}/${cap} bàn · Quỹ ${fmt(g.money)} đ${full ? ' · <span class="bad">hết chỗ, hãy mở rộng văn phòng hoặc mở phòng mới</span>' : ''}</small></div>
          <button class="px-btn icon" data-a="closeModal">×</button></div>
        <form id="job-form" class="job-form">
          <label>Tên ứng viên <input name="name" maxlength="24" value="${esc(r.name)}" placeholder="Bỏ trống = tên bất kỳ"></label>
          <label>Vị trí <select name="role"><option value="">Bất kỳ</option>${opt(ROLE_KEYS, ROLES, r.role)}</select></label>
          <label>Cấp bậc <select name="grade"><option value="">Bất kỳ</option>${opt(GRADE_KEYS, GRADES, r.grade)}</select></label>
          <button class="px-btn big" type="submit">Đăng tin · nhận CV</button>
        </form>
        <div class="form-error" aria-live="polite">${esc(message)}</div>
        <div class="cv-list">${g.cvs.length ? g.cvs.map((cv) => cvCard(cv, full)).join('') : '<p class="empty">Chưa có hồ sơ nào. Điền yêu cầu rồi bấm “Đăng tin” để nhận CV.</p>'}</div>
      </div>`;
    const form = modal.querySelector('#job-form');
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      act.postJob(Object.fromEntries(new FormData(form)));
      showRecruit();
    });
    act.closeModal = () => { modal.hidden = true; };
    act.cvReject = (uid) => { act.rejectCV(uid); showRecruit(); };
    act.cvAccept = (uid) => {
      const res = act.acceptCV(uid);
      if (!res.ok) return showRecruit(res.message);
      ui.popup(innerWidth / 2, innerHeight * 0.3, `CHÀO MỪNG ${res.employee.short.toUpperCase()}!`, 'money big');
      lastPanelSig = '';
      showRecruit();
    };
  }

  // --- Furniture ----------------------------------------------------------------------------

  function showDecorStore() {
    modal.hidden = false;
    const rows = DECOR_ITEMS.map((item) => {
      const count = g.decor.filter((d) => d.kind === item.id).length;
      const owned = count > 0 && !item.multi;
      const locked = g.officeLevel < item.level;
      const can = !owned && !locked && g.money >= item.cost;
      const label = owned ? 'Đã đặt' : item.multi && count ? `Mua thêm (${count})` : fmt(item.cost) + ' đ';
      return `<div class="decor-row ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}">
        <div class="decor-preview"><img src="${decorPreviewURL(item)}" alt=""></div>
        <div class="info"><div class="title">${item.name}${item.multi && count ? ` · ${fmt(item.cost)} đ` : ''}</div><div class="desc">${locked ? `Cần ${OFFICE_LEVELS[item.level].name}.` : item.desc}</div></div>
        <button class="px-btn buy" data-a="buyDecor" data-arg="${item.id}" ${can ? '' : 'disabled'}>${label}</button>
      </div>`;
    }).join('');
    modal.innerHTML = `<div class="card decor-store">
      <div class="panel-head"><div><h2>Cửa hàng nội thất</h2><small>${OFFICE_LEVELS[g.officeLevel].name} · Quỹ ${fmt(g.money)} đ</small></div><button class="px-btn icon" data-a="closeModal">×</button></div>
      <p class="hint">Mẹo: <b>giữ chuột phải</b> lên đồ đạc, bàn làm việc hoặc máy cà phê rồi kéo để sắp xếp lại văn phòng.</p>
      <div class="decor-list">${rows}</div>
    </div>`;
    act.closeModal = () => { modal.hidden = true; };
  }

  // --- Staff board --------------------------------------------------------------------------

  function showBoard() {
    const rows = [...g.staff].sort((a, b) => pressureScore(b) - pressureScore(a));
    const r = g.records;
    const pay = payrollInfo(g);
    modal.hidden = false;
    modal.innerHTML = `
      <div class="card board">
        <div class="panel-head"><h2>Nhân sự & áp lực</h2><button class="px-btn icon" data-a="closeModal">×</button></div>
        <table>
          <tr class="th"><td>#</td><td>Nhân viên</td><td>Lương/tháng</td><td>Roi</td><td>Oan</td><td>Áp lực</td><td></td></tr>
          ${rows.map((e, i) => `<tr>
            <td>${i + 1}</td>
            <td><span class="dot" style="background:${e.look.shirt}"></span>${esc(employeeName(e))}
              <small>${ROLES[e.role].label} · ${GRADES[e.grade].label}${e.traits.length ? ' · ' + e.traits.map((k) => TRAITS[k]?.label).join(', ') : ''}</small></td>
            <td>${fmt(e.salary)} đ</td>
            <td>${e.whips}</td><td>${e.wrong}</td>
            <td><div class="meter small"><i class="${e.stress > 75 ? 'bad' : e.stress > 40 ? 'mid' : 'good'}" style="width:${Math.min(100, e.stress)}%"></i></div></td>
            <td class="row-actions"><button class="px-btn nick-btn" data-a="nickname" data-arg="${e.id}">Đặt tên</button>
              <button class="px-btn nick-btn danger" data-a="fireStaff" data-arg="${e.id}" ${g.staff.length <= 1 ? 'disabled' : ''}>Sa thải</button></td>
          </tr>`).join('')}
        </table>
        <p class="hint">Quỹ lương tháng: <b>${fmt(pay.monthly)} đ</b> · kỳ tới ${fmtDate(pay.date)} (còn ${pay.inDays} ngày): ~${fmt(pay.due)} đ, tính theo số ngày làm.</p>
        <h3>Kỷ lục của Sếp</h3>
        <table>
          <tr><td>Tổng số đòn đã ra</td><td>${r.totalWhips}</td></tr>
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

  act.nickname = showNickname;
  act.fireStaff = (id) => { if (act.fire(id)) { lastPanelSig = ''; showBoard(); } };
  act.decor = showDecorStore;
  act.buyDecor = (id) => { act.purchaseDecor(id); showDecorStore(); };
  act.openRecruit = showRecruit;

  return ui;
}
