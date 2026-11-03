// Boot, game loop and glue between simulation, view, whip and UI.
import { WHIPS, COFFEE, ASSISTANT, OFFICE_LEVELS, DECOR_ITEMS, MAX_STAFF, ADS, TUNING } from './config.js';
import { load, save, wipe, makeEmployee, freshDay, SAVE_KEY } from './state.js';
import { update as simUpdate, whipEmployee, useCoffee, assistantInterval, dayAdBonus } from './sim.js';
import { payMonth, isPayday, severanceOf } from './payroll.js';
import { hirePrice, refillCandidates } from './cv.js';
import * as projects from './projects.js';
import { claim, addGems } from './achievements.js';
import { buyPremium } from './premium.js';
import * as staffCare from './staff.js';
import { planVisit, whipWitnessed, endVisit } from './events.js';
import { VISITS, STAFF_TYPES } from './config.js';
import { showRewarded, initAds, lastAdFailure } from './ads.js';
import { t as tr, setLang } from './i18n.js';
import { createView } from './view.js';
import { createWhip } from './whip.js';
import { createUI, fmt } from './ui.js';
import { pipSupported, openPip } from './pip.js';
import * as audio from './audio.js';
import * as music from './music.js';
import { showTitle } from './title.js';
import { createTutorial, needsTutorial } from './tutorial.js';
import * as daily from './daily.js';
import { sellCompany, sharesFor } from './prestige.js';
import { hitBoss, winBoss } from './boss.js';
import * as mini from './minigames.js';
import * as inv from './inventory.js';
import * as skills from './skills.js';
import * as depts from './depts.js';
import * as rival from './rival.js';
import * as cos from './cosmetics.js';
import { makeCard, shareCard } from './share.js';
import { faceUrl } from './cv.js';
import { rankFor } from './ui.js';
import { OFFICE_LEVELS as OFFICES, SLACKS as SLACK_INFO } from './config.js';
import * as campaign from './campaign.js';
import { mobile, initPlatform, restoreBackup, haptic } from './platform.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage'), canvas = $('game');
const root = { stage, hud: $('hud'), fx: $('fx'), panel: $('panel'), modal: $('modal') };

// Native app: bring back the save from the native backup if the WebView storage was wiped.
await restoreBackup(SAVE_KEY);
const g = load();
// Offline earnings are measured from the last time the player was here, before anything saves.
let pendingOffline = daily.offlineEarnings(g, Date.now());
daily.touch(g, Date.now());
daily.refreshQuests(g, Date.now());
const params = new URLSearchParams(location.search);
if (params.get('mode') === 'mini') g.mode = 'mini';
// Phones/tablets have no taskbar: always play the full office.
if (mobile) g.mode = 'office';
audio.setMuted(g.muted);
music.setEnabled(mobile && !g.musicOff); // background music: phone game only (the taskbar stays quiet)

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
let rewardOpen = false; // …and while the project reward card waits to be collected
let tutorial = null;     // first-time tutorial (tutorial.js) while it runs
let dailyOpen = false;   // offline-earnings / login-gift popup on screen (daily.js)
let dailyAfterTutorial = false;
let dailyQueue = [];
// Campaign level in progress: { id, level, main (the real company, the only thing saved), visitsOk, visitsFail, visitIdx }
let campaignRun = null;
let miniOpen = false; // a mini-game (or its offer card) is on screen
/** Save the real company (never a campaign level's throw-away state). */
function saveGame() { save(campaignRun ? campaignRun.main : g); }
/** Replace the contents of g in place (every module holds the same object). */
function swapState(next) { for (const k of Object.keys(g)) delete g[k]; Object.assign(g, next); }
let userPaused = false; // phone: frozen while away / until the player taps "Tiếp tục"
let resetting = false;
// Phone: the title screen is up and the office waits behind it (?title=0 skips it, for tests).
let onTitle = mobile && params.get('title') !== '0';

// Morning routine (also on first launch / old saves): fresh CVs, client offers, ad caps.
function newMorning() {
  if (g.candidatesDay !== g.day || !g.candidates.length) { refillCandidates(g); g.candidatesDay = g.day; }
  projects.refreshOffers(g);
  if (g.ads.day !== g.day) g.ads = { day: g.day, gems: 0 };
  if (g.visitDay !== g.day) { planVisit(g); g.visitDay = g.day; } // once per day, reloads can't re-roll
  if (g.rivalDay !== g.day) { g.rivalDay = g.day; rival.planRival(g); } // rival poaching (rival.js)
  if (g.miniDay !== g.day) { // mid-day mini-game (minigames.js), from day 3
    g.miniDay = g.day;
    g.miniPlan = g.day >= 3 && Math.random() < 0.6
      ? { day: g.day, at: TUNING.dayLength * (0.3 + Math.random() * 0.45), kind: mini.MINI_KINDS[Math.floor(Math.random() * mini.MINI_KINDS.length)] } : null;
  }
}
newMorning();

// --- Actions (buttons) -----------------------------------------------------------
const act = {
  mode() { setMode(g.mode === 'office' ? 'mini' : 'office'); },
  mute() { g.muted = !g.muted; audio.setMuted(g.muted); },
  music() { g.musicOff = !g.musicOff; music.setEnabled(mobile && !g.musicOff); if (!g.musicOff) audio.unlock(); saveGame(); },
  coffee() {
    if (useCoffee(g)) { audio.coffee(); haptic('success'); ui.popup(innerWidth / 2, innerHeight * 0.3, tr('CÀ PHÊ SỐC!'), 'coffee'); }
  },
  pip: () => togglePip(),
  quit() { saveGame(); shell && shell.quit(); },
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
    saveGame();
  },
  purchaseDecor(id) {
    const item = DECOR_ITEMS.find((x) => x.id === id);
    if (!item || g.decor.includes(id) || g.officeLevel < item.level) return false;
    if (!pay(item.cost)) { audio.deny(); return false; }
    g.decor.push(id);
    audio.buy();
    haptic('success');
    saveGame();
    return true;
  },
  // --- Recruitment by CV (screens.js) ---
  cvHire(i) {
    const cv = g.candidates[Number(i)];
    if (!cv) return;
    const index = g.staff.length;
    if (index >= MAX_STAFF || index >= OFFICE_LEVELS[g.officeLevel].capacity) { audio.deny(); return toast(tr('Hết bàn trống, hãy mở rộng văn phòng!'), 'wrong'); }
    if (!pay(hirePrice(g, cv))) { audio.deny(); return toast(tr('Quỹ chưa đủ tiền tuyển.'), 'wrong'); }
    g.staff.push(makeEmployee(staffCare.nextStaffId(g), cv, { hiredDay: g.day }));
    if (cv.album !== undefined && cos.addCard(g, cv.album)) setTimeout(() => toast(tr('Thẻ mới trong album: {name}!', { name: cv.name }), 'money'), 1400);
    if (cv.type === 'nephew') { // comes with a thank-you from the big boss
      const gift = Math.round(STAFF_TYPES.nephew.gift * (1 + TUNING.dayMult * (g.day - 1)) / 10) * 10;
      g.money += gift;
      setTimeout(() => toast(tr('Quà cảm ơn của sếp tổng: +{m} đ', { m: fmt(gift) }), 'money'), 900);
    }
    if (cv.star) g.records.starsHired++;
    g.candidates.splice(Number(i), 1);
    layout();
    audio.buy(); haptic('success');
    toast(tr('ĐÃ TUYỂN {name}!', { name: cv.name.toUpperCase() }), 'money');
    saveGame(); ui.screens.repaint();
  },
  cvReject(i) {
    g.candidates.splice(Number(i), 1);
    saveGame(); ui.screens.repaint();
  },
  async adCv() {
    if (await watchAd('cv')) { refillCandidates(g); toast(tr('3 CV MỚI!'), 'money'); saveGame(); }
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
    saveGame(); ui.screens.repaint();
  },
  staffFire(id) {
    const e = g.staff.find((x) => x.id === Number(id));
    if (!e) return;
    if (!confirm(tr('Sa thải {name}? Phải trả {m} đ lương cho những ngày đã làm trong tháng. Những người còn lại sẽ lo lắng (−động lực, +áp lực).', { name: e.nickname || e.name, m: fmt(severanceOf(g, e)) }))) return;
    const r = staffCare.fire(g, e);
    if (!r) { audio.deny(); return; }
    audio.strike(); haptic('heavy');
    toast(tr('ĐÃ SA THẢI {name} · −{m} đ', { name: e.name.toUpperCase(), m: fmt(r.severance) }), 'wrong');
    layout();
    saveGame(); ui.screens.repaint();
  },
  // --- Projects ---
  projAccept(i) {
    if (projects.acceptOffer(g, Number(i))) { audio.buy(); haptic('success'); toast(tr('NHẬN DỰ ÁN!'), 'money'); saveGame(); }
    ui.screens.repaint();
  },
  projAbandon() {
    const p = g.projects.active;
    if (!p || !confirm(tr('Huỷ dự án này? Dự án sẽ tính là thất bại và bị phạt hợp đồng {m} đ.', { m: fmt(projects.penaltyOf(p)) }))) return;
    const r = projects.abandon(g);
    audio.deny(); haptic('wrong');
    toast(tr('HUỶ DỰ ÁN · PHẠT {m} đ', { m: fmt(r.fine) }), 'wrong');
    saveGame(); ui.screens.repaint();
  },
  async adExtend() {
    if (await watchAd('extend') && projects.extend(g)) { toast(tr('GIA HẠN +1 NGÀY'), 'money'); saveGame(); }
    ui.screens.repaint(); ui.refreshReport();
  },
  // --- 💎 ---
  vipBuy(id) {
    const name = buyPremium(g, id);
    if (!name) { audio.deny(); return; }
    audio.buy(); haptic('success');
    toast(tr(name).toUpperCase() + '!', 'coffee');
    if (id === 'starCv') { ui.screens.cv(); }
    saveGame(); ui.screens.repaint();
  },
  async adGems() {
    if (g.ads.day !== g.day) g.ads = { day: g.day, gems: 0 };
    if (g.ads.gems >= ADS.gemAdsPerDay) return;
    if (await watchAd('gems')) { g.ads.gems++; addGems(g, ADS.gemsPerAd); toast(tr('+{n} KIM CƯƠNG', { n: ADS.gemsPerAd }), 'coffee'); saveGame(); }
    ui.screens.repaint();
  },
  achClaim(id) {
    const gems = claim(g, id);
    if (gems) { audio.buy(); haptic('success'); toast(tr('+{n} KIM CƯƠNG', { n: gems }), 'coffee'); saveGame(); }
    ui.screens.repaint();
  },
  // --- boss inventory (inventory.js) ---
  inventory() { ui.closePanel(); inv.invState(g).fresh = 0; ui.screens.inventory(); },
  invSelect(id) { ui.screens.invSelect(Number(id)); },
  invTab(tab) { ui.screens.invTab(tab); },
  depts() { ui.closePanel(); ui.screens.depts(); },
  deptAppoint(id) { if (depts.appoint(g, Number(id))) { audio.buy(); haptic('success'); toast(tr('ĐÃ BỔ NHIỆM TRƯỞNG PHÒNG!'), 'money'); saveGame(); } ui.screens.repaint(); },
  deptDismiss(role) { depts.dismiss(g, role); saveGame(); ui.screens.repaint(); },
  invEquip(id) { if (inv.equip(g, Number(id))) { audio.buy(); haptic('light'); saveGame(); } ui.screens.repaint(); },
  invUnequip(slot) { inv.unequip(g, slot); saveGame(); ui.screens.repaint(); },
  invSell(id) {
    const it = inv.invState(g).items.find((x) => x.id === Number(id));
    if (!it || (it.rarity >= 2 && !confirm(tr('Bán {name} ({r})?', { name: tr(inv.itemName(it)), r: tr(inv.RARITY[it.rarity].name) })))) return;
    const m = inv.sell(g, it.id);
    toast(`+${fmt(m)} đ`, 'money'); audio.coin(1);
    ui.screens.invSelect(0);
    saveGame();
  },
  roar() {
    const n = skills.roar(g);
    if (!skills.rank(g, 'roar')) return;
    audio.strike(); audio.alert(); haptic('heavy'); ui.flash('hit');
    toast(n ? tr('TIẾNG GẦM! {n} người quay lại làm việc', { n }) : tr('TIẾNG GẦM! Cả phòng hăng say'), 'money');
    saveGame();
  },
  learnSkill(id) { if (skills.learn(g, id)) { audio.buy(); haptic('success'); saveGame(); } ui.screens.repaint(); },
  // --- collections (cosmetics.js) ---
  collection(tab) { ui.closePanel(); ui.screens.collection(tab || 'skins'); },
  colTab(tab) { ui.screens.collection(tab); },
  useSkin(id) { const r = cos.useSkin(g, id === 'none' ? null : id); if (r === 'gems') { audio.deny(); toast(tr('Chưa đủ kim cương'), 'wrong'); } else if (!r) { audio.whip(g.whipLevel, 0.05, (cos.skinOf(g) || {}).sound || ''); saveGame(); } ui.screens.repaint(); },
  usePet(id) { const r = cos.usePet(g, id === 'none' ? null : id); if (r === 'gems') { audio.deny(); toast(tr('Chưa đủ kim cương'), 'wrong'); } else if (!r) { audio.buy(); saveGame(); } ui.screens.repaint(); },
  albumClaim(setId) {
    const n = cos.claimSet(g, setId);
    if (!n) return;
    audio.buy(); haptic('success'); toast(tr('+{n} KIM CƯƠNG', { n }), 'coffee');
    announceItem(inv.addItem(g, inv.rollItem(g, setId === 'all' ? 3 : 1)));
    saveGame(); ui.screens.repaint();
  },
  // --- sharing (share.js) ---
  async share(arg = 'office') {
    const [kind, id] = String(arg).split(':');
    const snapshot = canvas;
    let card, caption;
    try {
      if (kind === 'report') {
        const d = g.today, kpi = Math.round((d.kpiN ? d.kpiSum / d.kpiN : g.kpi) * 100);
        card = await makeCard({ headline: tr('NGÀY {n} · KPI {k}%', { n: g.day, k: kpi }), sub: rankFor(kpi / 100), snapshot,
          rows: [[tr('Doanh thu'), `${fmt(d.revenue)} đ`], [tr('Bắt quả tang'), String(d.catches)], [tr('Combo cao nhất'), `x${d.bestCombo}`]] });
        caption = tr('Hôm nay tôi bắt {n} nhân viên lười, KPI {k}%! Bạn làm sếp giỏi hơn không?', { n: d.catches, k: kpi });
      } else if (kind === 'whip') {
        const e = g.staff.find((x) => x.id === Number(id));
        if (!e) return;
        const name = e.nickname || e.name, why = SLACK_INFO[e.slack || e.cv.fav] || SLACK_INFO.game;
        card = await makeCard({ headline: tr('SẾP VỪA QUẤT {name}!', { name: name.toUpperCase() }), sub: tr('Tội danh: {why}', { why: tr(why.label) }),
          images: [{ src: inv.bossUrl(g, true), x: 250, y: 470, w: 200, h: 340 }, { src: faceUrl(e.look, e.cv.star), x: 600, y: 540, w: 224, h: 224 }],
          rows: [], snapshot: null });
        const x = card.getContext('2d'); x.fillStyle = '#ffd34d'; for (let i = 0; i < 9; i++) x.fillRect(450 + i * 18, 560 - Math.round(Math.sin(i / 2.6) * 60), 14, 10);
        x.font = '64px VT323, monospace'; x.textAlign = 'center'; x.fillStyle = '#ff6a6a'; x.fillText(`"${tr(why.excuse)}"`, 540, 900);
        caption = tr('{name} vừa bị Sếp quất vì tội {why} 😂', { name, why: tr(why.label).toLowerCase() });
      } else if (kind === 'level' && campaignRun) {
        const states = campaignRun.level.goals.map((goal) => campaign.goalState(g, campaignRun, goal, true));
        const n = states.filter((s) => s.ok).length;
        card = await makeCard({ headline: tr('MÀN {id}: {n}/3 SAO', { id: campaignRun.id, n }), sub: tr(campaignRun.level.name), snapshot,
          rows: campaignRun.level.goals.map((goal, i) => { const tx = campaign.goalText(...goal); return [tr(tx.s, { n: fmt(tx.n) }), states[i].ok ? '★' : '✗']; }) });
        caption = tr('Tôi vừa qua màn {id} với {n} sao!', { id: campaignRun.id, n });
      } else {
        card = await makeCard({ headline: tr('CÔNG TY CỦA TÔI'), sub: `${tr(OFFICES[g.officeLevel].name)} · ${tr('{n} nhân viên', { n: g.staff.length })}`, snapshot,
          rows: [[tr('Ngày'), String(g.day)], [tr('Quỹ'), `${fmt(g.money)} đ`], [tr('Cấp sếp'), String(skills.skState(g).lvl)]] });
        caption = tr('Công ty của tôi trong Whip Boss, ai lười là ăn roi!');
      }
    } catch (err) { console.warn('[share]', err); return; }
    const r = await shareCard(card, caption);
    if (r === 'downloaded') toast(tr('Đã lưu ảnh'), 'money');
    if (r === 'shared') { g.records.shares = (g.records.shares || 0) + 1; saveGame(); }
  },
  rivalStart() { if (!miniOpen) startRival(); },
  miniStart(kind) { if (!miniOpen) startMini(kind || 'mouse'); },
  // --- campaign (campaign.js) ---
  levels() { ui.closePanel(); ui.screens.levels(); },
  levelInfo(id) { ui.screens.levelInfo(id); },
  levelStart(id) { startLevel(id); },
  levelQuit() { if (campaignRun && confirm(tr('Bỏ màn này? Kết quả sẽ không được tính.'))) exitLevel(); },
  levelRetry() { const id = campaignRun && campaignRun.id; exitLevel(false); if (id) startLevel(id); },
  levelNext() { const id = campaignRun && campaignRun.id; exitLevel(false); const n = id && campaign.nextLevel(id); if (n && campaign.unlocked(g, n.id)) ui.screens.levelInfo(n.id); else ui.screens.levels(); },
  levelExit() { exitLevel(); },
  // --- selling the company (prestige.js) ---
  sellScreen() { ui.screens.sell(); },
  sellCompany() {
    const n = sharesFor(g);
    if (!confirm(tr('Bán công ty cho nhà đầu tư? Bạn nhận {n} cổ phần nhưng tiền, nhân viên, văn phòng và các nâng cấp sẽ làm lại từ đầu.', { n }))) return;
    const gained = sellCompany(g);
    if (!gained) return;
    resetting = true; // the page reloads into the new run; don't let pagehide write the old state
    g.justSold = gained;
    saveGame();
    location.reload();
  },
  // --- daily popups + quests (daily.js) ---
  offlineCollect: () => finishDaily(1),
  offlineDouble: () => finishDaily(2),
  loginClaim: () => finishDaily(1),
  loginDouble: () => finishDaily(2),
  questClaim(i) {
    const n = daily.claimQuest(g, Number(i));
    if (n) { audio.buy(); haptic('success'); toast(tr('+{n} KIM CƯƠNG', { n }), 'coffee'); saveGame(); }
    ui.screens.repaint();
  },
  questBonus() {
    const n = daily.claimQuestBonus(g);
    if (n) { audio.buy(); haptic('success'); toast(tr('+{n} KIM CƯƠNG', { n }), 'coffee'); saveGame(); }
    ui.screens.repaint();
  },
  // --- project reward card ---
  projCollect() { collectProject(1); },
  async projDouble() {
    if (!g.projects.reward) return;
    if (await watchAd('projectDouble')) collectProject(2);
  },
  // --- end of day ---
  async adDouble() {
    if (g.today.doubled) return;
    if (await watchAd('double')) {
      const bonus = dayAdBonus(g);
      g.money += bonus; g.lifetimeEarnings += bonus; g.today.doubled = true;
      toast(`+${fmt(bonus)} đ`, 'money'); saveGame();
    }
    ui.refreshReport();
  },
  setNickname(id, nickname) {
    const employee = g.staff.find((e) => e.id === Number(id));
    const value = String(nickname || '').trim().slice(0, 20);
    if (!employee || !value) return false;
    employee.nickname = value;
    saveGame();
    return true;
  },
  setLang(code) {
    // Rebuild every screen in the new language: simplest and safest is a reload (state is saved).
    setLang(code);
    saveGame();
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
    else if (lastAdFailure === 'unavailable') toast(tr('Chưa có quảng cáo, thử lại sau ít phút.'), 'wrong');
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
  const reach = W.radius + (ev.pointerType === 'mouse' ? 0 : TUNING.touchSlop) + inv.bonus(g, 'reach');
  // The weekly boss takes priority over everything else under the finger.
  if (g.boss && view.hitsBoss(p.x, p.y, ev.pointerType === 'mouse' ? 2 : 8)) {
    const r = view.bossHit, bx = (r.x0 + r.x1) / 2, by = r.y0 + 20;
    audio.whip(g.whipLevel, 0.13, (cos.skinOf(g) || {}).sound || '');
    whip.lash(bx, by, g.whipLevel, () => resolveBossHit(bx, by));
    return;
  }
  // Portrait office: tapping a free desk opens hiring instead of swinging at a neighbour.
  if (view.pickSlot(p.x, p.y)) { whip.visible = false; act.interview(); return; }
  const hit = view.pick(p.x, p.y, reach);
  // Aim the tip at the head of whoever is in reach, or at the empty spot clicked.
  const tx = hit ? hit.head.x : p.x, ty = hit ? hit.head.y + 4 : p.y;
  audio.whip(g.whipLevel, 0.13, (cos.skinOf(g) || {}).sound || '');
  whip.lash(tx, ty, g.whipLevel, () => resolveHit(hit, ev.clientX, ev.clientY));
});

function resolveBossHit(bx, by) {
  if (!g.boss) return;
  const at = view.toClient(bx, by - 10);
  const r = hitBoss(g);
  if (r === 'dodge') { audio.deny(); haptic('light'); ui.popup(at.x, at.y, tr('NÉ!'), 'say'); return; }
  haptic('heavy'); audio.ouch(0.7); ui.flash('hit');
  ui.popup(at.x, at.y, `−${Math.round((1 + 0.5 * g.whipLevel) * 10) / 10}`, 'wrong');
  if (r === 'win') {
    const w = winBoss(g);
    addGems(g, w.gems);
    audio.bell(); audio.buy();
    toast(tr('HẠ TRÙM TUẦN! +{m} đ · +{n} KIM CƯƠNG', { m: fmt(w.money), n: w.gems }), 'money');
    onBossChest();
    saveGame();
  }
}
/** The boss chest always holds an epic-or-better item. */
function onBossChest() { announceItem(inv.addItem(g, inv.rollItem(g, 2))); gainXp(g, skills.XP.boss); }

/** Boss XP (skills.js); a level-up gives a skill point. `who` = the real company. */
function gainXp(who, n) {
  const up = skills.addXp(who, n);
  if (up) setTimeout(() => { toast(tr('SẾP LÊN CẤP {n}! +1 điểm kỹ năng', { n: who.sk.lvl }), 'money'); audio.bell(); }, 300);
}

/** A new item went into the bag: popup + toast in its rarity colour. */
function announceItem(it, at) {
  const p = at || { x: innerWidth / 2, y: innerHeight * 0.4 };
  setTimeout(() => {
    ui.popup(p.x, p.y - 60, tr('RƠI ĐỒ!'), `item r${it.rarity}`);
    toast(`${tr(inv.RARITY[it.rarity].name)}: ${tr(inv.itemName(it))}`, `item r${it.rarity}`);
    audio.buy(); haptic('success');
  }, 500);
}

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
    if (!campaignRun) { const it = inv.maybeDrop(g, g.combo); if (it) announceItem(it, at); gainXp(g, skills.XP.catch); }
  } else if (res.kind === 'wrong') {
    haptic('wrong');
    audio.ouch(0.8);
    audio.grumble();
    ui.flash('wrong');
    ui.popup(at.x, at.y - 10, tr('OAN QUÁ SẾP ƠI!'), 'wrong');
    if (res.reward) ui.popup(at.x, at.y + 22, `${fmt(res.reward)} đ`, 'loss');
  } else if (res.kind === 'strike') {
    ui.popup(at.x, at.y - 10, tr('Đang đình công!'), 'wrong');
  } else if (res.kind === 'half') {
    haptic('hit'); audio.ouch(1.2);
    ui.popup(at.x, at.y - 10, tr('CÚP MÁY! (thêm 1 roi)'), 'say');
  } else if (res.kind === 'nephew') {
    haptic('wrong'); audio.grumble(); audio.deny(); ui.flash('wrong');
    ui.popup(at.x, at.y - 10, tr('CHÁU SẾP TỔNG ĐẤY!'), 'wrong');
    ui.popup(at.x, at.y + 22, `${fmt(res.reward)} đ`, 'loss');
  }
  if (res.spy) setTimeout(() => { ui.popup(at.x, at.y - 40, tr('LỘ MẶT GIÁN ĐIỆP!'), 'wrong'); toast(tr('Thu hồi {m} đ từ gián điệp', { m: fmt(res.spy) }), 'money'); }, 400);
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
      if (!projects.finish(g)) break;
      audio.bell(); haptic('success');
      saveGame();
      showProjectReward();
      break;
    }
    case 'bossStart':
      audio.alert(); audio.strike(); haptic('heavy');
      toast(tr('TRÙM TUẦN XUẤT HIỆN!'), 'wrong');
      setTimeout(() => toast(tr('Quất hắn {n} lần trước khi hắn chuồn!', { n: Math.ceil(g.boss ? g.boss.max / (1 + 0.5 * g.whipLevel) : 0) }), 'say'), 1400);
      break;
    case 'bossLose':
      audio.deny(); haptic('wrong');
      toast(tr('TRÙM ĐÃ CHUỒN, CUỖM {m} đ!', { m: fmt(e.stolen) }), 'wrong');
      saveGame();
      break;
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

// --- Office pets (cosmetics.js) -----------------------------------------------------------------
/** The dog barks at anyone slacking for more than 3 s (once per slack). */
function petTick() {
  if (cos.petOf(g) !== 'dog' || paused) return;
  const e = g.staff.find((x) => x.state === 'slack' && x.t > 3 && !x.barked);
  if (!e) return;
  e.barked = true;
  const h = view.hits.find((x) => x.e === e);
  audio.bark();
  if (h) { const at = view.toClient(h.head.x, h.head.y - 18); ui.popup(at.x, at.y, tr('GÂU GÂU!'), 'say'); }
}

// --- Mid-day mini-games (minigames.js) ----------------------------------------------------------
function checkMini() {
  if (params.get('mini') === '0') return; // automated tests
  const p = g.miniPlan;
  if (!p || p.day !== g.day || g.dayTime < p.at || miniOpen || paused || rewardOpen || dailyOpen || userPaused || onTitle || tutorial || g.boss || g.visit || g.mode !== 'office') return;
  g.miniPlan = null;
  startMini(p.kind);
}
function checkRival() {
  if (params.get('mini') === '0') return; // automated tests
  const p = g.rivalPlan;
  if (!p || p.day !== g.day || g.dayTime < p.at || miniOpen || paused || rewardOpen || dailyOpen || userPaused || onTitle || tutorial || g.boss || g.mode !== 'office') return;
  g.rivalPlan = null;
  startRival();
}
function startRival() {
  const e = rival.target(g);
  if (!e) return;
  miniOpen = true;
  audio.alert(); haptic('heavy');
  rival.showOffer(g, e, fmt, (choice) => {
    const r = rival.resolve(g, e, choice) || rival.resolve(g, e, 'go');
    miniOpen = false; last = performance.now();
    if (r.kept) { audio.buy(); toast(tr('{name} Ở LẠI!', { name: (e.nickname || e.name).toUpperCase() }), 'money'); }
    else { audio.deny(); toast(tr('{name} đã sang Lười Corp · +{m} đ phí', { name: e.nickname || e.name, m: fmt(r.fee || 0) }), 'wrong'); layout(); }
    saveGame(); ui.screens.repaint();
  });
}
function startMini(kind) {
  miniOpen = true;
  audio.alert(); haptic('light');
  mini.offer(kind, () => mini.play(kind, (r) => finishMini(kind, r)), () => { miniOpen = false; last = performance.now(); saveGame(); });
}
function finishMini(kind, { score, max }) {
  const dm = 1 + TUNING.dayMult * (g.day - 1);
  const msg = [];
  if (kind === 'mouse') {
    const money = Math.round((250 * dm * score) / max / 10) * 10;
    g.money += money; g.lifetimeEarnings += money;
    msg.push(`+${fmt(money)} đ`);
    if (score >= max) { addGems(g, 3); msg.push(tr('+{n} KIM CƯƠNG', { n: 3 })); if (Math.random() < inv.DROP.mini) announceItem(inv.addItem(g, inv.rollItem(g))); }
  } else if (kind === 'tabs') {
    const money = Math.round((120 * dm * score) / 10) * 10;
    g.money += money; g.lifetimeEarnings += money;
    for (const e of g.staff) e.motiv = Math.min(100, (e.motiv ?? 50) + 6 * score);
    msg.push(`+${fmt(money)} đ`, tr('Động lực +{n}', { n: 6 * score }));
  } else {
    for (const e of g.staff) { e.boost = Math.max(e.boost, 4 * score); e.motiv = Math.min(100, (e.motiv ?? 50) + 4 * score); if (score && e.state === 'slack') { e.state = 'work'; e.t = 0; e.slack = null; } }
    msg.push(tr('Cả phòng hăng say {n} giây', { n: 4 * score }));
  }
  g.records.miniGames = (g.records.miniGames || 0) + 1;
  if (score) gainXp(g, skills.XP.mini);
  mini.closeMini();
  miniOpen = false; last = performance.now();
  score ? (audio.buy(), haptic('success')) : audio.deny();
  toast(`${tr('{s}/{m} điểm', { s: score, m: max })} · ${msg.join(' · ')}`, score ? 'money' : 'wrong');
  saveGame();
}

// --- Campaign levels -------------------------------------------------------------------------
function startLevel(id) {
  const level = campaign.LEVELS.find((l) => l.id === id);
  if (!level || campaignRun || !campaign.unlocked(g, id)) return;
  const main = JSON.parse(JSON.stringify(g));
  saveGame();
  campaignRun = { id, level, main, visitsOk: 0, visitsFail: 0, visitIdx: 0 };
  swapState(campaign.levelState(level));
  ui.closePanel(); root.modal.hidden = true; if (act.closeScreen) act.closeScreen();
  paused = false; last = performance.now();
  document.body.classList.add('in-level');
  layout(); fitMobile(true);
  ui.levelBar(campaignRun);
  ui.dayBanner(0, tr('MÀN {id}', { id }), tr(level.name));
}
/** Every frame during a level: scheduled inspectors and the blackout flicker. */
function levelTick() {
  const r = campaignRun, visits = (g.mods && g.mods.visits) || [];
  const v = visits[r.visitIdx];
  if (v && !g.visit && !g.visitPlan && g.dayTime >= v.at - 0.5) { g.visitPlan = { day: g.day, at: v.at, kind: v.kind }; r.visitIdx++; }
  ui.blackout(g.mods && g.mods.blackout ? (t % 3.2 < 0.5 ? 0 : 0.93) : -1);
}
function finishLevel() {
  const r = campaignRun;
  if (g.visit) showVisitResult(endVisit(g));
  const states = r.level.goals.map((goal) => campaign.goalState(g, r, goal, true));
  const stars = states.map((s) => s.ok);
  const before = campaign.bestStars(r.main, r.id);
  const result = campaign.settle(r.main, r, stars);
  // first time at 3 stars: a rare-or-better item for the real company's bag
  if (result.gained) gainXp(r.main, skills.XP.star * result.gained);
  if (result.count === 3 && before < 3) { result.item = inv.addItem(r.main, inv.rollItem(r.main, 1)); announceItem(result.item); }
  ui.blackout(-1);
  stars.filter(Boolean).length ? (audio.buy(), haptic('success')) : (audio.deny(), haptic('wrong'));
  saveGame();
  ui.showLevelResult(r, states, result, campaign.nextLevel(r.id));
}
function exitLevel(openHub = true) {
  if (!campaignRun) return;
  const main = campaignRun.main;
  campaignRun = null;
  swapState(main);
  daily.touch(g, Date.now());
  ui.blackout(-1);
  ui.levelBar(null);
  root.modal.hidden = true; if (act.closeScreen) act.closeScreen();
  document.body.classList.remove('in-level');
  paused = false; last = performance.now();
  layout(); fitMobile(true);
  saveGame();
  if (openHub) ui.screens.levels();
}

/** Phone, entering the office: the first-time tutorial for a new game, else the day banner. */
function startDay() {
  if (mobile && needsTutorial(g) && params.get('tutorial') !== '0') {
    tutorial = createTutorial({
      g, view,
      onSave: () => saveGame(),
      onGems: (n) => { addGems(g, n); audio.buy(); toast(tr('+{n} KIM CƯƠNG', { n }), 'coffee'); saveGame(); },
      slackFor: (e, kind) => Object.assign(e, { state: 'slack', slack: kind, t: 0, dur: 999 }),
    });
    tutorial.start();
    dailyAfterTutorial = true; // the login gift waits until the tutorial is over
  } else {
    if (g.tutorial === undefined) needsTutorial(g);
    ui.dayBanner(g.day);
    if (g.justSold) { setTimeout(() => toast(tr('ĐÃ BÁN CÔNG TY · +{n} CỔ PHẦN', { n: g.justSold }), 'money'), 2300); delete g.justSold; }
    runDailyFlow();
  }
}

/** Offline earnings, then today's login gift, one popup after the other (daily.js). */
function runDailyFlow() {
  if (params.get('daily') === '0') return; // automated tests
  const now = Date.now();
  daily.refreshQuests(g, now);
  const queue = [];
  if (pendingOffline) queue.push(['offline', pendingOffline]);
  pendingOffline = null;
  const day = daily.checkLogin(g, now);
  if (day) queue.push(['login', day]);
  saveGame();
  if (g.mode === 'mini') { // no room for cards in the taskbar strip: collect quietly
    for (const [kind, data] of queue) kind === 'offline' ? daily.collectOffline(g, data) : daily.claimLogin(g);
    saveGame();
    return;
  }
  dailyQueue = queue;
  nextDaily();
}
let currentDaily = null;
function nextDaily() {
  currentDaily = dailyQueue.shift() || null;
  dailyOpen = !!currentDaily;
  if (!currentDaily) { ui.hideDaily(); last = performance.now(); return; }
  const [kind, data] = currentDaily;
  kind === 'offline' ? ui.showOffline(data) : ui.showLogin(data);
}
async function finishDaily(mult) {
  if (!currentDaily) return;
  if (mult === 2 && !(await watchAd(currentDaily[0] === 'offline' ? 'offlineDouble' : 'loginDouble'))) return;
  const [kind, data] = currentDaily;
  if (kind === 'offline') {
    const m = daily.collectOffline(g, data, mult);
    toast(`+${fmt(m)} đ`, 'money');
  } else {
    const gift = daily.claimLogin(g, mult);
    if (gift) toast([gift.money ? `+${fmt(gift.money)} đ` : '', gift.gems ? tr('+{n} KIM CƯƠNG', { n: gift.gems }) : ''].filter(Boolean).join(' · '), 'coffee');
  }
  audio.buy(); haptic('success');
  saveGame();
  nextDaily();
}

/** Show the reward card for a finished project (the taskbar strip has no room: pay at once). */
function showProjectReward() {
  if (!g.projects.reward) return;
  if (g.mode === 'mini' || campaignRun) { collectProject(1); return; } // levels: no popup
  rewardOpen = true;
  ui.showProjectReward(g.projects.reward);
}
function collectProject(mult) {
  const r = projects.collect(g, mult);
  if (r && !campaignRun) gainXp(g, skills.XP.project);
  rewardOpen = false;
  ui.hideProjectReward();
  last = performance.now();
  if (!r) return;
  audio.buy(); audio.coin(8); haptic('success');
  toast(`+${fmt(r.money)} đ`, 'money');
  saveGame();
  ui.screens.repaint();
}

/** Toast the outcome of a surprise visit (events.js → endVisit). */
function showVisitResult(r) {
  if (!r) return;
  if (campaignRun) r.ok ? campaignRun.visitsOk++ : campaignRun.visitsFail++;
  const msg = {
    tax: r.ok ? tr('Thanh tra thuế hài lòng: +{n} KIM CƯƠNG', { n: r.gems }) : tr('Thanh tra thuế phạt {m} đ!', { m: fmt(r.fine) }),
    labour: r.ok ? tr('Doanh nghiệp nhân văn: +{n} KIM CƯƠNG', { n: r.gems }) : tr('Thanh tra lao động đi về. Tổng phạt {m} đ', { m: fmt(r.fine) }),
    vip: r.ok ? tr('Khách VIP ký hợp đồng: +{m} đ', { m: fmt(r.money) }) : tr('Khách VIP không hài lòng, bỏ về…'),
  }[r.kind];
  r.ok ? (audio.buy(), haptic('success')) : (audio.deny(), haptic('wrong'));
  toast(msg, r.ok ? 'money' : 'wrong');
  saveGame();
}

function endDay() {
  if (paused) return;
  paused = true;
  if (campaignRun) { finishLevel(); return; }
  if (g.visit) showVisitResult(endVisit(g)); // a visitor still in the office leaves at clock-out
  audio.bell();
  const t = g.today;
  const kpi = Math.round((t.kpiN ? t.kpiSum / t.kpiN : g.kpi) * 100);
  g.records.bestKpi = Math.max(g.records.bestKpi, kpi);
  if (t.catches >= 15 && t.wrong === 0) g.records.fairDays++;
  g.records.bestDays = [...g.records.bestDays, { day: g.day, revenue: Math.floor(t.revenue), kpi }]
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  // pay day: salaries + rent for the month (payroll.js), shown on the report card
  if (isPayday(g)) {
    t.payroll = payMonth(g);
    if (t.payroll.short > 0) { audio.deny(); haptic('wrong'); }
  }
  saveGame();
  const next = () => {
    // an overdue project fails when the new day starts (unless an ad extended it)
    if (projects.overdue(g)) {
      const { p, fine } = projects.fail(g);
      audio.deny(); haptic('wrong');
      toast(tr('DỰ ÁN THẤT BẠI: {name} · PHẠT {m} đ', { name: tr(p.name), m: fmt(fine) }), 'wrong');
    }
    g.day++;
    g.dayTime = 0;
    g.today = freshDay();
    newMorning();
    for (const e of g.staff) { e.energy = 100; e.stress = Math.max(0, e.stress - 50); e.state = 'work'; e.slack = null; e.t = 0; }
    paused = false;
    saveGame();
    if (mobile) ui.dayBanner(g.day);
  };
  // In the taskbar bar there is no room for a report card: roll straight into the next day.
  if (g.mode === 'mini') {
    const r = stage.getBoundingClientRect();
    ui.popup(r.left + r.width / 2, r.top + 20, tr('Tan ca! +{m} đ · KPI {k}%', { m: fmt(t.revenue), k: kpi }), 'money');
    if (t.payroll) setTimeout(() => ui.popup(r.left + r.width / 2, r.top + 20, tr('Trả lương: −{m} đ', { m: fmt(t.payroll.paid) }), t.payroll.short ? 'wrong' : 'money'), 700);
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
  whip.skin = cos.skinOf(g);
  if (!campaignRun) petTick();
  if (campaignRun) levelTick();
  else { checkMini(); checkRival(); }
  if (!paused && !adOpen && !rewardOpen && !dailyOpen && !miniOpen && !userPaused && !onTitle && !(tutorial && tutorial.blocking)) simUpdate(g, dt, onEvent);
  whip.update(dt);
  if (touchHide > 0) { touchHide -= dt; if (touchHide <= 0) whip.visible = false; }
  view.render(g, whip, t);
  uiAcc += dt;
  if (uiAcc > 0.1) { uiAcc = 0; ui.update(); fitShell(); fitMobile(); if (tutorial) { tutorial.update(); if (!tutorial.active) { tutorial = null; if (dailyAfterTutorial) { dailyAfterTutorial = false; runDailyFlow(); } } } }
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
  music.pause();
  if (onTitle || userPaused || resetting) return;
  userPaused = true;
  ui.showPause(() => { userPaused = false; last = performance.now(); audio.unlock(); music.resume(); if (!tutorial) runDailyFlow(); });
}
function goAway() {
  if (mobile) pauseGame();
  else if (!hiddenAt) hiddenAt = Date.now();
  // A reset reloads the page, which also fires visibilitychange → don't write the old save back.
  if (!resetting) { daily.touch(g, Date.now()); saveGame(); }
}
function comeBack() {
  if (mobile) {
    // what the assistant earned while away is offered after "Tiếp tục" (or after Start on the title)
    pendingOffline = daily.offlineEarnings(g, Date.now()) || pendingOffline;
    daily.touch(g, Date.now());
    last = performance.now(); fitMobile(true); if (onTitle) music.resume();
    return; // stays paused until "Tiếp tục"
  }
  if (!hiddenAt) return;
  let away = Math.min(TUNING.awayCap, Math.max(0, (Date.now() - hiddenAt) / 1000));
  hiddenAt = 0;
  if (!pipWin) while (away > 0 && !paused) { const d = Math.min(0.25, away); simUpdate(g, d, onEvent); away -= d; }
  last = performance.now();
  if (mobile) fitMobile(true);
}
document.addEventListener('visibilitychange', () => (document.hidden ? goAway() : comeBack()));
addEventListener('pagehide', () => { if (!resetting) saveGame(); });
setInterval(() => { if (resetting) return; if (!document.hidden) daily.touch(g, Date.now()); saveGame(); }, 5000);

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
  if (userPaused || onTitle) return false;
  if (document.querySelector('.fake-ad')) return true; // finish or close the ad first
  if (rewardOpen) { collectProject(1); return true; } // Back = take the normal reward
  if (dailyOpen) { finishDaily(1); return true; }
  if (miniOpen) { mini.closeMini(); miniOpen = false; last = performance.now(); return true; }
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
initAds(); // AdMob (phone app only): consent form where required, then preload a rewarded ad

setMode(g.mode);
schedule();
if (onTitle) {
  music.play('title');
  showTitle({
    g, fmt,
    onTap: () => audio.unlock(),
    onToggleSound: () => { act.mute(); saveGame(); },
    onToggleMusic: () => act.music(),
    onLang: (code) => act.setLang(code),
    onStart: () => {
      audio.unlock();
      audio.whip(g.whipLevel, 0.13, (cos.skinOf(g) || {}).sound || '');
      haptic('hit');
      onTitle = false;
      last = performance.now();
      music.play('office');
      showProjectReward(); // a reward left uncollected last time
      startDay();
    },
  });
} else { music.play('office'); showProjectReward(); if (mobile) startDay(); else runDailyFlow(); }
window.__game = { g, view, whip, act, ui, projects }; // debugging + automated play tests (console only)
