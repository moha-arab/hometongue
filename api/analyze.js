// HomeTongue — /api/analyze
//
// Accepts { audio: <base64>, mime } and returns a point on Earth.
//
//   audio -> Gemini 3.6 Flash -> { lat, lng, radius_km, place, evidence, transcript }
//
// This replaced a cascade (Whisper -> text -> Claude -> country code) on 2026-08-04 after
// measuring both on 45 labelled Arabic clips and 20 English ones. The cascade scored 58% and
// 50% at country level; this scores a 33 km median error. Speech-to-text deletes the accent
// by design — standard spelling is used no matter how a word was said — so the transcript was
// throwing away the entire signal before the reasoning even started. Three separate attempts
// to recover it downstream (phoneme recogniser on Arabic, on English, prime-as-detector) all
// measured null or negative. See PRD "P3b".
//
// Measured and deliberately NOT included, each changing the answer on <10% of clips and
// splitting evenly in both directions:
//   - feeding a Whisper transcript alongside the audio (38 km vs 43 km, better on 3, worse on 4)
//   - feeding hand-written dialect marker playbooks (69 km vs 43 km, better on 2, worse on 3)
// Both cost a call and latency for noise. Do not re-add without re-running tools/eval.
import { mintToken } from './feedback.js';

// A RESULT CACHE WAS BUILT HERE AND TAKEN BACK OUT BEFORE IT EVER STORED ANYTHING.
//
// The idea was sound: a take whose connection died has already been analysed, so storing the
// answer under the take's id lets the retry collect it instead of paying for a second model call.
// What it stored was the whole result object, and the result object contains `transcript` — the
// person's own words — and evidence lines that quote their vocabulary verbatim.
//
// privacy.html says, of every analysis: "Never your recording, never your words, never a city."
// This would have made that false for every single user, silently, and it would have undone a fix
// made hours earlier that stopped the transcript leaving the browser without consent.
//
// It is a good feature. It needs the storage to hold only what is not their words, or a plain
// disclosure and a real expiry, and it needs to be decided deliberately rather than at the end of
// a long night. Doing without it costs a resumed take one more wait, which is a price the person
// can see and nobody has to be told about afterwards.
export const config = { maxDuration: 60 };

function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 8 * 1024 * 1024) reject(new Error('too_large')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// Vercel kills this function at 60s. Retrying three times at a 45s timeout each could ask
// for 135s, so a single slow call guaranteed a hard kill and a meaningless error rather than
// a real answer. Measured latency on identical payloads ranged 10s to 57s, so slow calls are
// normal, not exceptional. Budget every attempt against one shared deadline instead.
const BUDGET_MS = 50_000;

// A SECOND MODEL TO FALL BACK ON, because the first one WILL have a bad day. Measured
// 2026-08-11: gemini-3.6-flash returned HTTP 500 "Internal error encountered" on six of
// eight audio requests while text requests sailed through — a Google-side incident, not
// our key, our credit or our audio. Without a fallback that is the whole app down, and the
// one moment it cannot afford to be down is the hour a video lands.
//
// The two are a measured tie on accuracy (see the paired numbers in prompt.js), so this is
// purely a redundancy chain, not a quality ladder: whichever answers first is fine. An
// answer that exists beats a marginally different answer that does not.
//
// DERIVED, not written down, for the same reason the judge's model now is. This was
// [MODEL, 'gemini-3.6-flash'], which is a fallback only while MODEL happens not to be
// 3.6-flash. Set the primary to 3.6 - an entirely reasonable thing for a future maintainer to
// do - and the chain silently becomes [3.6, 3.6]: eight attempts at one sick model, no second
// opinion, and no error anywhere to say the safety net had been removed. That exact failure
// already happened once tonight in verify-evidence.js, where the judge quietly became the
// model it was judging. A fallback that can be turned off by an unrelated one-line edit is not
// a fallback, so the alternate is computed and the pair is asserted to be distinct.
const MODEL_CHAIN = modelChain(MODEL);

async function locate(parts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('GEMINI_API_KEY not set'), { code: 'not_configured' });

  // FOUR attempts per model, not three. The transient 400 documented above is not rare any
  // more: on 2026-08-11 a run of audio analyses failed 7 of 8 times through production while
  // the IDENTICAL payload returned 200 on the first try from a laptop, and a request that
  // failed three times in a row succeeded on the next one a minute later. Each rejection
  // costs about a second, so three attempts were spending seven seconds to conclude nothing.
  // Four per model across a two-model chain is eight chances inside one 50s budget, which is
  // where the real redundancy comes from — a model having a bad hour is answered by trying a
  // different model, not by asking the sick one more insistently.
  const MAX_ATTEMPTS = 4;
  let lastRefusal = '';
  const deadline = Date.now() + BUDGET_MS;
  for (const modelName of MODEL_CHAIN) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const left = deadline - Date.now();
    // Under 8s left is not enough for a real answer; fail honestly rather than burn the cap.
    if (left < 8000) throw Object.assign(new Error('ran out of time'), { code: 'busy' });
    let resp;
    try {
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0,
              responseMimeType: 'application/json',
              responseSchema: SCHEMA,
            },
          }),
          // never wait past the shared budget — a hung request once froze a batch for 90 min
          signal: AbortSignal.timeout(left),
        },
      );
    } catch {
      if (attempt === MAX_ATTEMPTS - 1) break;   // this model is not answering: try the next
      continue;
    }
    // Gemini returns a transient 400 "invalid argument" on a random subset of otherwise
    // identical requests — measured on production: two of four identical payloads failed in
    // ~1.4s while the others succeeded. Treating any non-429 as fatal meant giving up
    // instantly on a request that would have worked, which is what users saw as the app
    // erroring out at random. Retry anything retryable inside the budget.
    // A depleted prepay balance also arrives as 429, and retrying it is pointless — three
    // attempts and a 50-second wait end in "the model kept refusing the request", which sounds
    // like a transient blip and sent me hunting a bug that was really an empty wallet. Read the
    // body and separate out-of-credit from genuinely busy, because the fixes are unrelated.
    // Two very different things arrive as 429 and the old test could not tell them apart,
    // because a per-minute rate limit says "quota" just as loudly as an empty wallet does.
    // Found the hard way: a 200-call benchmark burst starved the live site for a few minutes
    // and every user would have been told the account was out of credit, which was false and
    // alarming. That is exactly what a viral spike looks like, so the distinction matters:
    // rate limiting is "everyone is here at once, wait a moment", an empty balance is
    // "nothing works until it is topped up".
    if (resp.status === 429) {
      const body = await resp.text().catch(() => '');
      const rateLimited = /per\s*(minute|second|day)|rate[_\s-]?limit|too many requests/i.test(body);
      if (!rateLimited && /credits? (are )?depleted|billing|insufficient|out of credit/i.test(body)) {
        throw Object.assign(new Error('the analysis account is out of credit'), { code: 'out_of_credit' });
      }
      if (rateLimited && attempt === MAX_ATTEMPTS - 1) break;
    }
    if (resp.status === 429 || resp.status === 503 || resp.status === 400 || resp.status >= 500) {
      // Keep the upstream's own words. Without this the app could only ever report "the
      // model kept refusing", which is exactly as useful as it sounds when the refusal is
      // intermittent and the same payload succeeds elsewhere.
      if (!lastRefusal) lastRefusal = `${resp.status} ${(await resp.text().catch(() => '')).slice(0, 160)}`;
      if (attempt === MAX_ATTEMPTS - 1) break;   // this model is not answering: try the next
      await new Promise((r) => setTimeout(r, Math.min(600 + 400 * attempt, Math.max(0, deadline - Date.now() - 8000))));
      continue;
    }
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw Object.assign(new Error(`analysis failed: ${resp.status} ${detail.slice(0, 200)}`), { code: 'upstream_failed' });
    }
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!text) throw Object.assign(new Error('empty response'), { code: 'upstream_failed' });
    try { return JSON.parse(text); } catch {
      throw Object.assign(new Error('unparseable response'), { code: 'upstream_failed' });
    }
  }
  }
  throw Object.assign(
    new Error(`no model could answer${lastRefusal ? ' (' + lastRefusal + ')' : ''}`),
    { code: 'upstream_failed' },
  );
}

// ONE RULE: a verdict has to rest on something the model actually HEARD.
//
// This replaced a pile of separate detectors — a name regex, an origin regex, a 60-entry
// list of countries and cities, a present-location regex, and a second model asked whether
// a voice could plausibly be from the verdict city. Each caught its own case and none of
// them shared a principle, which is why the pile kept growing. The principle was always
// simpler than the pile: the app promises to answer from sound, so if it has nothing from
// sound, it has no answer.
//
// The model already reports which it used, and does so honestly now that nothing in the
// prompt pressures it to hide (measured today: a text-only Lagos verdict cited "explicitly
// stated growing up in Lagos" and nothing else; a real Melbourne clip whose speaker SAYS
// "born in Melbourne" still cited two genuine Australian vowel observations alongside it,
// and is therefore shown, because the voice backs the words).
//
// Fabricated acoustic claims are the one thing this cannot see by itself, and they are
// exactly what the evidence verifier catches on the way to the card (measured 4/4 across
// two clips: "Slavic vowel qualities" and "rolled Spanish R" both died, true claims lived).
// The two mechanisms serve the same rule.

// A model can return anything; the map should never be asked to fly to null island.
function sane(r) {
  const num = (v) => (typeof v === 'number' && Number.isFinite(v));
  if (!num(r.lat) || !num(r.lng)) return null;
  if (r.lat < -90 || r.lat > 90 || r.lng < -180 || r.lng > 180) return null;
  return {
    lat: r.lat,
    lng: r.lng,
    radius_km: Math.min(5000, Math.max(10, Math.round(r.radius_km || 300))),
    place: String(r.place || '').slice(0, 120),
    region: String(r.region || '').slice(0, 60),
    // The dialect's real footprint, drawn by the model: a Gulf accent gets the Arabian arc,
    // not a disc whose far side lands in Tehran. Validated hard because it renders directly:
    // 3-12 points, every one a finite in-range [lat, lng] pair, or the whole thing is dropped
    // and the map falls back to the honest circle.
    zone: (() => {
      const z = Array.isArray(r.zone) ? r.zone.slice(0, 12) : [];
      const pts = z.filter((p) => Array.isArray(p) && p.length === 2
        && Number.isFinite(+p[0]) && Number.isFinite(+p[1])
        && +p[0] >= -90 && +p[0] <= 90 && +p[1] >= -180 && +p[1] <= 180)
        .map((p) => [+p[0], +p[1]]);
      if (pts.length < 3) return [];
      // The model emits good boundary points in arbitrary ORDER: a Somali-coast zone with
      // correct coverage rendered as a self-intersecting lightning bolt because the perimeter
      // walk zigzagged. Ordering is ours, not the model's — sort the points by angle around
      // their centroid so any point set draws as a simple polygon. Star-shaped concavity (the
      // Gulf crescent) survives; scrambled zigzags do not. This must happen BEFORE the
      // shoelace: a self-intersecting ring computes a bogus area (a bowtie scores ~zero) and
      // corrupts the sliver guard itself.
      const meanLat = pts.reduce((t, q) => t + q[0], 0) / pts.length;
      const kx = 111.32 * Math.cos((meanLat * Math.PI) / 180), ky = 110.57;
      const cLng = pts.reduce((t, q) => t + q[1], 0) / pts.length;
      pts.sort((p, q) => Math.atan2((p[0] - meanLat) * ky, (p[1] - cLng) * kx)
        - Math.atan2((q[0] - meanLat) * ky, (q[1] - cLng) * kx));
      // Freehand polygons vary run to run: the same Gulf prompt drew a broad Arabian arc one
      // run and a thin coastal ribbon the next, which rendered as an ugly sliver that skipped
      // eastern Saudi Arabia entirely. A zone claims the same ~70% coverage as the radius, so
      // its area has to be in the same universe as the circle's: under a fifth of it means a
      // sliver that contradicts its own claim, over six times means a smear. Both fall back to
      // the honest circle. Shoelace on an equirectangular projection is plenty at this scale.
      let area2 = 0;
      for (let i = 0; i < pts.length; i++) {
        const [aLat, aLng] = pts[i], [bLat, bLng] = pts[(i + 1) % pts.length];
        area2 += (aLng * kx) * (bLat * ky) - (bLng * kx) * (aLat * ky);
      }
      const zoneArea = Math.abs(area2) / 2;
      const radius = Math.max(10, Math.round(r.radius_km || 300));
      const circleArea = Math.PI * radius * radius;
      // Thresholds set from measured cases: the good Arabian arc scored 0.16 of its circle's
      // area and the degenerate coastal ribbon scored 0.02 — an order of magnitude apart, so
      // 0.08 splits them with margin on both sides.
      if (zoneArea < 0.08 * circleArea || zoneArea > 6 * circleArea) return [];
      // The drawing must not contradict the claim. Mohammad's Gulf-English take said
      // "somewhere in the Gulf" and then drew a border tight around Qatar and the UAE,
      // visibly excluding the Kuwait he grew up in — a wide verdict with a narrow picture,
      // which reads as a confident wrong answer. If the zone's own effective radius is less
      // than half what the verdict claims, the two disagree and the honest circle wins.
      const zoneEffRadius = Math.sqrt(zoneArea / Math.PI);
      if (zoneEffRadius < 0.5 * radius) return [];
      return pts;
    })(),
    language: String(r.language || '').slice(0, 40),
    confidence: Math.min(100, Math.max(0, Math.round(r.confidence || 0))),
    evidence: (Array.isArray(r.evidence) ? r.evidence : []).slice(0, 5).map((e) => String(e).slice(0, 200)),
    transcript: String(r.transcript || '').slice(0, 4000),
    // Measured on 25 clips: populated every time, blends sane (Bronx 80 / Puerto Rico 20) —
    // except one degenerate item whose `place` was ~3000 repeated '0's with the real text
    // buried at the end. Length caps alone would ship 80 zeros to the screen, so an item is
    // dropped outright when its place carries a long repeated-character run or it lacks a
    // usable percent. Losing one bar beats rendering garbage.
    influences: (Array.isArray(r.influences) ? r.influences : []).slice(0, 3).map((i) => ({
      place: String(i.place || '').slice(0, 80),
      percent: Math.min(100, Math.max(0, Math.round(i.percent || 0))),
      cue: String(i.cue || '').slice(0, 160),
    })).filter((i) => i.place && i.percent >= 1 && !/(.)\1{7,}/.test(i.place)),
    note: String(r.note || '').slice(0, 500),
  };
}

// Per-instance rate limit — a speed bump against credit-burning scripts, not a wall.
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, reset: now + 3600_000 };
  if (now > b.reset) { b.count = 0; b.reset = now + 3600_000; }
  b.count += 1;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear();
  return b.count > 30;
}

// THE WALLET GUARD. There are no accounts here, so per-IP limits are a speed bump that a
// script with a proxy pool walks straight past. The only limit that actually protects the
// balance is a ceiling on the total: past DAILY_ANALYSES the app stops answering and says
// so, for everyone, until the day rolls over in UTC.
//
// Counted in Supabase so every serverless instance shares one number; without that, each
// instance keeps its own count and the real total is the cap times however many instances
// Vercel happens to be running. If the count cannot be read, the analysis proceeds — an
// outage in the counter must not take the app down.
//
// Set DAILY_ANALYSES in the environment to whatever a bad day is allowed to cost. Roughly:
// one analysis is two model calls, so 20,000 a day is a comfortable viral ceiling and a
// deliberate, known maximum bill instead of an open tab.
const DAILY_CAP = Number(process.env.DAILY_ANALYSES || 20000);
const SB = () => ({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY });

// Cached per instance for 30 seconds. This used to run on the critical path of EVERY
// analysis, before any work began: a Supabase round trip, up to 2.5s, added to every single
// user's wait so the app could re-learn a number that moves by one per analysis. A wallet
// guard is a ceiling on a bad day, not an accounting ledger, so being up to 30 seconds stale
// is exactly as protective. Worst case is 30 seconds of traffic slipping past a 20,000 cap.
let capCache = { at: 0, over: false };
async function overDailyCap() {
  const { url, key } = SB();
  if (!url || !key || !Number.isFinite(DAILY_CAP) || DAILY_CAP <= 0) return false;
  if (capCache.at && Date.now() - capCache.at < 30_000) return capCache.over;
  const since = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
  try {
    const r = await fetch(`${url}/rest/v1/usage?select=id&ts=gte.${since}`, {
      headers: {
        apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0',
      },
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) return false;   // no table yet, or a blip: never take the app down over this
    const total = Number((r.headers.get('content-range') || '').split('/')[1]);
    const over = Number.isFinite(total) && total >= DAILY_CAP;
    capCache = { at: Date.now(), over };
    return over;
  } catch { return false; }
}

// Awaited, not fire-and-forget. Measured: an un-awaited insert never landed — Vercel
// freezes the invocation the instant the response is written, so the request was still in
// flight when the process was suspended and the counter stayed at zero through a real
// analysis. A cap that silently never counts is worse than no cap, because it reads as
// protection that is not there. Cost is one small round trip, capped at 2.5s, and any
// failure is swallowed: bookkeeping must never break an answer.
async function countAnalysis() {
  const { url, key } = SB();
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/usage`, {
      method: 'POST',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: '{}',
      signal: AbortSignal.timeout(2500),
    });
  } catch { /* bookkeeping is never load-bearing */ }
}

export default async function handler(req, res) {
  // Vercel kills the function at 60s. The plausibility check below only runs if there is
  // real time left after the main call, so a slow analysis never turns into a timeout.
  const t0 = Date.now();
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
  }
  res.setHeader('Content-Type', 'application/json');

  const origin = req.headers.origin || '';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  let originHost = '';
  try { originHost = origin ? new URL(origin).host : ''; } catch { /* malformed */ }
  if (!originHost || originHost !== host) {
    res.statusCode = 403;
    return res.end(JSON.stringify({ ok: false, error: 'bad_origin' }));
  }
  // x-real-ip is platform-set; the leftmost x-forwarded-for entry is client-writable and
  // let a scripted client rotate identities past the limiter (same fix clip-report shipped with)
  const ip = (req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0]).trim() || 'unknown';
  if (rateLimited(ip)) {
    res.statusCode = 429;
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited', detail: 'Slow down a little — try again in a bit.' }));
  }
  if (await overDailyCap()) {
    res.statusCode = 503;
    return res.end(JSON.stringify({
      ok: false,
      error: 'at_capacity',
      detail: 'HomeTongue has hit its listening limit for today. It resets tonight — come back and it will be free again.',
    }));
  }

  try {
    const body = await readJsonBody(req);
    const typed = (body.text || '').trim();

    // A CAP ON HOW BIG ONE REQUEST CAN BE, NOT JUST HOW MANY THERE ARE.
    //
    // DAILY_ANALYSES counts invocations, so "a deliberate, known maximum bill" above is only
    // known if a single invocation has a known maximum size — and this had none. Measured
    // against the real handler: a normal typed sentence sends ~6.8 KB upstream (~1.7k tokens),
    // while 4 MB of pasted junk sends ~4.2 MB (~1.05M tokens). Same one slot against the cap,
    // roughly six hundred times the cost. A scripted loop needs nothing but a matching Origin
    // header, which is free to set.
    //
    // Rejected BEFORE countAnalysis() and the model call, so junk costs neither a Gemini
    // request nor a slot a real visitor could have used.
    const MAX_TYPED = 1200;
    if (typed.length > MAX_TYPED) {
      res.statusCode = 413;
      return res.end(JSON.stringify({
        ok: false,
        error: 'text_too_long',
        detail: 'That is much longer than needed — a sentence or two is plenty.',
      }));
    }
    let parts;

    if (body.audio) {
      const bytes = Buffer.from(body.audio, 'base64');
      if (bytes.length < 2000) throw Object.assign(new Error('audio too short'), { code: 'audio_too_short' });
      // 2 MB, not 6. MAX_SECONDS is 60 in js/app.js, and 60s at 128kbps (the top end of what
      // Safari's recorder emits) is under 1 MB, so this is still more than double the worst
      // honest take — while cutting the accepted worst case from roughly eighteen minutes of
      // audio to nine.
      if (bytes.length > 2 * 1024 * 1024) throw Object.assign(new Error('audio too large'), { code: 'audio_too_large' });
      parts = [
        { inlineData: { mimeType: body.mime || 'audio/webm', data: body.audio } },
        { text: 'Where did this person grow up?' },
      ];
    } else if (typed.length >= 8) {
      // Type mode has no accent to hear, so it can only read vocabulary. Much weaker, and
      // the prompt says so rather than letting the model sound equally sure.
      parts = [{
        text: `There is no audio, only text this person typed the way they talk:\n\n${typed}\n\n`
          + 'You cannot hear their accent, so judge from vocabulary and phrasing alone and widen '
          + 'the radius accordingly. Where did this person grow up?',
      }];
    } else {
      res.statusCode = 422;
      return res.end(JSON.stringify({ ok: false, error: 'no_speech', detail: 'No usable speech detected.' }));
    }

    // Started HERE rather than after the answer, so the bookkeeping round trip overlaps the
    // model call instead of being added to the end of every user's wait. It is still awaited
    // before responding — Vercel freezes the invocation the instant the response is written,
    // and an un-awaited insert measurably never landed, leaving a cap that counted nothing.
    // Awaited on the refusal paths too: those spent a model call and the wallet should know.
    const counted = countAnalysis();

    const raw = await locate(parts);
    // A silent file once came back as Toronto at 75% with invented phonetic evidence. If the
    // model says there is no speech, believe it rather than rendering a fabricated pin.
    if (raw && raw.has_speech === false) {
      res.statusCode = 422;
      await counted;
      return res.end(JSON.stringify({ ok: false, error: 'no_speech', detail: raw.note || 'No speech detected.' }));
    }
    const result = sane(raw);
    if (!result) {
      // No coordinate now means the model declined, not that the call broke.
      res.statusCode = 422;
      await counted;
      return res.end(JSON.stringify({ ok: false, error: 'no_speech', detail: raw?.note || 'Could not place that.' }));
    }

    // THE SECOND JUDGE WAS REMOVED HERE on 2026-08-12, after being measured properly for the
    // first time. It re-listened to every evidence chip with a second model and deleted the
    // ones it could not hear, for one extra audio call and about five seconds on EVERY
    // analysis. Over 30 clips and 125 chips:
    //
    //   - it deleted 0 of 31 chips on real user recordings that clear the 20s floor, which is
    //     the only distribution the app sees any more
    //   - it withheld a verdict 0 times out of 30, and 0 times across 32 earlier clip lengths.
    //     The safety path it existed for has never once fired
    //   - independent adjudication of kept chips found no surviving fabrications to catch
    //   - its deletions did not reproduce: the identical judge over identical chips and audio
    //     at temperature 0 deleted 4, then 1, then 1
    //   - where it did repeat, it was deleting TRUE evidence - the nasal consonant tail on the
    //     Marseille clip, that accent's own diagnostic feature, and قاعد on a Nablus clip which
    //     is verbatim in the transcript at 0:23
    //
    // It was built for a real failure: a ten-second clip that was mostly "try to guess my
    // accent" produced four confident observations, three of them invented. That input is now
    // refused at the door by MIN_RECORD_S = 20. The guard was defending a door the floor
    // already closed, and charging every user five seconds for it.
    //
    // What still protects the card is the rule below, which is free: a verdict that rests on
    // nothing the model actually HEARD is not shown at all. That is a different mechanism and
    // it stays.
    //
    // Audio only: type mode has no sound to hear by definition, and its own card says so.
    if (body.audio && !heardSomething(result)) result.content_led = 'fed';
    await counted;
    return res.end(JSON.stringify({ ok: true, result, fb_token: mintToken() }));
  } catch (err) {
    const code = err.code || 'server_error';
    res.statusCode = ['audio_too_large', 'audio_too_short', 'no_speech'].includes(code) ? 422
      : ['busy', 'swamped'].includes(code) ? 429
        : code === 'out_of_credit' ? 503   // the service is genuinely unavailable, not broken
          : 500;
    return res.end(JSON.stringify({
      ok: false,
      error: code,
      detail: String(err.message || err).slice(0, 300),
    }));
  }
}
