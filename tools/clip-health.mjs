// Is every clip in every deck still playable, right now?
//
//   node tools/clip-health.mjs
//
// Two failure modes, and the game cannot recover gracefully from either mid-round:
//
//   EMBEDS ROT. A YouTube clip can be deleted, made private, region-locked or have embedding
//   switched off at any moment, by someone who has never heard of this project. oEmbed is the
//   only honest test: if it does not answer, the player gets a dead frame where a voice should
//   be. There are dozens of embeds across the decks and nothing has ever re-checked them.
//
//   HOSTED FILES GO MISSING or drift off the loudness target. Every hosted clip is supposed to
//   be two-pass EBU R128 at -16 LUFS with its measured value stored, because sources arrived
//   anywhere from -52 to -6 LUFS and a deck that jumps 40 dB between rounds is painful on
//   headphones.
//
// Exits non-zero if anything is broken, so this can gate a deploy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// oEmbed answers 200 only when the video exists AND allows off-site playback. A 401/403 means
// embedding is disabled, 404 means gone. Either way the round is dead.
async function embedAlive(id) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
        signal: AbortSignal.timeout(15000),
      });
      if (r.status === 200) return { ok: true, title: (await r.json()).title };
      if ([401, 403].includes(r.status)) return { ok: false, why: `embedding disabled (${r.status})` };
      if (r.status === 404) return { ok: false, why: 'video gone (404)' };
      await sleep(1500);
    } catch { await sleep(1500); }
  }
  return { ok: false, why: 'no answer from oEmbed after 3 tries' };
}

let broken = 0, checkedEmbeds = 0, checkedFiles = 0;
const dead = [];

for (const [deck, clips] of Object.entries(window.CLIPS)) {
  for (const c of clips) {
    if (c.kind === 'yt') {
      checkedEmbeds += 1;
      const r = await embedAlive(c.videoId);
      if (!r.ok) {
        broken += 1;
        dead.push({ deck, label: c.label, id: c.videoId, why: r.why });
        console.log(`  DEAD  ${deck.padEnd(11)} ${String(c.label).slice(0, 26).padEnd(28)} ${c.videoId}  ${r.why}`);
      }
    } else if (c.url) {
      checkedFiles += 1;
      const f = path.join(ROOT, c.url.replace(/^\//, ''));
      if (!fs.existsSync(f)) {
        broken += 1;
        dead.push({ deck, label: c.label, why: 'file missing on disk' });
        console.log(`  MISSING FILE  ${deck.padEnd(11)} ${c.label}  ${c.url}`);
        continue;
      }
      const bytes = fs.statSync(f).size;
      if (bytes < 20000) {
        broken += 1;
        dead.push({ deck, label: c.label, why: `file is only ${bytes} bytes` });
        console.log(`  TRUNCATED  ${deck.padEnd(11)} ${c.label}  ${bytes} bytes`);
        continue;
      }
      // the stored loudness is the contract; a clip far off -16 LUFS will jump in the player
      if (typeof c.lufs === 'number' && Math.abs(c.lufs + 16) > 3) {
        broken += 1;
        dead.push({ deck, label: c.label, why: `loudness ${c.lufs} LUFS, target -16` });
        console.log(`  LOUDNESS  ${deck.padEnd(11)} ${c.label}  ${c.lufs} LUFS`);
      }
    }
  }
}

console.log(`\nchecked ${checkedEmbeds} embeds and ${checkedFiles} hosted files`);
if (!broken) {
  console.log('every clip is playable and on-target.');
} else {
  console.log(`\n${broken} BROKEN:`);
  for (const d of dead) console.log(`  ${d.deck} · ${d.label} — ${d.why}`);
}
process.exit(broken ? 1 : 0);
