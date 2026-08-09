// Ask ONE question about every local people-deck clip: is this speaker a recognizable public
// figure? Exists because LBJ sat unflagged in the accents deck — the leak gate asks about
// words, and a famous voice leaks the answer without saying any. Languages deck is skipped:
// those are anonymous Wikipedia readers.
//
//   node tools/famous-sweep.mjs
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

const GATE = `Listen to this clip. Answer only:
- famous: if a speaker is a widely recognizable public figure (politician, athlete, musician,
  actor, religious leader, broadcaster) — recognizable by voice OR named in the audio — give
  their name. Only name someone you are genuinely confident of; else empty.
- why: one short phrase saying how you know (voice, named in audio, context), else empty.`;
const SCHEMA = {
  type: 'object',
  properties: { famous: { type: 'string' }, why: { type: 'string' } },
  required: ['famous'],
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
      if ([429, 503, 400].includes(r.status)) { await sleep(6000 + i * 3000); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(3000); }
  }
  return null;
}

const targets = [];
for (const [deck, clips] of Object.entries(window.CLIPS)) {
  if (deck === 'languages') continue;
  for (const c of clips) {
    if (c.kind === 'yt' || !c.url) continue;
    const f = path.join(ROOT, c.url.replace(/^\//, ''));
    if (fs.existsSync(f)) targets.push({ deck, id: c.id, label: c.label, f });
  }
}
console.log(`famous-checking ${targets.length} local people-deck clips\n`);

const hits = [];
async function worker() {
  while (targets.length) {
    const c = targets.shift();
    const g = await judge(fs.readFileSync(c.f).toString('base64'));
    if (!g) { console.log(`  judge fail  ${c.deck}/${c.label}`); continue; }
    if (g.famous) {
      hits.push({ id: c.id, deck: c.deck, label: c.label, famous: g.famous, why: g.why || '' });
      console.log(`  ★ ${c.deck.padEnd(11)} ${c.label.slice(0, 28).padEnd(30)} ${g.famous}  (${g.why || ''})`);
    }
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
fs.writeFileSync(path.join(ROOT, 'data', 'famous-sweep.json'), JSON.stringify({ hits }, null, 2));
console.log(`\n${hits.length} famous hits — wrote data/famous-sweep.json`);
