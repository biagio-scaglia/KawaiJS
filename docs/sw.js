/* Kawaijs PWA service worker */
const CACHE = 'kawa-0.1.11';
const PRECACHE = ["./","./index.html","./style.css","./manifest.webmanifest","./icon.svg","./favicon.svg"];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isAsset =
    url.pathname.includes('/assets/') ||
    /\.(png|jpe?g|webp|gif|svg|ico|mp3|ogg|wav|m4a|css|js|woff2?)$/i.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then(async (res) => {
        const cache = await caches.open(CACHE);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
