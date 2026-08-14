// Replace curator working notes with something a player should actually read.
//
//   node tools/fix-hints.mjs
//
// clip.hint is the only prose shown after a round (js/game.js renders it into the reveal sheet).
// Thirteen clips carried the sourcing notes instead, ten of them hard-truncated at exactly 190
// characters and stopping mid-word. A player finishing a Spanish round was told:
//
//   "NOT the already-used Mexican medical-article reading · this is a different reader/topic.
//    Short (1:36) but clean. Country-level tag only, no specific city, pinned at Mexico City
//    with wide rad"
//
// which is both unreadable and an admission that the pin they were scored against was chosen
// loosely. The replacements say what the recording IS. They can describe the content freely,
// because the hint appears only after the answer is already on screen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REPLACE = {
  'Argentina': 'A volunteer reading an article aloud · Wikimedia Commons.',
  'Guatire, Venezuela': 'A volunteer narration, with music low underneath · Wikimedia Commons.',
  'Mexico': 'A volunteer reading an article aloud · Wikimedia Commons.',
  'Minas, Uruguay': 'An archival radio reading from 1946 · public domain.',
  'Peru': 'A volunteer reading aloud · Wikimedia Commons.',
  'Puerto Rico': 'A volunteer reading on Roman history · Wikimedia Commons.',
  'Spain': 'A Golden Age theatre monologue, read aloud · Wikimedia Commons.',
  'Turbaco, Colombia': 'A volunteer reading a Wikipedia article · CC BY-SA.',
  'Southern France, France': 'A Wikinews volunteer reading a short news bulletin.',
  'Delhi–Meerut Region, India': 'A spoken-Wikipedia recording in the northern standard.',
  'Varanasi, India': 'A seminary address given in Urdu, as is normal in Indian Deobandi seminaries.',
  'Hong Kong': 'A volunteer reading a Wikipedia biography aloud.',
  'Shanghai, China': 'A recitation of a classical Chinese essay.',
};

globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);
const CLIPS = window.CLIPS;

let changed = 0;
const stillBad = [];
for (const [deck, list] of Object.entries(CLIPS)) {
  for (const c of list) {
    const h = String(c.hint || '').trim();
    if (!h) continue;

    // One house style for the YouTube credit. Forty-one clips used an em dash and three used a
    // middot for the identical sentence.
    if (/^Streamed from YouTube/.test(h)) {
      const want = 'Streamed from YouTube · the creator gets the view.';
      if (h !== want) { c.hint = want; changed += 1; }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(REPLACE, c.label) && h.length > 100) {
      c.hint = REPLACE[c.label];
      changed += 1;
      continue;
    }

    if (h.length >= 185) stillBad.push(`${deck} / ${c.label} (${h.length} chars)`);
  }
}

// Nothing a player reads should be a truncated fragment.
for (const [deck, list] of Object.entries(CLIPS)) {
  for (const c of list) {
    const h = String(c.hint || '').trim();
    if (h.length >= 185) stillBad.push(`${deck} / ${c.label}`);
  }
}

const out = `// Pin It clip decks. Generated data — edit through tools/, not by hand.\nwindow.CLIPS = ${JSON.stringify(CLIPS, null, 2)};\n`;
const tmp = path.join(ROOT, 'js', '.clips-hints.js');
fs.writeFileSync(tmp, out);
globalThis.window = {};
await import(`${pathToFileURL(tmp).href}?v=${Date.now()}`);
const n = Object.values(window.CLIPS).flat().length;
fs.rmSync(tmp, { force: true });
if (n !== Object.values(CLIPS).flat().length) {
  console.log('REFUSED: clip count changed; js/clips.js untouched');
  process.exit(1);
}
fs.writeFileSync(path.join(ROOT, 'js/clips.js'), out);

console.log(`rewrote ${changed} hint(s)`);
console.log(stillBad.length ? `STILL TRUNCATED: ${[...new Set(stillBad)].join(', ')}` : 'no hint is a truncated fragment any more');
