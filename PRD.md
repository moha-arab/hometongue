# HomeTongue — Product Requirements

*Owner: Mohammad Arab · Aug 2026 · v1*

## What this is

HomeTongue is a map-first web app about accents. You talk, and it hears where home is. It has three modes that share one map, one brand, and one idea: **your voice is a place.**

Why it exists (priority order):
1. **Resume.** A technically deep, live-demoable project: audio pipelines, LLM engineering, a real game backend, and eventually a trained speech model. A recruiter should be able to open the link, talk for 20 seconds, and see the map fly to their hometown within the first minute of an interview.
2. **Fun.** It's a party trick, a game, and a geography nerd's toy in one.
3. **Maybe viral.** If TikTok likes it, great — but the app must be worth building even if it never trends.

## The three modes

### Mode 1 — Guess Me (built, live)
You press the mic and talk naturally for 20–45 seconds. The AI guesses your dialect hierarchically — region → country → city when it has evidence — flies the map there, and shows the words that gave you away, with honest confidence. You tell it whether it was right.

- **v1 language:** Arabic only. English "Guess Me" ships later, once the acoustic model exists (English accents live in sound, not word choice).
- The reveal screen is the app's shareable moment.

### Mode 2 — Pin It (the game)
The app plays a real clip of a real speaker. You drop a pin on the map where you think they're from. Points scale with distance (GeoGuessr-style), 5 clips per round. Nickname + global leaderboard, no sign-up.

- **v1 languages:** Arabic and English clips from day 1 (curated from free labeled datasets — no AI needed for this mode).
- Difficulty tiers: Easy (guess the country/region) → Hard (city-level clips where labels exist).
- This mode can never be "wrong" — the app knows the answer. It's also the natural TikTok challenge format.

### Mode 3 — The Atlas (browse)
A map you can wander. Each region has a card: what the accent sounds like (real curated clips), its giveaway words and sounds, and how to tell it from its neighbors. Arabic and English coverage at launch.

- Think "field guide to accents." This is the geography-nerd mode and the app's depth/credibility anchor.
- Later: community-submitted clips grow the atlas (not in v1).

## The data flywheel (runs under everything)

From day 1, users can opt in (checkbox + plain-language privacy page) to donate their clip and correction ("I'm actually from Irbid") to training. Consented audio + labels go to storage. This is what eventually trains the acoustic model that unlocks English Guess-Me and city-level accuracy — the dataset nobody else has.

- Opt-in only. Non-consented audio is processed in memory and discarded, as today.
- Users can request deletion; we store no names/emails with clips.

## What v1 is NOT

- No native mobile apps (responsive web only).
- No accounts/auth (nickname-only leaderboard).
- No English Guess-Me, no acoustic model yet.
- No community uploads to the Atlas.
- No monetization.

## What "good" looks like

- **Demo test:** a stranger goes from link → talked → map flew → screenshot in under 90 seconds, on an iPhone.
- **Game test:** a player finishes a 5-clip round and starts another without being asked.
- **Atlas test:** 40+ region cards with at least 2 clips each across Arabic + English.
- **Honesty test:** country-level accuracy feels right to native speakers; city guesses appear only with evidence and never fake confidence.
- **Flywheel test:** ≥25% of Guess-Me users consent and answer "did I get it?"

## Build phases (rough effort, in working sessions)

| Phase | What ships | Effort |
|---|---|---|
| **P0 — Flywheel** | Consent checkbox, privacy page, storage for consented clips + corrections. Do first: every day without it loses data. | 1 session |
| **P1 — Pin It** | Clip curation pipeline (Arabic + English), game UI (clip player, pin drop, distance scoring, 5-round flow), nickname leaderboard. | 2–3 sessions |
| **P2 — The Atlas** | Region cards + curated clips on the explorable map (reuses P1's clip pipeline). | 1–2 sessions |
| **P3 — The ear** | Acoustic model: fine-tune a speech encoder head on ADI-17/ADI-20 + flywheel data; ensemble with the word engine; unlocks English Guess-Me. | 3–5 sessions |

Home screen becomes a mode picker (three cards) — part of P1.

## Risks and honest answers

- **"The AI got me wrong" turns people off.** Mitigated three ways: calibrated confidence + self-aware copy in Mode 1; Mode 2 flips the guessing onto the user; close-call notes make near-misses feel fair.
- **Clip licensing.** Common Voice is CC0 (safe). Speech Accent Archive is CC BY-NC-SA — fine for a free portfolio app with attribution, revisit if monetizing. ADI-17/20 audio is research-scoped: train on it, never republish its clips in the game/atlas.
- **Clip quality/label noise.** Common Voice accents are self-reported; curate manually (listen before shipping a clip) — the pipeline outputs a reviewed allowlist.
- **Scope creep.** Each phase ships alone and is useful alone. Nothing in P1–P3 blocks Mode 1, which is already live.

---

# Tech appendix

## Current stack (live)

Static frontend (vanilla JS + Leaflet/CARTO dark tiles) + one Vercel serverless function. `POST /api/analyze`: Groq whisper-large-v3 (Arabic, anti-MSA style prompt) → claude-opus-5 (effort high, cached dialectology system prompt, structured output: region/country/city + per-level confidence + evidence). Offline fallback: webkitSpeechRecognition + lexicon (`js/dialects.js`). Repo: `moha-arab/hometongue`. Deploy: Vercel, env keys `ANTHROPIC_API_KEY`, `GROQ_API_KEY`.

## New components by phase

**P0 — storage (Supabase free tier: Postgres + Storage)**
- `POST /api/feedback` — body: `{ session_id, guess, correct, actual_code, actual_city?, transcript, consent }`; if `consent && audio`, upload audio to Supabase Storage (`clips/` bucket, UUID name), row in `feedback` table. Keys server-side only (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`).
- `feedback(id, ts, guess_code, correct bool, actual_code, actual_city, transcript, clip_path nullable, ua_coarse)` — no PII columns.
- Frontend: consent checkbox on result card; wire "did I get it?" to the endpoint; `/privacy.html` in plain English.

**P1 — game**
- Clip pipeline (offline script, not serverless): pull Common Voice (accent-labeled subsets, CC0) + SAA (attributed), normalize to ~15–25s mp3/opus, manual review pass → `clips.json` manifest `{id, lang, country_code, city?, lat, lng, src, attribution}` + audio files in Supabase Storage behind CDN.
- Scoring: `points = round(5000 * exp(-km/1500))` (km = haversine pin→truth), +500 exact-country bonus; 5 clips/round, no repeats within round; seedable round IDs so two friends can play the same round.
- `POST /api/score` (nickname, round_id, points, per-clip breakdown) → `scores` table; `GET /api/leaderboard?window=week` → top N + your rank. Profanity-filter nicknames; rate-limit by IP.
- Frontend: mode picker home; game screen = audio player + pin-drop map + reveal animation (truth pin vs your pin, arc between them).

**P2 — atlas**
- `atlas.json`: per region `{code, name_en, name_ar, polygon_or_center, traits[], markers[{word, gloss}], clip_ids[], neighbors_confusable[]}` — content co-written with Claude, human-reviewed.
- Frontend: browse mode on the same Leaflet map; region cards slide in on tap; clip playback inline. No backend needed (static JSON + CDN audio).

**P3 — acoustic model**
- Fine-tune: WavLM-large (or MMS-300M) + attention-pool + linear head on ADI-17/ADI-20 (country-level), then continue on flywheel clips. Train on rented GPU (Colab/Modal, hours not days). Eval: held-out by-speaker split, report per-country F1 + calibration curve — publish the eval in the repo README (resume artifact).
- Serve: Modal/HF endpoint, `POST audio → {country_probs}`; ~1s/clip.
- Ensemble: `/api/analyze` sends Claude the transcript + acoustic probs; prompt instructs arbitration (acoustic-dominant for English, word-dominant for Arabic until English head matures).
- Unlocks: English Guess-Me; city-level heads once flywheel data crosses ~1–2k labeled clips/city.

## Non-goals / constraints

- Stay on free tiers until usage forces otherwise (Vercel, Supabase, Groq free, Claude ~1¢/analysis).
- No framework migration; vanilla JS is fine at this scope.
- Keep `/api/analyze` under 60s Vercel cap (currently ~10–20s worst case).
