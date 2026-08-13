// How OLD is every clip, and does its window actually exist?
//
//   node tools/clip-provenance.mjs
//
// Two gaps nothing else covers.
//
// AGE. Accents move over decades, so a 1970s recording is a different answer from a 2024 one.
// The deck has a `year` field and the reveal screen warns "archival recording · accents move"
// below 1990, but only 9 of 162 clips carry a year. For the 50 YouTube clips the upload date is
// free to fetch and has simply never been recorded, so age is unknown for almost the whole deck
// and nobody can tell a 2024 street interview from a 2011 one.
//
// WINDOW VALIDITY. Each embed plays a fixed 20s slice from clip.start. Nothing has ever checked
// that start + 20 is actually inside the video. A start past the end plays silence, and the
// player burns their listening budget on nothing. Videos also get re-uploaded shorter.
//
// Metadata only, no audio downloaded.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);

const WINDOW_S = 20;
const rows = [], problems = [];

for (const [deck, list] of Object.entries(window.CLIPS)) {
  for (const c of list) {
    if (c.kind !== 'yt') continue;
    let meta = null;
    for (let i = 0; i < 2 && !meta; i++) {
      try {
        const out = execFileSync('yt-dlp', ['--dump-json', '--skip-download', '--no-warnings',
          `https://www.youtube.com/watch?v=${c.videoId}`], { encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024 });
        meta = JSON.parse(out);
      } catch { /* retry once */ }
    }
    if (!meta) { problems.push({ deck, label: c.label, id: c.videoId, why: 'metadata unavailable' }); continue; }
    const up = String(meta.upload_date || '');
    const year = up ? Number(up.slice(0, 4)) : null;
    const dur = Number(meta.duration || 0);
    const start = c.start || 0;
    const fits = dur > 0 ? start + WINDOW_S <= dur : null;
    rows.push({ deck, label: c.label, id: c.videoId, year, dur, start, fits });
    if (fits === false) {
      problems.push({ deck, label: c.label, id: c.videoId, why: `window ${start}-${start + WINDOW_S}s exceeds video length ${dur}s` });
      console.log(`  ✗ ${deck.padEnd(11)} ${String(c.label).slice(0, 24).padEnd(26)} window ${start}s+20 > ${dur}s video`);
    }
    if (year && year < 2015) console.log(`  ~ ${deck.padEnd(11)} ${String(c.label).slice(0, 24).padEnd(26)} uploaded ${year}`);
  }
}

const years = rows.filter((r) => r.year).map((r) => r.year).sort();
console.log(`\n${rows.length} embeds with metadata`);
if (years.length) {
  const q = (p) => years[Math.floor(years.length * p)];
  console.log(`  upload year: oldest ${years[0]} · median ${q(0.5)} · newest ${years[years.length - 1]}`);
  const buckets = {};
  for (const y of years) { const b = y < 2015 ? 'pre-2015' : y < 2020 ? '2015-19' : y < 2023 ? '2020-22' : '2023+'; buckets[b] = (buckets[b] || 0) + 1; }
  for (const [b, n] of Object.entries(buckets)) console.log(`    ${b.padEnd(9)} ${n}`);
}
console.log(`  windows that fit the video : ${rows.filter((r) => r.fits).length}/${rows.length}`);
fs.writeFileSync(path.join(ROOT, 'data/clip-provenance.json'), JSON.stringify({ ts: new Date().toISOString(), rows, problems }, null, 2));
console.log(problems.length ? `\n${problems.length} problem(s) — wrote data/clip-provenance.json` : '\nno window or metadata problems');
