// Shared chrome: basemap that follows the theme, and the isogloss field behind everything.
// Loaded before app.js / game.js on both pages.

window.HT = window.HT || {};

// A single light chart basemap — the design commits to one palette.
// Labels ride on their own layer so they can be dropped at world zoom: down there
// Voyager only has continent labels, and they arrive as every language at once
// ("AMÉRICA DO SUL;AMÉRICA DEL SUR"), which reads as a rendering bug. Country
// names start around z4 and those are the ones that actually help you pin.
const CARTO = 'https://{s}.basemaps.cartocdn.com/rastertiles/{style}/{z}/{x}/{y}{r}.png';
const LABEL_ZOOM = 4;

// The world is 256px square at zoom 0 and doubles each level, so below a certain zoom it is
// narrower than the window. Before noWrap that was invisible because Leaflet just painted more
// copies of Earth side by side — the "four maps" bug. With noWrap on, the same zoom leaves
// bare grey gutters instead. Neither is acceptable, so the floor is derived from the container:
// the smallest zoom whose world still covers the longest side of the viewport.
window.HT.minZoomFor = function minZoomFor(el) {
  const w = (el && el.clientWidth) || window.innerWidth;
  const h = (el && el.clientHeight) || window.innerHeight;
  return Math.max(1, Math.ceil(Math.log2(Math.max(w, h) / 256)));
};

// MUST be passed as a map option, not applied afterwards. Calling setZoom() during init to
// lift the map above a late-arriving floor interrupts Leaflet's tile fade-in, and the tiles
// stay stuck at opacity 0 — a fully loaded, completely invisible map. That hit game.html and
// not index.html purely because fitting the whole world lands on zoom 2 while the smaller
// home bounds already clear the floor, so the correction only fired on one page.
window.HT.keepMinZoom = function keepMinZoom(map, el) {
  map.on('resize', () => {
    const z = window.HT.minZoomFor(el);
    if (z === map.getMinZoom()) return;
    map.setMinZoom(z);
    if (map.getZoom() < z) map.setZoom(z, { animate: false });
  });
};

window.HT.basemap = function basemap(map) {
  const opts = {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19,
    // Without noWrap, Leaflet paints a fresh copy of Earth for every 360 degrees of pan,
    // so zooming out showed four side-by-side worlds and dragging sideways went on forever.
    noWrap: true, bounds: [[-90, -180], [90, 180]],
  };
  const land = L.tileLayer(CARTO.replace('{style}', 'voyager_nolabels'), opts).addTo(map);
  const names = L.tileLayer(CARTO.replace('{style}', 'voyager_only_labels'), { ...opts, attribution: '' });

  const sync = () => {
    const want = map.getZoom() >= LABEL_ZOOM;
    if (want && !map.hasLayer(names)) names.addTo(map);
    else if (!want && map.hasLayer(names)) map.removeLayer(names);
  };
  map.on('zoomend', sync);
  sync();
  return land;
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
  // 'languages' was the fallback until that deck was removed. Nothing in the stylesheet
  // reads this attribute today — setDeck's visible effect is the wash below — so the
  // value only has to be a name that exists.
  root.dataset.deck = deck || 'none';

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
