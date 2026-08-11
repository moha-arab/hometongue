# HomeTongue — PRD (rewritten Aug 11, 2026)

Talk for about thirty seconds in any language; the map names the city you grew up in, with
an honest give-or-take radius, the dialect's footprint drawn on the map, and the accent
broken down like an ancestry chart. Second mode: guess the voice, a listening game across
seven stocked decks. Live at hometongue.me.

## Where it stands

**Launch-ready. Every gate is cleared.** The SQL is run and the usage counter is verified
incrementing, the phone pass passed, and the model choice is settled with evidence.

Measured on the 88-clip benchmark, current configuration:

| | |
|---|---|
| median error | **53 km** (published academic SOTA: 481 km) |
| calibration | truth inside the claimed circle **69%** against a claimed 70% |
| within 100 km | 57% |
| within 250 km | 72% |

## The pipeline, in order

1. **Mic gate (browser).** Counts frames that actually carried voice energy. Silence and
   room tone never reach the model, because a silent file once came back as "Toronto, 75%
   confident, Canadian raising in the word night."
2. **The read (one call, gemini-3.6-flash).** Audio in, minimal prompt, strict schema out:
   point, radius, city, region, dialect zone, language, transcript, composition, note, and
   a list of reasons.
3. **Sanity (free).** Coordinates validated, radius clamped, zone polygon angle-sorted and
   checked against the circle it claims. Absurd shapes fall back to the honest circle.
4. **The verifier (one call, gemini-3.5-flash — deliberately a different model).** Every
   claimed sound is re-checked against the audio. Failed claims never reach the card.
   A model asked to check its own work defends it; a different one has nothing to defend.
5. **The one rule (free).** A verdict must rest on at least one surviving thing the model
   actually HEARD. If everything it can point to was something the speaker said, or did
   not survive the second listen, no verdict is shown and the app asks for another take.

Two model calls per analysis. Roughly 10 to 20 seconds end to end, the swing being Google's
serving speed, not our code.

## Settled questions (do not relitigate without new measurement)

- **Time of day does not matter.** Four canary samples of 3.6-flash across the full day
  range: 309, 309, 351, 350 km on hard clips, and 1 km on control clips in all seven runs
  across both models. There is no filming window and no scheduling problem for a worldwide
  audience. Earlier advice to "film in the morning" is RETRACTED; the numbers do not
  support it.
- **gemini-3.6-flash is the right model**, decided by a same-prompt head-to-head: 53 km
  against 3.5-flash's 68 km, winning on both flagship decks (Arabic 68 vs 85, English
  accents 25 vs 70). 3.5-flash is better only on the deliberately hard tail, which is why
  it earns its place as the independent verifier.
- **Content is not the enemy.** Measured with pure text, no audio: sushi did not go to
  Japan (Seattle), fufu went to London rather than Lagos (the diaspora read), Tripoli
  neighbourhoods landed Tripoli at ±40 km. Food, neighbourhoods and regional references
  are the product working, not cheating. Only two things ever needed handling: a verdict
  resting entirely on what someone said, and invented evidence. One rule covers both.
- **Adding knowledge to the prompt has measured worse every time** (10+ attempts). Schema
  field descriptions are the safe lever; the system prompt stays minimal.

## Scale and cost

- **Two model calls per analysis.** Pennies today. The wallet is now bounded rather than
  open: past `DAILY_ANALYSES` (env var, default 20,000) the app stops answering for
  everyone and says so until the UTC day rolls over, counted in Supabase so all serverless
  instances share one number. This also makes Gemini auto-reload safe to enable.
- **Vercel Pro ($20) is optional and situational, not required.** Measured: the clip
  library is 112 MB at 64 kbps mono, a five-round game streams 4.3 MB, an analysis moves
  0.5 MB. Hobby's 100 GB covers roughly 24,000 games or 200,000 analyses per month. Worth
  buying for the month you push the video, purely so the site cannot be paused mid-spike.
- **Supabase free tier** holds roughly 2,000 donated clips before its first paid step.
- **Map tiles** come from CARTO's free basemaps. Not blocking; a keyed fallback is worth
  having eventually.

## Clips

147 in the game, 88 scored by the benchmark. The gap is deliberate: 26 language-deck clips
are pinned at country centres rather than a speaker's hometown, so scoring them in
kilometres would punish correct answers, and 33 are YouTube-embedded with no local file.

Seven decks are live. **hindi-urdu and russian sit at five clips and are hidden** behind
the "stocking" state, because a five-clip deck serves the identical game every time and
spoils itself on the second play. Sourcing more requires a sharp serving window — the
vetting gate uses the app's own model, and vetting during a dull window is exactly when
it is weakest against performed accents.

## Toronto

No scheduling constraint. Coach every stranger the same three lines: **speak your home
language, skip your name, give it about thirty seconds.** Thirty is measured, not a
guess: eight seconds scores 345 km, twenty scores 157, thirty scores 67. Press donate on
every willing voice; content and corpus in the same take.
