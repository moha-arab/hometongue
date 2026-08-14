// Rules about a verdict that are not about HTTP.
//
// These lived inside api/analyze.js, which is a Vercel request handler — `handler(req, res)`,
// wrapped in same-origin checks, per-IP rate limiting and a shared daily cap. That makes them
// unreachable from anything that is not a browser request, so tools/source-clips.mjs, which vets
// candidate clips with the very same model and prompt, could not apply them and grew its own
// weaker version instead. Two copies of one rule is how the two drift apart.
//
// Nothing in here touches req, res, quotas or the network, so both callers can share it.

// A verdict can be right for the wrong reason. If the model's evidence is "he says he is from
// Cairo" rather than something it actually heard in the voice, the answer is a transcript lookup
// wearing an accent model's clothes — impressive-looking and worthless, because the speaker could
// have named any city on earth and been believed.
export const TOLD_NOT_HEARD = /\b(stated?|states|saying|says|said|mention(s|ed)?|explicitly|self-identif|introduc\w+|claims?|tells? us|their name|name is|named)\b/i;

// True when at least one piece of evidence is acoustic rather than testimonial.
export function heardSomething(result) {
  const chips = (Array.isArray(result?.evidence) ? result.evidence : []).filter(Boolean);
  return chips.some((c) => !TOLD_NOT_HEARD.test(String(c)));
}

// THE SECOND MODEL, DERIVED RATHER THAN LISTED.
//
// Writing the pair out by hand is how a fallback stops being a fallback: a hardcoded
// [MODEL, 'gemini-3.6-flash'] is only a real second opinion while MODEL happens not to be
// gemini-3.6-flash, and the day it is, the chain retries the same model twice and calls it
// resilience. Deriving the partner from MODEL means changing the primary can never silently
// collapse the chain.
export function modelChain(model) {
  const fallback = model === 'gemini-3.6-flash' ? 'gemini-3.5-flash' : 'gemini-3.6-flash';
  return [model, fallback];
}
