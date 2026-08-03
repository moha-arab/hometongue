// HomeTongue — Pin It game engine
const $ = (s) => document.querySelector(s);
const WORLD = [[-55, -170], [72, 190]];
const ROUNDS = 5;
const LISTEN_BUDGET_S = 60; // seconds of actual listening per round — spend it in any number of plays
const CLIP_WINDOW_S = 20;

// One card per deck; decks with fewer than ROUNDS clips show as "stocking" until filled.
const MODES = [
  { key: 'arabic', emoji: '🕌', name: 'Arabic Dialects', desc: 'real Arabic from real radio — pin the <em>city</em> it&#39;s from' },
  { key: 'languages', emoji: '🌍', name: 'World Languages', desc: 'a random language plays — pin it anywhere on Earth' },
  { key: 'accents', emoji: '🗣️', name: 'English Accents', desc: 'everyone speaks English — pin where <em>they&#39;re</em> from' },
  { key: 'french', emoji: '🥐', name: 'French', desc: 'Paris or Montréal? Dakar or Brussels? pin the voice' },
  { key: 'spanish', emoji: '💃', name: 'Spanish', desc: 'Madrid to Mexico City — pin the speaker&#39;s home' },
  { key: 'chinese', emoji: '🐉', name: 'Chinese', desc: 'Mandarin, Cantonese and cousins — pin the city' },
  { key: 'hindi-urdu', emoji: '🪷', name: 'Hindi–Urdu', desc: 'one spoken language, two countries — Delhi or Lahore?' },
  { key: 'portuguese', emoji: '🌊', name: 'Portuguese', desc: 'Lisbon, Rio or Luanda — pin the speaker&#39;s home' },
  { key: 'russian', emoji: '🪆', name: 'Russian', desc: 'Moscow to Almaty — pin where the speaker grew up' },
];

let map, guessMarker = null, truthMarker = null, line = null, extraDots = [];
let gameType = null, deck = [], round = 0, total = 0, roundLog = [];
let budgetLeft = LISTEN_BUDGET_S, playing = false, lastTickT = 0;

const audio = $('#clipAudio');

// ————— map —————
function initMap() {
  map = L.map('map', { zoomControl: false, attributionControl: true, worldCopyJump: true, minZoom: 2 });
  map.fitBounds(WORLD);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);
  map.on('click', onMapClick);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(() => map.invalidateSize(), 60);
  });
}

function onMapClick(e) {
  if ($('#dock').hidden) return; // only during guessing
  if (!guessMarker) {
    guessMarker = L.marker(e.latlng, { draggable: true, icon: pinIcon('#ffb24d') }).addTo(map);
    $('#lockBtn').disabled = false;
    $('#pinHint').textContent = 'drag the pin to adjust, then lock it';
  } else {
    guessMarker.setLatLng(e.latlng);
  }
}

function pinIcon(color) {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/><circle cx="15" cy="14" r="6" fill="#0a0d13"/></svg>`,
    iconSize: [30, 40], iconAnchor: [15, 40],
  });
}

function clearRoundLayers() {
  for (const l of [guessMarker, truthMarker, line, ...extraDots]) if (l) map.removeLayer(l);
  guessMarker = truthMarker = line = null;
  extraDots = [];
}

// ————— helpers —————
function haversineKm(a, b) {
  const R = 6371, d = Math.PI / 180;
  const dLat = (b.lat - a.lat) * d, dLng = (b.lng - a.lng) * d;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Decay tuned per mode: cities need precision, world languages forgive continental misses.
const MODE_DECAY = {
  arabic: 500, accents: 900, languages: 1500,
  'hindi-urdu': 500, french: 700, chinese: 700, spanish: 900, portuguese: 900, russian: 900,
};

function scoreFor(km, radius) {
  if (km <= radius) return 5000;
  const decay = MODE_DECAY[gameType] || 1200;
  return Math.round(5000 * Math.exp(-(km - radius) / decay));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 3000);
}

// Views: 'pick' and 'final' are centered cards; 'round' is pill + bottom dock (map free);
// 'reveal' is pill + bottom sheet.
function setView(v) {
  $('#pickCard').hidden = v !== 'pick';
  $('#finalCard').hidden = v !== 'final';
  $('#roundPill').hidden = v !== 'round' && v !== 'reveal';
  $('#dock').hidden = v !== 'round';
  $('#sheet').hidden = v !== 'reveal';
}

// ————— game flow —————
function startGame(type) {
  const pool = (window.CLIPS && window.CLIPS[type]) || [];
  if (pool.length < ROUNDS) {
    toast('This mode is still being stocked with clips — try another one!');
    return;
  }
  gameType = type;
  deck = dealDeck(pool);
  round = 0; total = 0; roundLog = [];
  warmDeck();
  nextRound();
}

// Deal with country variety: one clip per country first, repeats only when countries run out.
// Spontaneous ("wild") clips outrank read-aloud ones within each country.
function dealDeck(pool) {
  const byCountry = {};
  for (const c of shuffle(pool)) {
    const country = c.label.includes(',') ? c.label.split(',').pop().trim() : c.label;
    (byCountry[country] = byCountry[country] || []).push(c);
  }
  for (const rows of Object.values(byCountry)) rows.sort((a, b) => (b.wild ? 1 : 0) - (a.wild ? 1 : 0));
  const countries = shuffle(Object.keys(byCountry));
  const out = [];
  // one clip per country first, so a round never opens with two clips from the same place
  for (const country of countries) {
    if (out.length >= ROUNDS) break;
    const c = byCountry[country].shift();
    if (c) out.push(c);
  }
  // then keep drawing from whichever country still has the most unused clips — in a deck like
  // Chinese, that spends the four China cities instead of repeating Hong Kong twice
  while (out.length < ROUNDS) {
    const next = countries
      .map((k) => byCountry[k])
      .filter((rows) => rows.length)
      .sort((a, b) => b.length - a.length)[0];
    if (!next) break; // pool exhausted
    out.push(next.shift());
  }
  return out;
}

// Warm the browser HTTP cache for small clips (SAA's server is slow cold) —
// big spoken-article files stream fine on demand, so skip them.
function warmDeck() {
  for (const clip of deck) {
    if ((clip.size || 0) > 0 && clip.size <= 3_000_000) {
      fetch(clip.url, { mode: 'no-cors' }).catch(() => {});
    }
  }
}

function fmtBudget() {
  const s = Math.ceil(budgetLeft);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} of listening left`;
}

function nextRound() {
  clearRoundLayers();
  map.fitBounds(WORLD);
  audio.pause();
  audio.removeAttribute('src');
  budgetLeft = LISTEN_BUDGET_S;
  playing = false;
  lastTickT = 0;
  $('#roundNum').textContent = `Round ${round + 1}/${ROUNDS}`;
  $('#scoreSoFar').textContent = `${total.toLocaleString()} pts`;
  $('#listens').textContent = fmtBudget();
  $('#playerFill').style.width = '0%';
  $('#playBtn').disabled = false;
  $('#lockBtn').disabled = true;
  $('#pinHint').textContent = '▶ listen, then tap the map to drop your pin';
  setView('round');
  audio.src = deck[round].url; // preload metadata now so play starts instantly on tap
  audio.load();
}

// The playable region is a fixed CLIP_WINDOW_S slice starting at _offset —
// curated (clip.start, skips location-revealing intros) or random for long recordings.
function ensureOffset(clip) {
  if (clip._offset !== undefined) return;
  if (clip.start !== undefined) {
    clip._offset = clip.start;
  } else {
    clip._offset = (audio.duration && isFinite(audio.duration) && audio.duration > 90)
      ? Math.min(15 + Math.random() * audio.duration * 0.4, audio.duration - 30)
      : 0;
  }
}

function playClip() {
  if (playing || budgetLeft <= 0) return;
  const clip = deck[round];
  if (!audio.src) { audio.src = clip.url; audio.load(); }
  if (audio.readyState < 1) {
    toast('Clip is loading — one sec…');
    audio.addEventListener('loadedmetadata', playClip, { once: true });
    return;
  }
  ensureOffset(clip);
  // resume where the scrubber sits; rewind only if outside the window or at its end
  if (audio.currentTime < clip._offset || audio.currentTime >= clip._offset + CLIP_WINDOW_S - 0.3) {
    audio.currentTime = clip._offset;
  }
  audio.play().then(() => {
    playing = true;
    lastTickT = audio.currentTime;
  }).catch((e) => {
    playing = false;
    if (e && e.name === 'NotAllowedError') {
      toast('Tap ▶ once more to start the sound.');
    } else {
      toast('That clip refused to play — swapping it for you.');
      deck[round] = replacementClip();
      audio.removeAttribute('src');
    }
  });
}

function replacementClip() {
  const used = new Set(deck.map((c) => c.id));
  const pool = (window.CLIPS[gameType] || []).filter((c) => !used.has(c.id));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : deck[round];
}

const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
const ICON_PAUSE = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
function updatePlayIcon() {
  $('#playIcon').innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
}

function updateFill() {
  const clip = deck[round];
  if (!clip || clip._offset === undefined) return;
  const elapsed = audio.currentTime - clip._offset;
  const pct = Math.min(100, Math.max(0, elapsed / CLIP_WINDOW_S) * 100);
  $('#playerFill').style.width = `${pct}%`;
  $('#playerThumb').style.left = `${pct}%`;
  $('#playerBar').setAttribute('aria-valuenow', Math.round(Math.max(0, elapsed)));
}

// Nudge the playhead within the window; used by the ±5s buttons and arrow keys.
function seekBy(delta) {
  const clip = deck[round];
  if (!clip || audio.readyState < 1) return;
  ensureOffset(clip);
  const max = clip._offset + CLIP_WINDOW_S - 0.2;
  audio.currentTime = Math.min(max, Math.max(clip._offset, audio.currentTime + delta));
  updateFill();
}

audio.addEventListener('timeupdate', () => {
  const clip = deck[round];
  if (!clip || clip._offset === undefined) return;
  updateFill();
  if (!playing) return;
  // the timer only burns while sound is actually playing; seeks don't cost anything
  const delta = audio.currentTime - lastTickT;
  if (delta > 0 && delta < 1.5) {
    budgetLeft = Math.max(0, budgetLeft - delta);
    $('#listens').textContent = fmtBudget();
  }
  lastTickT = audio.currentTime;
  if (audio.currentTime - clip._offset >= CLIP_WINDOW_S) { audio.pause(); return; }
  if (budgetLeft <= 0) {
    audio.pause();
    $('#playBtn').disabled = true;
    $('#listens').textContent = 'listening time up — trust your ear, drop the pin';
  }
});
audio.addEventListener('seeked', () => { lastTickT = audio.currentTime; updateFill(); });
audio.addEventListener('play', () => { updatePlayIcon(); });
audio.addEventListener('pause', () => { playing = false; updatePlayIcon(); });
audio.addEventListener('ended', () => { playing = false; updatePlayIcon(); });

// ————— scrubber: tap or drag anywhere on the bar to move inside the playable window —————
const playerBar = $('#playerBar');
let scrubbing = false;
function scrubTo(clientX) {
  const clip = deck[round];
  if (!clip || audio.readyState < 1) return;
  ensureOffset(clip);
  const rect = playerBar.getBoundingClientRect();
  if (!rect.width) return;
  const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const windowLen = Math.min(CLIP_WINDOW_S, (isFinite(audio.duration) ? audio.duration : Infinity) - clip._offset);
  const target = clip._offset + frac * Math.max(0, windowLen - 0.1);
  if (isFinite(target)) audio.currentTime = target;
}
playerBar.addEventListener('pointerdown', (e) => {
  scrubbing = true;
  playerBar.classList.add('dragging');
  try { playerBar.setPointerCapture(e.pointerId); } catch { /* capture is a nicety, seeking is the point */ }
  scrubTo(e.clientX);
});
playerBar.addEventListener('pointermove', (e) => { if (scrubbing) scrubTo(e.clientX); });
const endScrub = () => { scrubbing = false; playerBar.classList.remove('dragging'); };
playerBar.addEventListener('pointerup', endScrub);
playerBar.addEventListener('pointercancel', endScrub);
playerBar.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { seekBy(-2); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { seekBy(2); e.preventDefault(); }
});

// Whole-page shortcuts: space toggles play, arrows nudge — as long as you're not typing a nickname.
document.addEventListener('keydown', (e) => {
  if ($('#dock').hidden || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); if (playing) audio.pause(); else playClip(); }
  else if (e.key === 'ArrowLeft' && document.activeElement !== playerBar) { e.preventDefault(); seekBy(-5); }
  else if (e.key === 'ArrowRight' && document.activeElement !== playerBar) { e.preventDefault(); seekBy(5); }
});

function lockIn() {
  if (!guessMarker) return;
  audio.pause();
  const clip = deck[round];
  const guess = guessMarker.getLatLng();
  // Pluricentric languages accept any listed home region — you're scored to the nearest one.
  const centers = [{ lat: clip.lat, lng: clip.lng, name: clip.label, primary: true }, ...(clip.alt || [])];
  let best = centers[0], bestKm = haversineKm(guess, centers[0]);
  for (const c of centers.slice(1)) {
    const d = haversineKm(guess, c);
    if (d < bestKm) { best = c; bestKm = d; }
  }
  const km = Math.round(bestKm);
  const pts = scoreFor(km, clip.r);
  total += pts;
  $('#scoreSoFar').textContent = `${total.toLocaleString()} pts`; // pill reflects the round immediately
  roundLog.push({ id: clip.id, label: clip.label, km, pts });

  const truth = { lat: best.lat, lng: best.lng };
  truthMarker = L.marker(truth, { icon: pinIcon('#7ee08a') }).addTo(map);
  for (const c of centers) {
    if (c === best) continue;
    extraDots.push(L.circleMarker([c.lat, c.lng], { radius: 6, color: '#7ee08a', weight: 2, fillColor: '#7ee08a', fillOpacity: 0.25 })
      .addTo(map).bindTooltip(c.name));
  }
  line = L.polyline([guess, truth], { color: '#ffb24d', weight: 2, dashArray: '6 8', opacity: 0.8 }).addTo(map);
  // keep the arc visible above the bottom sheet
  map.fitBounds(L.latLngBounds([guess, truth]), { paddingTopLeft: [60, 90], paddingBottomRight: [60, 300] });

  $('#revealLabel').textContent = clip.label;
  const altNote = best.primary ? '' : ` · scored to ${best.name} — ${clip.lang} lives there too`;
  $('#revealStats').textContent = `${km.toLocaleString()} km away → +${pts.toLocaleString()} pts${pts === 5000 ? ' 🎯' : ''}${altNote}`;
  $('#revealHint').textContent = clip.hint || '';
  $('#revealAttribution').textContent = clip.attribution;
  $('#nextBtn').textContent = round === ROUNDS - 1 ? 'see final score →' : 'next clip →';
  setView('reveal');
}

function advance() {
  round += 1;
  if (round < ROUNDS) return nextRound();
  finishGame();
}

function finishGame() {
  clearRoundLayers();
  map.fitBounds(WORLD);
  $('#finalScore').textContent = `${total.toLocaleString()} / 25,000`;
  const list = $('#roundList');
  list.innerHTML = '';
  const maxPts = 5000;
  for (const r of roundLog) {
    const row = document.createElement('div');
    row.className = 'runner';
    row.innerHTML = `<span class="runner-name">${r.label}</span><div class="runner-track"><div class="runner-fill" style="width:${Math.round(r.pts / maxPts * 100)}%"></div></div><span class="runner-pts">+${r.pts.toLocaleString()}</span>`;
    list.appendChild(row);
  }
  $('#nickRow').hidden = false;
  $('#board').hidden = true;
  $('#submitScore').disabled = false;
  setView('final');
}

async function submitScore() {
  const nickname = $('#nickname').value.trim() || 'anon';
  localStorage.setItem('ht_nick', nickname);
  $('#submitScore').disabled = true;
  try {
    const resp = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, game_type: gameType, points: total, rounds: roundLog.map((r) => ({ id: r.id, km: r.km, pts: r.pts })) }),
    });
    const d = await resp.json();
    if (!d.ok) throw new Error(d.error);
    toast(`Posted! You're #${d.rank} on ${gameType}.`);
    await loadBoard();
  } catch (e) {
    toast(e.message === 'not_configured' ? 'Leaderboard is warming up — score saved locally.' : 'Couldn\'t post the score — but you played it, that\'s what counts.');
    $('#submitScore').disabled = false;
  }
}

async function loadBoard() {
  try {
    const d = await (await fetch(`/api/scores?game_type=${gameType}`)).json();
    if (!d.ok) return;
    const ol = $('#boardList');
    ol.innerHTML = '';
    for (const row of d.top) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(row.nickname)}</span><b>${row.points.toLocaleString()}</b>`;
      ol.appendChild(li);
    }
    $('#nickRow').hidden = true;
    $('#board').hidden = false;
  } catch { /* board stays hidden */ }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderModeCards() {
  const grid = $('#typeGrid');
  grid.innerHTML = '';
  for (const m of MODES) {
    const pool = (window.CLIPS && window.CLIPS[m.key]) || [];
    const ready = pool.length >= ROUNDS;
    const b = document.createElement('button');
    b.className = 'type-btn' + (ready ? '' : ' soon');
    b.innerHTML = `<span class="type-emoji">${m.emoji}</span><span class="type-name">${m.name}</span><span class="type-desc">${m.desc}</span>${ready ? '' : '<span class="type-soon-note">stocking clips…</span>'}`;
    if (ready) b.onclick = () => startGame(m.key);
    grid.appendChild(b);
  }
}

// ————— wire up —————
initMap();
renderModeCards();
$('#playBtn').onclick = () => { if (playing) audio.pause(); else playClip(); };
$('#backBtn').onclick = () => seekBy(-5);
$('#fwdBtn').onclick = () => seekBy(5);
$('#lockBtn').onclick = lockIn;
$('#nextBtn').onclick = advance;
$('#submitScore').onclick = submitScore;
$('#againSame').onclick = () => startGame(gameType);
$('#switchType').onclick = () => { clearRoundLayers(); map.fitBounds(WORLD); setView('pick'); };
$('#nickname').value = localStorage.getItem('ht_nick') || '';
