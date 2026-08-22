# HomeTongue — سمعناك

Your voice is a place. Live at **[hometongue.me](https://www.hometongue.me/)**.

- **🎙 Read My Accent** — talk in any language for at least 20 seconds and it places where you grew up as a point on the map, inside a circle it is honestly confident about.
- **📍 Guess the Voice** ([game.html](game.html)) — GeoGuessr for ears: hear a real clip, drop a pin. **Eight playable decks, 152 clips**: Arabic (40), World Languages (26), English Accents (20), Spanish (13), French (13), Hindi–Urdu (13), Chinese (12), Portuguese (12). Distance scoring, 5 rounds, nickname leaderboard. Italian and German exist as deck keys but are still being stocked, so they are not dealt.

Works on **every device** — desktop, Android, iPhone — because recording uses MediaRecorder and analysis happens server-side.

## How it works

```
audio → Gemini 3.5 Flash → { lat, lng, radius_km, place, evidence, transcript }
```

One call. The model **listens to the recording directly** — there is no transcription step and no speech-to-text service in the middle. `gemini-3.6-flash` sits behind it as an automatic fallback, because the primary will have a bad day: on 2026-08-11 it returned HTTP 500 on six of eight audio requests while text sailed through. The two measure as a tie on accuracy, so the chain is redundancy, not a quality ladder.

That is the whole architectural argument, and it was measured rather than assumed. The app used to be a cascade: Whisper transcribed the audio, then Claude classified the dialect from the words. It was replaced in August 2026 because **speech-to-text deletes the accent by design.** A transcript uses standard spelling no matter how a word was said, so an Egyptian saying *gamal* and a Levantine saying *jamal* both arrive as جمال. The signal was being thrown away before the reasoning started.

The switch was decided on a country-label comparison run in August 2026 — the cascade scored 58% against the audio-native call's 86% on the Arabic set — and the app has been scored in kilometres rather than country labels ever since, so those two figures are kept here as the historical reason for the change, not as current numbers. The current ones are below.

The answer is a **point plus a radius**, not a country and a percentage. `radius_km` is the distance the model is ~70% confident you grew up within; measured calibration is **64%**, so the circles run slightly optimistic. A wide circle in the right place is a good answer; a narrow one in the wrong place is the only truly bad one.

## Measuring it

`tools/eval.mjs` plays the hand-labelled clips to the model, compares each guess to the known city, and scores the great-circle distance.

```bash
node tools/eval.mjs                 # all decks
node tools/eval.mjs arabic accents  # named decks
```

**55 km median error, 60% within 100 km, 74% within 250 km**, over 84 scored clips. Published SOTA for coordinate-level accent geolocation is a 481 km median, though on a different and smaller corpus — treat it as a sanity check on the order of magnitude, not a like-for-like win.

Those figures are from `data/eval-gemini-3.5-flash.json`, whose stored prompt hash matches the shipped prompt, so they describe exactly what the site runs today. The clip manifest has changed since that run, so the benchmark is due a repeat.

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

The app asks for **20 seconds minimum** and encourages up to 60. Read the rest of this section before changing that number, because the obvious reading of the data is wrong.

Two truncation sweeps exist and they do not agree. Both are real; both are in `data/`.

| audio | `length-latency.json` (n≈24) | `length-sweep.json` (n=54) |
| --- | --- | --- |
| 8s | 345 km · 25% <100km | — |
| 12s | 157 km · 48% | — |
| 20s | 157 km · 50% | 317 km · 44% |
| 30s | 67 km · 57% | 72 km · 52% |
| 45s | — | 90 km · 54% |
| 60s | — | 85 km · 57% |

Medians move a great deal here, and on heavy-tailed samples that happens for reasons unrelated to the treatment. The paired per-clip counts, which are the only view that can actually see an effect, are much weaker:

| comparison | longer better | worse | tied |
| --- | --- | --- | --- |
| 20s → 30s | 10 | 6 | 11 |
| 30s → 45s | 8 | 6 | 13 |
| 45s → 60s | 6 | 4 | 18 |

**So: short recordings are clearly bad, and beyond 20 seconds is not established.** With only a handful of clips ever moving between adjacent lengths, none of those comparisons reaches significance, and a rerun on byte-identical audio once reversed the ordering. An earlier version of this file presented the 30s row as a settled finding; that conclusion is withdrawn, though the number itself is a faithful reading of the smaller sweep.

Latency barely moves with length, because the wait is model inference rather than upload. Shortening the recording is therefore not a latency fix.

The UI shows four dots filling at 20s, 30s, 45s and 55s. They are an honest encouragement to keep talking, not a promise that each one buys a measured amount.

## How clips get into Guess the Voice

Every clip passes the same gate, enforced by code rather than memory:

1. **Homeland rule** — a dialect deck only holds speakers from places where that language is native or a main/official language. Nigeria, South Africa, India and Jamaica belong in English Accents; a Filipino reading an English script, or a Latvian speaking Russian, do not.
2. **No answer leaks** — rejected if the audible window names the speaker's own city, country, region, demonym, or a station ident. If the leak is only in the opening, the clip keeps a fixed playback window instead. The most common failure by far: spoken-Wikipedia recordings *about the reader's own city*.
3. **Real speech** — spontaneous speech preferred and dealt first. Clips where everyone reads the same elicitation paragraph were removed; English Accents is now entirely unscripted.
4. **One loudness** — clips arrived spanning 46 dB, from −52 LUFS (inaudible) to one peaking at +5.3 dBTP (clipping, painful in headphones). All are two-pass EBU R128 normalized to −16 LUFS / −1.5 dBTP, and the checker fails if a clip drifts.

```bash
node tools/check-decks.mjs
```

Non-zero exit if any clip breaks the homeland rule, is missing source credits, has a missing file, leaves a deck under the 5 clips a round needs, or if an eval result file has gone stale. Dealing has a second, higher bar: `MIN_DECK` in `js/game.js` is 10, below which a deck is withheld rather than dealt, because a five-clip deck serves the same game every time and spoils itself on the second play.

`tools/source-clips.mjs` finds candidates and vets them by handing the audio to the app's own model, blind — the strongest available test of "is this person really from Lagos", and the thing that keeps impressionists out. Everything it accepts is stamped `evalExclude` for the reason above.

## Two kinds of clip

Most clips are files this repo hosts — trimmed, loudness-normalized, no ads. A clip can instead be streamed from YouTube:

```js
{ id, label, kind: 'yt', videoId, start, gain, gate: { heard, offBy }, lat, lng, r, source }
```

Nothing is copied for those: the IFrame API plays a chosen ~20 seconds with the video hidden, and the creator gets the view. Vetting fetches the audio once, judges it, and **deletes it** — verification, not redistribution. `js/media.js` presents one interface over both, so `game.js` never knows which kind it is playing.

## Telemetry

First-party and cookieless. `js/telemetry.js` sends a beacon per meaningful action - `rec_start`, `analyze_result`, `deck_pick`, `score_post`, a `js_error` hook, one `perf` sample per view - to `api/track.js`, which validates against an allowlist of events and per-event props, derives a daily visitor hash from the request without storing the address, reads the country from Vercel's edge header, and inserts one row into the `events` table (`data/events-table.sql`). Every path returns 204: telemetry can never break the site.

`api/stats.js` renders the last 1-30 days as a dashboard: people today and visitor-days (the visitor hash rotates daily by design, so a window sums days rather than counting people), the two funnels (home -> recording -> verdict -> feedback -> donation; game -> deck -> five rounds -> posted score), verdict latency, failure codes, clip swaps and flags, devices, countries, referrers, and the JavaScript errors users actually hit. Gated by a key derived from a server secret, so there is nothing to configure and nothing secret in the repo.

The privacy page describes exactly what is collected, in the same words.

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

Every clip credits its source, host and licence on the reveal, with a link to the original. Sources are Wikimedia Commons, Wikitongues, Voice of America, the [ARCADE corpus](https://huggingface.co/datasets/riotu-lab/ARCADE-full) (RIOTU Lab) for Arabic, and YouTube for the streamed clips. All licences permit reuse; **no non-commercial clips remain in the project**.

As counted from the manifest: 44 streamed from YouTube and never copied, 40 CC BY 4.0, 24 CC BY-SA 4.0, 23 CC BY-SA 3.0, 13 public domain (including US government work), 5 CC BY 3.0, 5 CC0, 1 CC BY-SA 2.5.
