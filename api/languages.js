// One entry per language Guess Me can handle.
//
// Everything language-specific lives here: the countries we're willing to name, the
// sample of colloquial speech we prime Whisper with, and the marker playbook Claude
// reasons from. api/analyze.js builds the schema and system prompt from whichever
// entry matches the language Whisper detected.
//
// Adding a language means adding an entry here and nothing else.
//
// The playbooks are lexical and morphological on purpose. We measured the acoustic route
// in Aug 2026 and it does not work yet:
//   - A phoneme recogniser (wav2vec2-lv-60-espeak) DOES recover pronunciation that ASR
//     spelling destroys — Cairo's قلتلك really does come back as "ultilak".
//   - But across 45 labelled Arabic clips it moved country accuracy 26/45 -> 27/45: one
//     real fix, one real regression.
//   - On English, where accent matters far more than vocabulary, it was worse than useless.
//     Rhoticity — the single biggest English accent split — came out INVERTED: 5.4 r-marks
//     per 100 phones for rhotic varieties vs 6.4 for non-rhotic ones, with non-rhotic
//     Australia highest of all. The model is trained on American English and renders every
//     accent into it, so Claude defaulted to "us" whenever it saw the stream.
// It is the same failure as Whisper, one layer down: Whisper flattens dialect into standard
// spelling, the phoneme model flattens accent into its own. Real accent identification needs
// a model trained on dialect-labelled audio, which needs the donated-clip dataset.

const SHARED_METHOD = `## Method
1. Scan the transcript for dialect markers: function words, negation, demonstratives, interrogatives, tense/aspect marking, intensifiers, loanwords, and any pronunciation that survives in spelling.
2. Weigh markers by distinctiveness. One unmistakable marker beats several shared ones; several weak markers from one area beat one ambiguous marker.
3. Decide region, then country, then city ONLY if specific evidence exists.

## ASR reality (Groq whisper-large-v3)
- The transcript is machine-made. It normalises dialect toward the standard written form, drops final vowels, and respells markers inconsistently. Treat spelling variants generously.
- ABSENCE of city-level markers is normal in 20 seconds of speech and is NOT evidence against a city — it just means you leave city empty.
- Short garbled transcripts: prefer kind=unclear over guessing.
- Speech-to-text hides pronunciation almost entirely. Standard spelling is used no matter how a word was said, so judge from vocabulary and grammar unless a spelling visibly encodes a sound.

## Calibration rules (strict)
- region: needs >=2 solid markers for confidence >=80.
- country confidence: 90+ only for multi-marker unmistakable cases; 70-89 strong; 50-69 moderate (say what would flip it in the note); <50 = admit it's a lean. Neighbouring varieties are genuinely hard: when markers are shared, split ranked weights accordingly and say so.
- city: give one ONLY when specific evidence exists. Name that evidence in the note. city_confidence is usually 25-55; go higher only for near-certain signals. No evidence = city:"" and city_confidence:0. NEVER pick a city just because it's the capital.
- kind=msa when it's the neutral standard register with no real regional markers: playful note inviting them to talk like they talk with friends. kind=unclear when too little signal.
- evidence must quote strings actually present in the transcript. Never invent.
- The note is user-facing product copy: warm, brief, human, honest about uncertainty — never robotic, never fake-confident.`;

const LANGUAGES = {
  ar: {
    name: 'Arabic',
    native: 'العربية',
    dir: 'rtl',
    countries: ['eg', 'sd', 'sy', 'lb', 'jo', 'ps', 'iq', 'sa', 'kw', 'ae', 'ye', 'ly', 'tn', 'dz', 'ma', 'none'],
    regions: ['egyptian', 'levantine', 'iraqi', 'gulf', 'yemeni', 'sudanese', 'maghrebi', 'msa', 'none'],
    standardLabel: 'MSA (فصحى)',
    // Whisper's prompt is decoding CONTEXT, not an instruction — feed it a SAMPLE of the
    // register we want back. Measured: nearly doubles retained dialect markers vs an
    // instruction-style prompt, which Whisper sometimes echoed back as the transcript.
    asrPrompt: 'شو أخبارك؟ أنا قاعد بالبيت هلق، زهقان شوي وما عم أعمل شي. بدي روح عالسوق بعدين. '
      + 'ايه يا عم، انت فين دلوقتي؟ عايز إيه؟ مش كده أبداً، ده كلام فاضي بقى. '
      + 'وش تبي؟ شلون حالك؟ مو زين هالكلام، أبغى أروح البيت. '
      + 'أكو شغل هواي هسه، ماكو وقت أبد. '
      + 'واش كاين؟ دابا غادي نمشي، بزاف ديال الحوايج خاصني نديرهم.',
    playbook: `EGYPT: دلوقتي النهارده امبارح ازيك ازاي عايز/عاوز اوي كده مفيش ايه فين بقى خالص برضه لسه طب يسطا. Negation مش + ماعرفش pattern. Sub-Egypt: Cairo default; صعيدي (Upper Egypt) if جيت/گال spellings for قلت/قال or يا خال; Alexandria hard to spot in text — leave city empty unless clear.
SUDAN: زول كيفن شنو ياخي سمح قدر كده. Often misread as Egyptian — زول/كيفن decides.
LEVANT NORTH (sy, lb): هلق/هلأ شو كتير منيح هيك هون بدي مبارح لسا.
  - Lebanese: هيدا/هيدي/هول, French/English loans (ميرسي بونجور بليز اوكي), خيي, بعدني. Beirut: هيدا + heavy French mix. Tripoli/North: قاف sometimes kept.
  - Syrian: هاد/هي هالـ شلون (Damascus + Aleppo + east), مو. Damascus: هلق كتير شو خبرك. Aleppo: شلون ايمتى Turkish loans (دوغري), ليكو. Coastal (Latakia/Tartus): قاف kept sometimes, لكان. Deir ez-Zor leans Iraqi (اكو may appear!).
LEVANT SOUTH (jo, ps): هسا/هسه اشي زلمة فش بحكي عنجد ولك قديش هاد.
  - Jordanian: هسا زلمة يا زلمه; Bedouin/Hourani: هاظ گال/جال spellings, يا خوي. Amman West = soft urban (قاف as ء); East Amman/Irbid/Karak = گ for قاف.
  - Palestinian: قديش زي كيفك; rural: تش for ك (كيفتش/عندتش = STRONG rural Palestine); Gaza mixes Egyptian (ازيك احنا بتاع); 48/Israel Palestinians: Hebrew loans (بسيدر رمزور مزغان) = near-certain 48. Jerusalem/Nablus urban: قاف as ء.
IRAQ: اكو ماكو شكو هوايه خوش يمعود فدوه هسه شلون وياك زين چ/تش spellings (شلونچ شلونتش عندچ). دا + present (دا اروح).
  - Baghdad default. Mosul (Maslawi/qeltu): قاف KEPT + no گ + وين قلتُ style. Basra/South: چا يمعود اني. Kurdish-area Arabic: lighter markers.
GULF: زين وايد/واجد ابي/ابغى الحين توه سالفة شنو عاد يالله بعد.
  - Saudi Najd (Riyadh/Qassim): وش ابغى الحين كذا توني وشلون. Hijaz (Jeddah/Mecca/Medina): ايش دحين مره ايوه جاي (دحين + مره = strong Hijaz). Eastern Province leans Gulf/Kuwaiti. Southern (Asir/Jazan) leans Yemeni (عاد ايش قد).
  - Kuwait: شلونك شنو چذي/جذي عندچ وايد صج. UAE: شحالك وايد عساك الريال بغيت. Qatar/Bahrain: شنو شفيك وايد (Bahrain: شبيك). Oman: عاد توني بغيت وين "شو" sometimes — عماني often softer; واجد over وايد.
YEMEN: ايش عاد قد + verb (قد كلمته), معك خير, شتي/تشتي (Sanaani "you want" = STRONG Yemen), با + verb future. Sanaa: تشتي/شتي. Aden: انتو ايش + softer.
MAGHREB (ma, dz, tn, ly): واش بزاف دابا مزيان زوين غادي كيفاش علاش وقتاش شحال راني/راك درك برشا باهي فما يزي توا هلبة شن.
  - Morocco: دابا بزاف واش مزيان غادي ديال (ديال = strong Morocco). Casablanca/Rabat default; north (Tangier) has Spanish loans.
  - Algeria: درك/ضرك مليح برك وقتاش كاين بزاف واش. Algiers default; Oran: Spanish loans (بلاصة common Algeria-wide though).
  - Tunisia: برشا باهي فما شنوة/شنية يزي توا نجم + verb (نجم = can, strong Tunisia).
  - Libya: هلبة شن توا واجد يا خوي.
LIBYA/EGYPT border, SUDAN/EGYPT: use decisive markers only.

## Phonology visible in spelling (weigh heavily when present)
- قاف written as ء/ا (اللي بيألك for يقول): urban Levant/Egypt. As گ or ج (گلت/جلت for قلت): Bedouin, Jordan rural, Iraq, Gulf, Upper Egypt. Kept as ق: Maghreb, Mosul, coastal Syria minorities, Druze.
- ك written as چ/تش (feminine or general): Iraq + Gulf feminine (عندچ), rural Palestinian (كيفتش).
- ج written as ي (رياجيل -> ريايل, رجال -> ريال): Gulf. ج as گ: Egypt usually re-normalized by ASR — don't rely on it.
- ث/ذ preserved (هاذا مثل): Bedouin/Iraq/Gulf/Tunisia. Merged to ت/د/س/ز: urban Levant/Egypt.
- Place self-references ("هون بعمان", "احنا في جدة") are legitimate evidence — use them, but say so in the note.`,
  },

  es: {
    name: 'Spanish',
    native: 'Español',
    dir: 'ltr',
    countries: ['es', 'mx', 'ar', 'uy', 'cl', 'co', 've', 'pe', 'bo', 'ec', 'py', 'cu', 'do', 'pr', 'gt', 'cr', 'none'],
    regions: ['peninsular', 'rioplatense', 'mexican', 'andean', 'caribbean', 'chilean', 'centralamerican', 'neutral', 'none'],
    standardLabel: 'neutral broadcast Spanish',
    asrPrompt: '¿Qué tal, tío? Pues nada, estoy en casa, vaya rollo, luego cojo el coche y me piro. '
      + 'Órale güey, ahorita mero le hablo, no manches, está bien chido. '
      + 'Che boludo, ¿vos qué hacés? Acá en el laburo, un quilombo bárbaro. '
      + '¿Cachai weón? Al tiro po, la wea. '
      + 'Parce, qué chévere, ¿sí o qué? Hágale pues.',
    playbook: `SPAIN (es): vosotros/os, coger (neutral here), vale, tío/tía, hostia, joder, guay, mola, currar, piso, ordenador, móvil, zumo, patata, "es que", "o sea", "venga". Distinción c/z as /θ/ sometimes surfaces as spelling noise. Andalusia: quillo, illo, dropped -s ("ehtoy"), pisha. Madrid default for Spain unless regional words appear. Catalonia: nen, plegar, "hacer un café". Basque: aita/ama, potear. Canary Islands read as Caribbean (guagua, ustedes not vosotros) — do NOT call Canaries "Latin America".
RIOPLATENSE (ar, uy): vos + vos-conjugation (tenés, querés, sos, podés, andá, mirá) = decisive. che, boludo/a, pibe/mina, laburo, quilombo, bondi, morfar, re + adjective (re bueno), acá, "¿viste?", "dale". Buenos Aires default for ar. Uruguay: same core + "ta", "bo", "championes", mate talk heavier. Córdoba: distinctive sing-song rarely visible in text — leave city empty.
MEXICO (mx): güey/wey, órale, ahorita/ahoritita, no manches/no mames, chido, padre (=cool), neta, mande, chamba, lana, carro, computadora, camión (=bus), "ándale", "¿qué onda?", diminutive -ito everywhere. Mexico City: chilango, "no way güey", banqueta. North (Monterrey): "¿qué onda raza?", troca. Yucatán: "lo hice bien bonito", Maya loans.
CARIBBEAN (cu, do, pr, ve): dropped final -s in spelling, ustedes (never vosotros), chévere, pana, vaina, coño, guagua (=bus, PR/CU). Cuba: asere, ¿qué bolá?, jama, pinchar. Dominican: ¿qué lo que?, vaina, tíguere, "un chin". Puerto Rico: mano/brother, janguear, chavos, boricua, heavy English loans. Venezuela: chamo, pana, burda, "vale", arrecho, "qué molleja" (Maracaibo, and Maracaibo uses vos).
COLOMBIA (co): parcero/parce, chévere, bacano, "¿sí o qué?", "hágale", "de una", tinto (=black coffee), usted used with friends (very Colombian), "¿me regala...?". Bogotá: sumercé, ¿cierto?, more formal usted. Medellín/Paisa: parce, pues at end of sentence ("bien pues"), vos. Coast (Barranquilla/Cartagena): reads Caribbean — ¡ajá!, "erda".
CHILE (cl): cachai, po (bueno po, ya po), weón/weá, al tiro, pololo/polola, fome, bacán, "¿ta bien?", heavy -ai/-ís verb endings (querís, estai). Very distinctive — cachai + po alone is near-certain Chile.
ANDEAN (pe, bo, ec): Peru: chibolo, pata, jato, causa, "¿en serio?", chévere less common, pe at sentence end. Bolivia: pues/pe, "ya pues", Quechua loans (wawa), "de vera". Ecuador: "¿cierto?", guagua (=baby here, not bus!), vos in Sierra, "ele". Quechua/Aymara substrate: "no más", "pues" tags, "dice" reportative.
CENTRAL AMERICA (gt, cr): Costa Rica: mae, pura vida, tuanis, usted default. Guatemala: vos, "cabal", chapín. Both use vos widely.
TRAPS: ustedes vs vosotros only separates Spain from everywhere else, not countries within Latin America. "coger" is neutral in Spain and vulgar in much of Latin America — its casual use is a Spain signal. Diminutive -ico (Costa Rica, Colombia, Venezuela, Cuba) is a weak regional hint.`,
  },

  fr: {
    name: 'French',
    native: 'Français',
    dir: 'ltr',
    countries: ['fr', 'ca', 'be', 'ch', 'sn', 'ci', 'cd', 'cm', 'ma', 'dz', 'tn', 'ht', 'none'],
    regions: ['metropolitan', 'quebecois', 'belgian', 'swiss', 'westafrican', 'maghrebi', 'caribbean', 'neutral', 'none'],
    standardLabel: 'neutral standard French',
    asrPrompt: "Ouais bon, du coup je sais pas trop, c'est un truc de fou, franchement. "
      + "Pantoute, là, j'vas magasiner tantôt avec mon chum, c'est ben correct. "
      + "Septante-cinq euros, une fois, avec mon GSM, ça drache dehors. "
      + "On est ensemble hein, je vais à l'essencerie, c'est cadeau.",
    playbook: `FRANCE (fr): du coup, truc, ouais, meuf/mec, bagnole, bosser, kiffer, chelou/relou (verlan), putain, "genre", "carrément", "grave" as intensifier, "c'est chaud". Paris default. Marseille/South: "peuchère", "dégun", "cagole", "tarpin". North (Lille): "ch'ti", "biloute". Alsace: German loans. Verlan (ouf, cimer, relou, teuf) is a strong France-and-young signal.
QUEBEC (ca): the most distinctive variety in text. char (=car), chum/blonde (=boyfriend/girlfriend), magasiner (=to shop), présentement, tantôt, pantoute (=not at all), icitte, ben là, "c'est correct", "tabarnak/câlisse/ostie" (sacres), "j'vas", "tu veux-tu", dépanneur (=corner shop), niaiser, plate (=boring), écoeurant (=amazing, inverted). Montreal default; Quebec City / Saguenay harder — leave city empty unless named. Acadian/New Brunswick: "j'avons", chiac (heavy English mixing).
BELGIUM (be): septante (70), nonante (90), GSM (=mobile), drache (=downpour), "ça va?" as greeting, chicon, "une fois", "s'il vous plaît" meaning "here you go", kot (=student flat), aubette. septante/nonante alone is near-decisive for Belgium or Switzerland.
SWITZERLAND (ch): septante, huitante (80 — Swiss only, decisive vs Belgium), nonante, natel (=mobile), "ça joue", panosse, foehn, "y a pas le feu au lac". huitante separates Switzerland from Belgium cleanly.
WEST/CENTRAL AFRICA (sn, ci, cd, cm): "on est ensemble", "c'est comment?", deuxième bureau (=mistress), essencerie (=petrol station), ambianceur, cadeauter (=to gift), "il faut seulement", "je vais venir" for immediate action, doubled emphasis. Côte d'Ivoire: nouchi slang, "gbagba", "y a pas drap". Senegal: Wolof loans (waaw, dëgg, xale), "inchallah" frequent. DR Congo: Lingala loans (mbote, ndeko), "yaka". Cameroon: "na so", pidgin mixing.
MAGHREB (ma, dz, tn): heavy Arabic code-switching mid-sentence (wallah, hamdoulah, inchallah, bezef, wesh), "ça va hamdoulah". Algeria: wesh, "normal". Morocco: bezaf, daba, "safi", French-Arabic alternation is constant. Tunisia: barcha, "yezzi".
HAITI (ht): Creole mixing (sak pase, mwen, pa gen), distinct enough to spot.
TRAPS: septante/nonante = Belgium OR Switzerland; only huitante decides Switzerland. Quebec is easy from vocabulary; do not confuse Acadian with Quebecois. African French shares "on est ensemble" widely — use country-specific loans to split.`,
  },

  pt: {
    name: 'Portuguese',
    native: 'Português',
    dir: 'ltr',
    countries: ['br', 'pt', 'ao', 'mz', 'cv', 'gw', 'st', 'tl', 'none'],
    regions: ['brazilian', 'european', 'angolan', 'mozambican', 'capeverdean', 'neutral', 'none'],
    standardLabel: 'neutral standard Portuguese',
    asrPrompt: 'E aí cara, beleza? Tô em casa aqui, tá tranquilo, depois eu pego o ônibus. '
      + 'Então pá, está fixe, vou apanhar o autocarro e depois telefono-te, está bem? '
      + 'Bué de cena, meu kota, estamos juntos.',
    playbook: `BRAZIL (br): você/cê, a gente (=we), gerund progressive "estou falando / tô falando" (DECISIVE vs Portugal), legal, cara, bacana, massa, ônibus, trem, celular, "tá", "né?", "pois é", "valeu", "beleza", "meu", proclitic pronouns ("me diz"). São Paulo: mano, "meu", "da hora". Rio: "caraca", "sinistro", chuchu, carioca "s" as /ʃ/ rarely visible. Northeast (Bahia/Recife): oxe, oxente, visse, arretado, "massa demais". South (RS): bah, tchê, guri/guria, "capaz".
PORTUGAL (pt): tu + tu-conjugation, "estou a falar" infinitive progressive (DECISIVE vs Brazil), fixe, giro, autocarro (=bus), comboio (=train), telemóvel (=mobile), pá, "está bem", "pois", casa de banho, sandes, miúdo, gajo/gaja, "ora bem", enclitic pronouns ("diz-me"). Lisbon default. Porto/North: "bué" less, "ó pá", distinct but hard in text. Azores/Madeira: leave city empty unless named.
ANGOLA (ao): bué (=a lot, also Portugal youth), kota (=elder), maka (=trouble), camba (=friend), "estamos juntos", mano, Kimbundu loans, "bazar" (=to leave). Luanda default.
MOZAMBIQUE (mz): machamba (=farm plot), "estamos juntos", chima, Changana/Makhuwa loans, "eish". Maputo default.
CAPE VERDE (cv): Creole mixing (kriolu) — "sabi", "morabeza", "nha".
TRAPS: The single most reliable split is progressive aspect — "estou a fazer" (Portugal, Africa) vs "estou fazendo / tô fazendo" (Brazil). Second most reliable: você (Brazil) vs tu (Portugal). Vocabulary pairs: ônibus/autocarro, trem/comboio, celular/telemóvel, banheiro/casa de banho, geladeira/frigorífico. African varieties follow European grammar with local vocabulary — grammar alone will NOT separate Angola from Portugal, you need the loans.`,
  },

  ru: {
    name: 'Russian',
    native: 'Русский',
    dir: 'ltr',
    countries: ['ru', 'ua', 'by', 'kz', 'kg', 'uz', 'ge', 'am', 'md', 'lv', 'ee', 'il', 'none'],
    regions: ['central', 'northwest', 'southern', 'siberian', 'ukrainian', 'belarusian', 'centralasian', 'caucasus', 'diaspora', 'none'],
    standardLabel: 'neutral standard Russian',
    asrPrompt: 'Ну чё, как дела? Да я дома сижу, скучно капец, потом схожу в магаз. '
      + 'Шо ты говоришь, тю, та ладно тебе. '
      + 'Поребрик, парадная, шаверма, булка — ну ты понял откуда я.',
    playbook: `MOSCOW vs ST PETERSBURG — the classic lexical pairs, weigh heavily when present:
  - бордюр (Moscow) / поребрик (Petersburg)
  - подъезд (Moscow) / парадная (Petersburg)
  - шаурма (Moscow) / шаверма (Petersburg)
  - батон (Moscow) / булка (Petersburg)
  - ластик (Moscow) / резинка (Petersburg)
  - палатка/ларёк (Moscow) / ларёк (Petersburg), греча (Petersburg) / гречка (Moscow)
  Any two of these together justify a city guess with decent confidence.
RUSSIA GENERAL (ru): чё/шо-less "что", капец, блин, короче, типа, норм, ваще, "давай" as goodbye, реально, жесть. Siberia: мультифора (=plastic sleeve, decisive Siberia), вехотка (=washcloth), "ну ты чё". Urals: поребрик absent, "сЮда". Southern Russia (Rostov/Krasnodar): тю, шо, "та ладно", гутарить, тремпель (=clothes hanger, Kharkiv/Rostov area).
UKRAINE (ua): шо instead of что (very strong), "скучать ЗА тобой" (за instead of по), тю, ага, та, "мал не мал", "я тебя не понял" constructions, Ukrainian loans (гарно, треба, дуже), surzhyk mixing. Kyiv/Kharkiv/Odesa all use шо. Odesa: distinctive humour register, "таки", "шо вы говорите".
BELARUS (by): бульба, "як", драники, Belarusian loans, "цi", generally close to Russian standard with light substrate.
CENTRAL ASIA (kz, kg, uz): Kazakh/Kyrgyz/Uzbek loans (апашка, аташка, ағай), "давай" heavy, "жаным", Russian is often very standard with local address terms. Almaty/Tashkent: leave city empty unless named.
CAUCASUS (ge, am, az): "да?" tag questions, distinctive intonation not visible in text, local loans (генацвале, джан — джан is strong Armenian/Azeri). "джан" attached to names is near-decisive Caucasus.
DIASPORA (il, de, us): heavy code-switching with Hebrew/German/English, "сделать аппойнтмент", "взять термин". Israel: Hebrew loans (сахар, беседер, ялла).
TRAPS: шо is Ukraine AND southern Russia — use скучать за or Ukrainian loans to split. Standard Russian with no markers is the norm for educated speakers everywhere; prefer kind=msa over a forced country guess. Moscow/Petersburg pairs are the only reliable city-level signal in the language.`,
  },

  hi: {
    name: 'Hindi–Urdu',
    native: 'हिन्दी · اردو',
    dir: 'ltr',
    countries: ['in', 'pk', 'none'],
    regions: ['hindi', 'urdu', 'bambaiya', 'punjabi', 'hyderabadi', 'dakhini', 'neutral', 'none'],
    standardLabel: 'neutral Hindustani',
    asrPrompt: 'हाँ यार, क्या हाल है? मैं घर पे ही हूँ, कुछ खास नहीं, बाद में निकलूँगा। '
      + 'بھائی صاحب، کیا حال ہے؟ بالکل ٹھیک، ضرور آؤں گا، شکریہ۔ '
      + 'अपुन को क्या मालूम भिडू, काय को टेंशन लेता है।',
    playbook: `THE CORE PROBLEM: Hindi and Urdu are the same spoken language. Grammar will not separate them. The split is REGISTER — which vocabulary a speaker reaches for — plus which script the ASR chose.
INDIA / HINDI SIDE (in): Sanskritic vocabulary — धन्यवाद (dhanyavaad), नमस्ते, प्रयोग, विद्यालय, समाचार, कृपया, उपयोग, महत्वपूर्ण. Also: yaar, achha, bilkul, matlab, "kya scene hai", English code-switching is constant and casual ("basically", "actually", "only" as tag: "I came yesterday only").
PAKISTAN / URDU SIDE (pk): Persian-Arabic vocabulary — شکریہ (shukriya), معلوم (maloom), ضرور (zaroor), خدا حافظ, تشریف, ملاقات, کوشش, انشاءاللہ frequent, "acha ji", "ji bilkul", "theek hai na". Politeness particles ji/janab heavier.
REGIONAL (either country):
  - Bambaiya / Mumbai: apun (=I), bhidu, kaiko, "kya re", "tereko/mereko" instead of tujhe/mujhe, "bole to", "jhakaas". VERY distinctive — apun or bole to is near-decisive Mumbai.
  - Delhi: yaar heavy, "bc/bhai" fillers, "scene", "chal na", Punjabi-influenced.
  - Punjabi-influenced (Indian Punjab or Lahore): "ki haal", oye, "chal oye", "shava", verb endings drifting to Punjabi.
  - Hyderabadi / Dakhini (in, and Karachi Muhajir): nakko (=no), hau (=yes), miyan, "kaiku", "kaisa hai tu". nakko + hau is near-decisive Hyderabad.
  - Lucknow / Awadhi: heavy aap, janab, "tashreef rakhiye", elaborate courtesy.
  - Karachi: Urdu-dominant, Muhajir register, some Dakhini traces. Lahore: Punjabi-influenced Urdu.
  - Bhojpuri/Bihari influence: "hamra", "ka ho", "bhaiya".
SCRIPT SIGNAL: Devanagari output leans India, Nastaliq/Arabic script leans Pakistan — but treat this as WEAK. Whisper picks a script from acoustics and often gets it wrong, and both communities write in Roman online. Never let script alone decide the country; say so in the note if it's your only evidence.
TRAPS: shukriya is used in India too; dhanyavaad is almost never used in Pakistan. Absence of Sanskritic words is weaker evidence than presence of Persianate ones. With only neutral Hindustani, prefer kind=msa and say the two are genuinely indistinguishable there — that is the honest and interesting answer.`,
  },

  zh: {
    name: 'Chinese',
    native: '中文',
    dir: 'ltr',
    countries: ['cn', 'tw', 'hk', 'sg', 'my', 'none'],
    regions: ['mainland', 'taiwan', 'cantonese', 'singapore', 'northern', 'southern', 'neutral', 'none'],
    standardLabel: 'neutral Mandarin',
    asrPrompt: '哎你干嘛呢？我在家待着呢，没事儿，一会儿出去买点东西。 '
      + '對啊，我覺得還蠻不錯的啦，我等一下搭捷運過去喔。 '
      + '你食咗飯未啊？我而家喺屋企，唔得閒。 '
      + '这个可以的啦，不要这样lah，很累leh。',
    playbook: `MAINLAND MANDARIN (cn): 儿化 erhua everywhere (哪儿, 一会儿, 有点儿, 玩儿) = strong northern mainland, 咱们, 挺...的, 特别, 没事儿, 干嘛, 牛逼, 靠谱, 视频, 出租车, 土豆, 自行车, 信息, 软件, 网络. Beijing: heaviest erhua, 倍儿, 得嘞, 甭. Northeast (Dongbei): 咋地, 贼 as intensifier (贼好), 整, 嘎哈. South (Shanghai/Guangzhou Mandarin): little erhua, 蛮 as intensifier, 帮 for 给.
TAIWAN MANDARIN (tw): 有沒有 tag, 啦/喔/耶/齁 particles (heavy), 蠻 (vs mainland 挺), 好像, 其實, 超 as intensifier, 捷運 (=MRT, vs 地铁), 計程車 (vs 出租车), 影片 (vs 视频), 品質 (vs 质量), 網路 (vs 网络), 軟體 (vs 软件), 資訊 (vs 信息), 馬鈴薯 (vs 土豆), 腳踏車 (vs 自行车), 早安. Almost no erhua. Traditional characters in output lean Taiwan/HK but ASR may normalise — treat script as weak. The vocabulary pairs above are the reliable signal.
CANTONESE (hk): 係, 唔, 咩, 嘅, 喺, 佢, 咗, 而家, 點解, 冇, 乜嘢, 食飯, 唔該, 好耐. Any of 係/唔/嘅/佢 is decisive for Cantonese rather than Mandarin. Hong Kong: heavy English mixing (ok啦, 姐姐), 巴士, 的士. Guangzhou Cantonese: fewer English loans.
SINGAPORE / MALAYSIA (sg, my): Singlish particles lah, lor, leh, meh, hor, sia; kena, alamak, shiok, can can, "like that one", Hokkien/Malay loans. Mandarin there: 巴刹, 组屋. Singapore vs Malaysia is hard — leave country split unless local terms (组屋 = Singapore HDB) appear.
TRAPS: The zh/yue split matters more than the country split — decide Mandarin vs Cantonese FIRST from the particles above, then place it. Traditional vs simplified characters in the transcript is a weak signal because ASR normalises; rely on vocabulary pairs instead. Neutral news-register Mandarin with no particles and no erhua is genuinely unplaceable — prefer kind=msa.`,
  },

  en: {
    name: 'English',
    native: 'English',
    dir: 'ltr',
    countries: ['us', 'gb', 'ie', 'au', 'nz', 'ca', 'za', 'in', 'pk', 'ng', 'gh', 'ke', 'na', 'jm', 'tt', 'sg', 'none'],
    // Scotland, Wales and England share the 'gb' code, so the region carries the split —
    // it's the biggest accent boundary in the language and the game should name it.
    regions: ['american', 'canadian', 'english', 'scottish', 'welsh', 'irish', 'australasian', 'southafrican', 'southasian', 'westafrican', 'eastafrican', 'caribbean', 'seasian', 'neutral', 'none'],
    standardLabel: 'neutral broadcast English',
    asrPrompt: "Yeah nah mate, I reckon it's heaps good, gonna head to the servo this arvo. "
      + "Right, so I was proper knackered, queued for ages, cost me twenty quid innit. "
      + "Y'all gotten this figured out yet? I could care less, gonna grab a soda real quick. "
      + "Wah gwaan, mi deh yah, everyting irie still.",
    playbook: `UNITED STATES (us): gotten, sidewalk, elevator, apartment, gas, fall (=autumn), "I could care less", "real quick", awesome, "you guys". South: y'all, fixin' to, "bless your heart", coke as generic soda. New York: "on line" (=in a queue), deadass, mad as intensifier. Boston: wicked (=very), "the Pike". Midwest: "ope", pop (=soda), "you betcha". California: hella (NorCal), "the 405" (SoCal, "the" + freeway number).
UNITED KINGDOM (gb): mate, innit, proper (=very), reckon, cheers, queue, quid, knackered, bloke, rubbish, fortnight, "can't be arsed", "having a laugh", trainers, boot/bonnet, "you alright?" as greeting. London: bruv, peng, "safe", Multicultural London English. North (Manchester/Leeds): "our kid", mint, nowt/owt, "dead good". Liverpool: "la", boss (=great). Newcastle: canny, howay, "why aye". Birmingham: bab, "bostin". Scotland: wee, aye, ken, bairn, "how no?", messages (=groceries), dinnae/cannae. Wales: "tidy", "cwtch", "there's lovely".
IRELAND (ie): grand, craic, yer man/yer one, feck, "after doing" perfect ("I'm after eating"), "sure look", deadly (=great), press (=cupboard), "what's the story?", eejit. Dublin default.
AUSTRALIA (au): mate, arvo, heaps, reckon, servo, brekkie, "no worries", "yeah nah / nah yeah", bogan, thongs (=flip flops), maccas, "she'll be right", ute, doona, "how ya going?".
NEW ZEALAND (nz): sweet as, chur, jandals (=flip flops, decisive vs AU thongs), "yeah nah" too, togs, dairy (=corner shop), bro, "choice", Māori loans (kia ora, whānau).
CANADA (ca): eh, toque, washroom, double-double, loonie/toonie, "out and about" spelling artefacts, chesterfield (older), "for sure". Toronto: "the 6ix", mans, ting (MTE). Newfoundland: b'y, "whadda ya at".
SOUTH AFRICA (za): lekker, bru/boet, howzit, "just now" (=later, NOT now), "now now", robot (=traffic light), braai, shame (as sympathy or endearment), eish, ja, bakkie, takkies. lekker + robot + just now is near-decisive.
INDIA (in): "do the needful", prepone, "kindly revert", "itself" and "only" as emphatic tags ("today only", "here itself"), "out of station", "passing out" (=graduating), "what is your good name?", cousin brother/sister, lakh/crore, "same same". Very distinctive in text.
NIGERIA (ng): abeg, sha, wahala, "na so", dey, "how far?", oga, chop (=eat), "I no fit", "gist", biko (Igbo), "kai" (Hausa). Pidgin markers are decisive.
JAMAICA (jm): patois — wah gwaan, mi deh yah, irie, bombo/bomboclaat, "mi nah", yute, bredrin, "big up", ting, "seen". Highly distinctive.
SINGAPORE (sg): lah, lor, leh, can can, "so how?", kena, shiok, "don't play play", "where got".
TRAPS: mate and reckon are shared by UK, Australia and NZ — use arvo/servo (AU), jandals/chur (NZ) or quid/innit (GB) to split. "yeah nah" is Australian AND New Zealand. American vs Canadian is genuinely hard without eh/toque/washroom — split the ranked weights rather than forcing it.`,
  },
};

// Groq's verbose_json reports the language as a full English name ("arabic"), while
// the transcription endpoint's `language` parameter wants ISO-639-1 ("ar"). Accept
// either, and fold the variants we can serve onto their entry — Urdu shares the Hindi
// entry because they are the same spoken language.
const ALIASES = { ur: 'hi', yue: 'zh', 'zh-tw': 'zh', 'zh-cn': 'zh' };
const NAMES = {
  arabic: 'ar', spanish: 'es', castilian: 'es', french: 'fr', portuguese: 'pt',
  russian: 'ru', hindi: 'hi', urdu: 'hi', chinese: 'zh', mandarin: 'zh',
  cantonese: 'zh', english: 'en',
};

// The ISO code to hand back to Whisper for the primed second pass.
const ISO = {
  arabic: 'ar', spanish: 'es', castilian: 'es', french: 'fr', portuguese: 'pt',
  russian: 'ru', hindi: 'hi', urdu: 'ur', chinese: 'zh', mandarin: 'zh',
  cantonese: 'zh', english: 'en',
};

function resolveLanguage(code) {
  if (!code) return null;
  const key = String(code).toLowerCase().trim();
  return LANGUAGES[NAMES[key] || ALIASES[key] || key] || null;
}

// Whatever Whisper called it, give back a code its `language` parameter accepts.
function isoCode(detected) {
  const key = String(detected || '').toLowerCase().trim();
  return ISO[key] || key;
}

export { LANGUAGES, ALIASES, SHARED_METHOD, resolveLanguage, isoCode };
