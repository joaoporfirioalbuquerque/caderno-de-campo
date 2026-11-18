// Service worker: a app abre e funciona sem rede (no campo).
const V = 'caderno-202611181602';
const SHELL = ['./', 'index.html', 'css/style.css?v=202611181602', 'js/boot.js?v=202611181602', 'vendor/lame.min.js', 'vendor/supabase.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'tiles' && k !== 'birdnet' && k !== 'guia').map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Áudio/vídeo (pedidos parciais) e outros sites: o browser trata diretamente
  if (e.request.headers.has('range') || e.request.destination === 'audio' || e.request.destination === 'video') return;
  // Fotos do guia de campo (iNaturalist): usa a cópia guardada; as que vês ficam guardadas para usar sem rede
  if (/inaturalist|upload\.wikimedia\.org/.test(u.host) && /\.(jpe?g|png)$/i.test(u.pathname)) { e.respondWith(caches.open('guia').then(c => c.match(e.request.url).then(r => r || fetch(e.request).then(n => { try { c.put(e.request.url, n.clone()); } catch (x) {} return n; })))); return; }
  if (u.origin !== location.origin && !/tile\.openstreetmap\.org|arcgisonline\.com|opentopomap\.org|discomap\.eea\.europa\.eu|fonts\.(googleapis|gstatic)\.com/.test(u.host)) return;
  // Supabase, meteorologia e geocodificação: sempre pela rede
  if (/supabase\.co|open-meteo\.com|nominatim/.test(u.host)) return;
  // Modelo BirdNET e TensorFlow: guardados de vez (grandes, mudam raramente)
  if (u.origin === location.origin && (/\/models\//.test(u.pathname) || /tf\.min\.js$/.test(u.pathname) || /birdnet-worker\.js$/.test(u.pathname))) {
    e.respondWith(caches.open('birdnet').then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { if (n.ok) c.put(e.request, n.clone()); return n; }))));
    return;
  }
  // Mosaicos do mapa: guarda os que já viste (útil sem rede)
  if (/tile\.openstreetmap\.org|arcgisonline\.com|opentopomap\.org|discomap\.eea\.europa\.eu/.test(u.host)) {
    e.respondWith(caches.open('tiles').then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { c.put(e.request, n.clone()); return n; }))));
    return;
  }
  // Ficheiros da app e fontes: rede primeiro, cache se não houver rede
  e.respondWith(fetch(e.request, u.origin === location.origin ? {cache: 'no-store'} : {}).then(n => { if (n.ok && (u.origin === location.origin || /fonts\.(googleapis|gstatic)/.test(u.host))) { const c = n.clone(); caches.open(V).then(x => x.put(e.request, c)); } return n; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});

// Toque numa notificação de novidades: abre (ou traz para a frente) a app no ecrã das novidades
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({go: 'alertas'}); return c.focus(); }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
