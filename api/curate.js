// TEMPORARY curation endpoint: lets Mohammad listen to the donated clips from his phone.
//
// The clips are private, consented recordings and the repo is public, so they can never be
// committed or served as static files. This streams them from the private bucket on demand,
// gated by a key DERIVED from a secret already in the environment — sha256 of the service key —
// so there is no new env var to configure and nothing secret in this file. Without the key,
// every response is an identical 404; the endpoint is indistinguishable from a missing route.
//
// Delete this file when curation-from-phone is no longer needed. Nothing else references it.
import { createHash, timingSafeEqual } from 'node:crypto';

const SB = () => ({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY });

const curateKey = () => createHash('sha256')
  .update('curate:' + (process.env.SUPABASE_SERVICE_KEY || ''))
  .digest('hex').slice(0, 20);

// clip_path shape as written by api/feedback.js: "2026-08-18/<uuid>.webm"
const CLIP_PATH = /^20\d{2}-\d{2}-\d{2}\/[\w-]+\.[a-z0-9]{2,5}$/;

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async function handler(req, res) {
  // Never cacheable: a CDN copy of a private recording would outlive the gate.
  res.setHeader('Cache-Control', 'private, no-store');

  const q = new URL(req.url, 'http://x').searchParams;
  const given = String(q.get('k') || '');
  const want = curateKey();
  const okKey = given.length === want.length
    && timingSafeEqual(Buffer.from(given), Buffer.from(want));
  if (req.method !== 'GET' || !okKey) {
    res.statusCode = 404;
    return res.end('not found');
  }

  const { url, key } = SB();
  if (!url || !key) { res.statusCode = 404; return res.end('not found'); }
  const H = { apikey: key, Authorization: 'Bearer ' + key };

  // ————— stream one clip —————
  const f = q.get('f');
  if (f) {
    if (!CLIP_PATH.test(f)) { res.statusCode = 404; return res.end('not found'); }
    const fwd = { ...H };
    if (req.headers.range) fwd.Range = req.headers.range;   // Safari insists on ranges for audio
    const up = await fetch(`${url}/storage/v1/object/clips/${f}`, { headers: fwd });
    if (!up.ok && up.status !== 206) { res.statusCode = 404; return res.end('not found'); }
    res.statusCode = up.status;
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = up.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    return res.end(Buffer.from(await up.arrayBuffer()));
  }

  // ————— the listening page —————
  const rows = await fetch(
    `${url}/rest/v1/feedback?select=ts,platform,guess_city,confidence,correct,actual_code,actual_city,transcript,clip_path`
    + '&consent=eq.true&clip_path=not.is.null&order=ts.desc&limit=200',
    { headers: H },
  ).then((r) => r.json()).catch(() => []);

  const cards = (Array.isArray(rows) ? rows : []).map((m, i) => {
    const verdict = m.correct === true ? '<span class=yes>user said: got it</span>'
      : m.correct === false ? `<span class=no>user said: wrong${m.actual_city || m.actual_code ? ' — actually ' + esc([m.actual_city, m.actual_code].filter(Boolean).join(', ')) : ''}</span>`
        : '<span class=meta>user never answered</span>';
    const src = `/api/curate?k=${want}&f=${encodeURIComponent(m.clip_path)}`;
    return `<section><h2>${i + 1}. ${esc(m.guess_city || '(no guess stored)')}${m.confidence ? ` <span class=conf>${m.confidence}%</span>` : ''}</h2>`
      + `<p class=meta>${esc(String(m.ts).slice(0, 16).replace('T', ' '))} UTC · ${esc(m.platform || '?')} · ${verdict}</p>`
      + `<audio controls preload="none" src="${src}"></audio>`
      + (m.transcript ? `<blockquote dir=auto>${esc(String(m.transcript).slice(0, 300))}</blockquote>` : '')
      + '</section>';
  }).join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.end('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width, initial-scale=1">'
    + '<title>Donated clips</title><style>body{font-family:system-ui;max-width:720px;margin:24px auto;padding:0 16px;background:#F3F1EC;color:#1B1C19}'
    + 'section{background:#FCFBF8;border:1px solid #DEDAD1;border-radius:10px;padding:14px 16px;margin:14px 0}'
    + 'h1{font-size:20px}h2{font-size:15px;margin:0 0 6px}.conf{color:#7A5713;font-size:12.5px}'
    + '.yes{color:#2A6B60;font-weight:600}.no{color:#A8563F;font-weight:600}'
    + 'blockquote{margin:8px 0 0;padding:8px 12px;background:#F3F1EC;border-left:3px solid #2A6B60;font-size:13.5px}'
    + '.meta{font-size:12px;color:#5F6158}audio{width:100%;margin-top:4px}</style>'
    + `<h1>Donated clips (${Array.isArray(rows) ? rows.length : 0})</h1>`
    + '<p class=meta>Private curation view. Newest first; header is what the app guessed.</p>'
    + cards);
}
