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
// meterLoop and meterStream lived here until the linter pointed out that nothing has read either
// of them since the tab-pause mechanism was deleted. They were its other half: the loop was stored
// so it could be restarted on return, and the stream so it could be re-attached. Both were still
// being written on every take, describing a restart that no longer happens.
let audioCtx = null, analyser = null, rafId = null;
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
//
// ONLY THE FIRST RUNG COUNTS DOWN, and it is a live number rather than a written one. "10 more
// seconds" cannot tell you whether those ten seconds have started, which is the single thing you
// need to know while you are the one talking. It also left the screen counting for you all the way
// to twenty — the pill in the button ticks 20, 19, 18 — and then stopping dead at the exact moment
// the number started to matter. Now the countdown is handed from the pill to this label instead of
// being dropped.
//
// The later rungs stay qualitative on purpose. They have never carried a number, the steps they
// describe are worth about one clip in twenty-seven, and a second ticking number running beside
// the clock is the confusion that got the two-timer version scrapped.
const TIERS = [
  { at: 20, word: 'much closer guess', countdown: true },  // 44% within 100 km — the floor
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
// Telemetry is optional by construction: if js/telemetry.js failed to load, every call is a no-op.
const track = (e, p) => { if (window.HT && window.HT.track) window.HT.track(e, p); };
// Verdict latency measured in time the person was actually WAITING: polling pauses while the tab
// is hidden, so a 12s verdict collected after four minutes in another app is not a 240s verdict.
function waitClock() {
  const t0 = Date.now();
  let hidden = 0, hiddenAt = document.hidden ? t0 : 0;
  const onVis = () => { if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt) { hidden += Date.now() - hiddenAt; hiddenAt = 0; } };
  document.addEventListener('visibilitychange', onVis);
  return () => { document.removeEventListener('visibilitychange', onVis); if (hiddenAt) hidden += Date.now() - hiddenAt; return Date.now() - t0 - hidden; };
}

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
  // Same reasoning for the resend offer: retracted on EVERY card change, and re-raised by the one
  // caller entitled to raise it. Otherwise "send it again" survives on the idle card long after
  // the take it referred to was replaced, and the button lies about which recording it holds.
  const retry = $('#retryNote');
  if (retry) retry.hidden = true;

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
    let lastPulseAt = 0;
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
      // your voice pushes isoglosses out across the map.
      // A STEADY CADENCE, NOT A LOUDNESS-DRIVEN ONE. Loudness used to feed four multipliers at
      // once — spawn probability, brightness, growth speed, and (through the brightness decay)
      // lifetime — so the effect ramped far faster than the voice did and saturated into a wash
      // at ordinary speaking volume. Rate is now fixed at one ring per ~220ms while there is
      // voice at all, and loudness drives only how strong each ring is. A murmur and a shout
      // differ in weight, not in how busy the map gets.
      const level = sum / data.length / 255;
      if (level > 0.06 && performance.now() - lastPulseAt > 220) {
        lastPulseAt = performance.now();
        // TEST THE RECT, NOT THE OBJECT. While recording, the idle card holding #micBtn is hidden,
        // and a hidden element's getBoundingClientRect() is all zeros — but still an object, so the
        // truthiness check passed and every ring fired from (0,0). The centred default this was
        // written to fall back on could never engage, so for the whole take the contours crawled
        // out from behind the top-left corner instead of radiating from the middle of the screen.
        const btn = $('#micBtn')?.getBoundingClientRect();
        const live = btn && btn.width > 0 && btn.height > 0;
        field.pulse(live ? btn.left + btn.width / 2 : undefined, live ? btn.top + btn.height / 2 : undefined, Math.min(1, level * 3));
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
  } catch { /* no meter, no problem */ }
}

function stopMeter() {
  if (rafId) cancelAnimationFrame(rafId), rafId = null;
  if (audioCtx) audioCtx.close().catch(() => {}), audioCtx = null;
}

// ————— SWITCHING TABS DOES NOT STOP THE RECORDING —————
//
// It used to. Backgrounding paused the recorder, the meter and the clock, on the reasoning that
// audio captured while nobody is present is room tone, and this project has measured padding a
// take with silence dragging the answer around badly.
//
// That reasoning was about accuracy and ignored the person. Mohammad played a clip into the mic,
// switched tabs, came back — and found the take had quietly stopped. Worse, the waveform was
// frozen, so there was no way to tell whether it was still hearing anything. A recording that
// stops without saying so is a worse failure than a slightly padded one: the padded take still
// produces an answer, and the silent stop produces confusion and a lost take.
//
// It also assumed backgrounding means "gone", which is not true. Playing audio from another app,
// reading something while talking, or checking a message mid-sentence are all normal, and in all
// of them the microphone should keep doing what it was told to do.
//
// So nothing is paused now. The browser still freezes requestAnimationFrame while the tab is
// hidden — that is not ours to change — but because the loop is never CANCELLED, it resumes on its
// own the moment the tab is visible again, and the waveform simply carries on. The clock is
// computed from wall time, so it self-corrects on the same tick. The sixty-second cap is enforced
// by that tick, which means a take that ran long while hidden is stopped immediately on return.
//
// The cost is real and it is the trade Mohammad chose knowingly: audio recorded while you are away
// is room tone, and enough of it can pull the answer around.

function startTimer() {
  startedAt = Date.now();
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
  timerId = setInterval(tick, 250);
}


function tick() {
  {
    // No gap correction any more. It credited frozen time back to startedAt, which was right when
    // a hidden tab meant a PAUSED recorder — that time was not audio. Now the recorder keeps
    // running while hidden, so those seconds are real recorded audio and subtracting them would
    // make the clock claim less speech than the take actually holds.
    const s = Math.floor((Date.now() - startedAt) / 1000);
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
      // The dots only move when a rung is actually crossed, so they stay out of the per-second work.
      if (q.dataset.earned !== String(earned)) {
        q.dataset.earned = String(earned);
        [...$('#dots').children].forEach((d, i) => {
          d.classList.toggle('on', i < earned);
          // The one you are working toward, so the row always points somewhere.
          d.classList.toggle('next', i === earned);
        });
      }
      // The label is computed every tick because one rung's text contains a number that moves.
      // Written only when the STRING changes, not every 250ms: this runs four times a second and
      // an unconditional textContent write would relayout the row on every one of them.
      const w = $('#tierWord');
      if (w) {
        const shown = earned ? TIERS[earned - 1] : null;
        const next = TIERS[earned];
        let text = 'keep talking';
        if (shown) {
          const togo = next ? next.at - s : 0;
          text = shown.countdown && next
            ? `${togo} more second${togo === 1 ? '' : 's'}, ${shown.word}`
            : shown.word;
        }
        if (w.textContent !== text) w.textContent = text;
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
  track('rec_start');
  chunks = [];
  recMime = mime;
  show('liveCard');
  startMeter(mediaStream);
  startTimer();

  try {
    recorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined);
  } catch {
    stopTimer(); stopMeter(); teardownRecording();
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
  track('rec_restart', { s: Math.round((Date.now() - startedAt) / 1000) });
  if (state !== 'listening') return;
  stopTimer();
  stopMeter();
  if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
  teardownRecording();
  state = 'idle';
  show('idleCard');
}

function stopListening() {
  if (state === 'listening') track('rec_stop', { s: Math.round((Date.now() - startedAt) / 1000) });
  if (state !== 'listening') return;
  state = 'analyzing';
  // CAPTURED BEFORE stopMeter(), which sets audioCtx to null. The guard further down reads
  // audioCtx to decide whether the meter's reading can be trusted — and read it AFTER this
  // teardown, so it was unconditionally true and micPeak was unconditionally reset to -1. The
  // dead-microphone branch below could therefore never run, not once.
  //
  // What that cost: someone whose mic is muted, covered, or set to the wrong input fell through
  // to the next check and was told "I could hardly hear any talking — get closer and say a couple
  // of sentences". So they lean in and speak up, into a microphone that is not recording anything,
  // and get the same message again. The one message that would have fixed it was unreachable.
  const meterRan = !!audioCtx && audioCtx.state === 'running';
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
  if (!meterRan) micPeak = -1;

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

// ————— PICKING A TAKE BACK UP —————
//
// Submitting starts a 12-29 second call, and nobody watches a phone for that. They go to Messages,
// or another window, and the tab gets suspended with the answer half-computed. Before this, coming
// back meant sending the whole recording again and waiting the whole wait again.
//
// So every take gets an id and a key, both minted here, both written down BEFORE the audio is sent.
// The server keeps the answer sealed with that key. Coming back — even to a page that was
// completely reloaded, with the recording long gone from memory — the id and key are still in
// localStorage, and a few hundred bytes fetches the finished verdict.
//
// The key never leaves this browser except to open something that belongs to it, and it is thrown
// away the moment the answer is in hand. The server holds bytes it cannot read.
const PENDING_KEY = 'hometongue_pending_take';
const PENDING_MAX_AGE_MS = 30 * 60 * 1000;   // matches the server's own window

function mintTake() {
  const rnd = new Uint8Array(32);
  crypto.getRandomValues(rnd);
  const take = {
    // HEX ONLY, because the server validates against /^[0-9a-f-]{8,40}$/i. The fallback used to
    // start "tk-", and t and k are not hex — so on any browser without crypto.randomUUID (older
    // iOS Safari, some in-app webviews) EVERY take was rejected: the id failed validation, the
    // answer was never stored, the poll never found it, and after the full budget the person was
    // told it was taking longer than it should. A whole class of device, failing identically.
    id: (crypto.randomUUID ? crypto.randomUUID()
      : Date.now().toString(16) + '-' + Math.random().toString(16).slice(2, 10) + '-' + Math.random().toString(16).slice(2, 10)),
    key: btoa(String.fromCharCode(...rnd)),
    ts: Date.now(),
  };
  // Written down BEFORE the request goes out. Writing it after would lose exactly the takes this
  // exists for: the ones where the connection dies before a response ever arrives.
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(take)); } catch { /* private mode */ }
  return take;
}

function pendingTake() {
  try {
    const t = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
    if (!t || !t.id || !t.key) return null;
    if (Date.now() - (t.ts || 0) > PENDING_MAX_AGE_MS) { clearPendingTake(); return null; }
    return t;
  } catch { return null; }
}

function clearPendingTake() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to do */ }
}

// A few hundred bytes: the id and the key, NO AUDIO. That absence is not incidental — the server
// only treats a request as a collection when there is no audio and no text on it, because a body
// carrying audio is someone asking for a fresh answer. Sending the recording again on a retry is
// therefore a full second model call for a verdict that is already sitting there finished.
// Returns the answer, or null if the server has nothing under that id.
async function collectTake(id, key) {
  if (!id || !key) return null;
  try {
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ take_id: id, take_key: key }),
      signal: AbortSignal.timeout(12_000),
    });
    const data = await r.json().catch(() => null);
    // THREE OUTCOMES, AND CONFLATING ANY TWO OF THEM HAS ALREADY BROKEN THIS FEATURE TWICE.
    //
    //   an object   the server DELIVERED an answer. ok:true is a verdict; ok:false is a refusal it
    //               reached and stored on purpose (no_speech, upstream_failed). BOTH are final and
    //               both have to reach the person. This used to return null for ok:false, so a
    //               refusal decided in twelve seconds became four minutes of spinner followed by
    //               "that is taking longer than it should" — a message about the wrong thing.
    //   'pending'   nothing stored under that id YET. The work may still be running. NOT terminal.
    //               This used to be called 'gone', and the page-load path deleted the key on it,
    //               destroying a take whose answer was sitting finished on the server.
    //   null        the request itself failed. Ask again.
    if (r.status === 404) return 'pending';
    if (data) return data;
  } catch { /* offline or slow */ }
  return null;
}

// WAITING FOR AN ANSWER THAT IS BEING MADE SOMEWHERE ELSE.
//
// The server no longer answers on the connection it was asked on. It starts the work, replies
// "pending" in about a second, and finishes under waitUntil whether or not this page is still
// listening. So the wait is a poll, and that is what makes leaving harmless: a poll that dies
// while the phone is in a pocket is just a poll, and the next one gets the finished answer.
//
// Slow at first, then patient. The median analysis is ~12s and the p90 is ~29s, so hammering the
// first ten seconds is pure noise; after that the interval widens. The overall budget is generous
// because someone who walked away has not stopped wanting their answer.
async function pollForTake(id, key, onTick) {
  // MEASURED IN TIME SPENT LOOKING, not wall time. Someone who puts the phone down for five
  // minutes must not come back to an expired budget — while they were away, nothing was waiting.
  //
  // AND BOUNDED BY WHAT THE SERVER CAN STILL DO. This was twenty-eight minutes, matched to how
  // long an answer is KEPT — but that is the wrong number, because a job that is going to deliver
  // delivers inside sixty seconds: api/analyze.js budgets itself 50s and Vercel kills the function
  // at 60. So if we have been LOOKING at this for ninety seconds and it is still pending, the work
  // did not merely take a while, it died — and the old ceiling meant watching "still going, hang
  // tight" for another twenty-six and a half minutes to find that out. Reported at 160 seconds
  // from a real phone, which is exactly this.
  //
  // Ninety seconds of watched time only. Away time still costs nothing, so leaving and coming back
  // to a finished answer is unaffected: that first poll returns it immediately.
  const BUDGET_MS = 90 * 1000;
  let watched = 0;
  let wait = 1200;
  while (watched < BUDGET_MS) {
    const sleptFrom = Date.now();
    // RACED AGAINST COMING BACK, which is the difference between "it was there" and "it appeared
    // after a while". A hidden tab throttles setTimeout to about once a MINUTE, so a plain sleep
    // means returning to the page and then waiting up to another minute for the next tick — on
    // an answer that has been sitting finished the whole time. Becoming visible cuts the sleep
    // short and polls immediately.
    await Promise.race([
      new Promise((r) => setTimeout(r, wait)),
      new Promise((r) => {
        const back = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', back); r(); } };
        document.addEventListener('visibilitychange', back);
        setTimeout(() => document.removeEventListener('visibilitychange', back), wait + 50);
      }),
    ]);
    wait = Math.min(4000, Math.round(wait * 1.25));
    // A hidden tab's fetches die anyway, so asking costs a failed request and gains nothing.
    if (document.hidden) continue;
    watched += Date.now() - sleptFrom;
    const got = await collectTake(id, key);
    if (got && got !== 'pending') {
      // DELIVERED, whatever it says. A refusal the server reached and stored is an answer and has
      // to be reported as itself — this used to fall through and keep polling for something that
      // had already arrived, and the row had been deleted on that very collect, so every later
      // poll saw 'pending' forever and the person got a timeout message about the wrong thing.
      if (got.ok) return got;
      throw Object.assign(new Error(got.error || 'server_error'), {
        userMessage: ERRORS[got.error] || got.detail || '',
      });
    }
    if (onTick) onTick(Math.round(watched / 1000));
  }
  // RETRYABLE, deliberately without a userMessage. analyzeResilient treats a message as "the
  // server answered" and stops — but nothing answered here, the job vanished. Marked so the loop
  // re-sends the recording we are still holding, under a fresh id, rather than making someone who
  // already spoke for thirty seconds do it again because a serverless invocation died.
  throw Object.assign(new Error('take_lost'), { retryable: true });
}

// The page-load path. This is the one that runs after a phone evicted the tab, so it is the last
// thing standing between a person and a take they already spoke.
//
// IT MUST NOT GIVE UP ON 'pending'. It used to: one ask, and a 404 meant "gone", so it deleted the
// key. But 404 also means "still being analysed", and the analysis runs 12-29s — so tapping the
// header nav mid-wait, or a reload, or an eviction inside that window, destroyed the only copy of
// the key while the finished answer sat sealed on the server for another thirty minutes,
// unopenable by anyone including us. The exact case the feature exists for.
async function collectPendingTake() {
  const t = pendingTake();
  if (!t) return null;
  // The head script may already have this in flight, or finished, from before this file parsed.
  // Taking its result instead of firing a second identical request is the whole point of it.
  let got = null;
  if (window.__htCollect) {
    const head = await window.__htCollect;
    window.__htCollect = null;
    if (head && head.json) got = head.status === 404 ? 'pending' : head.json;
    else if (head && head.status === 404) got = 'pending';
  }
  if (!got) got = await collectTake(t.id, t.key);

  if (got && got !== 'pending') {
    clearPendingTake();
    if (got.ok) return got;
    throw Object.assign(new Error(got.error || 'server_error'), {
      userMessage: ERRORS[got.error] || got.detail || '',
    });
  }

  if (got === 'pending') {
    // Still being made. Wait for it exactly as the in-page path does, rather than throwing away
    // the key. pollForTake gives up only after its own budget, and pendingTake() has already
    // refused anything older than the server's window, so this cannot wait on a dead take.
    const answer = await pollForTake(t.id, t.key);
    clearPendingTake();
    return answer;
  }

  // Only a genuine request failure reaches here. Those leave the take pending on purpose, because
  // the next load may well succeed — but not forever: one unreachable take would otherwise make
  // every future visit open on the analysing card. Three goes, then it is let go.
  try {
    const still = pendingTake();
    if (still) {
      still.tries = (still.tries || 0) + 1;
      if (still.tries >= 3) clearPendingTake();
      else localStorage.setItem(PENDING_KEY, JSON.stringify(still));
    }
  } catch { /* private mode: nothing was stored, so nothing nags */ }
  return null;
}

async function onRecordingReady() {
  if (takeHandled) return;
  takeHandled = true;
  // A spontaneous stop (phone call, Siri, the OS reclaiming the mic) arrives here while
  // state is still 'listening', with the countdown and meter still running and the live
  // card still up. Clean up and analyze whatever was captured — a take interrupted at 20
  // seconds is still a take; the blob-size gate below catches the ones that aren't.
  if (state === 'listening') {
    stopTimer(); stopMeter();
    // ...but apply the SAME floor a manual stop applies. The comment above says an interrupted
    // 20-second take is still a take, and that is true — the problem is that nothing here checked
    // it was 20 seconds. A call that lands four seconds in was analysed anyway, so the one path
    // the user did not choose was the one that skipped the rule the whole app is built around,
    // and they got a country-scale guess presented with the same confidence as a real one.
    //
    // Plain wall time is correct again now that nothing pauses: every second between starting and
    // being interrupted is a second the recorder was running, so all of it is audio in the blob.
    const cutShort = (Date.now() - startedAt) / 1000;
    if (cutShort < MIN_RECORD_S) {
      track('rec_cut_short', { s: Math.round(cutShort) });
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
    return fallbackOrFail(`I didn't catch any audio. ${RETRY_TAIL}`);
  }
  let audio;
  try {
    audio = await blobToBase64(blob);
  } catch (err) {
    const code = err && err.message ? String(err.message).slice(0, 40) : 'unknown';
    return fallbackOrFail(`Something went wrong on our end. (${code} · ${mimeUsed || 'no mime'}) ${RETRY_TAIL}`);
  }
  window._lastAudio = { audio, mime: mimeUsed }; // kept for the consent flywheel, and for a resend
  await runAnalysis(audio, mimeUsed);
}

// The analysis itself, reached two ways: when a take finishes, and again from "send it again"
// after a failure that was never about the audio. A FRESH take id each time, because the previous
// one may already have a stored refusal filed against it and a collect would hand that straight
// back instead of running the work.
async function runAnalysis(audio, mimeUsed) {
  const waited = waitClock();
  track('analyze_submit', { kind: 'audio', s: Math.round((Date.now() - startedAt) / 1000) });
  try {
    const take = mintTake();
    const resp = await analyzeResilient({ audio, mime: mimeUsed, take_id: take.id, take_key: take.key });
    clearPendingTake();
    track('analyze_result', { kind: 'audio', ms: waited(), deferred: !!(resp && resp.collected) });
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
    track('analyze_fail', { kind: 'audio', code, ms: waited() });
    fallbackOrFail(why || `Something went wrong on our end. (${code} · ${mimeUsed || 'no mime'}) ${RETRY_TAIL}`, code);
  }
}

// There is no offline fallback any more: the Arabic lexicon engine is gone and there are
// no live captions to salvage, so a failure is just a failure. Say so and let them retry.
//
// "Try again" is only appended when trying again MEANS recording again. When the take itself is
// still good and can simply be resent, the card carries that offer instead.
//
// The message arrives FINISHED. This used to append "Try again, or use type mode." to whatever it
// was handed, including the server's own messages, which each already end with their own
// instruction — so a failed take read "...then try again. Try again, or use type mode." Advice is
// now written where it is known to be missing (see RETRY_TAIL) instead of stapled on at the end.
function fallbackOrFail(reason, code) {
  const resend = RESENDABLE.has(code) && !!(window._lastAudio && window._lastAudio.audio);
  toast(reason);
  state = 'idle';
  show('idleCard');
  showRetry(resend);
}

// One place decides whether the offer is on screen, so no path can leave it showing over a take
// that has already been resent, replaced or thrown away.
function showRetry(on) {
  const note = $('#retryNote');
  if (note) note.hidden = !on;
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
  // Carries its own way out, because this is the message a broken microphone produces and typing
  // is the only route left for that person.
  no_speech: "I couldn't hear any real speech in that. Check the right microphone is selected and this site has permission, then try again or type instead.",
  not_configured: 'The server is missing its API key, so nothing can be analyzed. That is a setup problem, not your recording.',
  out_of_credit: 'The analysis account has run out of credit, so nothing can be read right now. Nothing is wrong with your recording.',
  // "press record again" until the resend offer existed, which contradicted the button sitting
  // underneath it telling them the take they already gave was fine to send back.
  swamped: 'A lot of people are listening right now. Give it about thirty seconds and try again. Your voice was fine.',
  busy: 'The model is busy right now. Give it a few seconds and try again.',
  upstream_failed: "The model didn't answer. Try again in a moment.",
  audio_too_short: 'That was too short to read anything from. Give me a sentence or two.',
  audio_too_large: 'That recording was too big to send. Try a slightly shorter take.',
  text_too_long: 'That was much longer than needed. A sentence or two is plenty.',
  rate_limited: 'Slow down a little, try again in a bit.',
  at_capacity: 'HomeTongue has hit its listening limit for today. It resets at midnight UTC.',
  bad_origin: 'That request was blocked as coming from the wrong domain.',
};

// FAILURES THAT SAY NOTHING ABOUT THE RECORDING, so the recording is kept and offered back.
//
// These two were handled identically until now, and they are opposites:
//   no_speech        the model LISTENED and there was nothing there. Sending the same bytes
//                    again spends a second call to be told the same thing. Correctly final.
//   upstream_failed  the model never answered at all. Sending the same bytes again is exactly
//                    the right move, and it was throwing the take away instead.
// The cost of getting this wrong is not abstract: a stranger who has just talked for a minute
// gets asked to do the whole thing again because of a hiccup at Google.
//
// The size and length codes stay out for the same reason no_speech does — they are judgements
// about the audio, and identical bytes fail identically. So do out_of_credit, at_capacity and
// rate_limited, which are all real but where a resend now cannot succeed either; offering a
// button that is guaranteed to fail is worse than not offering one.
const RESENDABLE = new Set([
  'upstream_failed', 'busy', 'swamped', 'server_error', 'timeout', 'take_lost',
  'http_500', 'http_502', 'http_503', 'http_504',
]);

// ADDED BY THE CALLER, not by fallbackOrFail, because only the caller knows whether the message it
// is passing already says what to do. Every message in ERRORS above ends with its own instruction,
// and appending this to them on the way out produced the app saying it twice in one breath:
// "...then try again. Try again, or use type mode." This tail now belongs only to the generic
// messages written here, which end with a diagnostic code and no advice at all.
const RETRY_TAIL = 'Try again, or use type mode.';

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
        const first = await postAnalyze(payload, kill.signal);
        // "pending" means the upload landed and the work is now running somewhere that does not
        // care whether this page survives. From here the recording has done its job — everything
        // after is a few hundred bytes at a time, which is what makes walking away safe.
        if (first && first.pending) {
          const answer = await pollForTake(payload.take_id, payload.take_key);
          // Cleared HERE rather than at each call site. It was cleared after the audio path and
          // not after the typed one, so a typed take stayed marked pending and the next page load
          // opened on the analysing card chasing an answer it had already shown.
          clearPendingTake();
          return answer;
        }
        return first;
      } catch (err) {
        document.removeEventListener('visibilitychange', onReturn);
        // The server got the audio and made a judgement about it. Sending it again cannot change
        // that answer, and would spend a second call to hear it.
        // A LOST TAKE IS NOT AN ANSWER. The job died before storing anything, so there is nothing
        // to collect and nothing to explain — but the recording is still in this payload. Mint a
        // fresh id and send it again rather than ending the take.
        if (err && err.retryable && attempt < MAX_TRIES) {
          const fresh = mintTake();
          payload = { ...payload, take_id: fresh.id, take_key: fresh.key };
          const note0 = $('#scanNote');
          if (note0) note0.textContent = 'that one did not come back, trying again';
          continue;
        }
        const serverAnswered = err && err.userMessage && err.message !== 'timeout';
        if (serverAnswered || attempt >= MAX_TRIES) {
          if (err && err.retryable) {
            err.userMessage = 'That take did not come back from the server. Give it another go.';
          }
          throw err;
        }
        // A superseded attempt cost nothing and proves the page is back, so it goes straight
        // round again without the settling pause a real network failure earns.
        if (err && err.superseded) { attempt -= 1; continue; }

        await untilVisible();

        // ASK FOR THE ANSWER BEFORE ASKING FOR ANOTHER ONE.
        //
        // This retry loop used to re-send the whole payload, audio and all — and a body with audio
        // on it is, correctly, read by the server as a request for a fresh analysis. So the take
        // that had already been analysed got analysed a second time, and the person who came back
        // watched "picking up where we left off" for another twelve to thirty seconds while the
        // finished verdict sat in the database untouched. The store was working; nothing was
        // asking it.
        //
        // A few hundred bytes settle it first. If the server has the answer, this returns in about
        // a third of a second. If it does not — the invocation died before it could store, or the
        // window has passed — the loop falls through and re-sends the recording as it always did.
        if (payload.take_id && payload.take_key) {
          const kept = await collectTake(payload.take_id, payload.take_key);
          if (kept && kept !== 'pending') {
            clearPendingTake();
            if (kept.ok) return kept;
            // A refusal that was already reached and stored. Re-sending the audio would spend a
            // second call to be told the same thing.
            throw Object.assign(new Error(kept.error || 'server_error'), {
              userMessage: ERRORS[kept.error] || kept.detail || '',
            });
          }
        }

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
  // One call, one object. Reading it back with pendingTake() would return null in private mode,
  // where localStorage.setItem throws, and then .key would throw on top of it.
  const waited = waitClock();
  track('analyze_submit', { kind: 'text', s: 0 });
  analyzeResilient({ text, ...(() => { const t = mintTake(); return { take_id: t.id, take_key: t.key }; })() })
    .then((resp) => {
      track('analyze_result', { kind: 'text', ms: waited(), deferred: !!(resp && resp.collected) });
      renderResult(normalizeServer(resp));
    })
    .catch((e) => {
      track('analyze_fail', { kind: 'text', code: String((e && e.message) || 'unknown').slice(0, 40), ms: waited() });
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
    $('#redoText').textContent = 'Everything I could point to was something you told me rather than something I heard in your voice. That is not a reading, so I would rather give you nothing than make it up. Try once more, thirty seconds or so, without saying your name or where you are from.';
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
  // The INCREMENT is the whole mechanism; the async callers each snapshot it themselves. A local
  // copy was taken here too and never read, because renderResult is entirely synchronous and has
  // nothing of its own that could land late.
  window._renderGen = (window._renderGen || 0) + 1;
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

  // "WHAT WE HEARD" ONLY WHEN SOMETHING WAS HEARD. In type mode there is no audio at all — the
  // model is handed text and told to judge from vocabulary alone — so the transcript it returns is
  // just the sentence the person typed, echoed back to them under a heading claiming it was heard.
  // Silly on its face, and the same untruth as the analysing card telling a typed user it was
  // listening to their vowels, which was fixed earlier tonight for exactly this reason.
  const fromAudio = !!window._lastAudio;
  heard.hidden = !v.transcript || !fromAudio;
  if (v.transcript && fromAudio) $('#heardText').textContent = v.transcript;
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
  track('share_tap', { how: navigator.share ? 'native' : 'download' });
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


// The verdict's country as an ISO code, for the anonymous scorecard. The place string ends in
// the country's English name ("Amman, Jordan" -> "Jordan"), and COUNTRIES maps names to codes.
// Null when the tail is not a known country (a bare region like "the Levant"), which stores the
// same nothing as before rather than a wrong code.
function guessCountryCode(place) {
  const tail = String(place || '').split(',').pop().trim().toLowerCase();
  if (!tail) return '';
  for (const code of Object.keys(COUNTRIES)) {
    if (COUNTRIES[code].en.toLowerCase() === tail) return code;
  }
  return '';
}

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
  //
  // guess_code is DERIVED here, because without it the anonymous scorecard has no guess side at
  // all: 177 real did-I-get-it answers came back reading "guessed ? -> actually US", which is a
  // correction dataset missing its left half. The privacy page promises country-level only
  // without consent, and the verdict's country is exactly that — the place string ends in the
  // country's English name, which maps back to its ISO code through the same COUNTRIES table
  // the correction picker is built from.
  const payload = {
    correct,
    actual_code: actual || '',
    actual_city: actualCity || '',
    guess_code: guessCountryCode(last.place),
    guess_city: last.place || '',
    region: last.region || '',
    confidence: last.conf || 0,
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

  track('feedback', { correct: !!correct });
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
  track('type_mode');
  state = 'type';
  show('typeCard');
}

// ————— wire up —————
function bindUI() {
  const wave = $('#wave');
  for (let i = 0; i < 24; i++) wave.appendChild(document.createElement('i'));

  const handle = $('#sheetHandle');
  if (handle) handle.onclick = () => $('#resultCard').classList.toggle('peek');


  fillCountryPicker();

  // AN ANSWER LEFT WAITING FROM LAST TIME.
  //
  // This is the case nothing else could reach. iOS does not just suspend a backgrounded tab, it
  // eventually evicts it, and coming back reloads the page from nothing — the recording, the
  // in-flight request and every variable holding them are gone. Retrying was never possible
  // because there was nothing left to retry with.
  //
  // The id and key outlive all of that in localStorage, and the finished verdict is sitting on the
  // server sealed with that key. So: submit, put the phone in your pocket, come back to a page
  // that has completely reloaded, and the answer is there.
  //
  // Runs behind the analysing card so the wait reads as continuous rather than as the app having
  // forgotten. If nothing is waiting, the card never shows and this costs one localStorage read.
  if (pendingTake()) {
    show('analyzingCard');
    startScan();
    const note = $('#scanNote');
    if (note) note.textContent = 'fetching the answer we already worked out';
    const pendingSince = (pendingTake() || {}).ts || Date.now();
    collectPendingTake().then((data) => {
      stopScan();
      if (data) {
        track('analyze_result', { kind: window._lastAudio ? 'audio' : 'text', ms: Date.now() - pendingSince, deferred: true });
        state = 'idle'; renderResult(normalizeServer(data)); return;
      }
      state = 'idle';
      show('idleCard');
    }).catch(() => { stopScan(); state = 'idle'; show('idleCard'); });
  }

  $('#micBtn').onclick = startListening;
  // Resend the take that is still in memory. Straight back to the analysing card, because from
  // the speaker's side this is the same wait they were already in, not a new thing they started.
  $('#retryBtn').onclick = () => {
    track('resend_tap');
    const last = window._lastAudio;
    if (!last || !last.audio) return showRetry(false);
    showRetry(false);
    state = 'analyzing';
    show('analyzingCard');
    startScan();
    runAnalysis(last.audio, last.mime);
  };
  $('#stopBtn').onclick = stopListening;
  $('#restartBtn').onclick = restartListening;
  $('#typeModeBtn').onclick = enterTypeMode;
  $('#backToMicBtn').onclick = () => { state = 'idle'; show('idleCard'); };
  $('#analyzeTypedBtn').onclick = () => runTextAnalysis($('#typeBox').value, true);
  $('#againBtn').onclick = () => { state = 'idle'; show('idleCard'); flyHome(); };
  $('#shareBtn').onclick = shareResult;
  // Counted, not intercepted: these stay plain links and the beacon survives the navigation.
  const nextUp = document.querySelector('.next-up');
  if (nextUp) nextUp.addEventListener('click', () => track('nextup_tap'));
  const tipBtn = document.querySelector('.tip-btn');
  if (tipBtn) tipBtn.addEventListener('click', () => track('tip_tap', { where: 'result' }));
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
          confidence: last.conf || 0,
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
      track('donate', { ok: gotClip });
      db.classList.add('done');
      // "correction saved" was the wrong noun. They pressed DONATE; they did not correct
      // anything, and the word sent them looking for a correction they never made. Say the
      // thing that actually happened.
      db.textContent = gotClip ? 'donated ✓ thank you' : "clip didn't upload";
      if (!gotClip) toast('Your correction is saved, but the recording itself did not upload.');
    } catch {
      track('donate', { ok: false });
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
