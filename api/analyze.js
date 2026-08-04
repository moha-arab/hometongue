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

async function locate(parts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('GEMINI_API_KEY not set'), { code: 'not_configured' });

  for (let attempt = 0; attempt < 3; attempt++) {
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
          // a hung request once froze a 45-clip batch for 90 minutes; never wait forever
          signal: AbortSignal.timeout(45000),
        },
      );
    } catch {
      if (attempt === 2) throw Object.assign(new Error('upstream timeout'), { code: 'upstream_failed' });
      continue;
    }
    if (resp.status === 429 || resp.status === 503) {
      if (attempt === 2) throw Object.assign(new Error('model busy'), { code: 'busy' });
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
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
    language: String(r.language || '').slice(0, 40),
    confidence: Math.min(100, Math.max(0, Math.round(r.confidence || 0))),
    evidence: (Array.isArray(r.evidence) ? r.evidence : []).slice(0, 5).map((e) => String(e).slice(0, 200)),
    transcript: String(r.transcript || '').slice(0, 4000),
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

export default async function handler(req, res) {
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
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    res.statusCode = 429;
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited', detail: 'Slow down a little — try again in a bit.' }));
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
    const result = sane(raw);
    if (!result) throw Object.assign(new Error('no location returned'), { code: 'upstream_failed' });

    return res.end(JSON.stringify({ ok: true, result, fb_token: mintToken() }));
  } catch (err) {
    const code = err.code || 'server_error';
    res.statusCode = ['audio_too_large', 'audio_too_short', 'no_speech'].includes(code) ? 422
      : code === 'busy' ? 429 : 500;
    return res.end(JSON.stringify({
      ok: false,
      error: code,
      detail: String(err.message || err).slice(0, 300),
    }));
  }
}
