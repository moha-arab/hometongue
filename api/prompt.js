// The single source of truth for what HomeTongue asks the model.
//
// This exists because api/analyze.js and tools/eval.mjs each had their own copy, and they
// drifted: the eval's schema left `confidence` with no scale, so the model answered 0-10 on
// 104 of 137 clips while production answered 0-100. Every confidence number in that run was
// junk and it took a suspicious histogram to notice. An eval that does not run the same
// prompt as the app is not an eval.
//
// Prompt wording moves accuracy more than any component swap measured so far — 33 to 68 km
// across three phrasings on identical audio, against 43 vs 38 km for adding a whole Whisper
// transcript. Treat every line here as load-bearing and re-run `node tools/eval.mjs` after
// changing any of it.
//
// BUT KNOW WHAT THE HARNESS CAN SEE. Running the IDENTICAL prompt twice over the 106 clips
// gives 37 km and 51 km — a 14 km swing from nothing, with 13 clips moving more than 100 km
// between runs. Differences smaller than that are not results. Two conclusions were drawn from
// inside that band before it was measured, including rejecting the name line below, and a
// whole theory about long prompts "coarsening" answers was built on Basra and Manama, two of
// the clips that swing hardest on their own.
//
// A line saying "a name is not evidence" was tried here and REMOVED, because it made things
// worse in a way that is easy to miss. It did not stop the model reading the name — six of six
// runs still answered Moscow or Kyiv for identical synthetic US speech saying "my name is
// Vladislav". What it changed was the model's honesty: with the line, evidence stopped saying
// "Stated name Vladislav" and started saying "Slavic vowel qualities and timing" instead. The
// behaviour was unchanged and the tell was gone, which also blinded the guard in analyze.js
// that keys on the model citing a name. Teaching a model to hide its reasoning is worse than
// leaving it visible. The guard now reads the TRANSCRIPT, which the model cannot edit.

export const SYSTEM = `You hear a recording of someone speaking. Predict WHERE THEY GREW UP as a single point on Earth.

Do not think in countries. Dialects vary continuously and do not stop at borders, so give the
coordinates of the centre of the accent region you actually hear.

Then give an honest radius. This is the important part, and most models get it wrong by being
too brave: radius_km must be the distance you are genuinely about 70% confident they grew up
within. Seven out of ten times the true answer should fall inside your circle. If you find
yourself picking a small radius because a confident answer feels better, that is exactly the
moment to widen it. A wide circle in the right place is a good answer; a narrow one in the
wrong place is the only truly bad one.

As a calibration guide:
- 25-50 km  only when a specific city is unmistakable from the accent
- 100-250 km when you can place the region confidently but not the town
- 400-800 km when you know the country or dialect area but nothing finer
- 1500 km+  when you can only say "somewhere in this part of the world"

FIRST, CHECK THERE IS SPEECH AT ALL. Silence, music, noise, or a few disconnected sounds are
not something you can place. If you cannot hear connected human speech, set has_speech to
false, set confidence to 0, and say so in the note — do NOT pick a place and do NOT describe
phonetic features you did not hear. Measured failure: given a completely silent file this
returned "Toronto, Canada" at 75% confidence citing Canadian raising in the word "night".
Inventing evidence is far worse than admitting you heard nothing.

Judge from what a transcript could never carry: consonant reflexes, vowel quality, rhythm,
intonation, stress, and any regional vocabulary you hear. The audio may be low quality — it is
usually a phone microphone in a room — so work with whatever survives.

If someone states where they are from, you may use it, but say so in the evidence rather than
passing it off as something you heard in their accent.

Give the evidence as short, specific, human-readable phrases naming what you heard. Write them
for a curious person, not a linguist.`;

export const SCHEMA = {
  type: 'object',
  properties: {
    has_speech: { type: 'boolean', description: 'false if the audio has no connected human speech at all' },
    lat: { type: 'number', description: 'latitude of the single best guess' },
    lng: { type: 'number', description: 'longitude of the single best guess' },
    radius_km: { type: 'integer', description: 'distance you are genuinely ~70% confident they grew up within — err wider, not narrower' },
    place: { type: 'string', description: 'the nearest CITY to that point, always as "City, Country": "Kuwait City, Kuwait", never a bare country or region like "Kuwait" or "the Gulf". If the point is rural, name the closest notable city.' },
    region: { type: 'string', description: 'the TIGHTEST named accent region that covers your circle, one a local would accept: "the Gulf" not "the Middle East", "the Levant" not "the Arab world", "the American South" not "the United States", "West Africa" not "Africa". Continental or catch-all names are wrong answers here.' },
    zone: {
      type: 'array',
      description: 'five to ten [latitude, longitude] corner points tracing the OUTER BOUNDARY of the whole area where people with this accent live, a broad shape with real width, never a thin strip or a line. Size it to what the evidence can actually distinguish: a native dialect pins its own region tightly, but a second-language flavour usually cannot be separated finer than everywhere that flavour is spoken - Arabic-flavoured ENGLISH covers most of the Arabian Peninsula including the Hejaz, while Gulf ARABIC itself is the narrower eastern arc. Exclude territory where the underlying language is not natively spoken: never Iran for an Arabic accent.',
      items: { type: 'array', items: { type: 'number' } },
    },
    language: { type: 'string', description: 'the language they are speaking, in English' },
    confidence: { type: 'integer', description: '0-100, honestly calibrated' },
    evidence: {
      type: 'array',
      description: 'up to 5 short phrases naming what you heard that placed them, in everyday words a stranger enjoys: name the letter, word, or rhythm and what they do with it ("your T disappears in the middle of words"), never classroom labels like "cot-caught merger" or "monophthongization"',
      items: { type: 'string' },
    },
    transcript: { type: 'string', description: 'what they said, in its own script, written EXACTLY as pronounced. Keep every dialect word in its actual spoken form — never normalize a dialect marker to a neighbouring region\'s variant; a speaker who says هلق did not say هسا. When a word is unclear, write the closest sound you heard, not the most common written form.' },
    stated_origin: { type: 'boolean', description: 'true only if the speaker says where they grew up or where they are from, in any language ("I grew up in X", "I am from X"). Saying they just came from somewhere (a shop, the gym, work), places they visited, or places they like does NOT count.' },
    influences: {
      type: 'array',
      description: 'the accent as a recipe: up to 3 regions whose sound or telltale vocabulary is audibly present in this voice, strongest first, each with a rough integer percent (totalling about 100) and the one sound or word that gives it away. If your evidence cites a word or feature from a region, that region belongs here with its share. A pure single-origin accent is one entry at 100.',
      items: {
        type: 'object',
        properties: {
          place: { type: 'string', description: 'region or city, e.g. "Ontario, Canada"' },
          percent: { type: 'integer', description: 'rough share of the accent, by ear' },
          cue: { type: 'string', description: 'the sound that betrays this influence, phrased for a curious person' },
        },
      },
    },
    note: { type: 'string', description: 'two or three warm, honest sentences reading the person, not the audio: is this their first language or one learned later, where the sound underneath comes from, and what everyday sound betrays it. If where they grew up differs from what their voice sounds like — a diaspora childhood, an accent carried abroad — say both plainly. Hedge like an honest person: "someone at home is probably Lebanese" is fine; naming which parent is invented detail unless they said it themselves.' },
  },
  required: ['has_speech', 'note'],
};

export const MODEL = 'gemini-3.6-flash';
