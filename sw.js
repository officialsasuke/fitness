// Service Worker: App offline verfügbar machen.
// Bei Änderungen an den Dateien die Versionsnummer erhöhen.
const VERSION = 'fp-v5';
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/main.js', 'js/core.js', 'js/training.js', 'js/food.js', 'js/bg.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== VERSION + '-ext').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Eigene Dateien: erst Netz (für Updates), sonst Cache
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // Schriften, Scanner-Bibliothek und Produktbilder: Cache zuerst
  if (/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|images\.openfoodfacts\.org/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION + '-ext').then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // Open-Food-Facts-Abfragen gehen immer direkt ans Netz.
});
