const CACHE = 'traducteur-v1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('traducteur-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fichiers de l'application : cache d'abord, mise à jour en arrière-plan
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req, {ignoreSearch: true}).then(hit => {
        const net = fetch(req).then(r => {
          if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Bibliothèque de traduction hors ligne (jsDelivr) : mise en cache pour un usage sans internet
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.open(CACHE + '-lib').then(c =>
        c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))
      )
    );
  }
  // Tout le reste (API de traduction, dictionnaire, modèles) : réseau direct.
  // Les modèles sont mis en cache par Transformers.js lui-même.
});
