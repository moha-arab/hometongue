// Set a clip's playback start, safely.
//
//   node tools/set-start.mjs <deck> "<label>" <seconds>       one clip
//   node tools/set-start.mjs --from data/pending-starts.json  a batch
//
// WHY THIS EXISTS AS A TOOL. Two separate hand-rolled attempts at this corrupted or silently
// skipped edits:
//
//   1. Slicing a fixed 2000-character window around the id and splicing it back cut through a
//      neighbouring JSON object and left clips.js unparseable.
//   2. curate-windows.mjs matched /("start":\s*[\d.]+|("lat"))/ after a LAZY span, so it hit
//      whichever key appeared FIRST. In clips where "lat" precedes "start" the callback fell
//      through and returned the string unchanged - while still printing a tick. Seven of nine
//      writes landed and the tool reported nine.
//
// So: find the object by brace matching from its id, edit only inside those bounds, and refuse
// to write anything unless the result re-parses AND every requested value reads back correctly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'js/clips.js');

// The object containing this id, located by walking braces out from the id and back in.
function objectBounds(src, id) {
  const at = src.indexOf(`"${id}"`);
  if (at < 0) return null;
  let start = -1, depth = 0;
  for (let i = at; i >= 0; i--) {
    if (src[i] === '}') depth += 1;
    else if (src[i] === '{') { if (depth === 0) { start = i; break; } depth -= 1; }
  }
  if (start < 0) return null;
  depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) return [start, i + 1]; }
  }
  return null;
}

function setStart(src, id, seconds) {
  const b = objectBounds(src, id);
  if (!b) return { src, ok: false, why: 'object not found' };
  const [s, e] = b;
  let obj = src.slice(s, e);
  if (/"start"\s*:/.test(obj)) obj = obj.replace(/"start"\s*:\s*[\d.]+/, `"start": ${seconds}`);
  else obj = obj.replace(/\{/, `{"start": ${seconds}, `);
  return { src: src.slice(0, s) + obj + src.slice(e), ok: true };
}

const args = process.argv.slice(2);
let wanted = [];
if (args[0] === '--from') {
  wanted = JSON.parse(fs.readFileSync(path.join(ROOT, args[1]), 'utf8'));
} else if (args.length >= 3) {
  wanted = [{ deck: args[0], label: args[1], start: Number(args[2]) }];
} else {
  console.log('usage: set-start.mjs <deck> "<label>" <seconds>   |   --from <file.json>');
  process.exit(1);
}

globalThis.window = {};
await import(pathToFileURL(FILE).href);
const original = fs.readFileSync(FILE, 'utf8');
let src = original;
const asked = [];
for (const w of wanted) {
  const clip = (window.CLIPS[w.deck] || []).find((c) => c.label === w.label && c.url);
  if (!clip) { console.log(`  ? ${w.deck}/${w.label} not found`); continue; }
  const r = setStart(src, clip.id, w.start);
  if (!r.ok) { console.log(`  ? ${w.label}: ${r.why}`); continue; }
  src = r.src;
  asked.push({ ...w, id: clip.id });
}

// Verify before writing: re-parse a candidate and read every value back.
const tmp = path.join(ROOT, 'js/.clips-candidate.js');
fs.writeFileSync(tmp, src);
let verified = false, readback = [];
try {
  globalThis.window = {};
  await import(`${pathToFileURL(tmp).href}?v=${Date.now()}`);
  readback = asked.map((a) => {
    const c = (window.CLIPS[a.deck] || []).find((x) => x.label === a.label && x.url);
    return { label: a.label, want: a.start, got: c ? c.start : undefined };
  });
  verified = readback.every((r) => Number(r.got) === Number(r.want));
} catch (e) {
  console.log(`  candidate failed to parse: ${e.message}`);
}
fs.rmSync(tmp, { force: true });

for (const r of readback) {
  console.log(`  ${Number(r.got) === Number(r.want) ? 'ok  ' : 'FAIL'} ${String(r.label).slice(0, 34).padEnd(36)} start=${r.got}${Number(r.got) === Number(r.want) ? '' : ` (wanted ${r.want})`}`);
}
if (verified) {
  fs.writeFileSync(FILE, src);
  console.log(`\nwrote ${asked.length} start(s), all read back correctly`);
} else {
  console.log('\nREFUSED to write: not every value read back. clips.js untouched.');
  process.exit(1);
}
