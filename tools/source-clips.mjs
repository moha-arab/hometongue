// Find and vet new Pin It clips.
//
//   node tools/source-clips.mjs french          fill one deck
//   node tools/source-clips.mjs --targets targets.json
//
// Nothing is downloaded permanently and nothing is re-hosted. Candidates are YouTube videos
// played through the IFrame embed, so the creator keeps the view and the attribution. Audio
// is fetched transiently only to vet the clip and deleted immediately afterwards.
//
// THE GATE IS THE PRODUCT'S OWN MODEL. Guess Me places speakers to a 44 km median, so the
// strongest possible test of "is this person really from Lagos" is to hand the audio to the
// same model, blind, and see whether it independently says Lagos. That kills the failure mode
// that ruined the first attempt at this deck: actors performing an accent. An impressionist
// doing Jamaican does not survive a model that has heard real Jamaicans.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { SYSTEM, SCHEMA, MODEL } = await import(pathToFileURL(path.join(ROOT, 'api/prompt.js')).href);
const { ffmpegPath } = await import(pathToFileURL(path.join(ROOT, 'tools/ffmpeg-path.mjs')).href);
const FF = ffmpegPath().exe;

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-source-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// TWO WAYS IN, AND A CLIP NEEDS ONE OF THEM.
//
// The single loose threshold that used to live here assumed every clip already had provenance,
// so the model only had to rule out impressionists and wrong languages. That assumption is false
// for a brand-new deck: the ONLY thing connecting the clip to the city was the search query that
// found it. Under one loose number the run accepted a video titled "Indore के लोगों ने बताए"
// (Indore residents) as a Bhopal clip, and two national-politics vox pops as Mumbai.
//
//   LOOSE  the title or channel names the target place. That is external evidence the recording
//          really is from there, so the model only has to confirm the right language and region.
//   BLIND  nothing but the search query says where this came from. Then the model's own answer
//          IS the evidence, and it has to be close enough to mean something on a deck that
//          scores with a 250-300 km decay.
//
// A clip the model finds hard is still good content — but only once something else establishes
// where it is actually from.
//
// LOOSE is 600, not 1500. A title is evidence about the STORY's location, which is not always
// evidence about the SPEAKER's. "Mumbai Viral News: बीच सड़क मंत्री की..." names Mumbai because
// that is where the story happened; the voice in it is a national politician the model placed in
// Delhi, 1148 km away. On decks that score with a 250-300 km decay, a label the model contradicts
// by more than about two cities is not defensible no matter what the title says.
const ACCEPT_KM_LOOSE = 600;
const ACCEPT_KM_BLIND = 350;

// Accents move over decades, so an archival recording is a different answer from a current one.
const MIN_YEAR = 2012;

// UPLOAD YEAR IS NOT RECORDING YEAR. The upload check alone let "Milano 1985 - Anni '80" through
// twice, because a 1985 street interview posted to YouTube in 2020 looks eight years old by
// metadata and forty years old to an ear. When a title announces its own vintage, believe it.
const ARCHIVAL = /\b(19[3-9]\d|200\d)\b|anni\s*'?\d0|d'epoca|archivi|repertorio|amarcord|vintage|throwback|retro\b|archiv\b|damals|旧|回顾/i;
const WINDOW_S = 22;

function km(aLat, aLng, bLat, bLng) {
  const R = 6371; const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Ten hits per query, not six. The gate rejects far more than it used to (age, rival cities,
// sketch channels, a 600 km ceiling), and searching is the cheap part — only candidates that
// survive the title filters cost an audio fetch and a model call.
function ytSearch(query, n = 10) {
  try {
    const out = execFileSync('yt-dlp', [
      `ytsearch${n}:${query}`, '--flat-playlist', '--dump-json',
      '--no-warnings', '--skip-download',
    ], { encoding: 'utf8', timeout: 90000, maxBuffer: 32 * 1024 * 1024 });
    return out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      .filter((v) => v.id && v.duration && v.duration > 60 && v.duration < 3600)
      .map((v) => ({ id: v.id, title: v.title || '', duration: v.duration, channel: v.channel || v.uploader || '' }));
  } catch { return []; }
}

// Search results carry no upload date, so age has to be asked for per candidate. Called only
// after the cheap title filters pass, so it costs one request per serious candidate rather than
// one per search hit.
function ytMeta(id) {
  try {
    const out = execFileSync('yt-dlp', ['--dump-json', '--skip-download', '--no-warnings',
      `https://www.youtube.com/watch?v=${id}`], { encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024 });
    const j = JSON.parse(out);
    return { year: Number(String(j.upload_date || '').slice(0, 4)) || null, duration: Number(j.duration || 0) };
  } catch { return null; }
}

// oEmbed is the only reliable check that a video can actually be played off-site. Plenty of
// otherwise perfect clips are embed-disabled and would show a dead frame in the game.
async function embeddable(id) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
      { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const j = await r.json();
    return { title: j.title, author: j.author_name, authorUrl: j.author_url };
  } catch { return null; }
}

// ONE DOWNLOAD, MANY WINDOWS.
//
// Scanning five separate windows meant five yt-dlp fetches per candidate, and yt-dlp is by far
// the slowest step — eight candidates took a quarter of an hour. Worse, five coarse probes is
// the wrong shape for the problem: street-interview videos cut between respondents every five
// to ten seconds, so a 20 second window holding exactly ONE speaker is a narrow target and five
// scattered guesses usually miss it. Pulling one long chunk and slicing it locally makes the
// scan both cheaper and finer, which is what actually finds the single-speaker stretch.
function grabChunk(id, startS, lenS) {
  const out = path.join(WORK, `${id}-chunk.mp3`);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      execFileSync('yt-dlp', [
        `https://www.youtube.com/watch?v=${id}`, '-f', 'bestaudio[abr<128]/bestaudio',
        '-o', path.join(WORK, `${id}-raw.%(ext)s`), '--no-warnings', '--no-playlist',
        '--download-sections', `*${startS}-${startS + lenS}`,
        '--force-keyframes-at-cuts', '--ffmpeg-location', path.dirname(FF),
      ], { stdio: 'pipe', timeout: 240000 });
      const raw = fs.readdirSync(WORK).find((f) => f.startsWith(`${id}-raw`));
      if (!raw) throw new Error('no audio');
      execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(WORK, raw),
        '-ac', '1', '-ar', '16000', '-b:a', '48k', out], { stdio: 'pipe' });
      fs.rmSync(path.join(WORK, raw), { force: true });
      return fs.existsSync(out) ? out : null;
    } catch {
      wipe(id);
      if (attempt === 0) execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},4000)'], { stdio: 'ignore' });
    }
  }
  return null;
}

// Cut one candidate window out of an already-downloaded chunk. Free compared with a fetch.
function sliceOf(chunk, id, offsetS, lenS) {
  const out = path.join(WORK, `${id}-slice.mp3`);
  try {
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(offsetS),
      '-t', String(lenS), '-i', chunk, '-ac', '1', '-ar', '16000', '-b:a', '48k', out], { stdio: 'pipe' });
    return fs.existsSync(out) ? out : null;
  } catch { return null; }
}

// CLEANING UP MUST NEVER KILL THE RUN.
//
// This threw EPERM on a half-written "…-raw.webm.part" that a dying yt-dlp still held open, and
// because it is called from grabChunk's own catch block the throw escaped straight past every
// handler and took the process down — nine accepted Italian clips, an hour of fetching, gone at
// the last target because a temp file was locked for another few milliseconds. Deleting scratch
// files is housekeeping; it has no business being able to fail a job.
function wipe(id) {
  let files = [];
  try { files = fs.readdirSync(WORK); } catch { return; }
  for (const f of files) {
    if (!f.startsWith(id)) continue;
    try { fs.rmSync(path.join(WORK, f), { force: true, maxRetries: 3, retryDelay: 120 }); } catch { /* a locked temp file is not a reason to stop */ }
  }
}

// WHAT IS ACTUALLY IN THE TWENTY SECONDS WE WOULD PLAY.
//
// The single most expensive lesson from vetting a batch of 42 candidates: the window used to be
// one arithmetic guess (duration * 0.35) and nothing ever listened to it. Of the clips that
// survived every other check, half died on the window alone —
//
//   * spliced speakers: the Venice window cut to a different interviewee at 58.0s, the Vienna
//     one at exactly 84.00s, and one Milan window held three people plus the interviewer. A
//     player is asked to place "the speaker" when there are three of them.
//   * answer leaks: the Peshawar window had the interviewer saying "Khyber Pakhtunkhwa" out
//     loud, and the Quetta one said "Quetta wale" twice. Nothing to hear, just something to
//     overhear.
//   * narration: news packages open with a reporter's voiceover, which is a broadcast voice
//     from anywhere, not a resident.
//
// All three are properties of the WINDOW, not the video, so the fix is to listen to a window
// and move to another one if it fails, rather than throwing the video away.
const AUDIT_SCHEMA = {
  type: 'object',
  required: ['speakers', 'place_names', 'speech_seconds', 'narration'],
  properties: {
    speakers: { type: 'integer', description: 'how many DIFFERENT people are heard speaking' },
    place_names: {
      type: 'array', items: { type: 'string' },
      description: 'every city, region, province or country named ALOUD by anyone, in any language',
    },
    speech_seconds: { type: 'number', description: 'roughly how many of these seconds contain speech' },
    narration: { type: 'boolean', description: 'true if a professional narrator or reporter voiceover is present' },
  },
};

// ASK ONCE WHERE THE SINGLE-SPEAKER STRETCHES ARE, INSTEAD OF TESTING THIRTEEN SLICES.
//
// Auditing every candidate window separately meant up to 26 model calls per video and made the
// run slower than the downloads it replaced. One pass over the whole chunk returns a speaker
// timeline, which is the same information in a single call: the slices worth trying are the
// segments long enough to hold the window, and everything else can be skipped without asking.
// The chosen slice is still verified on its own afterwards, because these timestamps are
// approximate and a window is too important to take on trust.
const TIMELINE_SCHEMA = {
  type: 'object',
  required: ['segments'],
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        required: ['start_s', 'end_s', 'speaker', 'is_narrator'],
        properties: {
          start_s: { type: 'number', description: 'seconds from the start of THIS audio' },
          end_s: { type: 'number' },
          speaker: { type: 'string', description: 'a short stable id for the voice, e.g. "A", "B"' },
          is_narrator: { type: 'boolean', description: 'true for a reporter or narrator voiceover, or an interviewer asking questions' },
          places_named: { type: 'array', items: { type: 'string' }, description: 'places named aloud in this segment' },
        },
      },
    },
  },
};

async function chunkTimeline(file) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'You segment audio by speaker. Report only what is audible, with accurate timestamps relative to the start of the audio you are given.' }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: fs.readFileSync(file).toString('base64') } },
            { text: 'Split this audio into segments by who is speaking. Mark interviewer questions and narration. List any places named aloud.' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: TIMELINE_SCHEMA },
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (r.status === 429 || r.status === 503) { await sleep(8000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(3000); }
  }
  return null;
}

async function auditWindow(file) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'You describe only what is audible in a short audio clip. Never guess or infer beyond the audio.' }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: fs.readFileSync(file).toString('base64') } },
            { text: 'How many different people speak? What places are named out loud? Is there narrator voiceover?' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: AUDIT_SCHEMA },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (r.status === 429 || r.status === 503) { await sleep(8000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(3000); }
  }
  return null;
}

// Does the window say the answer out loud? Compared against the label's own words and the
// target's native-script names, so "Quetta", "کوئٹہ" and "Balochistan" all count.
function leaks(audit, t) {
  const own = [String(t.label).split(',')[0].trim(), String(t.label).split(',').pop().trim(), ...(t.native || [])]
    .filter((w) => w && w.length > 3).map((w) => w.toLowerCase());
  return (audit.place_names || []).find((p) => {
    const said = String(p).toLowerCase();
    return own.some((w) => said.includes(w) || w.includes(said));
  }) || null;
}

async function askModel(file) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: fs.readFileSync(file).toString('base64') } },
            { text: 'Where did this person grow up?' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (r.status === 429 || r.status === 503) { await sleep(8000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      return JSON.parse(t);
    } catch { await sleep(3000); }
  }
  return null;
}

// A title that gives the answer away is a leak: the player sees nothing, but if a clip is
// only placeable because the speaker announces their city, it is not testing an ear.
// Word boundaries let an impressionist straight through: imitat never matches the
// Portuguese "IMITANDO" or the Spanish "imitando", and one such clip was accepted before this
// was caught. Match stems without a trailing boundary, and cover the other languages the decks
// actually use rather than only English.
const IMPOSTOR = new RegExp([
  'accent challenge', 'imitat', 'imitan', 'imita\b', 'impression', 'impersonat', 'parod',
  'sotaques', 'sotaque[s]? d[eo]', 'acentos', 'imitando', 'haciendo el acento',
  'trying to speak', 'teaching', 'lesson', 'tutorial', 'learn ', 'how to speak',
  'ai voice', 'text to speech', 'dublagem', 'doblaje', 'пародия', 'акценты',
  // SCRIPTED COMEDY IS THE SAME PROBLEM AS AN IMPRESSIONIST AND WAS SLIPPING THROUGH. A sketch
  // channel whose entire premise is performing a city's stereotype produces a voice that sounds
  // like the place without being from it. The Italian run accepted "Le Interviste Imbruttite"
  // (Il Milanese Imbruttito, actors doing a Milanese caricature) and "Una pezza di Lundini" (a
  // TV comedy) because neither title contains the word "imitation".
  'imbruttit', 'lundini', 'sketch', 'cabaret', 'stand-?up', 'comic[oi]\\b', 'commedia',
  'kabarett', 'sitcom', 'serie tv', 'fiction', 'trailer', 'scherzo', 'prank',
  // 'doblaje' and 'dublagem' were already here but not the ITALIAN word, so a Bari candidate
  // titled "I DOSSI A BARI - Doppiaggio in italiano" — dubbed audio, not a real voice — walked
  // straight through the filter that exists to catch precisely that.
  'doppiagg', 'voce fuori campo', 'voiceover', 'voice over', 'synchronisation',
  // A compilation stitches several cities together, so the 20 second window could be any of them
  // and the label becomes a coin flip. "IDIOTENTEST | Wie DUMM sind die Deutschen? | BEST OF"
  // was accepted as a Berlin clip on exactly that basis.
  'best of', 'compilation', 'zusammenschnitt', 'i migliori momenti', 'mejores momentos',
].join('|'), 'i');

// The channel name gives a sketch show away more reliably than any single video title does:
// "Il Milanese Imbruttito" announces itself, while its episode titles do not.
const impostor = (v) => IMPOSTOR.test(v.title) || IMPOSTOR.test(v.channel || '');

// ONE VIDEO CANNOT BE TWO CITIES. `seen` was per-target, so a video that answered two different
// targets was accepted twice under two contradictory labels — the Urdu run took one Imran Khan
// interview as both a Quetta clip and a Peshawar clip, 26 km apart in claimed truth and about
// 600 km from where the model actually heard it. This set spans the whole run, and is primed
// with every videoId already in the deck so re-runs cannot re-add what is already shipping.
const usedVideos = new Set();
{
  globalThis.window = {};
  await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);
  for (const list of Object.values(window.CLIPS || {})) {
    for (const c of list) if (c.videoId) usedVideos.add(c.videoId);
  }
  console.log(`${usedVideos.size} videoIds already in the deck — they will not be sourced again`);
}

const targets = JSON.parse(fs.readFileSync(process.argv[3] || path.join(ROOT, 'tools/targets.json'), 'utf8'))
  .filter((t) => (process.argv[2] && !process.argv[2].startsWith('--') ? t.deck === process.argv[2] : true));

// The other cities this deck is targeting. Only the city part of the label counts: every German
// target ends in "Germany" or "Austria", so matching on the whole label would make every
// candidate look like a rival.
const cityWordsOf = (x) => [String(x.label).split(',')[0].trim(), ...(x.native || [])]
  .filter((w) => w && w.length > 3);
function siblingCities(t) {
  const own = new Set(cityWordsOf(t).map((w) => w.toLowerCase()));
  // Cities ALREADY SHIPPING in this deck are rivals too. Karachi stopped being a target once the
  // Urdu deck had Karachi clips, which made it invisible here — and a HUM News package titled
  // "کراچی، حیدرآباد سمیت" (Karachi, Hyderabad and beyond) was accepted as a Hyderabad clip with
  // nothing in the pipeline objecting.
  const shipping = ((window.CLIPS || {})[t.deck] || [])
    .map((c) => String(c.label).split(',')[0].trim()).filter((w) => w.length > 3);
  const rivals = targets.filter((x) => x !== t && x.deck === t.deck).flatMap(cityWordsOf);
  return [...new Set([...rivals, ...shipping])].filter((w) => !own.has(w.toLowerCase()));
}

const accepted = [];
const rejected = [];

// SAVE AS YOU GO.
//
// Results used to be written in one shot after the last target, so a crash anywhere in a run
// lasting over an hour threw away everything it had found — which is exactly what happened when
// a locked temp file killed the Italian run on its final target with nine good clips in memory.
// Sourcing is slow, network-dependent and therefore failure-prone by nature; anything it has
// already proven should survive the process that proved it.
const OUT = path.join(ROOT, 'data', process.env.SOURCE_OUT || 'sourced-clips.json');
function persist() {
  try {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ accepted, rejected }, null, 2));
  } catch (e) { console.log(`  (could not save progress: ${e.message})`); }
}

for (const t of targets) {
  console.log(`\n── ${t.deck} · ${t.label}`);
  const seen = new Set();
  for (const q of t.queries) {
    if (accepted.filter((a) => a.label === t.label).length >= (t.want || 1)) break;
    for (const v of ytSearch(q)) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      if (usedVideos.has(v.id)) { rejected.push({ id: v.id, label: t.label, why: 'already used by another clip' }); continue; }
      if (impostor(v)) { rejected.push({ id: v.id, label: t.label, why: `imitation, lesson or sketch: ${v.channel} — ${v.title.slice(0, 50)}` }); continue; }
      if (ARCHIVAL.test(v.title)) {
        rejected.push({ id: v.id, label: t.label, why: `title says archival: ${v.title.slice(0, 60)}` });
        console.log(`   ✗ ${v.title.slice(0, 42)} — archival by its own title`);
        continue;
      }
      // A TITLE NAMING THE TARGET PLACE PREDICTS A CONTENT LEAK. If the video is ABOUT the
      // city, the people in it say the city, and every window leaks. Learned by shipping
      // "Опрос на Марше единства: что для вас настоящий Харьков" - a survey asking people what
      // Kharkiv means to them - where all three candidate windows said Kharkiv and the clip had
      // to be removed after merging. Checked against the place words rather than the whole
      // label so "Kharkiv, Ukraine" also catches a title saying only "Харьков".
      // A TITLE NAMING THE PLACE IS EVIDENCE, NOT A DISQUALIFICATION.
      //
      // This used to be a hard reject, on the reasoning that a video ABOUT a city contains
      // people SAYING the city, so every window leaks. The leak risk is real — it is why a
      // Kharkiv clip had to be pulled after shipping — but rejecting on the title is the wrong
      // instrument for it, and it selects for exactly the wrong clips. Local channels name their
      // own city in almost every title, so the rule threw away every recording with real
      // provenance and kept the ones where nothing but the search query connected the audio to
      // the place. That is how a Bhopal target accepted a video titled "Indore के लोगों ने बताए".
      //
      // The title is a claim about WHERE, and the leak question is about WHAT IS SAID IN THE
      // AUDIO — which the window audit answers directly by listening. So the title now raises
      // confidence in the label and marks the clip for a mandatory leak audit before it ships.
      const hay = `${v.title} ${v.channel}`;
      const placeWords = String(t.label).split(/[,\s]+/).filter((w) => w.length > 3);
      const titleNamesPlace = placeWords.some((w) => new RegExp(w, 'i').test(hay))
        || (t.native || []).some((w) => hay.includes(w));

      // A TITLE NAMING A DIFFERENT TARGET CITY IS A MISLABEL, NOT A CANDIDATE. Searching for
      // Bhopal returns plenty of Madhya Pradesh content, and the first run duly accepted a video
      // titled "Indore के लोगों ने बताए" (Indore residents said) as a Bhopal clip — 185 km of
      // pure scoring error, and invisible afterwards because the label looked fine.
      const namesRival = siblingCities(t).find((w) => new RegExp(w, 'i').test(hay));
      if (namesRival && !titleNamesPlace) {
        rejected.push({ id: v.id, label: t.label, why: `title names ${namesRival}, a different city in this deck: ${v.title.slice(0, 60)}` });
        console.log(`   ✗ ${v.title.slice(0, 42)} — says ${namesRival}, not ${t.label.split(',')[0]}`);
        continue;
      }
      const emb = await embeddable(v.id);
      if (!emb) { rejected.push({ id: v.id, label: t.label, why: 'not embeddable' }); continue; }

      const meta = ytMeta(v.id);
      if (meta && meta.year && meta.year < MIN_YEAR) {
        rejected.push({ id: v.id, label: t.label, why: `uploaded ${meta.year} — too old to represent the accent now` });
        console.log(`   ✗ ${v.title.slice(0, 42)} — uploaded ${meta.year}`);
        continue;
      }

      // Pull two long chunks and scan each finely. Overlapping 20s windows every 10s give a
      // real chance of landing inside one person's answer, which five scattered probes did not.
      const dur = (meta && meta.duration) || v.duration;
      const CHUNK_S = 150;
      const chunkStarts = [Math.floor(dur * 0.30), Math.floor(dur * 0.62)]
        .map((x) => Math.max(15, Math.min(x, Math.floor(dur) - CHUNK_S - 5)))
        .filter((x, i, arr) => x > 0 && arr.indexOf(x) === i);

      let good = null;
      let lastWhy = 'no usable window';
      for (const chunkStart of chunkStarts) {
        if (good) break;
        const chunk = grabChunk(v.id, chunkStart, CHUNK_S);
        if (!chunk) { lastWhy = 'audio fetch failed'; continue; }

        // One timeline call, then only the segments that could actually hold the window.
        const tl = await chunkTimeline(chunk);
        if (!tl || !Array.isArray(tl.segments)) { lastWhy = 'could not read the speaker timeline'; wipe(v.id); continue; }

        const usable = tl.segments
          .filter((sg) => !sg.is_narrator && Number(sg.end_s) - Number(sg.start_s) >= 10)
          .filter((sg) => !leaks({ place_names: sg.places_named || [] }, t))
          .sort((x, y) => (y.end_s - y.start_s) - (x.end_s - x.start_s));

        if (!usable.length) {
          // Report the real reason. Saying "no stretch reaches 22s (longest 230s)" was nonsense
          // on its face: the 230s segment existed and had been dropped for being narration.
          const narrated = tl.segments.filter((sg) => sg.is_narrator).length;
          const leaky = tl.segments.filter((sg) => leaks({ place_names: sg.places_named || [] }, t)).length;
          const short = tl.segments.filter((sg) => Number(sg.end_s) - Number(sg.start_s) < 10).length;
          lastWhy = `no usable segment (${tl.segments.length} found: ${narrated} narrated, ${leaky} name the place, ${short} too short)`;
          wipe(v.id);
          continue;
        }

        for (const sg of usable.slice(0, 3)) {
          const off = Math.max(0, Math.min(Number(sg.start_s) + 0.5, CHUNK_S - WINDOW_S));
          const start = Math.round(chunkStart + off);
          if (start + WINDOW_S > dur - 2) continue;
          const file = sliceOf(chunk, v.id, off, WINDOW_S);
          if (!file) { lastWhy = 'could not cut the window'; continue; }

          // The timeline is approximate, so the window that will actually ship is checked on
          // its own terms before it is trusted.
          const audit = await auditWindow(file);
          if (!audit) { lastWhy = 'window audit gave no answer'; continue; }
          if (audit.narration) { lastWhy = `narrator voiceover at ${start}s`; continue; }
          // TWO VOICES ARE FINE; A NARRATOR IS NOT.
          //
          // Insisting on exactly one speaker was too strict for the genre and starved every
          // deck. A street interview cuts between respondents every five to fifteen seconds, so
          // a 22 second single-voice stretch is rare — but the people either side of that cut
          // are both locals answering the same reporter on the same street, so the LABEL is
          // right for both of them and the player's answer is unchanged. What actually breaks
          // the round is a narrator (a broadcast voice from anywhere) or a crowd, so those stay
          // barred.
          if ((audit.speakers || 0) > 2) { lastWhy = `${audit.speakers} speakers at ${start}s`; continue; }
          if ((audit.speakers || 0) < 1 || (audit.speech_seconds || 0) < 8) {
            lastWhy = `only ${Math.round(audit.speech_seconds || 0)}s of speech at ${start}s`; continue;
          }
          const said = leaks(audit, t);
          if (said) { lastWhy = `window says "${said}" out loud`; continue; }

          const g = await askModel(file);
          if (!g || typeof g.lat !== 'number') { lastWhy = 'model gave no answer'; continue; }
          const d = km(t.lat, t.lng, g.lat, g.lng);
          const limit = titleNamesPlace ? ACCEPT_KM_LOOSE : ACCEPT_KM_BLIND;
          if (d > limit) { lastWhy = `heard ${g.place}, ${Math.round(d)} km away`; continue; }
          good = { start, g, d, audit };
          break;
        }
        wipe(v.id);
      }

      if (!good) {
        rejected.push({ id: v.id, label: t.label, why: lastWhy });
        console.log(`   ✗ ${v.title.slice(0, 42)} — ${lastWhy}`);
        continue;
      }

      const { start, g, d, audit } = good;
      usedVideos.add(v.id);
      accepted.push({
        id: `yt-${v.id}`, kind: 'yt', videoId: v.id, label: t.label, lang: t.lang,
        // Stamp the deck the target belongs to. merge-clips can infer it from `lang`, but
        // that inference is how six Hindi and Chinese clips once landed in World Languages.
        deck: t.deck,
        lat: t.lat, lng: t.lng, r: t.r || 120, start, gain: 100,
        hint: 'Streamed from YouTube — the creator gets the view.',
        gate: {
          model: MODEL, heard: g.place, offBy: Math.round(d), confidence: g.confidence,
          evidence: (g.evidence || []).slice(0, 3), title: emb.title, author: emb.author,
          provenance: titleNamesPlace ? 'title' : 'model',
          // What was actually heard in the twenty seconds that will ship.
          window: { speakers: audit.speakers, speechSeconds: audit.speech_seconds, saidPlaces: audit.place_names || [] },
        },
        year: meta?.year || undefined,
      });
      console.log(`   ✓ ${v.title.slice(0, 40)} — ${g.place} (${Math.round(d)}km) @${start}s, 1 speaker`);
      persist();
      if (accepted.filter((a) => a.label === t.label).length >= (t.want || 1)) break;
    }
  }
}

try { fs.rmSync(WORK, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* scratch dir cleanup is never worth failing a finished run */ }
// Each run names its own file so decks can be sourced in parallel without overwriting one
// another. The file already exists by now — this is the final flush, not the only write.
const out = OUT;
persist();
console.log(`\naccepted ${accepted.length}, rejected ${rejected.length}`);
console.log(`audio files left on disk: ${fs.existsSync(WORK) ? 'SOME — BUG' : 0}`);
console.log(`wrote ${path.relative(ROOT, out)} — review, then merge into js/clips.js`);
