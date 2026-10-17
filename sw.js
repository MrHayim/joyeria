// Guarda la app en el dispositivo para que abra aunque no haya señal.
// Al publicar cambios, sube este número para que todos reciban la versión nueva.
const VERSION = 'joyeria-v1';
const BASE = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Los datos siempre van directo a Google
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;

  // La app y config.js: primero internet (para tener lo más nuevo); si no hay, lo guardado
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Librerías y tipografías externas: lo guardado primero, y se actualiza en segundo plano
  e.respondWith(
    caches.match(req).then(guardado => {
      const red = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
        return r;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
