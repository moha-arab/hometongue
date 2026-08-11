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
  map.flyToBounds(bounds, {
    duration: 2.4, easeLinearity: 0.15,
    paddingTopLeft: [peeking ? 12 : cardRight + 28, 84],
    paddingBottomRight: [peeking ? 12 : 28, peeking ? Math.round(window.innerHeight * 0.46) : 28],
  });
}

// The answer can be anywhere on Earth, so "home" is the world.
function flyHome() {
  clearMapExtras();
  ensureMapReady();
  map.flyToBounds(HOME_BOUNDS, { duration: 1.8 });
}

// ————— ui states —————
const cards = ['idleCard', 'liveCard', 'typeCard', 'analyzingCard', 'redoCard', 'resultCard'];
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
      $('#qLabel').textContent = ['rough, keep talking',
        'getting there, 10 more seconds helps a lot',
        'good read, you can stop here',
        'sharp, as good as it gets'][tier];
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
  'still going, a long look usually means a close call',
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
  $('#timer').textContent = '1:00';
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

function stopListening() {
  if (state !== 'listening') return;
  state = 'analyzing';
  stopTimer();
  stopMeter();
  const elapsed = (Date.now() - startedAt) / 1000;
  if (elapsed < 2) {
    toast('That was barely a breath. Give me a sentence or two.');
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
    toast('Your mic barely picked anything up 🎤, check Chrome\'s mic icon (address bar) is using the right microphone, then try again.');
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

async function onRecordingReady() {
  if (takeHandled) return;
  takeHandled = true;
  // A spontaneous stop (phone call, Siri, the OS reclaiming the mic) arrives here while
  // state is still 'listening', with the countdown and meter still running and the live
  // card still up. Clean up and analyze whatever was captured — a take interrupted at 20
  // seconds is still a take; the blob-size gate below catches the ones that aren't.
  if (state === 'listening') {
    stopTimer(); stopMeter();
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
    const resp = await postAnalyze({ audio, mime: mimeUsed });
    renderResult(normalizeServer(resp));
  } catch (err) {
    fallbackOrFail(err && err.userMessage ? err.userMessage : 'Something went wrong on our end.');
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
  no_speech: "I couldn't hear any real speech in that. If the bars weren't moving while you talked, your browser is probably using the wrong microphone (click the mic icon in the address bar).",
  not_configured: 'The server is missing its API key, so nothing can be analyzed. That is a setup problem, not your recording.',
  out_of_credit: 'The analysis account has run out of credit, so nothing can be read right now. Nothing is wrong with your recording.',
  busy: 'The model is busy right now. Give it a few seconds and try again.',
  upstream_failed: "The model didn't answer. Try again in a moment.",
  audio_too_short: 'That was too short to read anything from. Give me a sentence or two.',
  audio_too_large: 'That recording was too big to send. Try a slightly shorter take.',
  rate_limited: 'Slow down a little, try again in a bit.',
  bad_origin: 'That request was blocked as coming from the wrong domain.',
};

async function postAnalyze(payload) {
  // 75s outlasts the server's own 60s ceiling, so every legitimate slow answer arrives —
  // but a stalled mobile connection can otherwise hang this fetch for minutes with the
  // analyzing card holding the whole UI hostage (it has no buttons by design). The timeout
  // is the escape hatch.
  let resp;
  try {
    resp = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(75_000),
    });
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw Object.assign(new Error('timeout'), { userMessage: 'That took too long — the network or the model stalled.' });
    }
    throw e;
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
  show('analyzingCard'); startScan();
  state = 'analyzing';
  postAnalyze({ text })
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
    $('#redoText').textContent = 'Everything I could point to was either something you told me or something I could not hear again on a second listen. That is not a reading, so I would rather give you nothing than make it up. Try once more, ideally about thirty seconds, without saying your name or where you are from.';
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
  c.font = '500 26px "IBM Plex Mono", monospace';
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
    c.font = '400 40px "IBM Plex Mono", monospace';
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
    c.font = '500 28px "IBM Plex Mono", monospace';
    c.fillText(String(v.language).toLowerCase(), M + rw + 22, y + 36);
  }

  const parts = (Array.isArray(v.influences) ? v.influences : [])
    .filter((i) => i.place && (i.percent || 0) >= 1).slice(0, 3);
  if (parts.length) {
    y += 140;
    c.fillStyle = '#74766D';
    c.font = '500 26px "IBM Plex Mono", monospace';
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
      c.font = '500 34px "IBM Plex Mono", monospace';
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
  c.font = '500 34px "IBM Plex Mono", monospace';
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
  if (!v || !v.place) { toast('Nothing to share yet — do a take first.'); return; }
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
      toast('Card saved to your downloads — post it anywhere.');
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

function saveFeedback(correct, actual, actualCity) {
  const last = window._lastResult || {};
  // Donation is its own button now (it uploads the moment it is pressed — three takes in a
  // row were lost to the old tick-then-answer choreography). The feedback row only carries
  // consent so a donated clip's correction can store its transcript and cities server-side.
  const consent = !!window._donated;
  // State loss must SPEAK, not silently degrade — a suspended iOS tab once evaporated the
  // clip and verdict, and the click silently posted an all-null row.
  if (!last.place) {
    toast('This result is gone from the page’s memory (the tab was suspended). Do a fresh take and answer again — that one will count.');
    return;
  }

  // local log (works offline, always; private-mode Safari throws on setItem — the server
  // post must not die with it)
  try {
    const log = JSON.parse(localStorage.getItem('hometongue_feedback') || '[]');
    log.push({ ts: Date.now(), correct, actual, actualCity, guess: last.place || '', km_radius: last.radius_km || 0, transcript: last.transcript || '' });
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
    transcript: last.transcript || '',
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
  $('#typeModeBtn').onclick = enterTypeMode;
  $('#backToMicBtn').onclick = () => { state = 'idle'; show('idleCard'); };
  $('#analyzeTypedBtn').onclick = () => runTextAnalysis($('#typeBox').value, true);
  $('#againBtn').onclick = () => { state = 'idle'; show('idleCard'); flyHome(); };
  $('#shareBtn').onclick = shareResult;
  $('#redoBtn').onclick = () => { state = 'idle'; show('idleCard'); flyHome(); startListening(); };

  $('#fbYes').onclick = () => { saveFeedback(true, '', ''); $('#fbYes').classList.add('chosen'); lockFeedback(); };
  $('#fbNo').onclick = () => { $('#fbFix').hidden = false; $('#fbNo').classList.add('chosen'); $('#fbNo').disabled = true; $('#fbYes').disabled = true; };
  $('#fbSend').onclick = () => {
    // `sel` used to be read from a variable that only ever existed inside fillCountryPicker,
    // so this handler threw a ReferenceError and every "nope" correction silently vanished.
    const sel = $('#fbActual');
    if (!sel.value) { toast('Pick the country first.'); return; }
    saveFeedback(false, sel.value, $('#fbCity').value.trim());
    lockFeedback();
  };

  // The donate button uploads the clip the INSTANT it is pressed. The old design armed a
  // checkbox that only fired when "nailed it" was clicked later — and lost three takes in a
  // row: one to an unexplained no-op, one to an iOS tab suspension, one to a reflexive "go
  // again". A button that does what it says, when it is pressed, cannot be misunderstood.
  $('#donateBtn').onclick = async () => {
    const db = $('#donateBtn');
    if (window._donated) return;
    if (!window._lastAudio || !window._lastResult) {
      toast('That recording is no longer in memory — do a fresh take and press donate right after.');
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
      db.classList.add('done'); db.textContent = 'donated ✓ thank you';
    } catch {
      if (gen !== window._renderGen) return;
      db.disabled = false; db.textContent = 'donate this clip';
      toast('The donation didn’t go through — try the button again.');
    }
  };
}

function lockFeedback() {
  $('#fbYes').disabled = true;
  $('#fbNo').disabled = true;
  $('#fbFix').hidden = true;
}

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
