// Bump this version with every release that changes the offline application shell.
const CACHE_PREFIX = 'marta-alek-';
const CACHE_NAME = 'marta-alek-pixel-v1';
const CORE_ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  ...['config', 'storage', 'audio', 'haptics', 'levels', 'sprites', 'seasons',
    'chaosDirector', 'boss', 'effects', 'gallery', 'ui', 'renderer', 'game', 'pwa'].map(name => `./js/${name}.js`),
  './assets/icons/icon.svg', './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/images/cover.webp', './assets/images/final.webp',
  ...Array.from({ length: 18 }, (_, i) => `./assets/images/memory-${String(i + 1).padStart(2, '0')}.webp`)
];

self.addEventListener('install', event => {
  // Wait for a full, consistent shell. Existing open games keep their old worker.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  // One version of HTML + JS + art is used together, including after offline reload.
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(event.request.mode === 'navigate' ? './index.html' : event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      return response;
    } catch {
      return new Response('Brak połączenia. Otwórz grę raz online, aby zapisać ją offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  }));
});
