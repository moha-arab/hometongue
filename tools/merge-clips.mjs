// Merge vetted clips from data/sourced-clips.json into js/clips.js.
//
//   node tools/merge-clips.mjs --dry     show what would change
//   node tools/merge-clips.mjs           write it
//
// TWO THINGS THIS GUARDS AGAINST, both found the hard way.
//
// 1. CIRCULARITY. These clips were selected by Guess Me agreeing with the video's claimed
//    origin. Scoring Guess Me against them later would be scoring a model on a test set it
//    chose — it would look brilliant and mean nothing. Every merged clip is stamped
//    evalExclude:true and tools/eval.mjs skips them. The hand-labelled clips stay the only
//    honest benchmark.
//
// 2. IMPRESSIONISTS. The title filter let "ED GAMA IMITANDO e os 9 sotaques nordestinos"
//    through — a comedian performing nine accents — because \bimitat\b never matches the
//    Portuguese "IMITANDO". The filter is fixed, but anything sourced before that fix is
//    re-screened here rather than trusted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

const IMPOSTOR = new RegExp([
  'accent challenge', 'imitat', 'imitan', 'impression', 'impersonat', 'parod',
  'sotaques', 'acentos', 'haciendo el acento', 'trying to speak', 'teaching', 'lesson',
  'tutorial', 'learn ', 'how to speak', 'ai voice', 'text to speech', 'dublagem',
  'doblaje', 'пародия', 'акценты', 'comedia', 'comedy sketch',
].join('|'), 'i');

const { accepted } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sourced-clips.json'), 'utf8'));
globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);
const existing = new Set(Object.values(window.CLIPS).flat().map((c) => c.videoId || c.id));

const keep = [];
const dropped = [];
for (const c of accepted) {
  const title = c.gate?.title || '';
  if (IMPOSTOR.test(title)) { dropped.push({ label: c.label, title, why: 'impostor title' }); continue; }
  if (existing.has(c.videoId)) { dropped.push({ label: c.label, title, why: 'already in manifest' }); continue; }
  keep.push({ ...c, evalExclude: true });
}

const byDeck = {};
for (const c of keep) (byDeck[c.deck ?? deckOf(c)] ||= []).push(c);
function deckOf(c) {
  // deck is carried on the target, not the clip record; recover it from the language
  const L = { English: 'accents', French: 'french', Russian: 'russian', Portuguese: 'portuguese', Spanish: 'spanish', 'Hindi–Urdu': 'hindi-urdu', Chinese: 'chinese', Arabic: 'arabic' };
  return L[c.lang] || 'languages';
}

console.log(`keeping ${keep.length}, dropping ${dropped.length}`);
for (const d of dropped) console.log(`  drop  ${d.label.padEnd(22)} ${d.why} — ${d.title.slice(0, 50)}`);
console.log();
for (const [deck, list] of Object.entries(byDeck).sort()) {
  const before = (window.CLIPS[deck] || []).length;
  console.log(`  ${deck.padEnd(12)} ${before} -> ${before + list.length}`);
  for (const c of list) console.log(`      + ${c.label.padEnd(24)} heard ${c.gate.heard} (${c.gate.offBy} km)`);
}

if (DRY) { console.log('\n--dry: nothing written'); process.exit(0); }

let src = fs.readFileSync(path.join(ROOT, 'js/clips.js'), 'utf8');
for (const [deck, list] of Object.entries(byDeck)) {
  const marker = new RegExp(`(${deck.replace('-', '\\-')}:\\s*\\[)`);
  if (!marker.test(src)) { console.log(`!! deck ${deck} not found in clips.js — skipped`); continue; }
  const block = list.map((c) => `    ${JSON.stringify(c)},`).join('\n');
  src = src.replace(marker, `$1\n${block}`);
}
fs.writeFileSync(path.join(ROOT, 'js/clips.js'), src);
console.log(`\nwrote js/clips.js — run: node tools/check-decks.mjs`);
