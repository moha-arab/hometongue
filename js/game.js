// HomeTongue — Pin It game engine
const $ = (s) => document.querySelector(s);
const WORLD = [[-55, -170], [72, 190]];
const ROUNDS = 5;
const MAX_LISTENS = 3;
const CLIP_WINDOW_S = 20;

let map, guessMarker = null, truthMarker = null, line = null;
let gameType = null, deck = [], round = 0, total = 0, roundLog = [];
let listensLeft = MAX_LISTENS, playing = false, playStart = 0;

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
  for (const l of [guessMarker, truthMarker, line]) if (l) map.removeLayer(l);
  guessMarker = truthMarker = line = null;
}

// ————— helpers —————
function haversineKm(a, b) {
  const R = 6371, d = Math.PI / 180;
  const dLat = (b.lat - a.lat) * d, dLng = (b.lng - a.lng) * d;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function scoreFor(km, radius) {
  if (km <= radius) return 5000;
  return Math.round(5000 * Math.exp(-(km - radius) / 1500));
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
function dealDeck(pool) {
  const byCountry = {};
  for (const c of shuffle(pool)) {
    const country = c.label.includes(',') ? c.label.split(',').pop().trim() : c.label;
    (byCountry[country] = byCountry[country] || []).push(c);
  }
  const countries = shuffle(Object.keys(byCountry));
  const out = [];
  while (out.length < ROUNDS) {
    let took = false;
    for (const country of countries) {
      if (out.length >= ROUNDS) break;
      const c = (byCountry[country] || []).shift();
      if (c) { out.push(c); took = true; }
    }
    if (!took) break; // pool exhausted
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

function nextRound() {
  clearRoundLayers();
  map.fitBounds(WORLD);
  audio.pause();
  audio.removeAttribute('src');
  listensLeft = MAX_LISTENS;
  playing = false;
  $('#roundNum').textContent = `Round ${round + 1}/${ROUNDS}`;
  $('#scoreSoFar').textContent = `${total.toLocaleString()} pts`;
  $('#listens').textContent = `${listensLeft} listens left`;
  $('#playerFill').style.width = '0%';
  $('#lockBtn').disabled = true;
  $('#pinHint').textContent = '▶ listen, then tap the map to drop your pin';
  setView('round');
  audio.src = deck[round].url; // preload metadata now so play starts instantly on tap
  audio.load();
}

function playClip() {
  if (playing || listensLeft <= 0) return;
  const clip = deck[round];
  if (!audio.src) { audio.src = clip.url; audio.load(); }
  if (audio.readyState < 1) {
    toast('Clip is loading — one sec…');
    audio.addEventListener('loadedmetadata', playClip, { once: true });
    return;
  }
  if (clip._offset === undefined) {
    // long recordings (spoken articles): start somewhere in the first half, past the intro
    clip._offset = (audio.duration && isFinite(audio.duration) && audio.duration > 90)
      ? Math.min(15 + Math.random() * audio.duration * 0.4, audio.duration - 30)
      : 0;
  }
  audio.currentTime = clip._offset;
  audio.play().then(() => {
    playing = true;
    playStart = clip._offset;
    listensLeft -= 1; // a listen only counts once sound actually starts
    $('#listens').textContent = `${listensLeft} listen${listensLeft === 1 ? '' : 's'} left`;
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

audio.addEventListener('timeupdate', () => {
  if (!playing) return;
  const elapsed = audio.currentTime - playStart;
  $('#playerFill').style.width = `${Math.min(100, (elapsed / CLIP_WINDOW_S) * 100)}%`;
  if (elapsed >= CLIP_WINDOW_S) { audio.pause(); }
});
audio.addEventListener('play', () => { updatePlayIcon(); });
audio.addEventListener('pause', () => { playing = false; updatePlayIcon(); });
audio.addEventListener('ended', () => { playing = false; updatePlayIcon(); });

function lockIn() {
  if (!guessMarker) return;
  audio.pause();
  const clip = deck[round];
  const guess = guessMarker.getLatLng();
  const truth = { lat: clip.lat, lng: clip.lng };
  const km = Math.round(haversineKm(guess, truth));
  const pts = scoreFor(km, clip.r);
  total += pts;
  roundLog.push({ id: clip.id, label: clip.label, km, pts });

  truthMarker = L.marker(truth, { icon: pinIcon('#7ee08a') }).addTo(map);
  line = L.polyline([guess, truth], { color: '#ffb24d', weight: 2, dashArray: '6 8', opacity: 0.8 }).addTo(map);
  // keep the arc visible above the bottom sheet
  map.fitBounds(L.latLngBounds([guess, truth]), { paddingTopLeft: [60, 90], paddingBottomRight: [60, 300] });

  $('#revealLabel').textContent = clip.label;
  $('#revealStats').textContent = `${km.toLocaleString()} km away → +${pts.toLocaleString()} pts${pts === 5000 ? ' 🎯' : ''}`;
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

// ————— wire up —————
initMap();
$('#playArabic').onclick = () => startGame('arabic');
$('#playLangs').onclick = () => startGame('languages');
$('#playAccents').onclick = () => startGame('accents');
$('#playBtn').onclick = () => { if (playing) audio.pause(); else playClip(); };
$('#lockBtn').onclick = lockIn;
$('#nextBtn').onclick = advance;
$('#submitScore').onclick = submitScore;
$('#againSame').onclick = () => startGame(gameType);
$('#switchType').onclick = () => { clearRoundLayers(); map.fitBounds(WORLD); setView('pick'); };
$('#nickname').value = localStorage.getItem('ht_nick') || '';
