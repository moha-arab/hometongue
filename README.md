# Lahja — لهجة

Speak Arabic, and Lahja guesses which dialect you're speaking, then flies the map to it.

## Run it

```
python -m http.server 8123 --directory C:\projects\lahja
```

Open http://localhost:8123 in **Chrome or Edge** (the mic uses the browser's built-in speech recognition, which Firefox doesn't support). No mic? "Type like you talk" mode does the same thing from text, and includes one-click samples for 6 dialects + Fuṣḥa.

## How it works (honest version)

This prototype detects dialect from **vocabulary**, not acoustics:

1. Browser speech recognition transcribes your Arabic (tune the mic locale in the dropdown for a better transcript).
2. A marker engine (`js/dialects.js`) scans the normalized text for ~120 weighted giveaway words — دلوقتي is Egyptian, هسا is Jordanian, اكو is Iraqi, دابا is Moroccan, وايد is Emirati...
3. Scores aggregate per country → region; the map flies to the top guess and shows the evidence ("we caught you saying هسا").

That's why there's no reading passage: if everyone read the same script, there'd be no word-choice signal. Free speech only.

Fuṣḥa gets detected too (ماذا/سوف/لماذا with no dialect markers) and teased accordingly.

## The flywheel

After every guess the app asks "did I get it?" — corrections are logged to `localStorage` (`lahja_feedback`). In the real product this becomes labeled training data: every user makes the model better.

## Phase 2

A real acoustic model (fine-tuned wav2vec2/WavLM on the ADI-17 dataset, ~3,000 hrs across 17 Arab countries) that hears the *accent itself*, so it works even when someone reads a fixed passage — and eventually distinguishes Jordanian from Syrian by sound.
