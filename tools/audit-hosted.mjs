// Audit every HOSTED clip the way a player actually hears it.
//
//   node tools/audit-hosted.mjs             every deck
//   node tools/audit-hosted.mjs arabic      one deck
//
// leak-audit.mjs covers the YouTube embeds. Nothing has ever covered the 114 hosted files,
// which is most of the game and all 42 Arabic clips. This closes that.
//
// THE WINDOW IS NOT ALWAYS THE SAME, which is the part that makes a single check useless.
// game.js picks the playable slice like this:
//
//   clip.start set          -> always that window
//   no start, duration >90s -> RANDOM: 15 + rand()*dur*0.4, redrawn every single play
//   no start, short         -> from 0
//
// So for a long uncurated clip, a place name anywhere in the first ~45% of the recording leaks
// on SOME plays and not others. Auditing one window would prove nothing about the next game.
// Those clips get sampled at several points across the range they can actually draw from, and
// if any sample leaks the clip needs a curated start.
//
// Three questions per window, the same ones leak-audit asks, so the two tools are comparable:
// is the speech audible, does anyone name the place, is there speech at all.
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
const WINDOW_S = 20;          // matches CLIP_WINDOW_S in game.js
const ONLY = process.argv[2];

globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-hosted-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GATE = `You are checking a short audio clip used in a listening game where players guess
where the speaker is from. Answer only about THIS audio:
- quality: how clean and audible is the speech, 1 (unusable) to 5 (clear)?
- says_place: true if anyone says out loud which city, country, region or nationality they or
  the location are, in ANY language ("I'm from Minsk", "здесь в Минске", "نحن في بغداد", a radio
  ident naming its city). A player who understands the language would learn the answer.
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
  required: ['quality', 'says_place', 'speechless'],
};

async function judge(file) {
  const b64 = fs.readFileSync(file).toString('base64');
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: GATE }] },
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/mpeg', data: b64 } }, { text: 'Judge this clip.' }] }],
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

const durOf = (f) => {
  try { return parseFloat(execFileSync(PROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim()) || 0; }
  catch { return 0; }
};

// Exactly the offsets game.js can produce for this clip.
function windowsFor(clip, dur) {
  if (clip.start !== undefined) return [clip.start];
  if (dur > 90) {
    const hi = Math.min(15 + dur * 0.4, dur - 30);
    // three samples across the drawable range: a leak at any of them can reach a player
    return [15, (15 + hi) / 2, hi].map((x) => Math.round(x));
  }
  return [0];
}

const problems = [];
let checked = 0;
for (const [deck, list] of Object.entries(window.CLIPS)) {
  if (ONLY && deck !== ONLY) continue;
  for (const c of list) {
    if (c.kind === 'yt' || !c.url) continue;
    const f = path.join(ROOT, c.url.replace(/^\//, ''));
    if (!fs.existsSync(f)) { problems.push({ deck, label: c.label, why: 'file missing' }); continue; }
    const dur = durOf(f);
    const offsets = windowsFor(c, dur);
    for (const off of offsets) {
      const cut = path.join(WORK, 'w.mp3');
      try {
        execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(off), '-t', String(WINDOW_S),
          '-i', f, '-ac', '1', '-ar', '16000', '-b:a', '64k', cut], { stdio: 'pipe' });
      } catch { problems.push({ deck, label: c.label, off, why: 'could not cut window' }); continue; }
      const g = await judge(cut);
      fs.rmSync(cut, { force: true });
      checked += 1;
      if (!g) { problems.push({ deck, label: c.label, off, why: 'no judgement' }); continue; }
      const tags = [];
      if (g.says_place) tags.push(`SAYS PLACE: ${g.place_said || '?'}`);
      if (g.speechless) tags.push('NO SPEECH');
      if ((g.quality || 0) <= 2) tags.push(`quality ${g.quality}`);
      if (tags.length) {
        problems.push({ deck, label: c.label, off, id: c.id, curated: c.start !== undefined, why: tags.join(' · ') });
        console.log(`  ✗ ${deck.padEnd(11)} ${String(c.label).slice(0, 26).padEnd(28)} @${String(off).padStart(4)}s  ${tags.join(' · ')}`);
      }
    }
  }
}
fs.rmSync(WORK, { recursive: true, force: true });

fs.writeFileSync(path.join(ROOT, 'data/hosted-audit.json'), JSON.stringify({ ts: new Date().toISOString(), problems }, null, 2));
console.log(`\njudged ${checked} windows across the hosted clips`);
console.log(problems.length ? `${problems.length} problem window(s) — wrote data/hosted-audit.json` : 'every hosted window is clean and audible');
