// The 3-minute answer to "is the model sharp right now?"
//
//   node tools/canary.mjs
//
// Exists because of Aug 8: the same eval scored 37-51 km at 4 AM and 69 km at 5 PM on
// identical clips, config and labels — Google's flash serving degrades under peak load, and
// fine accent discrimination is what dies first (Basra retreats to Baghdad, Manama to Kuwait
// City). Temperature is deprecated on this model, so nothing pins it; the serving window is
// sharp or coarse and three parallel calls agree with each other either way.
//
// 21 fixed clips: 13 load-sensitive canaries (the ones that flip) + 8 stable controls (the
// ones that never miss — if a CONTROL misses, that is a real model change, not load).
// Appends {ts, median, canaryMedian, controlMedian} to data/canary-log.jsonl.
// Rule of thumb before filming: canaryMedian under ~150 = city magic is on;
// over ~300 = expect region-level answers, come back in off-peak hours.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { SYSTEM, SCHEMA, MODEL } = await import(pathToFileURL(path.join(ROOT, 'api/prompt.js')).href);
globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);

const CANARIES = ['Basra, Iraq', 'Manama, Bahrain', 'Sanaa, Yemen', 'Batna, Algeria', 'Oran, Algeria',
  'Djelfa, Algeria', 'Hebron, Palestine', 'Gaza, Palestine', 'Southern France, France', 'Belgium',
  'Spain', 'Chengdu, China', 'Riyadh, Saudi Arabia'];
const CONTROLS = ['Aleppo, Syria', 'Beirut, Lebanon', 'Amman, Jordan', 'Baghdad, Iraq',
  'Cairo, Egypt', 'Kuwait City, Kuwait', 'Taiz, Yemen', 'Tunis, Tunisia'];

const clips = [];
for (const list of Object.values(window.CLIPS)) {
  for (const c of list) {
    const kind = CANARIES.includes(c.label) ? 'canary' : CONTROLS.includes(c.label) ? 'control' : null;
    if (!kind || c.kind === 'yt' || !c.url || c.lat == null) continue;
    const f = path.join(ROOT, c.url.replace(/^\//, ''));
    if (fs.existsSync(f) && !clips.some((x) => x.label === c.label)) clips.push({ kind, label: c.label, lat: c.lat, lng: c.lng, f });
  }
}

const km = (aLat, aLng, bLat, bLng) => {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(b64, model = MODEL) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'audio/mpeg', data: b64 } },
            { text: 'Where did this person grow up?' },
          ] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
        signal: AbortSignal.timeout(80000),
      });
      if ([429, 503, 400].includes(r.status)) { await sleep(6000 + 3000 * i); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
    } catch { await sleep(3000); }
  }
  return null;
}

// 3.5-flash rides along: the Aug 9 shootout measured it slightly sharper and 2x faster than
// 3.6 during a coarse window (72 vs 85 km, 6.9 vs 12.6 s). Logging both curves tells us
// whether it breathes with load the same way and whether it deserves fallback duty.
const MODELS = [MODEL, 'gemini-3.5-flash'];
const rows = [];
const queue = [];
for (const c of clips) for (const m of MODELS) queue.push({ ...c, model: m });
async function worker() {
  while (queue.length) {
    const c = queue.shift();
    const g = await ask(fs.readFileSync(c.f).toString('base64'), c.model);
    if (!g || typeof g.lat !== 'number') continue;
    const d = Math.round(km(c.lat, c.lng, g.lat, g.lng));
    rows.push({ kind: c.kind, model: c.model, label: c.label, km: d, place: g.place });
    console.log(`  ${c.kind === 'canary' ? '◆' : '·'} ${(c.model === MODEL ? '' : '[3.5] ') + c.label}`.padEnd(36) + `${String(d).padStart(5)} km  ${g.place}`);
  }
}
await Promise.all([worker(), worker(), worker()]);

const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
let entry;
for (const m of MODELS) {
  const mine = rows.filter((r) => r.model === m);
  const e = {
    ts: new Date().toISOString(),
    model: m,
    median: med(mine.map((r) => r.km)),
    canaryMedian: med(mine.filter((r) => r.kind === 'canary').map((r) => r.km)),
    controlMedian: med(mine.filter((r) => r.kind === 'control').map((r) => r.km)),
    n: mine.length,
  };
  fs.appendFileSync(path.join(ROOT, 'data', 'canary-log.jsonl'), JSON.stringify(e) + '\n');
  if (m === MODEL) entry = e;
  else console.log(`[3.5-flash]  median ${e.median} km · canaries ${e.canaryMedian} km · controls ${e.controlMedian} km`);
}
console.log(`\n${entry.ts}  median ${entry.median} km · canaries ${entry.canaryMedian} km · controls ${entry.controlMedian} km`);
console.log(entry.canaryMedian < 150 ? 'SHARP — city-level magic is on' : entry.canaryMedian < 300 ? 'MIXED — usable, expect some region answers' : 'COARSE — off-peak hours will serve better');
