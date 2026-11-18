// Service worker mínimo: limpa caches antigas e não guarda nada novo,
// para o site mostrar sempre a versão mais recente.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function () { /* sem cache: pede sempre à rede */ });
