// First-party telemetry. Loaded before everything else on both pages.
//
// WHAT THIS IS: a few hundred bytes per meaningful action - "started recording", "got a verdict",
// "posted a score" - sent to our own /api/track and stored in our own table. No third-party
// script, no cookie, no fingerprint. The session id below lives in ONE tab for ONE visit and is
// gone when the tab closes; the server derives a daily visitor count from the request without
// ever storing the address. The privacy page says exactly this.
//
// WHAT IT IS NOT: it never carries words, audio, nicknames, or anything a person typed. Props are
// small allowlisted values (a deck name, a second count, an error code) and the server drops
// anything else on the floor. Measuring the funnel is the point; watching people is not.
//
// Loaded first so the error hook below sees everything that follows. Every call is wrapped, so a
// telemetry failure can never take a feature down with it.
window.HT = window.HT || {};
(function () {
  const session = (function () {
    try {
      let s = sessionStorage.getItem('ht_s');
      if (!s) { s = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('ht_s', s); }
      return s;
    } catch { return Math.random().toString(36).slice(2, 10); }   // storage blocked: still unique per load
  })();
  const page = location.pathname === '/' ? 'home'
    : (location.pathname.replace(/^\//, '').replace(/\.html$/, '').split('/')[0] || 'home');
  const ref = (function () {
    try { return document.referrer ? new URL(document.referrer).hostname : ''; } catch { return ''; }
  })();

  function track(event, props) {
    try {
      const body = JSON.stringify({ e: event, p: props || {}, s: session, pg: page, r: ref });
      // sendBeacon survives the page closing, which is the whole reason it exists: 'leave' and
      // the last event before navigation would otherwise be lost. Same-origin, so no preflight.
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
    } catch { /* telemetry never throws into the app */ }
  }
  window.HT.track = track;

  track('page_view', {
    w: window.innerWidth,
    pwa: !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches),
  });

  // One performance sample per view: how long the page took and how fast the server answered.
  // One tick AFTER load, not inside it: loadEventEnd is stamped only once the load event has
  // finished dispatching, so a read inside the handler is always 0.
  window.addEventListener('load', function () {
    setTimeout(function () {
      try {
        const n = performance.getEntriesByType('navigation')[0];
        if (n) track('perf', { load_ms: Math.round(n.loadEventEnd), ttfb_ms: Math.round(n.responseStart) });
      } catch { /* older browsers */ }
    }, 0);
  });

  // Errors that reach the window are the bugs nobody reports. Message and file only, no stack.
  window.addEventListener('error', function (ev) {
    track('js_error', {
      msg: String(ev.message || '').slice(0, 120),
      src: String(ev.filename || '').split('/').pop().slice(0, 40),
      line: ev.lineno || 0,
    });
  });
  window.addEventListener('unhandledrejection', function (ev) {
    const r = ev.reason;
    track('js_error', { msg: String((r && r.message) || r || '').slice(0, 120), src: 'promise', line: 0 });
  });

  // Time on page, sent when the tab goes to the background - which on a phone is how pages end.
  const t0 = Date.now();
  let left = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && !left) { left = true; track('leave', { s: Math.round((Date.now() - t0) / 1000) }); }
    else if (!document.hidden) left = false;
  });
})();
