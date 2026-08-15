// Service worker: makes the app installable and instant on repeat visits.
// Deliberately conservative — the shell is cached, audio and API calls are not, because a
// stale clip manifest paired with fresh clip files (or vice versa) breaks rounds.
// Bump on every release that changes a shell asset. The fetch handler is network-first, so a
// stale cache never wins on a live connection, but the version is what evicts the old entries
// on activate — leaving it fixed means yesterday's CSS sits in storage forever as the offline
// fallback. v47: the pre-launch pass — random clip windows pinned, decks restructured to ten,
// the leaderboard rebuilt, inputs raised to 16px, and the card layout moved off auto margins.
// BUMP THIS ON ANY DEPLOY THAT CHANGES THE SHELL. It sat at v47 through 22 consecutive deploys,
// and because the install handler only re-runs when THIS FILE changes, the precache still held
// index.html and app.js from 22 commits ago the whole time.
const VERSION = 'ht-v48';

// FILES WHOSE VERSIONS MUST MATCH EACH OTHER. A stale copy of an icon is a cosmetic nuisance; a
// stale app.js against a fresh index.html is a crash, because the old code looks for elements the
// new markup no longer has, gets null, throws, and surfaces as "Something went wrong on our end."
//
// That is not hypothetical, it is the shape of the reported iPhone failure. Every request below
// races a 3.5s timer and falls back to cache independently, so on a slow connection index.html
// can arrive fresh from the network while app.js times out and comes back 22 commits old. A
// desktop on wired internet never hits 3.5s and never sees it; a phone on cellular does.
//
// For these paths, slow is better than skewed: wait for the network, and fall back to cache only
// on a real failure, where everything falls back together.
const LOCKSTEP = new Set(['/', '/index.html', '/game.html', '/js/app.js', '/js/game.js', '/js/clips.js', '/css/style.css']);
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
  // Leaflet is served from our own origin now, so it belongs in the shell. It used to come from
  // unpkg, and when that request failed the game page threw "L is not defined" out of initMap()
  // and rendered nothing at all — a third-party CDN was a single point of failure for the whole
  // game.
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/leaflet.css',
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
  // NETWORK-FIRST, BUT NOT NETWORK-FOREVER.
  //
  // A plain `fetch()` on a stalled connection — the phone that shows full bars and moves nothing,
  // which is most of a train or a festival — hangs until the browser gives up, and the cached
  // copy that would have painted instantly sits unused the whole time. Racing a short timer keeps
  // network-first semantics (a live connection still wins and still refreshes the cache) and only
  // changes what happens when the network is not answering.
  let lockstep = false;
  try { lockstep = LOCKSTEP.has(new URL(e.request.url).pathname); } catch { /* opaque URL */ }
  const fromNetwork = lockstep
    ? fetch(e.request)   // no timer: a slow load beats a mismatched one
    : new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('slow')), 3500);
      fetch(e.request).then((r) => { clearTimeout(timer); resolve(r); }, (err) => { clearTimeout(timer); reject(err); });
    });
  e.respondWith(
    fromNetwork
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
