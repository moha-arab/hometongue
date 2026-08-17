// RUN THE THING BEFORE SHIPPING IT.
//
//   node tools/smoke.mjs          full run, including one real analysis
//   node tools/smoke.mjs --offline   skip anything that spends a model call
//
// This exists because three separate deploys went out that parsed perfectly and broke on contact:
// an import deleted along with the block that used it (every /api/analyze call 500'd), a `const`
// deleted along with the lines around it (the recording clock froze and the submit button never
// unlocked), and a catch block reading an unbound name (a failed take left the person watching
// "reading your accent…" forever). `node --check` passed on all three, because none of them were
// syntax errors.
//
// The linter now catches undefined names statically. This catches the rest: it BOOTS the server,
// asks for every page and every file those pages reference, drives the recording timer through a
// whole take, and puts real audio through the real endpoint. Static checks cannot tell you that a
// page references a script that is not there, or that the clock stops at twenty seconds.
//
// Deliberately dependency-free. Adding a browser driver would make this the most complicated part
// of a project with no build step, and most of the value is in the first ten seconds of checks.
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8231;                     // not 8123, so a dev server you are already running survives
const BASE = `http://127.0.0.1:${PORT}`;
const OFFLINE = process.argv.includes('--offline');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}\n`);
  return pass;
};

// ————— boot —————
const server = spawn(process.execPath, ['dev-server.js'], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

const up = await (async () => {
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(BASE + '/', { signal: AbortSignal.timeout(1500) }); if (r.ok) return true; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
})();

if (!check('dev server boots', up, up ? '' : serverLog.slice(-400))) {
  server.kill();
  process.exit(1);
}

// ————— every page, and everything every page asks for —————
// A page that references a file which is not there is invisible to every static check, and is
// exactly what the service-worker rewrite could have caused.
// Both spellings of the game page: /game is what every link now says (Vercel cleanUrls in prod,
// the extension fallback in dev-server.js locally), /game.html is what old bookmarks and the
// pre-rename PWA manifest still request.
const PAGES = ['/', '/game', '/game.html', '/privacy', '/privacy.html', '/404.html'];
const referenced = new Set();
for (const p of PAGES) {
  const r = await fetch(BASE + p);
  check(`page ${p}`, r.status === 200, String(r.status));
  const html = await r.text();
  // BOTH FORMS. These pages mix them: `/vendor/leaflet/leaflet.js` alongside `js/game.js` and
  // `css/style.css`. Matching only the absolute ones checked six files and looked like it had
  // checked everything, which is worse than not checking at all.
  for (const m of html.matchAll(/(?:src|href)="([^"?#]+)"/g)) {
    const href = m[1];
    if (/^(https?:)?\/\//.test(href) || href.startsWith('data:')) continue;   // someone else's server
    if (!/\.(js|css|png|svg|webmanifest|ico|woff2?)$/.test(href)) continue;
    referenced.add(href.startsWith('/') ? href : '/' + href);   // every page sits at the root
  }
}
let missing = [];
for (const u of referenced) {
  const r = await fetch(BASE + u, { method: 'HEAD' });
  if (r.status !== 200) missing.push(`${u} (${r.status})`);
}
check(`every file the pages reference exists`, missing.length === 0, `${referenced.size} checked${missing.length ? ' · MISSING ' + missing.join(', ') : ''}`);

// ————— the recording timer, driven through a whole take —————
// The real tick() body, lifted out of js/app.js and executed against a stub DOM. This is the check
// that would have caught the frozen clock: the function parses fine and throws on first call.
{
  const src = readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const start = src.indexOf('function tick() {');
  let depth = 0, end = -1;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  const tickSrc = src.slice(start, end);
  const tStart = src.indexOf('const TIERS = [');
  const tiersSrc = src.slice(tStart, src.indexOf('];', tStart) + 2);

  const els = {};
  const cl = () => { const s = new Set(); return { add: (c) => s.add(c), remove: (c) => s.delete(c), toggle: (c, on) => (on ? s.add(c) : s.delete(c)), contains: (c) => s.has(c) }; };
  const el = (id) => (els[id] = els[id] || { id, disabled: false, hidden: false, textContent: '', dataset: {}, style: {}, children: [0, 1, 2, 3].map(() => ({ classList: cl() })) });
  const $ = (s) => el(s);
  let capFired = false;
  const build = new Function('$', 'MAX_SECONDS', 'stopListening', 'startedAt',
    `${tiersSrc}\nconst MIN_RECORD_S = TIERS[0].at;\n${tickSrc}\nreturn tick;`);
  const run = (secs) => build($, 60, () => { capFired = true; }, Date.now() - secs * 1000)();

  let threw = null;
  const seen = {};
  try {
    for (let s = 0; s <= 60; s++) { run(s); seen[s] = { clock: el('#timer').textContent, locked: el('#stopBtn').disabled, dots: el('#dots').children.filter((d) => d.classList.contains('on')).length }; }
  } catch (e) { threw = `${e.constructor.name}: ${e.message}`; }

  check('recording timer runs at every second of a take', !threw, threw || '');
  if (!threw) {
    check('clock counts down', seen[0]?.clock === '1:00' && seen[30]?.clock === '0:30' && seen[60]?.clock === '0:00', `${seen[0]?.clock} → ${seen[30]?.clock} → ${seen[60]?.clock}`);
    check('submit locked before the floor, free after', seen[19]?.locked === true && seen[20]?.locked === false);
    check('all four dots are reachable', seen[59]?.dots === 4, `${seen[59]?.dots}/4`);
    check('the cap stops the take', capFired);
  }
}

// ————— the endpoints answer —————
const post = (body, p = '/api/analyze') => fetch(BASE + p, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE }, body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))
  .catch((e) => ({ status: 0, json: { error: e.message } }));

// An empty body costs no model call, but it still proves the handler LOADED — which is what the
// deleted-import outage broke. A module that fails to import returns a 500 here, not a refusal.
const empty = await post({});
check('/api/analyze loads and answers', empty.json?.error === 'no_speech', `${empty.status} ${empty.json?.error ?? ''}`);
check('/api/analyze rejects a foreign origin', (await fetch(BASE + '/api/analyze', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}',
})).status === 403);
const board = await fetch(BASE + '/api/scores?game_type=arabic').then((r) => r.json()).catch(() => null);
check('/api/scores answers', board?.ok === true || board?.error === 'not_configured', board?.error || '');

// ————— one real analysis, end to end —————
if (OFFLINE) {
  console.log('  --   real analysis skipped (--offline)');
} else if (!process.env.GEMINI_API_KEY && !existsSync(path.join(ROOT, '.env'))) {
  console.log('  --   real analysis skipped (no GEMINI_API_KEY)');
} else {
  const clip = path.join(ROOT, 'test-audio/jo.mp3');
  if (!existsSync(clip)) {
    console.log('  --   real analysis skipped (test-audio/jo.mp3 missing)');
  } else {
    const audio = readFileSync(clip).toString('base64');
    const t0 = Date.now();
    const r = await post({ audio, mime: 'audio/mpeg' });
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    const ok = !!r.json?.ok && typeof r.json.result?.lat === 'number';
    check('a real recording comes back with a place', ok, ok ? `${r.json.result.place} in ${secs}s` : `${r.status} ${r.json?.error ?? ''}`);
  }
}

// ————— report —————
server.kill();
const failed = results.filter((r) => !r.pass);
console.log(`\n  ${results.length - failed.length}/${results.length} passed${failed.length ? `   ${failed.length} FAILING` : ''}`);
process.exit(failed.length ? 1 : 0);
