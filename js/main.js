// Boot, game loop and glue between simulation, view, whip and UI.
import { WHIPS, COFFEE, ASSISTANT, OFFICE_LEVELS, DECOR_ITEMS, CV_BATCH, MAX_STAFF, ROOMS, ROOM_W, capacityOf, floorOf, nextRoom } from './config.js';
import { load, save, wipe, makeEmployee, cvToStaff, freshDay } from './state.js';
import {
  update as simUpdate, whipEmployee, useCoffee, toolStats, toolLevel, TOOL_TRACKS, runPayroll, dateOf, fmtDate,
} from './sim.js';
import { makeCVs } from './cv.js';
import { createView, deskPos, coffeePos, slotsFor } from './view.js';
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
      cost = OFFICE_LEVELS[g.officeLevel + 1].cost;
      ok = pay(cost) && (g.officeLevel++, true);
    }
    if (kind === 'room' && nextRoom(g)) {
      cost = nextRoom(g).cost;
      ok = pay(cost) && (g.rooms = (g.rooms || 1) + 1, true);
      if (ok) {
        view.focusRoom(g.rooms - 1);
        const r = stage.getBoundingClientRect();
        ui.popup(r.left + r.width / 2, r.top + 120, `MỞ ${nextRoomName(g.rooms - 1).toUpperCase()}!`, 'money big');
      }
    }
    if ((kind === 'baton' || kind === 'taser') && TOOL_TRACKS[kind][toolLevel(g, kind) + 1]) {
      cost = TOOL_TRACKS[kind][toolLevel(g, kind) + 1].cost;
      ok = pay(cost) && (g[kind + 'Level']++, g.tool = kind, true); // a new tool goes straight into your hand
    }
    ok ? audio.buy() : audio.deny();
    save(g);
  },
  focusRoom(k) {
    const n = g.rooms || 1;
    view.focusRoom(Math.max(0, Math.min(n - 1 + (nextRoom(g) ? 1 : 0), Number(k))));
  },
  tool(kind) {
    if (toolLevel(g, kind) < 0) { audio.deny(); return; }
    g.tool = kind;
    whip.visible = false;
  },
  purchaseDecor(id) {
    const def = DECOR_ITEMS.find((x) => x.id === id);
    if (!def || g.officeLevel < def.level) return false;
    if (!def.multi && g.decor.some((d) => d.kind === id)) return false;
    if (!pay(def.cost)) { audio.deny(); return false; }
    // Several plants: drop each new one a little further along so they don't stack.
    const same = g.decor.filter((d) => d.kind === id).length;
    const gx = def.mount === 'wall' ? 0 : clamp(def.pos[0] - same * 0.9, 0.3, 11.7);
    g.decor.push({ uid: g.decorUid++, kind: id, gx, gy: def.pos[1] });
    audio.buy();
    save(g);
    return true;
  },
  /** Post a job ad: the next batch of CVs follows the request (empty fields = any). */
  postJob(req) {
    g.jobReq = { name: String(req.name || '').slice(0, 24), role: req.role || '', grade: req.grade || '' };
    g.cvs = makeCVs(g.jobReq, CV_BATCH, g.cvUid);
    g.cvUid += CV_BATCH;
    save(g);
  },
  acceptCV(uid) {
    const cv = g.cvs.find((c) => c.uid === Number(uid));
    if (!cv) return { ok: false, message: 'Hồ sơ không còn.' };
    const cap = capacityOf(g);
    if (g.staff.length >= cap) {
      return { ok: false, message: g.staff.length >= MAX_STAFF ? 'Công ty đã kín chỗ.' : 'Hết bàn trống — hãy mở rộng văn phòng hoặc mở phòng mới.' };
    }
    if (!pay(cv.fee)) { audio.deny(); return { ok: false, message: 'Quỹ chưa đủ phí tuyển dụng.' }; }
    const e = makeEmployee(g.nextId++, cvToStaff(cv), g.day);
    const spot = freeDeskSpot();
    g.layout.desks[e.id] = { gx: spot[0], gy: spot[1] };
    g.staff.push(e);
    g.cvs = g.cvs.filter((c) => c !== cv);
    layout();
    audio.buy();
    save(g);
    return { ok: true, employee: e };
  },
  rejectCV(uid) {
    g.cvs = g.cvs.filter((c) => c.uid !== Number(uid));
    save(g);
  },
  fire(id) {
    const e = g.staff.find((x) => x.id === Number(id));
    if (!e || g.staff.length <= 1) return false;
    if (!confirm(`Sa thải ${e.nickname || e.name}? Lương các ngày đã làm sẽ được trả ngay.`)) return false;
    // Pin everyone's desk where it is, so removing one doesn't shuffle the rest.
    g.staff.forEach((x, i) => { const [gx, gy] = deskPos(g, x, i); g.layout.desks[x.id] = { gx, gy }; });
    const days = Math.max(0, g.day - Math.max(e.joinDay, g.lastPayDay));
    g.money -= Math.round(e.salary * Math.min(1, days / 30));
    g.staff = g.staff.filter((x) => x !== e);
    delete g.layout.desks[e.id];
    layout();
    save(g);
    return true;
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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nextRoomName = (k) => ROOMS[k]?.name || 'Phòng mới';

/** First default desk slot that's inside the current office and not taken by a desk. */
function freeDeskSpot() {
  const [lo, hi] = floorOf(g);
  const taken = g.staff.map((e, i) => deskPos(g, e, i));
  const free = (p) => taken.every((q) => Math.abs(q[0] - p[0]) > 1.7 || Math.abs(q[1] - p[1]) > 1.4);
  const inside = (p) => p[0] >= lo + 0.9 && p[0] <= hi - 0.9;
  const slots = slotsFor(g.rooms || 1);
  for (const sl of slots) if (inside(sl) && free(sl)) return sl;
  for (let gy = 1; gy <= 7.5; gy += 0.5) for (let gx = lo + 1; gx <= hi - 1; gx += 0.5) if (free([gx, gy])) return [gx, gy];
  return slots[g.staff.length % slots.length];
}

const ui = createUI(root, g, act);
act.currentRoom = () => view.roomInView((g.rooms || 1) + (nextRoom(g) ? 1 : 0));
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
    view.resize(Math.max(400, screen.availWidth - 480), 92);
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
  if (moving) return;
  const p = view.toLocal(ev.clientX, ev.clientY);
  if (ev.pointerType === 'mouse') { whip.place(p.x, p.y, !whip.visible); whip.visible = true; }
  const h = view.pick(p.x, p.y);
  view.hover = h ? h.e : null;
  if (h && ev.pointerType === 'mouse') ui.tag(ev.clientX, ev.clientY, h.e); else ui.tag(0, 0, null);
});
canvas.addEventListener('pointerleave', () => { whip.visible = false; view.hover = null; ui.tag(0, 0, null); });

canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  audio.unlock();
  if (ev.button === 2) return startMove(ev);
  if (ev.button !== 0 || moving || panning || paused || whip.busy) return;
  const p = view.toLocal(ev.clientX, ev.clientY);
  whip.place(p.x, p.y, !whip.visible);
  whip.visible = true;
  if (ev.pointerType !== 'mouse') touchHide = 1.2;
  const S = toolStats(g);
  const hit = view.pick(p.x, p.y, S.radius);
  if (!hit && g.mode === 'office' && offerRoomAt(p)) return;
  // Aim at the head of whoever is in reach, or at the empty spot clicked.
  const target = hit ? { x: hit.head.x, y: hit.head.y + 4 } : p;
  // A taser arc jumps on to the nearest other slackers.
  const dist = (h) => Math.hypot(h.head.x - hit.head.x, h.head.y - hit.head.y);
  const chain = S.tool === 'taser' && hit && hit.e.state === 'slack'
    ? view.hits.filter((h) => h !== hit && h.e.state === 'slack' && dist(h) < 110).sort((a, b) => dist(a) - dist(b)).slice(0, S.chain)
    : [];
  if (S.tool === 'baton') audio.bonk(S.level);
  else if (S.tool === 'taser') audio.zap(S.level);
  else audio.whip(S.level);
  whip.use(S.tool, [target, ...chain.map((h) => ({ x: h.head.x, y: h.head.y + 4 }))], S.level, () => {
    resolveHit(hit, S.tool);
    chain.forEach((h) => resolveHit(h, S.tool, true));
  });
});

const SHOUT = { whip: 'BACK TO WORK!', baton: 'BỐP! LÀM VIỆC!', taser: 'BZZZT! TỈNH CHƯA?' };

function resolveHit(hit, tool = 'whip', chained = false) {
  if (!hit) return;
  const e = hit.e;
  const res = whipEmployee(g, e, { chained });
  const at = view.toClient(hit.head.x, hit.head.y - 6);
  if (res.kind === 'catch' && chained) {
    audio.ouch(1.2);
    ui.popup(at.x, at.y - 10, 'BZZT!', 'assist');
    ui.popup(at.x, at.y + 18, `+${fmt(res.reward)} đ`, 'money');
  } else if (res.kind === 'catch') {
    audio.ouch(1 + (e.id % 3) * 0.12);
    audio.coin(g.combo);
    ui.flash('hit');
    ui.popup(at.x, at.y - 10, SHOUT[tool], tool === 'whip' ? 'btw' : 'btw vn');
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
      ui.popup(at.x, at.y - 20, `${e.nickname || e.short} ĐÌNH CÔNG!`, 'wrong');
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
    payday();
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

/** Clicking the dimmed room for sale asks to buy it. */
function offerRoomAt(p) {
  const room = nextRoom(g);
  if (!room) return false;
  const { gx, gy } = view.toGrid(p.x, p.y);
  const g0 = ROOM_W * (g.rooms || 1);
  if (gx < g0 || gx > g0 + ROOM_W || gy < 0 || gy > 9) return false;
  if (g.money < room.cost) {
    audio.deny();
    ui.popup(view.toClient(p.x, p.y).x, view.toClient(p.x, p.y).y, `${room.name}: cần ${fmt(room.cost)} đ`, 'say');
  } else if (confirm(`Mở ${room.name} (+8 bàn) với giá ${fmt(room.cost)} đ?`)) {
    act.buy('room');
  }
  return true;
}

/** Pay salaries if today is the 15th, and tell the player. */
function payday() {
  const pr = runPayroll(g);
  if (!pr) return;
  const r = stage.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + Math.min(160, r.height * 0.35);
  ui.popup(x, y, `TRẢ LƯƠNG ${fmtDate(dateOf(g))}: −${fmt(pr.total)} đ`, pr.short ? 'wrong' : 'loss big');
  if (pr.short) {
    audio.deny();
    setTimeout(() => ui.popup(x, y + 40, 'NỢ LƯƠNG! Cả văn phòng bức xúc', 'wrong'), 700);
  } else {
    audio.coin(1);
  }
  save(g);
}

// --- Right-drag: move furniture, desks and the coffee machine ---------------------------
let moving = null;

function startMove(ev) {
  if (g.mode !== 'office' || paused) return;
  const p = view.toLocal(ev.clientX, ev.clientY);
  const m = view.pickMovable(p.x, p.y);
  if (!m) return;
  const pos = refPos(m.ref);
  const gp = view.toGrid(p.x, p.y);
  moving = { ref: m.ref, start: { ...pos }, dx: pos.gx - gp.gx, dy: pos.gy - gp.gy, ok: true };
  view.moving = moving;
  whip.visible = false;
  ui.tag(0, 0, null);
  canvas.setPointerCapture(ev.pointerId);
}

function refPos(ref) {
  if (ref.type === 'decor') return { gx: ref.item.gx, gy: ref.item.gy };
  if (ref.type === 'coffee') return { ...coffeePos(g) };
  const [gx, gy] = deskPos(g, ref.e, g.staff.indexOf(ref.e));
  return { gx, gy };
}

function setRefPos(ref, gx, gy) {
  if (ref.type === 'decor') { ref.item.gx = gx; ref.item.gy = gy; }
  else if (ref.type === 'coffee') g.layout.coffee = { gx, gy };
  else g.layout.desks[ref.e.id] = { gx, gy };
}

/** Clamp a dragged object to where it may stand; returns [gx, gy, ok]. */
function placeRule(ref, gx, gy) {
  const snap = (v) => Math.round(v * 4) / 4;
  gx = snap(gx); gy = snap(gy);
  if (ref.type === 'decor') {
    const def = DECOR_ITEMS.find((d) => d.id === ref.item.kind);
    if (def?.mount === 'wall') return [0, clamp(gy, 0.6, 8.6), true];
    return [clamp(gx, 0.3, ROOM_W * (g.rooms || 1) - 0.3), clamp(gy, 0.3, 8.7), true];
  }
  if (ref.type === 'coffee') return [clamp(gx, 0, ROOM_W * (g.rooms || 1) - 1), clamp(gy, 0, 7.4), true];
  // Desks stay inside the bought floor area and keep a gap from other desks.
  const [lo, hi] = floorOf(g);
  gx = clamp(gx, lo + 0.9, hi - 0.9); gy = clamp(gy, 0.7, 7.9);
  const ok = g.staff.every((e, i) => {
    if (e === ref.e) return true;
    const [x, y] = deskPos(g, e, i);
    return Math.abs(x - gx) > 1.7 || Math.abs(y - gy) > 1.4;
  });
  return [gx, gy, ok];
}

canvas.addEventListener('pointermove', (ev) => {
  if (!moving) return;
  const p = view.toLocal(ev.clientX, ev.clientY);
  const gp = view.toGrid(p.x, p.y);
  const [gx, gy, ok] = placeRule(moving.ref, gp.gx + moving.dx, gp.gy + moving.dy);
  setRefPos(moving.ref, gx, gy);
  moving.ok = ok;
});

function endMove() {
  if (!moving) return;
  if (!moving.ok) {
    setRefPos(moving.ref, moving.start.gx, moving.start.gy);
    const r = stage.getBoundingClientRect();
    ui.popup(r.left + r.width / 2, r.top + 80, 'Chỗ này chật quá, không đặt được', 'say');
  }
  moving = null;
  view.moving = null;
  save(g);
}
canvas.addEventListener('pointerup', (ev) => { if (moving && ev.button === 2) endMove(); });
canvas.addEventListener('lostpointercapture', endMove);

// Number keys switch tools; ←/→ or A/D jump between rooms.
addEventListener('keydown', (ev) => {
  if (ev.target.closest && ev.target.closest('input, textarea, select')) return;
  const kind = { 1: 'whip', 2: 'baton', 3: 'taser' }[ev.key];
  if (kind) act.tool(kind);
  if (g.mode !== 'office') return;
  const step = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 }[ev.key];
  if (step) { ev.preventDefault(); act.focusRoom(view.roomInView(g.rooms || 1) + step); }
});

// Mouse wheel scrolls the office sideways (along the row of rooms); middle-drag pans freely.
canvas.addEventListener('wheel', (ev) => {
  if (g.mode !== 'office') return;
  ev.preventDefault();
  const d = (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY) / view.scale;
  view.pan(d, d / 2);
}, { passive: false });
let panning = null;
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 1 || g.mode !== 'office') return;
  ev.preventDefault();
  panning = { x: ev.clientX, y: ev.clientY };
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener('pointermove', (ev) => {
  if (!panning) return;
  view.pan(-(ev.clientX - panning.x) / view.scale, -(ev.clientY - panning.y) / view.scale);
  panning = { x: ev.clientX, y: ev.clientY };
});
canvas.addEventListener('pointerup', (ev) => { if (ev.button === 1) panning = null; });

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
  view.updateCam(dt);
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
view.focusRoom(0, true);
payday(); // a save made the evening of the 14th resumes on payday
schedule();
window.__game = { g, view, whip }; // handy for debugging in the console
