// Boot, game loop and glue between simulation, view, whip and UI.
import { WHIPS, COFFEE, ASSISTANT, STAFF_POOL, OFFICE_LEVELS, DECOR_ITEMS, hireCost, TUNING } from './config.js';
import { load, save, wipe, makeEmployee, freshDay } from './state.js';
import { update as simUpdate, whipEmployee, useCoffee } from './sim.js';
import { createView } from './view.js';
import { createWhip } from './whip.js';
import { createUI, fmt } from './ui.js';
import { pipSupported, openPip } from './pip.js';
import * as audio from './audio.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage'), canvas = $('game');
const root = { stage, hud: $('hud'), fx: $('fx'), panel: $('panel'), modal: $('modal') };

const g = load();
const params = new URLSearchParams(location.search);
if (params.get('mode') === 'mini') g.mode = 'mini';
audio.setMuted(g.muted);

// Running inside the Electron taskbar shell (desktop/preload.cjs)?
const shell = window.taskbarShell || null;
if (shell) document.body.classList.add('shell');

const view = createView(canvas);
view.transparentMini = !!shell;
const whip = createWhip();
let pipWin = null;
let paused = false;
let resetting = false;

// --- Actions (buttons) -----------------------------------------------------------
const act = {
  mode() { setMode(g.mode === 'office' ? 'mini' : 'office'); },
  mute() { g.muted = !g.muted; audio.setMuted(g.muted); },
  coffee() {
    if (useCoffee(g)) { audio.coffee(); ui.popup(innerWidth / 2, innerHeight * 0.3, 'CÀ PHÊ SỐC!', 'coffee'); }
  },
  pip: () => togglePip(),
  quit() { save(g); shell && shell.quit(); },
  buy(kind) {
    let cost = 0, ok = false;
    if (kind === 'whip' && WHIPS[g.whipLevel + 1]) { cost = WHIPS[g.whipLevel + 1].cost; ok = pay(cost) && (g.whipLevel++, true); }
    if (kind === 'coffee' && COFFEE[g.coffeeLevel + 1]) { cost = COFFEE[g.coffeeLevel + 1].cost; ok = pay(cost) && (g.coffeeLevel++, g.coffeeCd = 0, true); }
    if (kind === 'assistant' && ASSISTANT[g.assistantLevel + 1]) {
      cost = ASSISTANT[g.assistantLevel + 1].cost;
      ok = pay(cost) && (g.assistantLevel++, g.assistantCd = ASSISTANT[g.assistantLevel].interval, true);
    }
    if (kind === 'office' && OFFICE_LEVELS[g.officeLevel + 1]) {
      const next = OFFICE_LEVELS[g.officeLevel + 1];
      if ((g.lifetimeEarnings || 0) >= next.unlockRevenue) {
        cost = next.cost;
        ok = pay(cost) && (g.officeLevel++, true);
      }
    }
    ok ? audio.buy() : audio.deny();
    save(g);
  },
  purchaseDecor(id) {
    const item = DECOR_ITEMS.find((x) => x.id === id);
    if (!item || g.decor.includes(id) || g.officeLevel < item.level) return false;
    if (!pay(item.cost)) { audio.deny(); return false; }
    g.decor.push(id);
    audio.buy();
    save(g);
    return true;
  },
  acceptHire(profile) {
    const index = g.staff.length;
    if (!STAFF_POOL[index]) return { ok: false, message: 'Văn phòng đã kín chỗ.' };
    if (index >= OFFICE_LEVELS[g.officeLevel].capacity) {
      return { ok: false, message: 'Hãy mở rộng văn phòng để có thêm bàn làm việc.' };
    }
    const required = ['nickname', 'age', 'experience', 'motivation'];
    if (required.some((key) => !String(profile[key] || '').trim())) {
      return { ok: false, message: 'Hãy hoàn tất đầy đủ thông tin phỏng vấn.' };
    }
    const cost = hireCost(index);
    if (!pay(cost)) return { ok: false, message: 'Quỹ công ty chưa đủ để tuyển ứng viên này.' };
    g.staff.push(makeEmployee(index, { ...profile, interviewedAt: Date.now() }));
    layout();
    audio.buy();
    save(g);
    return { ok: true };
  },
  setNickname(id, nickname) {
    const employee = g.staff.find((e) => e.id === Number(id));
    const value = String(nickname || '').trim().slice(0, 20);
    if (!employee || !value) return false;
    employee.nickname = value;
    save(g);
    return true;
  },
  reset() {
    if (!confirm('Xoá toàn bộ tiến trình và chơi lại từ đầu?')) return;
    // pagehide normally persists the current game. Mark this navigation as a reset
    // first, otherwise pagehide immediately writes the old save back after wipe().
    resetting = true;
    wipe();
    location.reload();
  },
};
const pay = (cost) => { if (g.money < cost) return false; g.money -= cost; return true; };

const ui = createUI(root, g, act);
const canPip = () => !shell && pipSupported();
ui.setPipAvailable(canPip() && g.mode === 'mini');
$('btn-pip').hidden = !canPip();
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
  if (g.mode === 'office') {
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
  const hit = view.pick(p.x, p.y, W.radius);
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
  if (res.kind === 'catch') {
    audio.ouch(1 + (e.id % 3) * 0.12);
    audio.coin(g.combo);
    ui.flash('hit');
    ui.popup(at.x, at.y - 10, 'BACK TO WORK!', 'btw');
    ui.popup(at.x, at.y + 22, `+${fmt(res.reward)} đ`, 'money');
    if (g.combo > 1) ui.popup(at.x, at.y - 40, `COMBO x${g.combo}`, 'combo');
    if (Math.random() < 0.5) ui.popup(at.x, at.y + 44, `"${res.excuse}"`, 'say');
  } else if (res.kind === 'wrong') {
    audio.ouch(0.8);
    audio.grumble();
    ui.flash('wrong');
    ui.popup(at.x, at.y - 10, 'OAN QUÁ SẾP ƠI!', 'wrong');
    if (res.reward) ui.popup(at.x, at.y + 22, `${fmt(res.reward)} đ`, 'loss');
  } else if (res.kind === 'strike') {
    ui.popup(at.x, at.y - 10, 'Đang đình công!', 'wrong');
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
      ui.popup(at.x, at.y - 20, `${e.name} ĐÌNH CÔNG!`, 'wrong');
      break;
    case 'strikeEnd':
      ui.popup(at.x, at.y - 20, 'Quay lại làm...', 'say');
      break;
    case 'assistant': {
      if (!hit) break;
      const from = g.mode === 'office' && view.assistantHand ? view.assistantHand : { x: view.W - 4, y: 4 };
      whip.autoLash(from.x, from.y, hit.head.x, hit.head.y + 4, g.whipLevel);
      audio.whip(Math.min(g.whipLevel, 1), 0.02);
      const res = whipEmployee(g, e, { auto: true });
      audio.ouch(1.1);
      ui.popup(at.x, at.y - 10, 'TRỢ LÝ: LÀM ĐI!', 'assist');
      ui.popup(at.x, at.y + 18, `+${fmt(res.reward)} đ`, 'money');
      break;
    }
    case 'dayEnd':
      endDay();
      break;
  }
}

function endDay() {
  if (paused) return;
  paused = true;
  audio.bell();
  const t = g.today;
  const kpi = Math.round((t.kpiN ? t.kpiSum / t.kpiN : g.kpi) * 100);
  g.records.bestDays = [...g.records.bestDays, { day: g.day, revenue: Math.floor(t.revenue), kpi }]
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  save(g);
  const next = () => {
    g.day++;
    g.dayTime = 0;
    g.today = freshDay();
    for (const e of g.staff) { e.energy = 100; e.stress = Math.max(0, e.stress - 50); e.state = 'work'; e.slack = null; e.t = 0; }
    paused = false;
    save(g);
  };
  // In the taskbar bar there is no room for a report card: roll straight into the next day.
  if (g.mode === 'mini') {
    const r = stage.getBoundingClientRect();
    ui.popup(r.left + r.width / 2, r.top + 20, `Tan ca! +${fmt(t.revenue)} đ · KPI ${kpi}%`, 'money');
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
  if (!paused) simUpdate(g, dt, onEvent);
  whip.update(dt);
  if (touchHide > 0) { touchHide -= dt; if (touchHide <= 0) whip.visible = false; }
  view.render(g, whip, t);
  uiAcc += dt;
  if (uiAcc > 0.1) { uiAcc = 0; ui.update(); fitShell(); }
}

function schedule() {
  const token = ++loopToken;
  const win = pipWin || window;
  win.requestAnimationFrame((now) => { if (token === loopToken) frame(now); });
}

// Catch up on time spent in a hidden tab (rAF pauses there). Capped at 5 minutes.
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = performance.now(); save(g); return; }
  if (!hiddenAt || pipWin) return;
  let away = Math.min(300, (performance.now() - hiddenAt) / 1000);
  hiddenAt = 0;
  while (away > 0 && !paused) { const d = Math.min(0.25, away); simUpdate(g, d, onEvent); away -= d; }
  last = performance.now();
});
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
setMode(g.mode);
schedule();
window.__game = { g, view, whip }; // handy for debugging in the console
