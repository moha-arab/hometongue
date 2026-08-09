// How much is a single "ok" from the leak judge worth? Measure it instead of asserting it.
//
//   node tools/validate-judge.mjs
//
// Three passes, sequential because parallel YouTube fetches re-trigger the throttle:
//  1. RECALL — the 13 windows known to leak (original starts, from data/leak-audit.json) are
//     fetched once and judged twice each. If the judge re-catches them consistently, its "ok"
//     verdicts carry weight; if it misses known leaks, single-pass clearance means little.
//  2. SECOND PASS — every clip the audit called "ok" gets one more independent listen, so
//     each clean clip ends up cleared by two separate judgments.
//  3. RETRY — the clips whose fetch failed mid-audit get another attempt.
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

const WINDOW_S = 22;
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-vj-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GATE = `You are checking a short audio clip for a listening game where players guess
where the speaker is from. Answer only:
- quality: how clean and audible is the speech, 1 (unusable) to 5 (clear)?
- says_place: true if anyone says out loud which city, country, region or nationality they
  or the location are, in ANY language. A player who understands the language would learn
  the answer from the words alone.
- place_said: the place named if says_place, else empty.
- speechless: true if there is no connected human speech at all.`;
const SCHEMA = {
  type: 'object',
  properties: {
    quality: { type: 'integer' }, says_place: { type: 'boolean' },
    place_said: { type: 'string' }, speechless: { type: 'boolean' },
  },
  required: ['quality', 'says_place'],
};

function grab(videoId, startS) {
  const raw = path.join(WORK, `${videoId}.m4a`);
  const cut = path.join(WORK, `${videoId}.mp3`);
  try {
    execFileSync('yt-dlp', [
      `https://www.youtube.com/watch?v=${videoId}`, '-f', 'bestaudio[abr<128]/bestaudio',
      '-o', raw, '--no-warnings', '--no-playlist',
      '--download-sections', `*${startS}-${startS + WINDOW_S + 3}`,
      '--force-keyframes-at-cuts', '--ffmpeg-location', path.dirname(FF),
    ], { stdio: 'pipe', timeout: 180000 });
    const found = fs.readdirSync(WORK).find((f) => f.startsWith(videoId) && !f.endsWith('.mp3'));
    if (!found) return null;
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(WORK, found),
      '-t', String(WINDOW_S), '-ac', '1', '-ar', '16000', '-b:a', '48k', cut], { stdio: 'pipe' });
    return fs.existsSync(cut) ? fs.readFileSync(cut).toString('base64') : null;
  } catch { return null; }
}
function wipe(videoId) { for (const f of fs.readdirSync(WORK)) if (f.startsWith(videoId)) fs.rmSync(path.join(WORK, f), { force: true }); }

async function judge(b64) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: GATE }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: b64 } },
            { text: 'Check this clip.' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if ([429, 503, 400].includes(r.status)) { await sleep(6000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(3000); }
  }
  return null;
}

const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'leak-audit.json'), 'utf8'));
const byId = {};
for (const [deck, clips] of Object.entries(window.CLIPS)) for (const c of clips) byId[c.id] = { deck, ...c };

// ── 1. RECALL on known-leaky windows ──
console.log('══ 1. judge recall on the 13 known-leaking windows (2 listens each) ══');
const leaky = audit.flagged.filter((f) => f.why.startsWith('SAYS PLACE'));
let caught = 0, total = 0;
for (const f of leaky) {
  const videoId = f.id.replace(/^yt-/, '');
  const b64 = grab(videoId, f.start || 0);
  if (!b64) { wipe(videoId); console.log(`  fetch fail  ${f.label}`); continue; }
  for (let pass = 0; pass < 2; pass++) {
    const g = await judge(b64);
    if (!g) continue;
    total += 1;
    if (g.says_place) caught += 1;
    else console.log(`  MISSED  ${f.label} (pass ${pass + 1}) — known leak not re-caught`);
    await sleep(700);
  }
  wipe(videoId);
}
console.log(`  recall: ${caught}/${total} known-leak listens caught\n`);

// ── 2. SECOND PASS on the clips the audit called ok ──
console.log('══ 2. second independent listen on every "ok" clip ══');
const flaggedIds = new Set(audit.flagged.map((f) => f.id));
const oks = Object.values(byId).filter((c) => c.kind === 'yt' && !flaggedIds.has(c.id));
const newFlags = [];
for (const c of oks) {
  const b64 = grab(c.videoId, c.start || 0);
  if (!b64) { wipe(c.videoId); console.log(`  fetch fail  ${c.label}`); continue; }
  const g = await judge(b64);
  wipe(c.videoId);
  if (!g) { console.log(`  judge fail  ${c.label}`); continue; }
  const bad = g.speechless ? 'no speech' : g.says_place ? `SAYS PLACE: ${g.place_said || '?'}` : (g.quality || 0) < 3 ? `quality ${g.quality}` : null;
  console.log(`  ${bad ? '✗' : 'ok'}  ${c.deck.padEnd(11)} ${c.label.slice(0, 26).padEnd(28)}${bad ? '  ' + bad : ''}`);
  if (bad) newFlags.push({ id: c.id, deck: c.deck, label: c.label, start: c.start || 0, why: bad });
  await sleep(700);
}
console.log('');

// ── 3. RETRY the fetch failures ──
console.log('══ 3. retrying the unaudited fetch failures ══');
const fails = audit.flagged.filter((f) => f.why.includes('fetch failed'));
for (const f of fails) {
  const c = byId[f.id];
  if (!c) { console.log(`  gone from manifest  ${f.label}`); continue; }
  const b64 = grab(c.videoId, c.start || 0);
  if (!b64) { wipe(c.videoId); console.log(`  still unfetchable  ${c.label}`); continue; }
  const g = await judge(b64);
  wipe(c.videoId);
  if (!g) { console.log(`  judge fail  ${c.label}`); continue; }
  const bad = g.speechless ? 'no speech' : g.says_place ? `SAYS PLACE: ${g.place_said || '?'}` : (g.quality || 0) < 3 ? `quality ${g.quality}` : null;
  console.log(`  ${bad ? '✗' : 'ok'}  ${c.deck.padEnd(11)} ${c.label.slice(0, 26).padEnd(28)}${bad ? '  ' + bad : ''}`);
  if (bad) newFlags.push({ id: c.id, deck: c.deck, label: c.label, start: c.start || 0, why: bad });
  await sleep(700);
}

fs.rmSync(WORK, { recursive: true, force: true });
fs.writeFileSync(path.join(ROOT, 'data', 'judge-validation.json'), JSON.stringify({ recall: { caught, total }, newFlags }, null, 2));
console.log(`\nrecall ${caught}/${total} · new flags ${newFlags.length} — wrote data/judge-validation.json`);
