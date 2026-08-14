// Give every long local clip a fixed, audited window.
//
//   node tools/pin-windows.mjs --dry     find windows, write nothing
//   node tools/pin-windows.mjs           find windows and pin them
//
// THE HOLE THIS CLOSES. js/game.js picks the playable slice like this:
//
//   clip._offset = dur > 90 ? Math.min(15 + Math.random() * dur * 0.4, dur - 30) : 0
//
// So a local recording over 90 seconds plays a DIFFERENT twenty seconds every game. Every leak
// audit this project has run listened to one window and cleared it — which proves nothing about
// the next deal, because the window moves. If a speaker names their city at 2:14 and the dice
// land there, the round gives away its own answer, and it does so intermittently, which is the
// worst kind of bug: it looks fine every single time you check it by hand.
//
// A window is only shippable if it is the SAME window every time and somebody has heard it. This
// finds one per clip and writes it to clip.start, which game.js already prefers over the random
// path, so the fix needs no change to the game.
//
// Progress is saved after every clip. A long job that only persists at the end loses everything
// it learned the first time something throws, which this project has now paid for twice.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { MODEL } = await import(pathToFileURL(path.join(ROOT, 'api/prompt.js')).href);
const { modelChain } = await import(pathToFileURL(path.join(ROOT, 'api/verdict.js')).href);
const MODEL_CHAIN = modelChain(MODEL);
const { ffmpegPath } = await import(pathToFileURL(path.join(ROOT, 'tools/ffmpeg-path.mjs')).href);
const FF = ffmpegPath().exe;
const PROBE = FF.replace(/ffmpeg(\.exe)?$/i, (m) => m.replace('ffmpeg', 'ffprobe'));

const DRY = process.argv.includes('--dry');
const WINDOW_S = 20;          // must match CLIP_WINDOW_S in js/game.js
const MIN_SPEECH_S = 12;
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-pin-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCHEMA = {
  type: 'object',
  required: ['speakers', 'named_aloud', 'speech_seconds'],
  properties: {
    speakers: { type: 'integer', description: 'how many different people are heard speaking' },
    named_aloud: {
      type: 'array', items: { type: 'string' },
      description: 'EVERY city, region, country, nationality or language named aloud, in any language, transliterated',
    },
    speech_seconds: { type: 'number', description: 'roughly how many of these seconds contain speech' },
  },
};

// The primary model answered 503 "experiencing high demand" for every window on the first run,
// and three quick retries against the same overloaded model just reported the same failure three
// times — which the caller then recorded as "no answer from the model", i.e. a clip problem. It
// was never a clip problem. Walk the chain and back off properly instead.
async function listen(file) {
  for (const modelName of MODEL_CHAIN) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'You report only what is audible. Never infer or guess beyond the audio.' }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: fs.readFileSync(file).toString('base64') } },
            // Deliberately NOT told what the answer is. Priming it with the label would invite it
            // to hunt for a leak that is not there, or to excuse one that is.
            { text: 'How many people speak? Name every place, nationality or language said out loud. How many seconds contain speech?' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (r.status === 429 || r.status === 503) { await sleep(4000 * (i + 1)); continue; }
      if (!r.ok) break;                       // this model is unhappy; try the other one
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(2500); }
  }
  }
  return null;
}

// Does anything said aloud name the clip's own answer? Compared on a folded stem so "Uzbek"
// catches "Uzbekistan" and "O'zbekiston", and "Turkish" catches "Türkiye" — a speaker naming
// their own country gives the pin away just as surely as naming their city.
const fold = (x) => String(x).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z]/g, '');

function leaksAnswer(namedAloud, label) {
  const answers = String(label).split(/[,–—/]/).map(fold).filter((w) => w.length >= 4);
  for (const raw of namedAloud) {
    const said = fold(raw);
    if (said.length < 4) continue;
    for (const ans of answers) {
      const stem = ans.slice(0, 5);
      if (said.startsWith(stem) || ans.startsWith(said.slice(0, 5))) return raw;
    }
  }
  return null;
}

function slice(src, startS, tag) {
  const out = path.join(WORK, `${tag}.mp3`);
  try {
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(startS),
      '-t', String(WINDOW_S), '-i', src, '-ac', '1', '-ar', '16000', '-b:a', '48k', out], { stdio: 'pipe' });
    return fs.existsSync(out) ? out : null;
  } catch { return null; }
}

function duration(file) {
  try {
    return parseFloat(execFileSync(PROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim());
  } catch { return 0; }
}

globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);
const CLIPS = window.CLIPS;

const todo = [];
for (const [deck, list] of Object.entries(CLIPS)) {
  for (const c of list) {
    if (c.kind === 'yt' || c.start !== undefined) continue;
    const file = path.join(ROOT, c.url.replace(/^\//, ''));
    if (!fs.existsSync(file)) continue;
    const dur = duration(file);
    if (dur > 90) todo.push({ deck, clip: c, file, dur });
  }
}
console.log(`${todo.length} long local clip(s) currently play a random window\n`);

const REPORT = path.join(ROOT, 'data', 'pinned-windows.json');
// Resume rather than restart. Each window costs a model call, and a rule change part way through
// should not mean re-buying the answers that were already correct under it.
let prior = { found: [], stuck: [] };
try { prior = JSON.parse(fs.readFileSync(REPORT, 'utf8')); } catch { /* first run */ }
const found = Array.isArray(prior.found) ? prior.found : [];
const stuck = [];
const solved = new Set(found.map((f) => f.id));
const save = () => {
  try { fs.writeFileSync(REPORT, JSON.stringify({ found, stuck }, null, 2)); }
  catch (e) { console.log(`  (could not save progress: ${e.message})`); }
};

for (const t of todo) {
  if (solved.has(t.clip.id)) continue;
  const label = String(t.clip.label);
  // Walk the recording rather than sampling it: a clean window usually exists, it just is not
  // wherever an arithmetic guess lands.
  const last = Math.floor(t.dur) - WINDOW_S - 2;
  const spots = [];
  for (let s = 10; s <= last; s += 15) spots.push(s);

  let picked = null;
  let why = 'no clean window found';
  for (const s of spots) {
    const f = slice(t.file, s, `${t.deck}-${s}`);
    if (!f) { why = 'could not cut'; continue; }
    const a = await listen(f);
    try { fs.rmSync(f, { force: true, maxRetries: 3, retryDelay: 100 }); } catch { /* housekeeping never fails a run */ }
    if (!a) { why = 'no answer from the model'; continue; }
    if ((a.speech_seconds || 0) < MIN_SPEECH_S) { why = `only ${Math.round(a.speech_seconds || 0)}s of speech`; continue; }
    if ((a.speakers || 0) > 2) { why = `${a.speakers} speakers`; continue; }
    // A LEAK IS NAMING THE ANSWER, NOT NAMING ANYTHING.
    //
    // This first demanded a window with zero places named at all, which rejected a Delhi clip for
    // saying "British", "Europe" and "Sindhu Ghati" — none of which narrow India by a kilometre.
    // It also contradicted the rule this project already settled on: leak-triage.mjs keeps clips
    // that name a DIFFERENT place, because being told about somewhere you are not is difficulty,
    // and difficulty is the game. Only the answer's own name is disqualifying.
    const said = leaksAnswer(a.named_aloud || [], label);
    if (said) { why = `says "${said}", which is the answer`; continue; }
    picked = { start: s, audit: a };
    break;
  }

  if (picked) {
    found.push({ deck: t.deck, id: t.clip.id, label, dur: Math.round(t.dur), start: picked.start, audit: picked.audit });
    console.log(`  ✓ ${t.deck.padEnd(11)} ${label.padEnd(26)} pinned at ${picked.start}s  (${Math.round(picked.audit.speech_seconds)}s speech, ${picked.audit.speakers} speaker)`);
  } else {
    stuck.push({ deck: t.deck, id: t.clip.id, label, dur: Math.round(t.dur), why });
    console.log(`  ✗ ${t.deck.padEnd(11)} ${label.padEnd(26)} ${why}`);
  }
  save();
}

try { fs.rmSync(WORK, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* scratch */ }

console.log(`\npinned ${found.length}, unresolved ${stuck.length}`);
console.log(`wrote ${path.relative(ROOT, REPORT)}`);

if (DRY) { console.log('\n--dry: js/clips.js untouched'); process.exit(0); }
if (!found.length) { console.log('\nnothing to write'); process.exit(0); }

// clips.js is generated JSON, so it is parsed and re-serialised rather than edited textually.
// Hand-rolled slicing corrupted this file once already.
const byId = new Map(found.map((f) => [f.id, f.start]));
let changed = 0;
for (const list of Object.values(CLIPS)) {
  for (const c of list) {
    if (byId.has(c.id)) { c.start = byId.get(c.id); changed += 1; }
  }
}
const out = `// Pin It clip decks. Generated data — edit through tools/, not by hand.\nwindow.CLIPS = ${JSON.stringify(CLIPS, null, 2)};\n`;
const tmp = path.join(ROOT, 'js', '.clips-pin.js');
fs.writeFileSync(tmp, out);
globalThis.window = {};
await import(`${pathToFileURL(tmp).href}?v=${Date.now()}`);
const readBack = [...byId.keys()].filter((id) => {
  const c = Object.values(window.CLIPS).flat().find((x) => x.id === id);
  return !c || c.start !== byId.get(id);
});
fs.rmSync(tmp, { force: true });
if (readBack.length) {
  console.log(`\nREFUSED: ${readBack.length} value(s) did not read back; js/clips.js untouched`);
  process.exit(1);
}
fs.writeFileSync(path.join(ROOT, 'js/clips.js'), out);
console.log(`\npinned ${changed} window(s) into js/clips.js`);
