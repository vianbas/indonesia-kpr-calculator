// KPR Calculator service worker (hand-rolled, no build dependency).
// Strategy: network-first for navigations/HTML so content stays fresh, with an
// offline fallback to the cached app shell; cache-first for hashed static assets
// (they are immutable). Cross-origin requests (fonts CDN, share API) are ignored.
const CACHE = 'kpr-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function putInCache(request, response) {
  caches.open(CACHE).then((cache) => cache.put(request, response)).catch(() => {});
}

const CACHEABLE = /^\/(assets\/|.*\.(png|svg|webmanifest|ico)$)/;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // skip fonts CDN, share API, etc.

  // Navigations / HTML → network-first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          putInCache(request, res.clone());
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html'))),
    );
    return;
  }

  // Hashed assets / icons → cache-first, populate on miss.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && CACHEABLE.test(url.pathname)) putInCache(request, res.clone());
          return res;
        }),
    ),
  );
});
