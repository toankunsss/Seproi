// Boot, game loop and glue between simulation, view, whip and UI.
import { WHIPS, COFFEE, ASSISTANT, OFFICE_LEVELS, DECOR_ITEMS, MAX_STAFF, ADS, TUNING } from './config.js';
import { load, save, wipe, makeEmployee, freshDay, SAVE_KEY } from './state.js';
import { update as simUpdate, whipEmployee, useCoffee, assistantInterval } from './sim.js';
import { hirePrice, refillCandidates } from './cv.js';
import * as projects from './projects.js';
import { claim, addGems } from './achievements.js';
import { buyPremium } from './premium.js';
import * as staffCare from './staff.js';
import { planVisit, whipWitnessed, endVisit } from './events.js';
import { VISITS } from './config.js';
import { showRewarded } from './ads.js';
import { t as tr, setLang } from './i18n.js';
import { createView } from './view.js';
import { createWhip } from './whip.js';
import { createUI, fmt } from './ui.js';
import { pipSupported, openPip } from './pip.js';
import * as audio from './audio.js';
import { mobile, initPlatform, restoreBackup, haptic } from './platform.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage'), canvas = $('game');
const root = { stage, hud: $('hud'), fx: $('fx'), panel: $('panel'), modal: $('modal') };

// Native app: bring back the save from the native backup if the WebView storage was wiped.
await restoreBackup(SAVE_KEY);
const g = load();
const params = new URLSearchParams(location.search);
if (params.get('mode') === 'mini') g.mode = 'mini';
// Phones/tablets have no taskbar: always play the full office.
if (mobile) g.mode = 'office';
audio.setMuted(g.muted);

// Running inside the Electron taskbar shell (desktop/preload.cjs)?
const shell = window.taskbarShell || null;
if (shell) document.body.classList.add('shell');

const view = createView(canvas);
view.transparentMini = !!shell;
view.fineScale = mobile;
const whip = createWhip();
let pipWin = null;
let paused = false;
let adOpen = false; // the simulation waits while a rewarded ad is on screen
let userPaused = false; // phone: frozen while away / until the player taps "Tiếp tục"
let resetting = false;

// Morning routine (also on first launch / old saves): fresh CVs, client offers, ad caps.
function newMorning() {
  if (g.candidatesDay !== g.day || !g.candidates.length) { refillCandidates(g); g.candidatesDay = g.day; }
  projects.refreshOffers(g);
  if (g.ads.day !== g.day) g.ads = { day: g.day, gems: 0 };
  if (g.visitDay !== g.day) { planVisit(g); g.visitDay = g.day; } // once per day, reloads can't re-roll
}
newMorning();

// --- Actions (buttons) -----------------------------------------------------------
const act = {
  mode() { setMode(g.mode === 'office' ? 'mini' : 'office'); },
  mute() { g.muted = !g.muted; audio.setMuted(g.muted); },
  coffee() {
    if (useCoffee(g)) { audio.coffee(); haptic('success'); ui.popup(innerWidth / 2, innerHeight * 0.3, tr('CÀ PHÊ SỐC!'), 'coffee'); }
  },
  pip: () => togglePip(),
  quit() { save(g); shell && shell.quit(); },
  buy(kind) {
    let cost = 0, ok = false;
    const nextWhip = WHIPS[g.whipLevel + 1];
    if (kind === 'whip' && nextWhip && !nextWhip.premium) { cost = nextWhip.cost; ok = pay(cost) && (g.whipLevel++, true); }
    if (kind === 'coffee' && COFFEE[g.coffeeLevel + 1]) { cost = COFFEE[g.coffeeLevel + 1].cost; ok = pay(cost) && (g.coffeeLevel++, g.coffeeCd = 0, true); }
    if (kind === 'assistant' && ASSISTANT[g.assistantLevel + 1]) {
      cost = ASSISTANT[g.assistantLevel + 1].cost;
      ok = pay(cost) && (g.assistantLevel++, g.assistantCd = assistantInterval(g), true);
    }
    if (kind === 'office' && OFFICE_LEVELS[g.officeLevel + 1]) {
      const next = OFFICE_LEVELS[g.officeLevel + 1];
      if ((g.lifetimeEarnings || 0) >= next.unlockRevenue) {
        cost = next.cost;
        ok = pay(cost) && (g.officeLevel++, true);
      }
    }
    ok ? audio.buy() : audio.deny();
    haptic(ok ? 'success' : 'light');
    save(g);
  },
  purchaseDecor(id) {
    const item = DECOR_ITEMS.find((x) => x.id === id);
    if (!item || g.decor.includes(id) || g.officeLevel < item.level) return false;
    if (!pay(item.cost)) { audio.deny(); return false; }
    g.decor.push(id);
    audio.buy();
    haptic('success');
    save(g);
    return true;
  },
  // --- Recruitment by CV (screens.js) ---
  cvHire(i) {
    const cv = g.candidates[Number(i)];
    if (!cv) return;
    const index = g.staff.length;
    if (index >= MAX_STAFF || index >= OFFICE_LEVELS[g.officeLevel].capacity) { audio.deny(); return toast(tr('Hết bàn trống, hãy mở rộng văn phòng!'), 'wrong'); }
    if (!pay(hirePrice(g, cv))) { audio.deny(); return toast(tr('Quỹ chưa đủ tiền tuyển.'), 'wrong'); }
    g.staff.push(makeEmployee(staffCare.nextStaffId(g), cv));
    if (cv.star) g.records.starsHired++;
    g.candidates.splice(Number(i), 1);
    layout();
    audio.buy(); haptic('success');
    toast(tr('ĐÃ TUYỂN {name}!', { name: cv.name.toUpperCase() }), 'money');
    save(g); ui.screens.repaint();
  },
  cvReject(i) {
    g.candidates.splice(Number(i), 1);
    save(g); ui.screens.repaint();
  },
  async adCv() {
    if (await watchAd('cv')) { refillCandidates(g); toast(tr('3 CV MỚI!'), 'money'); save(g); }
    ui.screens.repaint();
  },
  // --- Staff care: rewards & firing (screens.js → staff screen) ---
  staffDo(arg) {
    const [kind, id] = String(arg).split(':');
    const e = g.staff.find((x) => x.id === Number(id));
    if (kind !== 'party' && !e) return;
    if (!staffCare.reward(g, kind, e)) { audio.deny(); return; }
    audio.buy(); haptic('success');
    const msg = { praise: 'ĐƯỢC KHEN!', bonus: 'THƯỞNG NÓNG!', gift: 'TRÀ SỮA!', raise: 'TĂNG LƯƠNG!', party: 'LIÊN HOAN!' }[kind];
    toast(kind === 'party' ? tr(msg) : `${e.nickname || e.name}: ${tr(msg)}`, 'money');
    save(g); ui.screens.repaint();
  },
  staffFire(id) {
    const e = g.staff.find((x) => x.id === Number(id));
    if (!e) return;
    if (!confirm(tr('Sa thải {name}? Những người còn lại sẽ lo lắng (−động lực, +áp lực).', { name: e.nickname || e.name }))) return;
    if (!staffCare.fire(g, e)) { audio.deny(); return; }
    audio.strike(); haptic('heavy');
    toast(tr('ĐÃ SA THẢI {name}', { name: e.name.toUpperCase() }), 'wrong');
    layout();
    save(g); ui.screens.repaint();
  },
  // --- Projects ---
  projAccept(i) {
    if (projects.acceptOffer(g, Number(i))) { audio.buy(); haptic('success'); toast(tr('NHẬN DỰ ÁN!'), 'money'); save(g); }
    ui.screens.repaint();
  },
  projAbandon() {
    if (!confirm(tr('Huỷ dự án này? Dự án sẽ tính là thất bại.'))) return;
    projects.abandon(g); save(g); ui.screens.repaint();
  },
  async adExtend() {
    if (await watchAd('extend') && projects.extend(g)) { toast(tr('GIA HẠN +1 NGÀY'), 'money'); save(g); }
    ui.screens.repaint(); ui.refreshReport();
  },
  // --- 💎 ---
  vipBuy(id) {
    const name = buyPremium(g, id);
    if (!name) { audio.deny(); return; }
    audio.buy(); haptic('success');
    toast(tr(name).toUpperCase() + '!', 'coffee');
    if (id === 'starCv') { ui.screens.cv(); }
    save(g); ui.screens.repaint();
  },
  async adGems() {
    if (g.ads.day !== g.day) g.ads = { day: g.day, gems: 0 };
    if (g.ads.gems >= ADS.gemAdsPerDay) return;
    if (await watchAd('gems')) { g.ads.gems++; addGems(g, ADS.gemsPerAd); toast(tr('+{n} KIM CƯƠNG', { n: ADS.gemsPerAd }), 'coffee'); save(g); }
    ui.screens.repaint();
  },
  achClaim(id) {
    const gems = claim(g, id);
    if (gems) { audio.buy(); haptic('success'); toast(tr('+{n} KIM CƯƠNG', { n: gems }), 'coffee'); save(g); }
    ui.screens.repaint();
  },
  // --- end of day ---
  async adDouble() {
    if (g.today.doubled) return;
    if (await watchAd('double')) {
      const bonus = Math.floor(g.today.revenue);
      g.money += bonus; g.lifetimeEarnings += bonus; g.today.doubled = true;
      toast(`+${fmt(bonus)} đ`, 'money'); save(g);
    }
    ui.refreshReport();
  },
  setNickname(id, nickname) {
    const employee = g.staff.find((e) => e.id === Number(id));
    const value = String(nickname || '').trim().slice(0, 20);
    if (!employee || !value) return false;
    employee.nickname = value;
    save(g);
    return true;
  },
  setLang(code) {
    // Rebuild every screen in the new language: simplest and safest is a reload (state is saved).
    setLang(code);
    save(g);
    location.reload();
  },
  reset() {
    if (!confirm(tr('Xoá toàn bộ tiến trình và chơi lại từ đầu?'))) return;
    // pagehide normally persists the current game. Mark this navigation as a reset
    // first, otherwise pagehide immediately writes the old save back after wipe().
    resetting = true;
    // Wait for the native backup to be removed too, or the next boot would restore it.
    wipe().finally(() => location.reload());
  },
};
const pay = (cost) => { if (g.money < cost) return false; g.money -= cost; return true; };
const toast = (text, cls) => ui.popup(innerWidth / 2, innerHeight * 0.32, text, cls);

/** Show a rewarded ad (ads.js) with the game paused; true = reward earned. */
async function watchAd(placement) {
  adOpen = true;
  audio.setMuted(true);
  try {
    const ok = await showRewarded(placement);
    if (ok) g.records.adsWatched++;
    return ok;
  } finally {
    adOpen = false;
    audio.setMuted(g.muted);
    last = performance.now();
  }
}

const ui = createUI(root, g, act, { mobile });
const canPip = () => !shell && !mobile && pipSupported();
ui.setPipAvailable(canPip() && g.mode === 'mini');
$('btn-pip').hidden = !canPip();
// Static text in index.html (desktop taskbar mode hint)
{
  const h = document.querySelector('#desktop .desk-hint');
  h.querySelector('.desk-title').textContent = tr('Chế độ Taskbar');
  h.querySelector('p').innerHTML = `${tr('Văn phòng đang chạy nền ở đáy màn hình.')}<br>${tr('Ai lười là thanh bar nháy đỏ, cứ bấm vào mà quất.')}`;
  $('btn-pip').textContent = tr('Ghim nổi lên mọi cửa sổ');
}
$('btn-pip').addEventListener('click', () => togglePip());

// --- Layout ------------------------------------------------------------------------
function setMode(mode) {
  if (pipWin && mode === 'office') pipWin.close();
  g.mode = mode;
  view.mode = mode;
  ui.closePanel();
  ui.setPipAvailable(canPip() && mode === 'mini');
  if (shell) { shell.setMode(mode); setIgnore(mode === 'mini'); }
  layout();
}
if (shell) shell.onMode((m) => setMode(m));

// Desktop shell: let clicks fall through the transparent parts of the taskbar strip.
let ignoring = null;
function setIgnore(v) { if (shell && v !== ignoring) { ignoring = v; shell.setIgnore(v); } }
let dragging = false;
if (shell) {
  document.addEventListener('mousemove', (ev) => {
    if (g.mode !== 'mini' || dragging) return setIgnore(false);
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    setIgnore(!(el && el.closest('#game, button, .grip, .stat, .assist, .panel, .card')));
  });
  document.addEventListener('mouseleave', () => g.mode === 'mini' && !dragging && setIgnore(true));

  // Drag the taskbar strip by its grip or any stat box; the shell follows the OS cursor.
  document.addEventListener('pointerdown', (ev) => {
    if (g.mode !== 'mini' || ev.button !== 0) return;
    const handle = ev.target.closest('.grip, .stat, .assist');
    if (!handle || ev.target.closest('button')) return;
    ev.preventDefault();
    dragging = true;
    setIgnore(false);
    handle.setPointerCapture(ev.pointerId);
    document.body.classList.add('dragging');
    shell.dragStart();
    const end = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('dragging');
      shell.dragEnd();
    };
    handle.addEventListener('pointerup', end, { once: true });
    handle.addEventListener('lostpointercapture', end, { once: true });
  }, true);
  addEventListener('blur', () => { if (dragging) { dragging = false; document.body.classList.remove('dragging'); shell.dragEnd(); } });
}
let lastMiniW = 0;

function layout() {
  const doc = stage.ownerDocument;
  const win = doc.defaultView;
  for (const b of [document.body, doc.body]) {
    b.classList.toggle('mode-office', g.mode === 'office');
    b.classList.toggle('mode-mini', g.mode === 'mini');
  }
  view.mode = g.mode;
  view.staffCount = g.staff.length;
  if (mobile) {
    fitMobile(true);
  } else if (g.mode === 'office') {
    view.resize(win.innerWidth - 16, win.innerHeight - 120);
  } else if (shell) {
    // Fixed 2x pixels on the taskbar; ask the shell for a window that fits the strip + HUD.
    view.resize(4000, 92);
    fitShell();
  } else {
    const hudW = win.innerWidth < 640 ? 0 : 300;
    view.resize(Math.max(120, win.innerWidth - hudW - 24), pipWin ? win.innerHeight - 8 : 104);
  }
}
addEventListener('resize', layout);

/**
 * Mobile: portrait (the normal phone layout) stacks the info card above the office and the
 * controls below it; the landscape fallback puts them in side columns. The canvas takes
 * whatever space the stage has left. Portrait draws the phone office (cubicle grid, portrait.js).
 */
let lastFit = '';
function fitMobile(force = false) {
  if (!mobile) return;
  const cs = getComputedStyle(stage);
  const row = cs.flexDirection.startsWith('row');
  const gap = parseFloat(row ? cs.columnGap : cs.rowGap) || 0;
  let w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  let h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  for (const el of root.hud.querySelectorAll('.side')) {
    if (row) w -= el.offsetWidth + gap; else h -= el.offsetHeight + gap;
  }
  view.portrait = !row;
  view.capacity = OFFICE_LEVELS[g.officeLevel].capacity;
  const sig = `${Math.round(w)}x${Math.round(h)}|${row}|${view.capacity}|${g.staff.length}`;
  if (!force && sig === lastFit) return;
  lastFit = sig;
  view.resize(Math.max(120, w), Math.max(80, h));
}

/** Size the shell window to the strip + the HUD's natural width (it changes as items unlock). */
function fitShell() {
  if (!shell || g.mode !== 'mini') return;
  const bars = [...root.hud.querySelectorAll('.bar')].map((b) => {
    let w = 0;
    for (const c of b.children) if (c.offsetParent !== null && !c.classList.contains('spacer')) w += c.offsetWidth + 12;
    return w;
  });
  const w = Math.ceil(view.W * view.scale + Math.max(...bars) + 40);
  if (Math.abs(w - lastMiniW) > 4) { lastMiniW = w; shell.miniWidth(w); }
}

// --- Input -------------------------------------------------------------------------
let touchHide = 0;
canvas.addEventListener('pointermove', (ev) => {
  const p = view.toLocal(ev.clientX, ev.clientY);
  if (ev.pointerType === 'mouse') { whip.place(p.x, p.y, !whip.visible); whip.visible = true; }
  const h = view.pick(p.x, p.y);
  view.hover = h ? h.e : null;
  if (h && ev.pointerType === 'mouse') ui.tag(ev.clientX, ev.clientY, h.e); else ui.tag(0, 0, null);
});
canvas.addEventListener('pointerleave', () => { whip.visible = false; view.hover = null; ui.tag(0, 0, null); });

canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  audio.unlock();
  if (paused || whip.busy) return;
  const p = view.toLocal(ev.clientX, ev.clientY);
  whip.place(p.x, p.y, !whip.visible);
  whip.visible = true;
  if (ev.pointerType !== 'mouse') touchHide = 1.2;
  const W = WHIPS[g.whipLevel];
  // Fingers are less precise than a mouse: give touch a little extra reach.
  const reach = W.radius + (ev.pointerType === 'mouse' ? 0 : TUNING.touchSlop);
  // Portrait office: tapping a free desk opens hiring instead of swinging at a neighbour.
  if (view.pickSlot(p.x, p.y)) { whip.visible = false; act.interview(); return; }
  const hit = view.pick(p.x, p.y, reach);
  // Aim the tip at the head of whoever is in reach, or at the empty spot clicked.
  const tx = hit ? hit.head.x : p.x, ty = hit ? hit.head.y + 4 : p.y;
  audio.whip(g.whipLevel);
  whip.lash(tx, ty, g.whipLevel, () => resolveHit(hit, ev.clientX, ev.clientY));
});

function resolveHit(hit, cx, cy) {
  if (!hit) return;
  const e = hit.e;
  const res = whipEmployee(g, e);
  const at = view.toClient(hit.head.x, hit.head.y - 6);
  const fine = whipWitnessed(g); // labour inspector watching?
  if (fine || (g.visit && g.visit.kind === 'labour' && g.visit.watching)) {
    haptic('wrong'); audio.grumble();
    toast(tr('BIÊN BẢN VI PHẠM! −{m} đ', { m: fmt(fine) }), 'wrong');
  }
  if (res.kind === 'catch') {
    haptic(g.combo >= 3 ? 'heavy' : 'hit');
    audio.ouch(1 + (e.id % 3) * 0.12);
    audio.coin(g.combo);
    ui.flash('hit');
    ui.popup(at.x, at.y - 10, 'BACK TO WORK!', 'btw');
    ui.popup(at.x, at.y + 22, `+${fmt(res.reward)} đ`, 'money');
    if (g.combo > 1) ui.popup(at.x, at.y - 40, `COMBO x${g.combo}`, 'combo');
    if (Math.random() < 0.5) ui.popup(at.x, at.y + 44, `"${tr(res.excuse)}"`, 'say');
  } else if (res.kind === 'wrong') {
    haptic('wrong');
    audio.ouch(0.8);
    audio.grumble();
    ui.flash('wrong');
    ui.popup(at.x, at.y - 10, tr('OAN QUÁ SẾP ƠI!'), 'wrong');
    if (res.reward) ui.popup(at.x, at.y + 22, `${fmt(res.reward)} đ`, 'loss');
  } else if (res.kind === 'strike') {
    ui.popup(at.x, at.y - 10, tr('Đang đình công!'), 'wrong');
  }
}

// --- Simulation events -----------------------------------------------------------------
function onEvent(type, e) {
  const hit = e && view.hits.find((h) => h.e === e);
  const at = hit ? view.toClient(hit.head.x, hit.head.y - 6) : { x: innerWidth / 2, y: innerHeight / 2 };
  switch (type) {
    case 'slack':
      if (g.mode === 'mini') audio.alert();
      break;
    case 'strike':
      audio.strike();
      haptic('heavy');
      ui.popup(at.x, at.y - 20, tr('{name} ĐÌNH CÔNG!', { name: e.name }), 'wrong');
      break;
    case 'strikeEnd':
      ui.popup(at.x, at.y - 20, tr('Quay lại làm...'), 'say');
      break;
    case 'assistant': {
      if (!hit) break;
      const from = g.mode === 'office' && view.assistantHand ? view.assistantHand : { x: view.W - 4, y: 4 };
      whip.autoLash(from.x, from.y, hit.head.x, hit.head.y + 4, g.whipLevel);
      audio.whip(Math.min(g.whipLevel, 1), 0.02);
      const res = whipEmployee(g, e, { auto: true });
      audio.ouch(1.1);
      ui.popup(at.x, at.y - 10, tr('TRỢ LÝ: LÀM ĐI!'), 'assist');
      ui.popup(at.x, at.y + 18, `+${fmt(res.reward)} đ`, 'money');
      break;
    }
    case 'projectDone': {
      const p = projects.complete(g);
      if (!p) break;
      audio.bell(); haptic('success');
      toast(tr('XONG DỰ ÁN! +{m} đ · +{n} KIM CƯƠNG', { m: fmt(p.money), n: p.gems }), 'money');
      save(g);
      break;
    }
    case 'visitStart': {
      const k = VISITS.kinds[e.kind];
      audio.alert(); audio.bell(); haptic('heavy');
      toast(tr('{name} ĐẾN KIỂM TRA!', { name: tr(k.name).toUpperCase() }), 'wrong');
      setTimeout(() => toast(`"${tr(k.line)}"`, 'say'), 1300);
      break;
    }
    case 'visitDistracted':
      toast(tr('Thanh tra đang lướt điện thoại… quất nhanh!'), 'money');
      break;
    case 'visitWatching':
      toast(tr('Thanh tra nhìn lại rồi!'), 'wrong');
      break;
    case 'visitEnd':
      showVisitResult(e);
      break;
    case 'dayEnd':
      endDay();
      break;
  }
}

/** Toast the outcome of a surprise visit (events.js → endVisit). */
function showVisitResult(r) {
  if (!r) return;
  const msg = {
    tax: r.ok ? tr('Thanh tra thuế hài lòng: +{n} KIM CƯƠNG', { n: r.gems }) : tr('Thanh tra thuế phạt {m} đ!', { m: fmt(r.fine) }),
    labour: r.ok ? tr('Doanh nghiệp nhân văn: +{n} KIM CƯƠNG', { n: r.gems }) : tr('Thanh tra lao động đi về. Tổng phạt {m} đ', { m: fmt(r.fine) }),
    vip: r.ok ? tr('Khách VIP ký hợp đồng: +{m} đ', { m: fmt(r.money) }) : tr('Khách VIP không hài lòng, bỏ về…'),
  }[r.kind];
  r.ok ? (audio.buy(), haptic('success')) : (audio.deny(), haptic('wrong'));
  toast(msg, r.ok ? 'money' : 'wrong');
  save(g);
}

function endDay() {
  if (paused) return;
  paused = true;
  if (g.visit) showVisitResult(endVisit(g)); // a visitor still in the office leaves at clock-out
  audio.bell();
  const t = g.today;
  const kpi = Math.round((t.kpiN ? t.kpiSum / t.kpiN : g.kpi) * 100);
  g.records.bestKpi = Math.max(g.records.bestKpi, kpi);
  if (t.catches >= 15 && t.wrong === 0) g.records.fairDays++;
  g.records.bestDays = [...g.records.bestDays, { day: g.day, revenue: Math.floor(t.revenue), kpi }]
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  save(g);
  const next = () => {
    // an overdue project fails when the new day starts (unless an ad extended it)
    if (projects.overdue(g)) {
      const p = projects.fail(g);
      toast(tr('DỰ ÁN THẤT BẠI: {name}', { name: tr(p.name) }), 'wrong');
    }
    g.day++;
    g.dayTime = 0;
    g.today = freshDay();
    newMorning();
    for (const e of g.staff) { e.energy = 100; e.stress = Math.max(0, e.stress - 50); e.state = 'work'; e.slack = null; e.t = 0; }
    paused = false;
    save(g);
  };
  // In the taskbar bar there is no room for a report card: roll straight into the next day.
  if (g.mode === 'mini') {
    const r = stage.getBoundingClientRect();
    ui.popup(r.left + r.width / 2, r.top + 20, tr('Tan ca! +{m} đ · KPI {k}%', { m: fmt(t.revenue), k: kpi }), 'money');
    setTimeout(next, 1500);
  } else {
    ui.showReport(next);
  }
}

// --- Loop ------------------------------------------------------------------------------
let last = performance.now();
let t = 0;
let uiAcc = 0;
let loopToken = 0;

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  step(dt);
  schedule();
}

function step(dt) {
  t += dt;
  if (!paused && !adOpen && !userPaused) simUpdate(g, dt, onEvent);
  whip.update(dt);
  if (touchHide > 0) { touchHide -= dt; if (touchHide <= 0) whip.visible = false; }
  view.render(g, whip, t);
  uiAcc += dt;
  if (uiAcc > 0.1) { uiAcc = 0; ui.update(); fitShell(); fitMobile(); }
}

function schedule() {
  const token = ++loopToken;
  const win = pipWin || window;
  win.requestAnimationFrame((now) => { if (token === loopToken) frame(now); });
}

// Leaving the game. Both visibilitychange and the native pause/resume events land here; the
// calls are idempotent.
//  - phone: the game freezes and shows the pause card; nothing happens while the player is away
//  - desktop: it keeps running (taskbar mode); hidden time is caught up on return (wall clock,
//    since performance.now() stops while hidden), capped at TUNING.awayCap seconds
let hiddenAt = 0;
function pauseGame() {
  if (userPaused || resetting) return;
  userPaused = true;
  ui.showPause(() => { userPaused = false; last = performance.now(); });
}
function goAway() {
  if (mobile) pauseGame();
  else if (!hiddenAt) hiddenAt = Date.now();
  // A reset reloads the page, which also fires visibilitychange → don't write the old save back.
  if (!resetting) save(g);
}
function comeBack() {
  if (mobile) { last = performance.now(); fitMobile(true); return; } // stays paused until "Tiếp tục"
  if (!hiddenAt) return;
  let away = Math.min(TUNING.awayCap, Math.max(0, (Date.now() - hiddenAt) / 1000));
  hiddenAt = 0;
  if (!pipWin) while (away > 0 && !paused) { const d = Math.min(0.25, away); simUpdate(g, d, onEvent); away -= d; }
  last = performance.now();
  if (mobile) fitMobile(true);
}
document.addEventListener('visibilitychange', () => (document.hidden ? goAway() : comeBack()));
addEventListener('pagehide', () => { if (!resetting) save(g); });
setInterval(() => { if (!resetting) save(g); }, 5000);

// --- Picture-in-Picture ----------------------------------------------------------------
async function togglePip() {
  if (pipWin) { pipWin.close(); return; }
  if (!pipSupported()) return;
  if (g.mode !== 'mini') setMode('mini');
  try {
    pipWin = await openPip(stage, {
      width: Math.min(900, g.staff.length * 38 * 2 + 340), height: 120,
      onClose: () => {
        pipWin = null;
        document.body.insertBefore(stage, root.panel);
        layout();
        schedule();
      },
    });
    pipWin.addEventListener('resize', layout);
    layout();
    schedule();
  } catch (err) {
    console.warn('[pip] failed', err);
  }
}

// --- Boot -------------------------------------------------------------------------------
/**
 * Android back button: close the top-most dialog, else pause the game; on the pause card it
 * returns false so the app goes to the background.
 */
function handleBack() {
  if (userPaused) return false;
  if (document.querySelector('.fake-ad')) return true; // finish or close the ad first
  if (!root.modal.hidden) {
    if (act.nextDay) act.nextDay();
    else if (act.closeInterview) act.closeInterview();
    else root.modal.hidden = true;
    return true;
  }
  if (!root.panel.hidden) { ui.closePanel(); return true; }
  if (mobile) { pauseGame(); return true; }
  return false;
}
await initPlatform({ onBack: handleBack, onPause: goAway, onResume: comeBack });

setMode(g.mode);
schedule();
window.__game = { g, view, whip, act, ui, projects }; // debugging + automated play tests (console only)
