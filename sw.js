// The Day — service worker. Offline-first app shell + Google Fonts fallback.
const CACHE = 'theday-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './engine.js',
  './store.js',
  './ics.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Navigation: cache-first shell, network fallback (offline-first app).
  if (request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((r) => r || fetch(request)));
    return;
  }

  // Google Fonts: cache what we can; if offline, let it fail → CSS system-sans fallback.
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(request).then((hit) =>
          hit || fetch(request).then((res) => { c.put(request, res.clone()); return res; }).catch(() => hit)
        )
      )
    );
    return;
  }

  // Same-origin: cache-first, fall back to network and cache it.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(request).then((hit) =>
        hit || fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        }).catch(() => hit)
      )
    );
  }
});
