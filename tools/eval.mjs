// HomeTongue accuracy harness.
//
// Runs every labelled clip in the manifest through the live geolocation prompt and scores it
// the way the research does: kilometres between the guess and the truth. Median error, not
// accuracy, because "country correct" scored a 14 km miss (Ramallah answered as Jerusalem) as
// flatly wrong and a 900 km miss inside a big country as right.
//
//   node tools/eval.mjs                 all decks
//   node tools/eval.mjs arabic accents  named decks only
//   node tools/eval.mjs --model gemini-3.5-flash
//
// Re-run this whenever the model, the prompt, or the clip set changes. It is the only thing
// standing between a considered decision and another unverified default.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);
// same prompt and schema the app uses, imported not copied
const { SYSTEM: BASE, SCHEMA, MODEL: DEFAULT_MODEL } = await import(pathToFileURL(path.join(ROOT, 'api/prompt.js')).href);

const argv = process.argv.slice(2);
const modelFlag = argv.indexOf('--model');
const MODEL = modelFlag >= 0 ? argv[modelFlag + 1] : DEFAULT_MODEL;
const decks = argv.filter((a) => !a.startsWith('--') && a !== MODEL);

const SYSTEM = BASE;
const CONCURRENCY = 3;

// The 'languages' deck asks a different question. Its clips are spoken-Wikipedia recordings
// pinned at the LANGUAGE's home region, not at the reader's hometown — Persian sits in the
// middle of Iran because that is where Persian lives, and the uploader's actual origin is
// not recorded anywhere. That makes it a fine game deck ("hear a language, pin where it is
// spoken") and a meaningless accuracy benchmark: the model answered "Tehran" for Persian and
// scored 414 km wrong for being right. Excluded unless asked for by name.
const EVAL_EXCLUDE = new Set(['languages']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function locate(b64, mime) {
  for (let i = 0; i < 5; i++) {
    let r;
    try {
      r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: b64 } }, { text: 'Where did this person grow up?' }] }],
            generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
          }),
          signal: AbortSignal.timeout(60000),
        },
      );
    } catch { await sleep(3000); continue; }
    if (r.status === 429 || r.status === 503) { await sleep(8000 * (i + 1)); continue; }
    if (!r.ok) return null;
    const j = await r.json();
    const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    try { return JSON.parse(t); } catch { return null; }
  }
  return null;
}

function km(aLat, aLng, bLat, bLng) {
  const R = 6371; const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function stats(list) {
  const d = list.filter((x) => x != null).sort((a, b) => a - b);
  if (!d.length) return null;
  const pc = (t) => Math.round((d.filter((x) => x <= t).length / d.length) * 100);
  return {
    n: d.length,
    median: Math.round(d[Math.floor(d.length / 2)]),
    within100: pc(100), within250: pc(250), within500: pc(500), within1000: pc(1000),
  };
}

// Local files only: YouTube-embedded clips have no bytes to send.
const all = [];
for (const [deck, clips] of Object.entries(window.CLIPS)) {
  if (decks.length ? !decks.includes(deck) : EVAL_EXCLUDE.has(deck)) continue;
  for (const c of clips) {
    // Sourced clips were chosen by this same model agreeing with the video's claimed origin.
    // Scoring against them would be scoring a model on a test set it picked — it would look
    // brilliant and mean nothing. Hand-labelled clips are the only honest benchmark.
    if (c.evalExclude) continue;
    if (!c.url || c.lat == null) continue;
    const file = path.join(ROOT, c.url.replace(/^\//, ''));
    if (fs.existsSync(file)) all.push({ deck, ...c, file });
  }
}

const OUT = path.join(ROOT, 'data', `eval-${MODEL}.json`);

// The resume cache exists so an interrupted run can pick up where it stopped. It also,
// silently, made prompt experiments meaningless: re-running after editing the prompt replayed
// every cached answer and issued no API calls at all. A 10k-character rewrite of the Syria
// notes "measured" byte-identical to the version it replaced — same distances, same evidence
// strings — and only that impossible identity gave it away. So the cache is now keyed to the
// exact prompt text. Change one character and the whole file is discarded and re-run.
// SYSTEM and SCHEMA both shape the answer — the schema's field descriptions steer the model
// just like prompt text does — so both are in the cache key. Keyed to SYSTEM alone, adding a
// schema field would silently replay old results as a "measurement" of the new schema.
const PROMPT_HASH = crypto.createHash('sha256').update(SYSTEM + JSON.stringify(SCHEMA)).digest('hex').slice(0, 12);
const priorRaw = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
const stale = priorRaw && priorRaw.promptHash !== PROMPT_HASH;
if (stale) console.log(`prompt changed (${priorRaw.promptHash || 'unhashed'} -> ${PROMPT_HASH}) — ignoring ${priorRaw.results.length} cached results
`);
const prior = stale || !priorRaw ? { results: [] } : priorRaw;
const done = new Map(prior.results.map((r) => [r.id, r]));
const results = [];

console.log(`${MODEL} · ${all.length} clips · ${new Set(all.map((c) => c.deck)).size} decks\n`);

let i = 0;
async function worker() {
  while (i < all.length) {
    const c = all[i]; i += 1;
    if (done.has(c.id)) { results.push(done.get(c.id)); continue; }
    const mime = c.file.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
    const g = await locate(fs.readFileSync(c.file).toString('base64'), mime);
    if (!g || typeof g.lat !== 'number') {
      console.log(`  FAIL  ${c.deck}/${c.label}`);
      results.push({ id: c.id, deck: c.deck, label: c.label, km: null });
      continue;
    }
    const d = km(c.lat, c.lng, g.lat, g.lng);
    results.push({
      id: c.id, deck: c.deck, label: c.label, km: d,
      guess: g.place, radius: g.radius_km, language: g.language, confidence: g.confidence,
      evidence: g.evidence,
    });
    console.log(`${String(Math.round(d)).padStart(5)} km  ${c.deck.padEnd(11)} ${c.label.slice(0, 30).padEnd(31)} -> ${(g.place || '').slice(0, 34)}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const byDeck = {};
for (const r of results) (byDeck[r.deck] ||= []).push(r.km);

console.log('\n────────────────────────────────────────────────────────────────');
console.log('deck          n   median   <100km  <250km  <500km');
for (const [deck, list] of Object.entries(byDeck).sort()) {
  const s = stats(list);
  if (!s) { console.log(`${deck.padEnd(13)} all failed`); continue; }
  console.log(`${deck.padEnd(13)}${String(s.n).padStart(3)}  ${String(s.median).padStart(6)} km  ${String(s.within100).padStart(5)}%  ${String(s.within250).padStart(5)}%  ${String(s.within500).padStart(5)}%`);
}
const overall = stats(results.map((r) => r.km));
console.log('────────────────────────────────────────────────────────────────');
console.log(`OVERALL      ${String(overall.n).padStart(3)}  ${String(overall.median).padStart(6)} km  ${String(overall.within100).padStart(5)}%  ${String(overall.within250).padStart(5)}%  ${String(overall.within500).padStart(5)}%`);
console.log(`failed: ${results.filter((r) => r.km == null).length}`);
console.log('published SOTA for this task: 481 km median');

// Printed every run because it was learned the hard way. Two runs of the IDENTICAL prompt over
// these clips gave 37 km and 51 km, with 13 of 106 clips moving over 100 km between them —
// Basra 0 vs 448, Manama 10 vs 434. Prompt changes were accepted and rejected on gaps smaller
// than that before anyone checked, and a whole theory about long prompts "coarsening" answers
// rested on the two clips that swing hardest on their own.
console.log('\nnoise floor: repeat runs of the SAME prompt differ by ~14 km median.');
console.log('a gap smaller than that is not a result — re-run both arms, or build a controlled');
console.log('probe that holds the audio fixed and changes one thing.');

fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ model: MODEL, promptHash: PROMPT_HASH, overall, byDeck: Object.fromEntries(Object.entries(byDeck).map(([k, v]) => [k, stats(v)])), results }, null, 2));
console.log(`\nwrote ${path.relative(ROOT, OUT)}`);
