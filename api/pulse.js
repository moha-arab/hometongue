// The number on the idle card: how many voices HomeTongue has heard, total, for real.
// One Supabase count serves everyone: the CDN holds the answer for five minutes, so a
// wave of visitors costs a dozen counts an hour, not one per person. No input is read,
// nothing is written, and the number is the same one the owner's dashboard counts —
// if it ever looks impressive, that is because it is true.
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.end(JSON.stringify({ ok: false }));
  try {
    const r = await fetch(`${url}/rest/v1/usage?select=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' },
      signal: AbortSignal.timeout(2500),
    });
    const total = Number((r.headers.get('content-range') || '').split('/')[1]);
    if (!Number.isFinite(total)) return res.end(JSON.stringify({ ok: false }));
    return res.end(JSON.stringify({ ok: true, heard: total }));
  } catch {
    return res.end(JSON.stringify({ ok: false }));
  }
}
