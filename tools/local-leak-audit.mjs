// The yt clips were leak-audited at their real playback windows after the Minsk incident,
// but the 132 LOCAL clips — the majority of the game — never went through a says-place gate:
// they predate it, and the eval only catches a leak when the model happens to confess one in
// its evidence. This runs the same gate over every local file (the full audio, which is what
// the game plays), plus one question the yt audit lacked: is the speaker a recognizable
// public figure? Mandela and LBJ are in the accents deck; recognizing a famous voice hands
// over the answer as surely as hearing the city named.
//
//   node tools/local-leak-audit.mjs
//
// A place_said that is NOT the clip's answer is a red herring (difficulty), so flags need
// human review against the label before anything is removed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { MODEL } = await import(pathToFileURL(path.join(ROOT, 'api/prompt.js')).href);

globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GATE = `You are checking an audio clip for a listening game where players guess where
the speaker is from. Answer only these questions about THIS audio:
- quality: how clean and audible is the speech, 1 (unusable) to 5 (clear)?
- says_place: true if anyone says out loud which city, country, region or nationality they
  or the location are, in ANY language ("I'm from Minsk", "здесь в Минске", "نحن في بغداد",
  a radio ident naming its city, an interviewer naming the street or the speaker's country).
  A player who understands the language would learn the answer from the words alone.
- place_said: if says_place, the place named, else empty.
- famous: if the speaker is a widely recognizable public figure (politician, athlete,
  musician, actor), their name; else empty. Only name someone you are confident of.
- speechless: true if there is no connected human speech at all.`;
const SCHEMA = {
  type: 'object',
  properties: {
    quality: { type: 'integer' }, says_place: { type: 'boolean' },
    place_said: { type: 'string' }, famous: { type: 'string' },
    speechless: { type: 'boolean' },
  },
  required: ['quality', 'says_place'],
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

const targets = [];
for (const [deck, clips] of Object.entries(window.CLIPS)) {
  for (const c of clips) {
    if (c.kind === 'yt') continue;
    const f = path.join(ROOT, (c.url || '').replace(/^\//, ''));
    if (!c.url || !fs.existsSync(f)) { console.log(`  NO FILE  ${deck}/${c.label}`); continue; }
    targets.push({ deck, id: c.id, label: c.label, f });
  }
}
console.log(`auditing ${targets.length} local clips (full file, as the game plays them)\n`);

const results = [];
let done = 0;
async function worker() {
  while (targets.length) {
    const c = targets.shift();
    const g = await judge(fs.readFileSync(c.f).toString('base64'));
    done += 1;
    if (!g) { console.log(`  JUDGE FAIL  ${c.deck}/${c.label}`); results.push({ ...c, f: undefined, why: 'judge failed' }); continue; }
    const bad = g.speechless ? 'no speech'
      : g.says_place ? `SAYS PLACE: ${g.place_said || '?'}`
        : g.famous ? `FAMOUS: ${g.famous}`
          : (g.quality || 0) < 3 ? `quality ${g.quality}/5`
            : null;
    console.log(`  ${bad ? '✗' : 'ok'} [${String(done).padStart(3)}] ${c.deck.padEnd(11)} ${c.label.slice(0, 26).padEnd(28)} q${g.quality}${bad ? '  ' + bad : ''}${!bad && g.famous ? '' : ''}`);
    if (bad) results.push({ id: c.id, deck: c.deck, label: c.label, why: bad });
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);

fs.writeFileSync(path.join(ROOT, 'data', 'local-audit.json'), JSON.stringify({ flagged: results }, null, 2));
console.log(`\nflagged ${results.length} — wrote data/local-audit.json`);
