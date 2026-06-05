const CACHE = 'usms-aurora-pro-v4';
const CORE = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.webmanifest', '/assets/icons/icon-192.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/config' || url.pathname === '/health' || event.request.headers.get('upgrade') === 'websocket') return;
  event.respondWith(fetch(event.request).then((res) => {
    const copy = res.clone();
    if (event.request.method === 'GET' && res.ok) caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return res;
  }).catch(() => caches.match(event.request).then((res) => res || caches.match('/'))));
});
