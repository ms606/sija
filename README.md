# Sija — Finnish Noun Lab

An offline-capable web app for learning **Finnish noun grammar**: cases, stems,
consonant gradation, the four families of -i nouns, plurals, vowel harmony and
possessive suffixes. Every form is shown with the reason behind it:

```
BASE WORD → WORD TYPE → STEM → STEM CHANGE → NUMBER & CASE → FINAL FORM → SENTENCE
   vesi       uusi-type    vete-    t → d          + n           veden      Juon vettä.
```

All forms come from a rule-based **grammar engine** (`src/grammar/`). The user
interface never contains grammar logic of its own: it asks the engine.

## Features

- **Learn**: 54 lessons in 8 levels, each with a goal, worked examples and a
  generated end-of-lesson check.
- **Explore**: case explorer and place-case map, partitive and genitive labs,
  gradation lab (every pattern, strong/weak map, inverse gradation), noun types
  and the -i Noun Lab, Stem Lab (word builder), plural lab, vowel-harmony tool
  and possessive lab.
- **Practice**: ten exercise types (multiple choice, fill in the blank,
  transform, identify the case, identify number and case, find the part, build
  the word, listening, error correction, writing in Finnish). Wrong answers are
  diagnosed, e.g. *uusin* → "inflected like a pankki-type word; *uusin* also
  means 'newest'".
- **Spaced repetition**, mastery per skill, weak areas, XP, streaks and
  achievements, all stored on the device (IndexedDB) with export/import.
- **Reference**: search by lemma, any inflected form (*veden* → *vesi*,
  genitive singular), umlaut-insensitive spelling or English meaning.
- **Listening**: Finnish text-to-speech at normal and slow speed, minimal-pair
  drills and dictation.
- **YKI practice**: nine everyday domains with reading, writing (model answers),
  speaking prompts and fill-in tasks (unofficial practice).
- Beginner / intermediate / advanced modes, light and dark themes, reduced
  motion, mobile-first layout, keyboard and screen-reader support.
- Installable PWA that works fully offline.

## Getting started

Requires Node 22.12+ and npm.

```sh
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build (`dist/`, with service worker) |
| `npm run preview` | Serve the production build |
| `npm test` | Unit and content tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright, system Chrome) |
| `npm run lint` / `npm run typecheck` | ESLint (including layer rules) / TypeScript |
| `npm run verify:kotus` | Check every word's declension type against the Kotus word list (dev-only download) |
| `npm run verify:morph` | Compare every engine form and sentence with an independent analyser (dev-only, see docs) |
| `npm run audit:grammar` | Grammar audit of the lexicon, all forms (possessives included), sentences and Finnish copy, with an HTML report (dev-only, see `tools/audit/README.md`) |
| `npm run verify:all` | Every verification step plus the native-speaker review status, with a final VERIFIED / NOT VERIFIED summary |
| `npm run images:fetch` | Re-run the photo pipeline from `tools/images/commons-manifest.json` |

## Documentation

- [docs/SPEC.md](docs/SPEC.md): the full technical specification: every layer, data model, service, store, build, deployment and verification step
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): layers, data flow, state, offline support
- [docs/GRAMMAR_ENGINE.md](docs/GRAMMAR_ENGINE.md): how forms are derived, how to add words and types, the planned import pipeline
- [docs/VERIFICATION.md](docs/VERIFICATION.md): how correctness is checked, adjudicated differences, open items
- [docs/NATIVE_REVIEW.md](docs/NATIVE_REVIEW.md): the native-speaker review packet: every form awaiting review and how to record verdicts
- [tools/audit/README.md](tools/audit/README.md): the grammar audit, its checks and how to extend it

## Content and licences

- Word entries, example sentences, lessons and explanations were written for
  this app. They are machine-verified; native-speaker review is still pending,
  and each sentence records whether it has been reviewed.
- Declension types were checked against Kotus' *Nykysuomen sanalista*. Its
  licence and required attribution are recorded on the in-app **Credits** page
  (`src/data/credits.ts`).
- Photos come from Wikimedia Commons. Each file's own licence, author,
  attribution, source and modifications are stored per photo
  (`src/data/images/photos.ts`) and shown in the app. No licence is assumed for
  a whole source.
- Development-only verification tools (including a GPL-licensed morphological
  analyser) are not part of the app.
