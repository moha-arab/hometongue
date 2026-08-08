// Listen to the EXACT window each YouTube clip plays in the game and ask the only questions
// a player would: can I hear it, and does it give away the answer?
//
//   node tools/leak-audit.mjs            all yt clips
//   node tools/leak-audit.mjs russian    one deck
//
// Why this exists: a Minsk clip shipped whose video was literally a "where are Minsk
// residents from" street survey — every window leaked the answer. The original sourcing gate
// asked its questions about a window near the START of the video, but merged clips play a
// CURATED window (clip.start) that nobody re-checked, and older clips predate the
// states-origin question entirely. This audits what actually plays, in any language.
//
// Audio is fetched transiently and deleted after judging, same as every other tool here.
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
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-leak-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Deliberately never asks where the speaker is from — this is a leak check, not a re-gate.
const GATE = `You are checking a short audio clip that will be used in a listening game where
players guess where the speaker is from. Answer only these questions about THIS audio:
- quality: how clean and audible is the speech, 1 (unusable) to 5 (clear)?
- says_place: true if anyone in the clip says out loud which city, country, region or
  nationality they or the location are — in ANY language ("I'm from Minsk", "здесь в Минске",
  "نحن في بغداد", a radio ident naming the station's city, an interviewer naming the street).
  A player who understands the language would learn the answer from the words alone.
- place_said: if says_place, the place named, else empty.
- speechless: true if there is no connected human speech at all.`;

const SCHEMA = {
  type: 'object',
  properties: {
    quality: { type: 'integer' },
    says_place: { type: 'boolean' },
    place_said: { type: 'string' },
    speechless: { type: 'boolean' },
  },
  required: ['quality', 'says_place'],
};

function grabWindow(id, startS) {
  const raw = path.join(WORK, `${id}.m4a`);
  const cut = path.join(WORK, `${id}.mp3`);
  try {
    execFileSync('yt-dlp', [
      `https://www.youtube.com/watch?v=${id}`, '-f', 'bestaudio[abr<128]/bestaudio',
      '-o', raw, '--no-warnings', '--no-playlist',
      '--download-sections', `*${startS}-${startS + WINDOW_S + 3}`,
      '--force-keyframes-at-cuts', '--ffmpeg-location', path.dirname(FF),
    ], { stdio: 'pipe', timeout: 180000 });
    const found = fs.readdirSync(WORK).find((f) => f.startsWith(id) && !f.endsWith('.mp3'));
    if (!found) return null;
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(WORK, found),
      '-t', String(WINDOW_S), '-ac', '1', '-ar', '16000', '-b:a', '48k', cut], { stdio: 'pipe' });
    return fs.existsSync(cut) ? cut : null;
  } catch { return null; }
}
function wipe(id) {
  for (const f of fs.readdirSync(WORK)) if (f.startsWith(id)) fs.rmSync(path.join(WORK, f), { force: true });
}

async function judge(file) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: GATE }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: fs.readFileSync(file).toString('base64') } },
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

const only = process.argv[2];
const targets = [];
for (const [deck, clips] of Object.entries(window.CLIPS)) {
  if (only && deck !== only) continue;
  for (const c of clips) if (c.kind === 'yt') targets.push({ deck, ...c });
}
console.log(`auditing ${targets.length} YouTube clips at their real playback windows\n`);

const flagged = [];
for (const c of targets) {
  const file = grabWindow(c.videoId, c.start || 0);
  if (!file) { console.log(`  FETCH FAIL  ${c.deck}/${c.label}`); flagged.push({ id: c.id, deck: c.deck, label: c.label, why: 'fetch failed, could not audit' }); continue; }
  const g = await judge(file);
  wipe(c.videoId);
  if (!g) { console.log(`  JUDGE FAIL  ${c.deck}/${c.label}`); continue; }
  const bad = g.speechless ? 'no speech in window'
    : g.says_place ? `SAYS PLACE: ${g.place_said || '?'}`
      : (g.quality || 0) < 3 ? `quality ${g.quality}/5`
        : null;
  console.log(`  ${bad ? '✗' : 'ok'}  ${c.deck.padEnd(11)} ${c.label.slice(0, 26).padEnd(28)} q${g.quality}${bad ? '  ' + bad : ''}`);
  if (bad) flagged.push({ id: c.id, deck: c.deck, label: c.label, start: c.start || 0, why: bad });
  await sleep(700);
}

fs.rmSync(WORK, { recursive: true, force: true });
fs.writeFileSync(path.join(ROOT, 'data', 'leak-audit.json'), JSON.stringify({ ts: 0, flagged }, null, 2));
console.log(`\nflagged ${flagged.length} of ${targets.length} — wrote data/leak-audit.json`);
