// Generate tools/targets-decks.json from a compact city table.
//
//   node tools/make-targets.mjs
//
// Hand-writing thirty targets with five queries each is thirty chances to fat-finger a
// coordinate, and the first version of this file had exactly that problem. The query SHAPES are
// what matter and they are per-language, so they belong in one place: local vox-pop formats
// ("interviste ai passanti", "Straßenumfrage", "عوامی رائے"), never "accent" or "dialect"
// queries, which return language lessons and comedians rather than residents.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The phrases local channels actually use to title a street interview. {city} is substituted.
const SHAPES = {
  italian: [
    'intervista per strada {city}', 'interviste ai passanti {city}', 'sondaggio per strada {city}',
    'domande a caso per strada {city}', 'cosa ne pensa la gente {city} intervista',
  ],
  german: [
    'Straßenumfrage {city}', 'Umfrage Passanten {city}', 'Leute auf der Straße gefragt {city}',
    'Straßenumfrage {city} Meinung', 'Passanten befragt {city}',
  ],
  urdu: [
    '{city} عوامی رائے', '{city} public opinion urdu interview', '{city} شہریوں سے گفتگو',
    '{city} awami raye interview', '{city} street interview urdu public',
  ],
  hindi: [
    '{city} सड़क पर इंटरव्यू', '{city} जनता की राय इंटरव्यू', '{city} public opinion hindi street',
    '{city} लोगों से बातचीत सड़क', '{city} आम लोगों की राय',
  ],
};

// city, lat, lng, want, native names to search for and to treat as a spoken answer leak
const CITIES = {
  italian: [
    ['Milan, Italy', 45.4642, 9.1900, 2, ['Milano', 'milanese']],
    ['Rome, Italy', 41.9028, 12.4964, 2, ['Roma', 'romano', 'romanesco']],
    ['Naples, Italy', 40.8518, 14.2681, 2, ['Napoli', 'napoletano']],
    ['Turin, Italy', 45.0703, 7.6869, 1, ['Torino', 'torinese']],
    ['Palermo, Italy', 38.1157, 13.3615, 1, ['Palermo', 'siciliano', 'Sicilia']],
    ['Bologna, Italy', 44.4949, 11.3426, 1, ['Bologna', 'bolognese']],
    ['Florence, Italy', 43.7696, 11.2558, 1, ['Firenze', 'fiorentino', 'toscano']],
    ['Venice, Italy', 45.4408, 12.3155, 1, ['Venezia', 'veneto']],
    ['Genoa, Italy', 44.4056, 8.9463, 1, ['Genova', 'genovese', 'Liguria']],
    ['Bari, Italy', 41.1171, 16.8719, 1, ['Bari', 'barese', 'Puglia']],
    ['Catania, Italy', 37.5079, 15.0830, 1, ['Catania', 'catanese', 'Sicilia']],
    ['Verona, Italy', 45.4384, 10.9916, 1, ['Verona', 'veronese', 'veneto']],
    ['Cagliari, Italy', 39.2238, 9.1217, 1, ['Cagliari', 'Sardegna', 'sardo']],
    ['Lugano, Switzerland', 46.0037, 8.9511, 1, ['Lugano', 'Ticino', 'ticinese']],
  ],
  german: [
    ['Berlin, Germany', 52.5200, 13.4050, 2, ['Berlin', 'Berliner']],
    ['Munich, Germany', 48.1351, 11.5820, 2, ['München', 'Münchner', 'Bayern', 'bayerisch']],
    ['Hamburg, Germany', 53.5511, 9.9937, 2, ['Hamburg', 'Hamburger']],
    ['Cologne, Germany', 50.9375, 6.9603, 1, ['Köln', 'Kölner', 'kölsch']],
    ['Vienna, Austria', 48.2082, 16.3738, 2, ['Wien', 'Wiener', 'Österreich']],
    ['Zurich, Switzerland', 47.3769, 8.5417, 2, ['Zürich', 'Zürcher', 'Schweiz', 'Mundart']],
    ['Bern, Switzerland', 46.9480, 7.4474, 1, ['Bern', 'Berner', 'Schweiz']],
    ['Basel, Switzerland', 47.5596, 7.5886, 1, ['Basel', 'Basler', 'Schweiz']],
    ['Leipzig, Germany', 51.3397, 12.3731, 1, ['Leipzig', 'Leipziger', 'Sachsen', 'sächsisch']],
    ['Stuttgart, Germany', 48.7758, 9.1829, 1, ['Stuttgart', 'Schwaben', 'schwäbisch']],
    ['Frankfurt, Germany', 50.1109, 8.6821, 1, ['Frankfurt', 'Hessen', 'hessisch']],
    ['Dresden, Germany', 51.0504, 13.7373, 1, ['Dresden', 'Dresdner', 'Sachsen']],
    ['Graz, Austria', 47.0707, 15.4395, 1, ['Graz', 'Steiermark', 'Österreich']],
    ['Hannover, Germany', 52.3759, 9.7320, 1, ['Hannover', 'Niedersachsen']],
  ],
  urdu: [
    ['Karachi, Pakistan', 24.8607, 67.0011, 2, ['کراچی', 'Karachi', 'سندھ']],
    ['Lahore, Pakistan', 31.5204, 74.3587, 2, ['لاہور', 'Lahore', 'پنجاب']],
    ['Islamabad, Pakistan', 33.6844, 73.0479, 2, ['اسلام آباد', 'Islamabad']],
    ['Rawalpindi, Pakistan', 33.5651, 73.0169, 1, ['راولپنڈی', 'Rawalpindi', 'پنڈی']],
    ['Peshawar, Pakistan', 34.0151, 71.5249, 1, ['پشاور', 'Peshawar', 'خیبر']],
    ['Multan, Pakistan', 30.1575, 71.5249, 1, ['ملتان', 'Multan']],
    ['Faisalabad, Pakistan', 31.4504, 73.1350, 1, ['فیصل آباد', 'Faisalabad']],
    ['Quetta, Pakistan', 30.1798, 66.9750, 1, ['کوئٹہ', 'Quetta', 'بلوچستان']],
    ['Hyderabad, Pakistan', 25.3960, 68.3578, 1, ['حیدرآباد', 'Hyderabad', 'سندھ']],
    ['Sialkot, Pakistan', 32.4945, 74.5229, 1, ['سیالکوٹ', 'Sialkot']],
    ['Gujranwala, Pakistan', 32.1877, 74.1945, 1, ['گوجرانوالہ', 'Gujranwala']],
    ['Sukkur, Pakistan', 27.7052, 68.8574, 1, ['سکھر', 'Sukkur']],
  ],
  hindi: [
    ['Delhi, India', 28.6139, 77.2090, 1, ['दिल्ली', 'Delhi']],
    ['Mumbai, India', 19.0760, 72.8777, 2, ['मुंबई', 'Mumbai']],
    ['Lucknow, India', 26.8467, 80.9462, 1, ['लखनऊ', 'Lucknow']],
    ['Patna, India', 25.5941, 85.1376, 1, ['पटना', 'Patna', 'बिहार']],
    ['Jaipur, India', 26.9124, 75.7873, 1, ['जयपुर', 'Jaipur', 'राजस्थान']],
    ['Bhopal, India', 23.2599, 77.4126, 1, ['भोपाल', 'Bhopal']],
    ['Indore, India', 22.7196, 75.8577, 1, ['इंदौर', 'Indore']],
    ['Kanpur, India', 26.4499, 80.3319, 1, ['कानपुर', 'Kanpur']],
    ['Varanasi, India', 25.3176, 82.9739, 1, ['वाराणसी', 'Varanasi', 'बनारस']],
    ['Agra, India', 27.1767, 78.0081, 1, ['आगरा', 'Agra']],
    ['Ranchi, India', 23.3441, 85.3096, 1, ['रांची', 'Ranchi', 'झारखंड']],
    ['Dehradun, India', 30.3165, 78.0322, 1, ['देहरादून', 'Dehradun']],
  ],
};

const LANG = { italian: 'Italian', german: 'German', urdu: 'Urdu', hindi: 'Hindi' };
const RADIUS = { italian: 90, german: 90, urdu: 100, hindi: 100 };
// Hindi and Urdu are one spoken language and one deck. The table keeps them apart because the
// search phrasing and the native scripts differ, but both feed the same deck key.
const DECK_KEY = { italian: 'italian', german: 'german', urdu: 'hindi-urdu', hindi: 'hindi-urdu' };

const out = [];
for (const [deck, rows] of Object.entries(CITIES)) {
  for (const [label, lat, lng, want, native] of rows) {
    // Search in the LOCAL name, not the English exonym. Italian channels do not title
    // anything "Milan" and German ones do not write "Munich"; the first native entry is the
    // endonym, so "intervista per strada Milano" and "Straßenumfrage München" are what
    // actually match. The English label is still what the game shows the player.
    const city = (native && native[0]) || label.split(',')[0].trim();
    out.push({
      deck: DECK_KEY[deck],
      label,
      // Swiss and Austrian entries keep the German label; the deck is about the variety, and
      // Mohammad's ruling is that Swiss German belongs in it however far it sits from Hochdeutsch.
      lang: LANG[deck],
      lat,
      lng,
      r: RADIUS[deck],
      want,
      native,
      queries: SHAPES[deck].map((q) => q.replace('{city}', city)),
    });
  }
}

fs.writeFileSync(path.join(ROOT, 'tools/targets-decks.json'), JSON.stringify(out, null, 2));
const per = {};
for (const t of out) per[t.deck] = (per[t.deck] || 0) + t.want;
console.log(`wrote ${out.length} targets · wanted per deck: ${JSON.stringify(per)}`);
console.log(`queries per target: ${out[0].queries.length}`);
