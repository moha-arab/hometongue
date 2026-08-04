// Service worker: makes the app installable and instant on repeat visits.
// Deliberately conservative — the shell is cached, audio and API calls are not, because a
// stale clip manifest paired with fresh clip files (or vice versa) breaks rounds.
const VERSION = 'ht-v1';
const SHELL = [
  '/',
  '/game.html',
  '/css/style.css',
  '/js/theme.js',
  '/js/media.js',
  '/js/clips.js',
  '/js/game.js',
  '/js/app.js',
  '/manifest.webmanifest',
  '/icon-192.png',
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
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('/'))),
  );
});
