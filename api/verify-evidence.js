// HomeTongue — evidence verification
//
// The evidence chips are the model narrating a verdict it already committed to, and the
// narration can lie: a card once claimed Mohammad pronounces قاعد with a hard G (the
// Jordanian shibboleth) when seven narrow-question listens across two models heard his
// actual glottal stop. Open verdict+evidence confabulates; a single narrow question about
// the same audio stays honest. So every acoustic claim is re-asked as its own narrow
// question — put to gemini-3.5-flash, a DIFFERENT model from the one that wrote the chips,
// so the witness has no story to defend. Chips that fail never reach the card.
//
// Pruning rules are deliberately conservative: only a confident "false" drops a chip;
// "unclear" keeps it. A word-quote chip whose quoted word appears in the transcript is
// auto-kept without any model call. Over-pruning real evidence would be its own dishonesty.
//
// THIS FILE IS A MODULE, NOT A ROUTE. It used to also export a request handler, so /api/
// verify-evidence was a live public endpoint that fired paid audio calls — and nothing
// called it. The client stopped using it when verification moved server-side into the
// analyze call, and the endpoint was simply left standing: reachable, billable, and serving
// nobody. Removed. (api/prompt.js is a module in this directory too, so this shape is
// already proven in deployment.)

const VERIFY_MODEL = 'gemini-3.5-flash';

// A chip that only quotes vocabulary is checkable for free: if every quoted Arabic word or
// latin-quoted term appears in the transcript, and the chip makes no claim about HOW a
// sound is produced, the transcript already vouches for it.
const SOUND_CLAIM = /pronounc|sound|vowel|consonant|stop|glottal|hard|soft|rhythm|cadence|intonation|stress|rolled|tapped|drawl|raising|merger|accent on|realiz/i;
export function chipNeedsAudio(chip, transcript) {
  if (SOUND_CLAIM.test(chip)) return true;
  const quoted = [...chip.matchAll(/[«'"']([^«'"']{1,30})['"'»]/g), ...chip.matchAll(/([؀-ۿ][؀-ۿ\s]{0,20}[؀-ۿ])/g)]
    .map((m) => m[1].trim()).filter(Boolean);
  if (!quoted.length) return true; // nothing checkable in text — let the audio decide
  return !quoted.every((q) => (transcript || '').includes(q));
}

export async function verifyEvidence({ audio, mime, evidence, transcript, apiKey }) {
  const results = evidence.map(() => 'keep');
  const audioIdx = [];
  evidence.forEach((chip, i) => { if (chipNeedsAudio(chip, transcript)) audioIdx.push(i); });
  if (!audioIdx.length) return results;

  const questions = audioIdx.map((i, n) => `${n + 1}. ${evidence[i]}`).join('\n');
  const SYS = `You are a phonetician's transcription assistant checking claims about a
recording. For each numbered claim, listen to the audio and answer only whether THIS
recording actually contains what the claim describes: the quoted words actually said, the
described sounds actually produced by the speaker. Judge only what you hear — not what is
typical for any dialect, and not whether the claim is plausible. If you cannot tell,
answer unclear.`;
  const SCHEMA = {
    type: 'object',
    properties: {
      verdicts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            claim_number: { type: 'integer' },
            holds: { type: 'string', enum: ['true', 'false', 'unclear'] },
          },
          required: ['claim_number', 'holds'],
        },
      },
    },
    required: ['verdicts'],
  };

  // ONE listen, not two. The second listen existed to protect against a ~5% per-call false
  // drop measured on true chips, back when dropping a chip was cosmetic. It is no longer
  // needed, because the rule that now depends on this is an aggregate one: a verdict stands
  // if ANY heard claim survives. With three or four claims on a typical verdict, all of them
  // having to die by chance is vanishingly unlikely, while a real fabrication fails stably
  // (7/7 across models on the narrow question). So unanimity was buying almost nothing and
  // costing a third of the per-analysis bill, on an app with no accounts and no login.
  async function oneListen() {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${VERIFY_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYS }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: mime, data: audio } },
            { text: 'Check these claims against the recording:\n' + questions },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(45000),
      }).catch(() => null);
      if (!r) continue;
      if ([429, 503].includes(r.status)) { await new Promise((res) => setTimeout(res, 4000)); continue; }
      if (!r.ok) return null;
      const j = await r.json().catch(() => null);
      try { return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '').verdicts || null; } catch { return null; }
    }
    return null;
  }
  const verdicts = await oneListen();
  if (!verdicts) return results; // verification unavailable — keep everything rather than guess
  for (const v of verdicts) {
    const idx = audioIdx[(v.claim_number || 0) - 1];
    if (idx !== undefined && v.holds === 'false') results[idx] = 'drop';
  }
  return results;
}
