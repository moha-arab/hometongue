# Earshot — سمعناك

Speak, and Earshot guesses your dialect, then flies the map to it. Arabic edition; more languages planned.

Works on **every device** — desktop, Android, iPhone — because recording uses MediaRecorder and analysis happens server-side.

## How it works

1. The browser records ~15–30s of free speech (no reading passage — word choice *is* the signal).
2. `/api/analyze` transcribes it with **Whisper large-v3** (Groq) and has **Claude** classify the dialect from vocabulary, morphology, and phrasing.
3. The map flies to the verdict, with evidence chips ("we caught you saying هسه") and honest confidence.

Fallbacks: no mic → type mode; API unreachable → an offline word-marker engine ([js/dialects.js](js/dialects.js)) covers Chrome/Edge via browser speech recognition.

Audio is analyzed in-memory and never stored.

## Run locally

```
node dev-server.js
```

Needs a `.env` (see [.env.example](.env.example)) with `ANTHROPIC_API_KEY` and `GROQ_API_KEY`. Without keys the site still runs in offline/fallback mode.

## Deploy (Vercel)

Import the repo — static site + one serverless function, no build step. Then set two environment variables in **Project Settings → Environment Variables**:

- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`

That's it. HTTPS (automatic on Vercel) is required for mic access.

## The flywheel

After every guess: "did I get it?" — corrections log to `localStorage` (`earshot_feedback`). In the real product this becomes labeled training data.

## Phase 2

A true acoustic model (fine-tuned wav2vec2/WavLM on ADI-17, ~3,000 hrs / 17 Arab countries) that hears the *accent itself* — then English L1 detection and Chinese regional modes on the same skeleton.
