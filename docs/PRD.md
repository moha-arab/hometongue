# HomeTongue — PRD (updated Aug 9, 2026)

Talk for ~30 seconds in any language; the map finds where you grew up, with an honest
give-or-take radius, the dialect zone painted on the map, and the accent mix by ear.
Second mode: guess-the-voice, a listening game across nine decks. Live at hometongue.me.

## Status: ready for launch, two gates open

1. **Gemini credits are empty — the analyzer is down until the account is topped up.**
   Size the top-up generously and set a billing alert at ~50%.
2. Mohammad confirms scrolling on his actual iPhone (fix shipped Aug 9, phones self-update
   on next open).

Everything else is done: all 147 game clips leak-audited at the windows they actually play,
famous voices removed, leaderboard hardened against forged scores, city-always headline,
diaspora story in the note, logo + share image live.

## The engine, in plain words

One model, the whole time: **gemini-3.6-flash**, audio straight in, no transcription.
It has never been switched. Measured on our own 90-clip benchmark it is roughly 10x better
than the best published research (37–51 km median vs 481 km academic SOTA) — with zero
donated clips involved.

**Its accuracy breathes with Google's load** (proven Aug 8–9: same test scored 37–51 km at
4 AM, 69 km at 5 PM, 47 km at 1 AM). Google serves the model sharper off-peak. We cannot
control this; we can only see it and schedule around it. Even the dull hours are ~7x better
than published SOTA — users who never saw the sharp version experience "very good," not
"broken."

**Rules that follow:**
- Film / demo in the morning. Off-peak = the sharp model.
- Before any filming session, run the 3-minute pre-flight: `node tools/canary.mjs`.
  It literally prints SHARP / MIXED / COARSE. (A "canary" is a smoke detector: a tiny fixed
  test whose only job is to notice when Google's serving quality changes before users do.)
- No standing monitoring loops. The canary runs manually, before it matters.
- Any measurement that would cost real money (full evals, model comparisons, pro-tier
  anything) gets a cost estimate BEFORE it runs, not after the balance finds out.

Model roadmap and every alternative considered (switching providers, self-hosting,
fine-tuning) are in `docs/architecture-research-2026-08-09.md`. Conclusion: keep this
engine; nothing on the market comes close.

## Donated clips — what they are and are not

Donations do **not** train, change, or replace Gemini. Gemini stays the judge. Donations are:

1. **Today:** a test set with known answers — the only way to measure accuracy on real
   phone-mic voices instead of YouTube audio.
2. **Later (at ~2–5k clips):** a reference library the same Gemini consults — "this voice
   sits closest to three known Aleppo speakers" — which the research identifies as the only
   demonstrated path below ~30 km, and a moat nobody can copy.

**Bad donations are expected and survivable.** Someone speaking Gulf Arabic who claims
Lisbon: (a) every donation is auto-scored against the model at intake — a huge mismatch gets
quarantined for review, never trusted; (b) in the reference library, one wrong voice among
many right ones gets outvoted by its neighbours; (c) nothing from a single donation is ever
presented as truth. Label hygiene at intake (ground-truth city, "did you grow up there?",
age-0-12 flag) matters more than volume.

## Quality-first sequence (freeze lifted Aug 10 on Mohammad's call: good before fast)

The bar: genuinely good, then Toronto, then TikTok. Shipped against that bar:
- **Evidence verifier, live.** Every card's acoustic claims are re-checked by a different
  model (3.5-flash) asked narrow questions twice in parallel; a chip dies only on
  unanimous false and fades off the card. Probed twice before shipping: kills real
  fabrications (it executed a live classical-Qaf confabulation), keeps every substantive
  true chip (39-chip probe, 2 fluff casualties, both controls intact).
- Composition grain rule: probed before shipping (components must not claim finer than
  their cue) — see eval notes for the verdict.

## Scale readiness (audited Aug 10)

- **Vercel Hobby will not survive virality — upgrade to Pro before posting.** Each
  analysis moves ~1 MB through serverless functions (audio up + verifier re-check) and
  each game round streams ~1 MB of clips. Hobby's 100 GB/month dies in one big day
  (100k analyses ≈ 100 GB). Pro ($20/mo, 1 TB) is the single mandatory pre-launch spend.
- **Gemini spend:** ~$0.001–0.002 per analysis including the verifier. 10k analyses/day
  ≈ $15–25/day; 100k/day ≈ $150–250/day. Size the prepaid balance to the ambition and
  set the billing alert at 50% — the site died once already from an empty balance.
- **Supabase free tier:** ~1 GB storage ≈ roughly 2,000 donated clips. Upgrade at ~1,500
  donations ($25/mo). Scores/feedback tables are nowhere near any limit.
- **Map tiles:** CARTO's free basemaps are usage-limited; a viral day risks throttled or
  blank maps. Not blocking, but have a keyed fallback ready (MapTiler or Stadia account —
  needs Mohammad, ~free tier then $20-ish). Worth doing before posting.
- Per-IP rate limiting exists on every endpoint (hourly buckets, per-instance) — a speed
  bump, not a wall, which is the right posture for a consumer app.

## Shoot-day runbook

- Night before: full pass on the real phone — record, result, donate, answer, one game
  round. Any friction is the only thing that pierces the freeze.
- Credits topped up; billing alert at ~50%.
- Film in the MORNING (sharp serving hours, measured). Run `node tools/canary.mjs` over
  breakfast; go when it prints SHARP.
- Coach every stranger, same three lines: speak your home language · skip your name ·
  give me thirty seconds. Thirty is measured, not vibes: short takes fall to the koine
  basin, long takes reach the consonants.
- Press donate on every willing voice — content and corpus in one take.
