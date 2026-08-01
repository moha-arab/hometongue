# HomeTongue — Product Requirements

*Owner: Mohammad Arab · v2.0 · updated 2026-08-01 (v1 written same day; this version reflects as-built reality)*

## Status snapshot

| Piece | Status | Where |
|---|---|---|
| Guess Me (Arabic dialect AI) | ✅ live | [/](https://lahja-blush.vercel.app/) |
| Pin It — Arabic Dialects (51 cities) | ✅ live | [/game.html](https://lahja-blush.vercel.app/game.html) |
| Pin It — World Languages (33) + English Accents (21) | ✅ live | same |
| Data flywheel (consent clip donation) | ✅ live, collecting | Supabase |
| Nickname leaderboard | ✅ live | `/api/scores` |
| Domain hometongue.me | ✅ DNS configured, propagating | Namecheap → Vercel |
| The Atlas (mode 3) | ⏳ next (P2) | — |
| Acoustic model / English Guess-Me | ⏳ P3 | — |

## What this is

HomeTongue is a map-first web app about accents: **your voice is a place.** Three modes share one map and one brand.

Why it exists (priority order):
1. **Resume.** Technically deep and live-demoable: audio pipelines, LLM engineering with calibrated structured output, a dataset-curation pipeline with automated QC, a game backend, and (P3) a trained speech model. A recruiter goes from link → talked → map flew to their hometown in under 90 seconds.
2. **Fun.** A party trick, a geography game, and a field guide in one.
3. **Maybe viral.** Welcome, not required.

## The modes (as built)

### 🎙 Guess Me — live
Talk naturally in Arabic for ~20–45s. The engine guesses hierarchically — region → country → **city when evidence exists** — flies the map there, and shows the giveaway words with honestly calibrated confidence. Users answer "did I get it?" and can correct with country + city.

Working today: hierarchical verdicts (e.g. Saudi 86%, "Najd (Riyadh/Qassim)"), evidence chips quoting the transcript, "what we heard" transcript display, close-call honesty (Jordanian vs Palestinian flagged as coin-flip). Defenses shipped after real-user testing: Whisper-hallucination filtering (silence produces YouTube boilerplate like اشتركوا في القناة — filtered by segment confidence + phrase scrub), client-side silent-mic detection, and automatic fallback to the live-caption transcript when the recorder tapes a dead microphone.

**Type mode**: a full no-mic path — "type like you talk" textarea (RTL) with 7 one-tap sample texts (Egyptian, Jordanian, Syrian, Iraqi, Saudi, Moroccan, Fuṣḥa). It's also the automatic fallback when recording is unsupported or the mic is blocked.

Detection is **word-based** (vocabulary/morphology/phrasing), not acoustic — that ceiling holds until P3. No reading passage, ever: free speech is the signal.

### 📍 Pin It — live
Hear a real clip, drop a pin, score by distance. 5 rounds, 5,000 max each, three game types:

- **🕌 Arabic Dialects** — the flagship. Real local radio; players pin the *city*. 51 cities across 18 countries including Aleppo, Damascus, Amman, Irbid, Gaza, Jerusalem, Hebron, Cairo, Casablanca, Baghdad, Sanaa. As far as we know, the only playable experience anywhere built on city-level Arabic speech.
- **🌍 World Languages** — a random language plays (Kazakh, Uzbek, Yoruba, Tagalog…); pin it anywhere on Earth.
- **🗣 English Accents** — same paragraph read by speakers from London to Kingston to Singapore; pin the speaker's origin.

Shared mechanics: country-aware deck dealing (no three-Algerian-cities rounds), replay limit (3 listens), 20s playback window with random offsets into long recordings, reveal with distance + points + clip attribution + hint, nickname leaderboard per game type. Wrong answers can't embarrass the app here — it knows the truth.

### 🗺 The Atlas — next (P2)
A browsable map of accents: tap a region, get a card — what the accent sounds like (real clips), its giveaway words, how to tell it from neighbors. Launches on curated open-data clips (the game's manifest is already the seed); community submissions are a later phase.

## The data flywheel (as built)

Runs under Guess Me. By default **nothing identifying is kept**: no consent = an anonymous scorecard only (guessed country vs corrected country, confidence, device class — no words, no audio, no cities). Ticking "donate this clip" stores the recording + transcript + correction (including city) for model training. Enforced server-side and stated in plain words at [/privacy.html](https://lahja-blush.vercel.app/privacy.html); deletion requests via GitHub issues.

Anti-abuse: clips are only accepted with a fresh HMAC token minted by the analyze endpoint itself (bots can't stuff the bucket), same-origin checks and per-IP rate limits on **all three** endpoints (analyze included — it spends real API credits), MIME allowlist, size caps. Console spending caps remain the final backstop.

Why it matters: research sweep (2026-08-01) confirmed **no public speech dataset separates city-level Arabic** (ARCADE, published Jan 2026, is the first attempt: minutes per city; nothing covers Homs at all; only the tiny text corpus Nabra separates Halabi from Homsi). A few thousand consented user clips would be the largest resource of its kind — the moat, and plausibly a workshop paper (NADI/ArabicNLP).

## What "good" looks like

- **Demo test** ✅ passing: link → talk → map flies, on a phone, under 90s.
- **Game test** ✅ passing: full rounds play end to end with scoring and reveals.
- **Honesty test** ✅ passing by design: city guesses only appear with evidence; confidence is calibrated, not theatrical.
- **Atlas test** ⏳: 40+ region cards, 2+ clips each (P2).
- **Flywheel test** ⏳ measuring: ≥25% of Guess-Me users consent and answer.

## Explicitly not built (and honest about it)

- English/other-language **Guess Me** (needs the acoustic model — text barely distinguishes English accents)
- The Atlas, community clip submissions, native mobile apps, accounts/auth, monetization
- Deferred game features: seedable shared rounds ("play my round"), difficulty tiers, polygon scoring for multi-country languages (generous radius instead)
- Leaderboard score submission is client-trusted (sum-validated but forgeable) — acceptable while stakes are bragging rights

## Build phases

| Phase | What | Status |
|---|---|---|
| P0 — Flywheel | Consent + privacy page + Supabase storage + anti-abuse | ✅ shipped & prod-verified 2026-08-01 |
| P1 — Pin It | Three game types, curation pipelines, leaderboard | ✅ shipped 2026-08-01 |
| P2 — Atlas | Region cards + clips on the explorable map (reuses clip manifest) | next, 1–2 sessions |
| P3 — The ear | Acoustic model fine-tune, ensemble with word engine, unlocks English Guess-Me + city-level acoustics | 3–5 sessions, best started once flywheel has data |

## Risks and open questions

- **Licensing per source** (all attribution shown in-product): Wikimedia Commons clips CC BY-SA/CC0, hotlinked. SAA clips CC BY-NC-SA, mirrored with attribution. ARCADE clips CC BY 4.0, mirrored with attribution. One VOA Swahili clip, US government work / public domain, hotlinked. **NC terms on SAA mean revisit before any monetization.**
- **Dataset quality**: every game clip passed an automated Whisper QC gate (transcribe → require real Arabic/speech, reject music and hallucinations). Label noise from ARCADE's radio-station-city assumption remains possible; user feedback will surface bad clips.
- **Trust in Guess Me**: mitigated three ways — calibrated confidence, self-aware copy, and the game modes carrying the fun when the AI misses.
- **Single-maintainer attention** is the biggest real risk. Each phase ships alone and stays useful alone.
- **Costs**: ~1¢ per Guess-Me analysis (Claude) + Groq free tier; game clips are static files. Spending caps in both consoles recommended before promotion.

---

# Tech appendix (as built)

## Architecture

Static vanilla-JS frontend (Leaflet + CARTO dark tiles, two pages: `index.html` Guess Me, `game.html` Pin It) + three Vercel serverless functions. No framework, no build step. Local dev: `node dev-server.js` (serves statics + mounts the same API handlers; reads `.env`).

**Env vars** (local `.env` + Vercel): `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, optional `FEEDBACK_SECRET` (HMAC secret override; falls back to `ANTHROPIC_API_KEY`, then `SUPABASE_SERVICE_KEY` — with none set, clip donation silently never validates).

## `/api/analyze` (POST)

Same-origin check + per-IP rate limit (30/hr, per-instance) — this endpoint spends real Groq + Claude credits. Input caps: 8MB JSON body, decoded audio 1KB–6MB.

`{audio: b64, mime}` or `{text}` →
1. **ASR**: Groq `whisper-large-v3`, `language=ar`, anti-MSA style prompt, `verbose_json`. Segments filtered: drop `no_speech_prob > 0.5`, `avg_logprob < -1.2`, and known boilerplate phrases (hallucination scrub).
2. **Classification**: `claude-opus-5`, effort `high`, structured output (JSON schema): `{kind, region, top_country, confidence, city, city_confidence, ranked[], evidence[], note}`. System prompt is a dialectology playbook (region/country/city marker tables, phonology-in-spelling rules, ASR-artifact awareness, strict calibration rules) with `cache_control` so repeat calls hit the prompt cache. City guesses require named evidence; capitals are never defaulted to.
3. Response includes `fb_token` (timestamped HMAC) consumed by the feedback endpoint's clip path.

Latency ~6–20s; `maxDuration: 60`.

## `/api/feedback` (POST)

Same-origin check → per-IP rate limit (12/hr, per-instance) → Supabase configured check (degrades to `not_configured`; frontend keeps localStorage-only behavior).

Consent semantics (privacy.html is the contract):
| | stored |
|---|---|
| always | guess_code, region, confidence, correct, actual_code, source, platform, consent flag |
| consent only | transcript, guess_city, actual_city |
| consent + valid `fb_token` + MIME allowlist + ≤2.5MB | audio clip → private `clips` bucket, path + mime on the row |

Errors are logged server-side, never echoed. Oversized bodies destroy the stream and 413.

## `/api/scores` (GET/POST)

GET: top-20 by points for `game_type` (`arabic | languages | accents`); upstream failures → `not_ready`.
POST: same-origin + rate limit (40/hr) + validation: nickname 2–20 chars with profanity sanitization, exactly 5 rounds, per-round `pts ≤ 5000`, `sum(rounds.pts) === points ≤ 25000`. Returns rank via PostgREST count. Known limitation: client-trusted submission.

## Frontend logic

**`js/app.js` (Guess Me):** MediaRecorder (45s cap, mime negotiation for iOS), waveform + rolling mic-level meter, live-caption preview via webkitSpeechRecognition where available. Silent-recording detection: if peak level < threshold and captions caught ≥8 chars → analyze caption text instead (toast explains); if server returns `no_speech` with captions available → same fallback. Double-tap re-entry guard; offline fallback to the lexicon engine (`js/dialects.js`, ~120 weighted markers, 15 countries + MSA). Consent checkbox visible only when a clip exists; correction form = country select + optional city text.

**`js/game.js` (Pin It):** country-aware dealing (one clip per country per lap), HTTP-cache warming for clips ≤3MB at deal time, metadata preload per round, playback window 20s with random offset into recordings >90s, listens counted only when audio actually starts, `NotAllowedError` retry UX, replacement clip on hard audio failure, haversine scoring `pts = km ≤ r ? 5000 : round(5000·e^{-(km−r)/1500})`, reveal with truth pin + dashed arc, leaderboard post/load.

**`js/clips.js` manifest:** `{id, label, lang, url, lat, lng, r, size, hint, attribution}` per clip. Sources: Commons (hotlinked mp3 transcodes), SAA (mirrored `/clips/*.mp3`), ARCADE (mirrored `/clips/ar/*.mp3`), plus one VOA Swahili clip (US government work, public domain, hotlinked).

**Local storage (on-device only):** every "did I get it?" answer is also logged to the user's own browser (`hometongue_feedback`, transcript included) regardless of consent — never leaves the device. The consent checkbox choice persists across visits (`ht_consent`), so returning donors stay opted in until they untick it.

## Content pipeline (repeatable — scripts in session scratchpad)

1. **Sweep**: page ARCADE metadata via HF datasets-server; filter `Keep` + `sure` + non-MSA + ≥18s + non-music → 3,023 eligible across 55 cities.
2. **Select**: one clip per city with coordinates (52-city coords table), preferring single-speaker + longer.
3. **QC gate**: download → Groq Whisper transcription → require ≥40 chars, >45% Arabic characters, confident segments; rejects music beds and hallucinated boilerplate. Groq free-tier throttling handled (4s spacing + 30s backoff on 429).
4. **Emit** manifest entries with cleaned labels (Algiers not alger, UAE not United_Arab_Emirate) and attribution; prune rejected files.

Result: 51/52 cities passed (1 music clip culled). Same recipe extends to more clips per city or new sources.

## Supabase (`supabase/schema.sql`)

`feedback` and `scores` tables, RLS enabled with no policies (service-role only). Private `clips` storage bucket. Service key lives server-side only.

## P2 — Atlas (planned)

`atlas.json`: per region `{code, names, center/polygon, traits[], markers[{word, gloss}], clip_ids[], confusable_neighbors[]}` — content co-written with Claude, human-reviewed, clips reused from the game manifest. Static JSON + same map; no new backend.

## P3 — The ear (planned)

Fine-tune a speech-encoder head (WavLM/MMS class) on ADI-17/ADI-20 (country-level) + flywheel clips; serve via small GPU endpoint (~1s/clip); ensemble in `/api/analyze` (Claude arbitrates transcript evidence + acoustic probabilities). Unlocks English Guess-Me (acoustics are the only signal for English accents) and eventually city-level acoustic ID as flywheel data accrues. Publish the eval (by-speaker split, per-country F1, calibration curve) in the repo.

## Non-goals / constraints

- Free tiers until usage forces otherwise; no framework migrations; `/api/analyze` stays under Vercel's 60s cap.
- Never store non-consented audio. Never fake confidence.
