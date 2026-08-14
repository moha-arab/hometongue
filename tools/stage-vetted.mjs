// Turn the vetting verdict into a merge-ready file.
//
//   node tools/stage-vetted.mjs
//
// Reads data/vet-final.json (which clips survived review AND an adversarial challenge) and
// rebuilds full clip records from data/candidates.json, the snapshot the vetting actually
// judged.
//
// IT DELIBERATELY DOES NOT READ data/src-*.json. Killed sourcing runs left node processes alive
// that outlived their shells and rewrote those files seventeen minutes AFTER the snapshot was
// taken, so the accepted list on disk is no longer the list that was reviewed — src-urdu.json
// now carries a different videoId for "Lahore, Pakistan" than the one a challenger cleared.
// Merging from a file that changed after it was vetted would ship unvetted clips under the
// authority of a review that never saw them.
//
// Geometry comes from tools/targets-decks.json, matched on the label, because the snapshot
// carries the label but not lat/lng/radius.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const { survive } = read('data/vet-final.json');
const candidates = read('data/candidates.json');
const targets = read('tools/targets-decks.json');

const bySnapshot = new Map(candidates.map((c) => [c.videoId, c]));
const geoFor = (deck, label) => targets.find((t) => t.deck === deck && t.label === label);

const accepted = [];
const skipped = [];
for (const s of survive) {
  const c = bySnapshot.get(s.videoId);
  if (!c) { skipped.push({ videoId: s.videoId, why: 'not in the vetted snapshot' }); continue; }
  const g = geoFor(c.deck, c.label);
  if (!g) { skipped.push({ videoId: s.videoId, why: `no target geometry for "${c.label}" in ${c.deck}` }); continue; }
  accepted.push({
    id: `yt-${c.videoId}`, kind: 'yt', videoId: c.videoId, deck: c.deck,
    label: c.label, lang: g.lang, lat: g.lat, lng: g.lng, r: g.r || 100,
    start: c.start, gain: 100, year: c.year || undefined,
    hint: 'Streamed from YouTube — the creator gets the view.',
    gate: {
      heard: c.heard, offBy: c.offBy, provenance: c.provenance,
      title: c.title, author: c.channel,
      // What actually cleared this clip: a reviewer that researched it and an independent
      // skeptic that tried to refute it and could not.
      vetted: { keptBecause: s.reason, challenged: s.challenge?.why?.slice(0, 400) || '' },
    },
  });
}

fs.writeFileSync(path.join(ROOT, 'data/sourced-clips.json'), JSON.stringify({ accepted, rejected: [] }, null, 2));
console.log(`staged ${accepted.length} vetted clip(s) for merge`);
for (const a of accepted) console.log(`  [${a.deck}] ${a.label.padEnd(22)} start=${a.start}s  ${a.year || '?'}`);
if (skipped.length) {
  console.log(`\n${skipped.length} survivor(s) could NOT be staged:`);
  for (const s of skipped) console.log(`  ${s.videoId}  ${s.why}`);
}
