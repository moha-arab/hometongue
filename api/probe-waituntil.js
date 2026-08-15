// TEMPORARY PROBE — delete after answering one question.
//
// The whole resume feature rests on an assumption I never tested: that this function keeps
// running after the caller hangs up, long enough to finish its work and store the result. If
// Vercel kills the invocation on disconnect, nothing is ever stored, every collect returns 404,
// and the client falls back to re-sending the audio — which is exactly the symptom being
// reported.
//
// This answers it directly. GET ?mode=inline writes a row the normal way. GET ?mode=defer
// responds IMMEDIATELY and then writes the row 8 seconds later via waitUntil. If the deferred row
// appears, deferred work survives the response and the real fix is available. If it does not,
// the architecture has to be something else.
let waitUntil = null;
try { ({ waitUntil } = await import('@vercel/functions')); } catch { /* not installed */ }

async function writeMarker(tag) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return 'no-supabase';
  const r = await fetch(url + '/rest/v1/takes', {
    method: 'POST',
    headers: {
      apikey: key, Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ take_id: tag, iv: 'probe', ct: 'probe', tag: 'probe' }),
  });
  return r.status;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const q = new URL(req.url, 'http://x').searchParams;
  const mode = q.get('mode') || 'inline';
  const tag = q.get('tag') || 'probe-notag';

  if (mode === 'inline') {
    const status = await writeMarker(tag);
    return res.end(JSON.stringify({ mode, tag, status, waitUntilAvailable: !!waitUntil }));
  }

  // Deferred: respond now, work later.
  const job = new Promise((resolve) => {
    setTimeout(() => { writeMarker(tag).then(resolve, resolve); }, 8000);
  });
  if (waitUntil) waitUntil(job);
  return res.end(JSON.stringify({ mode, tag, responded: 'immediately', waitUntilAvailable: !!waitUntil }));
}
