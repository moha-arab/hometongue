// Refuse to let a stale eval file be read as current evidence.
//
// Twice in one session I quoted clips that had already been deleted, because data/eval-*.json
// outlives the manifest it describes and still reads as present tense. A stale eval is worse
// than no eval: "Zima -> Moscow, 3980 km" looked like a live argument for keeping a clip that
// was no longer in the deck.
//
// Imported by tools/check-decks.mjs so it runs on every validation.
import fs from 'node:fs';
import path from 'node:path';

export function staleEvals(root) {
  const dataDir = path.join(root, 'data');
  if (!fs.existsSync(dataDir)) return [];
  const clipsAt = fs.statSync(path.join(root, 'js/clips.js')).mtimeMs;
  return fs.readdirSync(dataDir)
    // archive-eval-* files are frozen records of superseded configurations, kept for the
    // notes to cite; they are permanently 'stale' by definition and not live evidence.
    .filter((f) => f.startsWith('eval-') && f.endsWith('.json'))
    .filter((f) => fs.statSync(path.join(dataDir, f)).mtimeMs < clipsAt);
}
