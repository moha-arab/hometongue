// Service worker: makes the app installable and instant on repeat visits.
// Deliberately conservative — the shell is cached, audio and API calls are not, because a
// stale clip manifest paired with fresh clip files (or vice versa) breaks rounds.
// Bump on every release that changes a shell asset. The fetch handler is network-first, so a
// stale cache never wins on a live connection, but the version is what evicts the old entries
// on activate — leaving it fixed means yesterday's CSS sits in storage forever as the offline
// fallback. Bumped for the two-mode nav, the serif headlines and the map zoom fix.
const VERSION = 'ht-v29';
const SHELL = [
  '/',
  '/game.html',
  '/css/style.css',
  '/js/theme.js',
  '/js/media.js',
  '/js/clips.js',
  '/js/game.js',
  '/js/world.js',
  '/js/app.js',
  '/js/places.js',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/assets/logo-mark.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;        // tiles, fonts, YouTube: straight to network
  if (url.pathname.startsWith('/api/')) return;           // never cache an analysis
  if (url.pathname.startsWith('/clips/')) return;         // audio streams with range requests

  // Network first so a deploy lands immediately; cache is the offline fallback.
  // Only healthy responses are cached — a 500 stored here once would replay as the offline
  // copy forever. And the index fallback is for NAVIGATIONS only: serving index.html bytes
  // to a failed script or CSS request produces far stranger breakage than a plain failure.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => {
        if (hit) return hit;
        if (e.request.mode === 'navigate') return caches.match('/');
        return Response.error();
      })),
  );
});
