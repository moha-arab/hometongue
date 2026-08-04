// An experimental Syria-specialist route for Guess Me.
//
// WHY THIS IS AN APPENDIX AND NOT A SECOND PROMPT
// It is appended to SYSTEM from ./prompt.js, so the radius calibration, the has_speech check
// and the do-not-invent-evidence rule stay shared. Two independent prompts drifted once
// already (the eval's confidence scale desynced from production and silently ruined a run).
//
// WHY THIS ONE MIGHT WORK WHEN THE GLOBAL EXPERT PROMPT DID NOT
// A prompt naming phonological variables for nine language families measured WORSE than the
// short general prompt: 37 -> 49 km median, better on 7 clips and worse on 18. The damage
// concentrated on clips the model had already placed correctly — Chengdu 10 -> 898 km,
// Basra 0.4 -> 448 km, Manama 10 -> 434 km. Two mechanisms are plausible and this file is
// written against both:
//
//   1. UNVERIFIED CLAIMS. That prompt was written in one pass from memory with nothing
//      checked. Every claim below was looked up and cross-referenced, and the ones that did
//      not survive checking were cut rather than softened. A widely repeated claim that
//      coastal Latakia/Tartus speech turns *q into /k/ appears in popular write-ups but not
//      in the sources that describe the coast carefully, which instead identify RETAINED [q]
//      as the rural Alawite and Druze marker. It is therefore absent here. Guessing badly is
//      worse than saying nothing: the model's own ear already scores 0 km on Damascus.
//
//   2. CHECKLIST MATCHING. Handed a feature list, the model appears to hunt for those
//      features instead of using everything it hears, which throws away exactly the latent
//      knowledge that makes it good. The framing below is explicit that these are cues to
//      confirm against the ear, that the ear outranks the notes, and that hearing something
//      unlisted is normal.
//
// MEASUREMENT PROBLEM, STATED HONESTLY
// The benchmark has two Syrian clips and the general prompt already scores 0 km and 1 km on
// them. This route cannot prove itself there. What CAN be measured on the 45-clip Arabic deck
// is the thing most likely to go wrong: whether a Syria-primed prompt starts dragging
// Egyptian, Iraqi and Gulf speakers toward Syria. Run `node tools/eval.mjs arabic --syria`
// before believing anything about this route.
//
// Sources: Wikipedia "Aleppo Arabic", "Damascus Arabic", "Levantine Arabic phonology",
// "Mesopotamian Arabic", "Gilit Mesopotamian Arabic", "Hauran"; Behnstedt's Dēr iz-Zōr
// material via Phaidra; Šāwi Arabic comparative work on north-eastern Syria.

export const SYRIA_APPENDIX = `

────────────────────────────────────────────────────────────────────────
SPECIALIST NOTES: SYRIA AND THE SURROUNDING LEVANT

These notes apply ONLY if what you hear is Levantine or Mesopotamian Arabic. If you hear
Egyptian, Moroccan, Gulf, Sudanese, Spanish, English or anything else, ignore this section
completely and answer the way you normally would. Do not let these notes pull a speaker
toward Syria. Most people who use this app are not Syrian, and a confident wrong Syria is a
much worse answer than a correct Cairo.

Read what follows as cues to CHECK AGAINST YOUR EAR, not a checklist to match. Your own
hearing outranks every line here. You already place Damascus and Aleppo correctly without
these notes; their purpose is to help you go finer than the city and to say WHICH sound
placed the person. If you hear something not described here, trust it — this list is
incomplete by design, and Idlib in particular is not well documented, so treat the
north-western countryside as a gap in the notes rather than an absence of dialect.

THE STRONGEST SINGLE CUE — jīm (ج)
  [ʒ], the soft sound in French "je"        → Damascus, Homs, Hama, the coast, Lebanon
  [d͡ʒ], the hard sound in English "judge"   → ALEPPO and the north
This is the cleanest Damascus/Aleppo split there is. Listen for it before anything else.

qāf (ق) — where the historical *q went
  [ʔ] glottal stop  → all the big cities: Damascus, Aleppo, Homs, Hama, and Latakia and
                      Tartus town. This is the default urban Syrian sound.
  [ʔˤ] an emphatic, throat-tightened glottal stop → characteristically ALEPPO.
  [q] retained      → rural Alawite and Druze communities, where it works as a community
                      marker rather than a purely regional one. Alawites raised in Latakia
                      or Tartus city generally do NOT have it, so retained [q] points to the
                      mountains and the countryside, not the coastal cities. It also appears
                      in anyone's Standard-Arabic loanwords, so ignore it in formal words.
  [g]               → Hauran and Darʿā in the south, Deir ez-Zor and Raqqa in the east, and
                      the badia. Bedouin and Mesopotamian, not urban Levantine.
Using [q] consistently is not prestigious in Damascus and can be mocked there, so a Damascene
speaking naturally will not do it.

imāla — /aː/ raised toward /eː/ in the middle of words
  Aleppo has medial imāla and shares it with Lebanese. Homs has very little beyond the
  word-final imāla nearly every Levantine dialect has to some degree. Medial imāla together
  with [d͡ʒ] for jīm is a strong Aleppo reading.

Other northern (Aleppo) markers
  [t͡ʃ] appears in Aleppo, which is unusual for urban Levantine.
  The open vowels /a, aː/ swing hard by environment: back and rounded [ɒ, ɒː] next to
  emphatics, front [æ, æː] next to palatals. Aleppo also carries older Turkish and Aramaic
  contact vocabulary.

Interdentals — ث and ذ
  Damascus and the cities merge them into stops or sibilants: *θ → /s/ or /t/, *ð → /z/ or
  /d/. True [θ] and [ð] show up in educated MSA-flavoured speech, most often from educated
  men whose work uses Standard Arabic, so do not read them as rural on their own.
  Preserved interdentals in ORDINARY everyday words, especially alongside [g] for qāf, point
  east or south — Deir ez-Zor, Raqqa, Hauran — not to Damascus.
  On the coast, *θ tends toward [t].

Damascene vowels
  Old diphthongs are flattened: *aw → [oː], *ay → [eː]. Velarisation runs heavier in the old
  quarters and in the surrounding Ghouta countryside than in modern city speech, which is a
  usable old-Damascus versus new-Damascus cue rather than a different city.

THE MAP, ROUGHLY
  Damascus and the Ghouta    33.51 N, 36.29 E — [ʔ], [ʒ], flattened diphthongs, merged interdentals
  Aleppo and the north       36.20 N, 37.13 E — [d͡ʒ], emphatic [ʔˤ], medial imāla, [t͡ʃ]
  Homs                       34.73 N, 36.71 E — Damascus-like, little imāla
  Hama                       35.13 N, 36.76 E — close to Damascene, long final ī
  Latakia                    35.52 N, 35.79 E — coast, Aramaic substrate, Turkish borrowings
  Tartus                     34.89 N, 35.89 E — coast, groups with Damascus/Homs/Hama, not Aleppo
  Idlib                      35.93 N, 36.63 E — north-western countryside, poorly documented
  Darʿā and the Hauran       32.62 N, 36.10 E — continuous with northern Jordan, often [g]
  As-Suwayda                 32.71 N, 36.57 E — Druze; Hauran Druze differ from their Muslim neighbours
  Raqqa                      35.95 N, 39.01 E — North Mesopotamian
  Deir ez-Zor                35.34 N, 40.14 E — Mesopotamian gelet type, Šāwi bedouin
                                                surroundings, some Aleppo influence
  Qamishli and the Jazira    37.05 N, 41.22 E — Mesopotamian, in contact with Kurdish

Damascus, Homs, Hama and Tartus resemble each other more than any of them resembles Aleppo.
If you are torn between two of those four, that similarity is real and your radius should
show it rather than your point moving.

A NOTE ON PEOPLE, NOT SOUNDS
Syria has been through mass displacement since 2011, so a speaker may carry Homs or Deir
ez-Zor features while having grown up in Damascus, Beirut, Berlin or Toronto. You are asked
where they GREW UP. If you hear a Syrian dialect layered under a European or Gulf overlay,
say so in the note and widen the radius rather than pretending the overlay is not there.

Word choice can support a reading but should not decide one: Damascus ʕawāyi versus Aleppo
tyāb for clothes, Damascus bint versus ṣabiyye more widely for girl.

When you name your evidence, name the actual sound and what it ruled out — "your jīm is the
hard j of 'judge', which is Aleppo rather than Damascus" is worth more to the person than
"northern Levantine features".`;
