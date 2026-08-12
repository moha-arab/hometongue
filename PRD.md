# HomeTongue — Product Requirements

*Owner: Mohammad Arab · v3.1 · updated 2026-08-03 (reflects as-built reality)*

## Status snapshot

| Piece | Status | Where |
|---|---|---|
| Guess Me (Arabic dialect AI) | ✅ live | [hometongue.me](https://www.hometongue.me/) |
| Pin It — 9 decks, 140 clips (3 streamed) | ✅ live | [/game.html](https://www.hometongue.me/game.html) |
| Installable app (PWA) | ✅ live | add to home screen, no App Store |
| Data flywheel (consent clip donation) | ✅ live, collecting | Supabase |
| Nickname leaderboard | ✅ live | `/api/scores` |
| Domain hometongue.me | ✅ live (apex → www) | Namecheap → Vercel |
| The Atlas (mode 3) | ⏳ next (P2) | — |
| Acoustic model / English Guess-Me | ⏳ P3 | — |

## What this is

HomeTongue is a map-first web app about accents: **your voice is a place.** Three modes share one map and one brand.

Why it exists (priority order):
1. **Resume.** Technically deep and live-demoable: audio pipelines, LLM engineering with calibrated structured output, a dataset-curation pipeline with automated quality gates, a game backend, and (P3) a trained speech model. A recruiter goes from link → talked → map flew to their hometown in under 90 seconds.
2. **Fun.** A party trick, a geography game, and a field guide in one.
3. **Maybe viral.** Welcome, not required.

## The modes (as built)

### 🎙 Guess Me — live

Talk naturally in Arabic for ~20–45s. The engine guesses hierarchically — region → country → **city when evidence exists** — flies the map there, and shows the giveaway words with honestly calibrated confidence. Users answer "did I get it?" and can correct with country + city.

Working today: hierarchical verdicts (e.g. Saudi 86%, "Najd (Riyadh/Qassim)"), evidence chips quoting the transcript, "what we heard" transcript display, close-call honesty (Jordanian vs Palestinian flagged as a coin-flip).

Defenses shipped after real-user testing:
- **Hallucination filtering** — silence used to produce YouTube boilerplate (اشتركوا في القناة); filtered by segment confidence plus a phrase scrub.
- **Silent-mic detection** — if the recorder tapes a dead microphone but live captions caught words, the captions get analyzed instead.
- **Dialect preservation** (2026-08-03) — the transcriber used to flatten dialect into MSA: a user said *بيت* and *زهقان* and got back *المنزل* and *لا أفعل شيئاً*. Root cause: Whisper's `prompt` parameter is decoding **context**, not an instruction, so a sentence telling it to write dialect was sometimes continued verbatim as the "transcript". Measured across 8 known-colloquial clips: the old instruction prompt retained 11 dialect markers, no prompt at all retained 13, and a prompt primed with real colloquial speech retained **20**. The instruction prompt was worse than nothing. Now primed, with a guard that discards any segment echoing the prompt.

**Type mode**: a full no-mic path — "type like you talk" textarea (RTL) with 7 one-tap sample texts. Also the automatic fallback when recording is unsupported or the mic is blocked.

Detection is **word-based** (vocabulary/morphology/phrasing), not acoustic — that ceiling holds until P3. No reading passage, ever: free speech is the signal.

### 📍 Pin It — live

Hear a real clip, drop a pin, score by distance. 5 rounds, 5,000 points max each. **Nine decks, 140 clips:**

| Deck | Clips | Answer regions |
|---|---|---|
| 🕌 Arabic Dialects | 45 | 17 countries, city-level |
| 🗣 English Accents | 23 | 15 |
| 🌍 World Languages | 26 | 26 |
| 💃 Spanish | 11 | 9 |
| 🐉 Chinese (Mandarin + Cantonese + Wu) | 9 | 3 |
| 🌊 Portuguese | 8 | 5 |
| 🥐 French | 7 | 6 |
| 🪆 Russian | 6 | city-level within Russia |
| 🪷 Hindi–Urdu (India + Pakistan) | 5 | 2 countries |

Arabic is the flagship: real local radio and conversation, players pin the *city*, 45 places across 17 countries. As far as we know, the only playable experience anywhere built on city-level Arabic speech.

**Three rules govern what may enter a deck.** All are enforced, not remembered:

1. **The homeland rule** — a dialect deck only contains speakers from places where that language is native or a main/official language. Nigeria, South Africa, India and Jamaica belong in English; a Filipino reading an English script, or a Latvian speaking Russian, do not. Enforced by `tools/check-decks.mjs`, which fails the build on any violation.
2. **No answer leaks** — a clip is rejected if the audible window names the speaker's own city, country, region, demonym, or a station ident that gives it away. Where the leak is only in the opening, the clip gets a fixed playback window instead (44 of 140 clips carry one). This gate cost 12 Arabic clips, 7 World Languages clips and 7 of 10 Spanish candidates in one sourcing round — the recurring failure was spoken-Wikipedia readings *about the reader's own city*.
3. **Real speech** — spontaneous speech is preferred and dealt first. The 21 Speech Accent Archive clips, where every speaker reads the same "Please call Stella" paragraph, were removed after players noticed the repetition; English Accents is now 100% unscripted.

Shared mechanics:
- **60 seconds of listening per round**, spent however you like — the clock only burns while sound actually plays; pausing and scrubbing are free.
- **A real scrubber**: draggable thumb, ±5s buttons, keyboard (space, arrows). The bar tracks the pointer directly rather than waiting on the audio element, and seeks are queued rather than stacked.
- **Distance scoring** with per-deck decay — cities need precision, world languages forgive continental misses.
- **Pluricentric answers**: in World Languages a clip accepts every region where the language is genuinely at home and scores you to the nearest one. A French clip recorded in Paris gives full marks for a Montréal pin, and says so.
- **Variety dealing**: one clip per region first, then draws from whichever region has the most unused clips, so no deal repeats a place.
- **Readable credits**: each reveal shows who recorded it, where it lives, the licence, and a link to the original. People are curious; the credit line used to be an unreadable run-on.
- **Two kinds of clip.** Most are hosted files: mirrored, trimmed, loudness-normalized, no ads. A clip can also be `kind: 'yt'`, streamed from YouTube through the IFrame API with the video hidden and only a chosen 20 seconds played. Nothing is copied for those — the creator gets the view. The game talks to one media interface and never knows which it is playing. Embedded clips go through the **same gate**: `tools/../yt-gate.mjs` fetches the audio once, measures loudness, transcribes it, has Claude judge origin/leak/language/quality/imitation, then deletes the audio — verification, not redistribution. Two things are specific to this source: the speaker's origin has to be *proved from the transcript* (no trustworthy metadata on YouTube, so a clip whose origin is never established is dropped), and measured loudness becomes a player volume rather than a re-encode. `tools/check-decks.mjs` refuses any embed clip without that gate record.
- **One loudness for every clip**: sources arrived anywhere from −52 LUFS (inaudible) to −5.9 LUFS peaking at +5.3 dBTP (clipping, painful on headphones) — a 46 dB spread, because a radio rip, a podcast and a laptop-mic reading share no level convention. Every clip is now two-pass EBU R128 normalized to −16 LUFS with a −1.5 dBTP ceiling, leaving a 4.4 dB spread. The measured value is stored per clip and `tools/check-decks.mjs` fails on drift.

### 🎭 Real or Fake — planned (P2, cheap)

Play 20 seconds. Is this person's accent **theirs**, or are they doing an impression?

The idea came out of a rejection pile. When the YouTube gate ran its first 35 candidates it dropped 30, and most were dropped for the same reason: dialect coaches, actors putting a voice on, foreigners attempting one, people mocking a way of speaking. Useless for Pin It, where the answer must be true — but they are exactly half of a different game, and the gate has already labelled them. 26 rejects with reasons are kept in [`data/gate-rejects.json`](data/gate-rejects.json); 16 are performances.

Why it is cheap: the clips, the player, the gate and the scoring loop all exist. What is missing is a second verdict field (`imitation: true/false`), a binary answer UI instead of a map, and enough volume of both halves.

Why it is worth building: it is the only mode where being *wrong* teaches you the most — you find out that the voice you were sure was Cockney belongs to an actor from Surrey. It also gives every future gate rejection somewhere to go instead of the bin.

Open questions before it ships:
- **Fairness.** The real and fake halves must cover the same accents, or the answer becomes "the clip with music under it is the fake one."
- **Taste.** Some imitation content is mockery. Anything demeaning stays out; the gate would need a rule for it, the way it has one for content that does not belong in the project.
- **Scoring.** Binary right/wrong is thin. Probably confidence-weighted, so a confident wrong answer costs more than a hedged one.

### 🗺 The Atlas — next (P2)

A browsable map of accents: tap a region, get a card — what the accent sounds like (real clips), its giveaway words, how to tell it from neighbours. Launches on curated open-data clips (the game's manifest is already the seed); community submissions are a later phase.

## The data flywheel (as built)

Runs under Guess Me. By default **nothing identifying is kept**: no consent = an anonymous scorecard only (guessed country vs corrected country, confidence, device class — no words, no audio, no cities). Ticking "donate this clip" stores the recording + transcript + correction for model training. Enforced server-side and stated in plain words at [/privacy.html](https://www.hometongue.me/privacy.html); deletion requests via GitHub issues.

Anti-abuse: clips are only accepted with a fresh HMAC token minted by the analyze endpoint itself, same-origin checks and per-IP rate limits on **all three** endpoints, MIME allowlist, size caps. Console spending caps remain the final backstop.

Why it matters: a research sweep confirmed **no public speech dataset separates city-level Arabic** (ARCADE, published Jan 2026, is the first attempt: minutes per city; nothing covers Homs at all; only the tiny text corpus Nabra separates Halabi from Homsi). A few thousand consented user clips would be the largest resource of its kind — the moat, and plausibly a workshop paper (NADI/ArabicNLP).

## What "good" looks like

- **Demo test** ✅ passing: link → talk → map flies, on a phone, under 90s.
- **Game test** ✅ passing: nine decks, all deal five distinct places, verified over repeated deals.
- **Honesty test** ✅ passing by design: city guesses only appear with evidence; confidence is calibrated, not theatrical.
- **Atlas test** ⏳: 40+ region cards, 2+ clips each (P2).
- **Flywheel test** ⏳ measuring: ≥25% of Guess-Me users consent and answer.

## What actually moves accuracy (measured 2026-08-11)

Read this before touching the analyser, because the intuitions here are mostly wrong.

**Recording length matters, but only up to twenty seconds.** Same speakers truncated, fully
paired on 18 clips, measured twice because the first pass over-read it:

| length | median error | within 100 km | answers >1000 km out |
|--------|--------------|---------------|----------------------|
| 12s    | 166 km       | 50%           | 5 |
| 20s    | **40 km**    | 67%           | 2 |
| 30s    | 6 km         | 72%           | 2 |
| 45s    | 2 km         | 67%           | 2 |

Read the paired counts, not the medians — on 18 heavy-tailed clips a median moves for reasons
unrelated to the treatment:

| comparison | result |
|------------|--------|
| 12s vs 20s | 20s better on 7, worse on 1, tied 10 — **the one supported comparison** |
| 20s vs 30s | 30s better on 2, worse on 1, tied 15 — **undetermined** |
| 30s vs 45s | 45s better on 2, worse on 3, tied 13 — **undetermined** |

**"No benefit above 20s" is not a finding — it is a blind instrument reporting nothing.** A
hostile review of the above established:

- With only 2–3 clips ever moving between adjacent arms, the sign test's *floor* is p = 0.50
  for 30-vs-45. It could not have returned significance under any outcome. Power to detect
  even a 4:1 real effect is ~21%.
- A second run of the same question, on eight clips whose audio files are **sha256-identical**
  between the two harnesses, **reversed the ordering**: one run has 20→30 buying 124 km, the
  other has it costing 130 km.
- Medians that looked stable across arms were an artifact: the same two clips (Cameroon,
  Belgium) answer byte-identically at every length and were pinning the median each time.

So: 12s is genuinely worse than 20s. **Whether 30 or 45 beats 20 is unknown.** Settling it
needs many more clips and a repeat control on each, because per-call noise exceeds the effect.
A 30-second target was briefly shipped and retracted, but do not read that as evidence against
30 either.

**Everything else is noise beside the 12→20s step**: swapping the model is worth 0 km,
lightening the schema about 17 km, more thinking time is negative.

**The radius is dishonest, and not because of length.** Paired, 72 observations across
15/20/30/45s: the circle contains the truth **48.6%** of the time (CI 38–60) against a promised
70%, and the coverage is flat across every length. The model parks nearly every answer at a
150–350 km radius regardless of how much it heard, so the calibration ladder in the prompt is
being ignored rather than applied. A flat ~1.8× multiplier would reach 69%. Beyond ~2× nothing
more is bought, because **~14% of all answers are confident catastrophes** — over 1000 km wrong
inside a ~200 km circle (Rio answered as Lisbon, 7715 km off, confidence 95). Those are the
real bug, and no radius fixes them.

**The instrument's noise is far worse than the "14 km floor" suggests, and it is per call.**
The identical prompt over the identical 106 clips scored 37 km one run and 51 km the next, 13
clips moving over 100 km. But a proper repeat control — the **byte-identical file** sent twice,
temperature 0 — is worse still: 22.3 km median one call and 58.3 km the next, and per clip,
Mozambique answered Maputo (0 km) then Luanda (2792 km); Jamaica answered NYC (2530 km) then
Nassau (773 km).

That reframes the whole project. The model is **not deterministic at temperature 0**, and its
per-call spread is measured in thousands of kilometres on individual clips. Consequences:

1. Any A/B on ~15 clips without a repeat control is unreadable, because the control moves more
   than the treatment. **Every future experiment needs a repeat arm.**
2. The single most promising untested lever is now **asking more than once and combining**
   (geometric median of 2–3 calls), because it attacks the dominant error source directly.
   Every lever tested so far tuned *what* is asked; none tuned *how many times*.

Almost every comparison in this project's history was median-vs-median across two single runs,
which cannot see anything smaller than its own noise. Two standing beliefs were checked properly and both were
false:

- "3.6-flash is more accurate than 3.5-flash" (53 vs 68 km). Paired on 33 clips: 2 km vs 3 km,
  tied on 23, **0 km median per-clip difference**. Never real.
- "The schema costs 46 km." Retested paired, the same light schema scored 55 km where it had
  scored 26 km. The honest figure is ~17 km, and it lives in the tail, not the typical case.

**Therefore: never compare two eval runs again.** Pair the arms on identical clips and count
per-clip wins. Any median-vs-median difference under ~30 km on a 40-clip sample is nothing.

**Why "it used to be better" was never provable.** The 33/37/51/53 km history is one noisy
number sampled at intervals, not a trend. There is no evidence the app degraded, and there
never was evidence it improved. The apparatus could not tell.

**Known-good levers, in order:** clear 20 seconds of speech; keep thinking off; keep the model
chain for availability, not quality.

**Open, blocked on API credit:** whether the second judge earns its call and 3.5s (it has
never once withheld a verdict across 32 real clip-lengths); whether splitting the single call
into a placing listener and a describing listener is worth it (paired: better on 10, worse on
4, tail improves 68%→76% under 250 km, richness kept, 93% pin/description agreement — real but
not yet conclusive); whether asking three times and taking the geometric median beats asking
once.

## Explicitly not built (and honest about it)

- English/other-language **Guess Me** (needs the acoustic model — text barely distinguishes English accents)
- A native iOS app. Apple rejects thin web wrappers (Guideline 4.2) and nothing here needs native APIs; the PWA installs to the home screen for free. Revisit if an on-device acoustic model ships.
- The Atlas, community clip submissions, native mobile apps, accounts/auth, monetization
- Deferred game features: seedable shared rounds ("play my round"), difficulty tiers, polygon scoring for multi-country languages (generous radius instead)
- Leaderboard score submission is client-trusted (sum-validated but forgeable) — acceptable while stakes are bragging rights

## Build phases

| Phase | What | Status |
|---|---|---|
| P0 — Flywheel | Consent + privacy page + Supabase storage + anti-abuse | ✅ shipped & prod-verified |
| P1 — Pin It | Nine decks, curation pipeline, leaderboard, player UX | ✅ shipped |
| P2 — Atlas | Region cards + clips on the explorable map (reuses clip manifest) | next, 1–2 sessions |
| P2 — Real or Fake | Native vs impression, built on the gate's reject pile | cheap, ~1 session |
| P3 — The ear | Acoustic model fine-tune, ensemble with word engine, unlocks English Guess-Me + city-level acoustics | 3–5 sessions, best started once flywheel has data |

## Risks and open questions

- **Licensing** (every clip credits source + licence in-product): CC BY-SA, CC BY, CC0, public domain, US government work, and one Open Government Licence v3.0. **No non-commercial clips remain** — dropping the Speech Accent Archive set removed the only NC terms in the project, so monetization is no longer licence-blocked.
- **Thin decks**: Hindi–Urdu sits at the 5-clip minimum and Russian at 6. One dead clip stops a mode dealing. Commons is genuinely poor for free Pakistani Urdu speech with documented origin — the only candidates found were sectarian militant speeches, rejected on content grounds.
- **Label honesty**: some clips document a region rather than a city (a "South of France" accent, not Marseille). Labels are broadened to what the evidence supports rather than invented precision.
- **Trust in Guess Me**: mitigated three ways — calibrated confidence, self-aware copy, and the game modes carrying the fun when the AI misses.
- **Single-maintainer attention** is the biggest real risk. Each phase ships alone and stays useful alone.
- **Costs**: ~1¢ per Guess-Me analysis (Claude) + Groq free tier; game clips are static files. An empty API balance takes Guess Me down while Pin It keeps working — check billing first if recording fails.

---

# Tech appendix (as built)

## Architecture

Static vanilla-JS frontend (Leaflet + CARTO dark tiles, two pages: `index.html` Guess Me, `game.html` Pin It) + three Vercel serverless functions. No framework, no build step. Local dev: `node dev-server.js` (serves statics with Range support so audio seeking works, and mounts the same API handlers; reads `.env`).

**Env vars** (local `.env` + Vercel): `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, optional `FEEDBACK_SECRET`.

## `/api/analyze` (POST)

Same-origin check + per-IP rate limit (30/hr, per-instance) — this endpoint spends real Groq + Claude credits. Input caps: 8MB JSON body, decoded audio 1KB–6MB.

`{audio: b64, mime}` or `{text}` →
1. **ASR**: Groq `whisper-large-v3`, `language=ar`, `temperature=0`, `verbose_json`, and a **primed dialect prompt** (a sample of colloquial Levantine/Egyptian/Gulf/Iraqi/Maghrebi speech, not an instruction — see the measurement in Guess Me above). Segments filtered: drop `no_speech_prob > 0.5`, `avg_logprob < -1.2`, known boilerplate, and anything echoing the prompt back.
2. **Classification**: `claude-opus-5`, effort `high`, structured output: `{kind, region, top_country, confidence, city, city_confidence, ranked[], evidence[], note}`. System prompt is a dialectology playbook with `cache_control`. City guesses require named evidence; capitals are never defaulted to.
3. Response includes `fb_token` (timestamped HMAC) consumed by the feedback endpoint's clip path.

Latency ~6–20s; `maxDuration: 60`.

## `/api/feedback` (POST)

Same-origin → per-IP rate limit (12/hr) → Supabase configured check (degrades to `not_configured`).

| | stored |
|---|---|
| always | guess_code, region, confidence, correct, actual_code, source, platform, consent flag |
| consent only | transcript, guess_city, actual_city |
| consent + valid `fb_token` + MIME allowlist + ≤2.5MB | audio clip → private `clips` bucket |

## `/api/scores` (GET/POST)

GET: top-20 by points for `game_type` (all nine decks); upstream failures → `not_ready`.
POST: same-origin + rate limit (40/hr) + validation: nickname 2–20 chars with profanity sanitization, exactly 5 rounds, per-round `pts ≤ 5000`, `sum(rounds.pts) === points ≤ 25000`.

## Frontend logic

**`js/app.js` (Guess Me):** MediaRecorder (45s cap, mime negotiation for iOS), waveform + mic-level meter, live-caption preview via webkitSpeechRecognition. Silent-recording detection with caption fallback. Offline fallback to the lexicon engine (`js/dialects.js`).

**`js/game.js` (Pin It):**
- `dealDeck` — one clip per region, then fills from the region with the most unused clips.
- Listening budget: `LISTEN_BUDGET_S = 60`, charged only while audio advances under playback. The budget baseline moves *before* a seek so scrubbing is free. Seek state reads `audio.seeking` (a hand-rolled flag gets stuck true, because seeking to the current position fires no `seeked` event).
- Scrubber: pointer position paints synchronously into the bar; a queued (not stacked) seek follows. Progress repaints per animation frame, falling back to `timeupdate` when frames are throttled.
- Playback window: `CLIP_WINDOW_S = 20`, starting at `clip.start` when curated, otherwise a random offset into recordings >90s.
- Scoring: `pts = km ≤ r ? 5000 : round(5000·e^{−(km−r)/decay})`, `decay = {arabic 500, hindi-urdu 500, french 700, chinese 700, accents 900, spanish 900, portuguese 900, russian 900, languages 1500}`. Multi-home clips score to the nearest accepted region.

**`js/clips.js` manifest** — one entry per clip:
```js
{ id, label, lang, url, lat, lng, r, size,
  wild?,           // spontaneous speech; dealt first
  start?,          // fixed playback offset when the opening leaks the answer
  alt?,            // other regions where this language is at home (World Languages)
  hint,            // shown on reveal
  source: { who, host, license, page, note } }
```
94 of 135 clips are mirrored locally as mono 64kbps mp3s (trimmed to ≤4 minutes); the rest hotlink Wikimedia Commons transcodes.

## Content pipeline (repeatable)

1. **Source** — Wikimedia Commons API (spoken-article projects with reader accent tags, Wikitongues oral histories, dialect sample texts like "The North Wind and the Sun"), VOA public-domain archives, ARCADE for Arabic. Never trust a sourcing agent's claim that a URL works: verify every one.
2. **Fetch + normalize** — download, extract audio (ffmpeg), mono 64k, cap at 4 minutes.
3. **Transcribe** — Groq `whisper-large-v3` with timestamps, correct language per clip. Free tier throttles at ~20 req/min: 4s spacing, 30s backoff on 429.
4. **Judge** — `claude-opus-5` (effort high, structured output) rules on: audio quality (from `avg_logprob` + coherence), **leaks** (with a clean window start where one exists), whether the target language is actually spoken, and whether the label over-claims precision. Returns `keep | window | drop`.
5. **Merge + check** — write manifest entries, then `node tools/check-decks.mjs`: homeland rule, complete source credits, files present, deck ≥5 clips. Non-zero exit on any violation.

## Supabase (`supabase/schema.sql`)

`feedback` and `scores` tables, RLS enabled with no policies (service-role only). Private `clips` storage bucket. Service key server-side only.

## P2 — Atlas (planned)

`atlas.json`: per region `{code, names, center/polygon, traits[], markers[{word, gloss}], clip_ids[], confusable_neighbors[]}` — content co-written with Claude, human-reviewed, clips reused from the game manifest. Static JSON + same map; no new backend.

## P3 — The ear (superseded, see P3b)

Original plan: fine-tune a speech-encoder head (WavLM/MMS class) on ADI-17/ADI-20 + flywheel
clips, serve on a small GPU endpoint, ensemble into `/api/analyze`.

Measured Aug 2026 and **abandoned**. An audio-native LLM reaches the same goal today with no
training, no dataset and no GPU. Building our own encoder would mean months of work to land
*behind* an API call — the published state of the art for this exact task, a purpose-built
XLS-R + Whisper-encoder + MFCC fusion model trained on 2,329 labelled recordings, scores a
median 481 km. We measured 33 km zero-shot.

## P3b — Audio-native Guess Me (next build)

Replace the cascade with a single audio call.

    now:  audio -> Whisper -> text -> Claude -> country
    next: audio -> Gemini 3.6 Flash -> { lat, lng, radius_km, evidence }

Three changes, measured on the 45 labelled Arabic clips and 20 English ones:

| | Arabic | English |
| --- | --- | --- |
| Whisper -> Claude (shipped) | 58% country | 50% |
| Gemini audio, country labels | 82% country | 80% |
| Gemini audio, coordinates | **68 km median** | not yet run |
| Gemini audio, coordinates, phone-degraded | **33 km median** | not yet run |

**Drop the transcript.** Speech-to-text deletes the accent by design; three separate attempts
to recover it downstream (phoneme recogniser on Arabic, on English, and prime-as-detector) all
measured null or negative.

**Drop countries.** Dialects do not stop at borders. Country labels scored a 14 km miss
(Ramallah answered as Jerusalem) as flatly wrong. Kilometres score it honestly, and Pin It is
already distance-scored — one metric for both halves of the app.

**Emit a point and a radius, not a label.** The model already returns 50 km for Taiz and 300 km
for Oran. That is calibrated uncertainty, and it draws a circle on the map instead of a
percentage nobody can interpret.

Verified before committing: phone-quality audio (band-limited 300-3400 Hz, 24 kbps, compressed)
scores *better* than studio, which also rules out the model having memorised these public
recordings — memorisation would collapse under degradation.

## Later — things that might improve Guess Me

- **Speak the explanation (ElevenLabs).** The model already returns evidence phrases like
  "hard g for jim" and "glottal qaf". Reading them aloud in a natural voice turns the reveal
  from a list into an explanation, and is the single cheapest way to make the app feel expert
  rather than mechanical. Explain simply — for a curious person, not a linguist.
- **Study Zay's TikToks for reference.** He does live what Guess Me does: hears an accent and
  places it, with a very high hit rate. Worth watching for two things — which features he
  names out loud when he commits to a guess, and how he phrases confidence when unsure. Both
  feed directly into the prompt, which is the strongest tuning lever measured so far.
- **Make it name the phonology it hears.** The goal is expert-linguist output: cot-caught
  merger, pin-pen merger, rhoticity, the BATH split, Canadian raising, yod-dropping. Gemini
  knows all of these from training, but the prompt never asks for them by name, so it answers
  in generalities. Naming them should be tested against tools/eval.mjs — prompt wording has
  moved accuracy more than any component swap so far (57 km -> 44 km from one edit).

- **Hallucination on empty audio.** A silent file returned "Toronto, Canada" at 75% confidence
  citing Canadian raising on the word "night". The prompt now demands a has_speech check and
  the API refuses when it is false, which catches noise but NOT silence — the model still
  claims it hears speech. Real users are protected upstream by the client mic-level check, so
  this is defence-in-depth, but a server-side energy check would close it properly.

Unranked, none blocking. Revisit when the audio-native rewrite has shipped and there is usage
data to argue from.

- **Better or cheaper models.** Only Gemini has been tested on our own clips. GPT-Audio and
  Qwen Omni are untested here; an OpenRouter key would settle it. Published third-party
  benchmarks put Gemini ahead (83.5% vs 78.6% Qwen on dialect ID) but that is someone else's
  test set, and this whole rewrite exists because an unverified default turned out to be wrong.
  Re-run the 45-clip harness whenever a new audio model ships — it costs cents.
- **Ensemble.** Two models voting, or one model sampled several times, with disagreement
  widening the confidence radius rather than being hidden.
- **Speaker embeddings alongside the LLM.** Audio LLMs are measurably weak on pure speaker
  identity (>20% EER on VoxCeleb) while ECAPA-TDNN embeddings are strong. Unproven for accent,
  but a projection layer feeding embeddings into the prompt is the obvious hybrid if accuracy
  plateaus.
- **The flywheel, repurposed.** Donated clips were originally to train our own model. Better
  use now: an evaluation set. Real phone audio from real users, labelled by correction, is what
  tells us whether accuracy holds outside broadcast recordings.
- **Prompt and elicitation.** Longer speech should help; spontaneous speech beats read speech.
  Worth testing whether the prompt shown to the user ("describe your last meal") changes
  accuracy, and whether 30 seconds beats 15.
- **Harder cases, named.** Neighbouring varieties are where it still fails: Gaza/Jerusalem
  answered as Jordan, Toronto as the US, Namibia as Kenya. These are the honest limit, not a
  bug — worth surfacing in the UI as a wider circle rather than a wrong pin.
- **City level.** 31% exact city, and misses default to the nearest capital. Coordinates plus a
  radius already communicate this better than a city name would.

## Non-goals / constraints

- Free tiers until usage forces otherwise; no framework migrations; `/api/analyze` stays under Vercel's 60s cap.
- Never store non-consented audio. Never fake confidence.
