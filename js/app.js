// HomeTongue — app logic: recording, server analysis, map, results
const $ = (s) => document.querySelector(s);

const HOME_BOUNDS = [[8, -18], [40, 62]]; // whole Arab world
const MAX_SECONDS = 45;
let map, marker, glow;
let state = 'idle';
let mediaStream = null, recorder = null, chunks = [], recMime = '';
let recog = null, srFinal = '', srInterim = '';
let audioCtx = null, analyser = null, rafId = null;
let timerId = null, startedAt = 0;
let micPeak = -1; // loudest rolling level seen this recording; -1 = meter unavailable

// the survey red, read from the stylesheet so themes stay in one place
const MARK = () => window.HT.ink();
window.HT.setDeck('arabic');
const field = window.HT.contours();

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

function flyToCountry(c) {
  clearMapExtras();
  ensureMapReady();
  dropFn = () => {
    if (marker) return;
    glow = L.circle([c.lat, c.lng], { radius: 90000, color: MARK(), weight: 1, opacity: 0.5, fillColor: MARK(), fillOpacity: 0.10 }).addTo(map);
    marker = L.marker([c.lat, c.lng], {
      icon: L.divIcon({ className: 'pulse-wrap', html: '<div class="pulse"></div><div class="pulse-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
    }).addTo(map);
  };
  map.once('moveend', dropFn);
  dropTimer = setTimeout(dropFn, 4000); // fallback if the flight was skipped
  map.flyTo([c.lat, c.lng], c.zoom, { duration: 2.6, easeLinearity: 0.15 });
}

// Home depends on who's talking. Framing a Spanish speaker on the Arab world was a
// leftover from when this only did Arabic.
function langBounds(lang) {
  if (!lang || !lang.countries) return HOME_BOUNDS;
  const pts = lang.countries.filter((c) => COUNTRIES[c]).map((c) => [COUNTRIES[c].lat, COUNTRIES[c].lng]);
  if (pts.length < 2) return HOME_BOUNDS;
  const lats = pts.map((p) => p[0]); const lngs = pts.map((p) => p[1]);
  return [[Math.min(...lats) - 4, Math.min(...lngs) - 4], [Math.max(...lats) + 4, Math.max(...lngs) + 4]];
}

function flyHome(lang) {
  clearMapExtras();
  ensureMapReady();
  map.flyToBounds(langBounds(lang || window._lang), { duration: 1.8 });
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

// ————— optional live transcript preview (Chrome/Edge only, best-effort) —————
function startPreviewSR() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('#transcript').textContent = ''; return; }
  srFinal = ''; srInterim = '';
  try {
    recog = new SR();
    recog.lang = 'ar-SA';
    recog.continuous = true;
    recog.interimResults = true;
    recog.onresult = (e) => {
      srInterim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) srFinal += r[0].transcript + ' ';
        else srInterim += r[0].transcript;
      }
      $('#transcript').textContent = srFinal + srInterim;
    };
    recog.onend = () => { if (state === 'listening') { try { recog.start(); } catch {} } };
    recog.onerror = () => {};
    recog.start();
  } catch { recog = null; }
}

function stopPreviewSR() {
  if (recog) { recog.onend = null; try { recog.stop(); } catch {} recog = null; }
}

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
  startPreviewSR();
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
  stopPreviewSR();
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
    renderResult(normalizeLocal(classify(text), text, 'offline'));
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
      setTimeout(() => renderResult(normalizeLocal(classify(text), text, 'offline')), 400);
    });
}

function normText(t) { return t.replace(/\s+/g, ' ').trim(); }

// Server result -> view model
function normalizeServer(resp) {
  const r = resp.result;
  window._fbToken = resp.fb_token || '';
  window._lang = resp.language || null;
  for (const id of ['#transcript', '#heardText']) {
    const el = $(id);
    if (el && resp.language) { el.dir = resp.language.dir; el.lang = resp.language.code; }
  }
  const top = r.top_country !== 'none' && COUNTRIES[r.top_country] ? { code: r.top_country, ...COUNTRIES[r.top_country] } : null;
  let kind = r.kind === 'unclear' ? 'weak' : r.kind;
  if (kind === 'dialect' && !top) kind = 'weak'; // schema allows dialect+none; don't crash the renderer
  return {
    kind,
    top,
    regionKey: r.region !== 'none' && r.region !== 'msa' && REGIONS[r.region] ? r.region : null,
    conf: Math.max(0, Math.min(100, r.confidence | 0)),
    city: r.city || '',
    cityConf: Math.max(0, Math.min(100, r.city_confidence | 0)),
    evidence: (r.evidence || []).slice(0, 8).map((e) => ({ t: e.word, en: e.gloss })),
    ranked: (r.ranked || []).slice(0, 4).filter((x) => COUNTRIES[x.code]),
    note: r.note || '',
    transcript: resp.transcript || '',
    lang: resp.language || null,
    source: 'cloud',
  };
}

// Local lexicon result -> view model
function normalizeLocal(res, text, source) {
  if (res.kind === 'weak') return { kind: 'weak', top: null, regionKey: null, conf: 8, evidence: [], ranked: [], note: '', transcript: text, source };
  if (res.kind === 'msa') {
    return { kind: 'msa', top: null, regionKey: null, conf: 90, evidence: res.hits.slice(0, 5).map((h) => ({ t: h.t, en: h.en })), ranked: [], note: '', transcript: text, source };
  }
  return {
    kind: 'dialect',
    top: { code: res.top.code, ...COUNTRIES[res.top.code] },
    regionKey: res.top.region,
    conf: res.conf,
    evidence: res.hits.map((h) => ({ t: h.t, en: h.en })),
    ranked: res.ranked.map((r) => ({ code: r.code, weight: r.score })),
    note: res.closeCall && res.second ? `Close call with ${res.second.en}.` : '',
    transcript: text, source,
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

  renderLangChip(v.lang || window._lang);
  fillCountryPicker(v.lang || window._lang);

  const kicker = $('#resultKicker'), region = $('#resultRegion'), country = $('#resultCountry');
  const confFill = $('#confFill'), confLabel = $('#confLabel');
  const evidence = $('#evidence'), runners = $('#runners'), heard = $('#heard');
  evidence.innerHTML = ''; runners.innerHTML = '';

  heard.hidden = !v.transcript;
  if (v.transcript) $('#heardText').textContent = v.transcript;
  $('#srcBadge').textContent = v.source === 'cloud' ? 'whisper + claude' : 'offline word-engine';

  for (const e of v.evidence) evidence.appendChild(chip(e.t, e.en));

  if (v.kind === 'weak') {
    kicker.textContent = 'hmm…';
    region.textContent = 'Not enough signal';
    country.textContent = v.note || 'Talk more casually — slang, filler words, the way you voice-note your friends. That\'s where your لهجة hides.';
    confFill.style.width = '8%';
    confLabel.textContent = 'keep talking';
    flyHome(v.lang || window._lang);
    window._lastResult = v;
    return;
  }

  if (v.kind === 'msa') {
    kicker.textContent = 'that\'s not a dialect —';
    const ln = v.lang || window._lang;
    region.textContent = ln && ln.code === 'ar' ? 'الفصحى · Fuṣḥa' : `Standard ${ln ? ln.name : ''}`.trim();
    country.textContent = v.note || 'Textbook, unplaceable, could be anywhere. Drop the formality and talk like you talk with your friends.';
    confFill.style.width = '90%';
    confLabel.textContent = 'very sure about this one';
    flyHome(v.lang || window._lang);
    window._lastResult = v;
    return;
  }

  const reg = v.regionKey ? REGIONS[v.regionKey] : null;
  kicker.textContent = 'your dialect sounds';
  region.textContent = reg ? (reg.ar ? `${reg.ar} · ${reg.en}` : reg.en) : v.top.en;
  let line = `Best guess: ${v.top.en}${v.top.ar ? ` — ${v.top.ar}` : ''}`;
  if (v.city) line += `  ·  sounds like ${v.city} (${v.cityConf}%)`;
  if (v.note) line += `  ·  ${v.note}`;
  country.textContent = line;
  confFill.style.width = v.conf + '%';
  confLabel.textContent = `${v.conf}% confidence`;

  const maxW = Math.max(...v.ranked.map((r) => r.weight), 1);
  for (const r of v.ranked) {
    const c = COUNTRIES[r.code];
    const row = document.createElement('div');
    row.className = 'runner';
    row.innerHTML = `<span class="runner-name">${c.en}</span><div class="runner-track"><div class="runner-fill" style="width:${Math.round(r.weight / maxW * 100)}%"></div></div>`;
    runners.appendChild(row);
  }

  flyToCountry(v.top);
  window._lastResult = v;
}

function chip(word, gloss) {
  const el = document.createElement('span');
  el.className = 'chip';
  const ln = window._lang;
  const b = document.createElement('b');
  b.dir = ln ? ln.dir : 'rtl';
  b.lang = ln ? ln.code : 'ar';
  b.textContent = word;
  const s = document.createElement('small');
  s.textContent = gloss;
  el.append(b, s);
  return el;
}

const LANG_CHOICES = [
  ['ar', 'Arabic', 'العربية'], ['en', 'English', 'English'], ['es', 'Spanish', 'Español'],
  ['fr', 'French', 'Français'], ['pt', 'Portuguese', 'Português'], ['ru', 'Russian', 'Русский'],
  ['hi', 'Hindi–Urdu', 'हिन्दी · اردو'], ['zh', 'Chinese', '中文'],
];

// Auto-detection keeps the "just talk" promise, but it will sometimes be wrong — so it
// says what it heard and lets you overrule it in one tap rather than making you choose
// a language before you've said anything.
function renderLangChip(lang) {
  const el = $('#langChip');
  if (!lang) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = '';
  const said = document.createElement('span');
  said.className = 'lang-heard';
  said.textContent = `heard ${lang.name}`;
  const fix = document.createElement('button');
  fix.className = 'lang-fix';
  fix.textContent = 'not right?';
  fix.onclick = () => {
    el.innerHTML = '';
    const sel = document.createElement('select');
    sel.className = 'lang-pick';
    sel.innerHTML = '<option value="">it was actually…</option>'
      + LANG_CHOICES.filter(([c]) => c !== lang.code)
        .map(([c, n, nat]) => `<option value="${c}">${n} — ${nat}</option>`).join('');
    sel.onchange = () => { if (sel.value) reanalyzeAs(sel.value); };
    el.appendChild(sel);
  };
  el.append(said, fix);
}

// Re-run the same audio with the language the user insists on.
function reanalyzeAs(code) {
  if (!window._lastAudio) return;
  show('analyzingCard');
  postAnalyze({ audio: window._lastAudio.b64, mime: window._lastAudio.mime, lang: code })
    .then((resp) => renderResult(normalizeServer(resp)))
    .catch((e) => { toast(e.message || 'that did not work'); show('resultCard'); });
}

// The correction list follows the language we heard — offering Chile to an Arabic
// speaker is noise, and offering all 79 countries to anyone is worse.
function fillCountryPicker(lang) {
  const sel = $('#fbActual');
  const codes = lang && lang.countries ? lang.countries.filter((c) => c !== 'none' && COUNTRIES[c])
    : Object.keys(COUNTRIES);
  const names = codes.map((c) => [c, COUNTRIES[c].en]).sort((a, b) => a[1].localeCompare(b[1]));
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

  fillCountryPicker(null);

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
