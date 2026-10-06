# Architecture

## Principles

1. **The grammar engine is the single source of truth.** Every noun form, stem,
   gradation decision and explanation step comes from `src/grammar/`. Pages and
   components display what the engine returns; they never build forms.
2. **Content refers to forms; it does not contain them.** Lessons, exercises and
   sentences store *references* (lexeme id + slot), and the engine produces the
   text. Example sentence templates look like `Menen {*kauppa:ill}.`
3. **Explanations are content, keyed by the engine's rule ids.** The engine says
   *which* rule applied (`grade.weak.closed-syllable`, `ending.partitive.ta-consonant`);
   `src/data/explanations/` says *how to explain it* in each learner mode.
4. **Everything works offline.** No core content depends on a network request.

## Layers

```
pages/ ─────► components/ ─────► hooks/ · stores/
   │               │                    │
   └──────► services/ (exercises, learning, search, audio, storage, content)
                   │
                   ▼
              data/ (lexicon, curriculum, cases, sentences, explanations, credits)
                   │  types only
                   ▼
              grammar/ (pure TypeScript engine — no React, no DOM, no data imports)
```

ESLint (`eslint.config.js`) enforces the two important boundaries:

- `src/grammar/**` may import only from `src/grammar/` (no React, Zustand, data
  or UI layers). The lexicon is passed in through `createGrammar(lexicon)`.
- `src/data/**` may not import UI layers or services.

## Main modules

| Path | Role |
|---|---|
| `src/grammar/` | The engine: phonology, vowel harmony, gradation, declension types (Kotus-aligned registry), stems, inflection with derivation steps, possessives, phrases, reverse analysis, classification, error diagnosis, sentence templates. See [GRAMMAR_ENGINE.md](GRAMMAR_ENGINE.md). |
| `src/data/lexicon/` | 293 curated words (nouns, adjectives, numerals) with Kotus type, gradation, glosses, themes, pictures and provenance. |
| `src/data/curriculum/` | 54 lessons in 8 levels. A lesson is a list of typed blocks (`text`, `pipeline`, `compare`, `endings`, `forms`, …) plus a check spec. |
| `src/data/sentences/` | 817 curated example-sentence templates with translations, tags and provenance. |
| `src/data/explanations/` | Rule and diagnosis texts per learner mode (English and Finnish). |
| `src/services/grammar.ts` | The app's engine instance: `createGrammar(LEXICON)`. |
| `src/services/exercises/` | Exercise generators (10 types), answer checking with diagnosis, session builder, skill tagging. |
| `src/services/learning/` | Spaced repetition (SM-2 lite), mastery, XP/streak, achievements, curriculum helpers. |
| `src/services/content/` | Text selection per mode, rendering of sentences, the derivation-to-stages mapping used by the pipeline view. |
| `src/stores/` | Zustand stores: settings (localStorage), progress and reviews (IndexedDB), the "how is this built?" sheet. |
| `src/components/grammar/` | Teaching components: `DerivationPipeline`, `MorphologyBreakdown`, `DeclensionTable`, `GradeMap`, `ITypeComparison`, `WordBuilder`, `SpatialCaseDiagram`, … |
| `src/components/exercises/` | `ExerciseCard` (four answer modes: text, choice, tap a part, build from tiles), `FeedbackPanel`, `ExerciseRunner`. |

## How a form reaches the screen

1. A page asks the engine, e.g. `grammar.inflect(vesi, 'sg.genitive')`.
2. The engine returns a `NounForm` whose variants each carry:
   - `pieces`: the form split into typed parts (`root`, `grade`, `stem`, `plural`,
     `ending`, `possessive`, `exception`), with the original text of anything
     that changed;
   - `steps`: the ordered derivation, each step with a rule id, before/after
     text and a predictability label (rule, pattern, memorize, exception,
     irregular, variant, advanced).
3. `MorphologyBreakdown` and `ColoredForm` colour the pieces. Colour is always
   paired with a label, border style or accessible name.
4. `DerivationPipeline` regroups the steps into the teaching stages
   (`services/content/pipeline.ts`) and looks up each rule's explanation for the
   current learner mode.

## State and persistence

- **Settings** (mode, theme, motion, pictures, voice, daily goal): Zustand
  `persist` in localStorage, read synchronously so the theme never flashes.
- **Progress** (XP, streak, lessons, per-skill statistics, spaced-repetition
  items, achievements, daily activity): Zustand `persist` on IndexedDB via
  `idb-keyval`, falling back to memory when IndexedDB is unavailable.
  Export/import as JSON is on the Progress page.
- Nothing is sent to a server; the app has no backend.

## Offline and installability

`vite-plugin-pwa` precaches the app shell, every route chunk, all data, the
font and the photos, so the whole app works offline after the first visit.
A small banner offers an update when a new version is deployed and says when
the device is offline.

## Media

`NounImage` chooses a picture by context: cards prefer photos, diagrams prefer
the original SVG illustrations, and small chips use emoji. The "Pictures"
setting overrides the order. Photos are local files with per-file credits,
produced by the reviewed pipeline in `tools/images/`.

## Audio

`AudioService` uses the Web Speech API with a Finnish voice at normal (1.0) and
slow (0.7) speed. Natural-sounding voices are ranked first and Apple's robotic
Eloquence voices last; Finnish is never spoken with a non-Finnish voice. A
recorded file overrides TTS when one exists for the text. Audio is an
enhancement: every task works without it. Details: [SPEC.md §12](SPEC.md#12-audio).

## Testing

- `src/**/__tests__/`: engine tests (golden principal parts, rules,
  possessives, analysis, diagnosis), content integrity (sentences, lessons,
  YKI model answers, photo credits), exercises and the learning model.
- `tests/e2e/`: Playwright against the production build, desktop and Pixel 7:
  every route, a full lesson, the word builder, search, the -i lab, error
  diagnosis, persistence, audio (stubbed speech), offline, axe accessibility,
  keyboard use and reduced motion.
- Verification against independent sources: see [VERIFICATION.md](VERIFICATION.md).

### Note for Apple Silicon

If Node runs as an x86_64 binary (under Rosetta), Playwright starts the x86_64
slice of Chrome, and V8's JIT is extremely slow when translated: pages that take
0.2 s natively take half a minute. `tools/chrome.mjs` detects this and starts
Chrome through `arch -arm64`; both `playwright.config.ts` and the dev screenshot
tool use it.
