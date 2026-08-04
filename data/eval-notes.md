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
