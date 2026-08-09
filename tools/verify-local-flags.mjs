// Second pass over every clip the local audit flagged: confirm the leak with an independent
// listen and get the exact spans where it is spoken, so the fix can be a trim instead of a
// removal. Wholesale deletion would gut the small decks (hindi-urdu has 6 clips); cutting
// the leaking sentence out of a local file we own preserves the deck.
//
//   node tools/verify-local-flags.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GATE = `You are checking an audio clip for a listening game where players guess where
the speaker is from. Find EVERY moment where the words give the answer away:
- any place name that is spoken aloud (city, country, region, nationality, landmark), in any
  language, by anyone in the clip
- any person's name spoken aloud that identifies the speaker (e.g. an interviewer saying
  "here with John Smith")
For each such moment give the start and end seconds of the WHOLE SENTENCE containing it (be
generous, err one second wider on each side), the quote, and what it reveals.
Also: famous = the speaker's name if they are a widely recognizable public figure by VOICE
alone (politician, athlete, musician), else empty. quality = 1 (unusable) to 5 (clear).`;
const SCHEMA = {
  type: 'object',
  properties: {
    leaks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          start_s: { type: 'number' }, end_s: { type: 'number' },
          quote: { type: 'string' }, reveals: { type: 'string' },
        },
        required: ['start_s', 'end_s', 'reveals'],
      },
    },
    famous: { type: 'string' },
    quality: { type: 'integer' },
  },
  required: ['leaks', 'quality'],
};

async function judge(b64) {
  for (let i = 0; i < 5; i++) {
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
        signal: AbortSignal.timeout(90000),
      });
      if ([429, 503, 400].includes(r.status)) { await sleep(6000 + i * 4000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(3000); }
  }
  return null;
}

const durOf = (f) => {
  try {
    return parseFloat(execFileSync(FF.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1'),
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f],
      { encoding: 'utf8' }).trim()) || 0;
  } catch { return 0; }
};

const byId = {};
for (const [deck, clips] of Object.entries(window.CLIPS)) for (const c of clips) byId[c.id] = { deck, ...c };

const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'local-audit.json'), 'utf8'));
const flagged = audit.flagged.filter((f) => f.why && f.why.startsWith('SAYS PLACE') || (f.why || '').startsWith('FAMOUS'));
console.log(`verifying ${flagged.length} flagged local clips with span timestamps\n`);

const out = [];
const queue = flagged.slice();
async function worker() {
  while (queue.length) {
    const f = queue.shift();
    const c = byId[f.id];
    if (!c || !c.url) continue;
    const file = path.join(ROOT, c.url.replace(/^\//, ''));
    const g = await judge(fs.readFileSync(file).toString('base64'));
    if (!g) { console.log(`  JUDGE FAIL  ${f.deck}/${f.label}`); out.push({ ...f, verify: 'failed' }); continue; }
    const dur = durOf(file);
    const spans = (g.leaks || []).filter((l) => l.end_s > l.start_s);
    const cut = spans.reduce((s, l) => s + (l.end_s - l.start_s), 0);
    console.log(`  ${f.deck.padEnd(11)} ${f.label.slice(0, 26).padEnd(28)} dur ${Math.round(dur)}s  spans ${spans.length} (${Math.round(cut)}s)${g.famous ? '  FAMOUS: ' + g.famous : ''}`);
    for (const l of spans) console.log(`      ${l.start_s}-${l.end_s}s  ${l.reveals}  "${(l.quote || '').slice(0, 70)}"`);
    out.push({ id: f.id, deck: f.deck, label: f.label, firstWhy: f.why, dur, famous: g.famous || '', spans });
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);

fs.writeFileSync(path.join(ROOT, 'data', 'local-flag-verify.json'), JSON.stringify({ out }, null, 2));
console.log(`\nwrote data/local-flag-verify.json (${out.length} clips)`);
