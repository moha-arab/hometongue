// Lahja — app logic: mic, live transcript, map, results
const $ = (s) => document.querySelector(s);

const HOME_BOUNDS = [[8, -18], [40, 62]]; // whole Arab world
let map, marker, glow;
let state = 'idle';
let recog = null, finalT = '', interimT = '';
let audioCtx = null, analyser = null, rafId = null, mediaStream = null;

// ————— map —————
function initMap() {
  map = L.map('map', { zoomControl: false, attributionControl: true, worldCopyJump: true });
  map.fitBounds(HOME_BOUNDS);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);

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

function clearMapExtras() {
  if (marker) { map.removeLayer(marker); marker = null; }
  if (glow) { map.removeLayer(glow); glow = null; }
}

function flyToCountry(c) {
  clearMapExtras();
  ensureMapReady();
  const drop = () => {
    if (marker) return;
    glow = L.circle([c.lat, c.lng], { radius: 90000, color: '#ffb24d', weight: 1, opacity: 0.35, fillColor: '#ffb24d', fillOpacity: 0.12 }).addTo(map);
    marker = L.marker([c.lat, c.lng], {
      icon: L.divIcon({ className: 'pulse-wrap', html: '<div class="pulse"></div><div class="pulse-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
    }).addTo(map);
  };
  map.once('moveend', drop);
  setTimeout(drop, 4000); // fallback if the flight was skipped
  map.flyTo([c.lat, c.lng], c.zoom, { duration: 2.6, easeLinearity: 0.15 });
}

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
  t._timer = setTimeout(() => { t.hidden = true; }, 2600);
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

// ————— waveform —————
async function startMeter() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaStreamSource(mediaStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const bars = [...document.querySelectorAll('#wave i')];
    const loop = () => {
      analyser.getByteFrequencyData(data);
      bars.forEach((b, i) => {
        const v = data[Math.floor(i * data.length / bars.length / 2) + 2] / 255;
        b.style.transform = `scaleY(${0.15 + v * 1.1})`;
      });
      rafId = requestAnimationFrame(loop);
    };
    loop();
  } catch { /* no meter, no problem */ }
}

function stopMeter() {
  if (rafId) cancelAnimationFrame(rafId), rafId = null;
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop()), mediaStream = null;
  if (audioCtx) audioCtx.close().catch(() => {}), audioCtx = null;
}

// ————— speech —————
function speechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function startListening() {
  if (!speechSupported()) {
    toast('Speech recognition needs Chrome or Edge — type mode instead 👇');
    enterTypeMode();
    return;
  }
  state = 'listening';
  finalT = ''; interimT = '';
  $('#transcript').textContent = '';
  $('#liveStatus').textContent = 'listening…';
  show('liveCard');
  startMeter();

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recog = new SR();
  recog.lang = $('#locale').value;
  recog.continuous = true;
  recog.interimResults = true;

  recog.onresult = (e) => {
    interimT = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalT += r[0].transcript + ' ';
      else interimT += r[0].transcript;
    }
    $('#transcript').textContent = finalT + interimT;
  };
  recog.onerror = (e) => {
    if (state !== 'listening') return;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      toast('Mic blocked — allow the microphone, or use type mode.');
      state = 'idle'; stopMeter(); show('idleCard');
    } else if (e.error === 'network') {
      toast('Speech service unreachable — try type mode.');
      state = 'idle'; stopMeter(); enterTypeMode();
    }
  };
  recog.onend = () => {
    // Chrome stops on silence; keep the session alive until the user hits stop
    if (state === 'listening') { try { recog.start(); } catch { /* restarting too fast */ } }
  };
  try { recog.start(); } catch { /* already started */ }
}

function stopListening() {
  state = 'analyzing';
  if (recog) { recog.onend = null; try { recog.stop(); } catch {} recog = null; }
  stopMeter();
  const text = (finalT + ' ' + interimT).trim();
  runAnalysis(text, false);
}

// ————— analysis + result —————
function runAnalysis(text, typed) {
  if (normText(text).length < 8) {
    toast('I barely heard anything — give me a sentence or two.');
    state = 'idle';
    show(typed ? 'typeCard' : 'idleCard');
    return;
  }
  show('analyzingCard');
  state = 'analyzing';
  setTimeout(() => renderResult(classify(text)), 1100);
}

function normText(t) { return t.replace(/\s+/g, ' ').trim(); }

function renderResult(res) {
  state = 'result';
  show('resultCard');
  $('#fbActual').hidden = true;
  $('#fbYes').disabled = false; $('#fbNo').disabled = false;

  const kicker = $('#resultKicker'), region = $('#resultRegion'), country = $('#resultCountry');
  const confFill = $('#confFill'), confLabel = $('#confLabel');
  const evidence = $('#evidence'), runners = $('#runners');
  evidence.innerHTML = ''; runners.innerHTML = '';

  if (res.kind === 'weak') {
    kicker.textContent = 'hmm…';
    region.textContent = 'Not enough signal';
    country.textContent = 'Talk more casually — slang, filler words, the way you text your friends. That\'s where your لهجة hides.';
    confFill.style.width = '8%';
    confLabel.textContent = 'keep talking';
    flyHome();
    return;
  }

  if (res.kind === 'msa') {
    kicker.textContent = 'that\'s not a dialect —';
    region.textContent = 'الفصحى · Fuṣḥa';
    country.textContent = 'Textbook Arabic, from the ocean to the Gulf. Beautiful. Now drop the formality and talk like you talk with your friends 😄';
    confFill.style.width = '90%';
    confLabel.textContent = 'very sure about this one';
    for (const h of res.hits.slice(0, 5)) evidence.appendChild(chip(h.t, h.en));
    flyHome();
    return;
  }

  const { top, second, closeCall, conf } = res;
  const reg = REGIONS[top.region];
  kicker.textContent = 'your dialect sounds';
  region.textContent = `${reg.ar} · ${reg.en}`;
  let line = `${top.flag} Best guess: ${top.en} — ${top.ar}`;
  if (closeCall && second) line += `  (close call with ${second.flag} ${second.en})`;
  country.textContent = line;
  confFill.style.width = conf + '%';
  confLabel.textContent = conf + '% — prototype confidence';

  for (const h of res.hits) evidence.appendChild(chip(h.t, h.en));

  const maxScore = res.ranked[0].score;
  for (const r of res.ranked) {
    const row = document.createElement('div');
    row.className = 'runner';
    row.innerHTML = `<span class="runner-name">${r.flag} ${r.en}</span><div class="runner-track"><div class="runner-fill" style="width:${Math.round(r.score / maxScore * 100)}%"></div></div>`;
    runners.appendChild(row);
  }

  flyToCountry(top);
  window._lastResult = res;
}

function chip(word, gloss) {
  const el = document.createElement('span');
  el.className = 'chip';
  el.innerHTML = `<b dir="rtl" lang="ar">${word}</b><small>${gloss}</small>`;
  return el;
}

// ————— feedback flywheel —————
function saveFeedback(correct, actual) {
  const log = JSON.parse(localStorage.getItem('lahja_feedback') || '[]');
  log.push({ ts: Date.now(), correct, actual, guess: window._lastResult?.top?.code || window._lastResult?.kind });
  localStorage.setItem('lahja_feedback', JSON.stringify(log));
  toast(correct
    ? 'Logged ✓ — every answer is future training data.'
    : 'Logged — this is exactly how the real model gets trained.');
}

// ————— type mode —————
function enterTypeMode() {
  state = 'type';
  show('typeCard');
}

// ————— wire up —————
function bindUI() {
  // waveform bars
  const wave = $('#wave');
  for (let i = 0; i < 24; i++) wave.appendChild(document.createElement('i'));

  // samples
  const samplesEl = $('#samples');
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.className = 'sample-btn';
    b.textContent = s.label;
    b.onclick = () => { $('#typeBox').value = s.text; runAnalysis(s.text, true); };
    samplesEl.appendChild(b);
  }

  // feedback country picker
  const sel = $('#fbActual');
  sel.innerHTML = '<option value="">so what is it really?</option>' +
    Object.entries(COUNTRIES).map(([code, c]) => `<option value="${code}">${c.flag} ${c.en}</option>`).join('');

  $('#micBtn').onclick = startListening;
  $('#stopBtn').onclick = stopListening;
  $('#typeModeBtn').onclick = enterTypeMode;
  $('#backToMicBtn').onclick = () => { state = 'idle'; show('idleCard'); };
  $('#analyzeTypedBtn').onclick = () => runAnalysis($('#typeBox').value, true);
  $('#againBtn').onclick = () => { state = 'idle'; show('idleCard'); flyHome(); };
  $('#howBtn').onclick = () => { $('#howPop').hidden = !$('#howPop').hidden; };
  document.addEventListener('click', (e) => {
    if (!$('#howPop').hidden && !e.target.closest('.how-pop') && !e.target.closest('.how-btn')) $('#howPop').hidden = true;
  });

  $('#fbYes').onclick = () => { saveFeedback(true); $('#fbYes').disabled = true; $('#fbNo').disabled = true; };
  $('#fbNo').onclick = () => { $('#fbActual').hidden = false; $('#fbNo').disabled = true; };
  sel.onchange = () => { if (sel.value) { saveFeedback(false, sel.value); sel.hidden = true; sel.value = ''; $('#fbYes').disabled = true; } };
}

initMap();
bindUI();
