# Eval notes — 2026-08-04

First full run of `tools/eval.mjs`, gemini-3.6-flash, 137 clips, 0 failures.
Overall median 83 km. Published SOTA for this task is 481 km.

| deck | n | median | <100km |
| --- | --- | --- | --- |
| accents (English) | 20 | 21 km | 80% |
| hindi-urdu | 5 | 0 km | 60% |
| chinese | 9 | 38 km | 67% |
| arabic | 45 | 68 km | 58% |
| french | 7 | 83 km | 57% |
| languages | 26 | 201 km | 27% |
| portuguese | 8 | 343 km | 38% |
| spanish | 11 | 345 km | 27% |
| russian | 6 | 632 km | 33% |

## Three of the weak decks are label problems, not model problems

`languages` is pinned at COUNTRY CENTROIDS, not the speaker's city — Persian sits at
(32.5, 53.7), the middle of Iran. The model answered "Tehran" and was scored 414 km wrong
for it. Same for Turkish -> Istanbul, Uzbek -> Tashkent, Korean -> Seoul, Japanese -> Tokyo.
Those are correct answers being punished by coarse truth. That deck's kilometres mean
nothing until the clips are re-pinned to where the speaker is actually from.

`spanish` and `portuguese` mix city labels (Paniahue, Porto Alegre) with country labels
(Argentina, Mexico, Mozambique) pinned at a capital. Same inflation, smaller.

## Two are real limits worth stating

`russian` 632 km is genuine. Russian has unusually little regional variation and the country
is enormous — Zima (Siberia) was answered "Moscow", 3980 km. No amount of listening fixes a
dialect that does not vary.

Caribbean Spanish: Puerto Rico answered as Havana, 1766 km. Dialectally that is nearly
right; geographically it is not. Islands punish this metric.

## Calibration

Truth fell inside the model's own stated radius on 81/137 = 59%, against a 70% target. It is
mildly overconfident about the radius. Worth widening slightly in the prompt.

Confidence numbers from this run are UNUSABLE: the harness schema declared `confidence` as a
bare integer with no scale, so the model answered 0-10 on 104 clips and 0-100 on 33. Fixed —
the harness schema now matches api/analyze.js field for field. Re-run before trusting any
confidence analysis.

## Next

- Re-pin the `languages` deck to real speaker origins, or drop it from km scoring.
- Widen the radius guidance in the prompt and re-measure calibration.
- Rerun with the fixed schema.

# Run 2 — 2026-08-04, shared prompt + widened radius

111 clips (languages deck excluded), 0 failures.

| deck | n | median | <100km | <250km |
| --- | --- | --- | --- | --- |
| hindi-urdu | 5 | 0 km | 60% | 60% |
| chinese | 9 | 11 km | 78% | 100% |
| arabic | 45 | 28 km | 64% | 80% |
| accents (English) | 20 | 28 km | 75% | 80% |
| french | 7 | 35 km | 71% | 71% |
| portuguese | 8 | 339 km | 50% | 50% |
| spanish | 11 | 345 km | 18% | 36% |
| russian | 6 | 632 km | 17% | 33% |
| **OVERALL** | **111** | **44 km** | **59%** | **71%** |

Overall median 57 km -> 44 km from the prompt change alone. Arabic 68 -> 28,
Chinese 38 -> 11, French 83 -> 35. Nothing else changed: same model, same clips,
same metric. This is the third time prompt wording has moved results more than any
component swap, and it is now the main tuning surface.

## Calibration is fixed

Truth inside the model's own stated radius: 59% -> **72%**, against its stated 70%.
Median radius 200 km. Naming the failure mode explicitly ("most models get this wrong
by being too brave") plus concrete distance bands did it.

Confidence values now span 65-100 instead of the bimodal 4-10 / 75-100 junk from the
drifted schema.

## Still weak, and they are not the same problem

- **russian 632 km** — genuine. Russian varies little regionally across an enormous
  country. Zima (Siberia) answered "Moscow". Not fixable by prompting.
- **spanish 345 km / portuguese 339 km** — mixed labels. Several clips are tagged
  only "Argentina" or "Mozambique" and pinned at a capital, so a correct regional
  answer still scores as a large error. Worth re-labelling the country-level ones to
  actual speaker cities before trusting these two numbers.
- One clip is likely mislabelled the other way: accents/"Amritsar, Punjab" is
  Vajpayee's 2000 US Congress address, and the model answered Gwalior — his actual
  birthplace. The model may be more right than the label.

# Deck design: which languages support a city-level round

Judgment call, 2026-08-04, from the eval plus known dialectology.

**City-level works** — Arabic, English, German, Italian, Norwegian. The Levantine result is the
proof: Aleppo 0 km, Beirut 0 km, Damascus 1 km, Amman 2 km, Jerusalem 12 km. Those cities are
all within 300 km and all Levantine Arabic, and every clip landed in the right city or the
next one over.

**City-level does NOT work, so scope these decks to countries or regions:**
- Russian across Russia. Soviet schooling, broadcasting and internal migration levelled it.
  Surviving regional dialects are rural and elderly. Moscow vs Novosibirsk is a coin flip —
  the model answered "Moscow" for a Siberian speaker, 3980 km off, and was not wrong to.
  RE-SCOPED: the deck is now the Russian-speaking WORLD (Odesa, Almaty, Tbilisi, Minsk,
  Moscow, Petersburg), where Ukrainian, Kazakh, Georgian and Belarusian substrate is audible.
- Polish — post-1945 population transfers erased regional dialects.
- Hebrew — revived language, small country, one dominant standard.
- Turkish — heavily levelled toward the Istanbul standard.
- French inside France — the Parisian norm dominates. Québec vs France is enormous; Lille vs
  Lyon is faint.
- Standard Mandarin — putonghua itself is levelled, though Sichuan and Dongbei accents are not.

The rule: a deck is only fair if the accents genuinely differ. Where they do not, widen the
deck rather than delete it — the Russian-speaking world is a good round, Russian cities is not.

# Run 3 — the expert-linguist prompt, REVERTED

Rewrote the prompt to name phonological variables explicitly: rhoticity, cot-caught,
TRAP-BATH, FOOT-STRUT, PIN-PEN, Canadian raising, KIT centralisation for English; qaf and
jim reflexes, interdentals, imala for Arabic; equivalent sets for Spanish, French,
Portuguese, Russian, Chinese and Hindi-Urdu. Added a five-step method (language, consonants,
vowels, prosody, place) and asked evidence to name the variable and what it rules out.

It reads far better. It measures worse.

Paired on the same 106 clips:

| | median | <100km | <250km |
| --- | --- | --- | --- |
| short prompt | **37 km** | **62%** | **74%** |
| expert prompt | 49 km | 58% | 71% |

Better on 7 clips, worse on 18, unchanged on 81. Arabic regressed hardest, 28 -> 71 km.

REVERTED. The likely cause is that naming variables turns listening into checklist-matching:
the model looks for the features it was handed instead of using everything it hears, which is
the same failure as the hand-written dialect playbooks (43 -> 69 km). Twice now, giving this
model MORE domain knowledge has made it worse. Its own latent knowledge beats anything written
for it.

French (8 km) and Portuguese (1 km) did improve, so a per-language prompt is not ruled out —
but a global expert prompt is.

# Run 4 — the Syria specialist route (shipped, opt-in only)

A researched Syria-only appendix, reachable at hometongue.me/?expert=syria and nowhere else.
Every claim looked up and cross-referenced; claims that failed checking were cut, not softened.

## It cannot be validated on Syria

The benchmark holds two Syrian clips and the general prompt already scores 0.45 km and 1.3 km.
With the route: 0 km and 1.3 km. There is no headroom to win. Only a human who speaks the
dialect can judge whether the route is better, and that is now Mohammad's call, not the eval's.

## What the eval CAN say, and it is the interesting part

Arabic deck, n=45: 28 km -> 43 km median, better on 1, worse on 5.

No false Syria pull — not one non-Syrian clip was answered as Syria or Lebanon. The prompt's
"ignore this section unless Levantine" instruction held. So the damage is not topical bleed.

Every regression is the model retreating to a coarser, more canonical answer:

| clip | general | +syria | answered |
| --- | --- | --- | --- |
| Basra, Iraq | 0 km | 448 km | Baghdad |
| Manama, Bahrain | 10 km | 434 km | Kuwait City |
| Ajman, UAE | 28 km | 858 km | Kuwait City |
| Tangier, Morocco | 216 km | 294 km | Casablanca |
| Oran, Algeria | 184 km | 323 km | "Northern Algeria" (no city at all) |

## The mechanism, now identified

Basra (448 km) and Manama (434 km) broke by the SAME amount under the global expert prompt in
run 3. A Syria-only appendix contains zero claims about Iraq or Bahrain, yet does identical
damage. So the cause is not the content of the notes. It is their PRESENCE.

A long specialist preamble dilutes attention. Outside the region it covers, the model stops
discriminating finely and falls back to the country's most obvious city. That single mechanism
explains run 3 and run 4, and it predicts that ANY per-language prompt will coarsen every
language it does not cover — which is the answer to whether per-language routing is worth
building. It is not, unless the routing is exact, and exact routing needs a language-detection
call that does not fit inside the 60 s Vercel cap.

## Standing rule

An expert appendix may ship as an opt-in route. It must never become the default, and it must
never be applied to a language it was not written for.

# Run 5 — the deep Syria route, and a correction to run 4's conclusion

First attempt at this run was invalid: the eval's resume cache replayed all 45 answers from
run 4 and made no API calls. Caught only because the evidence strings were byte-identical
across two different prompts. The cache is now keyed to a hash of the prompt text. Re-ran for
real.

Arabic deck, n=45:

| prompt | median | <100km | <250km |
| --- | --- | --- | --- |
| general (no appendix) | **28 km** | **64%** | **80%** |
| syria, shallow, no ordering rule | 43 km | 58% | 69% |
| syria, deep, place-first rule | 38 km | 62% | 78% |

## The ordering rule is what mattered, not the research depth

Run 4 concluded the damage came from an appendix's PRESENCE rather than its content, because
a nine-language prompt and a Syria-only appendix broke Basra and Manama by identical amounts.
That was true of those two prompts but the generalisation was wrong. Adding one instruction —
place the speaker first the normal way, then read the notes only to sharpen, never to
override — recovered most of it:

| clip | general | shallow | deep + ordering |
| --- | --- | --- | --- |
| Basra, Iraq | 0 km | 448 km | **0 km** |
| Manama, Bahrain | 10 km | 434 km | **1 km** |
| Tangier, Morocco | 216 km | 294 km | 222 km |
| Ajman, UAE | 28 km | 858 km | 858 km (not fixed) |
| Oran, Algeria | 184 km | 323 km | 350 km (not fixed) |

Three of the five retreat-to-a-bigger-city failures reversed completely. So the coarsening is
caused by the notes competing with the model's own judgement for primacy, and telling it
which comes first is a real, cheap countermeasure. That is the transferable finding: any
future specialist route must carry the place-first instruction or it will coarsen everything
it does not cover.

## Still a net cost outside the Levant

38 km against the general prompt's 28 km, better on 2 clips and worse on 4. The route stays
opt-in and must not become the default.

## Levant and Syria

Damascus 1 -> 0 km, Aleppo 0 -> 0 km, Beirut 0 km, Amman 2 km. Gaza 61 -> 0 km is the largest
single gain anywhere in the run. Jerusalem regressed 12 -> 68 km, answered as Amman, and
Nablus stayed at 68 km, also Amman — the notes' southern-Levantine material is thinner than
the Syrian material and it shows.

The two Syrian clips remain at the ceiling, so this run STILL cannot say whether the route is
better at Syria. That question needs a speaker of the dialect, or more Syrian clips.

# Sourcing a Syrian benchmark from YouTube — stopped, and why

Goal: Syrian sub-regional clips the model had no hand in choosing, so the Syria route could
finally be measured. Twelve places, blind quality-only gate, labels from the source video.

Result: 2 accepted, 21 rejected. Both accepted clips are Damascus. Ten of twelve places empty.

The rejection breakdown is the finding:

     11  audio fetch failed
      4  broadcaster channel
      2  not natural speech
      1  speaker states their own origin
      1  reporter or narrator
      1  international newsroom

Over half were fetch failures, and they are not a code bug. Diagnosed by re-testing a video
that had downloaded fine ten minutes earlier: same URL, same command, same machine, now 460
bytes and an empty file. YouTube is rate-limiting the IP after a few dozen requests. yt-dlp is
current (2026.03.17), --force-keyframes-at-cuts is not the cause, seeking early instead of
35% in does not help, and the android player client does not carry the format.

I spent two rounds rewriting search queries — first toward street interviews, then toward
vlogs and market walks — on the theory that the corpus was the problem. The corpus was a real
but secondary problem. The wall was bot detection, and the query rewrites could not have fixed
it. Read the rejection reasons before theorising about the ones that are not the biggest.

## What is not the answer

Passing a browser session via --cookies-from-browser would likely bypass the throttling. It
also means driving YouTube with a real account from an automated script, which is what account
flags are for. Not doing that without an explicit decision, and it is not worth the risk here.

## What is the answer

The app already has the pipeline. api/feedback.js stores the voice clip plus the correction
with consent, and the result card already asks "did I get it?" with a city field. Syrians using
hometongue.me with the donate box ticked produce exactly what YouTube could not: real speech
labelled by the speaker with the city they actually grew up in. Better provenance than any
scraped clip, and no bot detection in the way.

The tooling built for this run is not wasted and stays in the repo: the blind gate in
tools/source-benchmark.mjs never asks where anyone is from, and tools/eval-benchmark.mjs scores
any clip set twice on identical audio, general prompt against the Syria route. Both work the
moment a clip set exists, wherever it comes from.

# The Syria route is deleted

Removed api/prompt-syria.js, tools/targets-syria.json, tools/source-benchmark.mjs,
tools/eval-benchmark.mjs, tools/yt-audio.mjs, the ?expert= plumbing in api/analyze.js and
js/app.js, and the --syria flag in tools/eval.mjs. Kept: the prompt-hash cache key in
tools/eval.mjs, and these notes.

The reason is the one that was visible before the work started. The general prompt already
scores 0.45 km on Aleppo and 1.3 km on Damascus. There was no headroom, so no version of a
specialist could show a gain — and it measurably cost accuracy elsewhere in Arabic, 38 km
against 28 km. It was also an opt-in URL parameter no real user would ever type.

## The whole record of trying to beat the short prompt

| addition | result |
| --- | --- |
| Whisper transcript alongside the audio | null (38 vs 43, split evenly) |
| hand-written dialect playbooks | 69 vs 43 — worse |
| phoneme recogniser, Arabic and English | null/negative |
| nine-language expert prompt | 49 vs 37 — worse |
| researched Syria appendix | 38 vs 28 on Arabic — worse |

Five independent attempts to add domain knowledge, every one null or negative. THE PROMPT
LAYER IS SATURATED. Do not spend more time here. The 2,136-character prompt in api/prompt.js
is the best configuration measured, and anything that makes it longer should be assumed
harmful until an eval says otherwise.

## What survived and is worth keeping

- The prompt-hash cache key. tools/eval.mjs was replaying cached answers after a prompt change
  and reporting them as a measurement; it nearly produced a confident false finding.
- "Place first, then sharpen". If a specialist prompt is ever tried again, ordering the model
  to form its answer BEFORE reading the notes recovered Basra 448 -> 0 km and Manama 434 -> 1 km.
- The knowledge that YouTube sourcing dies to IP-level bot detection, not to bad queries.

# Latency: the audio is not the problem

Hypothesis: the benchmark scores 28 km on ~30s clips while the app records up to 60s, so
shortening the recording should cut the wait for free. Tested on 24 benchmark clips at four
truncations, 96 calls.

| audio | median error | <100km | median latency | p90 latency | payload |
| --- | --- | --- | --- | --- | --- |
| 30s | **67 km** | **57%** | 11.8 s | 28.7 s | 177 KB |
| 20s | 157 km | 50% | 10.2 s | 17.3 s | 118 KB |
| 12s | 157 km | 48% | 8.2 s | 21.3 s | 71 KB |
| 8s | 345 km | 25% | 6.2 s | 15.5 s | 48 KB |

The hypothesis was wrong. Cutting audio from 30s to 8s saves 5.6 s and takes the error from
67 km to 345 km. Latency is model inference, not upload, so there is nothing to buy there.
Length buys real accuracy up to ~30s and the app should keep asking for it.

What the numbers DO justify: the 60s recording cap. Nothing measures better past ~30s, so the
last 30 seconds were pure waiting. Cap is now 35s, which takes the worst-case journey from
60 s of talking plus a 29 s call down to 35 s plus the same call.

The remaining wait is real and irreducible without changing models, so it is now legible
instead: the analyzing card counts elapsed seconds and moves through what it is doing. A frozen
spinner for 29 s reads as a crash.

# Length sweep: 20/30/45/60s — and the run that ran out of money

Ran 20/30/45/60s on the clips long enough to hold a real 60s window. Two things to record:
the result, and the fact that half the run failed.

| audio | n | median err | <100km | median latency | p90 | payload |
| --- | --- | --- | --- | --- | --- | --- |
| 20s | 27 | 317 km | 44% | 8.8 s | 15.3 s | 118 KB |
| 30s | 27 | **72 km** | 52% | 11.2 s | 19.6 s | 177 KB |
| 45s | 28 | 90 km | 54% | 10.5 s | 17.6 s | 264 KB |
| 60s | 28 | 85 km | **57%** | 12.0 s | 19.3 s | 352 KB |

20s is far worse than anything longer. 30, 45 and 60 are close on the median, with a slow
gain out to 60s on the share within 100 km. That supports keeping the 60s cap with an early
stop, and it supports the 10/20/30s thresholds behind the recording quality meter.

## Read this before quoting the numbers

27 of 54 FAILED. Every Portuguese, Russian, Chinese and Hindi-Urdu clip returned nothing, and
the failures are contiguous from the Spanish deck onward — the signature of a run dying
partway, not of hard clips. Cause: the Gemini prepay balance was exhausted mid-run.

So this is a ~28-clip sample weighted to accents, arabic, french and spanish, NOT the 54-clip
run it was designed as. The 20s-is-bad finding is large enough to survive that. The 45-vs-60
difference is not — do not treat it as settled.

## The failure was invisible at the point it mattered

A depleted balance arrives as HTTP 429, which the retry logic treated as "busy". Three
attempts and a 50-second wait later, production told users "the model kept refusing the
request" — indistinguishable from a transient blip, and it sent me looking for a bug that was
really an empty wallet. api/analyze.js now reads the 429 body, and RESOURCE_EXHAUSTED becomes
its own error code that does not retry, returns 503, and says plainly that the account is out
of credit and the recording was fine.

# The name bug — and why it cannot be fixed in the prompt

Reported by Mohammad: plain North American English, no Slavic features, one sentence
"my name is Vladislav". Verdict: Moscow, 1000 km radius. Evidence, in order:

  1. "Slavic name Vladislav"
  2. "Eastern European vowel tensing and consonant quality"
  3. "North American slang and cadence layered over Slavic phonology"

He confirms there is nothing Slavic in how he speaks, and the transcript the app itself printed
is plain North American slang. So item 2 is FABRICATED — the model concluded from the name and
then manufactured phonetic evidence to support it. Identical to the silent file that returned
"Toronto, 75%, Canadian raising on 'night'". Same defect, different trigger.

## The benchmark is structurally blind to this

All 111 clips have accent and content AGREEING. Nothing tests the case where the words point
somewhere the voice does not, so the eval can score 44 km and never see it.

Worse, a related measurement fell out of checking: **30 of 111 clips leak their own answer**
and the model reads it.

| | n | median | <100km |
| --- | --- | --- | --- |
| clips whose evidence cites content | 30 | 35 km | 70% |
| clips judged on sound alone | 81 | **49 km** | **56%** |
| headline | 111 | 44 km | 59% |

The 44 km headline is partly measuring reading comprehension. **49 km / 56% is the honest
figure** for a speaker who does not announce anything.

## Two prompt fixes, both measured, both rejected

| attempt | size | all | sound-only clips | name citations |
| --- | --- | --- | --- | --- |
| baseline | 2136 ch | **37 km** | **44 km** | 31 |
| explicit instruction | 2738 ch | 58 km | 85 km | 31 (unchanged) |
| one short sentence | 2227 ch | 44 km | 68 km | 32 (unchanged) |

Both cost accuracy. NEITHER changed the behaviour — name citations stayed flat at 31-32. The
long version nearly doubled the error on exactly the honest clips it was written to protect.
Telling this model that a name is not evidence does not stop it using names. That is seven
prompt additions now, every one null or negative.

## What shipped instead

A guard in api/analyze.js. It does not argue with the model: it checks whether the FIRST
evidence item names a name, and if so flags `name_led`, widens the radius to at least 1500 km,
and the result card says the guess leaned on a name rather than the accent. Costs no accuracy
because it changes no input — it just stops presenting a name-derived guess as an ear reading.

Only the first evidence item counts. A name behind real acoustic evidence is a harmless
observation; a name at the top is what the verdict was built on.

## The general lesson

A benchmark only tests what someone thought to put in it, so its blind spots are invisible by
construction. Mohammad found this in one try by using the product like a person. Known
remaining blind spots: real-world noise, heritage speakers, L2 speakers, code-switching, and
deliberately performed accents.

# THE NOISE FLOOR — read this before trusting anything above

Ran the IDENTICAL prompt over the same 106 clips twice, changing nothing.

| | median | <100km |
| --- | --- | --- |
| run 1 | 37 km | 62% |
| run 2 | **51 km** | 59% |

**A 14 km swing from nothing.** 13 of 106 clips differ by more than 100 km between identical
runs: Basra 0 vs 448, Manama 10 vs 434, Guatire 1048 vs 39, Andalusia 338 vs 105.

## What this invalidates

Basra and Manama are the two clips that "the nine-language expert prompt broke", then "the
Syria route broke identically", and the coincidence became a whole theory: that a long
preamble makes the model retreat to bigger, safer cities. Those two clips do that on their own,
with no prompt change at all. The theory was pattern-matching on noise.

Anything decided on a gap under ~14 km today was decided on nothing. That includes rejecting
the name line, at 37 vs 44 km — half the noise floor.

What survives, because the effect is far larger than the floor:
- speech length: 20s scores 317 km against 30s at 72 km
- the cascade replacement: 58% to 86% country accuracy
- the name bug itself, which is a controlled A/B, not a benchmark median

## How to measure from now on

- Single-run comparisons at n=106 cannot resolve anything under ~14 km. Re-run both arms.
- For a targeted behaviour, build a CONTROLLED probe instead of reading the aggregate. The name
  question was settled in nine calls by holding the audio fixed and changing one sentence —
  after two full 106-clip runs had failed to answer it.
- tools/eval.mjs now prints the noise floor after every run so the next comparison starts
  honest.

# The name line is back in the prompt

Controlled probe, identical synthetic US English, only the name differing:

| prompt | no name | "my name is Vladislav" | "my name is Jake" |
| --- | --- | --- | --- |
| baseline | United States | **Moscow, Russia** | United States |
| + one line | United States | unplaceable, refuses | United States |
| + emphatic paragraph | broke | **Moscow, Russia** | Lebanon, Kansas |

Baseline cites "Stated name Vladislav" and invents "East Slavic vowel production and timing"
for a Microsoft US text-to-speech voice. The one-line version stops it. The emphatic paragraph
does NOT — more forceful wording was worse than less, and it broke the no-name control.

Jake never moved the answer, so the trigger is foreign names, not names.

The server-side guard in api/analyze.js stays as a backstop: the prompt reduces the behaviour,
the guard catches what gets through and tells the user the guess leaned on a name.

# Correction: the prompt line did NOT fix the name bug, and made it harder to see

An earlier entry here said a one-line prompt fix worked, on the strength of a single probe run
where it answered "unplaceable" instead of Moscow. Re-running it six times says otherwise.

Identical synthetic US English, "my name is Vladislav", WITH the prompt line:

| run | verdict | first evidence item |
| --- | --- | --- |
| 1 | Kyiv, Ukraine | Slavic accent in English |
| 2 | Moscow, Russia | Slavic-influenced vowel shortening |
| 3 | Kyiv, Ukraine | Slavic-accented English vowel and consonant |
| 4 | Moscow, Russia | Slavic-accented English |
| 5 | Moscow, Russia | Slavic vowel qualities and timing |
| 6 | Kyiv, Ukraine | Eastern European Slavic English accent |

**Six of six Slavic.** The line changed nothing about the verdict.

What it DID change is the model's honesty. Without the line, evidence said "Stated name
Vladislav" — the tell was right there. With the line, the name is never mentioned and the
evidence is pure invented phonetics about a Microsoft text-to-speech voice. Same wrong answer,
tell removed.

That also blinded the guard, which keyed on the model citing a name: 0 of 6 caught.

**Teaching a model to hide its reasoning is worse than leaving it visible.** Line removed;
prompt back to the 2136-character baseline.

## The guard now reads the transcript

The model cannot quietly drop words the speaker actually said, so the trigger is
`my name is` / `I'm called` / `they call me` in the returned transcript — a fact about the
input rather than a claim the model chooses to make. Verified:

| clip | verdict | guard |
| --- | --- | --- |
| "my name is Vladislav" | Moscow, Russia | **warns + widens radius** |
| "my name is Jake" | Omaha, Nebraska | **warns + widens radius** |
| no name | United States | silent |

It fires on Jake too. That is deliberate: the guard cannot know which names are risky, and
saying "names throw this off, record again without it" is true and useful either way.

## What is actually fixed, honestly

The underlying behaviour is NOT fixed and probably cannot be at the prompt layer. What is fixed
is that the app no longer presents a name-driven guess as an accent reading — it widens the
circle and tells the user to try again without their name.
