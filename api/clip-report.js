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
    req.on('data', (c) => { data += c; if (data.length > 64 * 1024) { req.destroy(); reject(new Error('too_large')); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// Same speed bump as analyze: per-instance, resets hourly, not a wall.
// Session-keyed with an IP flood backstop, same as feedback/scores: flags are contributed
// quality data and a venue is one IP — 20-per-IP-per-hour capped a whole room's reports.
// The session id is a rate-limit key in memory only; the report row never stores it.
const buckets = new Map();
function over(key, limit) {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + 3600_000 };
  if (now > b.reset) { b.count = 0; b.reset = now + 3600_000; }
  b.count += 1;
  buckets.set(key, b);
  if (buckets.size > 10000) prune(now);
  return b.count > limit;
}
// Not clear(): session keys are client-minted, and a full clear would refund the minter's
// own 'ip:' budget. Expired first, then session buckets; ip counters survive.
function prune(now) {
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  if (buckets.size > 10000) for (const k of [...buckets.keys()]) if (k.startsWith('s:')) buckets.delete(k);
  if (buckets.size > 10000) buckets.clear();
}
const sessionOf = (req) => {
  const s = String(req.headers['x-ht-session'] || '');
  return /^[a-z0-9]{4,16}$/i.test(s) ? s : null;
};
function rateLimited(ip, session) {
  if (session) return over('s:' + session, 10) || over('ip:' + ip, 200);
  return over('ip:' + ip, 30);
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
  // x-real-ip is set by the platform; the leftmost x-forwarded-for entry is client-writable
  // and would let a scripted client rotate identities past the limiter.
  const ip = (req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0]).trim() || 'unknown';
  if (rateLimited(ip, sessionOf(req))) {
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
      km: Number.isFinite(+b.km) ? Math.min(20040, Math.max(0, Math.round(+b.km))) : null,
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
      console.error('clip report insert failed:', ins.status, await ins.text().catch(() => ''));
      // A 400 from PostgREST means this row was bad; anything else means the table is missing
      // or the service is down. Collapsing both to not_configured once made malformed input
      // read as an outage.
      res.statusCode = ins.status === 400 ? 422 : 503;
      return res.end(JSON.stringify({ ok: false, error: ins.status === 400 ? 'invalid_report' : 'not_configured' }));
    }
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'server_error' }));
  }
}
