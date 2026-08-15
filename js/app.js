// HomeTongue — app logic: recording, server analysis, map, results
const $ = (s) => document.querySelector(s);

const HOME_BOUNDS = [[-50, -140], [65, 160]]; // the whole inhabited world
// 60s, with a prominent "done" button so nobody has to wait it out.
// What is measured: on 24 clips, accuracy climbs monotonically with length — 8s scores 345 km,
// 12s and 20s 157 km, 30s 67 km — and latency barely moves across that range (6.2s to 11.8s)
// because the wait is model inference, not upload. Nothing in that curve has flattened, so
// there is no evidence 30s is the ceiling, and a sweep of 20/30/45/60 on the 54 clips long
// enough to hold it is what decides whether longer keeps helping.
// This was briefly capped at 35s on the reasoning that the benchmark clips are ~30s so nothing
// past that was tested. Mohammad's call to put it back: a cap that truncates someone
// mid-sentence costs accuracy for certain, while a longer cap only costs time, and only for
// people who choose not to press done.
const MAX_SECONDS = 60;
let map, marker, glow;
let state = 'idle';
let mediaStream = null, recorder = null, chunks = [], recMime = '';
let audioCtx = null, analyser = null, rafId = null, meterLoop = null, meterStream = null;
let timerId = null, startedAt = 0;
let micPeak = -1; // loudest rolling level seen this recording; -1 = meter unavailable
// Peak alone cannot tell speech from a door slam. A single cough clears a peak threshold and
// a whole recording of room tone then goes to the model, which answered one silent file with
// "Toronto, 75%, Canadian raising on 'night'" — invented phonetic evidence for audio that had
// none. Counting how many frames actually carried voice-level energy catches that case.
let micFrames = 0, micVoiced = 0;
const VOICE_LEVEL = 0.05;   // mean spectral level that ordinary speech clears
const MIN_VOICED_S = 1.5;   // a mic that heard essentially nothing at all
// THERE IS A CLIFF, AND IT ENDS AT TWENTY SECONDS. Measured twice, the second time in a
// clean room after a first pass over-read it. Same speakers truncated to each length, fully
// paired, 18 clips, every arm answering on every clip:
//
//     12s   166 km median    50% within 100 km    5 misses over 1000 km
//     20s    40 km           67%                  2
//     30s     6 km           72%                  2
//     45s     2 km           67%                  2
//
// Read the PAIRED counts, not the medians - medians on 18 clips with a heavy tail move for
// reasons that have nothing to do with the treatment:
//
//     12s vs 20s   20s better on 7, worse on 1, tied 10   <- the only comparison with support
//     20s vs 30s   30s better on 2, worse on 1, tied 15   <- UNDETERMINED, see below
//     30s vs 45s   45s better on 2, worse on 3, tied 13   <- UNDETERMINED, see below
//
// BE HONEST ABOUT WHAT THE TOP OF THAT TABLE IS AND IS NOT. A hostile review of it found that
// "no difference above 20s" is not a result, it is a blind instrument reporting nothing:
//   - with only 2 or 3 clips ever moving between adjacent arms, the sign test's FLOOR is
//     p=0.5 for 30-vs-45. It could not have returned significance under any outcome.
//   - a second run of the same question, on eight clips whose audio files are sha256-identical
//     between the two harnesses, REVERSED the ordering: one run has 20->30 buying 124 km, the
//     other has it costing 130 km.
//   - a same-bytes repeat control answered 22 km one call and 58 km the next, and on one clip
//     gave Maputo then Luanda, 2792 km apart, from one file at temperature 0.
// So: 12s is genuinely worse than 20s, and whether 30 or 45 beats 20 is simply NOT KNOWN.
// Answering it needs far more clips and a repeat control on every one, because per-call noise
// is larger than the effect being hunted.
//
// The floor therefore sits at 20, where the evidence is. Nothing above it is claimed in either
// direction: no target, and no promise that stopping at 20 costs you anything. An earlier
// version pushed people to thirty with a button reading "10s more reads far sharper", which
// was invented from a first pass of 7-9 clips per arm with unequal clip sets between arms.
// THREE NUMBERS, because the measurement has three shelves in it and one gate.
//
//   data/length-latency.json (24 clips)   8s 345 km | 12s 157 | 20s 157 | 30s 67
//   data/length-sweep.json   (27 clips)               20s 317 | 30s  72 | 45s 90 | 60s 85
//
//   dur   median   within 100 km   over 1000 km
//   20s    317 km       44%            11%
//   30s     72 km       52%             7%
//   45s     72 km       56%             7%
//   60s     72 km       59%             4%
//
// MIN is the GATE: below it the take is too thin to submit at all. It sat at 20 on the strength
// of numbers that appear in no data file, moved to 30 when that was caught, and is back at 20 as
// Mohammad's call — thirty seconds is a long time to hold a stranger who found this on TikTok,
// and a floor nobody reaches protects an accuracy nobody gets.
//
// That trade is only safe because of GOOD. The 20->30 step is the largest single gain anywhere
// in this dataset — the median miss falls from 317 km to 72 — so the ten seconds after the gate
// are worth more than any other ten in the recording. The meter spends them saying so, at the
// exact moment someone is deciding whether to stop. Beyond GOOD the gains are real but small
// (one clip in twenty-seven per step), so BEST only changes the wording, never the pressure.
// One entry per measurement in data/length-sweep.json, which is why there are four dots and not
// a number someone liked the look of. `at` is the second it is earned, `word` names the tier.
// EACH LINE POINTS FORWARD, at what the next ten seconds buy, rather than naming the rung you
// are standing on. "rough / good / sharp" described where you WERE, which is a verdict on the
// take you already have and gives nobody a reason to keep going.
//
// The first one is the loud one because the measurement is loud there. 20s -> 30s is the largest
// single move anywhere in this data: the median miss falls from 317 km to 72, and the share of
// answers landing within 100 km goes 44% -> 52%. Every later step is worth roughly one clip in
// twenty-seven, so those lines invite quietly. The wording tracks the effect size on purpose —
// "a big jump" where the number is big, "keeps sharpening" where it is small.
const TIERS = [
  { at: 20, word: '10 more seconds, much closer guess' },  // 44% within 100 km — the floor
  { at: 30, word: 'keep going, it gets closer' }, // 52%
  { at: 45, word: 'almost as close as it gets' },     // 56%
  // The evidence for this one is the 60s row (59%), but 60s is the CAP: a tier set there lights
  // its dot on the same tick that stopListening() fires, so nobody would ever see it earned. That
  // is the identical bug the original three-dot meter shipped with — a rung that cannot be
  // reached — and it is not worth repeating for five seconds of precision that no measurement
  // could resolve anyway. Derived from the cap so it follows if the cap ever moves.
  { at: MAX_SECONDS - 5, word: 'as close as it gets' },
];
const MIN_RECORD_S = TIERS[0].at;  // the gate is the first tier, by construction

// the survey red, read from the stylesheet so themes stay in one place
const MARK = () => window.HT.ink();
window.HT.setDeck('arabic');
const field = window.HT.contours();

// Country reference data, used only for the feedback picker now that the answer is a
// point rather than a country code.
const { COUNTRIES } = window.HT_PLACES;

// ————— map —————
function initMap() {
  // The zoom floor is a map OPTION, so fitBounds already respects it. Applying it afterwards
  // interrupted the tile fade and left the map invisible. Zooming out used to paint four
  // copies of Earth; the floor is computed from the window so one world always fills it.
  const mapEl = document.getElementById('map');
  map = L.map('map', {
    zoomControl: false, attributionControl: true, worldCopyJump: true,
    minZoom: window.HT.minZoomFor(mapEl),
  });
  map.fitBounds(HOME_BOUNDS);
  window.HT.basemap(map);
  window.HT.keepMinZoom(map, mapEl);

  // if the page loads in a background tab, Leaflet caches a 0x0 size — fix on reveal
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    setTimeout(() => {
      map.invalidateSize();
      if (map.getZoom() < 2 && state !== 'result') map.fitBounds(HOME_BOUNDS);
    }, 60);
  });
}

function ensureMapReady() {
  if (map.getSize().x === 0) map.invalidateSize();
}

let dropTimer = null, dropFn = null;
function clearMapExtras() {
  if (dropTimer) { clearTimeout(dropTimer); dropTimer = null; }
  if (dropFn) { map.off('moveend', dropFn); dropFn = null; }
  if (marker) { map.removeLayer(marker); marker = null; }
  if (glow) { map.removeLayer(glow); glow = null; }
}

// The answer is a point plus a radius, so the map draws exactly that: a pin where the
// model thinks you grew up, inside a circle it is about 70% confident contains you. A wide
// circle in the right place is an honest answer; a narrow one in the wrong place is not.
function flyToGuess(g) {
  clearMapExtras();
  ensureMapReady();
  const r = Math.max(10, g.radius_km || 300) * 1000;
  // The model draws the dialect's real footprint when it can: a Gulf accent gets the Arabian
  // coast arc instead of a disc whose far side lands in Tehran, because dialects follow
  // coastlines and language borders, not compasses. The circle remains the fallback whenever
  // no valid zone arrives, and for content-led verdicts, which widen instead.
  const hasZone = Array.isArray(g.zone) && g.zone.length >= 3;
  dropFn = () => {
    if (marker) return;
    glow = hasZone
      ? L.polygon(g.zone, {
        color: MARK(), weight: 1, opacity: 0.55,
        fillColor: MARK(), fillOpacity: 0.10, smoothFactor: 1.5,
      }).addTo(map)
      : L.circle([g.lat, g.lng], {
        radius: r, color: MARK(), weight: 1, opacity: 0.55,
        fillColor: MARK(), fillOpacity: 0.10,
      }).addTo(map);
    marker = L.marker([g.lat, g.lng], {
      icon: L.divIcon({ className: 'pulse-wrap', html: '<div class="pulse"></div><div class="pulse-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
    }).addTo(map);
  };
  map.once('moveend', dropFn);
  dropTimer = setTimeout(dropFn, 4000); // fallback if the flight was skipped
  // frame the whole circle rather than a fixed zoom, so a 30km guess and a 2000km guess
  // both read correctly
  const bounds = hasZone ? L.latLngBounds(g.zone).pad(0.25) : L.latLng(g.lat, g.lng).toBounds(r * 2.6);
  // The flight frames the zone in the map the user can actually SEE: on phones the result
  // peeks as a bottom sheet, so pad the bottom; on desktop the card is pinned left, so pad
  // the flight past its right edge instead of centering the answer behind it.
  const peeking = matchMedia('(max-width: 939px)').matches;
  const cardEl = document.getElementById('resultCard');
  const cardRight = (!peeking && cardEl && !cardEl.hidden)
    ? Math.round(cardEl.getBoundingClientRect().right) : 0;
  // THE MAP IS DECORATION; THE ANSWER IS THE PRODUCT. A zero-size map makes Leaflet compute a
  // NaN zoom and throw "Invalid LatLng object: (NaN, NaN)" out of flyToBounds — and because
  // this is called at the END of renderResult, that exception unwound all the way to the
  // caller's .catch, which threw the finished card away and told the user "That didn't work."
  // The verdict was complete, correct and already painted into the DOM.
  //
  // Leaflet caches a 0x0 size whenever its container was never laid out, which initMap already
  // documents for a page loaded in a background tab. The realistic path is a phone: someone
  // starts a reading, switches app during the ten-second wait, and comes back to an error
  // instead of their result.
  //
  // Two guards, because either alone leaves the hole open. Skip the flight when the map cannot
  // be measured, and never let a map failure escape into the render path.
  if (map.getSize().x > 0 && map.getSize().y > 0) {
    try {
      map.flyToBounds(bounds, {
        duration: 2.4, easeLinearity: 0.15,
        paddingTopLeft: [peeking ? 12 : cardRight + 28, 84],
        paddingBottomRight: [peeking ? 12 : 28, peeking ? Math.round(window.innerHeight * 0.46) : 28],
      });
    } catch { dropFn(); }   // no flight, but still drop the pin where the answer says
  } else {
    // Nothing to fly in yet. Put the pin down now so the answer is on the map the moment the
    // container gets a size, and let the existing visibilitychange handler reframe it.
    dropFn();
  }
}

// The answer can be anywhere on Earth, so "home" is the world.
function flyHome() {
  clearMapExtras();
  ensureMapReady();
  // Same guard flyToGuess already carries, for the same reason. A zero-size Leaflet map throws
  // "Invalid LatLng object: (NaN, NaN)" out of flyToBounds, and this is called from the refusal
  // card's render path — so a map that has not been measured yet took down a finished "no answer"
  // verdict and replaced it with a generic failure. The flight is decoration; the card is not.
  if (map.getSize().x <= 0 || map.getSize().y <= 0) return;
  try {
    map.flyToBounds(HOME_BOUNDS, { duration: 1.8 });
  } catch { /* the card stands without its flight */ }
}

// ————— ui states —————
// The scroll cue: one element per card, created on demand, kept honest by measurement.
// It only appears when the card genuinely has more content than it can show, and hides again the
// moment you reach the end — so it is never a decoration lying about there being more.
// "scroll" over a drifting chevron: the word says what to do, the chevron says which way, and
// neither looks like something to press.
// The <span> is the visible layer; its parent is a zero-height anchor that costs the card no
// space and keeps the overflow measurement honest. See .scroll-cue in the stylesheet.
const CUE_HTML = '<span><b>scroll<svg viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4l3.5 3.5L9.5 4"/></svg></b></span>';

// PHONES ONLY, ON PURPOSE, and it is worth writing down why since the card measurement makes it
// look like an oversight. On phones the result rides as a bottom sheet with its own overflow, so
// the card scrolls and this measures it. On desktop the card keeps its natural height and .hud is
// the scrollport, so this reads 0 and the cue never lights.
//
// That is the right outcome. Measured in Chrome on Windows, .hud renders a real 15px scrollbar
// the moment it overflows — the standard affordance, on the platform where people already know
// what it means. The cue exists because phones have no such thing: overlay scrollbars fade out,
// which is exactly why the people handed the phone read their city and stopped.
//
// Pinning it to the outer scrollport was tried and does not work here. The cue is sticky inside
// the card, so it can never travel past the card's own bottom edge; with .hud scrolling, it parks
// at the end of the card's content while the viewport bottom sits lower, and the share and go-
// again buttons peek out underneath the fade that is supposed to be closing them off. And .hud
// carries 52px of its own bottom padding, so its overflow reads positive on layouts where every
// word of the card is already on screen — a cue promising more below when there is nothing.
function refreshScrollCue(card) {
  if (!card) return;
  const scrollable = card.scrollHeight - card.clientHeight > 8;
  card.classList.toggle('can-scroll', scrollable);
  if (!scrollable) { card.classList.remove('at-end'); return; }
  const atEnd = card.scrollTop + card.clientHeight >= card.scrollHeight - 12;
  card.classList.toggle('at-end', atEnd);
}

function attachScrollCue(card) {
  if (!card || card._cued) return;
  card._cued = true;
  const cue = document.createElement('div');
  cue.className = 'scroll-cue';
  cue.innerHTML = CUE_HTML;
  card.appendChild(cue);
  card.addEventListener('scroll', () => refreshScrollCue(card), { passive: true });
  // Measuring once on show is too early: show() runs before renderResult writes the verdict, the
  // evidence and the transcript into the card, so the card was still short and the cue concluded
  // there was nothing to scroll to — on the one card that always has something to scroll to.
  // Watching the box means it stays right however the content changes afterwards.
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => refreshScrollCue(card));
    ro.observe(card);
    for (const child of card.children) ro.observe(child);
  }
}

const cards = ['idleCard', 'liveCard', 'typeCard', 'analyzingCard', 'redoCard', 'resultCard'];
function show(cardId) {
  for (const id of cards) $('#' + id).hidden = id !== cardId;
  // Stopping the ticker here rather than at each call site means no error path can leave it
  // running behind the result card. There are seven ways back to idle and only one of them
  // is success.
  if (cardId !== 'analyzingCard') stopScan();

  // EVERY CARD OPENS AT ITS TOP.
  //
  // A card swap does not reset scroll, so replacing a short card with the much taller result
  // card left the view part way down it. The answer is the FIRST line of that card, so it had
  // already scrolled past: you landed near the bottom and had to scroll UP to find out which
  // city you were given, which reads as the page having jumped around. Reading order should
  // match arrival order — the city first, then scroll down for the reasoning.
  //
  // BOTH containers, because which one scrolls depends on the layout. On desktop the card sits
  // inside .hud and .hud scrolls. On phones the result is a bottom sheet capped at 44dvh that
  // scrolls WITHIN ITSELF, so resetting only .hud fixes nothing on the device where the problem
  // actually shows up.
  const hud = document.querySelector('.hud');
  if (hud) hud.scrollTop = 0;
  const card = document.getElementById(cardId);
  if (card) {
    card.scrollTop = 0;
    // Measured after layout: the card's height depends on content that was just written into it.
    attachScrollCue(card);
    setTimeout(() => refreshScrollCue(card), 60);
  }
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 3200);
}

// Things to DO, not lines to read out. These used to be quoted, which turned each one into a
// script — and "How would you ask a friend: what's up, what are you doing?" was a question about
// how you would talk rather than an invitation to talk, so the honest answer to it is four words
// long. Every one of these is now a situation you can just walk into and keep going.
const PROMPTS = [
  'Tell me about your day',
  'Complain about traffic like you\'re on the phone with your cousin',
  'Check up on a friend you haven\'t seen in a while',
  'Describe the last thing you ate',
  'Tell me what you\'re doing this weekend',
];
let promptIdx = 0;
setInterval(() => {
  if (state !== 'idle') return;
  promptIdx = (promptIdx + 1) % PROMPTS.length;
  const el = $('#promptText');
  el.style.opacity = 0;
  setTimeout(() => { el.textContent = PROMPTS[promptIdx]; el.style.opacity = 1; }, 350);
}, 5000);

// ————— waveform + timer —————
function startMeter(stream) {
  meterStream = stream;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    // Explicit rather than inherited: the browser default is 0.8, and the waveform reads better
    // slightly quicker off the mark than that while still being smooth enough not to strobe.
    analyser.smoothingTimeConstant = 0.72;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const bars = [...document.querySelectorAll('#wave i')];
    micPeak = 0; micFrames = 0; micVoiced = 0;
    const loop = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      micPeak = Math.max(micPeak, sum / data.length / 255);
      micFrames += 1;
      if (sum / data.length / 255 > VOICE_LEVEL) micVoiced += 1;
      // MIRRORED, and the reason is visible the moment you look at the old one. Reading the
      // spectrum straight across put low frequencies on the left and high on the right, and a
      // human voice puts almost all of its energy low — so the left half of the waveform stood
      // up and the right half lay flat for the entire recording, every recording. That is an
      // equalizer with a dead channel, not a voice. Folding the same data about the centre
      // gives the symmetry people actually read as sound, and costs nothing but an abs().
      const half = bars.length / 2;
      bars.forEach((b, i) => {
        const d = Math.abs(i - (bars.length - 1) / 2);   // 0 at the centre, ~half at the edges
        const v = data[Math.floor(d * data.length / half / 2.4) + 2] / 255;
        // A gentle envelope so the shape tapers outward the way a real one does, instead of
        // ending in two full-height bars hard against the edge.
        const envelope = 1 - (d / half) * 0.35;
        b.style.transform = `scaleY(${0.08 + v * 1.25 * envelope})`;
      });
      // your voice pushes isoglosses out across the map
      const level = sum / data.length / 255;
      if (level > 0.06 && Math.random() < level * 1.5) {
        const btn = $('#micBtn')?.getBoundingClientRect();
        field.pulse(btn ? btn.left + btn.width / 2 : undefined, btn ? btn.top + btn.height / 2 : undefined, Math.min(1, level * 3));
      }
      rafId = requestAnimationFrame(loop);
    };
    meterLoop = loop;
    loop();
  } catch { /* no meter, no problem */ }
}

function stopMeter() {
  if (rafId) cancelAnimationFrame(rafId), rafId = null;
  if (audioCtx) audioCtx.close().catch(() => {}), audioCtx = null;
  meterLoop = null; meterStream = null;
}

// ————— SWITCHING APPS MID-TAKE —————
//
// Nothing used to guard this and all four consequences were live at once. A backgrounded tab
// throttles setInterval to roughly once a minute, so the countdown froze wherever it was —
// reported stuck at 0:26. requestAnimationFrame stops entirely, so the waveform froze mid-shape
// and then lurched back to life on return, which reads as the meter reacting to a voice that is
// not there. The cap at MAX_SECONDS never fired on time, because the tick that enforces it was
// throttled with everything else.
//
// And the one that actually costs accuracy: MediaRecorder KEEPS RECORDING. A take left in the
// background quietly fills with room tone, and the eval notes are explicit about what that does —
// padding real speech with silence moved the pin on 4 of 12 clips, one of them from 0 km to
// 3185 km. Coming back to a 26-second take that now holds 26 seconds of speech and four minutes
// of nothing is worse than coming back to no take at all.
//
// So the take PAUSES. Recorder, meter and clock all stop together, and the away time is added
// back to startedAt on return so it never counts against the person. Switch apps for five
// minutes, come back, and you are exactly where you left off.
let pausedAt = 0;

function pauseTake() {
  if (state !== 'listening' || pausedAt) return;
  pausedAt = Date.now();
  stopTimer();
  if (rafId) cancelAnimationFrame(rafId), rafId = null;
  try { if (audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(() => {}); } catch { /* not fatal */ }
  // pause() is not universal; where it is missing the clock still freezes and the only cost is
  // some room tone on the tail, which is the old behaviour rather than a new failure.
  try { if (recorder && recorder.state === 'recording' && recorder.pause) recorder.pause(); } catch { /* ignore */ }
}

function resumeTake() {
  if (state !== 'listening' || !pausedAt) return;
  startedAt += Date.now() - pausedAt;   // the time away never happened
  pausedAt = 0;
  try { if (recorder && recorder.state === 'paused' && recorder.resume) recorder.resume(); } catch { /* ignore */ }
  try { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {}); } catch { /* ignore */ }
  if (!rafId && meterLoop) meterLoop();
  resumeTimer();
}

// visibilitychange ONLY, which is what this should have been from the start.
//
// A blur/focus pair was added on top of this and has been taken back out. It was there to catch
// alt-tabbing to another application on Windows, where the tab is never actually hidden — but it
// was chasing a bug that probably never existed. The report was "clock frozen, waveform still
// moving", and a throttled tab cannot produce that: requestAnimationFrame STOPS when a tab is
// hidden, so a frozen tab freezes the waveform too. What does produce exactly that signature is a
// stray rAF loop left running by test code with the interval cleared, which is what was on that
// tab at the time. Mine.
//
// It also cost more than it was worth. blur fires on phones for notification banners and the
// keyboard, none of which mean anyone left, so it needed a desktop-only gate; and blur can fire
// without its matching focus, so it needed a once-a-second watchdog to stop a pause sticking
// forever. Two mechanisms guarding a third, for a case worth some room tone at the end of a take.
//
// What remains is what production audio and video players actually use, and it covers the case
// that genuinely happens: backgrounding the app on a phone, which does hide the page and does
// fire this.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseTake(); else resumeTake();
});

// Safari fires pagehide without visibilitychange in some flows; pageshow is its way back.
addEventListener('pagehide', () => pauseTake());
addEventListener('pageshow', () => resumeTake());

function startTimer() {
  startedAt = Date.now();
  // EVERY TAKE STARTS UNPAUSED, whatever happened to the last one. pauseTake() returns early if
  // pausedAt is already set, so a take that ended while the tab was hidden — navigating away from
  // a backgrounded recording, or the cap firing after a resume that never came — left a stale
  // timestamp that made the NEXT recording silently unpausable. Only two of the exit paths cleared
  // it; this covers all of them, including any added later.
  pausedAt = 0;
  const stop0 = $('#stopBtn');
  // DISABLE ONLY. Writing textContent here would flatten the button's children — the label span
  // and the count pill — back into a single text node, so the pill silently stopped existing the
  // moment a second take started. The label is static markup now; nothing needs to set it.
  if (stop0) stop0.disabled = true;
  // Reset, or a second recording starts still wearing the first one's badge.
  const q0 = $('#quality');
  if (q0) {
    q0.dataset.earned = '0';
    [...$('#dots').children].forEach((d, i) => { d.classList.remove('on'); d.classList.toggle('next', i === 0); });
    const w0 = $('#tierWord');
    if (w0) w0.textContent = 'keep talking';
    const p0 = $('#waitPill');
    if (p0) { p0.hidden = false; p0.textContent = `${MIN_RECORD_S}s`; }
    const f0 = $('#countFill');
    if (f0) f0.style.width = '0%';
    // Derived, so the clock on screen can never disagree with the cap that enforces it.
    $('#timer').textContent = `${Math.floor(MAX_SECONDS / 60)}:${String(MAX_SECONDS % 60).padStart(2, '0')}`;
  }
  lastTick = 0;
  timerId = setInterval(tick, 250);
}

// Restart the interval WITHOUT touching startedAt or the UI, for coming back from a paused take.
function resumeTimer() {
  lastTick = 0;   // the pause already credited its own time; do not credit it twice
  if (!timerId) timerId = setInterval(tick, 250);
}

let lastTick = 0;
function tick() {
  {
    // A LAST-RESORT CATCH for a freeze that fired no event we listened for — a lid closing, a
    // phone locking, a mobile browser that suspends silently. Ticks are scheduled every 250ms, so
    // a gap of many seconds means this tab was not running, whatever the browser did or did not
    // tell us, and crediting it back keeps the clock honest about how long the person spoke.
    //
    // FIVE SECONDS, not two, and the difference was measured rather than guessed. A backgrounded
    // tab still ticks, at roughly once a second, and with jitter a 1.2s gap was observed arriving
    // as 2.2s — which a 2000ms threshold read as a freeze and credited. False credits are worse
    // than no detector at all: they make the clock under-report real speech, so the dots lag what
    // was actually said. Nothing legitimate produces a five-second gap; ordinary throttling is
    // 1/sec and intensive throttling is 1/min, so this fires on the second and never the first.
    const now = Date.now();
    if (lastTick && now - lastTick > 5000) startedAt += now - lastTick;
    lastTick = now;
    const s = Math.floor((now - startedAt) / 1000);
    // A countdown, not a stopwatch. The cap used to fire with no warning, which read as the
    // app crashing mid-sentence rather than a deliberate limit.
    const left = Math.max(0, MAX_SECONDS - s);
    // A voiced-seconds gate was built here and then REMOVED before shipping, and the reason is
    // worth keeping so nobody rebuilds it. Measured: 15s of speech plus 15s of digital silence
    // performs like 15s, not 30s - the model tightens its radius on real extra speech (9 of 12
    // clips) and treats silence as a fresh guess carrying no information (1 of 12), and padding
    // even moved the pin on 4 of 12 clips, one from 0 km to 3185 km. All true, and all
    // irrelevant here, because of what micVoiced actually counts.
    //
    // VOICE_LEVEL is 0.05 on a mean of getByteFrequencyData, and that maps to roughly -96 dB.
    // It is an "is this microphone producing any signal at all" test, not an "is this speech"
    // test - which is exactly what it was written for, guarding MIN_VOICED_S against a dead
    // mic. Any real room clears it continuously, including during the pauses between words. So
    // micVoiced/micFrames is about 1.0 on every genuine recording, a voiced gate computes the
    // same number as the clock, and the only thing it adds is a way to lock someone out of
    // their own take if the meter under-reports. The loophole it was meant to close needs
    // DIGITAL silence, which a microphone in a room does not produce.
    //
    // To make this real, VOICE_LEVEL would have to become an actual speech-detection threshold
    // first, and that needs measuring against real recordings, not reasoning.
    const stop = $('#stopBtn');
    if (stop) {
      // THE BUTTON IS ITS OWN EXPLANATION. A disabled control with a fixed label makes a person
      // wonder whether the app is broken; a disabled control counting down tells them exactly
      // what it is waiting for and exactly how long, in the place they are already looking.
      // This is not the third clock that got cut — that one duplicated a countdown sitting
      // beside it. Nothing else on this screen counts down now.
      // THE LABEL NEVER CHANGES, because what the button DOES never changes. Two earlier versions
      // rewrote it — "done in 13s", which was false (nothing ends at twenty, and the dots below
      // were simultaneously asking for thirty), and a bare "13", which was a number with no
      // sentence around it. The button says its own name and the wait rides beside it as a
      // separate number, so neither has to distort the other to fit.
      stop.disabled = s < MIN_RECORD_S;
      const pill = $('#waitPill');
      if (pill) {
        pill.hidden = !stop.disabled;
        const left = `${MIN_RECORD_S - s}s`;
        if (stop.disabled && pill.textContent !== left) pill.textContent = left;
      }
    }
    // The clock and its bar both draw the same thing: how much of the minute is left. The cap
    // used to fire with no warning at all, which read as the app crashing mid-sentence.
    $('#timer').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    const fill = $('#countFill');
    if (fill) fill.style.width = `${(s / MAX_SECONDS) * 100}%`;
    const q = $('#quality');
    if (q) {
      const earned = TIERS.filter((t) => s >= t.at).length;
      if (q.dataset.earned !== String(earned)) {
        q.dataset.earned = String(earned);
        [...$('#dots').children].forEach((d, i) => {
          d.classList.toggle('on', i < earned);
          // The one you are working toward, so the row always points somewhere.
          d.classList.toggle('next', i === earned);
        });
        const w = $('#tierWord');
        if (w) w.textContent = earned ? TIERS[earned - 1].word : 'keep talking';
      }
    }
    if (s >= MAX_SECONDS) stopListening();
  }
}

function stopTimer() {
  if (timerId) clearInterval(timerId), timerId = null;
}

// Called wherever a take ends, so no pause state survives into the next one. It used to also
// clear a once-a-second watchdog, which is where the name came from; the watchdog went with the
// blur handling and the name stayed behind describing something that no longer exists.
function clearPauseState() {
  pausedAt = 0;
}

// ————— the wait —————
// Measured: median 11.8s to a verdict, p90 28.7s. Nothing about that is fixable by sending
// less audio (8s of audio still takes 6.2s and wrecks accuracy, 67km -> 345km), so the wait
// is real and the job is to make it legible rather than to pretend it is short.
// TWO SETS, because there are two things that can be analyzed and only one of them is a voice.
// Type mode sends text and no audio at all — api/analyze.js tells the model to judge from
// vocabulary and phrasing alone — and it showed this same analysing card. So anyone who tapped
// a sample, or who was pushed into type mode because their mic was blocked, sat and watched the
// app claim to be listening to their vowels and softened consonants for something they typed.
const SCAN_NOTES = [
  'listening to how you shape your vowels',
  'checking which consonants you soften',
  'weighing your rhythm and stress',
  'narrowing down the region',
  // Was "a long look usually means a close call", which nothing measures. The wait is model
  // inference time; no data ties a slow call to an ambiguous accent, and inventing a flattering
  // reason for a delay is how a product ends up saying things it cannot back.
  'still going, hang tight',
];
const SCAN_NOTES_TEXT = [
  'reading the words you chose',
  'weighing your spelling and phrasing',
  'narrowing down the region',
  'still going, hang tight',
];
let scanId = null;
function startScan(kind) {
  const notes = kind === 'text' ? SCAN_NOTES_TEXT : SCAN_NOTES;
  const t0 = Date.now();
  let i = 0;
  const note = $('#scanNote'), el = $('#scanElapsed');
  const head = $('#scanStatus');
  if (head) head.textContent = kind === 'text' ? 'reading your dialect…' : 'reading your accent…';
  if (note) note.textContent = notes[0];
  if (el) el.textContent = '';
  scanId = setInterval(() => {
    const s = Math.round((Date.now() - t0) / 1000);
    if (el) el.textContent = ` · ${s}s`;
    // Advance roughly every 5s, then hold on the last line rather than looping forever,
    // because a cycling message eventually reads as broken too.
    const next = Math.min(notes.length - 1, Math.floor(s / 5));
    if (next !== i && note) { i = next; note.textContent = notes[i]; }
  }, 250);
}
function stopScan() {
  if (scanId) clearInterval(scanId), scanId = null;
}

// The live transcript preview is gone. It used the browser's own recogniser, which must be
// told a language up front — impossible now that the whole point is "talk in anything".
// Guessing wrong rendered French in Arabic letters, and it was only ever decoration: the
// real answer comes from the audio after you stop.

// ————— recording —————
function pickMime() {
  if (!window.MediaRecorder) return null;
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return ''; // let the browser pick its default
}

// One take, one handling. onRecordingReady can be reached three ways — the normal stop, a
// SPONTANEOUS recorder stop (iOS phone call, Siri, another app grabbing the mic), and the
// recorder-already-inactive fallback in stopListening — and two of them can fire for the
// same take. The fence makes whichever arrives first the only one that counts.
let takeHandled = false;

async function startListening() {
  if (state === 'listening' || state === 'analyzing' || state === 'starting') return; // double-tap guard
  state = 'starting';
  window._lastAudio = null;
  takeHandled = false;
  micPeak = -1; micFrames = 0; micVoiced = 0;
  const mime = pickMime();
  if (mime === null || !navigator.mediaDevices?.getUserMedia) {
    toast('This browser can\'t record audio. Type instead 👇');
    enterTypeMode();
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast('Mic blocked. Allow the microphone, or type instead.');
    enterTypeMode();
    return;
  }
  if (state !== 'starting') { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; return; }
  state = 'listening';
  chunks = [];
  recMime = mime;
  show('liveCard');
  startMeter(mediaStream);
  startTimer();

  try {
    recorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined);
  } catch {
    stopTimer(); stopMeter(); clearPauseState(); teardownRecording();
    state = 'idle'; show('idleCard');
    toast('Recording failed to start on this browser. Try again, or type instead.');
    return;
  }
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = onRecordingReady;
  recorder.start(500);
}

// Throw this take away and go all the way back to the mic.
//
// onstop is detached before the recorder is stopped, so the half-recording can never reach
// onRecordingReady and get analysed — that is the whole point, the audio is being discarded
// because the speaker knows it is spoiled.
//
// It returns to the idle card rather than starting a fresh take immediately. Dropping someone
// straight back into a live recording gives them no moment to collect themselves, which is the
// one thing they wanted when they pressed a button labelled "start over" — and it makes the
// button ambiguous, because from the outside an instant restart looks identical to nothing
// having happened. Back to the mic is a real stop, and the next take begins when they choose.
function restartListening() {
  if (state !== 'listening') return;
  stopTimer();
  stopMeter();
  if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
  teardownRecording();
  state = 'idle';
  show('idleCard');
}

function stopListening() {
  if (state !== 'listening') return;
  state = 'analyzing';
  stopTimer();
  stopMeter();
  const elapsed = (Date.now() - startedAt) / 1000;
  const voicedS = micFrames ? (micVoiced / micFrames) * elapsed : -1;
  if (elapsed < MIN_RECORD_S) {
    toast(`That was ${Math.round(elapsed)} seconds. Much under twenty and I am guessing at country scale. Go again, and thirty seconds or so reads far sharper.`);
    state = 'idle';
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    teardownRecording();
    show('idleCard');
    return;
  }
  // A METER THAT NEVER RAN IS NOT A DEAD MICROPHONE.
  //
  // iOS suspends the AudioContext freely (a background switch, a call, the page not having a
  // fresh user gesture). A suspended context produces no frames, so micPeak stays at its initial
  // value and the guard below reads that as "the mic picked up nothing" — throwing away a
  // perfectly good recording and telling the person their microphone is broken. Only trust the
  // meter when the meter was actually running.
  if (!audioCtx || audioCtx.state !== 'running') micPeak = -1;

  // Two different failures, two different fixes, so they get two different messages.
  // A dead mic is a settings problem; a quiet room is a "say more" problem.
  if (micPeak >= 0 && micPeak < 0.02) {
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    teardownRecording();
    // There used to be a rescue here that fell back to the browser's live captions when the
    // recorder taped silence. Those captions are gone with the preview, so a dead mic is now
    // simply a dead mic — say so plainly instead of referencing variables that no longer exist.
    // Was "check Chrome's mic icon (address bar)". There is no address bar on a phone, which is
    // where this app is actually used, so it sent most people looking for something not there.
    toast('Your mic barely picked anything up 🎤 check the right microphone is selected and nothing is covering it, then try again.');
    state = 'idle';
    show('idleCard');
    return;
  }
  // The mic works but almost nothing in the recording was voice. Refuse here rather than
  // spend a call and a 20-second wait on audio that can only produce a fabricated answer.
  if (voicedS >= 0 && voicedS < MIN_VOICED_S) {
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    teardownRecording();
    toast('I could hardly hear any talking 🤫 get closer and say a couple of sentences.');
    state = 'idle';
    show('idleCard');
    return;
  }
  show('analyzingCard'); startScan();
  if (recorder && recorder.state !== 'inactive') recorder.stop(); // -> onRecordingReady
  else onRecordingReady();
}

function teardownRecording() {
  if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop()), mediaStream = null;
  recorder = null;
}

// ONE ID PER TAKE, held across every retry of it. This is what lets a resumed take collect the
// answer the server already computed instead of paying for it twice: same id, so the server
// recognises the second request as the same take and returns the stored result without touching
// the model. A fresh id per request would defeat it entirely.
function newTakeId() {
  try { return crypto.randomUUID(); } catch { /* older Safari */ }
  return 'tk-' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

async function onRecordingReady() {
  if (takeHandled) return;
  takeHandled = true;
  // A spontaneous stop (phone call, Siri, the OS reclaiming the mic) arrives here while
  // state is still 'listening', with the countdown and meter still running and the live
  // card still up. Clean up and analyze whatever was captured — a take interrupted at 20
  // seconds is still a take; the blob-size gate below catches the ones that aren't.
  if (state === 'listening') {
    stopTimer(); stopMeter(); clearPauseState();
    // ...but apply the SAME floor a manual stop applies. The comment above says an interrupted
    // 20-second take is still a take, and that is true — the problem is that nothing here checked
    // it was 20 seconds. A call that lands four seconds in was analysed anyway, so the one path
    // the user did not choose was the one that skipped the rule the whole app is built around,
    // and they got a country-scale guess presented with the same confidence as a real one.
    const cutShort = (Date.now() - startedAt) / 1000;
    if (cutShort < MIN_RECORD_S) {
      toast(`That take was cut short at ${Math.round(cutShort)} seconds. Give it twenty seconds at least, or thirty for a sharper read.`);
      state = 'idle';
      teardownRecording();
      show('idleCard');
      return;
    }
    state = 'analyzing';
    show('analyzingCard'); startScan();
  }
  const blob = new Blob(chunks, { type: recMime || 'audio/webm' });
  const mimeUsed = (recorder && recorder.mimeType) || recMime || 'audio/webm';
  teardownRecording();
  if (blob.size < 2000) {
    return fallbackOrFail('I didn\'t catch any audio.');
  }
  try {
    const audio = await blobToBase64(blob);
    window._lastAudio = { audio, mime: mimeUsed }; // kept for the consent flywheel
    const resp = await analyzeResilient({ audio, mime: mimeUsed, take_id: newTakeId() });
    renderResult(normalizeServer(resp));
  } catch (err) {
    // SAY WHICH THING WENT WRONG. The cause is already sitting on err.message — the server's own
    // error code, or http_500, or the browser's exception name — and it was being thrown away in
    // favour of a sentence that fits every failure equally badly. "Something went wrong on our
    // end" sent from an iPhone is unactionable; the same message with (upstream_failed) or
    // (http_413) or (NotAllowedError) on it names the failure from across a room.
    // The recorded format goes in too. iPhones cannot produce webm, so Safari records audio/mp4,
    // and that is a format this pipeline has never once been observed to succeed with — every
    // successful call in this project's history has been webm/opus from a desktop. If the failure
    // turns out to be the format, the message will be holding the evidence.
    const why = err && err.userMessage;
    const code = err && err.message ? String(err.message).slice(0, 40) : 'unknown';
    fallbackOrFail(why || `Something went wrong on our end. (${code} · ${mimeUsed || 'no mime'})`);
  }
}

// There is no offline fallback any more: the Arabic lexicon engine is gone and there are
// no live captions to salvage, so a failure is just a failure. Say so and let them retry.
function fallbackOrFail(reason) {
  toast(`${reason} Try again, or use type mode.`);
  state = 'idle';
  show('idleCard');
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// One place that turns a server error code into something a person can act on.
const ERRORS = {
  no_speech: "I couldn't hear any real speech in that. Check the right microphone is selected and this site has permission, then try again.",
  not_configured: 'The server is missing its API key, so nothing can be analyzed. That is a setup problem, not your recording.',
  out_of_credit: 'The analysis account has run out of credit, so nothing can be read right now. Nothing is wrong with your recording.',
  swamped: 'A lot of people are listening right now. Give it about thirty seconds and press record again. Your voice was fine.',
  busy: 'The model is busy right now. Give it a few seconds and try again.',
  upstream_failed: "The model didn't answer. Try again in a moment.",
  audio_too_short: 'That was too short to read anything from. Give me a sentence or two.',
  audio_too_large: 'That recording was too big to send. Try a slightly shorter take.',
  text_too_long: 'That was much longer than needed. A sentence or two is plenty.',
  rate_limited: 'Slow down a little, try again in a bit.',
  at_capacity: 'HomeTongue has hit its listening limit for today. It resets at midnight UTC.',
  bad_origin: 'That request was blocked as coming from the wrong domain.',
};

// SWITCHING APPS MID-ANALYSIS MUST NOT LOSE THE TAKE.
//
// iOS suspends a backgrounded tab, which kills the in-flight fetch. Come back and the promise
// has already rejected with a bare network error, so the catch showed "Something went wrong on
// our end." for a recording that was perfectly fine and a server that was never asked again.
// People check a message while they wait — this is not an edge case, it is what waiting looks
// like on a phone.
//
// So: notice that the page was hidden while the request was out, wait until it is visible again,
// and try once more. Only for network-shaped failures — an out-of-credit or too-large answer
// from the server is a real answer and gets reported as-is. One retry, because the first call may
// well have run and been paid for; this is about not stranding the person, not about persistence.
// SURVIVING A PHONE THAT WENT AWAY MID-ANALYSIS.
//
// The call takes ~12s at the median and ~29s at p90, and nobody stares at a phone for half a
// minute. They switch apps, and iOS suspends the tab and kills the in-flight fetch — which comes
// back as Safari's "Load failed". That is the reported failure, verbatim.
//
// This used to retry ONCE, immediately, and that is the attempt least likely to work. The fetch
// rejection cannot even be delivered while the tab is frozen, so it arrives at the moment the
// page wakes up — and firing a fresh request into a network stack that is still coming back from
// suspension fails the same way, instantly. One retry, spent at the worst possible moment.
//
// Now it waits to actually be visible, gives the connection a beat, and tries again up to three
// times with a widening gap. Errors the SERVER answered with (no speech, audio too large) are
// never retried: they will fail identically and re-spend a model call to do it.
async function analyzeResilient(payload) {
  let wentAway = document.hidden;
  const watch = () => { if (document.hidden) wentAway = true; };
  document.addEventListener('visibilitychange', watch);
  const untilVisible = () => (document.hidden
    ? new Promise((resolve) => {
      const back = () => {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', back);
        resolve();
      };
      document.addEventListener('visibilitychange', back);
    })
    : Promise.resolve());

  try {
    const MAX_TRIES = 3;
    for (let attempt = 1; ; attempt++) {
      // KILL A DEAD ATTEMPT THE MOMENT WE KNOW IT IS DEAD, rather than waiting out its 75s
      // ceiling. A fetch that iOS suspended does not reliably reject — a half-open connection can
      // hang until the timeout fires, so someone who left and came back was watching "picking up
      // where we left off" for up to 75 seconds of nothing before the retry even STARTED, and
      // then the real call on top of that. Coming back is itself the proof that attempt is gone.
      const kill = new AbortController();
      const onReturn = () => { if (!document.hidden && wentAway) kill.abort(); };
      document.addEventListener('visibilitychange', onReturn);
      try {
        return await postAnalyze(payload, kill.signal);
      } catch (err) {
        document.removeEventListener('visibilitychange', onReturn);
        // The server got the audio and made a judgement about it. Sending it again cannot change
        // that answer, and would spend a second call to hear it.
        const serverAnswered = err && err.userMessage && err.message !== 'timeout';
        if (serverAnswered || attempt >= MAX_TRIES) throw err;
        // A superseded attempt cost nothing and proves the page is back, so it goes straight
        // round again without the settling pause a real network failure earns.
        if (err && err.superseded) { attempt -= 1; continue; }

        await untilVisible();
        // A beat for the network to come back with the page. 400ms, then 1200ms — the first
        // covers a tab resuming, the second a connection that genuinely dropped.
        await new Promise((r) => setTimeout(r, attempt === 1 ? 400 : 1200));

        const note = $('#scanNote');
        if (note) note.textContent = wentAway ? 'picking up where we left off' : 'reconnecting';
      } finally {
        document.removeEventListener('visibilitychange', onReturn);
      }
    }
  } finally {
    document.removeEventListener('visibilitychange', watch);
  }
}

async function postAnalyze(payload, extraSignal) {
  // 75s outlasts the server's own 60s ceiling, so every legitimate slow answer arrives —
  // but a stalled mobile connection can otherwise hang this fetch for minutes with the
  // analyzing card holding the whole UI hostage (it has no buttons by design). The timeout
  // is the escape hatch.
  let resp;
  // The 75s ceiling stays for a legitimately slow model call, but the caller can also abort
  // early — see analyzeResilient, which kills a request the moment it knows the phone was away
  // rather than letting a half-dead connection sit here burning the full timeout.
  const ctl = new AbortController();
  const killer = setTimeout(() => ctl.abort(new DOMException('timeout', 'TimeoutError')), 75_000);
  const relay = () => ctl.abort(new DOMException('superseded', 'AbortError'));
  if (extraSignal) extraSignal.addEventListener('abort', relay, { once: true });
  try {
    resp = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
  } catch (e) {
    // A caller-driven abort is NOT a timeout: it means "this attempt is known dead, start the
    // next one now". Reporting it as a stall would end the take instead of retrying it.
    if (e && e.name === 'AbortError' && ctl.signal.reason && ctl.signal.reason.message === 'superseded') {
      throw Object.assign(new Error('superseded'), { superseded: true });
    }
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw Object.assign(new Error('timeout'), { userMessage: 'That took too long. The network or the model stalled.' });
    }
    throw e;
  } finally {
    clearTimeout(killer);
    if (extraSignal) extraSignal.removeEventListener('abort', relay);
  }
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.ok) {
    const err = new Error((data && data.error) || `http_${resp.status}`);
    // Say what actually went wrong. "The cloud engine is unreachable" was shown for a server
    // that was up and knew exactly what was missing, which made a one-line config fix look
    // like a mystery outage.
    // Prefer the map's wording, then the server's own detail string — the server often knows
    // exactly what went wrong (out of credit, too large) and hiding that behind a generic
    // "unreachable" once made a one-line config fix look like a mystery outage.
    err.userMessage = ERRORS[data && data.error] || (data && data.detail) || '';
    throw err;
  }
  return data;
}

// ————— analysis paths —————
function runTextAnalysis(text, typed) {
  window._lastAudio = null;
  if (normText(text).length < 8) {
    toast('I barely got anything. Give me a sentence or two.');
    // 'type', not 'idle', while the type card stays up — 'idle' here armed the
    // stale-tab reload guard against someone mid-typing
    state = typed ? 'type' : 'idle';
    show(typed ? 'typeCard' : 'idleCard');
    return;
  }
  show('analyzingCard'); startScan('text');
  state = 'analyzing';
  analyzeResilient({ text, take_id: newTakeId() })
    .then((resp) => renderResult(normalizeServer(resp)))
    .catch((e) => {
      // The old handler took no parameter but read `e`, so any type-mode failure threw a
      // ReferenceError inside the catch: no toast, state never reset, and the user sat on
      // "reading your accent…" forever. Audit catch, fixed with a bound parameter.
      toast((e && e.userMessage) || "That didn't work. Try again in a moment.");
      state = 'idle'; show('idleCard');
    });
}

function normText(t) { return t.replace(/\s+/g, ' ').trim(); }

// Server result -> view model
function normalizeServer(resp) {
  const r = resp.result;
  window._fbToken = resp.fb_token || '';
  const rtl = /[؀-ۿ֐-׿]/.test(r.transcript || '');
  const heard = $('#heardText');
  if (heard) heard.dir = rtl ? 'rtl' : 'ltr';
  return {
    place: r.place,
    region: r.region || '',
    zone: Array.isArray(r.zone) ? r.zone : [],
    lat: r.lat,
    lng: r.lng,
    radius_km: r.radius_km,
    language: r.language,
    conf: Math.max(0, Math.min(100, r.confidence | 0)),
    evidence: r.evidence || [],
    note: r.note || '',
    transcript: r.transcript || '',
    // These fields were silently dropped here at first: the renderer read them off a view
    // model whose whitelist never passed them through, so the server flagged the name and
    // shipped the mix and the card showed neither. The view model is a whitelist — every new
    // API field must be added here or it dies invisibly between fetch and render.
    content_led: r.content_led || null,   // 'origin' | 'name' | null
    influences: Array.isArray(r.influences) ? r.influences : [],
    source: 'cloud',
  };
}


// ————— result rendering —————
function renderResult(v) {
  state = 'result';
  // A FED verdict is never shown. The model agreed with a place the speaker named, so the
  // answer may be nothing but their own words — and for a tourist ('we're here in Toronto')
  // it is actively wrong. Agreeing with them, even with a label attached, publishes that
  // wrong answer over their face. Ask for a clean take instead.
  if (v.content_led === 'fed') {
    window._lastResult = v;
    $('#redoText').textContent = 'Everything I could point to was either something you told me or something I could not hear again on a second listen. That is not a reading, so I would rather give you nothing than make it up. Try once more, thirty seconds or so, without saying your name or where you are from.';
    show('redoCard');
    flyHome();
    return;
  }
  show('resultCard');
  // Every render gets a generation number. The verify-evidence response and the donate
  // upload both resolve long after this function returns, and both used to mutate whatever
  // result happened to be on screen by then — stale verdicts deleting a NEWER result's
  // chips, a stale donate success painting 'donated' over a clip that never uploaded. Any
  // async landing checks its generation first; stale generations touch nothing.
  window._renderGen = (window._renderGen || 0) + 1;
  const gen = window._renderGen;
  // fresh results peek on phones so the map — the best part of the answer — stays visible
  $('#resultCard').classList.toggle('peek', matchMedia('(max-width: 939px)').matches);
  $('#fbFix').hidden = true;
  $('#fbActual').value = '';
  $('#fbCity').value = '';
  $('#fbYes').disabled = false; $('#fbNo').disabled = false;
  $('#fbYes').classList.remove('chosen'); $('#fbNo').classList.remove('chosen');
  fbChoice = null;
  $('#consentWrap').style.display = window._lastAudio ? '' : 'none'; // no clip to donate in type mode
  const db = $('#donateBtn');
  db.disabled = false; db.classList.remove('done'); db.textContent = 'donate this clip';
  window._donated = false;
  fillCountryPicker();

  const kicker = $('#resultKicker'), place = $('#resultRegion'), sub = $('#resultCountry');
  const evidence = $('#evidence'), runners = $('#runners'), heard = $('#heard');
  evidence.innerHTML = ''; runners.innerHTML = '';

  heard.hidden = !v.transcript;
  if (v.transcript) $('#heardText').textContent = v.transcript;
  $('#srcBadge').textContent = v.language ? v.language.toLowerCase() : '';

  // One kicker now. A verdict the voice does not stand behind never reaches this card at
  // all, so anything rendered here was earned by sound.
  kicker.textContent = 'sounds like you grew up around';
  // The city ALWAYS headlines. A region-first billing was tried here and it killed the whole
  // point: Levantine Arabic that used to open with Amman opened with "the Levant", which
  // anybody could have said. Mohammad's design replaced it: the specific guess takes the
  // headline every time, and the honesty lives in three other places at once - the region as
  // a qualifier underneath, the zone painting the whole dialect area on the map (a Kuwaiti
  // sees Kuwait inside the glow), and the radius reading as give-or-take.
  place.textContent = v.place;
  const fit = $('#closestFit');
  if ((v.radius_km || 0) > 250 && v.region) {
    fit.hidden = false;
    fit.textContent = 'somewhere in ' + v.region;
  } else {
    fit.hidden = true;
  }

  // The server flags any recording where the speaker introduced themselves by name, because
  // the model reads foreign names as origin and will not admit it. Controlled test: identical
  // synthetic US speech, "my name is Vladislav" answered Moscow or Kyiv six times out of six,
  // while the same audio with no name, or with "Jake", answered United States.
  // The old "you said your name, take this lightly" nudge is gone: if the voice did not
  // back the verdict it is not shown, and if it did there is nothing to apologise for.
  const warn = $('#nameWarn');
  if (warn) warn.hidden = true;

  // Dialect composition, ancestry-chart style: one segmented 100% bar, then a legend row
  // per ingredient with the sound that betrayed it. Mohammad's frame — the same product
  // shape as a DNA composition, for the voice. For anyone who moved, or grew up between
  // languages, "one pin" is the wrong shape of answer and this is the true one. The pin
  // stays the verdict; this is the portrait.
  if (Array.isArray(v.influences) && v.influences.length) {
    const COMP_COLORS = ['#2A6B60', '#B8862F', '#74766D'];
    const parts = v.influences.slice(0, 3)
      .filter((i) => i.place && (i.percent || 0) >= 1)
      .map((i) => ({ place: i.place, cue: i.cue || '', pct: Math.max(1, Math.round(i.percent || 0)) }));
    const total = parts.reduce((t, p) => t + p.pct, 0) || 1;
    if (parts.length) {
      const head = document.createElement('div');
      head.className = 'heard-head';
      head.innerHTML = '<span>dialect composition</span>';
      runners.appendChild(head);
      const bar = document.createElement('div');
      bar.className = 'comp-bar';
      parts.forEach((p, i) => {
        const seg = document.createElement('span');
        seg.style.width = (p.pct / total * 100).toFixed(1) + '%';
        seg.style.background = COMP_COLORS[i % COMP_COLORS.length];
        bar.appendChild(seg);
      });
      runners.appendChild(bar);
      parts.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'comp-row';
        row.innerHTML = '<i style="background:' + COMP_COLORS[i % COMP_COLORS.length] + '"></i>'
          + '<span class="comp-place"></span><b>~' + Math.round(p.pct / total * 100) + '%</b>';
        row.querySelector('.comp-place').textContent = p.place;
        runners.appendChild(row);
        if (p.cue) {
          const cue = document.createElement('div');
          cue.className = 'comp-cue';
          cue.textContent = p.cue;
          runners.appendChild(cue);
        }
      });
    }
  }

  // The radius is the answer's honesty, so it gets the big number and a plain-English
  // reading of what that distance actually means.
  const r = v.radius_km;
  // km is distance from a point, so it binds to the city headline: give or take this much.
  $('#radiusNum').textContent = '±' + (r >= 1000 ? `${(r / 1000).toFixed(1)}k` : r);
  $('#radiusLead').textContent = r <= 50 ? 'and I mean that specifically. A town, not a region'
    : r <= 200 ? 'a confident guess at the area'
      : r <= 600 ? 'the accent gives me a region, not a town'
        : 'broad strokes, this accent is hard to place finely';
  sub.textContent = v.note || '';
  sub.hidden = !v.note;

  for (const e of v.evidence) evidence.appendChild(chip(e));

  // No client-side verification any more: the server checks every acoustic claim before
  // it answers, so the chips that arrive here have already survived a second listen.

  // The card is finished and painted by this point. Everything below is the map, and the map
  // is not allowed to take the answer away: a throw here used to unwind into runTextAnalysis's
  // .catch, which replaced a correct verdict with "That didn't work. Try again in a moment."
  // Measured on a 0x0 map, which is the state Leaflet caches whenever its container was never
  // laid out. Losing the flight is a blemish; losing the reading is the product failing.
  try { flyToGuess(v); } catch { /* the answer stands without its flight */ }
  window._lastResult = v;
}

function chip(text) {
  const el = document.createElement('span');
  el.className = 'chip';
  const b = document.createElement('b');
  b.textContent = text;          // already a human-readable phrase from the model
  el.appendChild(b);
  return el;
}

// ————— the share card —————
// A 9:16 story image drawn from the verdict itself, because the screenshot people would
// take otherwise is a browser chrome sandwich. Rendered on a canvas at 1080x1920 (the
// native story size on every platform), shared through the OS sheet where that exists —
// Instagram, TikTok, WhatsApp, Messages all accept a PNG file directly — and downloaded
// everywhere else. Nothing leaves the device: the canvas is drawn locally and the file
// never touches our server.
const SHARE_W = 1080, SHARE_H = 1920;
const COMP_COLORS = ['#2A6B60', '#B8862F', '#74766D'];

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// The mark in canvas coordinates: pin, four cream bars, one amber peak.
function drawMark(c, x, y, size) {
  const s = size / 64;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = '#2A6B60';
  c.beginPath();
  c.moveTo(32, 3);
  c.bezierCurveTo(19.85, 3, 10, 12.85, 10, 25);
  c.bezierCurveTo(10, 36.1, 18.3, 45.2, 25.5, 52.4);
  c.lineTo(32, 59);
  c.lineTo(38.5, 52.4);
  c.bezierCurveTo(45.7, 45.2, 54, 36.1, 54, 25);
  c.bezierCurveTo(54, 12.85, 44.15, 3, 32, 3);
  c.closePath();
  c.fill();
  const bars = [[18.6, 21, 8, '#FCFBF8'], [24.4, 18.5, 13, '#FCFBF8'], [30.2, 15.5, 19, '#B8862F'], [36, 18.5, 13, '#FCFBF8'], [41.8, 21, 8, '#FCFBF8']];
  for (const [bx, by, bh, fill] of bars) {
    c.fillStyle = fill;
    roundRect(c, bx, by, 3.6, bh, 1.8);
    c.fill();
  }
  c.restore();
}

// Canvas has no text wrapping and a place name can be long ("United Arab Emirates").
// Shrink to fit rather than clip: the headline is the whole point of the card.
function fitText(c, text, maxWidth, startPx, font) {
  let px = startPx;
  do {
    c.font = font.replace('{px}', px);
    if (c.measureText(text).width <= maxWidth) break;
    px -= 4;
  } while (px > 34);
  return px;
}

// The map block: the zone this voice actually got, drawn over real coastlines.
// js/world.js holds the Natural Earth 110m outline as one SVG path in a 52x30
// equirectangular box, so lng/lat project into it directly and Path2D does the rest.
function drawShareMap(c, v, x, y, w, h) {
  const lngX = (lng) => ((lng + 180) / 360) * 52;
  const latY = (lat) => ((90 - lat) / 180) * 30;
  const zone = Array.isArray(v.zone) && v.zone.length >= 3 ? v.zone : null;
  const rKm = Math.max(40, v.radius_km || 300);
  // frame: the zone's own bounds, or the circle's, padded — and never so tight that the
  // coastline turns into abstract noise, because recognising the coast IS the map's job
  let minLat, maxLat, minLng, maxLng;
  if (zone) {
    minLat = Math.min(...zone.map((p) => p[0])); maxLat = Math.max(...zone.map((p) => p[0]));
    minLng = Math.min(...zone.map((p) => p[1])); maxLng = Math.max(...zone.map((p) => p[1]));
  } else {
    const dLat = rKm / 111, dLng = rKm / (111 * Math.max(0.2, Math.cos(v.lat * Math.PI / 180)));
    minLat = v.lat - dLat; maxLat = v.lat + dLat; minLng = v.lng - dLng; maxLng = v.lng + dLng;
  }
  const cLat = (minLat + maxLat) / 2, cLng = (minLng + maxLng) / 2;
  // Wide enough that the coastline is RECOGNISABLE. The outline is thinned Natural Earth,
  // so a tight crop turns the Mediterranean into abstract blobs; at continental scale the
  // same data reads instantly, and a small precise shape on a familiar coast is the more
  // impressive picture anyway.
  const spanLat = Math.max(maxLat - minLat, 17) * 1.45;
  const spanLng = Math.max(maxLng - minLng, 24) * 1.45;
  const x0 = lngX(cLng - spanLng / 2), x1 = lngX(cLng + spanLng / 2);
  const y0 = latY(cLat + spanLat / 2), y1 = latY(cLat - spanLat / 2);
  const s = Math.min(w / (x1 - x0), h / (y1 - y0));
  const offX = x + (w - (x1 - x0) * s) / 2, offY = y + (h - (y1 - y0) * s) / 2;
  const P = (lat, lng) => [offX + (lngX(lng) - x0) * s, offY + (latY(lat) - y0) * s];

  c.save();
  roundRect(c, x, y, w, h, 22);
  c.clip();
  c.fillStyle = '#D9E6E9';                       // water
  c.fillRect(x, y, w, h);
  c.save();
  c.translate(offX, offY);
  c.scale(s, s);
  c.translate(-x0, -y0);
  const land = new Path2D(window.HT_WORLD);
  c.fillStyle = '#F1EDE4';                       // land
  c.fill(land);
  c.strokeStyle = 'rgba(27,28,25,0.28)';
  c.lineWidth = 0.9 / s;
  c.stroke(land);
  c.restore();

  // the answer itself
  c.beginPath();
  if (zone) {
    zone.forEach((p, i) => { const [px, py] = P(p[0], p[1]); if (i) c.lineTo(px, py); else c.moveTo(px, py); });
    c.closePath();
  } else {
    const [cx, cy] = P(v.lat, v.lng);
    const [ex] = P(v.lat, v.lng + rKm / (111 * Math.max(0.2, Math.cos(v.lat * Math.PI / 180))));
    const [, ey] = P(v.lat + rKm / 111, v.lng);
    c.ellipse(cx, cy, Math.abs(ex - cx), Math.abs(ey - cy), 0, 0, Math.PI * 2);
  }
  c.fillStyle = 'rgba(42,107,96,0.20)';
  c.fill();
  c.strokeStyle = '#2A6B60';
  c.lineWidth = 3;
  c.stroke();

  const [px, py] = P(v.lat, v.lng);
  c.beginPath(); c.arc(px, py, 26, 0, Math.PI * 2);
  c.fillStyle = 'rgba(184,134,47,0.25)'; c.fill();
  c.beginPath(); c.arc(px, py, 11, 0, Math.PI * 2);
  c.fillStyle = '#B8862F'; c.fill();
  c.strokeStyle = '#FCFBF8'; c.lineWidth = 3.5; c.stroke();
  c.restore();

  c.strokeStyle = '#DEDAD1';
  c.lineWidth = 2;
  roundRect(c, x, y, w, h, 22);
  c.stroke();
}

// Draws the whole card at a vertical offset and returns the canvas plus the y it ended at.
// Called twice by buildShareCanvas: once to learn the height, once to draw it centred.
function paintShare(v, dy) {
  const cv = document.createElement('canvas');
  cv.width = SHARE_W; cv.height = SHARE_H;
  const c = cv.getContext('2d');
  const M = 96;

  c.fillStyle = '#F3F1EC';
  c.fillRect(0, 0, SHARE_W, SHARE_H);
  const g = c.createRadialGradient(SHARE_W * 0.5, SHARE_H * 0.34, 60, SHARE_W * 0.5, SHARE_H * 0.34, SHARE_W * 0.95);
  g.addColorStop(0, 'rgba(184,134,47,0.11)');
  g.addColorStop(1, 'rgba(184,134,47,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, SHARE_W, SHARE_H);

  let y = 150 + dy;
  c.fillStyle = '#2A6B60';
  c.fillRect(M, y, SHARE_W - M * 2, 3);

  y += 82;
  c.fillStyle = '#74766D';
  c.font = '500 26px "Familjen Grotesk", system-ui, sans-serif';
  c.letterSpacing = '5px';
  c.fillText('SOUNDS LIKE I GREW UP AROUND', M, y);
  c.letterSpacing = '0px';

  const place = String(v.place || '').trim();
  const px = fitText(c, place, SHARE_W - M * 2, 116, '400 {px}px "Instrument Serif", Georgia, serif');
  y += px + 44;
  c.fillStyle = '#1B1C19';
  c.font = `400 ${px}px "Instrument Serif", Georgia, serif`;
  c.fillText(place, M, y);

  if ((v.radius_km || 0) > 250 && v.region) {
    y += 62;
    c.fillStyle = '#2A6B60';
    c.font = '400 40px "Familjen Grotesk", system-ui, sans-serif';
    c.fillText('somewhere in ' + v.region, M, y);
  }

  // The map is the hero of the card — the actual shape the app drew for this voice, over
  // real coastlines (Natural Earth, already baked into js/world.js for the deck thumbnails).
  // Tiles can't be used: a cross-origin tile taints the canvas and blocks toBlob entirely.
  y += 44;
  drawShareMap(c, v, M, y, SHARE_W - M * 2, 540);
  y += 540;

  y += 96;
  const r = v.radius_km || 300;
  const rTxt = '±' + (r >= 1000 ? `${(r / 1000).toFixed(1)}k` : r);
  c.fillStyle = '#2A6B60';
  c.font = '700 84px "Familjen Grotesk", system-ui, sans-serif';
  c.fillText(rTxt, M, y);
  const rw = c.measureText(rTxt).width;
  c.fillStyle = '#74766D';
  c.font = '500 34px "Familjen Grotesk", system-ui, sans-serif';
  c.fillText('km give or take', M + rw + 22, y - 6);
  if (v.language) {
    c.font = '500 28px "Familjen Grotesk", system-ui, sans-serif';
    c.fillText(String(v.language).toLowerCase(), M + rw + 22, y + 36);
  }

  const parts = (Array.isArray(v.influences) ? v.influences : [])
    .filter((i) => i.place && (i.percent || 0) >= 1).slice(0, 3);
  if (parts.length) {
    y += 140;
    c.fillStyle = '#74766D';
    c.font = '500 26px "Familjen Grotesk", system-ui, sans-serif';
    c.letterSpacing = '5px';
    c.fillText('DIALECT COMPOSITION', M, y);
    c.letterSpacing = '0px';
    y += 46;
    const total = parts.reduce((t, p) => t + (p.percent || 0), 0) || 1;
    const barW = SHARE_W - M * 2, barH = 34;
    c.save();
    roundRect(c, M, y, barW, barH, barH / 2);
    c.clip();
    let x = M;
    parts.forEach((p, i) => {
      const w = (p.percent / total) * barW;
      c.fillStyle = COMP_COLORS[i % COMP_COLORS.length];
      c.fillRect(x, y, w, barH);
      x += w;
    });
    c.restore();
    y += barH + 56;
    parts.forEach((p, i) => {
      c.fillStyle = COMP_COLORS[i % COMP_COLORS.length];
      c.beginPath();
      c.arc(M + 11, y - 12, 11, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#43453F';
      c.font = '500 38px "Familjen Grotesk", system-ui, sans-serif';
      c.fillText(String(p.place).slice(0, 34), M + 38, y);
      const pct = '~' + Math.round((p.percent / total) * 100) + '%';
      c.font = '500 34px "Familjen Grotesk", system-ui, sans-serif';
      c.fillStyle = '#74766D';
      c.fillText(pct, SHARE_W - M - c.measureText(pct).width, y);
      y += 60;
    });
    y -= 60;
  }

  // up to two evidence lines: the "how did it KNOW that" moment
  const evs = (Array.isArray(v.evidence) ? v.evidence : []).filter(Boolean).slice(0, 1);
  for (const ev of evs) {
    y += 40;
    c.fillStyle = '#E4EDEA';
    roundRect(c, M, y, SHARE_W - M * 2, 96, 16);
    c.fill();
    const evPx = fitText(c, ev, SHARE_W - M * 2 - 72, 34, '500 {px}px "Familjen Grotesk", system-ui, sans-serif');
    c.fillStyle = '#2A6B60';
    c.font = `500 ${evPx}px "Familjen Grotesk", system-ui, sans-serif`;
    c.fillText(ev, M + 36, y + 60);
    y += 96;
  }

  const endY = y;

  const fy = SHARE_H - 150;
  c.fillStyle = '#DEDAD1';
  c.fillRect(M, fy - 92, SHARE_W - M * 2, 2);
  drawMark(c, M, fy - 54, 60);
  c.fillStyle = '#1B1C19';
  c.font = '400 56px "Instrument Serif", Georgia, serif';
  c.fillText('Home', M + 78, fy);
  const hw = c.measureText('Home').width;
  c.fillStyle = '#2A6B60';
  c.font = 'italic 400 56px "Instrument Serif", Georgia, serif';
  c.fillText('Tongue', M + 78 + hw, fy);
  c.fillStyle = '#74766D';
  c.font = '500 34px "Familjen Grotesk", system-ui, sans-serif';
  const url = 'hometongue.me';
  c.fillText(url, SHARE_W - M - c.measureText(url).width, fy - 6);

  return { canvas: cv, endY };
}

function buildShareCanvas(v) {
  // A one-ingredient composition and a three-ingredient one leave very different amounts of
  // dead space above the footer, and dead space reads as unfinished. Measure, then centre.
  const probe = paintShare(v, 0);
  const slack = Math.max(0, (SHARE_H - 300) - probe.endY);
  return paintShare(v, Math.round(slack * 0.45)).canvas;
}

async function shareResult() {
  const v = window._lastResult;
  const btn = $('#shareBtn');
  if (!v || !v.place) { toast('Nothing to share yet. Do a take first.'); return; }
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'making your card…';
  try {
    // Fonts must be loaded before the canvas draws or it silently falls back to Times.
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const cv = buildShareCanvas(v);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    if (!blob) throw new Error('no blob');
    const file = new File([blob], 'hometongue.png', { type: 'image/png' });
    // The image only — no caption text. A pre-written sentence lands in whatever box the
    // share sheet opens (an Instagram caption, a friend's chat) and typing words into
    // someone's message for them is presumptuous; the card already carries the URL.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      btn.textContent = original;
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'hometongue.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      btn.textContent = 'card saved ✓';
      toast('Card saved to your downloads. Post it anywhere.');
    }
  } catch (e) {
    // AbortError just means they closed the share sheet; that is not a failure worth a toast.
    if (!e || e.name !== 'AbortError') toast('Could not make the card. Try again in a moment.');
    btn.textContent = original;
  } finally {
    btn.disabled = false;
  }
}

// Type-mode samples: one believable voice-note per language, dialect markers intact —
// Egyptian dalwa'ti, Levantine hallaq, Rioplatense che boludo, Austrian Paradeiser,
// Australian servo. Each should land in its home region, which the sweep verifies.
const SAMPLES = [
  { label: 'مصري', text: 'ايه يا عم عامل ايه؟ انا دلوقتي في البيت، مش عايز اعمل حاجة خالص، النهارده تعبان اوي بصراحة.' },
  { label: 'شامي', text: 'شو أخبارك؟ أنا قاعد بالبيت هلق، زهقان شوي وما عم أعمل شي. بدي روح عالسوق بعدين.' },
  { label: 'Español', text: 'Che boludo, ¿vos qué hacés? Acá en el laburo, un quilombo bárbaro, después te llamo.' },
  { label: 'Deutsch', text: 'Servus! I geh heuer im Jänner zum Wirt, dann kauf i no Paradeiser und Erdäpfel.' },
  { label: 'English', text: "Yeah nah mate, I reckon it's heaps good, gonna head to the servo this arvo." },
];


// The "so where are you actually from?" list. The answer is a point now, so this is only
// for the feedback record — every country we know, alphabetical.
function fillCountryPicker() {
  const sel = $('#fbActual');
  const names = Object.keys(COUNTRIES).map((c) => [c, COUNTRIES[c].en]).sort((a, b) => a[1].localeCompare(b[1]));
  sel.innerHTML = '<option value="">so what is it really?</option>'
    + names.map(([code, en]) => `<option value="${code}">${en}</option>`).join('');
}

// ————— feedback flywheel —————
function detectPlatform() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop';
}

// Returns true only if the row was actually sent, so the caller never marks an answer as
// recorded when it bailed — otherwise a retry after a lost result would be silently ignored.
function saveFeedback(correct, actual, actualCity) {
  const last = window._lastResult || {};
  // Donation is its own button now (it uploads the moment it is pressed — three takes in a
  // row were lost to the old tick-then-answer choreography). The feedback row only carries
  // consent so a donated clip's correction can store its transcript and cities server-side.
  const consent = !!window._donated;
  // State loss must SPEAK, not silently degrade — a suspended iOS tab once evaporated the
  // clip and verdict, and the click silently posted an all-null row.
  if (!last.place) {
    // Was: "gone from the page's memory because the tab was suspended". Two problems. It
    // explains an internal state in the app's own terms, and it asserts a cause the code never
    // checked — all it knows is that _lastResult has no place, not why.
    toast('That result is no longer loaded. Do a fresh take and answer again, and that one will count.');
    return false;
  }

  // local log (works offline, always; private-mode Safari throws on setItem — the server
  // post must not die with it)
  try {
    const log = JSON.parse(localStorage.getItem('hometongue_feedback') || '[]');
    // No transcript. Nothing in this codebase reads this log, so the words were being kept in
    // the browser forever to be read by nobody — and the privacy page has to promise something
    // about them either way. Not writing them is a shorter promise than explaining them.
    log.push({ ts: Date.now(), correct, actual, actualCity, guess: last.place || '', km_radius: last.radius_km || 0 });
    localStorage.setItem('hometongue_feedback', JSON.stringify(log));
  } catch { /* storage full or blocked — the server post below still counts */ }

  // flywheel: fire-and-forget to the server. guess_city carries the verdict place string;
  // guess_code stays for genuine ISO codes only (the old payload sent the place STRING as
  // guess_code and read last.city/last.regionKey, fields the view-model never set — every
  // row landed with null guess and empty region).
  const payload = {
    correct,
    actual_code: actual || '',
    actual_city: actualCity || '',
    guess_city: last.place || '',
    region: last.region || '',
    confidence: last.confidence || 0,
    // ONLY WITH CONSENT. api/feedback.js already refuses to store this without it (row.transcript
    // stays null), so nothing was ever kept — but it was still being posted on every single
    // "did I get it?" tap and then thrown away at the other end. Sending words we have promised
    // not to keep, and relying on the server to forget them, is a promise with a moving part in
    // it. Now the words do not leave the browser unless the person donated the clip.
    transcript: consent ? (last.transcript || '') : '',
    source: last.source || 'cloud',
    platform: detectPlatform(),
    consent,
  };
  // audio never rides the feedback post anymore — the donate button owns the upload

  const baseMsg = correct
    ? 'Logged ✓ every answer makes it sharper.'
    : 'Logged. This is exactly how it learns.';
  toast(baseMsg);

  fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((d) => {
      if (d.ok && d.stored === 'clip+labels') toast('Clip donated 🎁 shukran. It joins the pile future versions learn from.');
    })
    .catch(() => {});
  return true;
}

// ————— type mode —————
function enterTypeMode() {
  state = 'type';
  show('typeCard');
}

// ————— wire up —————
function bindUI() {
  const wave = $('#wave');
  for (let i = 0; i < 24; i++) wave.appendChild(document.createElement('i'));

  const handle = $('#sheetHandle');
  if (handle) handle.onclick = () => $('#resultCard').classList.toggle('peek');

  const samplesEl = $('#samples');
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.className = 'sample-btn';
    b.textContent = s.label;
    b.onclick = () => { $('#typeBox').value = s.text; runTextAnalysis(s.text, true); };
    samplesEl.appendChild(b);
  }

  fillCountryPicker();

  $('#micBtn').onclick = startListening;
  $('#stopBtn').onclick = stopListening;
  $('#restartBtn').onclick = restartListening;
  $('#typeModeBtn').onclick = enterTypeMode;
  $('#backToMicBtn').onclick = () => { state = 'idle'; show('idleCard'); };
  $('#analyzeTypedBtn').onclick = () => runTextAnalysis($('#typeBox').value, true);
  $('#againBtn').onclick = () => { state = 'idle'; show('idleCard'); flyHome(); };
  $('#shareBtn').onclick = shareResult;
  $('#redoBtn').onclick = () => { state = 'idle'; show('idleCard'); flyHome(); startListening(); };

  // A MISTAP MUST BE UNDOABLE.
  //
  // "nope" used to disable BOTH buttons the moment it was pressed — before anything had been
  // sent, because the nope path does not submit until you pick a country and press send. So one
  // wrong tap locked you out of an answer you had not actually given, with no way back. Neither
  // button locks now; the last thing you press is what stands.
  //
  // fbChoice stops an identical answer being posted twice while still allowing a real change of
  // mind through: pressing "nailed it" five times sends one row, but nope-then-nailed-it sends
  // the correction.
  $('#fbYes').onclick = () => {
    $('#fbFix').hidden = true;
    $('#fbNo').classList.remove('chosen');
    $('#fbYes').classList.add('chosen');
    if (fbChoice !== 'yes' && saveFeedback(true, '', '') !== false) fbChoice = 'yes';
  };
  $('#fbNo').onclick = () => {
    // Nothing is sent here — this only opens the correction row. "nailed it" stays live.
    $('#fbFix').hidden = false;
    $('#fbYes').classList.remove('chosen');
    $('#fbNo').classList.add('chosen');
  };
  $('#fbSend').onclick = () => {
    // `sel` used to be read from a variable that only ever existed inside fillCountryPicker,
    // so this handler threw a ReferenceError and every "nope" correction silently vanished.
    const sel = $('#fbActual');
    if (!sel.value) { toast('Pick the country first.'); return; }
    if (saveFeedback(false, sel.value, $('#fbCity').value.trim()) === false) return;
    fbChoice = 'no';
    // The row is in. Tuck the picker away, but leave both buttons live so a correction can
    // still be corrected.
    $('#fbFix').hidden = true;
  };

  // The donate button uploads the clip the INSTANT it is pressed. The old design armed a
  // checkbox that only fired when "nailed it" was clicked later — and lost three takes in a
  // row: one to an unexplained no-op, one to an iOS tab suspension, one to a reflexive "go
  // again". A button that does what it says, when it is pressed, cannot be misunderstood.
  $('#donateBtn').onclick = async () => {
    const db = $('#donateBtn');
    if (window._donated) return;
    if (!window._lastAudio || !window._lastResult) {
      toast('That recording is no longer in memory. Do a fresh take and press donate right after.');
      return;
    }
    // Snapshot the generation: if a new result renders while this upload is in flight, the
    // upload still completes for the OLD clip, but none of its outcomes may touch the new
    // card's button or the donated flag.
    const gen = window._renderGen;
    db.disabled = true; db.textContent = 'donating…';
    try {
      const last = window._lastResult;
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent: true,
          audio: window._lastAudio.audio,
          mime: window._lastAudio.mime,
          token: window._fbToken || '',
          guess_city: last.place || '',
          region: last.region || '',
          transcript: last.transcript || '',
          confidence: last.confidence || 0,
          source: last.source || 'cloud',
          platform: detectPlatform(),
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.ok) throw new Error('upload failed');
      if (gen !== window._renderGen) return;
      window._donated = true;
      // The server answers 'clip+labels' or 'labels', and returns ok:true either way. 'labels'
      // means the AUDIO did not store — a stale token, a mime it will not take, a size it refused
      // — and only the written correction landed. Saying "donated ✓ thank you" to that thanks
      // someone for a recording nobody received, and they walk away believing their voice is in
      // the pile when it is not.
      const gotClip = j.stored === 'clip+labels';
      db.classList.add('done');
      // "correction saved" was the wrong noun. They pressed DONATE; they did not correct
      // anything, and the word sent them looking for a correction they never made. Say the
      // thing that actually happened.
      db.textContent = gotClip ? 'donated ✓ thank you' : "clip didn't upload";
      if (!gotClip) toast('Your correction is saved, but the recording itself did not upload.');
    } catch {
      if (gen !== window._renderGen) return;
      db.disabled = false; db.textContent = 'donate this clip';
      toast('The donation didn’t go through. Try the button again.');
    }
  };
}

// Which answer is currently recorded, so the same one is never posted twice and a changed one
// always is. Reset with the rest of the feedback row on every new take.
let fbChoice = null;

initMap();
bindUI();

// A phone tab left open for days keeps running the JS it loaded, no matter what ships —
// Mohammad tested the Kuwait card hours after the city-first fix deployed and still saw the
// old region-first layout, because the page predated the deploy and was never reloaded. When
// the tab comes back to the foreground, compare this file's ETag against the one we loaded
// with; if the server has a newer build AND nothing is in progress, reload into it. Only ever
// fires from the idle card so it can never eat a recording or a result.
(() => {
  // Watch sw.js, not app.js: the version constant in sw.js bumps on EVERY release, while
  // app.js only changes when the app logic does. The first scroll fix shipped as pure
  // HTML/CSS, app.js kept its ETag, and phones on the broken page never reloaded.
  let loadedTag = null;
  const tagOf = () => fetch('/sw.js', { method: 'HEAD', cache: 'no-store' })
    .then((r) => r.headers.get('etag')).catch(() => null);
  tagOf().then((t) => { loadedTag = t; });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || state !== 'idle') return;
    tagOf().then((t) => {
      if (t && loadedTag && t !== loadedTag && state === 'idle') location.reload();
    });
  });
})();
