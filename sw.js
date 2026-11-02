// Service worker for the browser / "Add to Home Screen" (PWA) version only.
// Network-first: online players always get the newest files; offline falls back to the cache.
// The native apps (Capacitor) and Electron never register it (see js/platform.js).
// Bump VERSION when the file list changes so old caches get dropped.
const VERSION = 'sep-roi-v1';
const PRECACHE = [
  './', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'css/style.css', 'css/fonts.css',
  'js/main.js', 'js/platform.js', 'js/config.js', 'js/state.js', 'js/sim.js', 'js/view.js', 'js/whip.js',
  'js/ui.js', 'js/pip.js', 'js/audio.js', 'js/sprites.js', 'js/pixel.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION)
    .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
