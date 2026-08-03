// The Day — service worker. Auto-updating: deployed edits reach installed
// copies without a manual version bump.
//
// Strategy:
//   • navigations  → network-first (fresh HTML when online, cached offline)
//   • same-origin  → network-first with a fast timeout, cache fallback: an
//                    online open gets the newest deploy immediately; if the
//                    network is slow/absent it falls back to the cached copy,
//                    so the app still opens instantly offline.
//   • Google Fonts → stale-while-revalidate, cache fallback (system-sans offline)
// The SW takes control immediately (skipWaiting + claim) and app.js reloads
// once when a new worker activates, so a fresh deploy lands on the next open.
const NET_TIMEOUT = 2500; // ms before falling back to cache on a slow network
const CACHE = 'theday-v2';
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
  // cache:'reload' bypasses the HTTP cache so a fresh install always precaches
  // the newest shell from the network.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Refresh a cache entry in the background; return the network response.
function revalidate(cache, request) {
  return fetch(request).then((res) => {
    if (res && res.status === 200) cache.put(request, res.clone());
    return res;
  });
}

// Network-first with a timeout fallback to cache. The network fetch always
// updates the cache when it lands (even after the timeout), so the copy stays
// fresh for next time. Falls back to cache on timeout or network failure.
function networkFirst(cache, request) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r) => { if (!settled && r) { settled = true; resolve(r); } };

    fetch(request).then((res) => {
      if (res && res.status === 200) cache.put(request, res.clone());
      done(res);
    }).catch(() => { cache.match(request).then((hit) => done(hit || Response.error())); });

    setTimeout(() => { if (!settled) cache.match(request).then(done); }, NET_TIMEOUT);
  });
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Navigations: network-first so the HTML entry is always current online.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Google Fonts: stale-while-revalidate; if offline and uncached, let it fail
  // → CSS falls back to system sans.
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(request).then((hit) => {
          const net = revalidate(c, request).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Same-origin app assets: network-first (timeout → cache) so an online open
  // picks up the latest deploy right away, while offline still opens instantly.
  if (url.origin === location.origin) {
    e.respondWith(caches.open(CACHE).then((c) => networkFirst(c, request)));
  }
});
