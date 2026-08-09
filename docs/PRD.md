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

## Toronto checklist (his side)

- Top up Gemini credits; set the billing alert.
- Open the site once on the phone (it self-updates), confirm scroll.
- Morning of: run the pre-flight, film in SHARP hours.
- Coach strangers: speak your home language, skip your name, ~30 seconds.
- Every willing stranger: donate the clip. Content and corpus in one take.
