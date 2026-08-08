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
let audioCtx = null, analyser = null, rafId = null;
let timerId = null, startedAt = 0;
let micPeak = -1; // loudest rolling level seen this recording; -1 = meter unavailable
// Peak alone cannot tell speech from a door slam. A single cough clears a peak threshold and
// a whole recording of room tone then goes to the model, which answered one silent file with
// "Toronto, 75%, Canadian raising on 'night'" — invented phonetic evidence for audio that had
// none. Counting how many frames actually carried voice-level energy catches that case.
let micFrames = 0, micVoiced = 0;
const VOICE_LEVEL = 0.05;   // mean spectral level that ordinary speech clears
const MIN_VOICED_S = 1.5;   // less real speech than this is not placeable by anyone

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
  dropFn = () => {
    if (marker) return;
    glow = L.circle([g.lat, g.lng], {
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
  map.flyToBounds(L.latLng(g.lat, g.lng).toBounds(r * 2.6), { duration: 2.4, easeLinearity: 0.15 });
}

// The answer can be anywhere on Earth, so "home" is the world.
function flyHome() {
  clearMapExtras();
  ensureMapReady();
  map.flyToBounds(HOME_BOUNDS, { duration: 1.8 });
}

// ————— ui states —————
const cards = ['idleCard', 'liveCard', 'typeCard', 'analyzingCard', 'resultCard'];
function show(cardId) {
  for (const id of cards) $('#' + id).hidden = id !== cardId;
  // Stopping the ticker here rather than at each call site means no error path can leave it
  // running behind the result card. There are seven ways back to idle and only one of them
  // is success.
  if (cardId !== 'analyzingCard') stopScan();
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 3200);
}

const PROMPTS = [
  '"Tell me about your day."',
  '"How would you ask a friend: what\'s up, what are you doing?"',
  '"Complain about traffic like you\'re on the phone with your cousin."',
  '"Describe your last meal — was it good?"',
  '"What are you doing this weekend?"',
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
      bars.forEach((b, i) => {
        const v = data[Math.floor(i * data.length / bars.length / 2) + 2] / 255;
        b.style.transform = `scaleY(${0.15 + v * 1.1})`;
      });
      // your voice pushes isoglosses out across the map
      const level = sum / data.length / 255;
      if (level > 0.06 && Math.random() < level * 1.5) {
        const btn = $('#micBtn')?.getBoundingClientRect();
        field.pulse(btn ? btn.left + btn.width / 2 : undefined, btn ? btn.top + btn.height / 2 : undefined, Math.min(1, level * 3));
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

function startTimer() {
  startedAt = Date.now();
  // Reset, or a second recording starts still wearing the first one's badge.
  const q0 = $('#quality');
  if (q0) {
    q0.dataset.tier = '';
    q0.querySelectorAll('.q-dots i').forEach((d) => d.classList.remove('on'));
  }
  timerId = setInterval(() => {
    const s = Math.floor((Date.now() - startedAt) / 1000);
    // A countdown, not a stopwatch. The cap used to fire with no warning, which read as the
    // app crashing mid-sentence rather than a deliberate limit.
    const left = Math.max(0, MAX_SECONDS - s);
    $('#timer').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    const fill = $('#countFill');
    if (fill) fill.style.width = `${(s / MAX_SECONDS) * 100}%`;
    // The clock only tells time now. It used to also give advice, on different thresholds
    // than the quality meter below, so between 18s and 20s the two visibly contradicted each
    // other ("that's plenty, hit done whenever" against "10 more seconds helps a lot"). One
    // voice: the meter advises, the clock counts.
    const hint = $('#countHint');
    if (hint) hint.textContent = 'left';
    // Thresholds are the measured accuracy steps, not round numbers: the benchmark median is
    // 345 km at 8s, 157 km from 12-20s, and 67 km by 30s.
    const tier = s < 10 ? 0 : s < 20 ? 1 : s < 30 ? 2 : 3;
    const q = $('#quality');
    if (q && q.dataset.tier !== String(tier)) {
      q.dataset.tier = String(tier);
      q.querySelectorAll('.q-dots i').forEach((d, k) => d.classList.toggle('on', k < Math.max(1, tier)));
      $('#qLabel').textContent = ['rough — keep talking',
        'getting there — 10 more seconds helps a lot',
        'good read — you can stop here',
        'sharp — this is as good as it gets'][tier];
    }
    if (s >= MAX_SECONDS) stopListening();
  }, 250);
}

function stopTimer() {
  if (timerId) clearInterval(timerId), timerId = null;
}

// ————— the wait —————
// Measured: median 11.8s to a verdict, p90 28.7s. Nothing about that is fixable by sending
// less audio (8s of audio still takes 6.2s and wrecks accuracy, 67km -> 345km), so the wait
// is real and the job is to make it legible rather than to pretend it is short.
const SCAN_NOTES = [
  'listening to how you shape your vowels',
  'checking which consonants you soften',
  'weighing your rhythm and stress',
  'narrowing down the region',
  'still going — a long look usually means a close call',
];
let scanId = null;
function startScan() {
  const t0 = Date.now();
  let i = 0;
  const note = $('#scanNote'), el = $('#scanElapsed');
  if (note) note.textContent = SCAN_NOTES[0];
  if (el) el.textContent = '';
  scanId = setInterval(() => {
    const s = Math.round((Date.now() - t0) / 1000);
    if (el) el.textContent = ` · ${s}s`;
    // Advance roughly every 5s, then hold on the last line rather than looping forever,
    // because a cycling message eventually reads as broken too.
    const next = Math.min(SCAN_NOTES.length - 1, Math.floor(s / 5));
    if (next !== i && note) { i = next; note.textContent = SCAN_NOTES[i]; }
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

async function startListening() {
  if (state === 'listening' || state === 'analyzing' || state === 'starting') return; // double-tap guard
  state = 'starting';
  window._lastAudio = null;
  micPeak = -1; micFrames = 0; micVoiced = 0;
  const mime = pickMime();
  if (mime === null || !navigator.mediaDevices?.getUserMedia) {
    toast('This browser can\'t record audio — type mode instead 👇');
    enterTypeMode();
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast('Mic blocked — allow the microphone, or use type mode.');
    enterTypeMode();
    return;
  }
  if (state !== 'starting') { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; return; }
  state = 'listening';
  chunks = [];
  recMime = mime;
  $('#timer').textContent = '1:00';
  show('liveCard');
  startMeter(mediaStream);
  startTimer();

  recorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined);
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = onRecordingReady;
  recorder.start(500);
}

function stopListening() {
  if (state !== 'listening') return;
  state = 'analyzing';
  stopTimer();
  stopMeter();
  const elapsed = (Date.now() - startedAt) / 1000;
  if (elapsed < 2) {
    toast('That was barely a breath — give me a sentence or two.');
    state = 'idle';
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    teardownRecording();
    show('idleCard');
    return;
  }
  // Two different failures, two different fixes, so they get two different messages.
  // A dead mic is a settings problem; a quiet room is a "say more" problem.
  const voicedS = micFrames ? (micVoiced / micFrames) * elapsed : -1;
  if (micPeak >= 0 && micPeak < 0.02) {
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    teardownRecording();
    // There used to be a rescue here that fell back to the browser's live captions when the
    // recorder taped silence. Those captions are gone with the preview, so a dead mic is now
    // simply a dead mic — say so plainly instead of referencing variables that no longer exist.
    toast('Your mic barely picked anything up 🎤 — check Chrome\'s mic icon (address bar) is using the right microphone, then try again.');
    state = 'idle';
    show('idleCard');
    return;
  }
  // The mic works but almost nothing in the recording was voice. Refuse here rather than
  // spend a call and a 20-second wait on audio that can only produce a fabricated answer.
  if (voicedS >= 0 && voicedS < MIN_VOICED_S) {
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    teardownRecording();
    toast('I could hardly hear any talking 🤫 — get closer and say a couple of sentences.');
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

async function onRecordingReady() {
  const blob = new Blob(chunks, { type: recMime || 'audio/webm' });
  const mimeUsed = (recorder && recorder.mimeType) || recMime || 'audio/webm';
  teardownRecording();
  if (blob.size < 2000) {
    return fallbackOrFail('I didn\'t catch any audio.');
  }
  try {
    const audio = await blobToBase64(blob);
    window._lastAudio = { audio, mime: mimeUsed }; // kept for the consent flywheel
    const resp = await postAnalyze({ audio, mime: mimeUsed });
    renderResult(normalizeServer(resp));
  } catch (err) {
    fallbackOrFail(err && err.userMessage ? err.userMessage : 'The cloud engine is unreachable.');
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
  no_speech: "I couldn't hear any real speech in that — if the bars weren't moving while you talked, Chrome is probably using the wrong microphone (click the mic icon in the address bar).",
  not_configured: 'The server is missing its API key, so nothing can be analyzed. That is a setup problem, not your recording.',
  out_of_credit: 'The analysis account has run out of credit, so nothing can be read right now. Nothing is wrong with your recording — top up the Gemini billing and it works again immediately.',
  busy: 'The model is busy right now — give it a few seconds and try again.',
  upstream_failed: "The model didn't answer. Try again in a moment.",
  audio_too_short: 'That was too short to read anything from — give me a sentence or two.',
  audio_too_large: 'That recording was too long. Keep it under a minute.',
  rate_limited: 'Slow down a little — try again in a bit.',
  bad_origin: 'That request was blocked as coming from the wrong domain.',
};

async function postAnalyze(payload) {
  const resp = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.ok) {
    const err = new Error((data && data.error) || `http_${resp.status}`);
    // Say what actually went wrong. "The cloud engine is unreachable" was shown for a server
    // that was up and knew exactly what was missing, which made a one-line config fix look
    // like a mystery outage.
    err.userMessage = ERRORS[data && data.error] || '';
    throw err;
  }
  return data;
}

// ————— analysis paths —————
function runTextAnalysis(text, typed) {
  window._lastAudio = null;
  if (normText(text).length < 8) {
    toast('I barely got anything — give me a sentence or two.');
    state = 'idle';
    show(typed ? 'typeCard' : 'idleCard');
    return;
  }
  show('analyzingCard'); startScan();
  state = 'analyzing';
  postAnalyze({ text })
    .then((resp) => renderResult(normalizeServer(resp)))
    .catch(() => {
      // offline fallback: the local word-engine
      toast(e.userMessage || "That didn't work — try again.");
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
    lat: r.lat,
    lng: r.lng,
    radius_km: r.radius_km,
    language: r.language,
    conf: Math.max(0, Math.min(100, r.confidence | 0)),
    evidence: r.evidence || [],
    note: r.note || '',
    transcript: r.transcript || '',
    source: 'cloud',
  };
}


// ————— result rendering —————
function renderResult(v) {
  state = 'result';
  show('resultCard');
  $('#fbFix').hidden = true;
  $('#fbActual').value = '';
  $('#fbCity').value = '';
  $('#fbYes').disabled = false; $('#fbNo').disabled = false;
  $('#consentBox').disabled = false;
  $('#consentWrap').style.display = window._lastAudio ? '' : 'none'; // no clip to donate in type mode
  fillCountryPicker();

  const kicker = $('#resultKicker'), place = $('#resultRegion'), sub = $('#resultCountry');
  const evidence = $('#evidence'), runners = $('#runners'), heard = $('#heard');
  evidence.innerHTML = ''; runners.innerHTML = '';

  heard.hidden = !v.transcript;
  if (v.transcript) $('#heardText').textContent = v.transcript;
  $('#srcBadge').textContent = v.language ? v.language.toLowerCase() : '';

  kicker.textContent = 'sounds like you grew up around';
  place.textContent = v.place;

  // The server flags any recording where the speaker introduced themselves by name, because
  // the model reads foreign names as origin and will not admit it. Controlled test: identical
  // synthetic US speech, "my name is Vladislav" answered Moscow or Kyiv six times out of six,
  // while the same audio with no name, or with "Jake", answered United States.
  const warn = $('#nameWarn');
  if (warn) {
    warn.hidden = !v.name_led;
    if (v.name_led) warn.textContent = 'You said your name. Names drag the guess toward the name\'s home country, so take this one lightly and go again without saying it.';
  }

  // The accent as a recipe, rendered with the existing runner bars. For anyone who moved, or
  // grew up between languages, "one pin" is the wrong shape of answer and this is the true one.
  if (Array.isArray(v.influences) && v.influences.length) {
    const head = document.createElement('div');
    head.className = 'heard-head';
    head.innerHTML = '<span>the mix, by ear</span>';
    runners.appendChild(head);
    for (const inf of v.influences.slice(0, 3)) {
      if (!inf.place) continue;
      const row = document.createElement('div');
      row.className = 'runner';
      const pct = Math.min(100, Math.max(0, Math.round(inf.percent || 0)));
      row.innerHTML = '<span class="runner-name"></span>'
        + '<span class="runner-track"><span class="runner-fill" style="width:' + pct + '%"></span></span>'
        + '<span class="runner-pts">~' + pct + '%</span>';
      row.querySelector('.runner-name').textContent = inf.place;
      if (inf.cue) row.title = inf.cue;
      runners.appendChild(row);
    }
  }

  // The radius is the answer's honesty, so it gets the big number and a plain-English
  // reading of what that distance actually means.
  const r = v.radius_km;
  $('#radiusNum').textContent = r >= 1000 ? `${(r / 1000).toFixed(1)}k` : r;
  $('#radiusLead').textContent = r <= 50 ? 'and I mean that specifically — a town, not a region'
    : r <= 200 ? 'a confident guess at the area'
      : r <= 600 ? 'the accent gives me a region, not a town'
        : 'broad strokes — this accent is hard to place finely';
  sub.textContent = v.note || '';
  sub.hidden = !v.note;

  for (const e of v.evidence) evidence.appendChild(chip(e));

  flyToGuess(v);
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

// The nine with hand-written playbooks. The backend can handle any language Whisper
// identifies, but detection is unreliable enough on short clips that asking beats
// guessing — so the UI offers the tuned ones and the rest wait until they're measured.
// Third value is the BCP-47 tag for the browser's live-preview recogniser.
// Type-mode examples, one per curated language, kept here now that the Arabic lexicon
// engine that used to own them is gone.
const SAMPLES = [
  { label: 'مصري', text: 'ايه يا عم عامل ايه؟ انا دلوقتي في البيت، مش عايز اعمل حاجة خالص، النهارده تعبان اوي بصراحة.' },
  { label: 'شامي', text: 'شو أخبارك؟ أنا قاعد بالبيت هلق، زهقان شوي وما عم أعمل شي. بدي روح عالسوق بعدين.' },
  { label: 'Español', text: 'Che boludo, ¿vos qué hacés? Acá en el laburo, un quilombo bárbaro, después te llamo.' },
  { label: 'Deutsch', text: 'Servus! I geh heuer im Jänner zum Wirt, dann kauf i no Paradeiser und Erdäpfel.' },
  { label: 'English', text: "Yeah nah mate, I reckon it's heaps good, gonna head to the servo this arvo." },
];


// One source of truth for "what am I speaking", remembered between visits.
let pickedLang = null;

// A row of pills, each carrying the language's own script — العربية, Русский, 中文.
// The script IS the icon, which beats a flag (a language is not a country) and beats a
// dropdown (nine options do not need to be hidden behind a click).

// Changing it anywhere changes it everywhere: the recogniser tag, the Whisper language,
// the type box direction, and every other pill row on the page.



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

function saveFeedback(correct, actual, actualCity) {
  const last = window._lastResult || {};
  const consent = !!$('#consentBox').checked && !!window._lastAudio;

  // local log (works offline, always)
  const log = JSON.parse(localStorage.getItem('hometongue_feedback') || '[]');
  log.push({ ts: Date.now(), correct, actual, actualCity, guess: last.place || '', km_radius: last.radius_km || 0, transcript: last.transcript || '' });
  localStorage.setItem('hometongue_feedback', JSON.stringify(log));

  // flywheel: fire-and-forget to the server
  const payload = {
    correct,
    actual_code: actual || '',
    actual_city: actualCity || '',
    guess_code: last.place || '',
    guess_city: last.city || '',
    region: last.regionKey || '',
    confidence: last.conf || 0,
    transcript: last.transcript || '',
    source: last.source || 'cloud',
    platform: detectPlatform(),
    consent,
  };
  if (consent && window._lastAudio) {
    payload.audio = window._lastAudio.audio;
    payload.mime = window._lastAudio.mime;
    payload.token = window._fbToken || '';
  }

  const baseMsg = correct
    ? 'Logged ✓ — every answer is future training data.'
    : 'Logged — this is exactly how the real model gets trained.';
  toast(baseMsg);

  fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((d) => {
      if (d.ok && d.stored === 'clip+labels') toast('Clip donated 🎁 shukran — that trains the real model.');
    })
    .catch(() => {});
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
  $('#typeModeBtn').onclick = enterTypeMode;
  $('#backToMicBtn').onclick = () => { state = 'idle'; show('idleCard'); };
  $('#analyzeTypedBtn').onclick = () => runTextAnalysis($('#typeBox').value, true);
  $('#againBtn').onclick = () => { state = 'idle'; show('idleCard'); flyHome(); };

  $('#fbYes').onclick = () => { saveFeedback(true, '', ''); lockFeedback(); };
  $('#fbNo').onclick = () => { $('#fbFix').hidden = false; $('#fbNo').disabled = true; $('#fbYes').disabled = true; };
  $('#fbSend').onclick = () => {
    if (!sel.value) { toast('Pick the country first.'); return; }
    saveFeedback(false, sel.value, $('#fbCity').value.trim());
    lockFeedback();
  };

  const consentBox = $('#consentBox');
  consentBox.checked = localStorage.getItem('ht_consent') === '1';
  consentBox.onchange = () => localStorage.setItem('ht_consent', consentBox.checked ? '1' : '0');
}

function lockFeedback() {
  $('#fbYes').disabled = true;
  $('#fbNo').disabled = true;
  $('#fbFix').hidden = true;
  $('#consentBox').disabled = true;
}

initMap();
bindUI();
