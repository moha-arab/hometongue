// HomeTongue — /api/feedback
// Stores "did I get it?" corrections; with consent AND a valid analyze token, also the voice clip.
// Privacy contract (privacy.html): without consent, only an anonymous scorecard is kept —
// no transcript, no words, no cities. Degrades gracefully without Supabase env vars.
import { randomUUID, createHmac } from 'node:crypto';

export const config = { maxDuration: 30 };

const VALID_CODES = new Set(['eg', 'sd', 'sy', 'lb', 'jo', 'ps', 'iq', 'sa', 'kw', 'ae', 'ye', 'ly', 'tn', 'dz', 'ma', 'msa', 'weak', 'dialect', 'unclear', '']);
const AUDIO_MIME = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav' };
const MAX_CLIP_BYTES = 2.5 * 1024 * 1024;
const TOKEN_MAX_AGE_MS = 30 * 60 * 1000;

// Per-instance rate limit (serverless instances are ephemeral — this is a speed bump, not a wall)
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, reset: now + 3600_000 };
  if (now > b.reset) { b.count = 0; b.reset = now + 3600_000; }
  b.count += 1;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear(); // memory guard
  return b.count > 12;
}

function tokenSecret() {
  return process.env.FEEDBACK_SECRET || process.env.SUPABASE_SERVICE_KEY || '';
}

export function mintToken() {
  const secret = tokenSecret();
  if (!secret) return '';
  const ts = Date.now().toString();
  return `${ts}.${createHmac('sha256', secret).update(ts).digest('hex').slice(0, 32)}`;
}

// For other endpoints that need "this token was minted N seconds ago and is genuine" —
// the scores endpoint uses it to prove a game took real time.
export function tokenAge(token) {
  const secret = tokenSecret();
  if (!secret || typeof token !== 'string') return null;
  const [ts, sig] = token.split('.');
  if (!ts || !sig) return null;
  const expect = createHmac('sha256', secret).update(ts).digest('hex').slice(0, 32);
  if (sig !== expect) return null;
  const age = Date.now() - Number(ts);
  return age >= 0 ? age : null;
}

function tokenValid(token) {
  const secret = tokenSecret();
  if (!secret || typeof token !== 'string') return false;
  const [ts, sig] = token.split('.');
  if (!ts || !sig) return false;
  const expect = createHmac('sha256', secret).update(ts).digest('hex').slice(0, 32);
  if (sig !== expect) return false;
  const age = Date.now() - Number(ts);
  return age >= 0 && age < TOKEN_MAX_AGE_MS;
}

function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(Object.assign(new Error('too_large'), { code: 'too_large' }));
      }
    });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const clean = (v, max) => (typeof v === 'string' ? v.slice(0, max).trim() : null);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
  }
  res.setHeader('Content-Type', 'application/json');

  // Same-origin check: browser fetches carry Origin; require it to match our host.
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
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return res.end(JSON.stringify({ ok: false, error: 'not_configured' }));
  }

  try {
    const b = await readJsonBody(req);
    const consent = b.consent === true;

    // Anonymous scorecard — stored for everyone (no words, no voice, no cities)
    const row = {
      guess_code: VALID_CODES.has(b.guess_code) ? b.guess_code : null,
      region: clean(b.region, 20),
      confidence: Number.isFinite(+b.confidence) ? Math.max(0, Math.min(100, Math.round(+b.confidence))) : null,
      correct: typeof b.correct === 'boolean' ? b.correct : null,
      actual_code: VALID_CODES.has(b.actual_code) ? b.actual_code : null,
      source: ['cloud', 'offline'].includes(b.source) ? b.source : null,
      platform: ['ios', 'android', 'desktop'].includes(b.platform) ? b.platform : null,
      consent,
      guess_city: null,
      actual_city: null,
      transcript: null,
      clip_path: null,
      mime: null,
    };

    // Content (words, cities, voice) — consent only
    if (consent) {
      row.guess_city = clean(b.guess_city, 80);
      row.actual_city = clean(b.actual_city, 80);
      row.transcript = clean(b.transcript, 3000);

      // Clip additionally requires a fresh token minted by a real /api/analyze call
      const mime = clean(b.mime, 60) || '';
      const baseMime = mime.split(';')[0].trim();
      if (typeof b.audio === 'string' && b.audio.length > 0 && AUDIO_MIME[baseMime] && tokenValid(b.token)) {
        const bytes = Buffer.from(b.audio, 'base64');
        if (bytes.length >= 1000 && bytes.length <= MAX_CLIP_BYTES) {
          const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${AUDIO_MIME[baseMime]}`;
          const up = await fetch(`${url}/storage/v1/object/clips/${path}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': baseMime, 'x-upsert': 'false' },
            body: bytes,
          });
          if (up.ok) {
            row.clip_path = path;
            row.mime = baseMime;
          } else {
            console.error('clip upload failed:', up.status, await up.text().catch(() => ''));
          }
        }
      }
    }

    const ins = await fetch(`${url}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!ins.ok) {
      console.error('feedback insert failed:', ins.status, await ins.text().catch(() => ''));
      throw new Error('insert_failed');
    }

    return res.end(JSON.stringify({ ok: true, stored: row.clip_path ? 'clip+labels' : 'labels' }));
  } catch (err) {
    console.error('feedback error:', err);
    res.statusCode = err.code === 'too_large' ? 413 : 500;
    return res.end(JSON.stringify({ ok: false, error: err.code === 'too_large' ? 'too_large' : 'server_error' }));
  }
}
