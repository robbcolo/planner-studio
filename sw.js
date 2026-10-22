// Planner Studio Dentistico — offline cache
const VERSION = 'planner-studio-v7';
const SHELL = [
  './', './index.html', './style.css', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './vendor/three.module.min.js', './vendor/OrbitControls.js', './vendor/RoomEnvironment.js', './vendor/RoundedBoxGeometry.js',
  './vendor/USDZExporter.js', './vendor/TextureUtils.js', './vendor/fflate.module.js',
  './vendor/jspdf.umd.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js',
  './config.js', './vendor/firebase-app-compat.js', './vendor/firebase-auth-compat.js', './vendor/firebase-firestore-compat.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k); await self.clients.claim(); })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) { // app files: network first so updates arrive, cache when offline
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com|www\.gstatic\.com\/firebasejs/.test(url.href)) { // fonts and Firebase SDK: cache first
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return r; })));
  }
});
