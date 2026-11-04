// Dialogs for the meta game: CV recruitment, projects, 💎 shop, achievements, "more" menu.
// Each screen renders into #modal. While it is open, tick() (called from ui.update every 0.1s)
// re-renders it when its signature changes, and live() updates fast-moving numbers in place
// so a re-render never swallows a tap.
import { ROLES, OFFICE_LEVELS, PREMIUM_ITEMS, ADS, MAX_STAFF, PRIVACY_URL, SLACKS } from './config.js';
import { faceUrl, hirePrice, skillMult, typeOf } from './cv.js';
import { progressOf, penaltyOf, activeOf, openOffers } from './projects.js';
import { roomName, capOf, roomStaff, freeDesks, freeRoom, totalCap, nextRoom, upgradeOf, roomAlert } from './rooms.js';
import { BUILD } from './config.js';
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
import { SKILLS, skState, rank as skillRank, xpFor, roarCooldown } from './skills.js';
import { DEPT, deptHead, isHead, deptKpi } from './depts.js';
import { cosState, albumState, hasCard, setCards, setDone, albumClaimable } from './cosmetics.js';
import { WHIP_SKINS, PETS, ALBUM, ALBUM_SETS, ALBUM_REWARD } from './config.js';
import { incomeOf } from './sim.js';
import * as diag from './diag.js';
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
    // images decode off the main thread so long lists (staff, achievements) open without a hitch
    modal.innerHTML = current.render().replaceAll('<img ', '<img decoding="async" ');
    if (current.live) current.live();
  }
  // Sticky header (CSS): title, subtitle, optional right-side chip, close button.
  const head = (title, sub = '', right = '') => `<div class="panel-head"><div><h2>${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div>${right}<button class="px-btn icon" data-a="closeScreen">×</button></div>`;
  const starRow = (n, cls) => `<span class="stars ${cls}">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;

  // --- CV recruitment -------------------------------------------------------------------
  function cvScreen() {
    const into = freeRoom(g, g.viewRoom);
    const free = g.rooms.reduce((n, _, r) => n + Math.max(0, freeDesks(g, r)), 0);
    const full = !nextRoom(g) && free <= 0 && g.rooms.every((_, r) => !upgradeOf(g, r));
    const cards = g.candidates.map((cv, i) => {
      const price = hirePrice(g, cv);
      const can = free > 0 && g.money >= price;
      return `<div class="cv ${cv.star ? 'star' : ''}">
        <div class="cv-top">
          <img class="face" src="${faceUrl(cv.look, cv.star)}" alt="">
          <div class="cv-who"><b>${esc(cv.name)}</b>${cv.star ? ` <span class="badge-star">${t('NGÔI SAO')}</span>` : ''}${typeBadge(cv)}
            <div>${t('{role} · {age} tuổi · {exp} năm KN', { role: t(ROLES[cv.role].label), age: cv.age, exp: cv.exp })}</div></div>
        </div>
        <div class="traits">
          <div>${t('Kỹ năng')} ${starRow(cv.skill, 'good')}</div>
          <div>${t('Độ lười')} ${starRow(cv.lazy, 'bad')}</div>
          <div>${t('Chịu áp lực')} ${starRow(cv.grit, 'calm')}</div>
        </div>
        ${typeOf(cv) && !typeOf(cv).hidden ? `<div class="type-note">${t(typeOf(cv).desc)}</div>` : ''}
        <ul class="cv-lines"><li>${esc(t(cv.line))}</li><li>${t('Sở thích:')} ${esc(t(cv.hobby))}</li>
          <li class="cv-salary">${t('Lương: {m} đ/ngày (trả mỗi tháng)', { m: fmt(salaryOf(g, { role: cv.role, cv, wage: 0 })) })}</li></ul>
        <q>${esc(t(cv.quote))}</q>
        <div class="cv-actions">
          <button class="px-btn danger" data-a="cvReject" data-arg="${i}">${t('Loại')}</button>
          <button class="px-btn big accept" data-a="cvHire" data-arg="${i}" ${can ? '' : 'disabled'}>${t('Tuyển')} · ${fmt(price)} đ</button>
        </div>
      </div>`;
    }).join('');
    const note = full ? t('Toà nhà đã kín người.')
      : free <= 0 ? t('Hết bàn trống. Nâng cấp phòng hoặc xây phòng mới (Quản lý) để tuyển thêm.')
      : g.rooms.length > 1 ? t('Còn {n} bàn trống · người mới vào {room}.', { n: free, room: roomName(into) })
      : t('Còn {n} bàn trống.', { n: free });
    return `<div class="card screen cv-screen">
      ${head(t('Hồ sơ ứng viên'), `${note} ${t('Quỹ')} ${fmt(g.money)} đ`)}
      <div class="cv-list">${cards || `<p class="empty">${t('Hết CV hôm nay. Sáng mai sẽ có ứng viên mới.')}</p>`}</div>
      <div class="screen-foot">
        <button class="px-btn ad" data-a="adCv">▶ ${t('Xem quảng cáo: 3 CV mới')}</button>
      </div>
    </div>`;
  }
  const cvSig = () => [g.candidates.length, g.staff.length, g.rooms.map((r) => r.level).join(''), g.viewRoom, ...g.candidates.map((cv) => g.money >= hirePrice(g, cv))].join('|');

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
    const cap = totalCap(g);
    const cards = g.staff.map((e) => `<div class="staff-card ${e.cv.star ? 'star' : ''}">${g.rooms.length > 1 ? roomPicker(e) : ''}
        <div class="cv-top">
          <img class="face" src="${faceUrl(e.look, e.cv.star)}" alt="">
          <div class="cv-who"><b>${esc(e.nickname || e.name)}</b>${e.nickname ? ` <small>(${esc(e.name)})</small>` : ''}${typeBadge(e.cv)}
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
          <button class="px-btn share" data-a="share" data-arg="whip:${e.id}">${t('Chia sẻ ảnh quất')}</button>
          <button class="px-btn danger" data-a="staffFire" data-arg="${e.id}" ${g.staff.length <= 1 ? 'disabled' : ''}>${t('Sa thải')}</button>
        </div>
      </div>`).join('');
    return `<div class="card screen staff-screen">
      ${head(t('Nhân sự'), t('{n}/{cap} nhân viên · Quỹ {m} đ', { n: g.staff.length, cap, m: fmt(g.money) }))}
      <p class="tip">${t('Mẹo: đặt tên nhân viên theo tên bạn bè rồi bấm "Chia sẻ ảnh quất" để troll họ!')}</p>
      <p class="tip">${t('Động lực cao → ít lười hơn. Khen thưởng để tăng động lực; quất oan làm động lực tụt mạnh.')}</p>
      ${staffBtn('party', null, 'Liên hoan cả công ty', 'wide party')}
      <div class="staff-list">${cards}</div>
    </div>`;
  }
  const staffSig = () => [g.staff.length, g.day, g.partyDay, g.rooms.length, ...g.staff.map((e) => `${e.id}:${e.room}:${e.wage}:${e.praisedDay}:${e.nickname}:${['praise', 'bonus', 'gift', 'raise'].map((k) => staffBlocked(g, k, e)).join('')}`), staffBlocked(g, 'party')].join('|');
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

  /** Room chips on a staff card: tap another room (with a free desk) to move them there. */
  function roomPicker(e) {
    return `<div class="room-pick"><span>${t('Phòng')}:</span>${g.rooms.map((_, r) => {
      const here = (e.room || 0) === r, can = !here && freeDesks(g, r) > 0;
      return `<button class="chip-btn ${here ? 'on' : ''}" data-a="moveStaff" data-arg="${e.id}:${r}" ${can ? '' : 'disabled'}>${r + 1}</button>`;
    }).join('')}</div>`;
  }

  // --- One employee's info card (whip switched off → tap someone) ---------------------------------
  function empInfoScreen(id) {
    const e = g.staff.find((x) => x.id === id);
    if (!e) return '';
    const T = typeOf(e.cv);
    return `<div class="card screen emp-info">
      ${head(esc(e.nickname || e.name), `${t(ROLES[e.role].label)}${isHead(g, e) ? ' · ' + t('Trưởng phòng') : ''}${g.rooms.length > 1 ? ' · ' + roomName(e.room || 0) : ''}`)}
      <div class="cv-top">
        <img class="face big" src="${faceUrl(e.look, e.cv.star)}" alt="">
        <div class="cv-who">${e.nickname ? `<small>${esc(e.name)}</small>` : ''}${typeBadge(e.cv)}${e.cv.star ? ` <span class="badge-star">${t('NGÔI SAO')}</span>` : ''}
          <div>${t('Trạng thái')}: <b data-state="${e.id}">${t(STATE[e.state] || 'Đang làm')}</b></div>
          <div>${t('Lương bậc {n}', { n: (e.wage || 0) + 1 })} · ${fmt(salaryOf(g, e))} đ/${t('ngày')}</div>
          <div class="mini-stars">★${e.cv.skill} ${t('Kỹ năng')} · ★${e.cv.lazy} ${t('Độ lười')} · ★${e.cv.grit} ${t('Chịu áp lực')}</div></div>
      </div>
      ${T && (!T.hidden || e.cv.revealed) ? `<div class="type-note">${t(T.desc)}</div>` : ''}
      <div class="staff-bars">
        <span>${t('Động lực')}</span>${bar('motiv', e.id, 'motiv')}
        <span>${t('Áp lực')}</span>${bar('stress', e.id, 'stress')}
        <span>${t('Năng lượng')}</span>${bar('energy', e.id, 'energy')}
      </div>
      <ul class="cv-lines"><li>${t('Sở thích:')} ${esc(t(e.cv.hobby))}</li><li>${t('Bị quất: {n} lần · quất oan: {w}', { n: e.whips || 0, w: e.wrong || 0 })}</li><li><q>${esc(t(e.cv.quote))}</q></li></ul>
      ${g.rooms.length > 1 ? roomPicker(e) : ''}
      <div class="staff-actions">
        ${staffBtn('praise', e, 'Khen ngợi')}
        ${staffBtn('gift', e, 'Tặng trà sữa')}
        <button class="px-btn" data-a="nickname" data-arg="${e.id}">${t('Đặt tên')}</button>
        <button class="px-btn" data-a="staff">${t('Nhân sự')}</button>
      </div>
    </div>`;
  }

  // --- Projects -------------------------------------------------------------------------
  const roleBar = (p, r) => `<div class="req"><span>${t(ROLES[r].label)}</span><div class="meter"><i data-prog="${r}"></i></div><b data-progtxt="${r}">${Math.floor(p.prog[r])}/${p.req[r]}</b></div>`;
  let projRoom = 0; // room whose contracts the projects screen shows
  function projectsScreen() {
    const pr = g.projects, r = Math.min(projRoom, g.rooms.length - 1), room = g.rooms[r], a = room.project;
    const team = { dev: 0, acc: 0, des: 0 };
    for (const e of roomStaff(g, r)) team[e.role]++;
    // one tab per room: blue = contract running, gold = offers waiting, grey = empty room
    const tabs = g.rooms.length > 1 ? `<div class="room-tabs">${g.rooms.map((x, i) => {
      const st = x.project ? 'run' : x.offers.length ? 'offer' : 'idle';
      const al = roomAlert(g, i).late ? ' late' : '';
      return `<button class="room-tab ${st}${al} ${i === r ? 'sel' : ''}" data-a="projRoom" data-arg="${i}">${esc(roomName(i))}<i></i></button>`;
    }).join('')}</div>` : '';
    let body;
    if (a) {
      const left = a.deadline - g.day;
      body = `<div class="proj active">
        <div class="proj-name">${esc(t(a.name))}</div>
        <small>${t('Khách hàng: {c} · Hạn: hết ngày {d}', { c: esc(a.client), d: a.deadline })} (${left <= 0 ? `<b class="warn">${t('hôm nay!')}</b>` : t('còn {n} ngày', { n: left + 1 })})</small>
        ${Object.keys(a.req).map((k) => roleBar(a, k)).join('')}
        <div class="reward">${t('Thưởng:')} <b>${fmt(a.money)} đ</b></div>
        <div class="penalty">${t('Thất bại / huỷ: phạt hợp đồng {m} đ', { m: fmt(penaltyOf(a)) })}</div>
        <p class="tip">${g.rooms.length > 1 ? t('Chỉ nhân viên của {room} góp điểm cho dự án này.', { room: roomName(r) }) : t('Nhân viên đang làm việc sẽ góp điểm theo nghề của họ. Giữ KPI cao để kịp hạn!')}</p>
        <div class="proj-actions">
          ${a.extended ? '' : `<button class="px-btn ad" data-a="adExtend" data-arg="${r}">▶ ${t('Quảng cáo: gia hạn +1 ngày')}</button>`}
          <button class="px-btn danger" data-a="projAbandon" data-arg="${r}">${t('Huỷ dự án')}</button>
        </div>
      </div>`;
    } else if (!roomStaff(g, r).length) {
      body = `<p class="empty">${t('{room} chưa có ai. Tuyển nhân viên vào phòng này để nhận hợp đồng.', { room: roomName(r) })}</p>
        <button class="px-btn wide" data-a="interview">${t('Xem CV')}</button>`;
    } else {
      body = `<p class="tip">${t('Chọn 1 hợp đồng. Mỗi nghề cần đủ điểm trước khi hết hạn.')}</p>` + (room.offers.map((p, i) => `<div class="proj">
        <div class="proj-name">${esc(t(p.name))}</div>
        <small>${esc(p.client)} · ${t('{n} ngày', { n: p.days })}</small>
        <div class="chips">${Object.entries(p.req).map(([k, n]) => `<span class="chip">${t(ROLES[k].label)} ${fmt(n)} <i>(${t('{n} người', { n: team[k] })})</i></span>`).join('')}</div>
        <div class="penalty">${t('Trễ hạn phạt {m} đ', { m: fmt(penaltyOf(p)) })}</div>
        <div class="proj-row"><span class="reward">${fmt(p.money)} đ</span>
          <button class="px-btn big accept" data-a="projAccept" data-arg="${r}:${i}">${t('Nhận')}</button></div>
      </div>`).join('') || `<p class="empty">${t('Hết hợp đồng hôm nay. Sáng mai sẽ có khách mới.')}</p>`);
    }
    return `<div class="card screen proj-screen">
      ${head(t('Dự án · Nghiệp vụ'), t('Hoàn thành {d} · Thất bại {f}', { d: pr.done, f: pr.failed }))}
      ${tabs}
      ${body}
    </div>`;
  }
  const projSig = () => [projRoom, g.rooms.length, g.day, ...g.rooms.map((x) => (x.project ? x.project.deadline + ':' + x.project.extended : 'none') + ':' + x.offers.length), roomStaff(g, Math.min(projRoom, g.rooms.length - 1)).length].join('|');
  function projLive() {
    const a = activeOf(g, Math.min(projRoom, g.rooms.length - 1));
    if (!a) return;
    for (const k of Object.keys(a.req)) {
      const bar = modal.querySelector(`[data-prog="${k}"]`), txt = modal.querySelector(`[data-progtxt="${k}"]`);
      if (bar) bar.style.width = Math.min(100, (a.prog[k] / a.req[k]) * 100) + '%';
      if (txt) txt.textContent = `${Math.floor(a.prog[k])}/${a.req[k]}`;
    }
  }

  // --- The building: rooms, upgrades, the next room ----------------------------------------------
  function buildingScreen() {
    const nr = nextRoom(g), have = g.lifetimeEarnings || 0;
    const rows = g.rooms.map((room, r) => {
      const u = upgradeOf(g, r), a = roomAlert(g, r), ready = u && have >= u.unlockRevenue;
      return `<div class="item has-art room-row alert${a.level}">
        <div class="item-art"><img src="${itemArtUrl('office:' + room.level)}" alt=""></div>
        <div class="info"><div class="title">${esc(roomName(r))} · ${t(OFFICE_LEVELS[room.level].name)}</div>
          <div class="desc">${t('{n}/{cap} bàn · KPI {k}%', { n: roomStaff(g, r).length, cap: capOf(g, r), k: a.kpi })}${room.project ? ' · ' + t('Dự án: {name}', { name: esc(t(room.project.name)) }) : ''}
          ${u ? '<br>' + (ready ? t('Nâng lên {name}: {n} bàn', { name: t(u.name), n: u.capacity }) : t('Nâng cấp cần tổng doanh thu {need} đ', { need: fmt(u.unlockRevenue) })) : ''}</div></div>
        <div class="room-btns">
          <button class="px-btn" data-a="roomGo" data-arg="${r}">${t('Vào')}</button>
          ${u ? `<button class="px-btn buy" data-a="roomUpgrade" data-arg="${r}" ${ready && g.money >= u.cost ? '' : 'disabled'}>${fmt(u.cost)} đ</button>` : ''}
        </div>
      </div>`;
    }).join('');
    const next = nr ? (() => {
      const ready = have >= nr.unlockRevenue;
      return `<div class="build-next ${ready ? 'ready' : ''}">
        <img src="${itemArtUrl('tower:' + g.rooms.length)}" alt="">
        <div><b>${t('Xây {room}', { room: esc(roomName(nr.index)) })}</b>
          <div>${t('Mốc doanh thu: {have}/{need} đ', { have: fmt(have), need: fmt(nr.unlockRevenue) })}</div>
          <div class="meter"><i style="width:${Math.min(100, Math.round((have / nr.unlockRevenue) * 100))}%"></i></div>
          <small>${t('Phòng mới có 4 bàn, nhận dự án riêng và tốn tiền thuê mỗi tháng.')}</small></div>
        <button class="px-btn big" data-a="roomBuild" ${ready && g.money >= nr.cost ? '' : 'disabled'}>${ready ? `${fmt(nr.cost)} đ` : t('Chưa đạt')}</button>
      </div>`;
    })() : `<div class="build-next ready"><b>${t('Toà nhà đã kín phòng. Đế chế hoàn chỉnh!')}</b></div>`;
    return `<div class="card screen building-screen">
      ${head(t('Toà nhà'), t('{n}/{m} phòng · {s}/{c} bàn · Quỹ {money} đ', { n: g.rooms.length, m: BUILD.rooms.length, s: g.staff.length, c: totalCap(g), money: fmt(g.money) }))}
      ${next}
      <h3>${t('Các phòng')}</h3>
      ${rows}
      <button class="px-btn wide" data-a="roomGo" data-arg="-1">${t('Xem toàn cảnh toà nhà')}</button>
    </div>`;
  }
  const buildSig = () => [g.rooms.length, g.rooms.map((x) => x.level + (x.project ? 'p' : '')).join(''), g.staff.length, Math.floor(g.money / 500), Math.floor((g.lifetimeEarnings || 0) / 1000), ...g.rooms.map((_, r) => roomAlert(g, r).level)].join('|');

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
      <button class="px-btn wide col-link" data-a="collection">${t('Bộ sưu tập: skin roi, thú cưng, album')}</button>
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
      <button class="px-btn wide" data-a="depts">${t('Phòng ban & trưởng phòng')}</button>
      <button class="px-btn wide share" data-a="share" data-arg="office">${t('Chia sẻ ảnh công ty')}</button>
      <button class="px-btn wide" data-a="collection">${t('Bộ sưu tập: skin roi, thú cưng, album')}${albumClaimable(g) ? ' ●' : ''}</button>
      <button class="px-btn wide sell-btn" data-a="sellScreen">${t('Bán công ty')}${g.shares ? ` · ${t('{n} cổ phần', { n: g.shares })}` : ''}</button>
<button class="px-btn wide" data-a="board">${t('Bảng xếp hạng áp lực')}</button>
      <button class="px-btn wide" data-a="mute">${g.muted ? t('Bật âm thanh') : t('Tắt âm thanh')}</button>
      ${mobile ? `<button class="px-btn wide" data-a="music">${g.musicOff ? t('Bật nhạc nền') : t('Tắt nhạc nền')}</button>` : ''}
      <h3>🌐 ${t('Ngôn ngữ')}${getLang() === 'en' ? '' : ' · Language'}</h3><div class="lang-row">${Object.entries(LANGS).map(([code, l]) => `<button class="px-btn ${code === getLang() ? 'on' : ''}" data-a="setLang" data-arg="${code}">${l.name}</button>`).join('')}</div><button class="px-btn wide danger" data-a="reset">${t('Chơi lại từ đầu')}</button>
      <a class="px-btn wide link" href="${PRIVACY_URL}" target="_blank" rel="noopener">${t('Chính sách quyền riêng tư')}</a>
      <h3>${t('Hỗ trợ')}</h3>
      <button class="px-btn wide" data-a="fpsToggle">${diag.meterOn() ? t('Ẩn FPS') : t('Hiện FPS')}</button>
      <button class="px-btn wide" data-a="bugReport">${t('Gửi báo lỗi')}${diag.entries().length ? ` · ${diag.entries().length}` : ''}</button>
    </div>`;

  /** Special staff badge; a spy only shows once caught. */
  function typeBadge(cv) {
    const T = typeOf(cv);
    if (!T || (T.hidden && !cv.revealed)) return '';
    return ` <span class="type-badge type-${cv.type}" title="${esc(t(T.desc))}">${t(T.name)}</span>`;
  }

  // --- Collections (cosmetics.js) -------------------------------------------------------------------
  let colTab = 'skins';
  function collectionScreen() {
    const C = cosState(g), A = albumState(g);
    const tabs = [['skins', t('Skin roi')], ['pets', t('Thú cưng')], ['album', `${t('Album')} ${A.got.length}/${ALBUM.length}`]]
      .map(([id, label]) => `<button class="px-btn ${colTab === id ? 'on' : ''}" data-a="colTab" data-arg="${id}">${label}</button>`).join('');
    let body = '';
    if (colTab === 'skins') {
      body = `<div class="col-item ${!C.skin ? 'using' : ''}"><div class="item-art"><img src="${itemArtUrl('whip:' + Math.min(g.whipLevel, 4))}" alt=""></div>
          <div class="info"><div class="title">${t('Roi gốc')}</div><div class="desc">${t('Hình roi theo cấp nâng cấp.')}</div></div>
          <button class="px-btn buy" data-a="useSkin" data-arg="none" ${!C.skin ? 'disabled' : ''}>${!C.skin ? t('Đang dùng') : t('Dùng')}</button></div>`
        + WHIP_SKINS.map((s, i) => { const own = C.skins.includes(s.id), on = C.skin === s.id;
          return `<div class="col-item ${on ? 'using' : ''}"><div class="item-art"><img src="${itemArtUrl('skin:' + i)}" alt=""></div>
            <div class="info"><div class="title">${t(s.name)}</div><div class="desc">${t('Chỉ đổi hình và tiếng quất.')}</div></div>
            <button class="px-btn buy ${own ? '' : 'gem-btn'}" data-a="useSkin" data-arg="${s.id}" ${on ? 'disabled' : ''}>${on ? t('Đang dùng') : own ? t('Dùng') : `${s.gems} ${GEM}`}</button></div>`; }).join('');
    } else if (colTab === 'pets') {
      body = `<p class="tip">${t('Thú cưng ở trong văn phòng (màn dọc). Chỉ nuôi được một con mỗi lúc.')}</p>`
        + PETS.map((p) => { const own = C.pets.includes(p.id), on = C.pet === p.id;
          return `<div class="col-item ${on ? 'using' : ''}"><div class="item-art"><img src="${itemArtUrl(p.id)}" alt=""></div>
            <div class="info"><div class="title">${t(p.name)}</div><div class="desc">${t(p.desc)}</div></div>
            <button class="px-btn buy ${own ? '' : 'gem-btn'}" data-a="usePet" data-arg="${on ? 'none' : p.id}">${on ? t('Cất đi') : own ? t('Mang ra') : `${p.gems} ${GEM}`}</button></div>`; }).join('');
    } else {
      body = `<p class="tip">${t('40 nhân vật thỉnh thoảng nộp CV. Tuyển họ để mở thẻ. Đủ một bộ 8 thẻ: +{g} kim cương và một món đồ hiếm.', { g: ALBUM_REWARD.setGems })}</p>`
        + ALBUM_SETS.map((s) => {
          const cards = setCards(s.id), got = cards.filter((c) => hasCard(g, c.id)).length, done = setDone(g, s.id), claimed = A.claimed.includes(s.id);
          return `<div class="album-set"><h3>${t(s.name)} <small>${got}/${cards.length}</small>
              ${claimed ? '<span class="done">✓</span>' : `<button class="px-btn buy gem-btn" data-a="albumClaim" data-arg="${s.id}" ${done ? '' : 'disabled'}>+${ALBUM_REWARD.setGems} ${GEM}</button>`}</h3>
            <div class="album-grid">${cards.map((c) => hasCard(g, c.id)
              ? `<div class="album-card"><b>${esc(c.name)}</b><small>${esc(t(c.bio))}</small></div>`
              : `<div class="album-card locked"><b>???</b><small>${t('Chưa tuyển')}</small></div>`).join('')}</div></div>`;
        }).join('')
        + `<div class="album-set"><h3>${t('Cả bộ 40 thẻ')} ${A.all ? '<span class="done">✓</span>' : `<button class="px-btn buy gem-btn" data-a="albumClaim" data-arg="all" ${A.got.length >= ALBUM.length ? '' : 'disabled'}>+${ALBUM_REWARD.allGems} ${GEM}</button>`}</h3></div>`;
    }
    return `<div class="card screen col-screen">
      ${head(t('Bộ sưu tập'), t('Skin roi, thú cưng văn phòng và album nhân viên'), `<div class="gem-balance">${GEM} <b>${g.gems}</b></div>`)}
      <div class="inv-tabs">${tabs}</div>
      ${body}
    </div>`;
  }

  // --- Departments (depts.js) -----------------------------------------------------------------------
  function deptScreen() {
    const blocks = Object.keys(ROLES).map((role) => {
      const members = g.staff.filter((e) => e.role === role);
      const head = deptHead(g, role);
      const working = members.filter((e) => e.state === 'work' || e.state === 'hurt').length;
      const rate = members.reduce((s, e) => s + incomeOf(g, e), 0);
      return `<div class="dept dept-${role}">
        <div class="dept-head"><b>${t('Phòng {r}', { r: t(ROLES[role].label) })}</b>
          <span>${t('{n} người', { n: members.length })} · ${t('đang làm {w}', { w: working })}</span></div>
        <div class="dept-stats"><span>KPI ${deptKpi(g, role)}%</span><span>+${fmt(rate)}/s</span>
          <span>${head ? t('Trưởng phòng: {name}', { name: esc(head.nickname || head.name) }) : t('Chưa có trưởng phòng')}</span></div>
        ${members.length ? members.map((e) => `<div class="dept-member ${isHead(g, e) ? 'is-head' : ''}">
            <img class="face" src="${faceUrl(e.look, e.cv.star)}" alt=""><span>${esc(e.nickname || e.name)}${typeBadge(e.cv)}</span>
            ${isHead(g, e) ? `<button class="px-btn" data-a="deptDismiss" data-arg="${role}">${t('Bãi nhiệm')}</button>`
              : `<button class="px-btn buy" data-a="deptAppoint" data-arg="${e.id}">${t('Bổ nhiệm')}</button>`}
          </div>`).join('') : `<p class="empty">${t('Chưa có ai. Tuyển thêm qua CV.')}</p>`}
      </div>`;
    }).join('');
    return `<div class="card screen dept-screen">
      ${head(t('Phòng ban'), t('Trưởng phòng: lương +{s}%, cả phòng thu nhập +{i}% và bớt lười {l}%', { s: Math.round((DEPT.headSalary - 1) * 100), i: Math.round((DEPT.income - 1) * 100), l: Math.round((1 - DEPT.slack) * 100) }))}
      ${blocks}
    </div>`;
  }

  // --- Boss inventory (inventory.js) --------------------------------------------------------------
  let invSel = 0, invTab = 'gear';
  function skillsBlock() {
    const s = skState(g);
    return `<div class="sk-head"><b>${t('Sếp cấp {n}', { n: s.lvl })}</b>
        <div class="meter"><i style="width:${Math.round((s.xp / xpFor(s.lvl)) * 100)}%"></i></div>
        <small>${s.xp}/${xpFor(s.lvl)} XP · ${t('Điểm kỹ năng: {n}', { n: s.pts })}</small></div>
      <p class="tip">${t('Nhận XP khi quất trúng, xong dự án, hạ trùm tuần, đạt sao và thắng mini-game.')}</p>
      ${SKILLS.map((k) => {
        const r = skillRank(g, k.id);
        return `<div class="sk-row ${r ? 'on' : ''}">
          <div class="item-art sk-art"><img src="${itemArtUrl('sk' + k.id)}" alt=""></div>
          <div class="info"><div class="title">${t(k.name)} ${k.active ? `<span class="chip">${t('Chủ động')}</span>` : ''}</div>
            <div class="desc">${t(k.desc)}${k.id === 'roar' && r ? ` (${t('hồi chiêu {n}s', { n: roarCooldown(g) })})` : ''}</div>
            <div class="pips">${Array.from({ length: k.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</div></div>
          <button class="px-btn buy" data-a="learnSkill" data-arg="${k.id}" ${s.pts > 0 && r < k.max ? '' : 'disabled'}>${r >= k.max ? t('Tối đa') : '+1'}</button>
        </div>`;
      }).join('')}`;
  }
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
      ${head(t('Hồ sơ sếp'), t('{n}/{max} món · quất nhân viên có thể rơi đồ', { n: I.items.length, max: INV_CAP }))}
      <div class="inv-tabs"><button class="px-btn ${invTab === 'gear' ? 'on' : ''}" data-a="invTab" data-arg="gear">${t('Trang phục')}</button>
        <button class="px-btn ${invTab === 'skills' ? 'on' : ''}" data-a="invTab" data-arg="skills">${t('Kỹ năng')}${skState(g).pts ? ` (${skState(g).pts})` : ''}</button></div>
      ${invTab === 'skills' ? skillsBlock() : `<div class="inv-top">
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
        : `<p class="empty">${t('Kho trống. Quất nhân viên lười để có cơ hội nhận đồ, hoặc hạ trùm tuần!')}</p>`}</div>`}
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
    projects: (r) => {
      // default: the room being viewed, else the first room that can take a contract
      if (r === undefined || Number.isNaN(r)) { const free = g.rooms.findIndex((x) => !x.project && x.offers.length); r = g.viewRoom >= 0 ? g.viewRoom : Math.max(0, free); }
      projRoom = Math.max(0, Math.min(g.rooms.length - 1, r));
      if (current && current.name === 'projects') { paint(); return; }
      open('projects', projectsScreen, projSig, projLive);
    },
    building: () => open('building', buildingScreen, buildSig),
    vip: () => open('vip', vipScreen, vipSig),
    staff: () => open('staff', staffScreen, staffSig, staffLive),
    empInfo: (id) => open('empInfo', () => empInfoScreen(id), () => { const e = g.staff.find((x) => x.id === id); return e ? `${e.nickname}|${e.praisedDay}|${e.wage}|${g.money >= 0 ? Math.floor(g.money / 50) : 0}|${e.room}` : 'x'; }, staffLive),
    achievements: () => open('achievements', achScreen, achSig),
    inventory: () => { invSel = 0; open('inventory', inventoryScreen, () => `${invSel}|${invTab}|${wornSig(g)}|${invState(g).items.length}|${JSON.stringify(skState(g))}`); },
    invTab: (tab) => { invTab = tab; paint(); },
    invSelect: (id) => { invSel = id; paint(); },
    collection: (tab) => { colTab = tab || colTab; open('collection', collectionScreen, () => `${colTab}|${g.gems}|${JSON.stringify(cosState(g))}|${albumState(g).got.length}|${albumState(g).claimed.length}`); },
    depts: () => open('depts', deptScreen, () => JSON.stringify(g.depts || {}) + g.staff.length + '|' + Object.keys(ROLES).map((r) => deptKpi(g, r)).join(',') + g.staff.map((e) => e.state[0]).join('')),
    levels: () => open('levels', levelsScreen, () => `${totalStars(g)}|${g.day}`),
    levelInfo: (id) => open('levelInfo', () => levelInfoScreen(id), () => id),
    sell: () => open('sell', sellScreen, () => `${Math.floor((g.lifetimeEarnings || 0) / 1000)}|${g.shares}`),
    more: () => open('more', moreScreen, () => `${g.muted}/${g.musicOff}/${diag.meterOn()}/${diag.entries().length}`),
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
    badges: () => ({ achievements: claimableCount(g) + questClaimable(g) + albumClaimable(g), projects: openOffers(g) }),
  };
  act.closeScreen = close;
  return screens;
}

/** Small summary for the HUD project bar: { text, frac } or null. */
export function projectSummary(g, r = Math.max(0, g.viewRoom || 0)) {
  const a = activeOf(g, r);
  if (!a) return null;
  const left = a.deadline - g.day;
  return { name: a.name, frac: progressOf(a), due: left <= 0 ? t('hạn hôm nay') : t('còn {n} ngày', { n: left + 1 }) };
}

