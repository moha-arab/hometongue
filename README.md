# HomeTongue — سمعناك

Your voice is a place. Two modes live today:

- **🎙 Guess Me** — speak Arabic for ~20s and the AI guesses your dialect (region → country → city when it has evidence), then flies the map home.
- **📍 Pin It** ([game.html](game.html)) — GeoGuessr for ears: hear a real clip, drop a pin. Two game types: **World Languages** (33 languages, from Kazakh to Yoruba) and **English Accents** (21 speakers, London to Kingston). Distance scoring, 5 rounds, nickname leaderboard.

A third mode (**The Atlas**, a browsable accent map) is planned — see [PRD.md](PRD.md).

Works on **every device** — desktop, Android, iPhone — because recording uses MediaRecorder and analysis happens server-side. Game clips stream directly from their public archives (Wikimedia Commons, Speech Accent Archive) with attribution after every round.

## How Guess Me works

1. The browser records ~15–30s of free speech (no reading passage — word choice *is* the signal).
2. `/api/analyze` transcribes it with **Whisper large-v3** (Groq) and has **Claude** classify the dialect from vocabulary, morphology, and phrasing.
3. The map flies to the verdict, with evidence chips ("we caught you saying هسه") and honest confidence.

Fallbacks: no mic → type mode; API unreachable → an offline word-marker engine ([js/dialects.js](js/dialects.js)) covers Chrome/Edge via browser speech recognition. Whisper hallucinations on silent/near-silent recordings are filtered via segment confidence (`no_speech_prob` / `avg_logprob`) plus a boilerplate scrub, the client detects silent mics, and if the recorder taped silence while live captions caught the words, the captions are analyzed instead.

Audio is analyzed in-memory and never stored (unless the user opts in — see below).

## Run locally

```
node dev-server.js
```

Needs a `.env` (see [.env.example](.env.example)) with `ANTHROPIC_API_KEY` and `GROQ_API_KEY`. Without keys the site still runs in offline/fallback mode.

## Deploy (Vercel)

Import the repo — static site + one serverless function, no build step. Then set two environment variables in **Project Settings → Environment Variables**:

- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`

Redeploy after adding them. HTTPS (automatic on Vercel) is required for mic access.

## The flywheel

After every guess: "did I get it?" — corrections always log locally, and with the **donate this clip** checkbox ticked, the clip + correction go to Supabase as future training data (see [privacy.html](privacy.html)). Without Supabase configured the app still works; feedback just stays local.

### Flywheel setup (~5 min, one time)

1. Create a free project at supabase.com.
2. SQL Editor → paste [supabase/schema.sql](supabase/schema.sql) → Run. (Both blocks: the `feedback` table for the flywheel and the `scores` table for the game leaderboard.)
3. Storage → New bucket → name it `clips`, keep it **private**.
4. Settings → API: copy the Project URL and the **service_role** key (not anon).
5. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to `.env` (local) and Vercel env vars, redeploy.

The game leaderboard (`/api/scores`) uses the same Supabase project and degrades gracefully until the `scores` table exists.

## Phase 2

A true acoustic model (fine-tuned wav2vec2/WavLM on ADI-17, ~3,000 hrs / 17 Arab countries) that hears the *accent itself* — then English L1 detection and Chinese regional modes on the same skeleton.
