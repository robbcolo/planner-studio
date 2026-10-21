// Planner Studio Dentistico — offline cache
const VERSION = 'planner-studio-v1';
const SHELL = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const T = 'https://cdn.jsdelivr.net/npm/three@0.169.0/';
const CDN = [
  T + 'build/three.module.js', T + 'examples/jsm/controls/OrbitControls.js', T + 'examples/jsm/environments/RoomEnvironment.js',
  T + 'examples/jsm/geometries/RoundedBoxGeometry.js', T + 'examples/jsm/exporters/USDZExporter.js', T + 'examples/jsm/libs/fflate.module.js',
  T + 'examples/jsm/utils/TextureUtils.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    await Promise.all(CDN.map((u) => fetch(u, { mode: 'cors' }).then((r) => r.ok && c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k); await self.clients.claim(); })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/firestore\.googleapis\.com|googleapis\.com\/google\.firestore/.test(url.href)) return; // live sync traffic
  if (url.origin === location.origin) { // app files: network first so updates arrive, cache when offline
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); return r; }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
    return;
  }
  if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com|www\.gstatic\.com\/firebasejs/.test(url.href)) { // libraries and fonts: cache first
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); return r; })));
  }
});
