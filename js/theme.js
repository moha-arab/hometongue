// Shared chrome: basemap that follows the theme, and the isogloss field behind everything.
// Loaded before app.js / game.js on both pages.

window.HT = window.HT || {};

// A single light chart basemap — the design commits to one palette.
window.HT.basemap = function basemap(map) {
  return L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);
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

  const line = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2A6B60';

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
        const base = 0.16;
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

// —————— the live ink ——————
// Each deck owns a colour. Setting it on <html> re-inks every surface at once:
// the map plate, the pin, the dock, the type. The wash is the moment of change.
window.HT.setDeck = function setDeck(deck, origin) {
  const root = document.documentElement;
  if (root.dataset.deck === deck) return;
  root.dataset.deck = deck || 'languages';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('div');
  el.className = 'wash';
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  // big enough to reach the far corner from wherever it started
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  Object.assign(el.style, { left: `${x - r}px`, top: `${y - r}px`, width: `${r * 2}px`, height: `${r * 2}px` });
  document.body.appendChild(el);
  el.style.animation = 'washOut 0.85s cubic-bezier(0.3, 0, 0.2, 1) forwards';
  el.addEventListener('animationend', () => el.remove());
};

window.HT.ink = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
window.HT.amber = () => getComputedStyle(document.documentElement).getPropertyValue('--amber').trim();
