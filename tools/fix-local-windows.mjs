// Fix the local-clip leaks found by local-leak-audit + verify-local-flags.
//
//   node tools/fix-local-windows.mjs
//
// The game plays a 20 s window per clip: clips over 90 s get a RANDOM offset, shorter ones
// play from 0. That randomness is why leaks survived play-testing — exposure was
// probabilistic. The fix mirrors what shift-windows.mjs did for YouTube clips: pin a curated
// `start` on a judge-verified clean window. Three hand-decided buckets from the verify data:
//
//   REMOVE — famous voices whose identity IS the answer (Mandela, Harper, Ardern, Sotomayor,
//            LBJ, Rajiv Dixit) and blanket clips that name their own answer in every window
//            (a Sevillian reading the history of Andalusia). 30 s clips with an in-window
//            leak are here too: there is no room to move a 20 s window inside 30 s.
//   FIX    — a clean window exists somewhere; find it and pin `start`.
//   KEEP   — mentioned places are WRONG (red herrings, which mislead rather than reveal),
//            the leak sits outside the played window, or the clip is in the languages deck,
//            where understanding the words already equals knowing the answer.
//
// The per-window judge is told the clip's ANSWER and asked only whether this window gives it
// away — so herrings pass and near-answer mentions fail, which a blind "is any place named"
// gate cannot distinguish. Span timestamps from the verify pass only steer candidate
// placement; acceptance always comes from listening to the actual cut.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { MODEL } = await import(pathToFileURL(path.join(ROOT, 'api/prompt.js')).href);
const { ffmpegPath } = await import(pathToFileURL(path.join(ROOT, 'tools/ffmpeg-path.mjs')).href);
const FF = ffmpegPath().exe;

globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);

const WINDOW_S = 20;
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-fixwin-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const REMOVE = {
  'wild-mvezo-eastern-cape-south-africa': 'famous voice: Nelson Mandela — identity is the answer',
  'wild-toronto-canada': 'famous voice: Stephen Harper, plus "Canada" named throughout',
  'accents-new-zealand-english-new-zealand': 'famous voice: Jacinda Ardern',
  'wild-the-bronx-new-york-city-usa': 'famous voice: Sonia Sotomayor telling her Bronx biography',
  'wild-texas-hill-country-stonewall-usa': 'famous voice: Lyndon B. Johnson (caught via eval evidence, not the gate)',
  'hindi-urdu-rajiv-dixit-aitihasik-bhulein-historical-mista': 'famous voice: Rajiv Dixit — born in Aligarh, the answer',
  'spanish-seville-andalusia-spain-spanish-andalusian-spa': 'reads the history of Andalusia — answer named in every window',
  'chinese-nanyang-china-zhongyuan-mandarin-henan': 'dialect showcase that names Henan/Tanghe constantly',
  'ar-6158': '30s clip, "al-Hebab" (Dubai area) spoken across 0-18s — no room for a clean window',
  'ar-2278': '30s clip, "Syrian channels" spoken at 16-28s — no room for a clean window',
  'ar-1650': '30s clip, "Jerusalem municipality" spoken across 0-20s — no room for a clean window',
};

const FIX = new Set([
  'wild-amritsar-punjab-india', 'wild-huddersfield-west-yorkshire-england',
  'wild-georgetown-south-carolina-usa-us-south', 'accents-jamaica-english-jamaican-patois',
  'accents-kenya-english-kenyan', 'wild-mbaise-imo-state-nigeria', 'wild-melbourne-australia',
  'accents-aberdeenshire-scotland-english-northeast-scotl', 'accents-nigeria-nigerian-pidgin',
  'wild-sarnia-milton-ontario-canada', 'accents-west-yorkshire-england-english-west-riding-yor',
  'wild-thomastown-county-kilkenny-ireland', 'accents-namibia-english-namibian',
  'ar-6858', 'french-bargny-senegal-french-senegal', 'french-yaounde-cameroon-french-cameroon',
  'french-abidjan-cote-d-ivoire-french-cote-d-ivoire', 'french-marseille-france-french-southern-france',
  'french-montreal-canada-french-quebecois', 'chinese-guiyang-china-mandarin-guiyangese-southwestern',
  'chinese-taipei-taiwan-mandarin-taiwan-guoyu', 'chinese-taiwan-mandarin-good-cop-bad-dog-tv-episode-sp',
  'hindi-urdu-mumbai-india-hindi-bambaiyya-adjacent', 'hindi-urdu-mufti-abul-qasim-nomani-talk-on-darul-uloom-de',
  'portuguese-cape-verde-portuguese-cape-verde', 'portuguese-malanje-angola-portuguese-angola',
  'portuguese-mozambique-portuguese-mozambique', 'portuguese-sao-paulo-brazil-portuguese-brazilian-sao-paul',
  'spanish-paniahue-santa-cruz-chile-spanish-chilean',
]);

// Everything else flagged is KEEP: herring-only, leak outside the played window, or languages
// deck (understanding the words already equals the answer there).

const byId = {};
for (const [deck, clips] of Object.entries(window.CLIPS)) for (const c of clips) byId[c.id] = { deck, ...c };

const verify = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'local-flag-verify.json'), 'utf8')).out;
const spansById = {};
for (const v of verify) spansById[v.id] = v;

const durOf = (f) => {
  try {
    return parseFloat(execFileSync(FF.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1'),
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f],
      { encoding: 'utf8' }).trim()) || 0;
  } catch { return 0; }
};

function gateFor(clip) {
  return `You are checking a ${WINDOW_S}-second audio window for a listening game where players
guess where the speaker is from. For THIS clip the correct answer is: ${clip.label}.
Answer only:
- reveals: true ONLY if the words in this window give that answer away — the answer place
  itself, a place inside or right next to it, its country, region, nationality or language
  community named as the speaker's own, or a person named or identifiable whose origin is
  famously the answer. Mentions of UNRELATED, WRONG places do NOT count — those mislead
  players and are fine.
- said: what was said that reveals it, else empty.
- famous: the speaker's name if you are confident they are a widely recognizable public
  figure by voice alone, else empty.
- quality: how clean and audible the speech is, 1 (unusable) to 5 (clear).
- speechless: true if there is no connected human speech at all.`;
}
const SCHEMA = {
  type: 'object',
  properties: {
    reveals: { type: 'boolean' }, said: { type: 'string' }, famous: { type: 'string' },
    quality: { type: 'integer' }, speechless: { type: 'boolean' },
  },
  required: ['reveals', 'quality'],
};

async function judgeWindow(clip, file, startS) {
  const cut = path.join(WORK, `${clip.id.replace(/[^\w-]/g, '')}-${Math.round(startS)}.mp3`);
  try {
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(startS), '-i', file,
      '-t', String(WINDOW_S), '-ac', '1', '-ar', '16000', '-b:a', '48k', cut], { stdio: 'pipe' });
  } catch { return null; }
  const b64 = fs.readFileSync(cut).toString('base64');
  fs.rmSync(cut, { force: true });
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: gateFor(clip) }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: b64 } },
            { text: 'Check this window.' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if ([429, 503, 400].includes(r.status)) { await sleep(6000 + i * 3000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(3000); }
  }
  return null;
}

// Candidate starts from the gaps between known leak spans. Model timestamps are shaky (some
// use M.SS minute notation, some hallucinate past the file end), so spans only steer
// placement — the judge listening to the actual cut is the arbiter.
function candidatesFor(clip, dur) {
  const v = spansById[clip.id];
  let spans = (v?.spans || []).map((s) => ({ a: s.start_s, b: s.end_s }));
  const allTiny = spans.length && spans.every((s) => s.b < 10) && dur > 100;
  if (allTiny) spans = spans.map((s) => ({ a: mmToS(s.a), b: mmToS(s.b) })); // M.SS notation
  spans = spans.filter((s) => s.a < dur).map((s) => ({ a: Math.max(0, s.a - 1), b: Math.min(dur, s.b + 1) }));
  spans.sort((x, y) => x.a - y.a);
  const gaps = [];
  let cur = 0;
  for (const s of spans) { if (s.a - cur >= WINDOW_S + 3) gaps.push([cur, s.a]); cur = Math.max(cur, s.b); }
  if (dur - cur >= WINDOW_S + 3) gaps.push([cur, dur]);
  gaps.sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]));
  const out = [];
  for (const [a, b] of gaps) {
    const mid = Math.max(a + 1, Math.min((a + b) / 2 - WINDOW_S / 2, b - WINDOW_S - 1));
    out.push(mid);
    if (b - a > 2.5 * WINDOW_S) { out.push(a + 2); out.push(b - WINDOW_S - 2); }
  }
  // short-clip fallbacks: tail window, and just past the last span
  if (!out.length) {
    if (dur > WINDOW_S + 2) out.push(dur - WINDOW_S - 0.5);
    if (spans.length && spans[spans.length - 1].b < dur - 15) out.push(spans[spans.length - 1].b);
  }
  return [...new Set(out.map((s) => Math.round(Math.max(0, Math.min(s, dur - WINDOW_S)) * 2) / 2))].slice(0, 6);
}
const mmToS = (t) => Math.floor(t) * 60 + Math.round((t - Math.floor(t)) * 100);

const fixQueue = [...FIX].map((id) => byId[id]).filter(Boolean);
const results = { fixed: {}, failed: [], removed: [] };

async function worker() {
  while (fixQueue.length) {
    const clip = fixQueue.shift();
    const file = path.join(ROOT, clip.url.replace(/^\//, ''));
    const dur = durOf(file);
    const cands = candidatesFor(clip, dur);
    let ok = false;
    for (const s of cands) {
      const g = await judgeWindow(clip, file, s);
      if (!g) { console.log(`    ${clip.label.padEnd(28)} @${s}s: judge fail`); continue; }
      if (!g.reveals && !g.speechless && !g.famous && (g.quality || 0) >= 3) {
        results.fixed[clip.id] = s;
        console.log(`  ✓ ${clip.label.padEnd(28)} start -> ${s}s (of ${Math.round(dur)}s)`);
        ok = true;
        break;
      }
      console.log(`    ${clip.label.padEnd(28)} @${s}s: ${g.speechless ? 'no speech' : g.reveals ? 'reveals: ' + (g.said || '?') : g.famous ? 'famous: ' + g.famous : 'quality ' + g.quality}`);
      await sleep(400);
    }
    if (!ok) { results.failed.push(clip.id); console.log(`  ✗ ${clip.label.padEnd(28)} no clean window — will remove`); }
  }
}
console.log(`searching clean windows for ${fixQueue.length} clips\n`);
await Promise.all([worker(), worker(), worker()]);
fs.rmSync(WORK, { recursive: true, force: true });

// ── apply ──
let src = fs.readFileSync(path.join(ROOT, 'js/clips.js'), 'utf8');
const backup = path.join(ROOT, 'data', 'clips-backup-pre-localfix.js');
if (!fs.existsSync(backup)) fs.writeFileSync(backup, src);

function clipObjectRange(source, id) {
  const i = source.indexOf(`"${id}"`);
  if (i < 0) return null;
  const objStart = source.lastIndexOf('{', i);
  let depth = 0, j = objStart;
  while (j < source.length) { if (source[j] === '{') depth++; else if (source[j] === '}') { depth--; if (!depth) break; } j++; }
  return [objStart, j + 1];
}

for (const [id, s] of Object.entries(results.fixed)) {
  const r = clipObjectRange(src, id);
  if (!r) continue;
  const obj = src.slice(r[0], r[1]);
  const patched = /"start":\s*[\d.]+/.test(obj)
    ? obj.replace(/"start":\s*[\d.]+/, `"start": ${s}`)
    : obj.replace(/\{\s*/, `{\n        "start": ${s}, `);
  src = src.slice(0, r[0]) + patched + src.slice(r[1]);
}

const allRemovals = { ...REMOVE };
for (const id of results.failed) allRemovals[id] = 'no clean 20s window found by the fixer';
const quarantined = [];
for (const [id, reason] of Object.entries(allRemovals)) {
  const c = byId[id];
  if (!c) { console.log(`  removal target not found: ${id}`); continue; }
  const r = clipObjectRange(src, id);
  if (!r) continue;
  let [a, b] = r;
  const after = src.slice(b).match(/^\s*,/);
  if (after) b += after[0].length;
  else { const before = src.slice(0, a).match(/,\s*$/); if (before) a -= before[0].length; }
  src = src.slice(0, a) + src.slice(b);
  quarantined.push({ id, deck: c.deck, label: c.label, url: c.url, reason });
  results.removed.push(id);
}
fs.writeFileSync(path.join(ROOT, 'js/clips.js'), src);

const qPath = path.join(ROOT, 'data', 'quarantine-local.json');
const prevQ = fs.existsSync(qPath) ? JSON.parse(fs.readFileSync(qPath, 'utf8')) : [];
fs.writeFileSync(qPath, JSON.stringify([...prevQ, ...quarantined], null, 2));
fs.writeFileSync(path.join(ROOT, 'data', 'local-fix-results.json'), JSON.stringify(results, null, 2));

console.log(`\npinned ${Object.keys(results.fixed).length} · removed ${results.removed.length} (${Object.keys(REMOVE).length} decided + ${results.failed.length} unsalvageable) — clips.js patched, backup at data/clips-backup-pre-localfix.js`);
