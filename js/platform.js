// Platform layer: the game code in js/ is shared by the mobile app (Capacitor, Android/iOS)
// and the desktop app (Electron taskbar shell). This module tells them apart.
//
//  - `native`  → running inside the Capacitor mobile app; native plugins are reachable
//  - `mobile`  → touch layout (big buttons, side HUD, no taskbar/PiP mode). True in the app,
//                and with `?shell=mobile` on the dev server (node serve.cjs) to preview it
//
// Native plugins are called through Capacitor's runtime proxy (`registerPlugin`), so no
// npm imports are needed in the game code. Every call degrades to a web fallback or a no-op.

const params = new URLSearchParams(location.search);
const cap = () => window.Capacitor;

export const native = !!(cap() && cap().isNativePlatform && cap().isNativePlatform());
export const platform = native ? cap().getPlatform() : 'web';

/** Touch layout: the mobile app, or `?shell=mobile` when previewing on the dev server. */
export const mobile = !window.taskbarShell && (native || params.get('shell') === 'mobile');

const plugins = {};
export function plugin(name) {
  if (!native) return null;
  if (name in plugins) return plugins[name];
  const C = cap();
  if (!C.registerPlugin) return null; // core not loaded yet: don't cache the miss
  plugins[name] = C.isPluginAvailable(name) ? C.registerPlugin(name) : null;
  return plugins[name];
}

// The native bridge only injects the low-level bridge; `registerPlugin` lives in @capacitor/core.
// mobile/scripts/copy-web.cjs ships its prebuilt IIFE as www/capacitor.js, loaded on demand here.
let corePromise = null;
function loadCore() {
  if (!native || cap().registerPlugin) return Promise.resolve();
  return corePromise || (corePromise = new Promise((done) => {
    const s = document.createElement('script');
    s.src = 'capacitor.js';
    s.onload = s.onerror = () => done();
    document.head.appendChild(s);
  }));
}

const safe = (p) => { if (p && p.catch) p.catch(() => {}); };

/**
 * Boot-time setup. `hooks`:
 *   onBack()   → return true if the game handled the Android back button (closed a dialog)
 *   onPause()  → app went to background
 *   onResume() → app came back
 */
export async function initPlatform(hooks = {}) {
  if (mobile) document.documentElement.classList.add('mobile');
  if (native) document.documentElement.classList.add('native', 'native-' + platform);
  await loadCore();

  const App = plugin('App');
  if (App) {
    safe(App.addListener('backButton', () => {
      if (hooks.onBack && hooks.onBack()) return;
      safe(App.minimizeApp());
    }));
    safe(App.addListener('pause', () => hooks.onPause && hooks.onPause()));
    safe(App.addListener('resume', () => hooks.onResume && hooks.onResume()));
  }
  const bar = plugin('StatusBar');
  if (bar) safe(bar.hide());
  const splash = plugin('SplashScreen');
  if (splash) safe(splash.hide({ fadeOutDuration: 250 }));
}

// --- Haptics ----------------------------------------------------------------------------
let hapticsOn = true;
export function setHaptics(on) { hapticsOn = !!on; }

/** kind: 'light' | 'hit' | 'heavy' | 'wrong' | 'success' */
export function haptic(kind = 'hit') {
  const H = hapticsOn && plugin('Haptics');
  if (!H) return;
  if (kind === 'wrong') safe(H.notification({ type: 'ERROR' }));
  else if (kind === 'success') safe(H.notification({ type: 'SUCCESS' }));
  else safe(H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'light' ? 'LIGHT' : 'MEDIUM' }));
}

// --- Save backup -------------------------------------------------------------------------
// WebView localStorage can be wiped by the OS (iOS under storage pressure, "clear cache" on
// Android). On native the save is mirrored into Capacitor Preferences and restored on boot.

export async function restoreBackup(key) {
  await loadCore();
  const P = plugin('Preferences');
  if (!P) return;
  try {
    if (localStorage.getItem(key)) return;
    const { value } = await P.get({ key });
    if (value) localStorage.setItem(key, value);
  } catch (err) {
    console.warn('[save] backup restore failed', err);
  }
}

/** Mirror (or remove, when value is null) the save. Resolves when the native write is done. */
export function backup(key, value) {
  const P = plugin('Preferences');
  if (!P) return Promise.resolve();
  return (value == null ? P.remove({ key }) : P.set({ key, value })).catch(() => {});
}
