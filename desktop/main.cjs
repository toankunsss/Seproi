// Electron shell: turns the web game into a Taskbar-Hero-style desktop overlay.
//  - mini mode: frameless, transparent, always-on-top strip docked on the Windows taskbar,
//    click-through everywhere except the game itself
//  - office mode: a normal-sized window with the full isometric office
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, protocol } = require('electron');
const fs = require('fs');
const path = require('path');

// Dev: the web game lives one folder up. Packaged: electron-builder copies it to resources/game.
const GAME_ROOT = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..');
const SHOT = process.argv.includes('--shot');
const MINI_H = 150;
const OFFICE = { w: 1180, h: 800 };

// Test runs get their own profile so they never collide with a copy the player has open.
if (SHOT) app.setPath('userData', path.join(app.getPath('temp'), 'sep-roi-shot'));
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

// --- Settings (dock position) -------------------------------------------------------
const settingsFile = () => path.join(app.getPath('userData'), 'shell.json');
let settings = { dock: 'above', x: null, y: null };
function loadSettings() { try { settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch {} }
function saveSettings() { try { fs.writeFileSync(settingsFile(), JSON.stringify(settings)); } catch {} }

// --- app:// protocol -------------------------------------------------------------------
// ES modules don't load from file://, and a random-port localhost server would give the page a
// new origin (and lose its localStorage save) on every launch. A fixed privileged scheme fixes both.
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

function serveGame() {
  protocol.handle('app', async (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(GAME_ROOT, p));
    if (!file.startsWith(GAME_ROOT)) return new Response('Forbidden', { status: 403 });
    try {
      const data = await fs.promises.readFile(file);
      return new Response(data, { headers: { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

// --- Window placement ------------------------------------------------------------------
let win = null;
let tray = null;
let mode = 'mini';
let miniW = 900;
let topTimer = null;

function miniBounds(w = miniW) {
  const d = settings.x != null
    ? screen.getDisplayNearestPoint({ x: settings.x, y: settings.y })
    : screen.getPrimaryDisplay();
  const wa = d.workArea, b = d.bounds;
  w = Math.min(w, wa.width);
  // 'above' = sitting on top of the taskbar; 'over' = overlapping the taskbar itself.
  const bottom = settings.dock === 'over' ? b.y + b.height : wa.y + wa.height;
  let x = settings.x != null ? settings.x : wa.x + wa.width - w - 12;
  let y = settings.x != null && settings.dock === 'free' ? settings.y : bottom - MINI_H;
  x = Math.max(b.x, Math.min(x, b.x + b.width - w));
  y = Math.max(b.y, Math.min(y, b.y + b.height - MINI_H));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: MINI_H };
}

function applyMini() {
  mode = 'mini';
  win.setResizable(false);
  win.setSkipTaskbar(true);
  win.setBounds(miniBounds());
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  clearInterval(topTimer);
  // Windows raises the taskbar over topmost windows when it is clicked; keep reclaiming the top.
  topTimer = setInterval(() => { if (mode === 'mini' && win && win.isVisible()) { win.setAlwaysOnTop(true, 'screen-saver'); win.moveTop(); } }, 1500);
}

// --- Drag & drop of the taskbar strip ------------------------------------------------------
// The page tells us when a drag starts/ends; we follow the OS cursor from here, which works
// across monitors and DPI scales and doesn't fight the click-through/transparent window.
let drag = null;
const SNAP = 36; // px from the taskbar edge that counts as "docked"

function dragStart() {
  if (!win || mode !== 'mini' || drag) return;
  const c = screen.getCursorScreenPoint(), b = win.getBounds();
  drag = { dx: c.x - b.x, dy: c.y - b.y, w: b.width, h: b.height };
  drag.timer = setInterval(() => {
    const p = screen.getCursorScreenPoint();
    win.setBounds({ x: p.x - drag.dx, y: p.y - drag.dy, width: drag.w, height: drag.h });
  }, 16);
}

function dragEnd() {
  if (!drag) return;
  clearInterval(drag.timer);
  drag = null;
  const b = win.getBounds();
  const d = screen.getDisplayMatching(b), wa = d.workArea;
  const bottom = b.y + b.height;
  settings.x = b.x;
  settings.y = b.y;
  // Snap onto the taskbar when dropped close to it, otherwise float where dropped.
  if (Math.abs(bottom - (wa.y + wa.height)) < SNAP) settings.dock = 'above';
  else if (Math.abs(bottom - (d.bounds.y + d.bounds.height)) < SNAP) settings.dock = 'over';
  else settings.dock = 'free';
  saveSettings();
  win.setBounds(miniBounds());
  refreshTray();
}

function applyOffice() {
  dragEnd();
  mode = 'office';
  clearInterval(topTimer);
  win.setIgnoreMouseEvents(false);
  win.setAlwaysOnTop(false);
  win.setSkipTaskbar(false);
  win.setResizable(true);
  const wa = screen.getDisplayMatching(win.getBounds()).workArea;
  const w = Math.min(OFFICE.w, wa.width - 40), h = Math.min(OFFICE.h, wa.height - 40);
  win.setBounds({ x: Math.round(wa.x + (wa.width - w) / 2), y: Math.round(wa.y + (wa.height - h) / 2), width: w, height: h });
  win.focus();
}

function setMode(m) {
  if (!win) return;
  if (m === 'office') applyOffice(); else applyMini();
  refreshTray();
}

// --- Tray ------------------------------------------------------------------------------------
function trayIcon() {
  // 16x16 whip icon drawn into a BGRA bitmap (no image files needed).
  const S = 16, buf = Buffer.alloc(S * S * 4);
  const put = (x, y, [r, g, b]) => { const i = (y * S + x) * 4; buf[i] = b; buf[i + 1] = g; buf[i + 2] = r; buf[i + 3] = 255; };
  const fill = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(i, j, c); };
  fill(2, 11, 3, 3, [122, 74, 42]); fill(4, 10, 2, 2, [154, 96, 52]); fill(6, 8, 2, 2, [192, 122, 60]);
  fill(8, 5, 2, 3, [192, 122, 60]); fill(10, 3, 2, 2, [224, 160, 80]); fill(12, 2, 2, 2, [255, 211, 77]); put(13, 4, [255, 255, 255]);
  return nativeImage.createFromBitmap(buf, { width: S, height: S });
}

function refreshTray() {
  if (!tray) return;
  const dock = (d, label) => ({ label, type: 'radio', checked: settings.dock === d, click: () => { settings.dock = d; if (d !== 'free') settings.y = null; saveSettings(); if (mode === 'mini') applyMini(); } });
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Mở văn phòng', click: () => { win.show(); send('mode', 'office'); } },
    { label: 'Thu về taskbar', click: () => { win.show(); send('mode', 'mini'); } },
    { type: 'separator' },
    dock('above', 'Ngồi trên taskbar'),
    dock('over', 'Đè lên taskbar'),
    dock('free', 'Tự do (kéo thả)'),
    { label: 'Về góc phải', click: () => { settings.x = null; settings.y = null; saveSettings(); if (mode === 'mini') applyMini(); } },
    { type: 'separator' },
    { label: win && win.isVisible() ? 'Ẩn game' : 'Hiện game', click: () => { win.isVisible() ? win.hide() : win.show(); refreshTray(); } },
    { label: 'Thoát', click: () => app.quit() },
  ]));
}

const send = (ch, v) => win && win.webContents.send(ch, v);

// --- IPC from the page --------------------------------------------------------------------------
ipcMain.on('set-ignore', (_e, ignore) => { if (win && mode === 'mini') win.setIgnoreMouseEvents(!!ignore, { forward: true }); });
ipcMain.on('set-mode', (_e, m) => setMode(m));
ipcMain.on('drag-start', dragStart);
ipcMain.on('drag-end', dragEnd);
ipcMain.on('mini-width', (_e, w) => {
  miniW = Math.max(360, Math.round(w));
  if (mode === 'mini' && !drag) {
    win.setBounds(miniBounds(miniW));
  }
});
ipcMain.on('quit', () => app.quit());

// --- Boot ---------------------------------------------------------------------------------------
app.whenReady().then(async () => {
  loadSettings();
  serveGame();
  win = new BrowserWindow({
    ...miniBounds(),
    frame: false, transparent: true, resizable: false, hasShadow: false,
    skipTaskbar: true, alwaysOnTop: true, show: false, backgroundColor: '#00000000',
    title: 'Sếp Roi',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, backgroundThrottling: false },
  });
  win.once('ready-to-show', () => { win.showInactive(); applyMini(); });
  await win.loadURL('app://game/index.html?shell=desktop&mode=mini');

  tray = new Tray(trayIcon());
  tray.setToolTip('Sếp Roi');
  tray.on('click', () => { win.show(); send('mode', mode === 'mini' ? 'office' : 'mini'); });
  refreshTray();

  if (SHOT) {
    const out = (n) => path.join(app.isPackaged ? path.dirname(process.execPath) : __dirname, n);
    setTimeout(async () => {
      fs.writeFileSync(out('shot-mini.png'), (await win.webContents.capturePage()).toPNG());
      // drag smoke test: press on the grip, check the shell entered drag, release
      const r = await win.webContents.executeJavaScript("(() => { const b = document.querySelector('.grip').getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()");
      win.webContents.sendInputEvent({ type: 'mouseMove', x: r.x, y: r.y });
      win.webContents.sendInputEvent({ type: 'mouseDown', x: r.x, y: r.y, button: 'left', clickCount: 1 });
      await new Promise((ok) => setTimeout(ok, 300));
      const during = !!drag;
      win.webContents.sendInputEvent({ type: 'mouseUp', x: r.x, y: r.y, button: 'left', clickCount: 1 });
      await new Promise((ok) => setTimeout(ok, 300));
      const page = await win.webContents.executeJavaScript("({ origin: location.origin, saved: !!localStorage.getItem('whipboss.save.v1'), font: document.fonts.check('20px VT323'), money: window.__game.g.money })");
      fs.writeFileSync(out('shot-drag.json'), JSON.stringify({ page, grip: r, dragStarted: during, dragEnded: !drag, settings, bounds: win.getBounds() }));
      fs.writeFileSync(out('shot-bounds.json'), JSON.stringify({ mini: win.getBounds(), display: screen.getPrimaryDisplay().bounds, workArea: screen.getPrimaryDisplay().workArea }));
      // Exercise every office expansion/decor render path in the office screenshot.
      await win.webContents.executeJavaScript("Object.assign(window.__game.g, { officeLevel: 2, decor: ['rug','lamp','sofa','shelf','aquarium','trophy'] })");
      send('mode', 'office');
      setTimeout(async () => {
        fs.writeFileSync(out('shot-office.png'), (await win.webContents.capturePage()).toPNG());
        app.quit();
      }, 2500);
    }, 4000);
  }
});

app.on('second-instance', () => { if (win) { win.show(); send('mode', 'office'); } });
app.on('window-all-closed', () => app.quit());
