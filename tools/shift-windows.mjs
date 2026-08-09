// Find a clean playback window for clips whose current window leaks the answer.
//
//   node tools/shift-windows.mjs
//
// Input: data/leak-audit.json (from tools/leak-audit.mjs), minus any ids listed in KEEP —
// red herrings where the audio names a WRONG place, which misleads rather than reveals.
// For each true leak, candidate windows across the video are fetched and judged with the
// same gate until one is clean (no place named, quality >= 3); clips.js gets the new start.
// A clip with no clean window in the candidates is listed for removal instead.
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

// Mentions of the WRONG place mislead the player; that is difficulty, not leakage.
const KEEP = new Set(process.argv.slice(2));

const WINDOW_S = 22;
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-shift-'));
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

function grab(id, startS) {
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
function wipe(id) { for (const f of fs.readdirSync(WORK)) if (f.startsWith(id)) fs.rmSync(path.join(WORK, f), { force: true }); }

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

const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'leak-audit.json'), 'utf8'));
const leaks = audit.flagged.filter((f) => f.why.startsWith('SAYS PLACE') && !KEEP.has(f.id));
console.log(`salvaging ${leaks.length} leaking clips (${audit.flagged.length - leaks.length} kept or unaudited)\n`);

const byId = {};
for (const clips of Object.values(window.CLIPS)) for (const c of clips) byId[c.id] = c;

const newStarts = {};
const remove = [];
for (const f of leaks) {
  const clip = byId[f.id];
  if (!clip) continue;
  const base = clip.start || 0;
  // windows before and after the leaking one, nearest first
  const candidates = [base + 30, base + 60, Math.max(10, base - 30), base + 90, base + 120];
  let saved = false;
  for (const s of candidates) {
    const file = grab(clip.videoId, s);
    if (!file) { wipe(clip.videoId); continue; }
    const g = await judge(file);
    wipe(clip.videoId);
    if (g && !g.speechless && !g.says_place && (g.quality || 0) >= 3) {
      newStarts[f.id] = s;
      console.log(`  ✓ ${f.label.padEnd(26)} start ${base} -> ${s}`);
      saved = true;
      break;
    }
    console.log(`    ${f.label.padEnd(26)} window @${s}: ${!g ? 'judge fail' : g.speechless ? 'no speech' : g.says_place ? 'says ' + (g.place_said || '?') : 'quality ' + g.quality}`);
    await sleep(700);
  }
  if (!saved) { remove.push(f.id); console.log(`  ✗ ${f.label.padEnd(26)} no clean window found — remove`); }
}

fs.rmSync(WORK, { recursive: true, force: true });

// apply the new starts to clips.js in place
let src = fs.readFileSync(path.join(ROOT, 'js/clips.js'), 'utf8');
for (const [id, s] of Object.entries(newStarts)) {
  const i = src.indexOf(`"${id}"`);
  if (i < 0) continue;
  const objStart = src.lastIndexOf('{', i);
  let depth = 0, j = objStart;
  while (j < src.length) { if (src[j] === '{') depth++; else if (src[j] === '}') { depth--; if (!depth) break; } j++; }
  const obj = src.slice(objStart, j + 1);
  const patched = /"start":\s*\d+/.test(obj)
    ? obj.replace(/"start":\s*\d+/, `"start": ${s}`)
    : obj.replace(/\{\s*/, `{\n        "start": ${s}, `);
  src = src.slice(0, objStart) + patched + src.slice(j + 1);
}
fs.writeFileSync(path.join(ROOT, 'js/clips.js'), src);
fs.writeFileSync(path.join(ROOT, 'data', 'shift-results.json'), JSON.stringify({ newStarts, remove }, null, 2));
console.log(`\nshifted ${Object.keys(newStarts).length}, unsalvageable ${remove.length} — wrote data/shift-results.json`);
