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

const HOMELANDS = {
  arabic: ['Algeria', 'Bahrain', 'Egypt', 'Iraq', 'Jordan', 'Kuwait', 'Lebanon', 'Libya', 'Morocco',
    'Mauritania', 'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Sudan', 'Syria', 'Tunisia', 'UAE', 'Yemen'],
  accents: ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Ireland', 'USA', 'USA (US South)',
    'Canada', 'Australia', 'New Zealand', 'South Africa', 'Nigeria', 'Ghana', 'Kenya', 'Uganda',
    'Zimbabwe', 'India', 'Pakistan', 'Singapore', 'Malta', 'Jamaica', 'Trinidad and Tobago',
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
    if (!c.label || !c.attribution || typeof c.lat !== 'number' || typeof c.lng !== 'number') {
      note(`${c.id}: incomplete entry`);
      continue;
    }
    if (c.url.startsWith('/clips/') && !fs.existsSync(path.join(ROOT, c.url))) note(`${c.id}: file missing`);
    if (STRUCTURAL_ONLY.has(deck)) continue;
    const region = c.label.includes(',') ? c.label.split(',').pop().trim() : c.label.trim();
    if (!allowed.includes(region)) note(`${c.id}: "${region}" is not a place where this deck's language is native or a main language`);
  }
  if (clips.length < 5) note(`only ${clips.length} clips — deck cannot be dealt (needs 5)`);
}

console.log(problems ? `\n${problems} problem(s) found` : '\nAll decks satisfy the homeland rule.');
process.exit(problems ? 1 : 0);
