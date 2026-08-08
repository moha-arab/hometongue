// Does a NAME override the voice, and can a prompt stop it?
//
// The earlier attempt to answer this was measured on the 106 benchmark clips, which was
// useless: almost none of them contain a name that contradicts the accent, so a name-focused
// instruction had nothing to act on and the counter never moved. Concluding "the prompt can't
// fix it" from that was wrong.
//
// This is the controlled version. Three clips of IDENTICAL synthetic US English differing only
// in one sentence: no name / "My name is Vladislav" / "My name is Jake". Jake is the control —
// if a neutral name also moves the answer, the problem is names in general rather than Slavic
// ones. Each clip runs against each prompt variant.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..');
// Generate the three clips first with tools/make-name-clips.ps1 — identical synthetic US
// English, differing only in one sentence.
const TTS = path.join(ROOT, 'data', 'name-probe-audio');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { SYSTEM, SCHEMA, MODEL } = await import(pathToFileURL(path.join(ROOT, 'api/prompt.js')).href);

const NAME_LINE = `
Someone's name is not evidence of where they grew up. If the sound and the words disagree,
follow the sound.`;

const HARD_LINE = `
NAMES ARE NOT EVIDENCE OF WHERE SOMEONE GREW UP, and this is the single most common way to get
this task wrong. A person with a plainly American accent who says the name Vladislav grew up in
America. Their name came from their family; their accent came from their childhood, and only
the accent answers the question you were asked. Never cite a name as evidence. If you catch
yourself reasoning from a name, discard that reasoning and listen again.`;

const VARIANTS = [
  { name: 'baseline', system: SYSTEM },
  { name: 'one-line', system: SYSTEM.replace('\n\nIf someone states where they are from', `\n${NAME_LINE}\n\nIf someone states where they are from`) },
  { name: 'emphatic', system: SYSTEM.replace('\n\nIf someone states where they are from', `\n${HARD_LINE}\n\nIf someone states where they are from`) },
];
for (const v of VARIANTS) if (v.name !== 'baseline' && v.system === SYSTEM) throw new Error(`variant ${v.name} did not apply`);

const CLIPS = ['none', 'vladislav', 'jake'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(system, b64) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/wav', data: b64 } },
            { text: 'Where did this person grow up?' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(70000),
      });
      if ([429, 503, 400].includes(r.status)) { await sleep(6000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(3000); }
  }
  return null;
}

const audio = {};
for (const c of CLIPS) audio[c] = fs.readFileSync(path.join(TTS, `${c}.wav`)).toString('base64');

for (const v of VARIANTS) {
  console.log(`\n══ ${v.name} (${v.system.length} chars)`);
  for (const c of CLIPS) {
    const g = await ask(v.system, audio[c]);
    if (!g) { console.log(`   ${c.padEnd(10)} FAILED`); continue; }
    const ev = (g.evidence || []).slice(0, 3);
    const citesName = ev.some((e) => /\bname[ds]?\b|vladislav|jake|slavic/i.test(e));
    console.log(`   ${c.padEnd(10)} ${String(g.place || '?').slice(0, 34).padEnd(36)} r=${String(g.radius_km).padStart(5)}km  ${citesName ? 'CITES NAME' : ''}`);
    ev.forEach((e) => console.log(`              · ${e}`));
    await sleep(900);
  }
}
