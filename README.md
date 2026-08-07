# HomeTongue — سمعناك

Your voice is a place. Live at **[hometongue.me](https://www.hometongue.me/)**.

- **🎙 Read My Accent** — talk in any language for ~30s and it places where you grew up as a point on the map, inside a circle it is honestly confident about.
- **📍 Guess the Voice** ([game.html](game.html)) — GeoGuessr for ears: hear a real clip, drop a pin. **Nine decks, 161 clips**: Arabic Dialects (45 places), English Accents, World Languages, Spanish, Chinese, Portuguese, French, Russian, Hindi–Urdu. Distance scoring, 5 rounds, nickname leaderboard.

Works on **every device** — desktop, Android, iPhone — because recording uses MediaRecorder and analysis happens server-side.

## How it works

```
audio → Gemini 3.6 Flash → { lat, lng, radius_km, place, evidence, transcript }
```

One call. The model **listens to the recording directly** — there is no transcription step and no speech-to-text service in the middle.

That is the whole architectural argument, and it was measured rather than assumed. The app used to be a cascade: Whisper transcribed the audio, then Claude classified the dialect from the words. It was replaced in August 2026 because **speech-to-text deletes the accent by design.** A transcript uses standard spelling no matter how a word was said, so an Egyptian saying *gamal* and a Levantine saying *jamal* both arrive as جمال. The signal was being thrown away before the reasoning started.

| | country accuracy | median error |
| --- | --- | --- |
| cascade (Whisper → Claude) | 58% | — |
| audio-native (Gemini) | **86%** | **44 km** |

The answer is a **point plus a radius**, not a country and a percentage. `radius_km` is the distance the model is ~70% confident you grew up within; measured calibration is 72%, so the circles are close to honest. A wide circle in the right place is a good answer; a narrow one in the wrong place is the only truly bad one.

## Measuring it

`tools/eval.mjs` plays all 111 hand-labelled clips to the model, compares each guess to the known city, and scores the great-circle distance.

```bash
node tools/eval.mjs                 # all decks
node tools/eval.mjs arabic accents  # named decks
```

**44 km median error, 59% within 100 km, 86% country correct.** Published SOTA for coordinate-level accent geolocation is a 481 km median, though on a different and smaller corpus — treat it as a sanity check on the order of magnitude, not a like-for-like win.

Two rules keep the number meaningful:

- **Clips the model helped choose are excluded** (`evalExclude`). Scoring a model on a test set it picked would look brilliant and mean nothing.
- **The cache is keyed to a hash of the prompt.** It previously resumed from its own output file, so re-running after a prompt edit replayed old answers and issued no API calls — a 10k-character rewrite once "measured" byte-identical to the version it replaced. Change one character now and every cached score is discarded.

### Things that were tried and measured *worse*

The most useful part of the record. Each was implemented, measured against the benchmark, and reverted. See [`data/eval-notes.md`](data/eval-notes.md).

| change | result |
| --- | --- |
| feed a Whisper transcript alongside the audio | null (38 vs 43 km, split evenly) |
| hand-written dialect marker playbooks | 69 vs 43 km — worse |
| phoneme recogniser (Arabic, English) | null / negative |
| nine-language "expert linguist" prompt | 49 vs 37 km — worse |
| researched Syria-specialist route | 38 vs 28 km on Arabic — worse |

Five independent attempts to add domain knowledge, every one null or negative. **The prompt layer is saturated**; the 2.1 kB prompt in [`api/prompt.js`](api/prompt.js) is the best measured configuration, and anything that makes it longer should be assumed harmful until an eval says otherwise.

One mechanism explains the failures: a long specialist preamble competes with the model's own judgement and coarsens every answer outside the region it covers — Basra retreats to Baghdad, Tangier to Casablanca. Ordering the model to place the speaker *first* and only then consult the notes recovered most of it (Basra 448 → 0 km), which is the one finding worth carrying into any future specialist prompt.

### How long should you talk?

Measured across four truncations of the benchmark clips:

| audio | median error | <100 km | median latency |
| --- | --- | --- | --- |
| 30s | **67 km** | **57%** | 11.8 s |
| 20s | 157 km | 50% | 10.2 s |
| 12s | 157 km | 48% | 8.2 s |
| 8s | 345 km | 25% | 6.2 s |

Accuracy climbs with length; latency barely moves, because the wait is model inference rather than upload. Shortening the recording is therefore not a latency fix — it only costs accuracy. The UI shows this live as three dots filling at 10s, 20s and 30s.

## How clips get into Guess the Voice

Every clip passes the same gate, enforced by code rather than memory:

1. **Homeland rule** — a dialect deck only holds speakers from places where that language is native or a main/official language. Nigeria, South Africa, India and Jamaica belong in English Accents; a Filipino reading an English script, or a Latvian speaking Russian, do not.
2. **No answer leaks** — rejected if the audible window names the speaker's own city, country, region, demonym, or a station ident. If the leak is only in the opening, the clip keeps a fixed playback window instead. The most common failure by far: spoken-Wikipedia recordings *about the reader's own city*.
3. **Real speech** — spontaneous speech preferred and dealt first. Clips where everyone reads the same elicitation paragraph were removed; English Accents is now entirely unscripted.
4. **One loudness** — clips arrived spanning 46 dB, from −52 LUFS (inaudible) to one peaking at +5.3 dBTP (clipping, painful in headphones). All are two-pass EBU R128 normalized to −16 LUFS / −1.5 dBTP, and the checker fails if a clip drifts.

```bash
node tools/check-decks.mjs
```

Non-zero exit if any clip breaks the homeland rule, is missing source credits, has a missing file, leaves a deck under the 5 clips a round needs, or if an eval result file has gone stale.

`tools/source-clips.mjs` finds candidates and vets them by handing the audio to the app's own model, blind — the strongest available test of "is this person really from Lagos", and the thing that keeps impressionists out. Everything it accepts is stamped `evalExclude` for the reason above.

## Two kinds of clip

Most clips are files this repo hosts — trimmed, loudness-normalized, no ads. A clip can instead be streamed from YouTube:

```js
{ id, label, kind: 'yt', videoId, start, gain, gate: { heard, offBy }, lat, lng, r, source }
```

Nothing is copied for those: the IFrame API plays a chosen ~20 seconds with the video hidden, and the creator gets the view. Vetting fetches the audio once, judges it, and **deletes it** — verification, not redistribution. `js/media.js` presents one interface over both, so `game.js` never knows which kind it is playing.

## Install it

The site is a PWA — "Add to Home Screen" on iOS or Android gives it an icon and a standalone window. No App Store, no wrapper.

## Run locally

```bash
node dev-server.js
```

Needs a `.env` (see [.env.example](.env.example)) with `GEMINI_API_KEY`. The dev server serves byte ranges, which the audio scrubber needs.

## Deploy (Vercel)

Import the repo — static site + serverless functions, no build step. Set in **Project Settings → Environment Variables**:

- `GEMINI_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (optional — feedback storage + leaderboard)

Redeploy after adding them. HTTPS (automatic on Vercel) is required for mic access.

## The flywheel

After every guess: "did I get it?" — corrections always log, and with the **donate this clip** box ticked, the clip plus the correction go to Supabase as future training data (see [privacy.html](privacy.html)). This is also the most promising route to a harder benchmark: a clip labelled by the speaker with the city they actually grew up in is better evidence than anything scraped.

### Flywheel setup (~5 min, one time)

1. Create a free project at supabase.com.
2. SQL Editor → paste [supabase/schema.sql](supabase/schema.sql) → Run (both blocks: `feedback` and `scores`).
3. Storage → New bucket → name it `clips`, keep it **private**.
4. Settings → API: copy the Project URL and the **service_role** key (not anon).
5. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to `.env` and Vercel, redeploy.

## Credits and licences

Every clip credits its source, host and licence on the reveal, with a link to the original. Sources are Wikimedia Commons, Wikitongues, Voice of America, the UK/Welsh Open Government Licence, and the [ARCADE corpus](https://huggingface.co/datasets/riotu-lab/ARCADE-full) (RIOTU Lab) for Arabic. All licences permit reuse; **no non-commercial clips remain in the project**.
