// Dialogs for the meta game: CV recruitment, projects, 💎 shop, achievements, "more" menu.
// Each screen renders into #modal. While it is open, tick() (called from ui.update every 0.1s)
// re-renders it when its signature changes, and live() updates fast-moving numbers in place
// so a re-render never swallows a tap.
import { ROLES, OFFICE_LEVELS, PREMIUM_ITEMS, ADS, MAX_STAFF } from './config.js';
import { faceUrl, hirePrice, skillMult } from './cv.js';
import { progressOf } from './projects.js';
import { achievementList, claimableCount } from './achievements.js';
import { blockedReason } from './premium.js';

const GEM = '<span class="gem" aria-label="kim cương"></span>';

export function createScreens({ g, act, modal, fmt, esc }) {
  let current = null; // { name, render, sig, live }
  const close = () => { modal.hidden = true; current = null; };

  function open(name, render, sig = () => '', live = null) {
    current = { name, render, sig, live, last: null };
    modal.hidden = false;
    paint();
  }
  function paint() {
    if (!current) return;
    current.last = current.sig();
    modal.innerHTML = current.render();
    if (current.live) current.live();
  }
  const head = (title, sub = '') => `<div class="panel-head"><div><h2>${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div><button class="px-btn icon" data-a="closeScreen">×</button></div>`;
  const starRow = (n, cls) => `<span class="stars ${cls}">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;

  // --- CV recruitment -------------------------------------------------------------------
  function cvScreen() {
    const cap = OFFICE_LEVELS[g.officeLevel].capacity;
    const free = cap - g.staff.length;
    const full = g.staff.length >= MAX_STAFF;
    const cards = g.candidates.map((cv, i) => {
      const price = hirePrice(g, cv);
      const can = free > 0 && g.money >= price;
      return `<div class="cv ${cv.star ? 'star' : ''}">
        <div class="cv-top">
          <img class="face" src="${faceUrl(cv.look, cv.star)}" alt="">
          <div class="cv-who"><b>${esc(cv.name)}</b>${cv.star ? ' <span class="badge-star">NGÔI SAO</span>' : ''}
            <div>${ROLES[cv.role].label} · ${cv.age} tuổi · ${cv.exp} năm KN</div></div>
        </div>
        <div class="traits">
          <div>Kỹ năng ${starRow(cv.skill, 'good')}</div>
          <div>Độ lười ${starRow(cv.lazy, 'bad')}</div>
          <div>Chịu áp lực ${starRow(cv.grit, 'calm')}</div>
        </div>
        <ul class="cv-lines"><li>${esc(cv.line)}</li><li>Sở thích: ${esc(cv.hobby)}</li></ul>
        <q>${esc(cv.quote)}</q>
        <div class="cv-actions">
          <button class="px-btn danger" data-a="cvReject" data-arg="${i}">Loại</button>
          <button class="px-btn big accept" data-a="cvHire" data-arg="${i}" ${can ? '' : 'disabled'}>Tuyển · ${fmt(price)} đ</button>
        </div>
      </div>`;
    }).join('');
    const note = full ? 'Công ty đã đủ 8 nhân viên.'
      : free <= 0 ? 'Hết bàn trống. Mở rộng văn phòng (Quản lý) để tuyển thêm.'
      : `Còn ${free} bàn trống.`;
    return `<div class="card screen cv-screen">
      ${head('Hồ sơ ứng viên', `${note} Quỹ ${fmt(g.money)} đ`)}
      <div class="cv-list">${cards || '<p class="empty">Hết CV hôm nay. Sáng mai sẽ có ứng viên mới.</p>'}</div>
      <div class="screen-foot">
        <button class="px-btn ad" data-a="adCv">▶ Xem quảng cáo: 3 CV mới</button>
      </div>
    </div>`;
  }
  const cvSig = () => [g.candidates.length, g.staff.length, g.officeLevel, ...g.candidates.map((cv) => g.money >= hirePrice(g, cv))].join('|');

  // --- Projects -------------------------------------------------------------------------
  const roleBar = (p, r) => `<div class="req"><span>${ROLES[r].label}</span><div class="meter"><i data-prog="${r}"></i></div><b data-progtxt="${r}">${Math.floor(p.prog[r])}/${p.req[r]}</b></div>`;
  function projectsScreen() {
    const pr = g.projects, a = pr.active;
    const team = { dev: 0, acc: 0, des: 0 };
    for (const e of g.staff) team[e.role]++;
    let body;
    if (a) {
      const left = a.deadline - g.day;
      body = `<div class="proj active">
        <div class="proj-name">${esc(a.name)}</div>
        <small>Khách hàng: ${esc(a.client)} · Hạn: hết ngày ${a.deadline} (${left <= 0 ? '<b class="warn">hôm nay!</b>' : `còn ${left + 1} ngày`})</small>
        ${Object.keys(a.req).map((r) => roleBar(a, r)).join('')}
        <div class="reward">Thưởng: <b>${fmt(a.money)} đ</b> · <b>${a.gems}</b> ${GEM}</div>
        <p class="tip">Nhân viên đang làm việc sẽ góp điểm theo nghề của họ. Giữ KPI cao để kịp hạn!</p>
        <div class="proj-actions">
          ${a.extended ? '' : '<button class="px-btn ad" data-a="adExtend">▶ Quảng cáo: gia hạn +1 ngày</button>'}
          <button class="px-btn danger" data-a="projAbandon">Huỷ dự án</button>
        </div>
      </div>`;
    } else {
      body = `<p class="tip">Chọn 1 hợp đồng. Mỗi nghề cần đủ điểm trước khi hết hạn.</p>` + pr.offers.map((p, i) => `<div class="proj">
        <div class="proj-name">${esc(p.name)}</div>
        <small>${esc(p.client)} · ${p.days} ngày</small>
        <div class="chips">${Object.entries(p.req).map(([r, n]) => `<span class="chip">${ROLES[r].label} ${fmt(n)} <i>(${team[r]} người)</i></span>`).join('')}</div>
        <div class="proj-row"><span class="reward">${fmt(p.money)} đ · ${p.gems} ${GEM}</span>
          <button class="px-btn big accept" data-a="projAccept" data-arg="${i}">Nhận</button></div>
      </div>`).join('');
    }
    return `<div class="card screen proj-screen">
      ${head('Dự án · Nghiệp vụ', `Hoàn thành ${pr.done} · Thất bại ${pr.failed}`)}
      ${body}
    </div>`;
  }
  const projSig = () => [g.projects.active ? g.projects.active.deadline + ':' + g.projects.active.extended : 'none', g.projects.offers.length, g.day].join('|');
  function projLive() {
    const a = g.projects.active;
    if (!a) return;
    for (const r of Object.keys(a.req)) {
      const bar = modal.querySelector(`[data-prog="${r}"]`), txt = modal.querySelector(`[data-progtxt="${r}"]`);
      if (bar) bar.style.width = Math.min(100, (a.prog[r] / a.req[r]) * 100) + '%';
      if (txt) txt.textContent = `${Math.floor(a.prog[r])}/${a.req[r]}`;
    }
  }

  // --- 💎 shop ------------------------------------------------------------------------------
  function vipScreen() {
    const adsLeft = ADS.gemAdsPerDay - (g.ads.day === g.day ? g.ads.gems : 0);
    const item = (it) => {
      const why = blockedReason(g, it);
      return `<div class="item vip ${it.kind}">
        <div class="info"><div class="title">${it.name}</div><div class="desc">${it.desc}</div></div>
        <button class="px-btn buy gem-btn" data-a="vipBuy" data-arg="${it.id}" ${why ? 'disabled' : ''}>${why && why !== 'Chưa đủ 💎' ? why : `${it.gems} ${GEM}`}</button>
      </div>`;
    };
    return `<div class="card screen vip-screen">
      ${head('Cửa hàng Kim cương', 'Kim cương nhận từ thành tựu, dự án và quảng cáo')}
      <div class="gem-balance">${GEM} <b>${g.gems}</b></div>
      <button class="px-btn ad wide" data-a="adGems" ${adsLeft > 0 ? '' : 'disabled'}>▶ Xem quảng cáo: +${ADS.gemsPerAd} ${GEM} <small>(còn ${Math.max(0, adsLeft)}/${ADS.gemAdsPerDay} lượt hôm nay)</small></button>
      <h3>Đặc quyền vĩnh viễn</h3>
      ${PREMIUM_ITEMS.filter((x) => x.kind === 'perk').map(item).join('')}
      <h3>Dùng ngay</h3>
      ${PREMIUM_ITEMS.filter((x) => x.kind === 'boost').map(item).join('')}
    </div>`;
  }
  const vipSig = () => [g.gems, g.perks.length, g.ads.gems, g.ads.day, g.whipLevel, g.assistantLevel, g.records.bestDays.length].join('|');

  // --- Achievements ----------------------------------------------------------------------
  function achScreen() {
    const list = achievementList(g);
    const done = list.filter((a) => a.claimed).length;
    return `<div class="card screen ach-screen">
      ${head('Thành tựu', `Đã nhận ${done}/${list.length}`)}
      ${list.map((a) => `<div class="ach ${a.claimed ? 'claimed' : a.done ? 'ready' : ''}">
        <div class="info"><div class="title">${a.name}</div><div class="desc">${a.desc}</div>
          <div class="meter"><i style="width:${Math.round((a.value / a.goal) * 100)}%"></i></div></div>
        ${a.claimed ? '<span class="done">✓</span>'
          : `<button class="px-btn buy gem-btn" data-a="achClaim" data-arg="${a.id}" ${a.done ? '' : 'disabled'}>+${a.gems} ${GEM}</button>`}
      </div>`).join('')}
    </div>`;
  }
  const achSig = () => achievementList(g).map((a) => `${a.id}:${a.claimed ? 2 : a.done ? 1 : Math.floor((a.value / a.goal) * 20)}`).join(',');

  // --- More menu -------------------------------------------------------------------------
  const moreScreen = () => `<div class="card screen more-screen">
      ${head('Thêm')}
      <button class="px-btn wide" data-a="decor">Nội thất văn phòng</button>
      <button class="px-btn wide" data-a="board">Nhân sự & áp lực</button>
      <button class="px-btn wide" data-a="mute">${g.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}</button>
      <button class="px-btn wide danger" data-a="reset">Chơi lại từ đầu</button>
    </div>`;

  const screens = {
    cv: () => open('cv', cvScreen, cvSig),
    projects: () => open('projects', projectsScreen, projSig, projLive),
    vip: () => open('vip', vipScreen, vipSig),
    achievements: () => open('achievements', achScreen, achSig),
    more: () => open('more', moreScreen, () => String(g.muted)),
    /** Called ~10x/s by ui.update. */
    tick() {
      if (!current) return;
      if (modal.hidden) { current = null; return; }
      if (current.sig() !== current.last) paint();
      else if (current.live) current.live();
    },
    repaint: paint,
    close,
    get open() { return current && current.name; },
    badges: () => ({ achievements: claimableCount(g), projects: g.projects.active ? 0 : 1 }),
  };
  act.closeScreen = close;
  return screens;
}

/** Small summary for the HUD project bar: { text, frac } or null. */
export function projectSummary(g) {
  const a = g.projects.active;
  if (!a) return null;
  const left = a.deadline - g.day;
  return { name: a.name, frac: progressOf(a), due: left <= 0 ? 'hạn hôm nay' : `còn ${left + 1} ngày` };
}

