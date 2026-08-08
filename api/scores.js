// HomeTongue — /api/scores
// POST: submit a game score. GET: leaderboard, or ?start=1 for a game token.
// Degrades gracefully without Supabase.
import { mintToken, tokenAge } from './feedback.js';

export const config = { maxDuration: 15 };

const GAME_TYPES = new Set(['languages', 'accents', 'arabic', 'french', 'spanish', 'chinese', 'hindi-urdu', 'portuguese', 'russian']);
const BANNED = ['fuck', 'shit', 'nigg', 'kys', 'hitler', 'rape', 'cunt', 'faggot', 'whore', 'شرموط', 'كس ام', 'منيك', 'زبي'];

const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, reset: now + 3600_000 };
  if (now > b.reset) { b.count = 0; b.reset = now + 3600_000; }
  b.count += 1;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear();
  return b.count > 40;
}

function sameOrigin(req) {
  const origin = req.headers.origin || '';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  try { return origin && new URL(origin).host === host; } catch { return false; }
}

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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  if (req.method === 'GET') {
    const q = new URL(req.url, 'http://x').searchParams;
    // A signed timestamp handed out when a game starts. Submitting a score requires it to be
    // old enough that the game could actually have been played.
    if (q.get('start')) return res.end(JSON.stringify({ ok: true, token: mintToken() }));
    const gameType = GAME_TYPES.has(q.get('game_type')) ? q.get('game_type') : 'languages';
    if (!url || !key) return res.end(JSON.stringify({ ok: false, error: 'not_configured' }));
    try {
      const resp = await fetch(`${url}/rest/v1/scores?select=nickname,points,ts&game_type=eq.${gameType}&order=points.desc,ts.asc&limit=100`, { headers: H });
      if (!resp.ok) {
        console.error('leaderboard query failed:', resp.status, await resp.text().catch(() => ''));
        return res.end(JSON.stringify({ ok: false, error: 'not_ready' }));
      }
      const rows = await resp.json();
      // Best run per nickname. Every game posts a row (that history is worth keeping), but a
      // board where one grinder's ten runs fill all ten slots is a wall, not a ladder — the
      // standard shape is one line per player, their best. No accounts, so the nickname is the
      // player; case-insensitive so "Sara" and "sara" don't hold two slots.
      const best = new Map();
      for (const r of (Array.isArray(rows) ? rows : [])) {
        const k = String(r.nickname || '').toLowerCase();
        if (!best.has(k)) best.set(k, r);   // rows arrive points.desc, first hit is the best
      }
      return res.end(JSON.stringify({ ok: true, top: [...best.values()].slice(0, 10) }));
    } catch (err) {
      console.error('leaderboard error:', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ ok: false, error: 'server_error' }));
    }
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
  }
  if (!sameOrigin(req)) {
    res.statusCode = 403;
    return res.end(JSON.stringify({ ok: false, error: 'bad_origin' }));
  }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    res.statusCode = 429;
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
  }
  if (!url || !key) return res.end(JSON.stringify({ ok: false, error: 'not_configured' }));

  try {
    const b = await readJsonBody(req);

    let nickname = typeof b.nickname === 'string' ? b.nickname.trim().slice(0, 20) : '';
    if (nickname.length < 2) nickname = 'anon';
    const low = nickname.toLowerCase();
    if (BANNED.some((w) => low.includes(w))) nickname = 'someone polite';

    const gameType = GAME_TYPES.has(b.game_type) ? b.game_type : null;
    const rounds = Array.isArray(b.rounds) ? b.rounds.slice(0, 5) : [];
    const points = Number.isInteger(b.points) ? b.points : -1;
    const sum = rounds.reduce((s, r) => s + (Number.isInteger(r?.pts) ? r.pts : 0), 0);
    // Five rounds of pinning cannot physically happen in under ~75 seconds, and a token
    // older than two hours is a stale tab, not a game. This stops drive-by forged posts and
    // ten-second fake runs; it does not stop a patient cheater, which is why prize winners
    // get their round logs eyeballed rather than trusted.
    const age = tokenAge(b.token);
    if (age === null || age < 75_000 || age > 7_200_000) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ ok: false, error: age === null ? 'invalid_token' : 'too_fast' }));
    }
    const valid = gameType && points >= 0 && points <= 25000 && rounds.length === 5
      && rounds.every((r) => Number.isInteger(r?.pts) && r.pts >= 0 && r.pts <= 5000 && Number.isFinite(+r?.km))
      && sum === points;
    if (!valid) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ ok: false, error: 'invalid_score' }));
    }

    const ins = await fetch(`${url}/rest/v1/scores`, {
      method: 'POST',
      headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({
        nickname, game_type: gameType, points,
        rounds: rounds.map((r) => ({ id: String(r.id || '').slice(0, 40), km: Math.round(+r.km), pts: r.pts })),
      }),
    });
    if (!ins.ok) {
      console.error('score insert failed:', ins.status, await ins.text().catch(() => ''));
      throw new Error('insert_failed');
    }

    const rank = await (await fetch(`${url}/rest/v1/scores?select=id&game_type=eq.${gameType}&points=gt.${points}`, {
      headers: { ...H, Prefer: 'count=exact', Range: '0-0' },
    })).headers;
    // content-range: 0-0/N -> N rows strictly better
    const better = Number((rank.get('content-range') || '/0').split('/')[1]) || 0;

    return res.end(JSON.stringify({ ok: true, rank: better + 1, nickname }));
  } catch (err) {
    console.error('score error:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'server_error' }));
  }
}
