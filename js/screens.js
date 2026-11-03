// Dialogs for the meta game: CV recruitment, projects, 💎 shop, achievements, "more" menu.
// Each screen renders into #modal. While it is open, tick() (called from ui.update every 0.1s)
// re-renders it when its signature changes, and live() updates fast-moving numbers in place
// so a re-render never swallows a tap.
import { ROLES, OFFICE_LEVELS, PREMIUM_ITEMS, ADS, MAX_STAFF } from './config.js';
import { faceUrl, hirePrice, skillMult } from './cv.js';
import { progressOf } from './projects.js';
import { achievementList, claimableCount } from './achievements.js';
import { blockedReason } from './premium.js';
import { t, LANGS, getLang } from './i18n.js';

const GEM = '<span class="gem" aria-hidden="true"></span>';

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
          <div class="cv-who"><b>${esc(cv.name)}</b>${cv.star ? ` <span class="badge-star">${t('NGÔI SAO')}</span>` : ''}
            <div>${t('{role} · {age} tuổi · {exp} năm KN', { role: t(ROLES[cv.role].label), age: cv.age, exp: cv.exp })}</div></div>
        </div>
        <div class="traits">
          <div>${t('Kỹ năng')} ${starRow(cv.skill, 'good')}</div>
          <div>${t('Độ lười')} ${starRow(cv.lazy, 'bad')}</div>
          <div>${t('Chịu áp lực')} ${starRow(cv.grit, 'calm')}</div>
        </div>
        <ul class="cv-lines"><li>${esc(t(cv.line))}</li><li>${t('Sở thích:')} ${esc(t(cv.hobby))}</li></ul>
        <q>${esc(t(cv.quote))}</q>
        <div class="cv-actions">
          <button class="px-btn danger" data-a="cvReject" data-arg="${i}">${t('Loại')}</button>
          <button class="px-btn big accept" data-a="cvHire" data-arg="${i}" ${can ? '' : 'disabled'}>${t('Tuyển')} · ${fmt(price)} đ</button>
        </div>
      </div>`;
    }).join('');
    const note = full ? t('Công ty đã đủ 8 nhân viên.')
      : free <= 0 ? t('Hết bàn trống. Mở rộng văn phòng (Quản lý) để tuyển thêm.')
      : t('Còn {n} bàn trống.', { n: free });
    return `<div class="card screen cv-screen">
      ${head(t('Hồ sơ ứng viên'), `${note} ${t('Quỹ')} ${fmt(g.money)} đ`)}
      <div class="cv-list">${cards || `<p class="empty">${t('Hết CV hôm nay. Sáng mai sẽ có ứng viên mới.')}</p>`}</div>
      <div class="screen-foot">
        <button class="px-btn ad" data-a="adCv">▶ ${t('Xem quảng cáo: 3 CV mới')}</button>
      </div>
    </div>`;
  }
  const cvSig = () => [g.candidates.length, g.staff.length, g.officeLevel, ...g.candidates.map((cv) => g.money >= hirePrice(g, cv))].join('|');

  // --- Projects -------------------------------------------------------------------------
  const roleBar = (p, r) => `<div class="req"><span>${t(ROLES[r].label)}</span><div class="meter"><i data-prog="${r}"></i></div><b data-progtxt="${r}">${Math.floor(p.prog[r])}/${p.req[r]}</b></div>`;
  function projectsScreen() {
    const pr = g.projects, a = pr.active;
    const team = { dev: 0, acc: 0, des: 0 };
    for (const e of g.staff) team[e.role]++;
    let body;
    if (a) {
      const left = a.deadline - g.day;
      body = `<div class="proj active">
        <div class="proj-name">${esc(t(a.name))}</div>
        <small>${t('Khách hàng: {c} · Hạn: hết ngày {d}', { c: esc(a.client), d: a.deadline })} (${left <= 0 ? `<b class="warn">${t('hôm nay!')}</b>` : t('còn {n} ngày', { n: left + 1 })})</small>
        ${Object.keys(a.req).map((r) => roleBar(a, r)).join('')}
        <div class="reward">${t('Thưởng:')} <b>${fmt(a.money)} đ</b> · <b>${a.gems}</b> ${GEM}</div>
        <p class="tip">${t('Nhân viên đang làm việc sẽ góp điểm theo nghề của họ. Giữ KPI cao để kịp hạn!')}</p>
        <div class="proj-actions">
          ${a.extended ? '' : `<button class="px-btn ad" data-a="adExtend">▶ ${t('Quảng cáo: gia hạn +1 ngày')}</button>`}
          <button class="px-btn danger" data-a="projAbandon">${t('Huỷ dự án')}</button>
        </div>
      </div>`;
    } else {
      body = `<p class="tip">${t('Chọn 1 hợp đồng. Mỗi nghề cần đủ điểm trước khi hết hạn.')}</p>` + pr.offers.map((p, i) => `<div class="proj">
        <div class="proj-name">${esc(t(p.name))}</div>
        <small>${esc(p.client)} · ${t('{n} ngày', { n: p.days })}</small>
        <div class="chips">${Object.entries(p.req).map(([r, n]) => `<span class="chip">${t(ROLES[r].label)} ${fmt(n)} <i>(${t('{n} người', { n: team[r] })})</i></span>`).join('')}</div>
        <div class="proj-row"><span class="reward">${fmt(p.money)} đ · ${p.gems} ${GEM}</span>
          <button class="px-btn big accept" data-a="projAccept" data-arg="${i}">${t('Nhận')}</button></div>
      </div>`).join('');
    }
    return `<div class="card screen proj-screen">
      ${head(t('Dự án · Nghiệp vụ'), t('Hoàn thành {d} · Thất bại {f}', { d: pr.done, f: pr.failed }))}
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
        <div class="info"><div class="title">${t(it.name)}</div><div class="desc">${t(it.desc)}</div></div>
        <button class="px-btn buy gem-btn" data-a="vipBuy" data-arg="${it.id}" ${why ? 'disabled' : ''}>${why && why !== 'gems' ? t(why) : `${it.gems} ${GEM}`}</button>
      </div>`;
    };
    return `<div class="card screen vip-screen">
      ${head(t('Cửa hàng Kim cương'), t('Kim cương nhận từ thành tựu, dự án và quảng cáo'))}
      <div class="gem-balance">${GEM} <b>${g.gems}</b></div>
      <button class="px-btn ad wide" data-a="adGems" ${adsLeft > 0 ? '' : 'disabled'}>▶ ${t('Xem quảng cáo:')} +${ADS.gemsPerAd} ${GEM} <small>(${t('còn {n}/{max} lượt hôm nay', { n: Math.max(0, adsLeft), max: ADS.gemAdsPerDay })})</small></button>
      <h3>${t('Đặc quyền vĩnh viễn')}</h3>
      ${PREMIUM_ITEMS.filter((x) => x.kind === 'perk').map(item).join('')}
      <h3>${t('Dùng ngay')}</h3>
      ${PREMIUM_ITEMS.filter((x) => x.kind === 'boost').map(item).join('')}
    </div>`;
  }
  const vipSig = () => [g.gems, g.perks.length, g.ads.gems, g.ads.day, g.whipLevel, g.assistantLevel, g.records.bestDays.length].join('|');

  // --- Achievements ----------------------------------------------------------------------
  function achScreen() {
    const list = achievementList(g);
    const done = list.filter((a) => a.claimed).length;
    return `<div class="card screen ach-screen">
      ${head(t('Thành tựu'), t('Đã nhận {d}/{n}', { d: done, n: list.length }))}
      ${list.map((a) => `<div class="ach ${a.claimed ? 'claimed' : a.done ? 'ready' : ''}">
        <div class="info"><div class="title">${t(a.name)}</div><div class="desc">${t(a.desc)}</div>
          <div class="meter"><i style="width:${Math.round((a.value / a.goal) * 100)}%"></i></div></div>
        ${a.claimed ? '<span class="done">✓</span>'
          : `<button class="px-btn buy gem-btn" data-a="achClaim" data-arg="${a.id}" ${a.done ? '' : 'disabled'}>+${a.gems} ${GEM}</button>`}
      </div>`).join('')}
    </div>`;
  }
  const achSig = () => achievementList(g).map((a) => `${a.id}:${a.claimed ? 2 : a.done ? 1 : Math.floor((a.value / a.goal) * 20)}`).join(',');

  // --- More menu -------------------------------------------------------------------------
  const moreScreen = () => `<div class="card screen more-screen">
      ${head(t('Thêm'))}
      <button class="px-btn wide" data-a="decor">${t('Nội thất văn phòng')}</button>
      <button class="px-btn wide" data-a="board">${t('Nhân sự & áp lực')}</button>
      <button class="px-btn wide" data-a="mute">${g.muted ? t('Bật âm thanh') : t('Tắt âm thanh')}</button>
      <h3>${t('Ngôn ngữ')}${getLang() === 'en' ? '' : ' · Language'}</h3><div class="lang-row">${Object.entries(LANGS).map(([code, l]) => `<button class="px-btn ${code === getLang() ? 'on' : ''}" data-a="setLang" data-arg="${code}">${l.name}</button>`).join('')}</div><button class="px-btn wide danger" data-a="reset">${t('Chơi lại từ đầu')}</button>
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
  return { name: a.name, frac: progressOf(a), due: left <= 0 ? t('hạn hôm nay') : t('còn {n} ngày', { n: left + 1 }) };
}

