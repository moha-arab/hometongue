// The telemetry dashboard. Gated by the same derived key as api/curate.js, because it is the
// same audience: one person, from a phone, looking at their own site. Renders the last seven
// days as a funnel, a daily strip, and the breakdowns that answer "who, on what, from where".
// Plain HTML with inline bars - it has to read on a phone at a bus stop.
import { createHash, timingSafeEqual } from 'node:crypto';

// Its own derivation: a dashboard link gets pasted around, and it must not double as the key that
// streams private recordings (api/curate.js derives from a different prefix).
const key = () => createHash('sha256').update('stats:' + (process.env.SUPABASE_SERVICE_KEY || '')).digest('hex').slice(0, 20);
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function fetchAll(url, H, since) {
  // PostgREST caps a page at 1000 rows; walk it, newest first so a capped window loses the OLD
  // end, and say so rather than quietly rendering a partial picture as the whole one.
  const out = [];
  let error = null, truncated = false;
  const PAGES = 40;
  for (let page = 0; page < PAGES; page++) {
    const r = await fetch(`${url}/rest/v1/events?select=ts,event,page,session,visitor,platform,country,ref,props&ts=gte.${since}&order=ts.desc&limit=1000&offset=${page * 1000}`, { headers: H });
    if (!r.ok) { error = `${r.status} ${(await r.text().catch(() => '')).slice(0, 160)}`; break; }
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) break;
    if (page === PAGES - 1) truncated = true;
  }
  return { rows: out.reverse(), error, truncated };
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const bar = (n, max, label, extra = '') => `<div class=row><span class=lbl>${esc(label)}</span><span class=track><i style="width:${max ? Math.max(1, Math.round((n / max) * 100)) : 0}%"></i></span><b>${n.toLocaleString()}${extra}</b></div>`;
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const top = (map, n = 8) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const q = new URL(req.url, 'http://x').searchParams;
  const given = Buffer.from(String(q.get('k') || ''));
  const wantStr = key();
  const want = Buffer.from(wantStr);
  // byte lengths, not string lengths: twenty non-ASCII characters pass a .length check and then
  // make timingSafeEqual throw
  if (req.method !== 'GET' || given.length !== want.length || !timingSafeEqual(given, want)) {
    res.statusCode = 404; return res.end('not found');
  }
  const url = process.env.SUPABASE_URL;
  const sk = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !sk) { res.statusCode = 404; return res.end('not found'); }
  const H = { apikey: sk, Authorization: `Bearer ${sk}` };

  const nDays = Number(q.get('days'));
  const days = Number.isFinite(nDays) ? Math.min(30, Math.max(1, Math.trunc(nDays))) : 7;
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { rows: ev, error: fetchError, truncated } = await fetchAll(url, H, since);

  // ————— aggregate —————
  const byEvent = {}, byDay = {}, visitorsByDay = {}, plat = {}, country = {}, refs = {};
  const loads = [], ttfbs = [], latencies = [], errors = {}, decks = {}, swaps = {}, flags = {}, failCodes = {};
  const sessRec = new Set(), sessVerdict = new Set(), sessFeedback = new Set(), sessDonate = new Set(), sessHome = new Set();
  const sessGame = new Set(), sessDeck = new Set(), sessFinish = new Set(), sessPost = new Set();
  const sessText = new Set(), textLatencies = [], gotIt = new Map();
  let tips = 0, shares = 0, nextups = 0, resends = 0, cutShort = 0, restarts = 0;
  for (const e of ev) {
    byEvent[e.event] = (byEvent[e.event] || 0) + 1;
    const d = e.ts.slice(5, 10);
    const p = e.props || {};
    if (e.event === 'page_view') {
      byDay[d] = (byDay[d] || 0) + 1;
      (visitorsByDay[d] = visitorsByDay[d] || new Set()).add(e.visitor);
      plat[e.platform || '?'] = (plat[e.platform || '?'] || 0) + 1;
      country[e.country || '??'] = (country[e.country || '??'] || 0) + 1;
      refs[e.ref || '(direct)'] = (refs[e.ref || '(direct)'] || 0) + 1;
      if (e.page === 'home') sessHome.add(e.session);
      if (e.page === 'game') sessGame.add(e.session);
    }
    if (e.event === 'perf') { if (p.load_ms) loads.push(p.load_ms); if (p.ttfb_ms) ttfbs.push(p.ttfb_ms); }
    if (e.event === 'js_error') { const k = `${p.src || '?'}:${p.line || 0} ${p.msg || ''}`.slice(0, 90); errors[k] = (errors[k] || 0) + 1; }
    if (e.event === 'rec_start') sessRec.add(e.session);
    if (e.event === 'rec_cut_short') cutShort++;
    if (e.event === 'rec_restart') restarts++;
    if (e.event === 'analyze_result') {
      if (p.kind === 'text') { sessText.add(e.session); if (p.ms) textLatencies.push(p.ms); }
      else { sessVerdict.add(e.session); if (p.ms) latencies.push(p.ms); }
    }
    if (e.event === 'analyze_fail') failCodes[p.code || '?'] = (failCodes[p.code || '?'] || 0) + 1;
    if (e.event === 'resend_tap') resends++;
    if (e.event === 'feedback') { sessFeedback.add(e.session); gotIt.set(e.session, !!p.correct); }   // one answer per session, the last one
    if (e.event === 'donate' && p.ok) sessDonate.add(e.session);
    if (e.event === 'share_tap') shares++;
    if (e.event === 'nextup_tap') nextups++;
    if (e.event === 'tip_tap') tips++;
    if (e.event === 'deck_pick') { sessDeck.add(e.session); decks[p.deck || '?'] = (decks[p.deck || '?'] || 0) + 1; }
    if (e.event === 'game_finish') sessFinish.add(e.session);
    if (e.event === 'score_post' && p.ok) sessPost.add(e.session);
    if (e.event === 'clip_swap') swaps[p.why || '?'] = (swaps[p.why || '?'] || 0) + 1;
    if (e.event === 'clip_flag') flags[p.reason || '?'] = (flags[p.reason || '?'] || 0) + 1;
  }
  // The visitor hash rotates daily BY DESIGN, so across a window this is visitor-days, not people.
  const visitorDays = new Set(ev.filter((e) => e.event === 'page_view').map((e) => e.visitor)).size;
  const today = new Date().toISOString().slice(5, 10);
  const peopleToday = (visitorsByDay[today] || new Set()).size;
  const views = byEvent.page_view || 0;
  let yes = 0, no = 0;
  for (const v of gotIt.values()) { if (v) yes++; else no++; }

  // ————— render —————
  const dayKeys = Object.keys(byDay).sort();
  const maxDay = Math.max(1, ...dayKeys.map((k) => byDay[k]));
  const funnel = (steps) => {
    const max = Math.max(1, steps[0][1]);
    return steps.map(([l, n], i) => bar(n, max, l, i ? ` <small>${pct(n, steps[i - 1][1])}%</small>` : '')).join('');
  };
  const list = (obj, max = null) => {
    const t = top(obj);
    const m = max || Math.max(1, ...t.map((x) => x[1]));
    return t.map(([k, n]) => bar(n, m, k)).join('') || '<p class=meta>nothing yet</p>';
  };
  const medLat = median(latencies);

  const html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width, initial-scale=1"><title>HomeTongue telemetry</title>
<style>body{font-family:system-ui;max-width:760px;margin:20px auto;padding:0 14px;background:#F3F1EC;color:#1B1C19}h1{font-size:20px;margin:0 0 4px}h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2A6B60;margin:22px 0 8px}
section{background:#FCFBF8;border:1px solid #DEDAD1;border-radius:10px;padding:12px 14px}.row{display:grid;grid-template-columns:150px 1fr 80px;gap:8px;align-items:center;font-size:13px;margin:4px 0}
.lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.track{height:10px;background:#EAE7E0;border-radius:5px;overflow:hidden}.track i{display:block;height:100%;background:#2A6B60}b{text-align:right;font-variant-numeric:tabular-nums}small{color:#74766D;font-weight:400}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}.kpi div{background:#FCFBF8;border:1px solid #DEDAD1;border-radius:10px;padding:10px 12px}.kpi b{display:block;font-size:22px;text-align:left}.kpi span{font-size:11.5px;color:#5F6158}
.meta{font-size:12px;color:#5F6158}a{color:#2A6B60}hr{border:0;border-top:1px solid #EAE7E0;margin:10px 0}</style>
<h1>HomeTongue telemetry</h1>${fetchError ? `<p class=meta style="color:#A8563F"><b>Could not read the events table</b> (${esc(fetchError)}). If it has never been created, run data/events-table.sql in Supabase once.</p>` : ''}${truncated ? '<p class=meta style="color:#A8563F"><b>Window capped at 40,000 events</b>; the oldest are missing from these numbers.</p>' : ''}<p class=meta>last ${days} days · ${ev.length.toLocaleString()} events · <a href="?k=${wantStr}&days=1">1d</a> · <a href="?k=${wantStr}&days=7">7d</a> · <a href="?k=${wantStr}&days=30">30d</a></p>
<div class=kpi>
<div><b>${peopleToday.toLocaleString()}</b><span>people today</span></div>
<div><b>${visitorDays.toLocaleString()}</b><span>visitor-days</span></div>
<div><b>${views.toLocaleString()}</b><span>page views</span></div>
<div><b>${(byEvent.analyze_result || 0).toLocaleString()}</b><span>verdicts (${sessText.size} typed)</span></div>
<div><b>${yes + no ? pct(yes, yes + no) + '%' : '–'}</b><span>"got it" rate (${yes + no})</span></div>
<div><b>${medLat ? (medLat / 1000).toFixed(1) + 's' : '–'}</b><span>median verdict time</span></div>
<div><b>${(byEvent.game_finish || 0).toLocaleString()}</b><span>games finished</span></div>
</div>
<h2>Page views per day</h2><section>${dayKeys.map((k) => bar(byDay[k], maxDay, k, ` <small>${visitorsByDay[k].size} people</small>`)).join('') || '<p class=meta>nothing yet</p>'}</section>
<h2>Read My Accent funnel (sessions)</h2><section>${funnel([['saw the home page', sessHome.size], ['started recording', sessRec.size], ['got a verdict', sessVerdict.size], ['answered did-I-get-it', sessFeedback.size], ['donated the clip', sessDonate.size]])}
<p class=meta>cut short before 20s: ${cutShort} · start-overs: ${restarts} · resend taps: ${resends} · shares: ${shares} · went to the game: ${nextups} · tip taps: ${tips}</p></section>
<h2>Guess the Voice funnel (sessions)</h2><section>${funnel([['saw the game page', sessGame.size], ['picked a deck', sessDeck.size], ['finished 5 rounds', sessFinish.size], ['posted a score', sessPost.size]])}</section>
<h2>Decks picked</h2><section>${list(decks)}</section>
<h2>Verdict failures</h2><section>${list(failCodes)}</section>
<h2>Clip swaps · flags</h2><section>${list(swaps)}<hr>${list(flags)}</section>
<h2>Devices</h2><section>${list(plat, views)}</section>
<h2>Countries</h2><section>${list(country)}</section>
<h2>Referrers</h2><section>${list(refs)}</section>
<h2>Performance</h2><section><p class=meta>median page load ${median(loads)} ms · median time to first byte ${median(ttfbs)} ms (${loads.length} samples)${textLatencies.length ? ` · typed verdicts median ${(median(textLatencies) / 1000).toFixed(1)}s` : ''}</p></section>
<h2>JavaScript errors in the wild</h2><section>${list(errors)}</section>
<p class=meta>Every number here is first-party and cookieless: no address is stored, visitors are a daily hash (so visitor-days over a window count the same person once per day), sessions live in one tab. See <a href="/privacy">privacy</a>.</p>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.end(html);
}
