// Shared chrome: basemap that follows the theme, and the isogloss field behind everything.
// Loaded before app.js / game.js on both pages.

window.HT = window.HT || {};

// —————— theme ——————
const THEME_KEY = 'ht_theme';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
  return document.documentElement.dataset.theme
    || localStorage.getItem(THEME_KEY)
    || (prefersDark.matches ? 'dark' : 'light');
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#0F1517' : '#ECEFEC';
  document.dispatchEvent(new CustomEvent('ht:theme', { detail: { theme } }));
}
window.HT.applyTheme = applyTheme;
window.HT.currentTheme = currentTheme;

// apply the stored choice before first paint of the map
applyTheme(currentTheme());
prefersDark.addEventListener('change', (e) => {
  if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light');
});

// A light chart basemap in light mode; the dark one only when the viewer asked for dark.
window.HT.basemap = function basemap(map) {
  const url = (t) => `https://{s}.basemaps.cartocdn.com/${t === 'dark' ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`;
  const opts = {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19,
  };
  // One layer, re-pointed on theme change — adding/removing layers churns tiles and can
  // leave stale ones behind if the swaps come faster than the removals.
  const layer = L.tileLayer(url(currentTheme()), opts).addTo(map);
  document.addEventListener('ht:theme', (e) => layer.setUrl(url(e.detail.theme)));
  return layer;
};

// —————— isogloss field ——————
// Dialectologists draw isoglosses: the lines where one way of saying something stops and
// another begins. This is that idea as ambient texture — a few slow contour rings that
// drift, plus a burst you can fire when the app is listening or a clip is playing.
window.HT.contours = function contours() {
  const cv = document.getElementById('contours');
  if (!cv) return { pulse() {} };
  const ctx = cv.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, dpr = 1, t = 0, raf = 0;
  const rings = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // clientWidth can still be 0 on first run, which would leave the canvas at its 300x150
    // default and stretch a blurry drawing across the viewport
    w = cv.clientWidth || window.innerWidth;
    h = cv.clientHeight || window.innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('load', resize);
  resize();

  const line = () => getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#145C55';

  // three drifting centres, so the field never reads as one bullseye
  const centres = [
    { x: 0.22, y: 0.30, phase: 0 },
    { x: 0.78, y: 0.62, phase: 2.1 },
    { x: 0.46, y: 0.86, phase: 4.3 },
  ];

  function frame() {
    t += reduce ? 0 : 0.0022;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = line();
    ctx.lineWidth = 1;

    for (const c of centres) {
      const cx = c.x * w, cy = c.y * h;
      for (let i = 0; i < 7; i++) {
        const r = ((t + c.phase + i * 0.14) % 1) * Math.max(w, h) * 0.55;
        if (r < 8) continue;
        // petrol on a pale chart needs more weight than a light line on a dark one
        const base = currentTheme() === 'dark' ? 0.16 : 0.3;
        ctx.globalAlpha = base * (1 - r / (Math.max(w, h) * 0.55));
        ctx.beginPath();
        // slightly irregular circles read as terrain, not as ripples in a pond
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.14) {
          const wobble = 1 + 0.055 * Math.sin(a * 3 + c.phase + t * 2) + 0.03 * Math.sin(a * 5 - t);
          const x = cx + Math.cos(a) * r * wobble;
          const y = cy + Math.sin(a) * r * wobble * 0.82;
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i];
      g.r += g.speed;
      g.alpha *= 0.972;
      if (g.alpha < 0.01) { rings.splice(i, 1); continue; }
      ctx.globalAlpha = g.alpha;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.r, g.r * 0.82, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) raf = requestAnimationFrame(frame);
  });

  return {
    // fire a ring outward from a point (defaults to the centre of the screen)
    pulse(x = w / 2, y = h / 2, strength = 1) {
      if (reduce) return;
      rings.push({ x, y, r: 6, speed: 1.6 + strength * 2.2, alpha: 0.4 * strength });
      if (rings.length > 40) rings.shift();
    },
  };
};

// —————— theme toggle ——————
(function themeToggle() {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;
  const sun = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const moon = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.7 6.7 0 0 0 10.5 10.5z"/></svg>';
  const paint = () => { document.getElementById('themeIcon').innerHTML = window.HT.currentTheme() === 'dark' ? sun : moon; };
  paint();
  btn.addEventListener('click', () => {
    window.HT.applyTheme(window.HT.currentTheme() === 'dark' ? 'light' : 'dark');
    paint();
  });
})();
