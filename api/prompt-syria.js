// A Syria-specialist route for Guess Me, opt-in at hometongue.me/?expert=syria.
//
// SOURCES. Everything below was read before it was written down. Primary: Stephan Procházka,
// "Arabic in Iraq, Syria, and southern Turkey" (in Lucas & Manfredi eds., Arabic and
// Contact-Induced Change, Language Science Press 2020, DOI 10.5281/zenodo.3744507), which
// supplied the vowel-elision belt, the diphthong split, the ā-split, the n-plural pronouns,
// the Turkish -ci suffix, the Aleppo affricates and the Soukhne chain shift. Behnstedt's
// Sprachatlas von Syrien (508 locations, 1214 questionnaires, 12 main dialect groups and 60+
// subtypes) is the atlas everything geographic rests on. Also Sabuni 1980 on Aleppo,
// Barthélemy 1935, Jastrow 1978 on Deir ez-Zor, Behnstedt 1994b on Soukhne, Gralla 2006 on
// Nabk, Talay 1999 on Khawetna, Cowell 1964, Klimiuk on Damascus phonetics, and Wikipedia's
// Aleppo Arabic / Damascus Arabic / Levantine phonology / Gilit Mesopotamian pages.
//
// A claim that failed checking was cut, not softened. The widely repeated line that the
// Latakia/Tartus coast turns *q into /k/ does not survive: careful sources put RETAINED [q]
// in the rural Alawite and Druze communities and note that Alawites raised in the coastal
// cities do not have it. There IS a *q > k in Syria, but it is the Soukhne oasis, reached by
// a chain shift, and it is recorded below where it belongs.
//
// WHY "PLACE FIRST, THEN SHARPEN" IS THE LOAD-BEARING INSTRUCTION
// Two measured runs say a long specialist preamble hurts by its PRESENCE, not its content.
// A nine-language expert prompt broke Basra 0 -> 448 km and Manama 10 -> 434 km. A Syria-only
// appendix containing zero claims about Iraq or Bahrain broke the same two clips by the same
// amounts. Every regression was the model retreating to a bigger, more canonical city: Basra
// to Baghdad, Tangier to Casablanca, Oran to "Northern Algeria" with no city at all. The
// notes were dominating attention and coarsening the answer. So the ordering instruction
// below is not politeness — it is the countermeasure, and it is what run 5 tests.
//
// HOW TO MEASURE IT
//   node tools/eval.mjs arabic --syria
// Two things matter. On the 45-clip Arabic deck, does it still coarsen non-Syrian answers
// (28 km general, 43 km under the previous version)? And separately, it CANNOT prove itself
// on Syria: the benchmark holds two Syrian clips and the general prompt already scores
// 0.45 km and 1.3 km. Only a speaker of the dialect can judge the Syrian side.

export const SYRIA_APPENDIX = `

────────────────────────────────────────────────────────────────────────
SPECIALIST NOTES — SYRIA AND THE SURROUNDING LEVANT

HOW TO USE THIS SECTION. Place the speaker FIRST, the ordinary way, using everything you
hear. Only then read these notes, and only to SHARPEN that answer — to move from "Syria" to
"Aleppo", or from "Aleppo" to "Aleppo rather than the Euphrates countryside". Never let these
notes replace a judgement you had already formed. If your ear says Basra, answer Basra; do
not retreat to Baghdad because this section did not mention Basra. Falling back on a bigger,
safer city is the specific failure this ordering exists to prevent.

If the speech is not Levantine or Mesopotamian Arabic, stop reading here and answer normally.
Most people using this app are not Syrian. A confident wrong Damascus is far worse than a
correct Cairo.

These notes are incomplete on purpose. Behnstedt's atlas of Syria maps twelve main dialect
groups and more than sixty subtypes across 508 locations; what follows is the most audible
slice of that. Idlib and the inner Jazira are genuine gaps. Hearing something not described
here is expected, not a problem — trust it.

═══ 1. THE FASTEST CUT: jīm (ج) ═══
  [ʒ], the soft j of French "je"       → Damascus, Homs, Hama, the coast, Lebanon
  [d͡ʒ], the hard j of English "judge"  → ALEPPO and the north
The single cleanest Damascus/Aleppo split. Check it before anything else.

═══ 2. qāf (ق) — where historical *q went ═══
  [ʔ] glottal stop → the big sedentary cities: Damascus, Aleppo, Homs, Hama, and Latakia
      and Tartus TOWN. The default urban Syrian sound.
  [ʔˤ] an emphatic, throat-tightened glottal stop → characteristically ALEPPO.
  [q] retained → rural Alawite and Druze communities, functioning as a community badge more
      than a purely regional one. Alawites raised in Latakia or Tartus city generally do NOT
      have it, so retained [q] points to the Jabal al-Ansariya mountains, the Hauran Druze
      and Suwayda, not to the coastal cities. Ignore it inside Standard-Arabic loanwords,
      where anyone may produce it.
  [g] → Hauran and Darʿā in the south, the Euphrates (Deir ez-Zor, Raqqa), the Jazira and
      the Šāwi bedouin. Note the trap: a "foreign" [g] also exists in ordinary northern
      Syrian words borrowed through Turkish, and is phonemic only in the north. Bedouin [g]
      < *q is systematic across the whole lexicon; borrowed [g] sits in single words.
  [k] → the Soukhne oasis and nowhere else in Syria. It arrived by a chain: *k shifted to
      [t͡ʃ], *ǧ shifted onward to [t͡s], and *q filled the empty [k] slot. So kirbi
      "water-skin" (*qirba), t͡ʃalb "dog" (*kalb), t͡subn "cheese" (*ǧubn). Hearing [t͡s] for
      jīm is close to a fingerprint for Soukhne.
Consistent [q] in everyday words is NOT prestigious in Damascus and gets mocked there, so a
relaxed Damascene will not produce it.

═══ 3. THE NORTHERN AFFRICATES /t͡ʃ/, /g/, /p/ ═══
Alien to Arabic, present across northern Syria, Cilicia, Hatay and Iraq, and in Syria owed to
Turkish. Aleppo has them in everyday words: t͡ʃanṭa "handbag" (çanta), t͡ʃwāl "sack" (çuval),
t͡ʃāy "tea" (çay), gaǧaleg "nightgown" (gecelik). Central Syrian and Lebanese speakers say the
same words with [ʃ] — so Aleppo t͡ʃāy against Damascus šāy for "tea" is a small, very audible
test. Aleppo also spread a [g] through a whole root by assimilation: yikdeb → yigdeb "he
lies", carried on into gadab, gidbe, gaddāb.
On the Euphrates the affricates come from bedouin contact instead: Deir ez-Zor gāʕ "soil"
(*qāʕ), t͡ʃam "how much" (*kam); Khawetna gaṣṣa "forehead" beside qeṣṣa "story", showing the
doublets that contact leaves behind. Mesopotamian and bedouin speech also splits the 2sg
possessive by gender, abū-k "your father" to a man against abū-t͡ʃ to a woman — a southern and
eastern feature, never urban Damascene.

═══ 4. VOWELS AND SYLLABLES — the most reliable regional signal after qāf ═══
THE ELISION BELT. Along the Mediterranean from Cilicia down to Beirut, EVERY unstressed short
vowel in an open syllable drops, /a/ included, not only /i/ and /u/ as elsewhere: *raṣāṣ →
rṣāṣ "lead", *miknasa → mikinsi "broom". This gives coastal and western Syrian speech its
dense, consonant-heavy rhythm. Cantineau called these parlers non différentiels. If a
speaker's syllables feel crowded and clipped in this way, you are on the western side of the
country.

DIPHTHONGS BY SYLLABLE TYPE. In the same belt, *ay and *aw survive in open syllables but
collapse to [eː] and [oː] in closed ones: bēt "house" but baytēn "two houses", yōm "day" but
yawmēn "two days". This alternation within one speaker's speech is diagnostic. On the island
of Arwad both collapse to [eː] instead.

THE ā-SPLIT. Historical /aː/ splits into a back [aː] and a fronted [æː~eː] around Tartus, in
northern Lebanon, in the QALAMOUN mountains and in the Christian town of Maʕarde on the
Orontes — the belt where the shift from Aramaic to Arabic happened latest. In the Qalamoun,
at Nabk, the split is UNCONDITIONED, not predictable from the neighbouring consonants:
ṭēbex "cooking" against ṭāleb "student", ḥāmel "pregnant" against ḥēmeḍ "sour". An
unpredictable two-way ā in a speaker from between Damascus and Homs points to the Qalamoun
towns — Nabk, Sadad, Maaloula — an old Christian and formerly Aramaic-speaking pocket.

IMĀLA. Aleppo raises medial /aː/ toward [eː], sharing this with Lebanese. Homs has very
little beyond the word-final imāla nearly all Levantine has. Medial imāla plus [d͡ʒ] for jīm
is a strong Aleppo reading.

ALEPPO'S OPEN VOWELS swing hard by environment: back and rounded [ɒ, ɒː] beside emphatics,
front [æ, æː] beside palatals.

INTERDENTALS. Sedentary Syrian and Lebanese merge them to stops: *θ → [t], *ð → [d], *ðˤ →
[dˤ]; on the coast *θ leans to [t]. True [θ] and [ð] in EVERYDAY words, especially alongside
[g] for qāf, mean bedouin, Euphrates or Hauran. In careful or educated speech they are just
Standard Arabic showing through, so do not read them as rural on their own.

═══ 5. GRAMMAR YOU CAN HEAR IN A SHORT CLIP ═══
PLURAL PRONOUNS AND SUFFIXES — the best Syria-versus-south test there is. Syrian and Lebanese
carry /n/ where the south carries /m/: Damascus ntu and -kon, hənne(n) and -hon, against
Jerusalem intu and -kom, humme and -hom. So bēt-kon and ʕalē-hon are northern; bēt-kom and
ʕalē-hom are Palestinian or Jordanian. Within Syria, ALAWITE speech commonly has -kin and
-hin instead of -kon and -hon.

FIRST PERSON PLURAL VERB. Syrian prefixes m-: mnrūḥ "we go". Palestinian uses b- throughout:
bnrūḥ. One word settles it.

FUTURE. raḥ, plus the reduced ḥa-, laḥ-, la- and raḥa-. Syrian and Lebanese drop the alif of
the 1sg after it — raḥ rūḥ — where Jordanian and Palestinian keep it, raḥ arūḥ.

NEGATION. Northern Levantine, Syrian and Lebanese, negates with bare mā. The suffixed -š of
mā…-š is Southern Levantine, Palestinian and Jordanian, and reaches into the Hauran; parts of
Lebanon have it too, though middle-class Beirut does not. Hearing mā baʕrafš rather than mā
baʕref pulls the answer south.

TURKISH -ci, fully productive for occupations and for mildly mocking habits, follows the local
*ǧ: Damascus gives -ži or -zi, as in kahrabaži "electrician", nəswānži "womanizer",
maškalži "troublemaker", while the north and Iraq keep -ci.

VOCATIVE -o, western and Syrian, against -u in Iraq: ʕammo "uncle", ḫālo, and in Syria
extended to the feminine, ʕammto and ḫālto. Iraqi uses -a there instead.

═══ 6. LEXICON — supporting evidence only, never decisive ═══
Core Levantine: hallaʔ "now", šū "what", ktīr "very", taʕa "come", and the progressive ʕam +
verb. Damascus ʕawāyi against Aleppo tyāb for "clothes". Damascus bint against ṣabiyye more
widely for "girl".

═══ 7. THE MAP ═══
  Damascus and the Ghouta   33.51 N  36.29 E  [ʔ], [ʒ], -kon/-hon, mnrūḥ, -ži
  Aleppo                    36.20 N  37.13 E  [d͡ʒ], emphatic [ʔˤ], medial imāla, [t͡ʃ], Turkish layer
  Homs                      34.73 N  36.71 E  Damascus-like, little imāla
  Hama                      35.13 N  36.76 E  close to Damascene, long final ī
  Latakia                   35.52 N  35.79 E  coast, elision belt, Aramaic substrate
  Tartus                    34.89 N  35.89 E  coast, ā-split, groups with Damascus not Aleppo
  Jabal al-Ansariya         35.40 N  36.10 E  rural Alawite, retained [q], -kin/-hin
  Qalamoun: Nabk, Sadad     34.02 N  36.73 E  unconditioned ā-split, old Christian, ex-Aramaic
  Idlib                     35.93 N  36.63 E  north-western countryside, poorly documented
  Darʿā and the Hauran      32.62 N  36.10 E  [g], continuous with northern Jordan, some -š
  As-Suwayda                32.71 N  36.57 E  Druze, retained [q]
  Palmyra and Soukhne       34.55 N  38.28 E  the [k] < *q oasis, [t͡s] for jīm
  Raqqa                     35.95 N  39.01 E  North Mesopotamian, [g]
  Deir ez-Zor               35.34 N  40.14 E  Mesopotamian gelet, Šāwi bedouin, some Aleppo colour
  Qamishli and the Jazira   37.05 N  41.22 E  Mesopotamian, Kurdish contact
Damascus, Homs, Hama and Tartus resemble one another more than any of them resembles Aleppo.
Torn between those four is a real result: widen the radius rather than moving the point.

═══ 8. PEOPLE MOVE, AND THE QUESTION IS WHERE THEY GREW UP ═══
Damascene is the prestige variety, carried everywhere by decades of Syrian television drama,
and it is what learners are taught. People who move to Damascus level toward it — documented
especially among women — so Damascene features can mean "raised in Damascus" OR "raised
elsewhere and assimilated". Where the accent is Damascene but something underneath is not,
widen the radius and say so.
Since 2011 millions have left, with large communities in Turkey, Lebanon, Jordan, the Gulf,
Germany and Canada. A speaker may carry Homs or Deir ez-Zor features under a European or
Gulf overlay, or be second-generation with a heritage accent. Name the overlay in the note
instead of pretending it is not there.

═══ 9. SAYING IT WELL ═══
Name the sound and what it ruled out. "Your jīm is the hard j of 'judge', not the soft j of
Damascus — that is Aleppo" beats "northern Levantine features". If one specific thing decided
it, lead with that one thing.`;
