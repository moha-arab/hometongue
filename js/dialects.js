// Lahja dialect engine — word-marker based classifier (prototype).
// All terms are stored pre-normalized: أإآ→ا, ى→ي, ة→ه, no diacritics.

// Countries and regions now live in places.js — this file is the Arabic marker engine.
const { COUNTRIES, REGIONS } = window.HT_PLACES;

// t: normalized term, w: {country: weight}, en: gloss shown as evidence
const MARKERS = [
  // ——— Egyptian
  { t: 'ازيك',     w: { eg: 5 }, en: "izzayyak — 'how are you'" },
  { t: 'ازاي',     w: { eg: 5 }, en: "izzāy — 'how'" },
  { t: 'دلوقتي',   w: { eg: 5 }, en: "dilwa'ti — 'now'" },
  { t: 'النهارده', w: { eg: 5 }, en: "innaharda — 'today'" },
  { t: 'امبارح',   w: { eg: 4 }, en: "imbāreḥ — 'yesterday'" },
  { t: 'عايز',     w: { eg: 4 }, en: "ʿāyiz — 'want'" },
  { t: 'عايزه',    w: { eg: 4 }, en: "ʿāyza — 'want'" },
  { t: 'عايزين',   w: { eg: 3 }, en: "ʿayzīn — 'we want'" },
  { t: 'عاوز',     w: { eg: 4 }, en: "ʿāwiz — 'want'" },
  { t: 'اوي',      w: { eg: 4 }, en: "awi — 'very'" },
  { t: 'كده',      w: { eg: 4 }, en: "keda — 'like this'" },
  { t: 'كدا',      w: { eg: 4 }, en: "keda — 'like this'" },
  { t: 'مفيش',     w: { eg: 4 }, en: "mafīsh — 'there isn't'" },
  { t: 'ايه',      w: { eg: 4 }, en: "ēh — 'what'" },
  { t: 'فين',      w: { eg: 3 }, en: "fēn — 'where'" },
  { t: 'برضه',     w: { eg: 3 }, en: "barḍo — 'also'" },
  { t: 'برضو',     w: { eg: 3 }, en: "barḍo — 'also'" },
  { t: 'يسطا',     w: { eg: 4 }, en: "ya sṭa — 'dude'" },
  { t: 'جامد',     w: { eg: 3 }, en: "gāmid — 'awesome'" },
  { t: 'طب',       w: { eg: 2 }, en: "ṭab — 'okay then'" },
  { t: 'خالص',     w: { eg: 2 }, en: "khāliṣ — 'at all'" },
  { t: 'ليه',      w: { eg: 2, sa: 1 }, en: "lēh — 'why'" },
  { t: 'ده',       w: { eg: 2 }, en: "da — 'this'" },
  { t: 'دي',       w: { eg: 2 }, en: "di — 'this (f)'" },

  // ——— Sudanese
  { t: 'زول',      w: { sd: 5 }, en: "zōl — 'person/dude'" },
  { t: 'كيفن',     w: { sd: 5 }, en: "kēfin — 'how'" },
  { t: 'سمح',      w: { sd: 3 }, en: "samiḥ — 'nice'" },

  // ——— Levantine (shared)
  { t: 'شو',       w: { sy: 2, lb: 2, jo: 2, ps: 2 }, en: "shū — 'what'" },
  { t: 'بدي',      w: { sy: 3, lb: 3, jo: 3, ps: 3 }, en: "biddi — 'I want'" },
  { t: 'بدك',      w: { sy: 3, lb: 3, jo: 3, ps: 3 }, en: "biddak — 'you want'" },
  { t: 'بدو',      w: { sy: 3, lb: 3, jo: 3, ps: 3 }, en: "biddo — 'he wants'" },
  { t: 'بدها',     w: { sy: 3, lb: 3, jo: 3, ps: 3 }, en: "bidha — 'she wants'" },
  { t: 'بدنا',     w: { sy: 3, lb: 3, jo: 3, ps: 3 }, en: "bidna — 'we want'" },
  { t: 'هيك',      w: { sy: 3, lb: 3, jo: 3, ps: 3 }, en: "hēk — 'like this'" },
  { t: 'هون',      w: { sy: 3, lb: 3, jo: 3, ps: 3 }, en: "hōn — 'here'" },
  { t: 'منيح',     w: { sy: 3, lb: 3, jo: 3, ps: 3 }, en: "mnīḥ — 'good'" },
  { t: 'كتير',     w: { sy: 2, lb: 2, jo: 2, ps: 2 }, en: "ktīr — 'a lot'" },
  { t: 'مبارح',    w: { sy: 3, lb: 3, jo: 3, ps: 3 }, en: "mbāreḥ — 'yesterday'" },
  { t: 'قديش',     w: { sy: 3, lb: 3, jo: 2, ps: 2 }, en: "addēsh — 'how much'" },
  { t: 'عنجد',     w: { jo: 3, ps: 3, sy: 2, lb: 2 }, en: "ʿanjad — 'seriously'" },
  { t: 'ليش',      w: { sy: 2, lb: 2, jo: 2, ps: 2, iq: 2, kw: 1 }, en: "lēsh — 'why'" },
  { t: 'كيفك',     w: { sy: 2, lb: 2, jo: 2, ps: 2, sa: 1 }, en: "kīfak — 'how are you'" },
  { t: 'لسا',      w: { jo: 2, ps: 2, sy: 2, lb: 2 }, en: "lissa — 'still/yet'" },
  { t: 'لسه',      w: { eg: 2, jo: 1, ps: 1, sy: 1, lb: 1 }, en: "lissa — 'still/yet'" },
  { t: 'ولك',      w: { jo: 2, ps: 2, sy: 2, lb: 1 }, en: "walak — 'hey you!'" },
  { t: 'هاد',      w: { jo: 3, ps: 3, sy: 2 }, en: "hād — 'this'" },
  { t: 'هاي',      w: { jo: 2, ps: 2, sy: 2, iq: 1 }, en: "hāy — 'this (f)'" },

  // ——— Syrian / Lebanese
  { t: 'هلق',      w: { sy: 4, lb: 4 }, en: "halla' — 'now'" },
  { t: 'شلون',     w: { iq: 3, sy: 2, kw: 2 }, en: "shlōn — 'how'" },
  { t: 'هيدا',     w: { lb: 5 }, en: "hayda — 'this' (very Beirut)" },
  { t: 'هيدي',     w: { lb: 5 }, en: "haydi — 'this (f)'" },

  // ——— Jordanian / Palestinian
  { t: 'هسا',      w: { jo: 4, ps: 2, iq: 2 }, en: "hassa — 'now'" },
  { t: 'هسه',      w: { iq: 3, jo: 2 }, en: "hassa — 'now'" },
  { t: 'اشي',      w: { jo: 4, ps: 4 }, en: "ishi — 'thing'" },
  { t: 'زلمه',     w: { jo: 4, ps: 3, sy: 2 }, en: "zalameh — 'man/dude'" },
  { t: 'فش',       w: { jo: 3, ps: 3 }, en: "fish — 'there isn't'" },
  { t: 'بحكي',     w: { jo: 3, ps: 3, sy: 1, lb: 1 }, en: "baḥki — 'I talk'" },
  { t: 'احكي',     w: { jo: 2, ps: 2 }, en: "iḥki — 'talk!'" },

  // ——— Iraqi
  { t: 'اكو',      w: { iq: 5 }, en: "aku — 'there is'" },
  { t: 'ماكو',     w: { iq: 5 }, en: "māku — 'there isn't'" },
  { t: 'شكو',      w: { iq: 5 }, en: "shaku — 'what's up'" },
  { t: 'هوايه',    w: { iq: 5 }, en: "hwāya — 'a lot'" },
  { t: 'خوش',      w: { iq: 4, kw: 1 }, en: "khōsh — 'good'" },
  { t: 'يمعود',    w: { iq: 5 }, en: "yamʿawwad — 'dude'" },
  { t: 'فدوه',     w: { iq: 4 }, en: "fadwa — term of endearment" },
  { t: 'وياك',     w: { iq: 2, kw: 2, sa: 1 }, en: "wiyyāk — 'with you'" },
  { t: 'شبيك',     w: { iq: 2, kw: 2 }, en: "shbīk — 'what's wrong'" },
  { t: 'زين',      w: { iq: 2, sa: 2, kw: 2, ae: 2, ye: 1 }, en: "zēn — 'good'" },

  // ——— Saudi / Gulf
  { t: 'وش',       w: { sa: 4 }, en: "wesh — 'what' (Najdi)" },
  { t: 'وشلون',    w: { sa: 3, kw: 1 }, en: "weshlōn — 'how'" },
  { t: 'ابغي',     w: { sa: 4 }, en: "abgha — 'I want'" },
  { t: 'ابغا',     w: { sa: 4 }, en: "abgha — 'I want'" },
  { t: 'ابي',      w: { sa: 3, kw: 3, ae: 2 }, en: "abi — 'I want'" },
  { t: 'الحين',    w: { sa: 3, kw: 3, ae: 3 }, en: "al-ḥīn — 'now'" },
  { t: 'دحين',     w: { sa: 5 }, en: "daḥīn — 'now' (Hijazi)" },
  { t: 'ايش',      w: { sa: 3, ye: 2 }, en: "ēsh — 'what'" },
  { t: 'ودي',      w: { sa: 3 }, en: "widdi — 'I'd like'" },
  { t: 'توه',      w: { sa: 2, kw: 2, ae: 2 }, en: "tawwah — 'just now'" },
  { t: 'توني',     w: { sa: 3, kw: 2, ae: 2 }, en: "tawni — 'I just'" },
  { t: 'سالفه',    w: { sa: 3, kw: 2 }, en: "sālfa — 'story/situation'" },
  { t: 'شخبارك',   w: { kw: 3, ae: 3, sa: 2 }, en: "shakhbārak — 'how are you'" },
  { t: 'شحالك',    w: { ae: 5 }, en: "shaḥālak — 'how are you' (Emirati)" },
  { t: 'وايد',     w: { ae: 4, kw: 3 }, en: "wāyid — 'a lot'" },
  { t: 'جذي',      w: { kw: 4 }, en: "chidhi — 'like this'" },
  { t: 'عساك',     w: { ae: 2, kw: 2, sa: 1 }, en: "ʿasāk — blessing phrase" },
  { t: 'كذا',      w: { sa: 2, eg: 1 }, en: "kidha — 'like this'" },

  // ——— Yemeni
  { t: 'عاد',      w: { ye: 2, sa: 1, kw: 1 }, en: "ʿād — filler 'so/then'" },

  // ——— Maghrebi
  { t: 'واش',      w: { ma: 4, dz: 4 }, en: "wāsh — 'what'" },
  { t: 'دابا',     w: { ma: 5 }, en: "dāba — 'now'" },
  { t: 'بزاف',     w: { ma: 4, dz: 4 }, en: "bzzāf — 'a lot'" },
  { t: 'غادي',     w: { ma: 3 }, en: "ghādi — future 'going to'" },
  { t: 'مزيان',    w: { ma: 4 }, en: "mezyān — 'good'" },
  { t: 'زوين',     w: { ma: 4 }, en: "zwīn — 'nice'" },
  { t: 'زوينه',    w: { ma: 4 }, en: "zwīna — 'nice (f)'" },
  { t: 'كيفاش',    w: { ma: 3, dz: 3, tn: 3 }, en: "kifāsh — 'how'" },
  { t: 'علاش',     w: { ma: 3, dz: 3, tn: 3 }, en: "ʿlāsh — 'why'" },
  { t: 'وقتاش',    w: { ma: 2, dz: 2, tn: 2 }, en: "waqtāsh — 'when'" },
  { t: 'شحال',     w: { ma: 3, dz: 3, tn: 2 }, en: "shḥāl — 'how much'" },
  { t: 'راك',      w: { dz: 2, ma: 2 }, en: "rāk — 'you are'" },
  { t: 'راني',     w: { dz: 2, ma: 2 }, en: "rāni — 'I am'" },
  { t: 'درك',      w: { dz: 4 }, en: "dork — 'now'" },
  { t: 'ضرك',      w: { dz: 4 }, en: "dork — 'now'" },
  { t: 'مليح',     w: { dz: 3, tn: 1 }, en: "mlīḥ — 'good'" },
  { t: 'برك',      w: { dz: 3 }, en: "bark — 'only'" },
  { t: 'خويا',     w: { ma: 2, dz: 2, tn: 2 }, en: "khūya — 'my brother'" },
  { t: 'برشا',     w: { tn: 5 }, en: "barsha — 'a lot'" },
  { t: 'باهي',     w: { tn: 4, ly: 2 }, en: "bāhi — 'good/okay'" },
  { t: 'فمه',      w: { tn: 4 }, en: "famma — 'there is'" },
  { t: 'فما',      w: { tn: 4 }, en: "famma — 'there is'" },
  { t: 'شنوه',     w: { tn: 3 }, en: "shnuwa — 'what'" },
  { t: 'شنيه',     w: { tn: 3 }, en: "shniya — 'what (f)'" },
  { t: 'يزي',      w: { tn: 3, dz: 1 }, en: "yezzi — 'enough'" },
  { t: 'توا',      w: { tn: 2, ly: 3 }, en: "tawwa — 'now'" },
  { t: 'هلبه',     w: { ly: 5 }, en: "halba — 'a lot'" },
  { t: 'شن',       w: { ly: 3 }, en: "shin — 'what'" },
  { t: 'واجد',     w: { ly: 2, ae: 1, kw: 1 }, en: "wājid — 'a lot'" },

  // ——— broad, low-weight
  { t: 'شنو',      w: { iq: 2, sd: 2, kw: 2, ly: 1 }, en: "shinu — 'what'" },
  { t: 'وين',      w: { sy: 2, jo: 2, ps: 2, lb: 2, iq: 2, sa: 2, kw: 2, ae: 2, ly: 1 }, en: "wēn — 'where'" },
  { t: 'وينك',     w: { sy: 2, jo: 2, ps: 2, lb: 2, iq: 2, sa: 2, kw: 2, ae: 2 }, en: "wēnak — 'where are you'" },
  { t: 'مو',       w: { sy: 2, iq: 2, sa: 2, kw: 2 }, en: "mū — 'not'" },
  { t: 'مش',       w: { eg: 2, jo: 2, ps: 2, lb: 2 }, en: "mish — 'not'" },
];

// Fuṣḥa / MSA markers — only wins when dialect signal is weak
const MSA_MARKERS = [
  { t: 'ماذا',   w: 5, en: "mādhā — 'what' (formal)" },
  { t: 'لماذا',  w: 5, en: "limādhā — 'why' (formal)" },
  { t: 'سوف',    w: 4, en: "sawfa — future particle" },
  { t: 'اريد',   w: 4, en: "urīd — 'I want' (formal)" },
  { t: 'الان',   w: 3, en: "al-ān — 'now' (formal)" },
  { t: 'جدا',    w: 3, en: "jiddan — 'very'" },
  { t: 'ولكن',   w: 3, en: "walākin — 'but'" },
  { t: 'ليس',    w: 3, en: "laysa — 'is not'" },
  { t: 'هل',     w: 2, en: "hal — question particle" },
  { t: 'كيف حالك', w: 2, en: "kayfa ḥāluk — textbook greeting" },
  { t: 'الذي',   w: 2, en: "alladhī — 'which'" },
  { t: 'التي',   w: 2, en: "allatī — 'which (f)'" },
  { t: 'شيء',    w: 2, en: "shayʾ — 'thing'" },
];

const SAMPLES = [
  { label: '🇪🇬 Egyptian sample',  text: 'انا النهارده صحيت بدري اوي وكنت عايز اروح الجامعة بس مفيش مواصلات، قلت طب اخد تاكسي، دلوقتي انا لسه واصل' },
  { label: '🇯🇴 Jordanian sample', text: 'ولك هسا بدي اروح عالدوام بس فش بنزين بالسيارة، اشي بجنن، عنجد هاد اليوم مش نافع يا زلمه' },
  { label: '🇸🇾 Syrian sample',    text: 'شلونك؟ هلق طالع من البيت بدي روح عالشغل بس في عجقة كتير، منيح اني طلعت بكير' },
  { label: '🇮🇶 Iraqi sample',     text: 'شكو ماكو؟ اليوم صار عندي شغل هوايه بالجامعة بس خوش يوم، اكو ناس يمعود ما يدرسون' },
  { label: '🇸🇦 Saudi sample',     text: 'وش السالفة؟ ابغى اروح السوق الحين بس السيارة خربانة، توني مصلحها، كذا يعني' },
  { label: '🇲🇦 Moroccan sample',  text: 'واش لاباس؟ دابا غادي نمشي للخدمة، عندي بزاف ديال الشغل، مزيان هاد النهار' },
  { label: '📜 Fuṣḥa sample',      text: 'ماذا تريد ان تفعل الان؟ سوف اذهب الي الجامعة ولكن الطريق مزدحم جدا' },
];

// ————— engine —————

function normalizeAr(text) {
  return text
    .replace(/[ً-ْٰـ]/g, '') // diacritics + tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

function markerRegex(term) {
  // word boundary for Arabic + optional و/ف/يا prefix
  return new RegExp('(?<![\\u0620-\\u064A])(?:و|ف|يا )?' + term + '(?![\\u0620-\\u064A])', 'g');
}

function classify(rawText) {
  const text = ' ' + normalizeAr(rawText) + ' ';
  const scores = {};
  const hits = [];

  for (const m of MARKERS) {
    const matches = text.match(markerRegex(m.t));
    if (matches) {
      const mult = Math.min(matches.length, 2); // cap repeats
      for (const [c, w] of Object.entries(m.w)) {
        scores[c] = (scores[c] || 0) + w * mult;
      }
      hits.push({ t: m.t, en: m.en, count: matches.length, top: Object.entries(m.w).sort((a, b) => b[1] - a[1])[0][0] });
    }
  }

  let msaScore = 0;
  const msaHits = [];
  for (const m of MSA_MARKERS) {
    const matches = text.match(markerRegex(m.t));
    if (matches) {
      msaScore += m.w * Math.min(matches.length, 2);
      msaHits.push({ t: m.t, en: m.en, count: matches.length });
    }
  }

  const ranked = Object.entries(scores)
    .map(([c, s]) => ({ code: c, score: s, ...COUNTRIES[c] }))
    .sort((a, b) => b.score - a.score);

  const dialectTotal = ranked.reduce((s, r) => s + r.score, 0);

  if (msaScore >= 4 && msaScore >= dialectTotal) {
    return { kind: 'msa', msaScore, hits: msaHits };
  }
  if (dialectTotal < 3) {
    return { kind: 'weak', dialectTotal };
  }

  const top = ranked[0];
  const second = ranked[1] || null;
  const closeCall = second && second.score >= top.score * 0.8 && second.region === top.region;

  // region confidence: share of total score held by the top region
  const regionScore = ranked.filter(r => r.region === top.region).reduce((s, r) => s + r.score, 0);
  const conf = Math.min(95, Math.round((regionScore / dialectTotal) * 65 + Math.min(30, hits.length * 5)));

  return { kind: 'dialect', top, second, closeCall, ranked: ranked.slice(0, 4), conf, hits: hits.slice(0, 8) };
}
