// Deck rule check — run before shipping clips:  node tools/check-decks.mjs
//
// THE RULE: a dialect deck may only contain speakers from places where that language is
// native or a main/official language. An American speaking Arabic does not belong in the
// Arabic deck; a Filipino reading an English paragraph does not belong in English Accents.
// Nigeria, South Africa, India and Jamaica DO belong in English — English is a main language
// there with its own established variety. The test is the speaker's home, not their fluency.
//
// Everything here is a country/territory as it appears after the last comma of a clip label
// (labels with no comma are themselves the region, e.g. "Belgium", "Taiwan", "Hong Kong").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const TARGET_LUFS = -16;
// 4 dB, not tighter: the -1.5 dBTP ceiling wins over the loudness target on clips with a high
// crest factor (a shout, a door slam), so those legitimately land a few dB below -16.
const LUFS_TOLERANCE = 4;

const HOMELANDS = {
  arabic: ['Algeria', 'Bahrain', 'Egypt', 'Iraq', 'Jordan', 'Kuwait', 'Lebanon', 'Libya', 'Morocco',
    'Mauritania', 'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Sudan', 'Syria', 'Tunisia', 'UAE', 'Yemen'],
  accents: ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Ireland', 'USA', 'USA (US South)',
    'Canada', 'Australia', 'New Zealand', 'South Africa', 'Nigeria', 'Ghana', 'Kenya', 'Uganda',
    'Zimbabwe', 'Namibia', 'Botswana', 'Zambia', 'India', 'Pakistan', 'Singapore', 'Malta', 'Jamaica', 'Trinidad and Tobago',
    'Barbados', 'Guyana', 'Belize', 'Bahamas'],
  french: ['France', 'Canada', 'Belgium', 'Switzerland', 'Monaco', 'Luxembourg', 'Haiti', 'Senegal',
    'Mali', 'Burkina Faso', 'Niger', 'Guinea', "Côte d'Ivoire", 'Togo', 'Benin', 'Cameroon', 'Gabon',
    'Congo', 'DR Congo', 'Central African Republic', 'Chad', 'Madagascar', 'Rwanda', 'Burundi',
    'Djibouti', 'Comoros', 'Seychelles', 'Mauritius'],
  spanish: ['Spain', 'Mexico', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica',
    'Panama', 'Cuba', 'Dominican Republic', 'Puerto Rico', 'Colombia', 'Venezuela', 'Ecuador', 'Peru',
    'Bolivia', 'Chile', 'Argentina', 'Uruguay', 'Paraguay', 'Equatorial Guinea'],
  portuguese: ['Portugal', 'Brazil', 'Angola', 'Mozambique', 'Cape Verde', 'Guinea-Bissau',
    'São Tomé and Príncipe', 'Timor-Leste'],
  russian: ['Russia', 'Belarus', 'Kazakhstan', 'Kyrgyzstan'],
  chinese: ['China', 'Taiwan', 'Hong Kong', 'Macau', 'Singapore'],
  'hindi-urdu': ['India', 'Pakistan'],
};

// World Languages asks "where is this language spoken", so its pins are homelands by construction
// and are checked only for structural sanity, not against a country list.
const STRUCTURAL_ONLY = new Set(['languages']);

global.window = {};
await import(`file://${ROOT.replace(/\\/g, '/')}/js/clips.js`);

let problems = 0;
const note = (msg) => { console.log('  ✗ ' + msg); problems++; };

for (const [deck, clips] of Object.entries(window.CLIPS)) {
  console.log(`\n${deck} (${clips.length} clips)`);
  const allowed = HOMELANDS[deck];
  if (!allowed && !STRUCTURAL_ONLY.has(deck)) { note(`no homeland list defined for deck "${deck}"`); continue; }
  for (const c of clips) {
    if (!c.label || typeof c.lat !== 'number' || typeof c.lng !== 'number') {
      note(`${c.id}: incomplete entry`);
      continue;
    }
    // every clip must be able to tell the player where it came from
    const s = c.source;
    if (!s || !s.host || !s.license) note(`${c.id}: source is missing host or licence`);
    else if (!s.who) note(`${c.id}: source has no "recording by" line`);
    // Loudness: sources arrive anywhere from -52 to -6 LUFS. Everything is normalized to -16
    // so one clip can't blow the player's ears out while the next is inaudible.
    if (c.kind !== 'yt' && typeof c.lufs !== 'number') note(`${c.id}: no measured loudness — run the normalizer`);
    else if (c.kind !== 'yt' && Math.abs(c.lufs - TARGET_LUFS) > LUFS_TOLERANCE) note(`${c.id}: ${c.lufs} LUFS is outside ${TARGET_LUFS}±${LUFS_TOLERANCE}`);
    if (c.kind === 'yt') {
      // Streamed from YouTube, so there is no local file — but it still went through the
      // transcript gate (audio fetched, judged, deleted), and must carry that evidence.
      if (!c.videoId) note(`${c.id}: yt clip with no videoId`);
      // Two gate shapes exist. The old one proved origin from a transcript and recorded
      // originConfidence. The new one (tools/source-clips.mjs) has the app's own model listen
      // blind and records how far its independent guess landed from the claimed place, which
      // is stronger evidence — an impressionist does not survive it.
      if (!c.gate) note(`${c.id}: yt clip has no gate record — run tools/source-clips.mjs`);
      else if (c.gate.heard !== undefined) {
        if (typeof c.gate.offBy !== 'number') note(`${c.id}: model gate record is missing offBy`);
        else if (c.gate.offBy > 250) note(`${c.id}: model heard ${c.gate.heard}, ${c.gate.offBy} km from the label`);
        if (!c.evalExclude) note(`${c.id}: model-gated clip must be evalExclude — it cannot score the model that chose it`);
      } else if (!c.gate.originConfidence) note(`${c.id}: yt clip has no gate record — run tools/source-clips.mjs`);
      else if (c.gate.originConfidence === 'unknown') note(`${c.id}: speaker's origin was never established`);
      else if (typeof c.gain !== 'number') note(`${c.id}: no measured volume`);
    } else if (c.url.startsWith('/clips/') && !fs.existsSync(path.join(ROOT, c.url))) {
      note(`${c.id}: file missing`);
    }
    if (STRUCTURAL_ONLY.has(deck)) continue;
    const region = c.label.includes(',') ? c.label.split(',').pop().trim() : c.label.trim();
    if (!allowed.includes(region)) note(`${c.id}: "${region}" is not a place where this deck's language is native or a main language`);
  }
  if (clips.length < 5) note(`only ${clips.length} clips — deck cannot be dealt (needs 5)`);
}

console.log(problems ? `\n${problems} problem(s) found` : '\nAll decks satisfy the homeland rule.');
process.exit(problems ? 1 : 0);
