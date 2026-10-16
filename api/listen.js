// Private listening page for the donated clips, at /l/<key>.
//
// The clips are consented recordings in a private bucket, so they are never committed or served as
// static files. Each visit reads the donations from Supabase and signs every clip for a few hours,
// so the browser plays them straight from storage and a copied audio link soon stops working.
// Only the sha256 of the key lives here; a wrong key gets the same 404 as a missing route.
//
// Delete this file and its rewrite in vercel.json when the page is no longer needed.
import { createHash, timingSafeEqual } from 'node:crypto';

const KEY_SHA256 = 'ccab242257c8ed5c006a80497cc5ba6f1f94cb85e37abea72192470801a62f9c';
const SIGN_SECONDS = 6 * 3600;

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (ts) => new Date(ts).toLocaleString('en-CA', { timeZone: 'America/Toronto', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

let regions = null;
try { regions = new Intl.DisplayNames(['en'], { type: 'region' }); } catch {}
const placeName = (s) => (/^[a-z]{2}$/i.test(s) && regions ? (regions.of(s.toUpperCase()) || s) : s);

function notFound(res) { res.statusCode = 404; return res.end('not found'); }

export default async function handler(req, res) {
  // Never cacheable: a CDN copy would outlive the gate and the signed links.
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const q = new URL(req.url, 'http://x').searchParams;
  const given = createHash('sha256').update(String(q.get('k') || '')).digest();
  if (req.method !== 'GET' || !timingSafeEqual(given, Buffer.from(KEY_SHA256, 'hex'))) return notFound(res);

  const url = process.env.SUPABASE_URL;
  const sk = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !sk) return notFound(res);
  const H = { apikey: sk, Authorization: `Bearer ${sk}` };

  const r = await fetch(`${url}/rest/v1/feedback?select=ts,clip_path,guess_city,actual_city,actual_code,correct,transcript&consent=eq.true&order=ts.desc&limit=1000`, { headers: H });
  if (!r.ok) { res.statusCode = 502; return res.end('Could not load the donations from Supabase. Reload to try again.'); }
  const all = await r.json();

  // A donation and its "did I get it?" answer are stored as separate rows; the shared transcript
  // is what ties them together.
  const answers = new Map(all.filter((x) => !x.clip_path && x.transcript && x.correct !== null).map((x) => [x.transcript, x]));
  const clips = all.filter((x) => x.clip_path);

  const signed = new Map();
  if (clips.length) {
    const s = await fetch(`${url}/storage/v1/object/sign/clips`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: SIGN_SECONDS, paths: clips.map((x) => x.clip_path) }),
    });
    if (s.ok) for (const o of await s.json()) if (o.signedURL) signed.set(o.path, `${url}/storage/v1${o.signedURL}`);
  }

  const items = clips.filter((x) => signed.has(x.clip_path)).map((x) => {
    const a = answers.get(x.transcript);
    let note = '';
    if (a) note = a.correct ? 'They said that was right.' : (a.actual_city || a.actual_code) ? `They said it was actually ${esc(placeName(a.actual_city || a.actual_code))}.` : 'They said that was wrong.';
    return `<article>
  <p class="when">${esc(fmtDate(x.ts))}</p>
  <p class="guess">${x.guess_city ? `Guessed ${esc(x.guess_city)}.` : 'No guess saved.'} ${note}</p>
  <audio controls preload="none" src="${esc(signed.get(x.clip_path))}"></audio>
  <p class="said">${esc(x.transcript || '(no transcript)')}</p>
</article>`;
  }).join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Donated clips</title>
<style>
  :root { color-scheme: light dark; --bg: #fff; --fg: #1d1d1b; --soft: #6b6b66; --rule: #e4e4e0; }
  @media (prefers-color-scheme: dark) { :root { --bg: #161615; --fg: #ecece8; --soft: #9a9a94; --rule: #2c2c2a; } }
  body { background: var(--bg); color: var(--fg); font: 17px/1.6 Georgia, "Times New Roman", serif; margin: 0; }
  main { max-width: 640px; margin: 0 auto; padding: 40px 18px 80px; }
  h1 { font-size: 26px; font-weight: normal; margin: 0 0 6px; }
  .intro { color: var(--soft); margin: 0 0 28px; }
  article { border-top: 1px solid var(--rule); padding: 22px 0; }
  .when { font: 13px/1.4 -apple-system, system-ui, sans-serif; color: var(--soft); margin: 0 0 4px; }
  .guess { margin: 0 0 10px; }
  audio { width: 100%; display: block; }
  .said { margin: 12px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
</head>
<body>
<main>
<h1>Donated clips</h1>
<p class="intro">Recordings people chose to donate on HomeTongue, newest first.</p>
${items || '<p>No donated clips yet.</p>'}
</main>
</body>
</html>`);
}
