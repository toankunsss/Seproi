// DOM UI: HUD, shop, pressure leaderboard, day report and floating combat text.
import { WHIPS, COFFEE, ASSISTANT, STAFF_POOL, MAX_STAFF, OFFICE_LEVELS, DECOR_ITEMS, ROLES, RANKS, SLACKS, hireCost, TUNING, dayLen } from './config.js';
import { incomeOf, dayAdBonus } from './sim.js';
import { monthBill, daysToPayday, monthOf } from './payroll.js';
import { loginGift } from './daily.js';
import { goalState, goalText, CHAPTERS } from './campaign.js';
import { bossUrl, wornSig, invState } from './inventory.js';
import { rank as skillRank, skState } from './skills.js';
import { DAILY, BOSS, WHIP_SKINS, BUILD } from './config.js';
const WHIP_SKIN_INDEX = (id) => Math.max(0, WHIP_SKINS.findIndex((s) => s.id === id));
import { createScreens, projectSummary } from './screens.js';
import { progressOf, penaltyOf, activeList, activeOf, openOffers } from './projects.js';
import { roomName, capOf, roomStaff, roomAlert, redRooms, nextRoom, upgradeOf, totalCap, freeRoom, roomOf } from './rooms.js';
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
  const mins = 9 * 60 + (g.dayTime / dayLen(g)) * 9 * 60;
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
  levels: svg(r(2, 0, 1, 12) + r(3, 1, 7, 1) + r(3, 2, 8, 3) + r(3, 5, 6, 1) + r(5, 2, 2, 2, 'cut') + r(1, 11, 4, 1)),
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
      <button class="avatar" data-a="inventory" title="${t('Kho đồ của sếp')}"><img data-k="avatar" alt=""><i class="dot" data-k="dotInv" hidden></i><b class="lvl" data-k="lvl">Lv1</b></button>
      <div class="stat money"><span class="coin"></span><b data-k="money">0</b><small data-k="rate"></small></div>
      <div class="stat day"><span data-k="day"></span><b data-k="clock">09:00</b></div>
      <div class="stat kpi"><span>KPI</span><div class="meter"><i data-k="kpiBar"></i></div><b data-k="kpi">100%</b></div>
      <button class="stat gems" data-a="vip"><span class="gem"></span><b data-k="gems">0</b></button>
      <button class="whipname whipbtn" data-a="whipToggle" data-k="whip" title="${t('Bật / tắt roi')}"></button>
      <div class="combo" data-k="combo"></div>
      <div class="assist" data-k="assist"></div>
    </div>
    <div class="side controls">
      <div class="roombar">
        <button class="px-btn rb-home" data-a="overview" data-k="rbHome"></button>
        <button class="px-btn rb-step" data-a="roomStep" data-arg="-1" data-k="rbPrev">◀</button>
        <span class="rb-name" data-k="rbName"></span>
        <button class="px-btn rb-step" data-a="roomStep" data-arg="1" data-k="rbNext">▶</button>
      </div>
      <div class="statusline"><div class="hint" data-k="hint"></div><div class="visitbar" data-k="visit" hidden></div></div>
      <button class="projbar" data-a="projects"><span class="pj-name" data-k="projName"></span>
        <span class="meter"><i data-k="projBar"></i></span><span class="pj-due" data-k="projDue"></span></button>
      <div class="actrow"><button class="px-btn coffee" data-a="coffee" data-k="coffee" hidden></button><button class="px-btn roar" data-a="roar" data-k="roar" hidden></button></div>
      <nav class="tabbar">
        <button class="tab" data-a="shop">${ICON.shop}<span>${t('Quản lý')}</span></button>
        <button class="tab" data-a="projects">${ICON.projects}<span>${t('Dự án')}</span><i class="dot" data-k="dotProjects" hidden></i></button>
        <button class="tab" data-a="levels">${ICON.levels}<span>${t('Màn chơi')}</span></button>
        <button class="tab" data-a="vip">${ICON.vip}<span>${t('Kim cương')}</span></button>
        <button class="tab" data-a="achievements">${ICON.achievements}<span>${t('Thành tựu')}</span><i class="dot" data-k="dotAch" hidden></i></button>
        <button class="tab" data-a="more">${ICON.more}<span>${t('Thêm')}</span></button>
      </nav>
    </div>
    <div class="tag" data-k="tag" hidden></div>`;

/** Short coaching line under the office for new players (mobile only). */
function hintText(g) {
  if (g.viewRoom === -1) return t('Chạm vào một phòng để vào giám sát');
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
      <button class="px-btn rb-home" data-a="overview" data-k="rbHome"></button>
      <button class="px-btn rb-step" data-a="roomStep" data-arg="-1" data-k="rbPrev">◀</button>
      <span class="rb-name" data-k="rbName"></span>
      <button class="px-btn rb-step" data-a="roomStep" data-arg="1" data-k="rbNext">▶</button>
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
    else if (screens[a] && ['projects', 'vip', 'achievements', 'more', 'staff', 'levels'].includes(a)) { ui.closePanel(); screens[a](); }
    else act[a] && act[a](b.dataset.arg);
  };
  hud.addEventListener('click', onClick);
  panel.addEventListener('click', onClick);
  modal.addEventListener('click', onClick);
  // Stop HUD/panel pointer events from reaching the canvas whip handler.
  for (const el of [hud, panel, modal]) el.addEventListener('pointerdown', (e) => { if (e.target.closest('button, .panel, .card')) e.stopPropagation(); });

  function set(el, text) { if (el && el.textContent !== text) el.textContent = text; }

  const ui = {
    whipOn: true, // HUD whip button: off → tapping someone shows their info (main.js)
    setPipAvailable(ok) { if (K.pipBtn) K.pipBtn.hidden = !ok; },

    update() {
      if (levelRun) updateLevelBar();
      const ws = wornSig(g);
      if (K.avatar && ws !== lastWorn) { lastWorn = ws; K.avatar.src = bossUrl(g); }
      if (K.dotInv) { const f = ((g.inv && g.inv.fresh) || 0) + ((g.sk && g.sk.pts) || 0); K.dotInv.hidden = !f; K.dotInv.textContent = f || ''; }
      if (K.roar) {
        const r = skillRank(g, 'roar'), cd = r ? Math.ceil(skState(g).roarCd) : 0;
        K.roar.hidden = !r;
        if (r) { const txt = cd ? `${t('Tiếng gầm')} ${cd}s` : t('TIẾNG GẦM!'); if (K.roar.textContent !== txt) K.roar.textContent = txt; K.roar.disabled = cd > 0; }
      }
      if (K.lvl) set(K.lvl, `Lv${(g.sk && g.sk.lvl) || 1}`);
      updateBossBar();
      const rate = g.staff.reduce((s, e) => s + incomeOf(g, e), 0);
      set(K.money, fmt(g.money) + ' đ');
      set(K.rate, `+${fmt(rate)}/s`);
      const kpi = Math.round(g.kpi * 100);
      set(K.kpi, kpi + '%');
      K.kpiBar.style.width = kpi + '%';
      K.kpiBar.className = kpi >= 75 ? 'good' : kpi >= 50 ? 'mid' : 'bad';
      set(K.day, t('Ngày {n}', { n: g.day }));
      set(K.clock, clockText(g));
      if (K.whip && K.whip.tagName === 'BUTTON') {
        const on = ui.whipOn !== false, key = `${on}|${g.whipLevel}|${(g.cos && g.cos.skin) || ''}`;
        if (K.whip.dataset.key !== key) {
          K.whip.dataset.key = key;
          const art = g.cos && g.cos.skin ? 'skin:' + WHIP_SKIN_INDEX(g.cos.skin) : 'whip:' + Math.min(g.whipLevel, 5);
          K.whip.innerHTML = `<img src="${itemArtUrl(art)}" alt=""><span>${t(WHIPS[g.whipLevel].name)}</span><em>${on ? t('BẬT') : t('TẮT')}</em>`;
          K.whip.classList.toggle('on', on);
        }
      } else set(K.whip, t(WHIPS[g.whipLevel].name));
      set(K.combo, g.combo > 1 ? `COMBO x${g.combo}` : '');
      set(K.modeBtn, g.mode === 'office' ? t('Thu nhỏ') : t('Văn phòng'));
      set(K.mute, g.muted ? '×' : '♪');
      if (mobile) { hud.classList.toggle('muted', g.muted); set(K.hint, hintText(g)); }
      // coffee button and assistant timer: the room being viewed (each room has its own)
      const here = g.viewRoom >= 0 ? roomOf(g) : null;
      if (K.coffee) {
        K.coffee.hidden = !here || here.coffeeLevel < 0;
        if (!K.coffee.hidden) {
          const ready = here.coffeeCd <= 0;
          K.coffee.disabled = !ready;
          set(K.coffee, ready ? t('Cà phê sốc') : t('Cà phê {s}s', { s: Math.ceil(here.coffeeCd) }));
        }
      }
      const cd = here ? Math.max(0, Math.ceil(here.assistantCd)) : 0;
      set(K.assist, !here || here.assistantLevel < 0 ? '' : mobile ? t('Trợ lý: {s}s', { s: cd }) : t('Trợ lý Lv{lv} · {s}s', { lv: here.assistantLevel + 1, s: cd }));
      set(K.gems, String(g.gems));
      updateRoomBar();
      const room = Math.max(0, g.viewRoom);
      const pj = g.viewRoom === -1 ? null : projectSummary(g, room);
      if (K.projName) {
        const running = activeList(g).length;
        if (g.viewRoom === -1) {
          set(K.projName, t('{n}/{m} phòng đang chạy dự án', { n: running, m: g.rooms.length }));
          set(K.projDue, openOffers(g) ? t('{n} hợp đồng đang chờ', { n: openOffers(g) }) : '');
          K.projBar.style.width = Math.round((running / g.rooms.length) * 100) + '%';
          K.projName.parentElement.classList.toggle('idle', running < g.rooms.length && openOffers(g) > 0);
        } else {
          const offers = g.rooms[room] ? g.rooms[room].offers.length : 0;
          set(K.projName, pj ? t(pj.name) : t('Chưa có dự án'));
          set(K.projDue, pj ? `${Math.floor(pj.frac * 100)}% · ${pj.due}` : offers ? t('{n} hợp đồng đang chờ', { n: offers }) : roomStaff(g, room).length ? t('Hết hợp đồng hôm nay') : t('Phòng trống: tuyển người trước'));
          K.projBar.style.width = pj ? Math.round(pj.frac * 100) + '%' : '0%';
          K.projName.parentElement.classList.toggle('idle', !pj && offers > 0);
        }
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
    /** Big "DAY N" banner sliding over the office at the start of a work day. */
    dayBanner(day, title, sub) {
      document.querySelector('.day-banner')?.remove();
      const el = document.createElement('div');
      el.className = 'day-banner';
      el.innerHTML = `<b>${esc(title || t('NGÀY {n}', { n: day }))}</b><span>${esc(sub || t('09:00 · Vào việc thôi!'))}</span>`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    },
    /** Campaign: the goals bar at the bottom while a level runs (null hides it). */
    levelBar(run) {
      levelRun = run;
      let el = document.getElementById('lvlbar');
      if (!run) { if (el) el.remove(); return; }
      if (!el) {
        el = document.createElement('div');
        el.id = 'lvlbar';
        document.body.appendChild(el);
        el.addEventListener('click', onClick);
        el.addEventListener('pointerdown', (e) => e.stopPropagation());
      }
      el.innerHTML = `<div class="lvl-head"><b>${t('Màn {id}', { id: run.id })} · ${esc(t(run.level.name))}</b>
          <button class="px-btn" data-a="levelQuit">${t('Bỏ màn')}</button></div>
        ${run.level.goals.map((goal, i) => { const tx = goalText(...goal); return `<div class="lvl-goal" data-goal="${i}"><i>★</i><span>${t(tx.s, { n: fmt(tx.n) })}</span><b></b></div>`; }).join('')}`;
      updateLevelBar();
    },
    /** Blackout overlay for "power cut" levels: opacity 0..1, -1 removes it. */
    blackout(alpha) {
      let el = document.getElementById('blackout');
      if (alpha < 0) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'blackout'; document.body.appendChild(el); }
      // only the office goes dark: cover the canvas, not the HUD
      const r = document.getElementById('game').getBoundingClientRect();
      Object.assign(el.style, { opacity: alpha, left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    },
    /** Campaign: end-of-level card with stars. */
    showLevelResult(run, states, result, next) {
      const stars = states.filter((s) => s.ok).length;
      modal.hidden = false;
      modal.innerHTML = `<div class="card report level-result">
          <h2>${stars ? t('HOÀN THÀNH MÀN {id}!', { id: run.id }) : t('CHƯA ĐẠT MÀN {id}', { id: run.id })}</h2>
          <div class="big-stars">${[0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}" style="animation-delay:${i * 0.25}s">★</i>`).join('')}</div>
          ${run.level.goals.map((goal, i) => { const tx = goalText(...goal); return `<div class="lvl-goal ${states[i].ok ? 'ok' : 'no'}"><i>${states[i].ok ? '★' : '✗'}</i><span>${t(tx.s, { n: fmt(tx.n) })}</span><b>${goal[0] === 'kpi' ? states[i].v + '%' : fmt(states[i].v)}</b></div>`; }).join('')}
          ${result.gems ? `<div class="report-bonus">${t('Sao mới: +{n} kim cương', { n: result.gems })}</div>` : stars ? `<div class="report-bonus">${t('Kỷ lục của bạn: {n} sao', { n: result.best })}</div>` : ''}
          <div class="lvl-actions">
            <button class="px-btn share" data-a="share" data-arg="level">${t('Chia sẻ')}</button>
            <button class="px-btn" data-a="levelRetry">${t('Chơi lại')}</button>
            ${stars && next ? `<button class="px-btn big" data-a="levelNext">${t('Màn tiếp')}</button>` : ''}
            <button class="px-btn ${stars && next ? '' : 'big'}" data-a="levelExit">${t('Về công ty')}</button>
          </div>
        </div>`;
    },
    /** Daily popups (offline earnings / login calendar) share one layer above the office. */
    showOffline(r) {
      const h = Math.floor(r.seconds / 3600), m = Math.floor((r.seconds % 3600) / 60);
      const time = h ? t('{h} giờ {m} phút', { h, m }) : t('{m} phút', { m });
      dailyLayer(`<div class="reward-card daily-card">
          <div class="reward-rays"></div>
          <img class="reward-art" src="${itemArtUrl('assistant:0')}" alt="">
          <h2>${t('TRONG LÚC SẾP VẮNG MẶT')}</h2>
          <div class="reward-proj">${t('Trợ lý Hạnh đã giữ công ty chạy suốt {time}.', { time })}
            ${r.capped ? `<br><small>${t('(tính tối đa {n} giờ)', { n: DAILY.offline.capHours })}</small>` : ''}</div>
          <div class="reward-list"><div class="reward-item"><span class="coin"></span><b>+${fmt(r.money)} đ</b></div></div>
          <button class="px-btn ad wide" data-a="offlineDouble">▶ ${t('Xem quảng cáo: nhận x2 (+{m} đ)', { m: fmt(r.money) })}</button>
          <button class="px-btn big" data-a="offlineCollect">${t('Nhận tiền')}</button>
        </div>`);
    },
    showLogin(day) {
      const cells = DAILY.login.map((_, i) => {
        const n = i + 1, gift = loginGift(g, n);
        const state = n < day ? 'past' : n === day ? 'today' : 'future';
        return `<div class="login-cell ${state}">
          <small>${t('Ngày {n}', { n })}</small>
          ${gift.gems ? `<span class="gem"></span><b>${gift.gems}</b>` : `<span class="coin"></span><b>${fmt(gift.money)}</b>`}
          ${gift.boost ? `<i class="login-extra">+x2</i>` : ''}${n < day ? '<i class="login-check">✓</i>' : ''}
        </div>`;
      }).join('');
      dailyLayer(`<div class="reward-card daily-card login-card">
          <div class="reward-rays"></div>
          <h2>${t('QUÀ ĐĂNG NHẬP')}</h2>
          <div class="reward-proj">${t('Ngày {n}/7 · vào game mỗi ngày để nhận quà lớn hơn!', { n: day })}</div>
          <div class="login-grid">${cells}</div>
          <button class="px-btn ad wide" data-a="loginDouble">▶ ${t('Xem quảng cáo: nhận x2')}</button>
          <button class="px-btn big" data-a="loginClaim">${t('Nhận quà')}</button>
        </div>`);
    },
    hideDaily() { const el = document.getElementById('daily'); if (el) el.hidden = true; },
    hideProjectReward() { const el = document.getElementById('reward'); if (el) el.hidden = true; },
  };

  /** Room bar under the office: building button, ◀ room ▶, and how many other rooms are on red. */
  let lastRb = '';
  function updateRoomBar() {
    if (!K.rbName) return;
    const over = g.viewRoom === -1, n = g.rooms.length;
    const reds = redRooms(g, over ? -2 : g.viewRoom).length;
    let name;
    if (over) name = t('Toà nhà · {n} phòng · {s}/{c} bàn', { n, s: g.staff.length, c: totalCap(g) });
    else {
      const r = g.viewRoom, a = roomAlert(g, r);
      name = `${roomName(r)} · ${roomStaff(g, r).length}/${capOf(g, r)} · KPI ${a.kpi}%`;
    }
    const sig = `${over}|${name}|${reds}|${n}`;
    if (sig === lastRb) return;
    lastRb = sig;
    K.rbName.textContent = name;
    K.rbHome.innerHTML = over ? `◀ ${t('Vào phòng')}` : `${t('Toà nhà')}${reds ? ` <i class="rb-alert">${reds}</i>` : ''}`;
    K.rbHome.classList.toggle('alarm', !over && reds > 0);
    K.rbPrev.hidden = K.rbNext.hidden = over || n < 2;
  }

  /** Weekly boss: HP + time left, pinned to the top of the office. */
  function updateBossBar() {
    let el = document.getElementById('bossbar');
    const b = g.boss;
    if (!b) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'bossbar'; document.body.appendChild(el);
      // boss in another room: tap the bar to go there
      el.addEventListener('pointerdown', (e) => { if (!el.classList.contains('away')) return; e.stopPropagation(); act.roomGo(Number(el.dataset.room)); });
    }
    const r = document.getElementById('game').getBoundingClientRect();
    Object.assign(el.style, { left: r.left + 6 + 'px', top: r.top + 6 + 'px', width: r.width - 12 + 'px' });
    const bossRoom = g.staff[b.at] ? g.staff[b.at].room || 0 : 0;
    const away = g.rooms && g.rooms.length > 1 && bossRoom !== g.viewRoom;
    el.classList.toggle('away', away);
    el.dataset.room = bossRoom;
    el.innerHTML = `<b>${away ? t('TRÙM Ở {room}!', { room: roomName(bossRoom).toUpperCase() }) : t('TRÙM TUẦN')}</b><span class="hp"><i style="width:${Math.round((b.hp / b.max) * 100)}%"></i></span>
      <em>${Math.ceil(b.hp)}/${b.max}</em><em>⏱ ${Math.max(0, Math.ceil(BOSS.stay - b.t))}s</em>`;
  }

  let lastWorn = null;
  let levelRun = null;
  function updateLevelBar() {
    const el = document.getElementById('lvlbar');
    if (!el || !levelRun) return;
    levelRun.level.goals.forEach((goal, i) => {
      const row = el.querySelector(`[data-goal="${i}"]`);
      if (!row) return;
      const s = goalState(g, levelRun, goal);
      row.className = `lvl-goal ${s.ok && !s.pending ? 'ok' : s.ok ? 'pending' : ''}`;
      row.querySelector('b').textContent = goal[0] === 'kpi' ? `${s.v}%` : ['wrong', 'noStrike'].includes(goal[0]) ? s.v : `${fmt(s.v)}/${fmt(goal[1])}`;
    });
  }

  let reportDone = null;
  function renderReport() {
    const day = g.today;
    const avg = day.kpiN ? day.kpiSum / day.kpiN : g.kpi;
    const title = rankFor(avg);
    const many = g.rooms.length > 1;
    const proj = activeList(g).map(({ r, p }) => {
      const pct = Math.floor(progressOf(p) * 100);
      const where = many ? `<small class="report-room">${esc(roomName(r))}</small> ` : '';
      return g.day >= p.deadline
        ? `<div class="report-proj warn">${where}${t('Dự án <b>{name}</b> mới xong {pct}% và hết hạn hôm nay!', { name: esc(t(p.name)), pct })}
            <br><b class="penalty">${t('Nếu thất bại: phạt hợp đồng {m} đ', { m: fmt(Math.min(g.money, penaltyOf(p))) })}</b>
            ${p.extended ? '<br>' + t('Đã gia hạn 1 lần, sang ngày mới dự án sẽ thất bại.') : `<br><button class="px-btn ad" data-a="adExtend" data-arg="${r}">▶ ${t('Xem quảng cáo: gia hạn +1 ngày')}</button>`}</div>`
        : `<div class="report-proj">${where}${t('Dự án <b>{name}</b>: {pct}% · hạn hết ngày {d}', { name: esc(t(p.name)), pct, d: p.deadline })}</div>`;
    }).join('');
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
          ${payBlock()}
          ${day.doubled ? `<div class="report-bonus">${t('Đã nhận thưởng quảng cáo ✓')}</div>`
            : dayAdBonus(g) > 0 ? `<button class="px-btn ad wide" data-a="adDouble">▶ ${t('Xem quảng cáo: nhận thêm {m} đ', { m: fmt(dayAdBonus(g)) })}</button>` : ''}
          <button class="px-btn wide share" data-a="share" data-arg="report">${t('Chia sẻ kết quả')}</button>
          <button class="px-btn big" data-a="nextDay">${t('Ngày làm việc mới')}</button>
        </div>`;
  }

  function dailyLayer(html) {
    let el = document.getElementById('daily');
    if (!el) {
      el = document.createElement('div');
      el.id = 'daily';
      document.body.appendChild(el);
      el.addEventListener('click', onClick);
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    el.innerHTML = html;
    el.hidden = false;
  }

  /** Report card: this month's pay day, or how far away the next one is. */
  function payBlock() {
    const p = g.today.payroll;
    if (p) {
      return `<div class="report-pay ${p.short ? 'warn' : ''}">
        <b>${t('Kỳ lương tháng {n}', { n: monthOf(g) })}</b>
        <div>${t('Lương nhân viên')}: <span>−${fmt(p.salaries)} đ</span></div>
        <div>${t('Thuê văn phòng')}: <span>−${fmt(p.rent)} đ</span></div>
        ${p.short ? `<div class="penalty">${t('Thiếu {m} đ! Nhân viên không đủ lương nên bất mãn, dễ đình công.', { m: fmt(p.short) })}</div>`
          : `<div class="ok">${t('Đã trả đủ {m} đ ✓', { m: fmt(p.paid) })}</div>`}
      </div>`;
    }
    const bill = monthBill(g), n = daysToPayday(g);
    const low = g.money < bill.total;
    return `<div class="report-pay ${low ? 'warn' : ''}">${t('Kỳ lương sau {n} ngày · dự kiến {m} đ', { n, m: fmt(bill.total) })}
      ${low ? `<div class="penalty">${t('Quỹ chưa đủ trả lương, hãy tiết kiệm!')}</div>` : ''}</div>`;
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
    const rmEq = roomOf(g), cl = rmEq.coffeeLevel, al = rmEq.assistantLevel; // this room's own machine / assistant
    const rp = g.rooms.length > 1 ? roomName(Math.max(0, g.viewRoom)) + ': ' : '';
    const n = g.staff.length, cap = totalCap(g), hire = freeRoom(g, g.viewRoom) >= 0;
    // "office" = the room being viewed (room 1 from the overview), upgraded on its own
    const room = Math.max(0, g.viewRoom), many = g.rooms.length > 1;
    const office = OFFICE_LEVELS[g.rooms[room].level], nextOffice = upgradeOf(g, room);
    const officeReady = nextOffice && (g.lifetimeEarnings || 0) >= nextOffice.unlockRevenue;
    const nr = nextRoom(g), roomReady = nr && (g.lifetimeEarnings || 0) >= nr.unlockRevenue;
    const affordability = [
      next && g.money >= next.cost,
      COFFEE[cl + 1] && g.money >= COFFEE[cl + 1].cost,
      ASSISTANT[al + 1] && g.money >= ASSISTANT[al + 1].cost,
      nextOffice && g.money >= nextOffice.cost,
      nr && g.money >= nr.cost,
    ].map(Boolean).join(',');
    const sig = [wl, cl, al, rmEq.decor.length, n, room, g.rooms.map((x) => x.level).join(''), !!officeReady, !!roomReady, affordability, g.candidates.length, g.day, monthBill(g).total].join('|');
    if (sig === lastPanelSig) {
      const money = panel.querySelector('[data-panel-money]');
      if (money) money.textContent = `${fmt(g.money)} đ`;
      return;
    }
    const html = [
      `<div class="panel-head"><h2>${t('Nâng cấp & Quản lý')}</h2><button class="px-btn icon" data-a="shop">×</button></div>`,
      `<div class="money-line">${t('Quỹ:')} <b data-panel-money>${fmt(g.money)} đ</b></div>`,
      `<div class="item has-art">
        ${artBox('tower:' + g.rooms.length)}
        <div class="info"><div class="title">${t('Toà nhà · {n}/{m} phòng', { n: g.rooms.length, m: BUILD.rooms.length })}</div>
        <div class="desc">${nr ? (roomReady ? t('Đã đạt mốc doanh thu · xây {room} với {m} đ.', { room: roomName(nr.index), m: fmt(nr.cost) }) : t('Phòng tiếp theo cần tổng doanh thu {need} đ · hiện có {have} đ.', { need: fmt(nr.unlockRevenue), have: fmt(g.lifetimeEarnings || 0) })) : t('Toà nhà đã kín phòng. Đế chế hoàn chỉnh!')}</div></div>
        <button class="px-btn buy" data-a="buildInfo">${t('Mở')}</button>
      </div>`,
      item('office',
        (many ? roomName(room) + ': ' : '') + (nextOffice ? `${t(office.name)} → ${t(nextOffice.name)}` : t(office.name)),
        nextOffice
          ? (officeReady ? t('Đã đạt mốc doanh thu · mở {n} bàn làm việc.', { n: nextOffice.capacity }) : t('Cần tổng doanh thu {need} đ · hiện có {have} đ.', { need: fmt(nextOffice.unlockRevenue), have: fmt(g.lifetimeEarnings || 0) }))
          : t('Trụ sở tối đa · {n} bàn làm việc.', { n: office.capacity }),
        nextOffice ? nextOffice.cost : 0, true, !nextOffice || !officeReady, nextOffice ? t('Chưa đạt') : t('Tối đa'), `office:${nextOffice ? nextOffice.level : g.rooms[room].level}`),
      item('whip',
        next ? `${t('Roi:')} ${t(WHIPS[wl].name)} → ${t(next.name)}` : `${t('Roi:')} ${t(WHIPS[wl].name)}`,
        next ? t('Thưởng bắt quả tang {a} → {b} đ · hăng say {s}s · tầm quất rộng hơn', { a: WHIPS[wl].bonus, b: next.bonus, s: next.boost }) : t('Cây roi tối thượng. Cả văn phòng run rẩy.'),
        next ? next.cost : 0, true, !next, undefined, `whip:${next ? wl + 1 : wl}`),
      `<div class="item has-art">
        ${artBox('hire')}
        <div class="info"><div class="title">${t('Tuyển dụng · {n} CV đang chờ', { n: g.candidates.length })}</div>
        <div class="desc">${hire ? t('{n}/{cap} bàn đã có người. Đọc CV và chọn người phù hợp.', { n, cap }) : t('Hết bàn ({n}/{cap}). Nâng cấp phòng hoặc xây phòng mới để tuyển thêm.', { n, cap })}</div></div>
        <button class="px-btn buy" data-a="interview">${t('Xem CV')}</button>
      </div>`,
      `<div class="item has-art">
        ${artBox('dept')}
        <div class="info"><div class="title">${t('Phòng ban')}</div>
        <div class="desc">${t('Bổ nhiệm trưởng phòng, xem KPI từng phòng.')}</div></div>
        <button class="px-btn buy" data-a="depts">${t('Mở')}</button>
      </div>`,
      `<div class="item has-art">
        ${artBox('staff')}
        <div class="info"><div class="title">${t('Nhân sự · {n} người', { n })}</div>
        <div class="desc">${t('Lương tháng {m} đ (gồm thuê văn phòng) · trả sau {n} ngày.', { m: fmt(monthBill(g).total), n: daysToPayday(g) })}</div></div>
        <button class="px-btn buy" data-a="staff">${t('Mở')}</button>
      </div>`,
      item('coffee',
        rp + (cl < 0 ? t('Mua máy pha cà phê') : COFFEE[cl + 1] ? t('Máy cà phê Lv{a} → Lv{b}', { a: cl + 1, b: cl + 2 }) : t('Máy cà phê Lv{a}', { a: cl + 1 })),
        COFFEE[cl + 1] ? t('Nút "Cà phê sốc": +55 năng lượng, −30 áp lực, đánh thức kẻ ngủ gật. Hồi chiêu {s}s.', { s: COFFEE[cl + 1].cooldown }) : t('Espresso cấp công nghiệp.'),
        COFFEE[cl + 1] ? COFFEE[cl + 1].cost : 0, cl >= 0, !COFFEE[cl + 1], undefined, `coffee:${COFFEE[cl + 1] ? cl + 1 : cl}`),
      item('assistant',
        rp + (al < 0 ? t('Thuê Trợ lý giám sát') : ASSISTANT[al + 1] ? t('Trợ lý Lv{a} → Lv{b}', { a: al + 1, b: al + 2 }) : t('Trợ lý Lv{a}', { a: al + 1 })),
        ASSISTANT[al + 1] ? t('Tự quất kẻ lười mỗi {s}s (nửa tiền thưởng). Chạy cả khi bạn bận.', { s: ASSISTANT[al + 1].interval }) : t('Mắt diều hâu, không bỏ sót ai.'),
        ASSISTANT[al + 1] ? ASSISTANT[al + 1].cost : 0, al >= 0, !ASSISTANT[al + 1], undefined, `assistant:${ASSISTANT[al + 1] ? al + 1 : al}`),
      `<div class="panel-foot"><button class="px-btn danger" data-a="reset">${t('Chơi lại từ đầu')}</button></div>`,
    ].join('');
    panel.innerHTML = `<div class="panel">${html}</div>`;
    lastPanelSig = sig;
  }

  function showDecorStore() {
    modal.hidden = false;
    const rm = roomOf(g); // furniture is bought for the room being viewed
    const rows = DECOR_ITEMS.map((item) => {
      const owned = rm.decor.includes(item.id);
      const locked = rm.level < item.level;
      const can = !owned && !locked && g.money >= item.cost;
      return `<div class="decor-row ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}">
        <div class="item-art">${itemArtUrl(item.id) ? `<img src="${itemArtUrl(item.id)}" alt="">` : `<div class="decor-preview decor-${item.id}" aria-hidden="true"></div>`}${owned ? '<i>✓</i>' : ''}</div>
        <div class="info"><div class="title">${t(item.name)}</div><div class="desc">${locked ? t('Cần văn phòng cấp {n}.', { n: item.level + 1 }) : t(item.desc)}</div></div>
        <button class="px-btn buy" data-a="buyDecor" data-arg="${item.id}" ${can ? '' : 'disabled'}>${owned ? t('Đã đặt') : fmt(item.cost) + ' đ'}</button>
      </div>`;
    }).join('');
    modal.innerHTML = `<div class="card decor-store">
      <div class="panel-head"><div><h2>${t('Cửa hàng nội thất')}</h2><small>${g.rooms.length > 1 ? esc(roomName(Math.max(0, g.viewRoom))) + ' · ' : ''}${t(OFFICE_LEVELS[rm.level].name)} · ${t('Quỹ')} ${fmt(g.money)} đ</small></div><button class="px-btn icon" data-a="closeModal">×</button></div>
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
