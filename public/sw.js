// Minimal service worker: caches the app shell (JS/CSS/fonts) only.
// Deliberately NEVER caches Jellyfin API/media traffic (/jellyfin/*, /Videos/*, /Items/*,
// /Users/*, /Sessions/*, .m3u8 playlists, .ts segments) — those are dynamic, huge, and
// per-session; caching them would either break playback or blow the cache quota.
const CACHE_NAME = 'jellystream-shell-v1';

const BYPASS_PATTERNS = [
  '/jellyfin/',
  '/Videos/',
  '/Items/',
  '/Users/',
  '/Sessions/',
  '/Shows/',
  '/Genres',
];

function shouldBypass(url) {
  if (url.pathname.endsWith('.m3u8') || url.pathname.endsWith('.ts')) return true;
  return BYPASS_PATTERNS.some((p) => url.pathname.includes(p));
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin (Jellyfin) requests
  if (shouldBypass(url)) return;

  if (request.mode === 'navigate') {
    // Network-first for HTML so deploys are picked up immediately; cached shell as offline fallback.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    // Hashed, immutable build output — cache-first.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return res;
          })
      )
    );
  }
});
