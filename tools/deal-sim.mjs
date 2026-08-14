// Does every clip in a deck actually get dealt?
//
//   node tools/deal-sim.mjs
//
// The old dealer took one clip per COUNTRY before it would take a second from any country.
// Portuguese has five countries and a game has five rounds, so that first pass filled every
// game and the fallback loop never ran: seven of its twelve clips could never appear, and
// because the ordering inside each country was deterministic, every single game was the same
// five recordings shuffled. Nothing caught it because no test ever asked "can this clip be
// dealt at all".
//
// The dealer under test is READ OUT OF js/game.js, not copied here. A copy would drift, and a
// drifted copy is how the bug survived a simulation in the first place.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
await import(pathToFileURL(path.join(ROOT, 'js/clips.js')).href);

const src = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
const grab = (name) => {
  const m = src.match(new RegExp(`^function ${name}\\([\\s\\S]*?^}`, 'm'));
  if (!m) throw new Error(`could not find ${name}() in js/game.js`);
  return m[0];
};
const ROUNDS = Number(src.match(/const ROUNDS = (\d+)/)[1]);
const MIN_DECK = Number(src.match(/const MIN_DECK = (\d+)/)[1]);
const dealDeck = new Function('ROUNDS', `${grab('shuffle')}\n${grab('dealDeck')}\nreturn dealDeck;`)(ROUNDS);

const TRIALS = 3000;
console.log(`dealer read from js/game.js · ROUNDS=${ROUNDS} · MIN_DECK=${MIN_DECK} · ${TRIALS} games per deck\n`);
console.log('deck          clips  reachable   distinct games   repeat place in a game   status');

let bad = 0;
for (const [name, pool] of Object.entries(window.CLIPS)) {
  if (!pool.length) { console.log(`  ${name.padEnd(12)}${String(pool.length).padStart(4)}        empty`); continue; }
  const seen = new Set();
  const hands = new Set();
  let dupPlace = 0;
  for (let i = 0; i < TRIALS; i++) {
    const hand = dealDeck(pool);
    for (const c of hand) seen.add(c.id);
    hands.add(hand.map((c) => c.id).sort().join('|'));
    // Checked on the ANSWER PIN, not the label. Different labels can share coordinates —
    // "Buenos Aires, Argentina" and "Argentina", "Delhi, India" and "Delhi–Meerut Region" —
    // and a label-only check called those two distinct questions when the player is being
    // asked to click the identical spot twice.
    if (new Set(hand.map((c) => `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`)).size < hand.length) dupPlace += 1;
  }
  const unreachable = pool.filter((c) => !seen.has(c.id));
  const places = new Set(pool.map((c) => `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`)).size;
  // A deck with fewer distinct places than rounds MUST repeat a place; that is not a defect.
  const mustRepeat = places < ROUNDS;
  const ok = unreachable.length === 0 && (mustRepeat || dupPlace === 0);
  if (!ok) bad += 1;
  console.log(`  ${name.padEnd(12)}${String(pool.length).padStart(4)}`
    + `${String(seen.size).padStart(11)}${String(hands.size).padStart(17)}`
    + `${String(dupPlace).padStart(24)}   ${ok ? 'ok' : 'PROBLEM'}`);
  if (unreachable.length) {
    console.log(`      ${unreachable.length} clip(s) can NEVER be dealt: ${unreachable.map((c) => c.label).join(', ')}`);
  }
  if (dupPlace && !mustRepeat) console.log(`      ${dupPlace} games served the same place twice despite having ${places} places`);
}
console.log(bad ? `\n${bad} deck(s) with a dealing problem` : '\nevery clip in every deck is reachable, and no game repeats a place unnecessarily');
