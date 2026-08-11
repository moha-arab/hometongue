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
import { verifyEvidence } from './verify-evidence.js';
import { SYSTEM, SCHEMA, MODEL } from './prompt.js';

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

async function locate(parts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('GEMINI_API_KEY not set'), { code: 'not_configured' });

  const deadline = Date.now() + BUDGET_MS;
  for (let attempt = 0; attempt < 3; attempt++) {
    const left = deadline - Date.now();
    // Under 8s left is not enough for a real answer; fail honestly rather than burn the cap.
    if (left < 8000) throw Object.assign(new Error('ran out of time'), { code: 'busy' });
    let resp;
    try {
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
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
      if (attempt === 2) throw Object.assign(new Error('upstream timeout'), { code: 'upstream_failed' });
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
    if (resp.status === 429) {
      const body = await resp.text().catch(() => '');
      if (/RESOURCE_EXHAUSTED|credits? (are )?depleted|quota|billing/i.test(body)) {
        throw Object.assign(new Error('the analysis account is out of credit'), { code: 'out_of_credit' });
      }
    }
    if (resp.status === 429 || resp.status === 503 || resp.status === 400 || resp.status >= 500) {
      if (attempt === 2) throw Object.assign(new Error('the model kept refusing the request'), { code: 'upstream_failed' });
      await new Promise((r) => setTimeout(r, Math.min(1500 * (attempt + 1), Math.max(0, deadline - Date.now() - 8000))));
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
  throw Object.assign(new Error('model busy'), { code: 'busy' });
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
const TOLD_NOT_HEARD = /\b(stated?|states|saying|says|said|mention(s|ed)?|explicitly|self-identif|introduc\w+|claims?|tells? us|their name|name is|named)\b/i;

function heardSomething(result) {
  const chips = (Array.isArray(result.evidence) ? result.evidence : []).filter(Boolean);
  return chips.some((c) => !TOLD_NOT_HEARD.test(String(c)));
}

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
    stated_origin: r.stated_origin === true,
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

async function overDailyCap() {
  const { url, key } = SB();
  if (!url || !key || !Number.isFinite(DAILY_CAP) || DAILY_CAP <= 0) return false;
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
    return Number.isFinite(total) && total >= DAILY_CAP;
  } catch { return false; }
}

// fire-and-forget: the user's answer never waits on bookkeeping
function countAnalysis() {
  const { url, key } = SB();
  if (!url || !key) return;
  fetch(`${url}/rest/v1/usage`, {
    method: 'POST',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: '{}',
  }).catch(() => { /* bookkeeping is never load-bearing */ });
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
    let parts;

    if (body.audio) {
      const bytes = Buffer.from(body.audio, 'base64');
      if (bytes.length < 2000) throw Object.assign(new Error('audio too short'), { code: 'audio_too_short' });
      if (bytes.length > 6 * 1024 * 1024) throw Object.assign(new Error('audio too large'), { code: 'audio_too_large' });
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

    const raw = await locate(parts);
    // A silent file once came back as Toronto at 75% with invented phonetic evidence. If the
    // model says there is no speech, believe it rather than rendering a fabricated pin.
    if (raw && raw.has_speech === false) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ ok: false, error: 'no_speech', detail: raw.note || 'No speech detected.' }));
    }
    const result = sane(raw);
    if (!result) {
      // No coordinate now means the model declined, not that the call broke.
      res.statusCode = 422;
      return res.end(JSON.stringify({ ok: false, error: 'no_speech', detail: raw?.note || 'Could not place that.' }));
    }

    // The second judge is load-bearing, not decorative. Mohammad donated a ten-second clip
    // that was mostly "try to guess my accent" and the model answered with four confident
    // observations, three of which did not survive a second listen — invented detail filling
    // a gap where there was almost no speech. The rule above cannot catch that alone, because
    // a fabricated claim is PHRASED as something heard. So every acoustic claim is checked
    // against the audio by a different model before the verdict is allowed to stand, failed
    // claims never reach the card, and a verdict with nothing left standing is not shown.
    // Measured cost: 3.5s median, against a 10-13s analysis.
    if (body.audio && Array.isArray(result.evidence) && result.evidence.length) {
      const msLeft = 56_000 - (Date.now() - t0);
      if (msLeft > 9000) {
        const verdicts = await verifyEvidence({
          audio: body.audio,
          mime: (body.mime || 'audio/webm').split(';')[0].trim(),
          evidence: result.evidence,
          transcript: result.transcript || '',
          apiKey: process.env.GEMINI_API_KEY,
        }).catch(() => null);
        if (verdicts) result.evidence = result.evidence.filter((_, i) => verdicts[i] !== 'drop');
      }
    }
    // Audio only: type mode has no sound to hear by definition, and its own card says so.
    if (body.audio && !heardSomething(result)) result.content_led = 'fed';
    countAnalysis();
    return res.end(JSON.stringify({ ok: true, result, fb_token: mintToken() }));
  } catch (err) {
    const code = err.code || 'server_error';
    res.statusCode = ['audio_too_large', 'audio_too_short', 'no_speech'].includes(code) ? 422
      : code === 'busy' ? 429
        : code === 'out_of_credit' ? 503   // the service is genuinely unavailable, not broken
          : 500;
    return res.end(JSON.stringify({
      ok: false,
      error: code,
      detail: String(err.message || err).slice(0, 300),
    }));
  }
}
