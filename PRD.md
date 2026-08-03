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

## P3 — The ear (planned)

Fine-tune a speech-encoder head (WavLM/MMS class) on ADI-17/ADI-20 (country-level) + flywheel clips; serve via a small GPU endpoint (~1s/clip); ensemble in `/api/analyze`. Unlocks English Guess-Me and eventually city-level acoustic ID. Publish the eval (by-speaker split, per-country F1, calibration curve) in the repo.

## Non-goals / constraints

- Free tiers until usage forces otherwise; no framework migrations; `/api/analyze` stays under Vercel's 60s cap.
- Never store non-consented audio. Never fake confidence.
