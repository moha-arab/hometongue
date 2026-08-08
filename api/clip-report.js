// HomeTongue — /api/clip-report
//
// A player just heard a clip and thinks something is wrong with it. That opinion is worth
// more than any automated gate: the blind gate can check that speech exists and audio is
// clean, but only a listener can say "this does not sound like Marseille" — and the 24
// YouTube-sourced clips carry labels asserted by their videos, so listener flags are the
// main way a wrong one gets caught.
//
// Reports go to the clip_reports table (see supabase/schema.sql). Nothing identifies the
// player: no account, no fingerprint, just the clip, a reason, and an optional note.

// Reasons are an enum, not free text, so each maps to a curation action:
//   audio  -> loudness / quality pass          label -> re-check where the speaker is from
//   leak   -> move the playback window         broken -> media pipeline problem
const REASONS = new Set(['audio', 'label', 'leak', 'broken']);

function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 64 * 1024) reject(new Error('too_large')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// Same speed bump as analyze: per-instance, resets hourly, not a wall.
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, reset: now + 3600_000 };
  if (now > b.reset) { b.count = 0; b.reset = now + 3600_000; }
  b.count += 1;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear();
  return b.count > 20;
}

const clean = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
  }

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
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ ok: false, error: 'not_configured' }));
  }

  try {
    const b = await readJsonBody(req);
    const clipId = clean(b.clip_id, 64);
    const row = {
      clip_id: clipId,
      deck: clean(b.deck, 20),
      label: clean(b.label, 80),
      reason: REASONS.has(b.reason) ? b.reason : null,
      note: clean(b.note, 240) || null,
      km: Number.isFinite(+b.km) ? Math.round(+b.km) : null,
    };
    // A note-only follow-up rides the same endpoint with reason 'note' resolved to null +
    // text; require at least one of the two so an empty POST stores nothing.
    if (!clipId || !/^[\w-]{1,64}$/.test(clipId) || (!row.reason && !row.note)) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ ok: false, error: 'invalid_report' }));
    }

    const ins = await fetch(`${url}/rest/v1/clip_reports`, {
      method: 'POST',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!ins.ok) {
      // Most likely the table has not been created yet; say so instead of a generic 500.
      console.error('clip report insert failed:', ins.status, await ins.text().catch(() => ''));
      res.statusCode = 503;
      return res.end(JSON.stringify({ ok: false, error: 'not_configured' }));
    }
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'server_error' }));
  }
}
