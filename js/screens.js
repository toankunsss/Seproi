// Dialogs for the meta game: CV recruitment, projects, 💎 shop, achievements, "more" menu.
// Each screen renders into #modal. While it is open, tick() (called from ui.update every 0.1s)
// re-renders it when its signature changes, and live() updates fast-moving numbers in place
// so a re-render never swallows a tap.
import { ROLES, OFFICE_LEVELS, PREMIUM_ITEMS, ADS, MAX_STAFF, PRIVACY_URL, SLACKS } from './config.js';
import { faceUrl, hirePrice, skillMult } from './cv.js';
import { progressOf, penaltyOf } from './projects.js';
import { achievementList, claimableCount } from './achievements.js';
import { blockedReason } from './premium.js';
import { itemArtUrl, badgeTier } from './item-art.js';
import { actionCost, blocked as staffBlocked } from './staff.js';
import { STAFF_ACTIONS, ACHIEVEMENTS } from './config.js';
import { salaryOf, monthBill, daysToPayday } from './payroll.js';
import { questList, questClaimable, allQuestsClaimed, dailyState } from './daily.js';
import { DAILY, PRESTIGE } from './config.js';
import { sharesFor, canSell, shareBonus } from './prestige.js';
import { LEVELS, CHAPTERS, bestStars, totalStars, unlocked, goalText } from './campaign.js';
import { SLOTS, SLOT_NAME, RARITY, STATS, invState, worn, itemName, itemIconUrl, bossUrl, bonus, wornSig, INV_CAP } from './inventory.js';
import { t, LANGS, getLang } from './i18n.js';

const GEM = '<span class="gem" aria-hidden="true"></span>';

export function createScreens({ g, act, modal, fmt, esc, mobile = false }) {
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
  // Sticky header (CSS): title, subtitle, optional right-side chip, close button.
  const head = (title, sub = '', right = '') => `<div class="panel-head"><div><h2>${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div>${right}<button class="px-btn icon" data-a="closeScreen">×</button></div>`;
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
        <ul class="cv-lines"><li>${esc(t(cv.line))}</li><li>${t('Sở thích:')} ${esc(t(cv.hobby))}</li>
          <li class="cv-salary">${t('Lương: {m} đ/ngày (trả mỗi tháng)', { m: fmt(salaryOf(g, { role: cv.role, cv, wage: 0 })) })}</li></ul>
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

  // --- Staff care: rewards & firing ------------------------------------------------------
  const bar = (k, id, cls) => `<div class="meter"><i class="${cls}" data-bar="${k}:${id}"></i></div>`;
  const STATE = { work: 'Đang làm', slack: 'Đang lười', hurt: 'Vừa bị quất', angry: 'Ức chế', strike: 'Đình công!' };
  function staffBtn(kind, e, label, cls = '') {
    const why = staffBlocked(g, kind, e);
    const cost = actionCost(g, kind, e);
    const price = why && why !== 'money' ? t(why) : cost ? `${fmt(cost)} đ` : t('Miễn phí');
    return `<button class="px-btn ${cls}" data-a="staffDo" data-arg="${kind}:${e ? e.id : ''}" ${why ? 'disabled' : ''}>${t(label)}<small>${price}</small></button>`;
  }
  function staffScreen() {
    const cap = OFFICE_LEVELS[g.officeLevel].capacity;
    const cards = g.staff.map((e) => `<div class="staff-card ${e.cv.star ? 'star' : ''}">
        <div class="cv-top">
          <img class="face" src="${faceUrl(e.look, e.cv.star)}" alt="">
          <div class="cv-who"><b>${esc(e.nickname || e.name)}</b>${e.nickname ? ` <small>(${esc(e.name)})</small>` : ''}
            <div>${t(ROLES[e.role].label)} · ${t('Lương bậc {n}', { n: (e.wage || 0) + 1 })} (${fmt(salaryOf(g, e))} đ/${t('ngày')}) · <span data-state="${e.id}">${t(STATE[e.state] || 'Đang làm')}</span></div>
            <div class="mini-stars">★${e.cv.skill} ${t('Kỹ năng')} · ★${e.cv.lazy} ${t('Độ lười')} · ★${e.cv.grit} ${t('Chịu áp lực')}</div></div>
        </div>
        <div class="staff-bars">
          <span>${t('Động lực')}</span>${bar('motiv', e.id, 'motiv')}
          <span>${t('Áp lực')}</span>${bar('stress', e.id, 'stress')}
          <span>${t('Năng lượng')}</span>${bar('energy', e.id, 'energy')}
        </div>
        <div class="staff-actions">
          ${staffBtn('praise', e, 'Khen ngợi')}
          ${staffBtn('bonus', e, 'Thưởng nóng')}
          ${staffBtn('gift', e, 'Tặng trà sữa')}
          ${staffBtn('raise', e, 'Tăng lương')}
        </div>
        <div class="staff-foot">
          <button class="px-btn" data-a="nickname" data-arg="${e.id}">${t('Đặt tên')}</button>
          <button class="px-btn danger" data-a="staffFire" data-arg="${e.id}" ${g.staff.length <= 1 ? 'disabled' : ''}>${t('Sa thải')}</button>
        </div>
      </div>`).join('');
    return `<div class="card screen staff-screen">
      ${head(t('Nhân sự'), t('{n}/{cap} nhân viên · Quỹ {m} đ', { n: g.staff.length, cap, m: fmt(g.money) }))}
      <p class="tip">${t('Động lực cao → ít lười hơn. Khen thưởng để tăng động lực; quất oan làm động lực tụt mạnh.')}</p>
      ${staffBtn('party', null, 'Liên hoan cả công ty', 'wide party')}
      <div class="staff-list">${cards}</div>
    </div>`;
  }
  const staffSig = () => [g.staff.length, g.day, g.partyDay, ...g.staff.map((e) => `${e.id}:${e.wage}:${e.praisedDay}:${e.nickname}:${['praise', 'bonus', 'gift', 'raise'].map((k) => staffBlocked(g, k, e)).join('')}`), staffBlocked(g, 'party')].join('|');
  function staffLive() {
    for (const e of g.staff) {
      for (const k of ['motiv', 'stress', 'energy']) {
        const el = modal.querySelector(`[data-bar="${k}:${e.id}"]`);
        if (el) el.style.width = Math.round(Math.min(100, Math.max(0, e[k] ?? 0))) + '%';
      }
      const st = modal.querySelector(`[data-state="${e.id}"]`);
      if (st) st.textContent = t(STATE[e.state] || 'Đang làm');
    }
  }

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
        <div class="reward">${t('Thưởng:')} <b>${fmt(a.money)} đ</b></div>
        <div class="penalty">${t('Thất bại / huỷ: phạt hợp đồng {m} đ', { m: fmt(penaltyOf(a)) })}</div>
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
        <div class="penalty">${t('Trễ hạn phạt {m} đ', { m: fmt(penaltyOf(p)) })}</div>
        <div class="proj-row"><span class="reward">${fmt(p.money)} đ</span>
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
      const owned = it.kind === 'perk' && g.perks.includes(it.id);
      return `<div class="item vip ${it.kind} ${owned ? 'owned' : ''}">
        <div class="item-art"><img src="${itemArtUrl(it.id)}" alt="">${owned ? '<i>✓</i>' : ''}</div>
        <div class="info"><div class="title">${t(it.name)}</div><div class="desc">${t(it.desc)}</div></div>
        <button class="px-btn buy gem-btn" data-a="vipBuy" data-arg="${it.id}" ${why ? 'disabled' : ''}>${why && why !== 'gems' ? t(why) : `${it.gems} ${GEM}`}</button>
      </div>`;
    };
    return `<div class="card screen vip-screen">
      ${head(t('Cửa hàng Kim cương'), t('Kim cương nhận từ thành tựu, nhiệm vụ, quà hằng ngày và quảng cáo'), `<div class="gem-balance">${GEM} <b>${g.gems}</b></div>`)}
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
      ${questBlock()}
      <h3 class="ach-h">${t('Thành tựu')}</h3>
      ${list.map((a) => `<div class="ach ${a.claimed ? 'claimed' : a.done ? 'ready' : 'locked'} tier${badgeTier(a)}">
        <div class="ach-badge"><img src="${itemArtUrl('badge:' + ACHIEVEMENTS.findIndex((x) => x.id === a.id))}" alt="">${a.claimed ? '<i>✓</i>' : ''}</div>
        <div class="info"><div class="title">${t(a.name)}</div><div class="desc">${t(a.desc)}</div>
          <div class="meter"><i style="width:${Math.round((a.value / a.goal) * 100)}%"></i></div></div>
        ${a.claimed ? '<span class="done">✓</span>'
          : `<button class="px-btn buy gem-btn" data-a="achClaim" data-arg="${a.id}" ${a.done ? '' : 'disabled'}>+${a.gems} ${GEM}</button>`}
      </div>`).join('')}
    </div>`;
  }
  /** Today's quests (daily.js): progress bars, claim buttons and the all-done bonus. */
  function questBlock() {
    const qs = questList(g);
    if (!qs.length) return '';
    const d = dailyState(g);
    const all = allQuestsClaimed(g);
    return `<div class="quests">
      <h3 class="ach-h">${t('Nhiệm vụ hôm nay')} <small>${t('làm mới mỗi ngày')}</small></h3>
      ${qs.map((q, i) => `<div class="quest ${q.claimed ? 'claimed' : q.done ? 'ready' : ''}">
        <div class="info"><div class="title">${t(q.def.text, { n: q.n })}</div>
          <div class="meter"><i style="width:${Math.round((q.progress / q.n) * 100)}%"></i></div>
          <div class="desc">${q.progress}/${q.n}</div></div>
        ${q.claimed ? '<span class="done">✓</span>' : `<button class="px-btn buy gem-btn" data-a="questClaim" data-arg="${i}" ${q.done ? '' : 'disabled'}>+${q.def.gems} ${GEM}</button>`}
      </div>`).join('')}
      <div class="quest bonus ${d.bonusClaimed ? 'claimed' : all ? 'ready' : ''}">
        <div class="info"><div class="title">${t('Hoàn thành cả {n} nhiệm vụ', { n: qs.length })}</div></div>
        ${d.bonusClaimed ? '<span class="done">✓</span>' : `<button class="px-btn buy gem-btn" data-a="questBonus" ${all ? '' : 'disabled'}>+${DAILY.questBonus} ${GEM}</button>`}
      </div>
    </div>`;
  }
  const achSig = () => achievementList(g).map((a) => `${a.id}:${a.claimed ? 2 : a.done ? 1 : Math.floor((a.value / a.goal) * 20)}`).join(',')
    + '|' + questList(g).map((q) => `${q.progress}${q.claimed ? 'c' : ''}`).join(',') + (dailyState(g).bonusClaimed ? 'B' : '');

  // --- More menu -------------------------------------------------------------------------
  const moreScreen = () => `<div class="card screen more-screen">
      ${head(t('Thêm'))}
      <button class="px-btn wide" data-a="decor">${t('Nội thất văn phòng')}</button>
      <button class="px-btn wide" data-a="staff">${t('Nhân sự: khen thưởng & sa thải')}</button>
      <button class="px-btn wide sell-btn" data-a="sellScreen">${t('Bán công ty')}${g.shares ? ` · ${t('{n} cổ phần', { n: g.shares })}` : ''}</button>
<button class="px-btn wide" data-a="board">${t('Bảng xếp hạng áp lực')}</button>
      <button class="px-btn wide" data-a="mute">${g.muted ? t('Bật âm thanh') : t('Tắt âm thanh')}</button>
      ${mobile ? `<button class="px-btn wide" data-a="music">${g.musicOff ? t('Bật nhạc nền') : t('Tắt nhạc nền')}</button>` : ''}
      <h3>${t('Ngôn ngữ')}${getLang() === 'en' ? '' : ' · Language'}</h3><div class="lang-row">${Object.entries(LANGS).map(([code, l]) => `<button class="px-btn ${code === getLang() ? 'on' : ''}" data-a="setLang" data-arg="${code}">${l.name}</button>`).join('')}</div><button class="px-btn wide danger" data-a="reset">${t('Chơi lại từ đầu')}</button>
      <a class="px-btn wide link" href="${PRIVACY_URL}" target="_blank" rel="noopener">${t('Chính sách quyền riêng tư')}</a>
    </div>`;

  // --- Boss inventory (inventory.js) --------------------------------------------------------------
  let invSel = 0;
  const statLine = (it) => t(STATS[it.stat].text, { v: it.value });
  const itemBox = (it, extra = '') => `<span class="inv-icon r${it.rarity}"><img src="${itemIconUrl(it)}" alt="">${extra}</span>`;
  function inventoryScreen() {
    const I = invState(g);
    const wornIds = new Set(Object.values(I.eq));
    const slotsHtml = SLOTS.map((s) => {
      const it = worn(g, s);
      return `<button class="inv-slot ${it ? 'r' + it.rarity : 'empty'}" data-a="${it ? 'invSelect' : ''}" data-arg="${it ? it.id : ''}">
        ${it ? `<img src="${itemIconUrl(it)}" alt="">` : ''}<small>${t(SLOT_NAME[s])}</small></button>`;
    }).join('');
    const totals = Object.keys(STATS).map((k) => ({ k, v: bonus(g, k) })).filter((x) => x.v);
    const sel = I.items.find((x) => x.id === invSel);
    const items = [...I.items].sort((a, b) => b.rarity - a.rarity || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
    return `<div class="card screen inv-screen">
      ${head(t('Kho đồ của sếp'), t('{n}/{max} món · quất nhân viên có thể rơi đồ', { n: I.items.length, max: INV_CAP }))}
      <div class="inv-top">
        <div class="inv-figure"><img src="${bossUrl(g, true)}" alt=""></div>
        <div class="inv-slots">${slotsHtml}</div>
      </div>
      <div class="inv-bonus">${totals.length ? totals.map((x) => `<span class="chip">${t(STATS[x.k].text, { v: x.v })}</span>`).join('') : `<small>${t('Chưa mặc gì: chưa có chỉ số cộng thêm.')}</small>`}</div>
      ${sel ? `<div class="inv-detail r${sel.rarity}">
          ${itemBox(sel)}
          <div class="info"><b>${t(itemName(sel))}</b><div class="rar">${t(RARITY[sel.rarity].name)} · ${t(SLOT_NAME[sel.slot])}</div><div>${statLine(sel)}</div></div>
          <div class="acts">
            ${wornIds.has(sel.id) ? `<button class="px-btn" data-a="invUnequip" data-arg="${sel.slot}">${t('Tháo')}</button>` : `<button class="px-btn big" data-a="invEquip" data-arg="${sel.id}">${t('Mặc')}</button>`}
            <button class="px-btn danger" data-a="invSell" data-arg="${sel.id}">${t('Bán')}</button>
          </div>
        </div>` : `<p class="tip">${t('Chạm vào một món để xem, mặc hoặc bán.')}</p>`}
      <div class="inv-grid">${items.length ? items.map((it) => `<button class="inv-item ${it.id === invSel ? 'sel' : ''}" data-a="invSelect" data-arg="${it.id}">${itemBox(it, wornIds.has(it.id) ? '<i>✓</i>' : '')}</button>`).join('')
        : `<p class="empty">${t('Kho trống. Quất nhân viên lười để có cơ hội nhận đồ, hoặc hạ trùm tuần!')}</p>`}</div>
    </div>`;
  }

  // --- Campaign hub (campaign.js) ---------------------------------------------------------------
  const starRow3 = (n) => [0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');
  function levelsScreen() {
    const chapters = CHAPTERS.map((c) => {
      const ls = LEVELS.filter((l) => l.ch === c.id);
      const got = ls.reduce((s, l) => s + bestStars(g, l.id), 0);
      return `<div class="chapter">
        <h3>${t('Chương {n}: {name}', { n: c.id, name: t(c.name) })} <small>${got}/${ls.length * 3} ★ · ${t('{n} 💎/sao', { n: c.gems })}</small></h3>
        <div class="lvl-grid">${ls.map((l) => {
          const open = unlocked(g, l.id), st = bestStars(g, l.id);
          return `<button class="lvl-card ${open ? '' : 'locked'} ${st === 3 ? 'perfect' : ''}" data-a="levelInfo" data-arg="${l.id}" ${open ? '' : 'disabled'}>
            <b>${l.id}</b><span>${open ? esc(t(l.name)) : '🔒'}</span><em>${starRow3(st)}</em></button>`;
        }).join('')}</div>
      </div>`;
    }).join('');
    const bossIn = (7 - (g.day % 7)) % 7;
    return `<div class="card screen levels-screen">
      ${head(t('Màn chơi'), t('Chiến dịch: {s}/{n} sao', { s: totalStars(g), n: LEVELS.length * 3 }))}
      <div class="boss-info">
        <b>${t('Trùm tuần: Siêu Nhân Viên Lười')}</b>
        <div>${bossIn ? t('Xuất hiện ở công ty sau {n} ngày (mỗi 7 ngày).', { n: bossIn }) : t('Xuất hiện HÔM NAY trong công ty!')} ${t('Đã hạ: {n}', { n: g.bossWins || 0 })}</div>
      </div>
      <p class="tip">${t('Mỗi màn là một ngày làm việc đặc biệt với luật riêng. Đạt mục tiêu để nhận sao và kim cương. Chơi màn không ảnh hưởng tới công ty của bạn.')}</p>
      ${chapters}
    </div>`;
  }
  const RULE_TEXT = {
    slack: 'Nhân viên lười x{n}', drain: 'Mau buồn ngủ x{n}', wrongMult: 'Phạt quất oan x{n}', blackout: 'Mất điện',
    visits: 'Có thanh tra ghé thăm', slackKind: 'Kiểu lười chủ đạo: {k}', dayLength: 'Ngày làm việc {n} giây',
  };
  function levelInfoScreen(id) {
    const l = LEVELS.find((x) => x.id === id);
    if (!l) return '';
    const rules = Object.entries(l.rules).map(([k, v]) => RULE_TEXT[k] ? `<span class="chip">${t(RULE_TEXT[k], { n: v, k: k === 'slackKind' ? t((SLACKS[v] && SLACKS[v].label) || v) : '' })}</span>` : '').join('');
    const s = l.setup;
    return `<div class="card screen level-info">
      ${head(t('Màn {id}', { id: l.id }) + ' · ' + esc(t(l.name)), t('Kỷ lục: {n} sao', { n: bestStars(g, l.id) }))}
      <p class="brief">${esc(t(l.brief))}</p>
      <div class="chips">${rules}<span class="chip">${t('{n} nhân viên', { n: s.staff })}</span>${s.project ? `<span class="chip">${t('Có dự án')}</span>` : ''}</div>
      <h3>${t('Mục tiêu')}</h3>
      ${l.goals.map((goal) => { const tx = goalText(...goal); return `<div class="lvl-goal"><i>★</i><span>${t(tx.s, { n: fmt(tx.n) })}</span></div>`; }).join('')}
      <div class="lvl-actions">
        <button class="px-btn" data-a="levels">${t('Danh sách màn')}</button>
        <button class="px-btn big" data-a="levelStart" data-arg="${l.id}">${t('Bắt đầu')}</button>
      </div>
    </div>`;
  }

  // --- Selling the company (prestige.js) ------------------------------------------------------
  function sellScreen() {
    const have = Math.floor(g.lifetimeEarnings || 0), gain = sharesFor(g), ok = canSell(g);
    const after = Math.round(PRESTIGE.perShare * ((g.shares || 0) + gain) * 100);
    return `<div class="card screen sell-screen">
      ${head(t('Bán công ty'), t('Bán cho nhà đầu tư để nhận cổ phần, rồi khởi nghiệp lại mạnh hơn'))}
      <div class="sell-now">${t('Cổ phần đang có: {n} (+{p}% thu nhập)', { n: g.shares || 0, p: Math.round((shareBonus(g) - 1) * 100) })}</div>
      ${ok ? `<div class="sell-offer"><b>${t('Nhà đầu tư trả: +{n} cổ phần', { n: gain })}</b><br>${t('Sau khi bán: +{p}% thu nhập vĩnh viễn', { p: after })}</div>`
        : `<div class="sell-need">${t('Cần tổng doanh thu {need} đ để có người mua (hiện có {have} đ).', { need: fmt(PRESTIGE.minRevenue), have: fmt(have) })}
            <div class="meter"><i style="width:${Math.min(100, Math.round((have / PRESTIGE.minRevenue) * 100))}%"></i></div></div>`}
      <div class="sell-cols">
        <div><h3>${t('Giữ lại')}</h3><ul><li>${t('Kim cương và đặc quyền 💎')}</li><li>${t('Thành tựu đã nhận')}</li><li>${t('Cổ phần (cộng dồn)')}</li></ul></div>
        <div><h3>${t('Làm lại từ đầu')}</h3><ul><li>${t('Tiền, ngày, nhân viên')}</li><li>${t('Văn phòng, roi, cà phê, trợ lý')}</li><li>${t('Nội thất, dự án')}</li></ul></div>
      </div>
      <button class="px-btn big wide danger" data-a="sellCompany" ${ok ? '' : 'disabled'}>${t('Bán công ty')}${ok ? ` · +${gain} ${t('cổ phần')}` : ''}</button>
    </div>`;
  }

  const screens = {
    cv: () => open('cv', cvScreen, cvSig),
    projects: () => open('projects', projectsScreen, projSig, projLive),
    vip: () => open('vip', vipScreen, vipSig),
    staff: () => open('staff', staffScreen, staffSig, staffLive),
    achievements: () => open('achievements', achScreen, achSig),
    inventory: () => { invSel = 0; open('inventory', inventoryScreen, () => `${invSel}|${wornSig(g)}|${invState(g).items.length}`); },
    invSelect: (id) => { invSel = id; paint(); },
    levels: () => open('levels', levelsScreen, () => `${totalStars(g)}|${g.day}`),
    levelInfo: (id) => open('levelInfo', () => levelInfoScreen(id), () => id),
    sell: () => open('sell', sellScreen, () => `${Math.floor((g.lifetimeEarnings || 0) / 1000)}|${g.shares}`),
    more: () => open('more', moreScreen, () => `${g.muted}/${g.musicOff}`),
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
    // projects: how many contracts can be taken right now (none while one is in progress)
    badges: () => ({ achievements: claimableCount(g) + questClaimable(g), projects: g.projects.active ? 0 : g.projects.offers.length }),
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

