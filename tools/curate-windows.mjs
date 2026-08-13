// Find and pin a clean playback window for every hosted clip that leaks.
//
//   node tools/curate-windows.mjs --dry
//   node tools/curate-windows.mjs
//
// Input: data/leak-triage.json. Only clips whose leak was judged a real leak are touched; red
// herrings are left alone because naming the WRONG place is difficulty, not leakage.
//
// This fixes two things at once. The obvious one is moving off the leak. The quieter one is
// that a clip with no `start` draws a RANDOM window on every single play, so a leak anywhere in
// the first ~45% of the file reaches some players and not others, and no single audit can ever
// clear it. Pinning a start makes the clip deterministic: audited once, clean forever.
//
// Candidate windows are scanned across the whole drawable range. The first one that names no
// place and has audible speech wins. A clip with no clean window anywhere is reported for
// removal rather than quietly shipped.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { ffmpegPath } = await import(pathToFileURL(path.join(ROOT, 'tools/ffmpeg-path.mjs')).href);
const FF = ffmpegPath().exe;
const PROBE = FF.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');
const MODEL = 'gemini-3.5-flash';
const WINDOW_S = 20;
const DRY = process.argv.includes('--dry');

globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);

const { leaks } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/leak-triage.json'), 'utf8'));
const byClip = new Map();
for (const l of leaks) {
  const k = `${l.deck}|${l.label}`;
  if (!byClip.has(k)) byClip.set(k, { deck: l.deck, label: l.label, bad: [] });
  byClip.get(k).bad.push(l.off);
}

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-curate-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GATE = `You are checking a clip for a listening game where players guess where a speaker
is from. Answer about THIS audio only:
- quality: 1 (unusable) to 5 (clear)
- says_place: true if anyone names ANY city, country, region or nationality out loud, in any language
- place_said: what was named, else empty
- speechless: true if there is no connected speech`;
const SCHEMA = {
  type: 'object',
  properties: {
    quality: { type: 'integer' }, says_place: { type: 'boolean' },
    place_said: { type: 'string' }, speechless: { type: 'boolean' },
  },
  required: ['quality', 'says_place', 'speechless'],
};
async function judge(file) {
  const b64 = fs.readFileSync(file).toString('base64');
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: GATE }] },
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/mpeg', data: b64 } }, { text: 'Judge this window.' }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) { await sleep(2500); continue; }
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(2500); }
  }
  return null;
}

const fixes = [], doomed = [];
for (const { deck, label, bad } of byClip.values()) {
  const clip = (window.CLIPS[deck] || []).find((c) => c.label === label && c.url);
  if (!clip) { console.log(`  ? ${deck}/${label} not found as a hosted clip`); continue; }
  const f = path.join(ROOT, clip.url.replace(/^\//, ''));
  let dur = 0;
  try { dur = parseFloat(execFileSync(PROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim()) || 0; } catch { }
  // every offset a player could ever hear, stepped finely enough to find a gap between mentions
  const last = Math.max(0, dur - WINDOW_S - 1);
  const cands = [];
  for (let t = 0; t <= last; t += 15) cands.push(Math.round(t));
  const ordered = cands.filter((t) => !bad.some((b) => Math.abs(b - t) < 10));

  let chosen = null;
  for (const off of ordered) {
    const cut = path.join(WORK, 'w.mp3');
    try {
      execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(off), '-t', String(WINDOW_S),
        '-i', f, '-ac', '1', '-ar', '16000', '-b:a', '64k', cut], { stdio: 'pipe' });
    } catch { continue; }
    const g = await judge(cut);
    fs.rmSync(cut, { force: true });
    if (!g) continue;
    if (!g.says_place && !g.speechless && (g.quality || 0) >= 3) { chosen = off; break; }
    console.log(`      ${label.slice(0, 22).padEnd(24)} @${String(off).padStart(4)}s  ${g.speechless ? 'no speech' : g.says_place ? `says ${g.place_said}` : `quality ${g.quality}`}`);
  }
  if (chosen === null) {
    doomed.push({ deck, label });
    console.log(`  ✗ ${deck.padEnd(11)} ${label.slice(0, 26).padEnd(28)} no clean window anywhere`);
  } else {
    fixes.push({ deck, label, id: clip.id, from: clip.start, to: chosen });
    console.log(`  ✓ ${deck.padEnd(11)} ${label.slice(0, 26).padEnd(28)} start ${clip.start ?? '(random)'} -> ${chosen}`);
  }
}
fs.rmSync(WORK, { recursive: true, force: true });

if (!DRY && fixes.length) {
  let src = fs.readFileSync(path.join(ROOT, 'js/clips.js'), 'utf8');
  for (const fx of fixes) {
    const idRe = new RegExp(`("id":\\s*"${fx.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[\\s\\S]{0,2000}?)("start":\\s*[\\d.]+|("lat"))`);
    if (/"start"/.test(src.slice(src.indexOf(`"${fx.id}"`), src.indexOf(`"${fx.id}"`) + 2000))) {
      src = src.replace(idRe, (m, a, b) => (b.startsWith('"start"') ? `${a}"start": ${fx.to}` : m));
    } else {
      // no start yet: insert one just before lat so the clip stops drawing at random
      src = src.replace(idRe, (m, a, b) => `${a}"start": ${fx.to}, ${b}`);
    }
  }
  fs.writeFileSync(path.join(ROOT, 'js/clips.js'), src);
  console.log(`\nwrote ${fixes.length} curated start(s) into js/clips.js`);
} else if (DRY) {
  console.log('\n--dry: nothing written');
}
if (doomed.length) console.log(`\n${doomed.length} clip(s) have no clean window and should be removed:`), doomed.forEach((d) => console.log(`   ${d.deck} / ${d.label}`));
