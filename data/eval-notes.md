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
