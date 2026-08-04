// HomeTongue — app logic: recording, server analysis, map, results
const $ = (s) => document.querySelector(s);

const HOME_BOUNDS = [[-50, -140], [65, 160]]; // the whole inhabited world
const MAX_SECONDS = 45;
let map, marker, glow;
let state = 'idle';
let mediaStream = null, recorder = null, chunks = [], recMime = '';
let audioCtx = null, analyser = null, rafId = null;
let timerId = null, startedAt = 0;
let micPeak = -1; // loudest rolling level seen this recording; -1 = meter unavailable

// the survey red, read from the stylesheet so themes stay in one place
const MARK = () => window.HT.ink();
window.HT.setDeck('arabic');
const field = window.HT.contours();

// Country reference data, used only for the feedback picker now that the answer is a
// point rather than a country code.
const { COUNTRIES } = window.HT_PLACES;

// ————— map —————
function initMap() {
  map = L.map('map', { zoomControl: false, attributionControl: true, worldCopyJump: true });
  map.fitBounds(HOME_BOUNDS);
  window.HT.basemap(map);

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
    micPeak = 0;
    const loop = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      micPeak = Math.max(micPeak, sum / data.length / 255);
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
  timerId = setInterval(() => {
    const s = Math.floor((Date.now() - startedAt) / 1000);
    $('#timer').textContent = `0:${String(Math.min(s, 59)).padStart(2, '0')}`;
    if (s >= MAX_SECONDS) stopListening();
  }, 250);
}

function stopTimer() {
  if (timerId) clearInterval(timerId), timerId = null;
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
  micPeak = -1;
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
  $('#transcript').textContent = '';
  $('#timer').textContent = '0:00';
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
  if (micPeak >= 0 && micPeak < 0.02) {
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    teardownRecording();
    const srText = (srFinal + ' ' + srInterim).trim();
    if (normText(srText).length >= 8) {
      // recorder taped silence (wrong input device) but live captions caught the words — use them
      toast('Your recorder mic was silent 🎤 so I used the live transcript instead — check Chrome\'s address-bar mic selection.');
      runTextAnalysis(srText, false);
    } else {
      toast('Your mic barely picked anything up 🎤 — check Chrome\'s mic icon (address bar) is using the right microphone, then try again.');
      state = 'idle';
      show('idleCard');
    }
    return;
  }
  show('analyzingCard');
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
    const srText = (srFinal + ' ' + srInterim).trim();
    if (err && err.message === 'no_speech' && normText(srText).length >= 8) {
      // Whisper heard nothing usable but live captions did — analyze the caption text instead
      toast('The recording came out silent 🎤 — using the live transcript instead. Check Chrome\'s mic selection.');
      return runTextAnalysis(srText, false);
    }
    fallbackOrFail(err && err.userMessage ? err.userMessage : 'The cloud engine is unreachable.');
  }
}

function fallbackOrFail(reason) {
  const text = (srFinal + ' ' + srInterim).trim();
  if (normText(text).length >= 8) {
    toast(`${reason} Falling back to the offline word-engine.`);
    toast("Can't reach the server right now — try again in a moment.");
    state = 'idle'; show('idleCard');
  } else {
    toast(`${reason} Try again, or use type mode.`);
    state = 'idle';
    show('idleCard');
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function postAnalyze(payload) {
  const resp = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.ok) {
    const err = new Error((data && data.error) || `http_${resp.status}`);
    if (data && data.error === 'no_speech') err.userMessage = 'I couldn\'t hear any real speech in that — if the bars weren\'t moving while you talked, Chrome is probably using the wrong microphone (click the mic icon in the address bar).';
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
  show('analyzingCard');
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
  const tr = $('#transcript');
  const rtl = /[؀-ۿ֐-׿]/.test(r.transcript || '');
  for (const id of ['#transcript', '#heardText']) {
    const el = $(id);
    if (el) { el.dir = rtl ? 'rtl' : 'ltr'; }
  }
  if (tr) tr.dir = rtl ? 'rtl' : 'ltr';
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
  const confFill = $('#confFill'), confLabel = $('#confLabel');
  const evidence = $('#evidence'), runners = $('#runners'), heard = $('#heard');
  evidence.innerHTML = ''; runners.innerHTML = '';

  heard.hidden = !v.transcript;
  if (v.transcript) $('#heardText').textContent = v.transcript;
  $('#srcBadge').textContent = v.language ? v.language.toLowerCase() : 'heard';

  kicker.textContent = 'sounds like you grew up around';
  place.textContent = v.place;

  // The radius is the honest part of the answer, so say it in words rather than burying it
  // in a percentage. "within about 30 km" means something; "92% confident" does not.
  const r = v.radius_km;
  const near = r <= 50 ? `within about ${r} km — that's a specific place`
    : r <= 200 ? `within about ${r} km`
      : r <= 600 ? `somewhere within about ${r} km — the accent narrows it to a region, not a town`
        : `only to within about ${r} km — this one is broad`;
  sub.textContent = v.note ? `${near}. ${v.note}` : near;

  confFill.style.width = `${v.conf}%`;
  confLabel.textContent = `${v.conf}% sure`;

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
  log.push({ ts: Date.now(), correct, actual, actualCity, guess: last.top ? last.top.code : last.kind, transcript: last.transcript || '' });
  localStorage.setItem('hometongue_feedback', JSON.stringify(log));

  // flywheel: fire-and-forget to the server
  const payload = {
    correct,
    actual_code: actual || '',
    actual_city: actualCity || '',
    guess_code: last.top ? last.top.code : (last.kind || ''),
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
  $('#howBtn').onclick = () => { $('#howPop').hidden = !$('#howPop').hidden; };
  document.addEventListener('click', (e) => {
    if (!$('#howPop').hidden && !e.target.closest('.how-pop') && !e.target.closest('.how-btn')) $('#howPop').hidden = true;
  });

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
