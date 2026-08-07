# HomeTongue — سمعناك

Your voice is a place. Live at **[hometongue.me](https://www.hometongue.me/)**.

- **🎙 Read My Accent** — talk in any language for ~30s and it places where you grew up as a point on the map, with a radius it is honestly confident about.
- **📍 Guess the Voice** ([game.html](game.html)) — GeoGuessr for ears: hear a real clip, drop a pin. **Nine decks, 161 clips**: Arabic Dialects (45 places), English Accents, World Languages, Spanish, Chinese, Portuguese, French, Russian, Hindi–Urdu. Distance scoring, 5 rounds, nickname leaderboard.

A third mode (**The Atlas**, a browsable accent map) is planned — see [PRD.md](PRD.md).

Works on **every device** — desktop, Android, iPhone — because recording uses MediaRecorder and analysis happens server-side.

## How Read My Accent works

1. The browser records ~15–45s of free speech (no reading passage — word choice *is* the signal).
2. `/api/analyze` transcribes it with **Whisper large-v3** (Groq) and has **Claude** classify the dialect from vocabulary, morphology, and phrasing.
3. The map flies to the verdict, with evidence chips ("we caught you saying هسه") and honest confidence.

### Keeping dialect out of MSA

Whisper likes to tidy spoken Arabic into Modern Standard: a user said *بيت* and *زهقان* and the transcript came back *المنزل* and *لا أفعل شيئاً* — which destroys the only signal this app has.

The fix is that Whisper's `prompt` parameter is decoding **context**, not an instruction. Asking it in Arabic to "write dialect, don't correct to فصحى" does not work; worse, it sometimes continues that sentence and returns it *as the transcript*. Measured over 8 known-colloquial clips:

| prompt | dialect markers retained | MSA giveaways |
|---|---|---|
| instruction ("write dialect…") | 11 | 0 |
| no prompt | 13 | 0 |
| **primed with real colloquial speech** | **20** | 0 |

The instruction prompt performed *worse than no prompt at all*, and produced a garbage transcript on 2 of 8 clips. The endpoint now primes with a sample of actual Levantine/Egyptian/Gulf/Iraqi/Maghrebi speech and discards any segment that echoes the prompt back.

Other defences: hallucination filtering via segment confidence (`no_speech_prob` / `avg_logprob`) plus a boilerplate scrub, client-side silent-mic detection, and caption fallback when the recorder tapes a dead mic. No mic at all → type mode. API unreachable → an offline word-marker engine ([js/dialects.js](js/dialects.js)).

Audio is analyzed in-memory and never stored (unless the user opts in — see below).

## How clips get into Guess the Voice

Every clip passes the same gate, and the rules are enforced by code rather than by memory:

1. **Homeland rule** — a dialect deck only holds speakers from places where that language is native or a main/official language. Nigeria, South Africa, India and Jamaica belong in English Accents; a Filipino reading an English script, or a Latvian speaking Russian, do not.
2. **No answer leaks** — a clip is rejected if the audible window names the speaker's own city, country, region, demonym, or a station ident. If the leak is only in the opening, the clip keeps a fixed playback window instead. The most common failure by far: spoken-Wikipedia recordings *about the reader's own city*.
3. **Real speech** — spontaneous speech is preferred and dealt first. Clips where everyone reads the same elicitation paragraph were removed; English Accents is now entirely unscripted.
4. **One loudness** — clips arrived spanning 46 dB, from −52 LUFS (inaudible) to one peaking at +5.3 dBTP (clipping, painful in headphones). All are two-pass EBU R128 normalized to −16 LUFS / −1.5 dBTP, and the checker fails if a clip drifts.

The gate is: fetch → verify the URL yourself → extract audio (mono 64k mp3) → Whisper transcript with timestamps → Claude judges quality, leaks, language and label honesty → merge → check.

```bash
node tools/check-decks.mjs
```

Fails with a non-zero exit if any clip breaks the homeland rule, is missing source credits, has a missing file, or leaves a deck under the 5 clips a round needs.

## Two kinds of clip

Most clips are files this repo hosts — trimmed, loudness-normalized, no ads. A clip can instead be streamed from YouTube:

```js
{ id, label, kind: 'yt', videoId, start, gain, gate: { origin, originConfidence }, lat, lng, r, source }
```

Nothing is copied for those: the IFrame API plays a chosen 20 seconds with the video hidden, and the creator gets the view. `js/media.js` presents one interface over both, so `game.js` never knows which kind it is playing.

Embedded clips pass the **same gate**, automatically. `yt-gate.mjs` fetches a candidate's audio once, measures its loudness, transcribes it, has Claude rule on it, then **deletes the audio** — verification, not redistribution. Two things are specific to this source:

- **Origin must be proved from the transcript.** YouTube metadata can't be trusted, but speakers usually say where they're from, and that same sentence is both the proof and the leak — so it's quoted as evidence and the playback window starts after it. Origin never established → dropped.
- **Imitations are rejected.** Dialect coaches, actors putting a voice on, foreigners attempting one. The answer has to be true, and an impression makes it false.

First run: 35 candidates in, 5 out. The rejects are kept in [`data/gate-rejects.json`](data/gate-rejects.json) — they're the seed for a planned "real or fake" mode.

## Install it

The site is a PWA — "Add to Home Screen" on iOS or Android gives it an icon and a standalone window. No App Store, no wrapper.

## Run locally

```bash
node dev-server.js
```

Needs a `.env` (see [.env.example](.env.example)) with `ANTHROPIC_API_KEY` and `GROQ_API_KEY`. Without keys the site still runs in offline/fallback mode. The dev server serves byte ranges, which the audio scrubber needs.

## Deploy (Vercel)

Import the repo — static site + three serverless functions, no build step. Set in **Project Settings → Environment Variables**:

- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (optional — flywheel + leaderboard)

Redeploy after adding them. HTTPS (automatic on Vercel) is required for mic access.

## The flywheel

After every guess: "did I get it?" — corrections always log locally, and with the **donate this clip** checkbox ticked, the clip + correction go to Supabase as future training data (see [privacy.html](privacy.html)). Without Supabase configured the app still works; feedback just stays local.

### Flywheel setup (~5 min, one time)

1. Create a free project at supabase.com.
2. SQL Editor → paste [supabase/schema.sql](supabase/schema.sql) → Run (both blocks: `feedback` and `scores`).
3. Storage → New bucket → name it `clips`, keep it **private**.
4. Settings → API: copy the Project URL and the **service_role** key (not anon).
5. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to `.env` and Vercel, redeploy.

## Credits and licences

Every clip credits its source, host and licence on the reveal, with a link to the original. Sources are Wikimedia Commons, Wikitongues, Voice of America, the UK/Welsh Open Government Licence, and the [ARCADE corpus](https://huggingface.co/datasets/riotu-lab/ARCADE-full) (RIOTU Lab) for Arabic. All licences permit reuse; **no non-commercial clips remain in the project**.

## Next

**The Atlas** (P2): a browsable map of accents — tap a region, hear it, learn its giveaway words.

**The ear** (P3): a true acoustic model (fine-tuned wav2vec2/WavLM class on ADI-17/ADI-20 plus flywheel clips) that hears the *accent itself* rather than the words — which is what English and Chinese Guess-Me modes need.
