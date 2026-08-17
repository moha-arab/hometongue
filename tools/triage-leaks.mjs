// Separate a LEAK from a RED HERRING.
//
//   node tools/triage-leaks.mjs
//
// audit-hosted.mjs flags any window where somebody names a place. Most of those are harmless:
// the Cairo clip mentions New Jersey, the Peru clip mentions Oxford, the Argentina clip is
// literally a reading about a Brazilian town. Naming the WRONG place misleads a player, which
// is difficulty and worth keeping. Naming the answer's own city, region or country hands the
// round over.
//
// The test is not "was a place named" but "would hearing that place tell a player the answer",
// and that is a judgement about geography, so it is asked directly, once per flagged window,
// with the clip's real answer supplied. Deliberately conservative: anything that narrows the
// player to the right country counts as a leak, including a neighbouring town nobody abroad
// has heard of, because the game is played by people who DO know the region.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const MODEL = 'gemini-3.5-flash';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { problems } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/hosted-audit.json'), 'utf8'));
const said = problems.filter((p) => /SAYS PLACE:/.test(p.why || ''));

const SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['leak', 'red_herring'] },
    reason: { type: 'string' },
  },
  required: ['verdict', 'reason'],
};

async function ask(answer, deck, named) {
  const prompt = `A listening game plays a clip and the player must guess where the speaker is
from. The correct answer for this clip is: ${answer}${deck === 'languages' ? ' (the deck asks which country the LANGUAGE belongs to)' : ''}.

Someone in the clip says these place names out loud: ${named}

Would hearing those place names tell a player the correct answer, or point them somewhere else?
Answer "leak" if the named places are in, near, or part of the correct answer's own country or
region, so a player who knows the area would be handed the answer. Answer "red_herring" if they
point somewhere else entirely, which misleads rather than reveals.`;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!r.ok) { await sleep(2000); continue; }
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(2000); }
  }
  return null;
}

const leaks = [], herrings = [];
for (const p of said) {
  const named = String(p.why).replace(/.*SAYS PLACE:\s*/, '').split(' · ')[0];
  const g = await ask(p.label, p.deck, named);
  const rec = { ...p, named, verdict: g ? g.verdict : 'unknown', reason: g ? g.reason : '' };
  (rec.verdict === 'leak' ? leaks : herrings).push(rec);
  const tag = rec.verdict === 'leak' ? 'LEAK       ' : 'red herring';
  console.log(`  ${tag} ${String(p.deck).padEnd(11)} ${String(p.label).slice(0, 24).padEnd(26)} @${String(p.off).padStart(5)}s  says: ${named.slice(0, 40)}`);
}

fs.writeFileSync(path.join(ROOT, 'data/leak-triage.json'), JSON.stringify({ leaks, herrings }, null, 2));
console.log(`\n${leaks.length} genuine leak window(s), ${herrings.length} red herring(s) — wrote data/leak-triage.json`);
console.log('\nclips needing action (a leak in a window a player can actually draw):');
const byClip = {};
for (const l of leaks) (byClip[`${l.deck}|${l.label}`] ||= []).push(l);
for (const [k, v] of Object.entries(byClip)) {
  console.log(`  ${k.replace('|', ' / ')}  — leaks at ${v.map((x) => `${x.off}s`).join(', ')}${v[0].curated ? '  (curated window)' : '  (random window)'}`);
}
