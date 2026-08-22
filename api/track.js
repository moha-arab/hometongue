// Telemetry ingest. One event per request, fire-and-forget: the client never waits on this and
// never learns whether it landed, so every path here ends in 204 - a broken telemetry table must
// not become a broken site. What gets stored is deliberately narrow, see data/events-table.sql.
import { createHash } from 'node:crypto';

// The allowlist IS the privacy policy. An event not named here is dropped, and each event may
// carry only the props listed for it; anything else on the payload is never written.
const EVENTS = {
  page_view: ['w', 'pwa'],
  perf: ['load_ms', 'ttfb_ms'],
  js_error: ['msg', 'src', 'line'],
  leave: ['s'],
  // read my accent
  rec_start: [],
  rec_stop: ['s'],
  rec_restart: ['s'],
  rec_cut_short: ['s'],
  type_mode: [],
  analyze_submit: ['kind', 's'],
  analyze_result: ['kind', 'ms', 'deferred'],   // what it guessed lives in the consented scorecard, not here
  analyze_fail: ['kind', 'code', 'ms'],
  resend_tap: [],
  feedback: ['correct'],
  donate: ['ok'],
  share_tap: ['how'],
  nextup_tap: [],
  tip_tap: ['where'],
  // guess the voice
  deck_pick: ['deck'],
  round_lock: ['deck', 'round', 'km', 'pts'],
  game_finish: ['deck', 'points'],
  score_post: ['deck', 'points', 'ok'],
  boards_open: ['deck'],
  clip_flag: ['deck', 'reason'],
  clip_swap: ['deck', 'why'],
};

// Keyed on the SESSION, not the address: a campus or office shares one public IP, and a per-IP cap
// dropped an arbitrary subset of each person's events, which is the one thing a funnel cannot
// survive. A loose per-IP cap stays as a flood backstop.
const buckets = new Map();
function over(key, limit) {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + 60_000 };
  if (now > b.reset) { b.count = 0; b.reset = now + 60_000; }
  b.count += 1;
  buckets.set(key, b);
  if (buckets.size > 10000) buckets.clear();
  return b.count > limit;
}
const rateLimited = (ip, session) => over('ip:' + ip, 600) || over('s:' + session, 40);

function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? Promise.resolve(JSON.parse(req.body)) : Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 4096) { reject(new Error('too_large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const platformOf = (ua) => (/iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop');

// Counts people without keeping anything that finds one: the address goes into a hash with the
// day and a server secret and is never written. Tomorrow the same phone is a different value.
function visitorOf(ip, ua) {
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${ua}|${day}|${process.env.SUPABASE_SERVICE_KEY || ''}`).digest('hex').slice(0, 16);
}

const cleanProp = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v * 100) / 100;
  if (typeof v === 'string') return v.slice(0, 120);
  return undefined;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const done = () => { if (!res.writableEnded) { res.statusCode = 204; res.end(); } };
  try { await ingest(req, res, done); } catch { /* 204 regardless: telemetry never breaks anything */ }
  return done();
}

async function ingest(req, res, done) {
  if (req.method !== 'POST') return done();

  // Same-origin when a browser says where it came from; beacons from our own pages always do.
  const origin = req.headers.origin || '';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  if (origin) { try { if (new URL(origin).host !== host) return done(); } catch { return done(); } }

  const ip = (req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0]).trim() || 'unknown';

  let b;
  try { b = await readJsonBody(req); } catch { return done(); }
  const session = b && typeof b.s === 'string' ? b.s.slice(0, 16) : 'none';
  if (rateLimited(ip, session)) return done();
  // Own property only: 'constructor' or '__proto__' as an event name found a truthy inherited value
  // and then threw on iteration, which was a 500 from an endpoint whose whole contract is 204.
  const allowed = b && typeof b.e === 'string' && Object.hasOwn(EVENTS, b.e) ? EVENTS[b.e] : null;
  if (!allowed) return done();

  const props = {};
  for (const k of allowed) {
    const v = cleanProp(b.p && b.p[k]);
    if (v !== undefined) props[k] = v;
  }
  const row = {
    event: b.e,
    page: ['home', 'game', 'privacy', '404'].includes(b.pg) ? b.pg : null,
    session: session === 'none' ? null : session,
    visitor: visitorOf(ip, String(req.headers['user-agent'] || '')),
    platform: platformOf(String(req.headers['user-agent'] || '')),
    country: /^[A-Z]{2}$/.test(req.headers['x-vercel-ip-country'] || '') ? req.headers['x-vercel-ip-country'] : null,
    // hostname only, enforced where the data lands rather than trusted from the client, and only
    // on page_view - the one event the dashboard reads it from
    ref: b.e === 'page_view' && typeof b.r === 'string' && /^[a-z0-9.-]{1,80}$/i.test(b.r) ? b.r.toLowerCase() : null,
    props,
  };

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return done();
  try {
    await fetch(`${url}/rest/v1/events`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(4000),
    });
  } catch { /* the table may not exist yet; the site does not care */ }
  return done();
}
