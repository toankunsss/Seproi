// DOM UI: HUD, shop, pressure leaderboard, day report and floating combat text.
import { WHIPS, COFFEE, ASSISTANT, STAFF_POOL, MAX_STAFF, OFFICE_LEVELS, DECOR_ITEMS, ROLES, RANKS, SLACKS, hireCost, TUNING } from './config.js';
import { incomeOf } from './sim.js';

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

export function createUI(root, g, act) {
  const { hud, fx, panel, modal } = root;
  let panelOpen = false, lastPanelSig = '';

  hud.innerHTML = `
    <div class="bar top">
      <div class="grip" title="Giữ chuột và kéo để di chuyển game (thả gần taskbar sẽ tự hít vào)"></div>
      <div class="stat money"><span class="coin"></span><b data-k="money">0</b><small data-k="rate"></small></div>
      <div class="stat kpi"><span>KPI</span><div class="meter"><i data-k="kpiBar"></i></div><b data-k="kpi">100%</b></div>
      <div class="stat day"><span data-k="day">Ngày 1</span><b data-k="clock">09:00</b></div>
      <div class="spacer"></div>
      <button class="px-btn" data-a="shop">Quản lý</button>
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
    else act[a] && act[a](b.dataset.arg);
  };
  hud.addEventListener('click', onClick);
  panel.addEventListener('click', onClick);
  modal.addEventListener('click', onClick);
  // Stop HUD/panel pointer events from reaching the canvas whip handler.
  for (const el of [hud, panel, modal]) el.addEventListener('pointerdown', (e) => { if (e.target.closest('button, .panel, .card')) e.stopPropagation(); });

  function set(el, text) { if (el && el.textContent !== text) el.textContent = text; }

  const ui = {
    setPipAvailable(ok) { K.pipBtn.hidden = !ok; },

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
      K.tag.innerHTML = `<b>${esc(employeeName(e))}</b> · ${ROLES[e.role].label}<br><span class="${e.state === 'slack' ? 'bad' : ''}">${status}</span>`;
      const r = root.stage.getBoundingClientRect();
      K.tag.style.left = x - r.left + 'px';
      K.tag.style.top = y - r.top + 'px';
    },

    showReport(done) {
      const t = g.today;
      const avg = t.kpiN ? t.kpiSum / t.kpiN : g.kpi;
      const title = rankFor(avg);
      modal.hidden = false;
      modal.innerHTML = `
        <div class="card">
          <h2>Tan ca · Ngày ${g.day}</h2>
          <div class="rank">${title}</div>
          <table>
            <tr><td>Doanh thu</td><td>${fmt(t.revenue)} đ</td></tr>
            <tr><td>KPI trung bình</td><td>${Math.round(avg * 100)}%</td></tr>
            <tr><td>Bắt quả tang</td><td>${t.catches}</td></tr>
            <tr><td>Quất oan</td><td>${t.wrong}</td></tr>
            <tr><td>Combo cao nhất</td><td>x${t.bestCombo}</td></tr>
          </table>
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

  function item(key, title, desc, cost, owned, maxed, disabledLabel = 'Tối đa') {
    const can = !maxed && g.money >= cost;
    return `<div class="item ${maxed ? 'maxed' : ''}">
      <div class="info"><div class="title">${title}</div><div class="desc">${desc}</div></div>
      <button class="px-btn buy" data-a="buy" data-arg="${key}" ${can ? '' : 'disabled'}>${maxed ? disabledLabel : fmt(cost) + ' đ'}</button>
    </div>`;
  }

  function renderPanel() {
    const wl = g.whipLevel, next = WHIPS[wl + 1];
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
    const sig = [wl, cl, al, n, g.officeLevel, !!officeReady, affordability].join('|');
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
      hire && n < office.capacity ? `<div class="item">
        <div class="info"><div class="title">Ứng viên: ${hire.name} (${ROLES[hire.role].label})</div>
        <div class="desc">Phỏng vấn và hoàn tất hồ sơ trước khi nhận việc · phí tuyển ${fmt(hireCost(n))} đ.</div></div>
        <button class="px-btn buy" data-a="interview">Phỏng vấn</button>
      </div>` : item('hire', hire ? 'Cần mở rộng văn phòng' : 'Văn phòng đã kín chỗ', hire ? `${n}/${office.capacity} bàn đang sử dụng` : `${MAX_STAFF}/${MAX_STAFF} bàn`, 0, false, true, 'Hết chỗ'),
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

  function showInterview() {
    const candidate = STAFF_POOL[g.staff.length];
    if (!candidate) return;
    const cost = hireCost(g.staff.length);
    modal.hidden = false;
    modal.innerHTML = `
      <div class="card interview">
        <div class="panel-head"><h2>Phỏng vấn ứng viên</h2><button class="px-btn icon" data-a="closeInterview">×</button></div>
        <div class="candidate"><span class="dot" style="background:${candidate.shirt}"></span>
          <b>${candidate.name}</b> · ${ROLES[candidate.role].label}
        </div>
        <p>Hoàn tất buổi phỏng vấn, sau đó chính bạn quyết định tuyển hay từ chối ứng viên.</p>
        <form id="interview-form">
          <label>Biệt danh muốn gọi <input name="nickname" maxlength="20" required placeholder="Ví dụ: Tuấn Code"></label>
          <label>Tuổi <input name="age" type="number" min="18" max="70" required placeholder="18–70"></label>
          <label>Số năm kinh nghiệm <input name="experience" type="number" min="0" max="50" required placeholder="0–50"></label>
          <label>Vì sao muốn vào công ty? <textarea name="motivation" maxlength="180" required placeholder="Câu trả lời của ứng viên"></textarea></label>
          <div class="form-error" aria-live="polite"></div>
          <div class="interview-actions">
            <button class="px-btn danger" type="button" data-a="rejectInterview">Từ chối</button>
            <button class="px-btn big accept" type="submit" disabled>Accept · ${fmt(cost)} đ</button>
          </div>
        </form>
      </div>`;
    const form = modal.querySelector('#interview-form');
    const accept = form.querySelector('.accept');
    const error = form.querySelector('.form-error');
    const validate = () => {
      const complete = form.checkValidity();
      accept.disabled = !complete || g.money < cost;
      error.textContent = complete && g.money < cost ? 'Quỹ công ty chưa đủ chi phí tuyển dụng.' : '';
    };
    form.addEventListener('input', validate);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      const result = act.acceptHire(data);
      if (!result.ok) { error.textContent = result.message; validate(); return; }
      modal.hidden = true;
      ui.popup(innerWidth / 2, innerHeight * 0.3, `ĐÃ TUYỂN ${data.nickname.toUpperCase()}!`, 'money');
      lastPanelSig = '';
    });
    const dismiss = () => {
      modal.hidden = true;
      act.closeInterview = null;
      act.rejectInterview = null;
    };
    act.closeInterview = dismiss;
    act.rejectInterview = () => {
      dismiss();
      ui.popup(innerWidth / 2, innerHeight * 0.3, `ĐÃ TỪ CHỐI ${candidate.name.toUpperCase()}`, 'say');
    };
    validate();
  }

  act.interview = showInterview;
  act.nickname = showNickname;
  act.decor = showDecorStore;
  act.buyDecor = (id) => { act.purchaseDecor(id); showDecorStore(); };

  return ui;
}
