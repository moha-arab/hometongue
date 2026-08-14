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

// Loose on purpose. A clip where the model disagrees with the label is a HARD round, which is
// what a guessing game wants, and its gate record preserves the disagreement so the weak spot
// stays visible. Only absurd mismatches are cut, since those usually mean the video was
// mislabelled rather than the accent being subtle.

const MERGE_KM = 1200;

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
  if ((c.gate?.offBy ?? 999) > MERGE_KM) {
    dropped.push({ label: c.label, title, why: `model heard ${c.gate.heard} — ${c.gate.offBy} km off` });
    continue;
  }
  // The reveal screen credits every clip, and check-decks enforces it. Embedded clips are
  // served by YouTube under its own terms, so the creator and the video are the credit.
  keep.push({
    ...c,
    evalExclude: true,
    source: {
      who: c.gate?.author || 'YouTube creator',
      host: 'YouTube',
      license: 'Streamed from YouTube — the creator keeps the view',
      page: `https://www.youtube.com/watch?v=${c.videoId}`,
      note: c.gate?.title || '',
    },
  });
}

const byDeck = {};
for (const c of keep) (byDeck[c.deck ?? deckOf(c)] ||= []).push(c);
function deckOf(c) {
  // deck is carried on the target, not the clip record; recover it from the language
  // Targets name the language the way a person would - "Urdu", "Hindi", "Mandarin",
  // "Cantonese" - and none of those were in this map, so six Hindi/Urdu and Chinese clips
  // silently landed in the World Languages deck instead of their own. Anything unrecognised
  // falling through to 'languages' is a quiet miscategorisation, not a safe default, so the
  // real deck is now stamped on each record at source and this is only a fallback.
  const L = {
    English: 'accents', French: 'french', Portuguese: 'portuguese',
    Spanish: 'spanish', Arabic: 'arabic', Italian: 'italian',
    German: 'german', 'Swiss German': 'german', 'Austrian German': 'german',
    Hindi: 'hindi-urdu', Urdu: 'hindi-urdu',
    Chinese: 'chinese', Mandarin: 'chinese', Cantonese: 'chinese',
  };
  // There is no safe default any more. 'languages' used to catch anything unmapped, which is
  // how six Hindi and Chinese clips ended up filed under World Languages; that deck no longer
  // exists, so an unmapped language must stop the merge rather than pick a deck at random.
  if (!L[c.lang]) throw new Error(`"${c.lang}" is not mapped to a deck — add it to this map before merging`);
  return L[c.lang];
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
  // Plain string search, not a regex: the deck keys are quoted ("accents": [) and every
  // attempt to express that as an escaped pattern got mangled, silently matching nothing
  // while the tool reported success.
  const key = JSON.stringify(deck) + ": [";
  const at = src.indexOf(key);
  if (at < 0) { console.log(`!! deck ${deck} not found in clips.js — skipped`); continue; }
  const NL = String.fromCharCode(10);
  const block = list.map((c) => `    ${JSON.stringify(c)},`).join(NL);
  src = src.slice(0, at + key.length) + NL + block + src.slice(at + key.length);
}
fs.writeFileSync(path.join(ROOT, 'js/clips.js'), src);
console.log(`\nwrote js/clips.js — run: node tools/check-decks.mjs`);
