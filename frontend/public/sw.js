// Service worker de la version web : l'app s'ouvre même sans réseau, et reçoit les rappels.
const CACHE = 'equinoxe-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
    .then(() => self.clients.claim()));
});

// Pages : réseau d'abord (toujours la dernière version), cache si hors ligne.
// Fichiers de l'app (noms avec empreinte) : cache d'abord.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      const copie = r.clone();
      caches.open(CACHE).then((c) => c.put('./', copie));
      return r;
    }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then((enCache) => enCache || fetch(req).then((r) => {
    if (r.ok) { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
    return r;
  })));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corps: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titre || 'Équinoxe', {
    body: d.corps || '',
    icon: 'icones/icone-192.png',
    badge: 'icones/icone-192.png',
    data: { route: d.route || '' },
  }));
});

// Toucher la notification ouvre l'app sur le bon écran
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const cible = new URL((e.notification.data && e.notification.data.route || '/').replace(/^\//, ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
    for (const f of fenetres) {
      if ('focus' in f) { f.navigate(cible).catch(() => {}); return f.focus(); }
    }
    return self.clients.openWindow(cible);
  }));
});
