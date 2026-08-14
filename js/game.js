// HomeTongue — Pin It game engine
const $ = (s) => document.querySelector(s);
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const WORLD = [[-55, -170], [72, 190]];
const ROUNDS = 5;
const MIN_DECK = 10;   // clips a deck needs before it is worth playing twice
const LISTEN_BUDGET_S = 60; // seconds of actual listening per round — spend it in any number of plays
const CLIP_WINDOW_S = 20;

// A deck needs more clips than a game has rounds, or every game is the identical five
// clips in a different order — the second play spoils the first, and sharing it hands a
// friend a game whose answers you already know. MIN_DECK is the honest threshold: enough
// for a few genuinely different games. Below it the deck is not shown at all.
// A description names the SCOPE of a deck, never the places inside it. The old ones read
// "Lisbon to Rio, Luanda to Maputo", which handed a player four of the twelve Portuguese
// answers before they heard a sound. Naming the region tells them what they are signing up for
// without giving away a single pin.
const MODES = [
  { key: 'arabic', name: 'Arabic', desc: 'Across the Arab world' },
  { key: 'accents', name: 'English', desc: 'English wherever it is spoken' },
  { key: 'spanish', name: 'Spanish', desc: 'Spain and Latin America' },
  { key: 'french', name: 'French', desc: 'Europe, Canada and Africa' },
  { key: 'hindi-urdu', name: 'Hindi–Urdu', desc: 'Northern India and Pakistan' },
  { key: 'chinese', name: 'Chinese', desc: 'Mainland China, Taiwan and Hong Kong' },
  { key: 'portuguese', name: 'Portuguese', desc: 'Portugal, Brazil and Lusophone Africa' },
  { key: 'italian', name: 'Italian', desc: 'Across Italy and Italian Switzerland' },
  { key: 'german', name: 'German', desc: 'Germany, Austria and Switzerland' },
  { key: 'languages', name: 'World Languages', desc: 'Languages from every continent' },
];

let map, guessMarker = null, truthMarker = null, line = null, extraDots = [];
let gameType = null, deck = [], round = 0, total = 0, roundLog = [];
let gameToken = null;   // minted at game start; proves to the server the game took real time
let budgetLeft = LISTEN_BUDGET_S, playing = false, lastTickT = 0;

const audio = $('#clipAudio');
const media = window.HT.media(audio, 'ytMount');
const field = window.HT.contours();

// ————— map —————
function initMap() {
  // Leaflet is vendored and in the service-worker shell, so this should not happen — but it is
  // called at the top level, and an exception here kills every later line in the file, including
  // the deck picker. A dead page with a console error is the worst possible failure; say
  // something a person can act on instead.
  if (typeof L === 'undefined') {
    const grid = document.getElementById('typeGrid');
    if (grid) grid.innerHTML = '<p class="prompt-label">The map could not load. Check your connection and refresh.</p>';
    return;
  }
  const mapEl = document.getElementById('map');
  map = L.map('map', {
    zoomControl: false, attributionControl: true, worldCopyJump: true,
    minZoom: window.HT.minZoomFor(mapEl),   // one world, always filling the window
  });
  map.fitBounds(WORLD);
  window.HT.basemap(map);
  window.HT.keepMinZoom(map, mapEl);
  map.on('click', onMapClick);

  // A KEYBOARD PATH TO THE SAME PIN.
  //
  // map.on('click') was the only way to create a guess marker, and #lockBtn ships disabled so it
  // is not even in the tab order until a pin exists. That made the whole game unplayable without
  // a mouse or a touchscreen: you could tab to the play button, hear the clip, and then have no
  // way to answer. Leaflet's own keyboard handling pans and zooms but never drops anything.
  //
  // Enter or Space on the focused map drops the pin at the centre of the view, which is the
  // natural keyboard gesture: arrow keys already move the map under the crosshair.
  mapEl.addEventListener('keydown', (e) => {
    if ($('#dock').hidden) return;
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    onMapClick({ latlng: map.getCenter() });
    $('#pinHint').textContent = 'arrow keys move the map, Enter re-drops the pin, then lock it';
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { setTimeout(() => map.invalidateSize(), 60); return; }
    // Switching away must stop the voice. Two reasons beyond politeness: the listening budget
    // is charged against wall-clock time, so audio playing to nobody spends a round's 60
    // seconds; and the window bound used to rest on a 100ms timer that browsers throttle in
    // background tabs, which let a forgotten tab play on past the clip into the rest of the
    // source video.
    if (playing) media.pause();
  });
}

function onMapClick(e) {
  if ($('#dock').hidden) return; // only during guessing
  if (!guessMarker) {
    guessMarker = L.marker(e.latlng, { draggable: true, icon: pinIcon(window.HT.ink()) }).addTo(map);
    $('#lockBtn').disabled = false;
    $('#pinHint').textContent = 'drag the pin to adjust, then lock it';
  } else {
    guessMarker.setLatLng(e.latlng);
  }
}

function pinIcon(color) {
  return L.divIcon({
    className: 'pin-wrap',
    // survey marker: a stem with a ringed head, closer to a map annotation than a balloon
    html: `<svg width="26" height="34" viewBox="0 0 26 34"><line x1="13" y1="12" x2="13" y2="33" stroke="${color}" stroke-width="1.5"/><circle cx="13" cy="9" r="7" fill="${token('--sheet')}" stroke="${color}" stroke-width="2.5"/><circle cx="13" cy="9" r="2.5" fill="${color}"/></svg>`,
    iconSize: [26, 34], iconAnchor: [13, 33],
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

// Decay tuned per deck: tight where the deck sits inside one country, loose where a deck
// spans continents. Halved across the board so top scores are scarce enough to be worth
// prizes: a 300 km miss in the Arabic deck used to keep 55% of the points and now keeps 30%.
// The bull's-eye stays tied to each clip's label precision, so label imprecision never costs
// points.
//
// EVERY KEY IN MODES MUST APPEAR HERE. A deck with no entry falls through to the 1200 km
// default and is silently five times more forgiving than intended — which is exactly what
// happened to Hindi and Urdu the moment they were split out of the old 'hindi-urdu' key.
// The assertion below turns that class of mistake into a console error instead of a scoring
// bug nobody notices.
const MODE_DECAY = {
  arabic: 250, accents: 450, french: 350, spanish: 450, portuguese: 450, chinese: 350,
  // One spoken language across two countries, and the deck labels cities, so it keeps the
  // tight city-scale curve the split decks each had.
  'hindi-urdu': 250,
  // Italy and the German-speaking countries are compact, so the cities sit close together and
  // the varieties are nearer neighbours than Casablanca and Basra. A little more room than
  // Arabic, still tight enough that guessing the right country is not the same as pinning it.
  italian: 300, german: 300,
  // World Languages asks a different question: the answer is a language, and its clips are
  // pinned at country centres rather than a speaker's hometown. Scoring it as tightly as a city
  // deck would punish a correct answer for the arbitrariness of where a country's centre falls.
  languages: 750,
};

// SHIP WHAT WORKS.
//
// A deck below MIN_DECK used to render as a greyed tile captioned "stocking clips". Two of those
// on the choice screen is the difference between a product and a building site: it advertises
// doors that do not open, and it invites the reader to judge what is missing rather than play
// what is there. A deck simply does not appear until it can be played, and reappears on its own
// the moment it crosses the threshold — no flag to remember, no special case to remove later.
const playableModes = () => MODES.filter((m) => (((window.CLIPS || {})[m.key]) || []).length >= MIN_DECK);

// A deck with no decay entry scores wrong and looks fine, so say so loudly at load.
for (const m of MODES) {
  if (!MODE_DECAY[m.key]) console.error(`MODE_DECAY has no entry for deck "${m.key}" — it will score with the default and be far too forgiving.`);
}

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
  $('#boardsCard').hidden = v !== 'boards';
  $('#finalCard').hidden = v !== 'final';
  $('#roundPill').hidden = v !== 'round' && v !== 'reveal';
  $('#dock').hidden = v !== 'round';
  $('#sheet').hidden = v !== 'reveal';
}

// ————— game flow —————
function startGame(type) {
  const pool = (window.CLIPS && window.CLIPS[type]) || [];
  if (pool.length < MIN_DECK) {
    toast('This mode is still being stocked with clips. Try another one!');
    return;
  }
  gameType = type;
  deck = dealDeck(pool);
  round = 0; total = 0; roundLog = [];
  gameToken = null;
  // One dropped fetch here used to make the whole game unpostable (the server needs a token
  // aged >=75s, so re-minting at submit time is always 'too fast'). Three spaced attempts:
  // a mint that lands even 30s into a game is old enough by the time anyone finishes.
  const mint = (attempt) => fetch('/api/scores?start=1')
    .then((r) => r.json()).then((d) => { gameToken = d.token || null; if (!gameToken) throw new Error('no token'); })
    .catch(() => { if (attempt < 3) setTimeout(() => mint(attempt + 1), attempt * 12_000 + 3_000); });
  mint(1);
  warmClip(0);
  nextRound();
}

// Any five clips from the deck, at random.
//
// This used to deal one clip per COUNTRY first and only draw again once countries ran out, with
// each country's clips sorted so spontaneous ones came first. On paper that guaranteed variety.
// In practice it silently made whole decks unreachable: Portuguese has exactly five countries
// and a game is five rounds, so the one-per-country pass filled every round and the second loop
// never ran. Seven of its twelve clips could never be dealt, and because the sort inside each
// country was deterministic, every single game was the identical five recordings in a shuffled
// order. English Accents lost eight of twenty-two the same way.
//
// A deck is a bag of clips; a game is five of them. Anything cleverer than that has to earn its
// place, and that one did not. The only rule kept is that one game never asks the same place
// twice, since two identical answers in five rounds reads as a bug rather than a coincidence -
// and if a deck is too thin to avoid it, it falls back to filling the round rather than dealing
// short.
function dealDeck(pool) {
  // Keyed on the ANSWER PIN, not the label. Two clips can carry different labels and the very
  // same coordinates — Spanish has "Buenos Aires, Argentina" and "Argentina" both at the same
  // point, Hindi-Urdu has "Delhi, India" and "Delhi–Meerut Region, India" — so a label-based
  // guard let a game show two rounds whose correct answer was the identical spot on the map.
  // From the player's side that is the same question twice.
  const placeOf = (c) => `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
  const bag = shuffle(pool);
  const out = [];
  const used = new Set();
  for (const c of bag) {
    if (out.length >= ROUNDS) break;
    if (used.has(placeOf(c))) continue;
    used.add(placeOf(c));
    out.push(c);
  }
  // a deck with fewer distinct places than rounds still gets a full game
  for (const c of bag) {
    if (out.length >= ROUNDS) break;
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

// Warm the browser HTTP cache for small clips (SAA's server is slow cold) —
// big spoken-article files stream fine on demand, so skip them.
// WARM ONE CLIP, NOT FIVE.
//
// This used to fetch every clip in the deck the instant a deck was tapped, guarded by
// `clip.size <= 3_000_000` with a comment about skipping big spoken-article files. The guard
// never skipped anything: the largest file in the whole project is 1.83 MB, so every one of the
// 111 local clips passed. A World Languages game pulled about 7.6 MB before round one made a
// sound, Chinese 7.9 MB — on mobile data, which is where a TikTok audience arrives.
//
// Only the clip that is about to play is warmed. The next one is warmed during the reveal, when
// the player is reading the answer and the network is idle anyway, so it is ready before they
// press "next clip" without anyone paying for four clips they may never reach.
function warmClip(i) {
  const clip = deck[i];
  if (!clip || clip.kind === 'yt' || !clip.url) return;
  fetch(clip.url, { mode: 'no-cors' }).catch(() => {});
}

function fmtBudget() {
  const s = Math.ceil(budgetLeft);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} of listening left`;
}

function nextRound() {
  clearRoundLayers();
  map.fitBounds(WORLD);
  media.clear();
  budgetLeft = LISTEN_BUDGET_S;
  playing = false;
  lastTickT = 0;
  clipSwaps = 0;
  advanceFrom = -1;
  $('#roundNum').textContent = `Round ${round + 1}/${ROUNDS}`;
  $('#scoreSoFar').textContent = `${total.toLocaleString()} pts`;
  $('#listens').textContent = fmtBudget();
  $('#playerFill').style.width = '0%';
  // the fill resets here but the thumb kept last round's position, so every fresh round
  // opened with the scrubber head sitting at the far right of an empty bar
  $('#playerThumb').style.left = '0%';
  $('#playBtn').disabled = false;
  $('#lockBtn').disabled = true;
  $('#pinHint').textContent = 'listen, then tap the map to drop your pin';
  const era = $('#eraChip');
  const y = deck[round].year;
  era.hidden = !(y && y < 1990);
  if (!era.hidden) era.textContent = `archival recording · ${y} · accents move`;
  setView('round');
  media.load(deck[round], CLIP_WINDOW_S); // preload now so play starts instantly on tap
}

// The playable region is a fixed CLIP_WINDOW_S slice starting at _offset —
// curated (clip.start, skips location-revealing intros) or random for long recordings.
function ensureOffset(clip) {
  if (clip._offset !== undefined) return;
  if (clip.start !== undefined) {
    clip._offset = clip.start;
  } else {
    const dur = media.duration();
    clip._offset = (dur && isFinite(dur) && dur > 90)
      ? Math.min(15 + Math.random() * dur * 0.4, dur - 30)
      : 0;
  }
}

// A dead clip now reaches the rescue instead of nothing. Registered once, at load.
media.on('error', () => {
  // Only meaningful while a round is on screen; an error after the reveal is not the player's
  // problem to solve.
  if ($('#dock') && !$('#dock').hidden) rescueClip('That clip is no longer available, so I swapped it for you.');
});

function playClip() {
  if (playing || budgetLeft <= 0) return;
  const clip = deck[round];
  if (!media.ready()) {
    toast('Clip is loading, one sec…');
    media.whenReady(playClip);
    // whenReady is a one-shot 'loadedmetadata' listener, and a file that fails to load never
    // fires it — so without a deadline the round waits forever on that toast. If it has not
    // become playable in six seconds, treat it as broken rather than as slow.
    const stuckRound = round;
    setTimeout(() => {
      if (round === stuckRound && !media.ready() && $('#dock') && !$('#dock').hidden) {
        rescueClip('That clip would not load, so I swapped it for you.');
      }
    }, 6000);
    return;
  }
  ensureOffset(clip);
  // resume where the scrubber sits; rewind only if outside the window or at its end
  if (media.time() < clip._offset || media.time() >= clip._offset + CLIP_WINDOW_S - 0.3) {
    media.seek(clip._offset);
  }
  media.play().then(() => {
    playing = true;
    lastTickT = media.time();
  }).catch((e) => {
    playing = false;
    if (e && e.name === 'NotAllowedError') {
      toast('Tap ▶ once more to start the sound.');
    } else {
      rescueClip('That clip refused to play, so I swapped it for you.');
    }
  });
}

// ONE RESCUE, REACHABLE FROM EVERY WAY A CLIP CAN DIE.
//
// This logic used to live only inside media.play()'s rejection handler, which is unreachable for
// the two failures that actually happen in the wild: a YouTube video that has been removed,
// made private or had embedding switched off (play() resolves regardless, so the game believed
// it was playing silence), and a local file that 404s or fails to decode (it fires 'error', not
// 'loadedmetadata', so whenReady waited forever and the round sat on "Clip is loading, one sec…"
// with no retry). Both now land here.
function rescueClip(why) {
  if (rescuing) return;
  if (clipSwaps >= 2) {
    // A pool this broken is not going to fix itself on a third try.
    toast('The audio is stuck this round. Lock a guess and carry on.');
    return;
  }
  rescuing = true;
  clipSwaps += 1;
  playing = false;
  toast(why || 'That clip would not play, so I swapped it for you.');
  const swapRound = round;
  deck[round] = replacementClip();
  media.clear();
  media.load(deck[round], CLIP_WINDOW_S);
  setTimeout(() => {
    rescuing = false;
    // The reveal or the next round may have arrived while the replacement loaded; playing then
    // would start a clip for a round nobody is on any more.
    if (round === swapRound && $('#dock') && !$('#dock').hidden) playClip();
  }, 450);
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

// While dragging, the bar follows the pointer directly (dragFrac) instead of waiting for the
// audio element to finish seeking — otherwise the thumb visibly trails your finger.
let dragFrac = null;
let rafId = 0;

function updateFill() {
  const clip = deck[round];
  if (!clip || clip._offset === undefined) return;
  const elapsed = dragFrac !== null ? dragFrac * CLIP_WINDOW_S : media.time() - clip._offset;
  const pct = Math.min(100, Math.max(0, elapsed / CLIP_WINDOW_S) * 100);
  $('#playerFill').style.width = `${pct}%`;
  $('#playerThumb').style.left = `${pct}%`;
  $('#playerBar').setAttribute('aria-valuenow', Math.round(Math.max(0, elapsed)));
}

// timeupdate only fires ~4x/second, which looks steppy. Paint on every frame instead.
function startRaf() {
  if (rafId) return;
  const tick = () => {
    updateFill();
    rafId = (playing || dragFrac !== null) ? requestAnimationFrame(tick) : 0;
  };
  rafId = requestAnimationFrame(tick);
}
function stopRaf() {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = 0;
  updateFill();
}

// Seeks are queued, never stacked: a fresh drag position replaces the pending one instead of
// asking the audio element for a dozen seeks it has to service one by one. State comes from
// audio.seeking rather than our own flag — seeking to where the clip already is fires no
// 'seeked' event, so a hand-rolled flag gets stuck true and silently breaks everything after it.
let seekPending = null;
function seekTo(t) {
  if (media.seeking()) { seekPending = t; return; }
  seekPending = null;
  // Move the budget baseline BEFORE the element's clock jumps. Otherwise the timeupdate that
  // follows sees a jump it can't distinguish from playback and charges you for scrubbing.
  lastTickT = t;
  media.seek(t);
}
function flushSeek() {
  if (seekPending !== null && !media.seeking()) { const t = seekPending; seekPending = null; seekTo(t); }
}
media.on('seeked', () => {
  lastTickT = media.time();
  flushSeek();
  updateFill();
});

// Nudge the playhead within the window; used by the ±5s buttons and arrow keys.
function seekBy(delta) {
  const clip = deck[round];
  if (!clip || !media.ready()) return;
  ensureOffset(clip);
  const max = clip._offset + CLIP_WINDOW_S - 0.2;
  seekTo(Math.min(max, Math.max(clip._offset, media.time() + delta)));
  updateFill();
}

media.on('timeupdate', () => {
  const clip = deck[round];
  if (!clip || clip._offset === undefined) return;
  updateFill();
  if (!playing) return;
  if (media.seeking()) { lastTickT = media.time(); flushSeek(); return; } // mid-seek: free
  flushSeek();
  // the timer only burns while sound is actually playing; seeks don't cost anything
  const delta = media.time() - lastTickT;
  if (delta > 0 && delta < 1.5) {
    budgetLeft = Math.max(0, budgetLeft - delta);
    $('#listens').textContent = fmtBudget();
  }
  lastTickT = media.time();
  if (media.time() - clip._offset >= CLIP_WINDOW_S) { media.pause(); return; }
  if (budgetLeft <= 0) {
    media.pause();
    $('#playBtn').disabled = true;
    $('#listens').textContent = 'listening time up. Trust your ear, drop the pin';
  }
});
media.on('play', () => {
  updatePlayIcon(); startRaf();
  const b = $('#playBtn').getBoundingClientRect();
  field.pulse(b.left + b.width / 2, b.top + b.height / 2, 1);
});
media.on('pause', () => { playing = false; updatePlayIcon(); stopRaf(); });
media.on('ended', () => { playing = false; updatePlayIcon(); stopRaf(); });

// ————— scrubber: tap or drag anywhere on the bar to move inside the playable window —————
const playerBar = $('#playerBar');
let scrubbing = false;
function scrubTo(clientX) {
  const clip = deck[round];
  if (!clip || !media.ready()) return;
  ensureOffset(clip);
  const rect = playerBar.getBoundingClientRect();
  if (!rect.width) return;
  const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  dragFrac = frac;          // paint here immediately
  updateFill();
  const d = media.duration();
  const windowLen = Math.min(CLIP_WINDOW_S, (isFinite(d) ? d : Infinity) - clip._offset);
  const target = clip._offset + frac * Math.max(0, windowLen - 0.1);
  if (isFinite(target)) seekTo(target); // audio catches up on its own schedule
}
playerBar.addEventListener('pointerdown', (e) => {
  scrubbing = true;
  playerBar.classList.add('dragging');
  try { playerBar.setPointerCapture(e.pointerId); } catch { /* capture is a nicety, seeking is the point */ }
  scrubTo(e.clientX);
  startRaf(); // keep painting every frame for the whole drag, playing or not
});
playerBar.addEventListener('pointermove', (e) => { if (scrubbing) scrubTo(e.clientX); });
const endScrub = () => {
  if (!scrubbing) return;
  scrubbing = false;
  playerBar.classList.remove('dragging');
  // hand the bar back to the audio clock once the last seek has actually landed
  const release = () => { dragFrac = null; updateFill(); };
  if (media.seeking() || seekPending !== null) media.on('seeked', release, true);
  else release();
};
playerBar.addEventListener('pointerup', endScrub);
playerBar.addEventListener('pointercancel', endScrub);
playerBar.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { seekBy(-2); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { seekBy(2); e.preventDefault(); }
});

// Whole-page shortcuts: space toggles play, arrows nudge — as long as you're not typing a nickname.
document.addEventListener('keydown', (e) => {
  if ($('#dock').hidden || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); if (playing) media.pause(); else playClip(); }
  else if (e.key === 'ArrowLeft' && document.activeElement !== playerBar) { e.preventDefault(); seekBy(-5); }
  else if (e.key === 'ArrowRight' && document.activeElement !== playerBar) { e.preventDefault(); seekBy(5); }
});

function lockIn() {
  if (!guessMarker) return;
  // One score per round. The dock hides on reveal so a user can't normally click lock twice,
  // but a double-tap racing the view switch (or anything scripted) could land a second call:
  // that logged round five twice, made a six-row final in a five-round game, and the summed
  // total then failed the server's sum-equals-points check, so the score never posted. The
  // leaderboard 'failure' was really this.
  if (roundLog.length > round) return;
  media.pause();
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
  truthMarker = L.marker(truth, { icon: pinIcon(window.HT.amber()) }).addTo(map);
  for (const c of centers) {
    if (c === best) continue;
    extraDots.push(L.circleMarker([c.lat, c.lng], { radius: 6, color: window.HT.amber(), weight: 2, fillColor: window.HT.amber(), fillOpacity: 0.2 })
      .addTo(map).bindTooltip(c.name));
  }
  line = L.polyline([guess, truth], { color: token('--black-2'), weight: 1.5, dashArray: '4 6', opacity: 0.5 }).addTo(map);
  // keep the arc visible above the bottom sheet
  map.fitBounds(L.latLngBounds([guess, truth]), { paddingTopLeft: [60, 90], paddingBottomRight: [60, 300] });

  $('#revealLabel').textContent = clip.label;
  const altNote = best.primary ? '' : ` · scored to ${best.name}, ${clip.lang} lives there too`;
  $('#revealStats').textContent = `${km.toLocaleString()} km away → +${pts.toLocaleString()} pts${pts === 5000 ? ' 🎯' : ''}${altNote}`;
  $('#revealHint').textContent = clip.hint || '';
  resetClipFlag();
  renderSource(clip.source, clip.year);
  $('#nextBtn').textContent = round === ROUNDS - 1 ? 'see final score' : 'next clip';
  // This reveal belongs to this round, and only this round may advance from it. The second half
  // of the double-tap fix: advance() checks against this, so a repeated tap has nothing to match.
  advanceFrom = round;
  setView('reveal');
  // The player is reading the answer; fetch the next clip now so "next clip" is instant.
  warmClip(round + 1);
}

// Credits people can actually read: who recorded it, where it lives, the licence, and a way in.
function renderSource(src = {}, year) {
  const rows = [['#srcWho', src.who], ['#srcHost', src.host], ['#srcYear', year ? String(year) : ''], ['#srcLicense', src.license]];
  for (const [sel, val] of rows) {
    const el = $(sel);
    el.textContent = val || '—';
    el.parentElement.hidden = !val;
  }
  if (src.note) {
    $('#srcLicense').textContent = `${src.license || '—'} · ${src.note}`;
    $('#srcLicense').parentElement.hidden = false;
  }
  const link = $('#srcLink');
  link.hidden = !src.page;
  if (src.page) link.href = src.page;
}

function advance() {
  // A DOUBLED "next clip" TAP USED TO SKIP A ROUND OUTRIGHT, AND THE GUARD ADDED FOR IT NEVER
  // FIRED. The lock was set here and cleared inside nextRound(), which advance() calls
  // synchronously — so it was released before advance() had even returned, and its lifetime was
  // zero for every round but the last. A 180ms double-tap, which is just a normal phone tap
  // registering twice, still advanced twice: the game then ended after four scored rounds and
  // the server's sum check rejected the submission, so the run was unpostable.
  //
  // Keyed to the round it was called for instead of a flag someone else owns. A second tap
  // belongs to a round that has already moved on, so it is ignored no matter who resets what.
  if (round !== advanceFrom) return;
  advanceFrom = -1;
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
      body: JSON.stringify({ nickname, game_type: gameType, points: total, token: gameToken, rounds: roundLog.map((r) => ({ id: r.id, km: r.km, pts: r.pts })) }),
    });
    const d = await resp.json();
    if (!d.ok) throw new Error(d.error);
    const deckName = (MODES.find((m) => m.key === gameType) || {}).name || gameType;
    toast(`Posted! You're #${d.rank} on ${deckName}.`);
    await loadBoard();
  } catch (e) {
    // "score saved locally" was a false claim — nothing persisted the score. Say what is true.
    const msg = e.message === 'not_configured' ? 'Leaderboard isn\'t set up yet, so your score didn\'t post.'
      : (e.message === 'too_fast' || e.message === 'invalid_token') ? 'Scores only post for a full game, start to finish. Play one through and try again.'
        : 'Couldn\'t post the score. But you played it, that\'s what counts.';
    toast(msg);
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


// A deck's identity is its geography, not a flag — Arabic spans 17 countries and
// English 15, so one flag would misrepresent every deck. Instead each row carries a
// tiny equirectangular plot of where its own clips actually come from: Arabic reads as
// a tight cluster, World Languages as scatter across the whole frame.
function deckThumb(clips, hue) {
  const W = 52, H = 30;
  const dots = clips.map((c) => {
    const x = ((c.lng + 180) / 360) * W, y = ((90 - c.lat) / 180) * H;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7" fill="${hue}"/>`;
  }).join('');
  return `<svg class="deck-thumb" viewBox="0 0 ${W} ${H}" aria-hidden="true">`
    + `<path d="${window.HT_WORLD || ''}" fill="currentColor" opacity="0.22"/>`
    + `<g opacity="0.9">${dots}</g></svg>`;
}

function renderModeCards() {
  const grid = $('#typeGrid');
  grid.innerHTML = '';
  for (const m of playableModes()) {
    const pool = (window.CLIPS && window.CLIPS[m.key]) || [];
    const b = document.createElement('button');
    b.className = 'type-btn';
    const hue = getComputedStyle(document.documentElement).getPropertyValue(`--hue-${m.key}`).trim() || '#2A6B60';
    b.innerHTML = `<span class="deck-mark">${deckThumb(pool, hue)}</span>`
      + `<span class="type-name">${m.name}</span><span class="type-desc">${m.desc}</span>`;
    b.dataset.deck = m.key;
    // No title attribute. The description used to be hidden and shown only as a native browser
    // tooltip, which is why hovering a deck produced a bare grey box of sentence-cased text with
    // no styling. The description is visible on the tile now, so a tooltip would only repeat it.
    b.onclick = (e) => {
      window.HT.setDeck(m.key, { x: e.clientX, y: e.clientY });
      startGame(m.key);
    };
    grid.appendChild(b);
  }

  // The card header used to read "nine decks" as static HTML that nothing ever updated, so it
  // stayed at nine through every deck added or removed and was wrong the moment the list
  // changed. It counts what is on screen, which is now the same thing as what is playable.
  const ready = MODES.filter((m) => ((window.CLIPS && window.CLIPS[m.key]) || []).length >= MIN_DECK).length;
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const el = $('#deckCount');
  if (el) el.textContent = `${WORDS[ready] || ready} deck${ready === 1 ? '' : 's'}`;
}

// ————— flagging a bad clip —————
// One report per round. The chips are the reasons a listener can actually judge; the gate
// already screened for silence and noise, so this catches what only an ear can catch.
// Every UI mutation after an await re-checks that the same reveal is still on screen: a slow
// send racing "next clip" used to mark the NEXT round as flagged, hide its chips, pop the
// keyboard mid-round, and attribute a typed note to the previous clip.
let flagClip = null;   // the clip the open thanks-row belongs to

function resetClipFlag() {
  flagClip = null;
  $('#flagQ').hidden = false;
  $('#flagThanks').hidden = true;
  $('#flagChips').hidden = false;
  $('#flagNote').value = '';
  $('#flagNote').hidden = false;
  $('#flagNoteSend').hidden = false;
  $('#flagNoteSend').disabled = false;
  for (const b of document.querySelectorAll('#flagChips .flag-chip')) b.disabled = false;
}

async function sendClipReport(body) {
  try {
    const r = await fetch('/api/clip-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // a dangling fetch on flaky mobile once left the send button dead for the whole game
      signal: AbortSignal.timeout(8000),
    });
    return (await r.json()).ok === true;
  } catch { return false; }
}

for (const btn of document.querySelectorAll('#flagChips .flag-chip')) {
  btn.onclick = async () => {
    const clip = deck[round];
    if (!clip) return;
    for (const b of document.querySelectorAll('#flagChips .flag-chip')) b.disabled = true;
    const last = roundLog[roundLog.length - 1] || {};
    const ok = await sendClipReport({ clip_id: clip.id, deck: gameType, label: clip.label, reason: btn.dataset.reason, km: last.km });
    if (deck[round] !== clip) return; // the reveal moved on; the report is stored, say nothing
    if (ok) {
      flagClip = clip;
      $('#flagChips').hidden = true;
      $('#flagThanks').hidden = false;
      // no autofocus: summoning a phone keyboard for an optional field is hostile
    } else {
      toast("Couldn't send that right now.");
      for (const b of document.querySelectorAll('#flagChips .flag-chip')) b.disabled = false;
    }
  };
}

async function sendFlagNote() {
  const note = $('#flagNote').value.trim();
  const clip = flagClip;
  if (!clip) return;
  if (!note) { $('#flagNote').hidden = true; $('#flagNoteSend').hidden = true; return; }
  $('#flagNoteSend').disabled = true;
  const ok = await sendClipReport({ clip_id: clip.id, deck: gameType, note });
  if (flagClip !== clip) return; // reveal moved on mid-flight
  $('#flagNoteSend').disabled = false;
  if (ok) {
    toast('Got it.');
    // keep the "noted" line, retire the input: no dangling header, no dead controls
    $('#flagNote').hidden = true;
    $('#flagNoteSend').hidden = true;
  } else {
    toast("Couldn't send that right now.");
  }
}
$('#flagNoteSend').onclick = sendFlagNote;
$('#flagNote').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendFlagNote(); } });

// ————— standing leaderboards —————
// One deck at a time, tabs across the top. Fetches on open and on tab change; a deck with no
// scores says so instead of rendering an empty box.
let boardDeck = null;

let clipSwaps = 0;
let rescuing = false;   // guards against a swap storm when several failures fire at once
let advanceFrom = -1;   // the round the visible reveal belongs to; only that round may advance
let boardsGen = 0;

async function showBoards(deckKey) {
  boardDeck = deckKey || boardDeck || 'arabic';
  if (playing) media.pause(); // jumping to boards mid-round must not leave a voice talking
  const gen = ++boardsGen;    // slow fetch for a previous tab must not paint this one
  setView('boards');
  const tabs = $('#boardTabs');
  tabs.innerHTML = '';
  for (const m of playableModes()) {
    const b = document.createElement('button');
    b.className = 'board-tab' + (m.key === boardDeck ? ' active' : '');
    // The deck's own hue, which is what the picker uses to tell nine decks apart. The language
    // code lives there too, but there it sits beside a map thumbnail as an index mark; here the
    // deck's full name is on the same line, so "AR" under "Arabic Dialects" is the same fact
    // twice, and "ZH · YUE" is jargon. Colour carries the identity, the name carries the label.
    b.dataset.deck = m.key;
    b.textContent = m.name;
    b.onclick = () => showBoards(m.key);
    tabs.appendChild(b);
  }
  const ol = $('#boardsList');
  ol.innerHTML = '';
  const hue = getComputedStyle(document.documentElement).getPropertyValue(`--hue-${boardDeck}`).trim();
  $('#boardsPanel').style.setProperty('--row', hue || 'var(--accent)');
  $('#boardsEmpty').hidden = true;
  try {
    const d = await (await fetch(`/api/scores?game_type=${boardDeck}`)).json();
    if (gen !== boardsGen) return; // user already switched tabs; this response is history
    const rows = (d.ok && d.top) || [];
    const deckName = (MODES.find((m) => m.key === boardDeck) || {}).name || 'this deck';
    if (!rows.length) {
      $('#boardsEmpty').hidden = false;
      $('#boardsEmpty').innerHTML = `<b>Nobody has played ${escapeHtml(deckName)} yet.</b><span>the first score here is the top score</span>`;
      return;
    }
    // Each row carries its share of the leader's score as a hairline bar, so the ranking reads
    // at a glance rather than as a column of numbers to compare by eye.
    const best = Math.max(...rows.map((r) => +r.points || 0)) || 1;
    for (const [i, row] of rows.entries()) {
      const li = document.createElement('li');
      if (i < 3) li.className = 'top';
      li.style.setProperty('--share', `${Math.max(4, Math.round((+row.points / best) * 100))}%`);
      li.innerHTML = `<span>${escapeHtml(row.nickname)}</span><b>${(+row.points).toLocaleString()}</b>`;
      ol.appendChild(li);
    }
  } catch {
    if (gen !== boardsGen) return;
    $('#boardsEmpty').hidden = false;
    $('#boardsEmpty').textContent = "couldn't reach the leaderboard. try again in a moment.";
  }
}

// ————— wire up —————
initMap();
renderModeCards();
$('#playBtn').onclick = () => { if (playing) media.pause(); else playClip(); };
$('#backBtn').onclick = () => seekBy(-5);
$('#fwdBtn').onclick = () => seekBy(5);
$('#lockBtn').onclick = lockIn;
$('#nextBtn').onclick = advance;
$('#submitScore').onclick = submitScore;
$('#againSame').onclick = () => startGame(gameType);
$('#switchType').onclick = () => { clearRoundLayers(); map.fitBounds(WORLD); window.HT.setDeck(null); setView('pick'); };
// one-time cleanup: leaderboard testing during the Aug 8 production sweep saved its test
// nickname on whatever device ran it; devices carrying it self-clean here
if (localStorage.getItem('ht_nick') === 'sweep bot') localStorage.removeItem('ht_nick');
$('#nickname').value = localStorage.getItem('ht_nick') || '';
$('#boardsBtn').onclick = () => showBoards();
$('#boardsBack').onclick = () => { history.replaceState(null, '', location.pathname); setView('pick'); };
// The nav tab links here as /game.html#boards, from either page.
if (location.hash === '#boards') showBoards();
window.addEventListener('hashchange', () => { if (location.hash === '#boards') showBoards(); });
