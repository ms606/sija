# Sija — Technical Specification

The complete architecture of Sija, the Finnish Noun Lab: what each part does,
how the parts fit together, and the rules that keep them correct. It is written
for anyone who needs to understand, maintain or extend the app.

| | |
|---|---|
| Status | Describes the code as of 6 October 2026 (commit `048df17`) |
| Live | https://sija.finnish-noun-lab.workers.dev |
| Code | https://github.com/ms606/sija (private) |
| Related | [ARCHITECTURE.md](ARCHITECTURE.md) (short overview), [GRAMMAR_ENGINE.md](GRAMMAR_ENGINE.md), [VERIFICATION.md](VERIFICATION.md), [NATIVE_REVIEW.md](NATIVE_REVIEW.md), [tools/audit/README.md](../tools/audit/README.md) |

## Contents

1. [Product overview](#1-product-overview)
2. [System context](#2-system-context)
3. [Technology stack](#3-technology-stack)
4. [Repository layout](#4-repository-layout)
5. [Layers and dependency rules](#5-layers-and-dependency-rules)
6. [Startup, routing and the app shell](#6-startup-routing-and-the-app-shell)
7. [The grammar engine](#7-the-grammar-engine)
8. [Content and data](#8-content-and-data)
9. [Services](#9-services)
10. [State and persistence](#10-state-and-persistence)
11. [User interface](#11-user-interface)
12. [Audio](#12-audio)
13. [Offline support, PWA and security](#13-offline-support-pwa-and-security)
14. [Build and deployment](#14-build-and-deployment)
15. [Testing and verification](#15-testing-and-verification)
16. [How to extend the app](#16-how-to-extend-the-app)
17. [Known limitations and planned work](#17-known-limitations-and-planned-work)
18. [Glossary](#18-glossary)

---

## 1. Product overview

Sija teaches **Finnish noun grammar**: the 15 cases, word stems, consonant
gradation, the four families of -i nouns, plurals, vowel harmony and possessive
suffixes. Its core idea is that every form comes with the reason behind it:

```
BASE WORD → WORD TYPE → STEM → STEM CHANGE → NUMBER & CASE → FINAL FORM → SENTENCE
   vesi      uusi-type   vete-    t → d          + n           veden      Juon vettä.
```

### Feature areas

| Area | What the learner gets |
|---|---|
| Learn | 54 lessons in 8 levels. Each has a goal, worked examples built from engine output, and a generated end-of-lesson check (pass mark 80 %). |
| Explore | Case explorer and place-case map, partitive and genitive labs, gradation lab, noun types and the -i Noun Lab, Stem Lab (word builder), vowel-harmony tool, possessive lab, plural lab. |
| Practice | Ten exercise types, sessions built from spaced-repetition reviews and skill scopes, and diagnosis of wrong answers. |
| Progress | Mastery per skill, weak areas, XP, streaks, achievements, daily activity, JSON export and import. |
| Reference | Search by lemma, by any inflected form (*veden* → *vesi*, genitive singular), umlaut-insensitive, or by English meaning. |
| Listening | Text-to-speech at normal and slow speed, minimal pairs, dictation. |
| YKI practice | Nine everyday domains with reading, writing (model answers), speaking prompts and fill-in tasks. This is unofficial practice. |

### Product principles

1. **The grammar engine is the single source of truth.** No page, component or
   content file contains a noun form. Forms are always computed.
2. **Content refers to forms; it does not contain them.** Sentences, lessons and
   exercises store references (lexeme + slot), and the engine renders them.
3. **Explanations are content, keyed by rule ids.** The engine says which rule
   applied; `src/data/explanations/` says how to explain it in each learner mode.
4. **Offline-first, local-only.** There is no backend, account or analytics.
   Progress stays on the device unless the learner exports it.
5. **Accuracy before quantity.** Every word and form is machine-verified against
   independent sources; native-speaker review is tracked explicitly
   ([§15](#15-testing-and-verification)).
6. **Honest labelling.** Each step is labelled by how predictable it is (rule,
   pattern, memorise, exception, irregular, variant, advanced). Unknown words are
   classified with a stated confidence, never with false certainty.

### Learner modes

The settings store holds a `mode` that changes explanation language and depth:

| Mode | Explanation text |
|---|---|
| beginner | English, with Finnish terms |
| intermediate | Finnish where available, with a small English gloss |
| advanced | Finnish only (English fallback), plus Kotus type numbers and technical notes |

---

## 2. System context

```
                    ┌──────────────────────────────────────────┐
                    │  Cloudflare Workers (static assets only)  │
                    │  dist/ + _headers, SPA fallback           │
                    └──────────────────┬───────────────────────┘
                                       │ HTTPS, first visit and updates
                                       ▼
┌───────────────────────────── Learner's browser ─────────────────────────────┐
│  Service worker (Workbox) ── precache: shell, route chunks, data, font, photos │
│                                                                              │
│  React app ─► grammar engine (in memory)                                     │
│      │                                                                       │
│      ├─► localStorage   (settings)                                           │
│      ├─► IndexedDB      (progress, reviews)                                  │
│      └─► Web Speech API (device's own Finnish voice)                         │
└──────────────────────────────────────────────────────────────────────────────┘

Development machine only (never shipped):
  Kotus word list · GiellaLT analyser (GPL) · grammar audit · Wikimedia Commons photo pipeline
```

- **Runtime network use:** only fetching the app's own files from its own origin.
  The Content-Security-Policy forbids every other origin ([§13](#13-offline-support-pwa-and-security)).
- **No server code.** The Worker only serves `dist/`.
- **Speech** is produced by the operating system's or browser's voices. No audio
  is recorded or sent anywhere.

---

## 3. Technology stack

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript ~6.0, strict | `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, no emit (Vite bundles) |
| UI | React 19 | Function components and hooks |
| Routing | React Router 7 (`createBrowserRouter`) | Every page is a lazy route chunk |
| State | Zustand 5 with `persist` | localStorage for settings, IndexedDB (`idb-keyval`) for progress |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) | Design tokens as CSS variables in `src/index.css` |
| Icons | lucide-react | |
| Font | Inter Variable (`@fontsource-variable/inter`) | Bundled, so no font CDN |
| Build | Vite 8 | Dev server, production build, preview |
| PWA | vite-plugin-pwa 2 (Workbox) | `generateSW`, prompt-to-update |
| Unit tests | Vitest 5 | Node environment by default; jsdom per file when needed |
| End-to-end | Playwright 1.63 + axe-core | System Chrome, desktop and Pixel 7 |
| Lint | ESLint 10 + typescript-eslint | Also enforces the layer boundaries |
| Hosting | Cloudflare Workers static assets | Free tier |
| Dev verification | Python venv: uralicNLP, pyhfst, GiellaLT models | Never shipped |

Node 22.12+ is required.

---

## 4. Repository layout

```
.
├── index.html                 Loading placeholder, theme-colour meta, mounts /src/main.tsx
├── vite.config.ts             React, Tailwind, CSP plugin, PWA manifest + Workbox, Vitest config
├── wrangler.jsonc             Cloudflare deployment (static assets, SPA fallback)
├── public/
│   ├── _headers               Security and caching headers for Cloudflare
│   ├── favicon.svg, icons/    App icons (rendered by tools/icons)
│   └── images/nouns/          35 curated Wikimedia Commons photos (500 px)
├── src/
│   ├── main.tsx, App.tsx      Bootstrap: wait for the first route, then mount
│   ├── router.tsx             Route table (lazy pages)
│   ├── index.css              Tailwind import, design tokens, light/dark themes, motion rules
│   ├── grammar/               THE ENGINE: pure TypeScript, no React, no data imports
│   │   ├── declension/        35 declension type definitions + registry + schema
│   │   └── __tests__/         Engine and golden-form tests
│   ├── data/                  Curated content: lexicon, sentences, curriculum, explanations, …
│   ├── types/                 Content, curriculum and exercise types
│   ├── services/              App logic: engine instance, exercises, learning model, search, audio, storage
│   ├── stores/                Zustand stores: settings, progress, explain sheet
│   ├── hooks/                 useAudio, useApplyPreferences, useNow
│   ├── components/            UI: layout, ui primitives, grammar views, exercises, lesson, media, audio, progress
│   ├── pages/                 One folder per area; each page is a lazy route
│   ├── utils/                 cx, seeded random, text helpers
│   └── test/                  Vitest setup and smoke test
├── tests/e2e/                 Playwright specs + helpers (speech stub)
├── tools/                     Development-only tooling (see §15)
│   ├── kotus/                 Kotus word-list verification
│   ├── morph-oracle/          GiellaLT cross-check (Python)
│   ├── audit/                 Grammar audit, native-review packet, verify-all
│   ├── images/                Wikimedia Commons photo pipeline
│   ├── wiktionary/            Declension-table spot checks
│   ├── icons/                 Icon rendering
│   ├── export-paradigms.ts    Dumps every engine form for the oracle
│   └── chrome.mjs, shot.mjs   Native Chrome launcher (Apple Silicon), screenshots
└── docs/                      This spec and the other design documents
```

---

## 5. Layers and dependency rules

```
pages/ ───────► components/ ───────► hooks/ · stores/
   │                 │                     │
   └───────► services/ (grammar instance, exercises, learning, content, search, audio, storage)
                     │
                     ▼
               data/  (lexicon, sentences, curriculum, explanations, cases, credits, …)
                     │  imports types only
                     ▼
               grammar/  (pure engine: imports only from grammar/)
```

ESLint (`eslint.config.js`) enforces the two boundaries that matter most:

| Rule | Enforced by |
|---|---|
| `src/grammar/**` may not import React, Zustand, idb-keyval or lucide, nor any module outside `grammar/`. | `no-restricted-imports` with message "grammar/ must stay framework-free" / "may only import from grammar/" |
| `src/data/**` may not import React or any UI or service layer (`components`, `pages`, `hooks`, `stores`, `services`). | `no-restricted-imports` with message "data/ is pure content…" |

So the engine never imports the lexicon. The lexicon is passed in at runtime
through `createGrammar(LEXICON)` in `src/services/grammar.ts`. That keeps the
engine testable on its own, and lets dev tools run it on any word list.

---

## 6. Startup, routing and the app shell

### 6.1 Startup sequence

1. `index.html` shows a static "Sija — Finnish Noun Lab" placeholder in the
   right background colour (light or dark), so there is no white flash.
2. `main.tsx` imports the font and CSS and waits for `router.state.initialized`.
   That means the first route's lazy chunk has loaded.
3. Only then does it mount `<App/>` (a `RouterProvider`). If React mounted
   earlier, the router's initial update could be missed and the app would stay
   on the fallback (see the comment in `main.tsx`).
4. The settings store hydrates **synchronously** from localStorage, so the theme
   is right on the first paint. The progress store hydrates **asynchronously**
   from IndexedDB and sets `hydrated: true` when it is done.

### 6.2 Routes

All routes are children of `AppShell` and are loaded lazily (`router.tsx`).

| Path | Page | Purpose |
|---|---|---|
| `/` | Dashboard | Recommended next lesson, daily goal, due reviews, mastery and weak areas |
| `/learn` | LearnPage | Levels and lessons with status (soft-locked, never blocked) |
| `/learn/:lessonId` | LessonPage | Lesson blocks, then the end-of-lesson check |
| `/cases` | CasesPage | All 15 cases, grouped |
| `/cases/:caseId` | CaseDetailPage | Meaning, endings, usages, common mistakes, demo derivation |
| `/cases/partitive/lab`, `/cases/genitive/lab` | Partitive and genitive labs | Focused explorers for the two hardest grammatical cases |
| `/noun-types` | NounTypesPage | Declension families and types |
| `/noun-types/:typeId` | NounTypeDetailPage | One Kotus type: who belongs to it, its stems, principal parts of every word of the type, full paradigm |
| `/noun-types/i-words` | INounLabPage | The four -i families compared |
| `/stem-lab` | StemLabPage | Word builder: watch a form being built step by step |
| `/stem-lab/harmony` | VowelHarmonyPage | Type any word and see which endings it takes |
| `/stem-lab/possessives` | PossessiveLabPage | Possessive suffixes on every case |
| `/gradation`, `/gradation/:patternId` | Gradation pages | Every pattern, strong/weak map, inverse gradation |
| `/plural` | PluralLabPage | Plural markers, plural stems, plural genitive and partitive |
| `/practice` | PracticePage | Start practice by case, gradation pattern, -i family or exercise type |
| `/practice/session` | PracticeSessionPage | Runs a session; configured by query string (`?skill=partitive&type=transform&count=3`) |
| `/listening` | ListeningPage | Listening drills, minimal pairs, dictation |
| `/vocabulary` | VocabularyPage | Lexicon browser, filterable by theme and level |
| `/progress` | ProgressPage | Mastery, weak areas, activity chart, achievements, export/import |
| `/reference`, `/reference/:nounId` | Reference | Search and the full noun page (paradigm, stems, gradation, sentences) |
| `/yki`, `/yki/:taskId` | YKI pages | Practice domains and tasks |
| `/settings`, `/credits` | Settings, Credits | Preferences, voice; data sources, licences, per-photo credits |
| `*` | NotFoundPage | Unknown addresses |

Navigation groups (sidebar) and the phone tab bar are defined in
`src/components/layout/nav.ts`.

### 6.3 App shell

`AppShell` provides, in order:

- a **skip link** to `#main`;
- a sticky **header** (brand, learner-mode switch, `HeaderStatus`, settings link);
- a **sidebar** on large screens (`lg:`) with the navigation groups;
- `<main id="main">` containing the route's `<Outlet/>`;
- a fixed **bottom tab bar** on phones (Home, Learn, Practice, Search, More);
- `ExplainSheet`, the global "How is this form built?" sheet;
- `AppStatus` (offline notice, "ready to work offline", update prompt);
- `ScrollRestoration`.

`useApplyPreferences()` runs in the shell. It writes `data-theme` and
`data-motion` on `<html>` and updates the `theme-color` meta tag.

---

## 7. The grammar engine

`src/grammar/` (about 3,500 lines) is a pure, rule-based model of Finnish
nominal inflection. It is the only place where forms are made.
[GRAMMAR_ENGINE.md](GRAMMAR_ENGINE.md) is the companion how-to; this section
covers the design.

### 7.1 Public API

`createGrammar(lexicon, { knownWords })` returns a `Grammar` object:

| Method | Answers |
|---|---|
| `get`, `require`, `byLemma`, `resolve` | Lexicon lookup; `resolve(ref)` accepts an id or an unambiguous lemma |
| `type(lex)` | The `DeclensionTypeDef` |
| `classify(word)` | Which type? Lexicon words: verified type. Unknown words: ranked candidates with confidence and a caveat |
| `stems(lex)` | Vowel stem (strong/weak), consonant stem, plural stems, each with typed pieces |
| `harmony(lex)` | Back/front decision and why (compound-aware) |
| `gradation(lex)` | Pattern, direction, strong/weak realisations, Kotus letter, which slots are strong or weak |
| `inflect(lex, slot)` | A `NounForm`: every accepted variant, with pieces and derivation steps |
| `paradigm(lex)` | All 30 slots |
| `primary`, `accepted` | The primary form / all accepted forms of a slot |
| `withPossessive(lex, slot, person)` | Possessive-suffixed form |
| `inflectPhrase(words, slot, person?)` | Agreeing adjective + noun |
| `analyze(form)`, `analyzeLoose(form)` | Reverse analysis (exact / umlaut-insensitive) |
| `malforms(lex, slot)`, `diagnose(lex, slot, answer)` | Plausible wrong forms; why an answer is wrong |
| `predictability(variant)`, `headlineLabel(variant)` | Steps grouped by predictability; the least predictable label |
| `renderSentence(template)` | A sentence template rendered with engine forms |

The app has exactly one instance: `grammar` in `src/services/grammar.ts`,
bound to the curated `LEXICON` and `KNOWN_WORDS`.

### 7.2 Core data types (`grammar/types.ts`)

| Type | Meaning |
|---|---|
| `CaseId` | 15 cases: nominative, genitive, partitive, accusative, inessive, elative, illative, adessive, ablative, allative, essive, translative, abessive, comitative, instructive |
| `SlotKey` | `` `${'sg' \| 'pl'}.${CaseId}` ``, so 30 slots |
| `PersonId` | `1sg`, `2sg`, `3`, `1pl`, `2pl` (possessive suffixes) |
| `GradationId` | 14 patterns: `kk-k`, `pp-p`, `tt-t`, `k-0`, `p-v`, `t-d`, `ht-hd`, `nk-ng`, `mp-mm`, `lt-ll`, `nt-nn`, `rt-rr`, `k-j`, `k-v` |
| `Lexeme` | The morphological core of a word: `id`, `lemma`, `pos`, `typeId` (`k1`…`k49`), `kotus` string, optional `gradation {pattern, inverse?}`, `compound {modifier, headId}`, `harmony`, `overrides`, `altStems`, `jGlide`, `noGradationNote`, `numberUse`, `preferred` |
| `Piece` | A typed segment of a form: `root`, `grade`, `stem`, `plural`, `ending`, `possessive`, `exception`; `was` holds the earlier text when something changed (an empty piece with `was` = a consonant that disappeared) |
| `DerivationStep` | `{ kind, ruleId, params, before, after, label }`. Kinds: lemma, type, stem, gradation, stem-change, plural, ending, harmony, spelling, possessive, override, result |
| `Predictability` | `rule`, `pattern`, `lexical`, `exception`, `irregular`, `variant`, `advanced` |
| `FormVariant` | `{ text, pieces, steps, register }`; register is `standard`, `variant`, `rare` or `colloquial` |
| `NounForm` | `{ lexemeId, slot, person?, variants, status, statusRuleId? }`; `variants[0]` is primary; status `ok`, `not-used` (e.g. singular comitative) or `rare` (plural of mass nouns) |
| `GradationInfo` | Result of `gradation(lex)` |

### 7.3 Declension types (`grammar/declension/`)

A `DeclensionTypeDef` describes one Kotus type declaratively:

| Field | Meaning |
|---|---|
| `id`, `kotus`, `modelWord` | `k26`, 26, `pieni` |
| `iGroup` | For -i nouns: `pankki`, `lehti`, `kieli` or `uusi` |
| `membership`, `membershipRuleId` | Can a learner tell from the word's shape that it belongs here? |
| `gradation` | `normal` (kauppa → kaupan), `inverse` (sade → sateen), `intrinsic` (built into the type: uusi → uuden), `none` |
| `vowel` | Vowel-stem recipe: `same`, `replace {strip, add}`, `lengthen {strip}` |
| `consonant` | Consonant-stem recipe, if the type has one |
| `plural` | Plural-stem recipes: `append`, `a-to-o`, `drop-final`, `i-to-e`, `shorten`, `diphthong`, `lemma`, `ks` (several = several plural series, e.g. omena) |
| `slots` | Slot recipes that differ from the defaults (usually the principal parts) |
| `pluralNoGradation`, `notes` | Plural stems that never alternate; extra notes for the type page |

A `SlotRecipe` is `{ stem: lemma|vowel|consonant|plural, ending, ruleId, grade?, pluralIndex?, register? }`.
Endings use archiphonemes: `A`, `O`, `U` harmonise; `V` copies the stem's last
vowel (illative `-Vn`, `-hVn`).

The registry (`registry.ts`) holds **35 types**:

| Family file | Types (Kotus number, model word) |
|---|---|
| `o-u.ts` | 1 valo, 2 palvelu, 3 valtio |
| `i.ts` | 5 risti, 6 paperi (pankki family); 7 ovi (lehti); 23 tiili, 24 uni, 25 toimi, 26 pieni (kieli); 27 käsi, 28 kynsi, 29 lapsi, 30 veitsi, 31 kaksi (uusi) |
| `a-a.ts` | 9 kala, 10 koira, 11 omena, 12 kulkija, 13 katiska, 14 solakka, 15 korkea |
| `long-vowel.ts` | 18 maa, 19 suo |
| `consonant.ts` | 32 sisar, 33 kytkin, 35 lämmin, 38 nainen, 39 vastaus, 40 kalleus, 41 vieras, 42 mies, 43 ohut, 44 kevät |
| `e.ts` | 48 hame |

### 7.4 How a form is derived (`inflect.ts`)

```
inflect(lex, slot)
  │  cached per lexeme (WeakMap) and slot
  ▼
computeForm
  1. NOT_USED slot?            → status 'not-used' (sg comitative, sg instructive)
  2. accusative?               → derived from genitive/nominative (sg: -n or zero; pl: -t)
  3. getStems(lex)             → StemSet (lemma, vowel strong/weak, consonant, plurals, alt stems, harmony, gradation)
  4. recipes = type.slots[slot] ?? DEFAULT_RECIPES[slot]
  5. for each recipe:
       grade = recipe.grade ?? SLOT_GRADE[slot]
       for each matching stem → build variant(s): stem + ending, harmony, spelling rules
       if grade is weak → also build from alternative weak stems (ruoka: ruoan ~ ruuan)
  6. lexical overrides         → replace or add variants, the changed tail marked as an 'exception' piece
  7. finalize                  → apply `preferred` order, remove duplicates, assign registers, add the 'result' step
  8. plural of a mass / pl-rare noun → status 'rare'
```

**Default grade per slot** (`slots.ts`, `SLOT_GRADE`): weak where the ending
closes the syllable (genitive -n, -ssa, -sta, -lla, -lta, -lle, -ksi, -tta,
nominative plural -t); strong where the syllable stays open (partitive, essive)
and in the illative (historically -hen). In the plural, the genitive,
partitive, illative, essive and comitative are strong.

**Default recipes** cover the slots that work the same in every type
(genitive `-n`, inessive `-ssA`, …). Each type defines its **principal slots**
itself: singular partitive and illative, plural genitive, partitive and
illative.

### 7.5 Stems and the `Form` builder

- `stems.ts` builds a `StemSet` from the lexeme and its type and caches it.
  `resolveGradation` decides whether gradation applies: the type allows it
  *and* the lexeme declares a pattern, or the type has intrinsic gradation.
- `builder.ts` defines `Form`, a word under construction. It is a list of typed
  segments plus the derivation steps so far. Its operations (`replaceEnd`,
  `append`, `markGrade`, `applyApostrophe`, `applyJGlide`, `applyPluralGlide`)
  change the text and record a step at the same time. That is how every form
  carries its own explanation. `clone()` branches a form when there are variants.

### 7.6 Phonology, gradation and harmony

- `phonology.ts`: vowels, diphthongs, syllabification, closed-syllable test, the
  last syllable nucleus, and `gradationSite`, the consonant cluster before the
  last nucleus that alternates.
- `gradation.ts`: the 14 `GRADATION_PATTERNS` (strong, weak, Kotus letter A–M)
  and `gradeStem(stem, pattern, from, to)`. Spelling rules run afterwards:
  the j-glide (*aika → ajan*) and the apostrophe between identical vowels
  after k-loss (*vaa’an*).
- `harmony.ts`: `decideHarmony(word, compoundHead?, override?)`. Any a/o/u
  means back; otherwise front; e and i are neutral; compounds follow their last
  part. `realize(template, harmony)` turns `A/O/U` into real vowels.

### 7.7 Possessives and phrases

- `possessive.ts`: suffixes `-ni`, `-si`, `-nsA`, `-mme`, `-nne`. The -n/-t of
  the nominative, genitive and accusative disappear, and the suffix goes on the
  vowel stem with the strong grade back (*kaupan → kauppani*). The illative and
  plural genitive lose their -n, `-ksi` becomes `-kse-`, and the 3rd person can
  be `-Vn` after a short vowel (*talossaan ~ talossansa*).
- `phrase.ts`: `inflectPhrase([adjective, noun], slot)` inflects both words and
  aligns their variants.

### 7.8 Reverse analysis and classification

- `analyze.ts`: `Analyzer` is a reverse index (form → every lexeme, slot and
  person that produces it), **built from the engine itself**, so it can never
  disagree with it. Base forms are indexed on first use. Possessive forms (about
  five times as many) are indexed only when a query looks possessive.
  `normalizeForm` handles Unicode, case, apostrophes and whitespace;
  `looseKey` makes ä/ö/å match a/o.
- `classify.ts`: lexicon words return their verified type. Other words get
  spelling-based candidates with `high`/`medium`/`low` confidence, a caveat
  (spelling cannot always decide: *lasi/käsi*, *tili/tiili*) and a
  gradation hint.

### 7.9 Wrong answers: malforms and diagnosis (`malforms.ts`)

`malforms(lex, slot)` produces plausible wrong forms in priority order, each
tagged with a `DiagnosisId`:

`missing-umlaut`, `wrong-number`, `wrong-case`, `wrong-igroup`, `no-gradation`,
`wrong-grade`, `wrong-partitive-ending`, `wrong-illative`, `lemma-plus-ending`,
`wrong-harmony`, `rare-slot`.

For example, `wrong-igroup` inflects the word as if it belonged to each of the
other -i families. `diagnose(lex, slot, answer)` matches the learner's answer
against them. It also reports when the answer is a real form of another word or
slot (via the analyser), and when it is a well-known word outside the lexicon
(`KNOWN_WORDS`: *uusin* means "newest").

### 7.10 Sentence templates (`sentence.ts`)

Example sentences are templates whose noun forms come from the engine:

| Token | Renders | Meaning |
|---|---|---|
| `{kauppa:ill}` | kauppaan | lexeme id or unique lemma : slot |
| `{*kauppa:ill}` | kauppaan | focus form (highlighted; used for blanks) |
| `{koira:pl.par}` | koiria | plural slots start with `pl.` |
| `{uusi+auto:gen}` | uuden auton | agreeing phrase |
| `{talo:ine:1sg}` | talossani | possessive suffix |
| `{ruoka:gen#1}` | ruuan | a specific variant |
| `{maito:acc0}` | maito | nominative-form object |
| `{=kotona\|koti}` | kotona | lexicalised form linked to a lexeme |
| `{koira}` | koira | nominative singular |
| `{^suomi:ine}` | Suomessa | capitalised (proper-noun use) |

`renderSentence` returns typed parts: text, plus tokens carrying the lexeme,
slot and variant. That is how sentences can be clicked to open the explain
sheet, or blanked out for exercises.

### 7.11 Predictability

Each step carries one of seven labels. `predictability(variant)` groups the
steps by label. `headlineLabel(variant)` returns the least predictable one
(rule < pattern < lexical < exception < irregular), which is the thing the
learner most needs to notice.

| Label | Meaning | Example |
|---|---|---|
| rule | Works the same everywhere | genitive -n; vowel harmony |
| pattern | Regular within the type | *vesi → vete-* in the uusi type |
| lexical ("memorise") | A property of this word | which -i family a word belongs to |
| exception | A known exception | *merta*; illative keeps the strong grade |
| irregular | Truly irregular | *vuonna* |
| variant | Accepted alternative | *kielten ~ kielien* |
| advanced | Detail for advanced learners | rare cases |

---

## 8. Content and data

`src/data/` is pure content. It may import types from `grammar/` and `types/`
but no UI or services.

### 8.1 Inventory

| Content | Location | Count |
|---|---|---|
| Lexicon entries | `data/lexicon/*.ts` | 293 (264 nouns, 25 adjectives, 4 numerals) |
| Declension types used | `grammar/declension/` | 35 |
| Example sentences | `data/sentences/*.ts` | 817 |
| Lessons / levels | `data/curriculum/` | 54 lessons, 8 levels, 208 blocks |
| Rule explanations | `data/explanations/rules.ts` | 196 rule ids |
| Photos | `data/images/photos.ts` + `public/images/nouns/` | 35 |
| Original SVG illustrations | `components/media/illustration-art.tsx` | 24 words |
| Emoji pictures | lexicon `emoji` field | 215 words |
| YKI domains | `data/yki/index.ts` | 9 |
| Golden principal parts | `data/golden/principal-parts.ts` | 131 words |

### 8.2 Lexicon

A lexicon entry is a `Noun` (`types/content.ts`): the engine's `Lexeme` plus
learner-facing content.

| Field | Purpose |
|---|---|
| `gloss` | English (and optionally Finnish) meaning |
| `semantics` | Semantic tags (person, place, food, …), used by generators to pick sensible words |
| `locative` | `inner` (kaupassa) or `outer` (torilla) place cases |
| `themes` | Topic themes (home, food, city, …) |
| `level` | Curriculum level where the word is introduced (1–8) |
| `frequency` | `core`, `common`, `extra` |
| `image` | `emoji`, `illustration` id and/or `photo` with a full `MediaCredit` |
| `homonyms`, `notes` | Same spelling, different word (kuusi "spruce"/"six"); word-specific explanation keys |
| `provenance` | `source` (curated/imported), `author`, `nativeReview` |

Entries are written with small builders in `lexicon/build.ts`:
`noun(lemma, typeId, kotus, gloss, opts)`, `adj(…)`, `num(…)`, and the override
helpers `replaceForm(slot, forms, ruleId)` and `addVariant(…)`. The `grad`
option takes a pattern, with a `<` prefix for inverse gradation
(`'<t-d'` for *sade*). Files are grouped by declension family (`o-u-y.ts`,
`a-a.ts`, `i-pankki.ts`, `i-lehti.ts`, `i-kieli.ts`, `i-uusi.ts`, `e.ts`,
`consonant.ts`, `monosyllable.ts`, `everyday.ts`, `adjectives.ts`).

`lexicon/index.ts` joins them into `LEXICON`, attaches photos from `PHOTOS`,
exposes `I_GROUPS` and throws on duplicate ids at load time.

### 8.3 Sentences

`sentences/build.ts` provides `s(id, fiTemplate, en, { tags, level, register })`.
Sentences are grouped by topic file. `register` is `standard` or `spoken`, and
spoken sentences are checked against the descriptive analyser. Duplicate ids
throw at load time.

### 8.4 Curriculum

- `levels.ts`: 8 levels (Foundation, Core cases, Noun inflection, Consonant
  gradation, -i nouns, Plural, Possessive suffixes, Advanced usage).
- `level-N.ts`: lessons built with helpers from `curriculum/build.ts`.
- A **lesson** (`types/curriculum.ts`) has `id` ("4.3"), `level`, `title`, `goal`,
  `why`, `prerequisites`, `skills`, `minutes`, `advanced?`, `blocks` and a
  `check` spec.
- **Block kinds**: `text`, `key-idea`, `pipeline`, `builder`, `paradigm`,
  `compare`, `case-cards`, `spatial`, `gradation`, `grade-map`, `harmony`,
  `examples`, `minimal-pairs`, `i-compare`, `plural-stems`, `endings`,
  `possessives`, `forms`, `glossary`, `quick-check`. Every block that shows a
  form stores a reference (`nounId` + `slot`), never the form itself.
- An `ExerciseSpec` (`skill`, `types`, `words`, `slots`, `persons`, `tags`,
  `count`, `lemmaHintOnly`) describes a check. The exercises are generated when
  the lesson runs.

### 8.5 Explanations and other content

| File | Content |
|---|---|
| `explanations/text.ts` | `t(en, fi?)` → `LocalizedText`; `m(en, fi?, adv?)` → `ModeText` (beginner / intermediate / advanced) |
| `explanations/rules.ts` | `RULES`: a short general explanation for **every** rule id the engine can emit (a test enforces this). `{placeholders}` are filled from step params |
| `explanations/walkthrough.ts` | Word-specific step templates for "Explain this form", keyed by the same rule ids and filled with the word's own derivation (before/after text, stem, ending, consonant change); plain-English definitions of grammar terms; why a form has no gradation; rough English meanings; English plural exceptions |
| `explanations/general.ts` | `GENERAL_RULES`: general statements with no example words of their own (examples come from the engine); `PLURAL_ENDING_NOTES`: statements whose example forms are listed as data and checked by tests |
| `explanations/usage.ts` | "Why this case here?": reusable reasons (`USAGE_REASONS`), meanings of trigger words (`CUE_GLOSS`) and one annotation per sentence (`SENTENCE_USAGE`: reason, trigger word as written, notes, a contrasting sentence) |
| `explanations/diagnoses.ts` | `DIAGNOSES`: feedback text for each diagnosis id |
| `cases.ts` | `CASES_INFO`: Finnish name, group, questions, endings, meaning, usages (with sentence ids), common mistakes, spatial meaning, demo word and slot |
| `gradation-patterns.ts` | Teaching info per gradation pattern; notes on words without gradation |
| `noun-families.ts` | The -i families, comparison slots, minimal pairs, family overview |
| `themes.ts` | Theme labels; listening minimal pairs |
| `glossary.ts` | Grammar terms (English and Finnish) |
| `known-words.ts` | Real words that learners produce by mistake (*uusin*) → explanation key |
| `credits.ts` | Data sources (Kotus, CC BY 4.0), verification tools, software licences |
| `yki/index.ts` | YKI practice domains and tasks |
| `golden/principal-parts.ts` | Hand-typed principal parts for 131 words (independent of the engine) |

### 8.6 Media licensing

Each photo stores its **own** `MediaCredit`, copied verbatim from Wikimedia
Commons: provider, source URL, title, author, licence name and URL, whether
attribution is required, the attribution text, usage terms, restrictions,
modifications, retrieval date and human review date. No licence is ever assumed
for a whole source. Credits are shown with the photo and on the Credits page.

---

## 9. Services

`src/services/` holds app logic that is not UI and not grammar.

### 9.1 Exercises (`services/exercises/`)

**Ten exercise types** (`generators.ts`):

| Type | Generator | Answer kind | What the learner does |
|---|---|---|---|
| multiple-choice | `multipleChoice` | choice | Pick the right form; distractors are malforms with diagnoses |
| fill-blank | `fillBlank` | text | Complete a real sentence (blank = the focus token) |
| transform | `transform` | text | Write a given slot of a word |
| identify-case | `identifyCase` | choice | Name the case of a form |
| identify-number-case | `identifyNumberCase` | choice | Name number and case |
| identify-morphology | `identifyMorphology` | pieces | Tap the part of the word with a given role (ending, grade, …) |
| build-word | `buildWord` | build | Assemble the form from tiles |
| listening | `listening` | choice | Hear a form and pick it (only offered when speech works) |
| error-correction | `errorCorrection` | text | Fix a wrong form; the error shown is a diagnosed malform |
| production | `production` | text | Write the Finnish for an English phrase |

Each generator takes a `GenContext` (seeded `rng`, learner `mode`, word `pool`,
allowed `slots`, `persons`, `audio`, sentence `tags`, `lemmaHintOnly`) and an
optional target, and returns an `Exercise`:
`{ id, type, skills, reviewKey, difficulty, target, prompt, answer }`.
All correct answers come from the engine. `target` records the Finnish surface
form the exercise is about (`form`, e.g. *metsänä*); a check result records
whether its expected answer is a form, a label ("essive singular") or a word
part (`answerKind`). Feedback, the explanation it opens and the session summary
always use `target.form` (`feedback.ts`), never the expected answer.

**Skills** (`skills.ts`): 15 mastery categories (cases, case-endings, singular,
plural, genitive, partitive, noun-types, i-words, gradation, vowel-harmony,
stem-formation, possessives, vocabulary, listening, production) plus
fine-grained skills: `case:<case>`, `itype:<family>`, `grad:<pattern>`,
`type:<typeId>`. `skillsFor(lex, slot, type, person)` tags every exercise with
the skills it trains.

**Sessions** (`session.ts`): `scopeFor(skill, maxLevel)` chooses the words,
slots, exercise types and persons that train a skill. `buildSession(spec)`
then:

1. seeds a random generator from `spec.seed` (sessions are reproducible);
2. drops listening exercises when no Finnish voice is available;
3. fills up to half the session with **due reviews**, choosing a recognition
   type for `recognize:` items and a production type for `form:` items;
4. fills the rest by cycling through shuffled exercise types;
5. never shows the same form twice in a row, and avoids repeats until options
   run out.

**Checking** (`check.ts`):

- `cleanAnswer` normalises Unicode, case, apostrophes, spaces and trailing
  punctuation.
- Verdicts are `correct`, `almost` or `incorrect`. `almost` is used only when
  the answer is right except for missing dots on ä/ö (a keyboard problem, not a
  grammar error).
- Rare but accepted forms count as correct, marked "also correct, but rare".
- Wrong text answers are run through `grammar.diagnose`. The result carries the
  diagnosis id, its params, any real word the learner produced, and a note for
  known words.

### 9.2 Learning model (`services/learning/`)

| Module | Behaviour |
|---|---|
| `srs.ts` | **SM-2-lite.** A `ReviewItem` is one skill on one form, keyed `form:<lexeme>:<slot>` or `recognize:…`. Quality: incorrect 1, almost 3, correct 5 / 4 / 3 by response time (< 8 s, < 20 s, slower). A lapse resets reps, lowers ease by 0.2 (min 1.3) and is due again in 10 minutes. A success sets the interval to 1 day, then 3 days, then interval × ease; ease is clamped to [1.3, 2.8]. The last 12 attempts are kept. |
| `mastery.ts` | Recency-weighted accuracy over the last 30 attempts (weight 0.92^age), scaled down until 8 attempts. Tiers: new, learning (< 0.5), familiar (≥ 0.5), confident (≥ 0.75), mastered (≥ 0.9). Also category mastery, overall mastery and weak areas. |
| `xp.ts` | XP: correct 10, almost 5, lesson 50, daily goal 25. Streaks count local calendar days on which the daily goal was met. |
| `achievements.ts` | 15 understated milestones (first answer, perfect session, 3- and 7-day streaks, 25 gradation items, every case practised, level 1 complete, …). |
| `curriculum.ts` | Recommended next lesson, lesson status, missing prerequisites (lessons are soft-locked, never blocked), `PASS_MARK = 0.8`. |

### 9.3 Content helpers (`services/content/`)

- `text.ts`: `pickText(modeText, mode)` chooses the text for the learner mode.
  `ruleText`, `stepText` and `diagnosisText` look up explanations and fill
  `{placeholders}`. It also holds the labels for cases, slots, persons, roles,
  predictability, -i families, types and gradation patterns.

### 9.3a Word-specific explanations (`services/explain/`)

`explainForm(lexeme, slot, { person?, variantText? })` turns the engine's
derivation of one form into an explanation of that form: a short summary, the
chain of intermediate forms (base word → stem → plural stem → form), the
formula (stem + ending + suffix), labelled pieces that spell exactly the form
(removed letters are markers, never letters), the step-by-step walkthrough in
derivation order, and an explicit consonant-gradation statement (including why
there is none: one syllable, no k/p/t before the last vowel, a cluster that
never alternates, or a Kotus entry without a gradation letter). Everything is
read from the engine's steps, pieces and stem set; each explanation checks
itself (pieces spell the form, the named stem is one of the word's stems, stem +
ending reproduces the engine's result) and lists what it could not explain in
`issues`. Memorized forms (overrides such as *vuonna*, lexicalised sentence forms
such as *kotona*) get coverage `recorded` and no invented derivation.

`usageFor(explanation, { sentenceId? })` picks a sentence that contains exactly
this form (the tapped sentence first) and fills its annotated reason;
`samePattern` finds other words derived with exactly the same steps;
`generalRules` and `compareForms` give the general rule and related forms of the
same word. Results are cached; nothing uses the network.
- `sentences.ts`: `renderSentenceById` (cached), `sentencesFor(lexeme, slot?,
  maxLevel)` and `allSentenceViews`.
- `types.ts`: words of a type, the example word for a type, all type definitions.

### 9.4 Search (`services/search/`)

`search(query)` normalises the query and scores matches:

| Match | Score |
|---|---|
| Exact lemma | 100 |
| Exact inflected form (via the analyser) | 90 |
| Umlaut-insensitive form, only if there is no exact hit | 70 |
| Lemma prefix | 60 minus length difference |
| Whole word in the English gloss | 50 |

Each result lists the analyses (slot, person, form) that matched. Results are
sorted by score, then by lemma in Finnish collation, up to 24.

### 9.5 Storage (`services/storage/`)

- `idb.ts`: a Zustand `StateStorage` on IndexedDB (idb-keyval). It falls back to
  memory when IndexedDB is unavailable (some private windows, tests).
- `backup.ts`: export and import of progress as JSON (format `sija-progress`).
  An imported backup is **untrusted input**: every field is rebuilt from scratch,
  and malformed entries and unknown keys are dropped. One bad shape would
  otherwise break every page on every load.

---

## 10. State and persistence

| Store | Persisted in | Key | Contents |
|---|---|---|---|
| `useSettings` (`stores/settings.ts`) | localStorage, synchronous | `sija-settings` v1 | `mode`, `theme` (system/light/dark), `motion` (system/reduce/full), `showRoleLabels`, `pictureStyle` (auto/photo/illustration/emoji), `voiceURI`, `dailyGoal` (default 20), `showTranslations` |
| `useProgress` (`stores/progress.ts`) | IndexedDB, asynchronous | `sija-progress` v1 | `ProgressData`: `xp`, `streak`, `lessons`, `skills` (per-skill stats with the last 30 attempts), `achievements`, `recentNouns`, `daily`, `reviews` (SRS items), `sessions`, `perfectSessions`, `totalAttempts` |
| `useExplain` (`stores/explain.ts`) | not persisted | | The target of the global explain sheet |

**Progress actions:** `recordAttempt`, `startLesson`, `completeLesson`,
`finishSession`, `viewNoun`, `importData`, `reset`.

### Data flow of one answer

```
ExerciseCard ── learner answers ──► check.ts (checkText / checkChoice / checkPieces / checkBuild)
     │                                   │ uses grammar.diagnose for wrong text answers
     ▼                                   ▼
FeedbackPanel ◄────────────── CheckResult { verdict, expected, accepted, diagnosisId, params, realWord }
     │
ExerciseRunner ──► useProgress.recordAttempt({ exercise, verdict, ms, dailyGoal })
                     ├─ update skill stats (every skill on the exercise)
                     ├─ XP for the verdict; daily stats; daily goal → streak + bonus XP
                     ├─ srs.schedule(reviewKey, quality(verdict, ms))
                     ├─ recent nouns
                     └─ unlock achievements → quiet notice
```

---

## 11. User interface

### 11.1 Component groups (`src/components/`)

| Folder | Contents |
|---|---|
| `layout/` | `AppShell`, `AppStatus`, `HeaderStatus`, `nav.ts` |
| `ui/` | Primitives: `Button`, `Card`, `Badge`, `Disclosure`, `Sheet`, `Segmented`, `ProgressBar`, `PageHeader`, `StatusLabel`, `UmlautKeys` (on-screen ä/ö), `Fi` (marks Finnish text with `lang="fi"`) |
| `grammar/` | Teaching views: `FormExplainer` (the central "Explain this form" view), `MorphologyBreakdown`, `RichText`, `ColoredForm`, `FormLine`, `DeclensionTable`, `CompareTable`, `CaseCard`, `SpatialCaseDiagram`, `GradationVisualizer`, `GradeMap`, `ITypeComparison`, `PluralStemExplainer`, `PossessiveBuilder`, `WordBuilder`, `SyllableView`, `VowelHarmonyMeter`, `MinimalPairs`, `EndingExplainer`, `SentenceLine`, `WordPicker`, `ExplainSheet` |
| `exercises/` | `ExerciseRunner`, `ExerciseCard` (four answer modes: text, choice, tap a part, build from tiles), `FeedbackPanel` |
| `lesson/` | `LessonBlocks`: renders each `LessonBlock` kind |
| `media/` | `NounImage`, `illustrations`, `illustration-art` (original SVGs) |
| `audio/` | `AudioButton` (normal and slow) |
| `progress/` | `ActivityChart` |

### 11.2 How a form reaches the screen

1. A component asks the engine, e.g. `grammar.inflect(noun, 'sg.genitive')`.
2. `MorphologyBreakdown` / `ColoredForm` colour the variant's `pieces` by role.
   Colour is always paired with a label, border style or accessible name.
3. `FormExplainer` calls `explainForm` and shows the base word and form, the
   pieces, the chain and formula, a short summary, the step-by-step walkthrough
   (collapsible; in `stepMode` one step at a time for the Word Builder), "Why
   this case here?" with an annotated sentence, related forms of the same word
   and, in a separate collapsed panel, the general rule with other words built
   the same way.
4. Tables, sentences and feedback can open `ExplainSheet` (`useExplain.open`)
   for any lexeme, slot, person and variant; a word tapped in a sentence
   passes that sentence's id, so the sheet explains the form in that sentence.

### 11.3 Pictures

`NounImage` chooses a picture by context:

| Context | Preference order |
|---|---|
| card | photo → illustration → emoji |
| diagram | illustration → emoji → photo |
| chip | emoji → illustration |

The `pictureStyle` setting moves the chosen kind to the front. Abstract nouns
have no picture by design. Emoji are drawn by the system font; no emoji images
are bundled.

### 11.4 Theming and motion

- Design tokens (`--bg`, `--surface`, `--surface-2`, `--text`, `--primary`,
  `--success`, `--warning`, `--error`, …) are defined on `:root` and redefined
  under `:root[data-theme='dark']`, then mapped to Tailwind colours with
  `--color-*` in `src/index.css`.
- Tailwind's `dark:` variant follows `data-theme`, not the media query, so the
  in-app theme setting wins.
- Reduced motion: `prefers-reduced-motion` or `data-motion='reduce'` turns
  animations off; `data-motion='full'` keeps them.

### 11.5 Accessibility conventions

- A skip link to `<main id="main" tabIndex={-1}>`, and landmarks (header, navigation, main).
- Finnish text is wrapped in `Fi` (`lang="fi"`), so screen readers switch
  pronunciation.
- Touch targets are at least 44–48 px; tables have compact variants.
- Colour is never the only signal (labels, borders, accessible names).
- Choice exercises can be answered with number keys.
- The axe accessibility scan and keyboard use are part of the e2e suite.

---

## 12. Audio

`services/audio/AudioService.ts` (singleton `audioService`, React access
through `hooks/useAudio.ts`).

**Provider chain:**

1. **Recorded file.** If `RECORDED` (normalised text → URL) has an entry, it
   plays with `playbackRate` 1.0 or 0.7. The manifest is currently empty.
2. **Web Speech API** with a Finnish voice, at rate 1.0 (normal) or 0.7 (slow).

**Voice selection:**

- Only voices whose `lang` starts with `fi` are considered.
- Each voice gets a quality: **natural** (name or URI contains natural, neural,
  enhanced or premium, e.g. Edge's "Microsoft Noora Online (Natural)" or Apple's
  "Satu (Enhanced)"), **robotic** (Apple's Eloquence voices: Eddy, Flo, Grandma,
  Grandpa, Reed, Rocko, Sandy, Shelley), or **standard** (everything else, e.g.
  Satu).
- Ranking: quality, then on-device before online, then Satu, then name. The
  learner's chosen voice (`voiceURI` in settings) wins when it is available.
- Online voices are skipped while the browser is offline. If an online voice
  fails, the utterance is retried once with the best on-device voice.
- **Finnish is never spoken with a non-Finnish voice.** If the device lists
  voices but none is Finnish, the service stays silent. An English voice reading
  Finnish would teach the wrong pronunciation. If the browser lists no voices at
  all, only the utterance's `lang` can select one, so the service speaks anyway.

The Settings page lists the voices, labels their quality, has test buttons, and
explains how to install or choose a better voice when the best one available is
not natural. Every exercise works without audio; listening exercises are left
out of sessions when no Finnish voice is available.

Voice quality depends on each device. The planned fix is pre-recorded audio
([§17](#17-known-limitations-and-planned-work)).

---

## 13. Offline support, PWA and security

### 13.1 PWA

- `vite-plugin-pwa` with `registerType: 'prompt'` generates `sw.js` (Workbox).
- **Precache:** every `js, css, html, svg, png, jpg, webp, woff2` file in the
  build (about 124 entries, 3.4 MB), including all route chunks, data, the font
  and the photos. The whole app works offline after the first visit.
- `navigateFallback: '/index.html'` serves client-side routes offline.
  `cleanupOutdatedCaches` removes old precaches.
- `AppStatus` shows "You are offline — everything in the app still works",
  "Ready to work offline", and a reload button when a new version is waiting.
- Manifest: name "Sija — Finnish Noun Lab", standalone display, theme colour
  `#1f5f99`, 192/512 px icons and a maskable icon.

### 13.2 Security

| Control | Where | Value |
|---|---|---|
| Content-Security-Policy | `<meta>` added at build time (`vite.config.ts`, production builds only) | `default-src 'self'`; `script-src 'self'`; `style-src 'self' 'unsafe-inline'` (for the loading placeholder); `img-src`, `font-src`, `connect-src`, `worker-src`, `manifest-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'none'` |
| Framing | `public/_headers` | `frame-ancestors 'none'`, `X-Frame-Options: DENY` |
| Other headers | `public/_headers` | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling camera, microphone, geolocation, payment and USB, HSTS (1 year) |
| Caching | `public/_headers` | `/assets/*` (content-hashed): `public, max-age=31536000, immutable` |
| Untrusted input | `services/storage/backup.ts` | Imported backups are rebuilt field by field |
| Privacy | whole app | No backend, analytics or third-party requests; progress stays on the device |

---

## 14. Build and deployment

### 14.1 Scripts

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server (http://localhost:5173) |
| `npm run build` | `tsc -b` type check, then `vite build` into `dist/` (with the service worker) |
| `npm run preview` | Serve the production build |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run e2e` | Playwright (builds and previews on port 4173 first) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run verify:kotus`, `verify:morph`, `audit:grammar`, `audit:test`, `audit:explanations`, `verify:all` | Verification (§15) |
| `npm run images:fetch` | Re-run the photo pipeline |

The build is about 4.2 MB in total (largest JS chunk about 450 KB before
compression).

### 14.2 Hosting

- **Cloudflare Workers static assets**, Worker name `sija`, configured in
  `wrangler.jsonc`. It serves `./dist/` with
  `not_found_handling: "single-page-application"`, so unknown paths return
  `index.html` and client-side routes work. There is no server code.
- `public/_headers` is copied into `dist/` and read by Cloudflare.
- Live URL: https://sija.finnish-noun-lab.workers.dev

### 14.3 Release procedure (manual)

Deploys do not happen on push.

```sh
npm run lint && npm run typecheck && npm test   # and npm run e2e for larger changes
git push origin main                             # private repo github.com/ms606/sija
npm run build && npx wrangler deploy
```

Wrangler uses an OAuth login stored on the developer's machine. After a deploy,
open clients see the update prompt from the service worker.

---

## 15. Testing and verification

### 15.1 Automated tests

| Suite | Location | Covers |
|---|---|---|
| Engine | `src/grammar/__tests__/engine.test.ts`, `golden.test.ts` | Golden principal parts for 131 words across all 35 types, harmony, gradation sites, inverse gradation, illatives, plural stems, possessives, agreement, analysis ambiguity, error diagnosis |
| Content integrity | `src/data/__tests__/` | Sentences render, are complete and punctuated; case content references existing sentences and words; featured words really show their pattern or -i family; every type is in exactly one family; every rule id and diagnosis has explanation text; lessons have unique ordered ids, valid prerequisites, resolving block references and generatable checks; photos have complete per-file credits, local files and emoji fallbacks; YKI checklist forms appear in model answers exactly as the engine builds them |
| Services | `src/services/__tests__/` | Exercise generation and checking, backup parsing, voice ranking; word-specific explanations (`explain.test.ts`: *opettajia* and *lääkäriksi* in detail, every base form explained without self-check issues, pieces spell the form, named stems are the word's stems, no unrelated words, rule-note examples follow their rule, labels, recorded forms, selection changes, sentence annotations, offline) |
| Components | `src/components/grammar/__tests__/`, `src/components/exercises/__tests__/` (jsdom) | `FormExplainer` follows the selected word and form; pieces carry their labels; practice feedback and the explanation it opens show the exercise's form (*metsänä*) with its classification, never the answer label |
| Feedback | `src/services/__tests__/feedback.test.ts` | For every exercise type, feedback explains the exercise's own surface form; labels and word parts are never explained as words |
| Smoke | `src/test/smoke.test.ts` | The test toolchain runs |
| End-to-end | `tests/e2e/` (desktop + Pixel 7) | Every route loads without errors or sideways scrolling; not-found page; completing lesson 1.1; word builder; search; -i lab; diagnosis of *uusin*; progress survives reload; audio (stubbed speech); offline after first visit; axe accessibility; keyboard (desktop); reduced motion; "Explain this form" on the translative and partitive pages; a word tapped in a sentence explained in that sentence |

Unit and component tests currently: 266 passing. The e2e helper `stubSpeech` replaces
`speechSynthesis` with a recorder and one Finnish voice.

On Apple Silicon with an x86_64 Node, Playwright would start Chrome under
Rosetta and V8 would be extremely slow. `tools/chrome.mjs` launches Chrome
through `arch -arm64`; the Playwright config and `tools/shot.mjs` use it.

### 15.2 Verification against independent sources (development only)

| Check | Tool | What it proves |
|---|---|---|
| Kotus | `tools/kotus/verify-kotus.ts` (`npm run verify:kotus`) | Each word's Kotus string, type number, gradation letter and direction match *Nykysuomen sanalista 2024*; compounds inflect like their head (293 / 293) |
| Morphology oracle | `tools/export-paradigms.ts` + `tools/morph-oracle/check.py` | Every engine form is analysed by GiellaLT as exactly that lemma, number and case; every standard GiellaLT form is among the engine's variants. Differences are adjudicated in `adjudicated.json` |
| Sentences | `tools/morph-oracle/sentences.py` | Every rendered sentence is recognised (817 / 817) |
| Grammar audit | `tools/audit/` (`npm run audit:grammar`) | Vocabulary, morphology (including about 36k possessive forms) and sentence audits on one snapshot; HTML/Markdown report with waivers and new/resolved tracking |
| Explanations | `tools/audit/explanation-audit.ts` (`npm run audit:explanations`, `-- --px` for possessives) | Every form has a derivation-backed explanation; pieces and steps match the engine; sentence annotations are valid; every Finnish form cited in a rule text follows that rule. Reports coverage and gaps in `tools/audit/out/explanations.md`. Not a linguistic verification |
| Native review | `tools/audit/native-review.py` → `docs/NATIVE_REVIEW.md` | 459 forms in 25 groups that rest on a source judgement; verdicts are recorded in `tools/audit/reviews.toml` |
| All of it | `npm run verify:all` | Final VERIFIED / NOT VERIFIED summary |

**Current status: NOT VERIFIED.** All machine checks pass, but no native
speaker has reviewed the 25 groups yet. See [VERIFICATION.md](VERIFICATION.md).

The GiellaLT models are GPL-3+. They are used only on the development machine,
are never distributed, and nothing from them is copied into the app's data.

### 15.3 Other development tools

| Tool | Purpose |
|---|---|
| `tools/images/` | Photo pipeline: reads each Commons file's own metadata, rejects incomplete or non-accepted licences, downloads a 500 px thumbnail, writes `photos.ts` with one verbatim credit per photo. Also has search and contact-sheet helpers |
| `tools/wiktionary/decl.py` | Prints Wiktionary declension tables for spot checks |
| `tools/audit/explain-forms.ts` | Renders the app's word-specific explanations for the native-review packet |
| `tools/icons/` | Renders the PWA icons from SVG |
| `tools/shot.mjs` | Screenshots in native Chrome |

---

## 16. How to extend the app

| Task | Steps |
|---|---|
| Add a word | Add `noun(…)` to the right `src/data/lexicon/` file (copy the Kotus string from the Kotus list). Add its principal parts to `data/golden/principal-parts.ts`, written independently. Run `npm test`, `npm run verify:kotus` and `npm run verify:morph`, and explain any disagreement before accepting it. |
| Add a declension type | Define the `DeclensionTypeDef` in its family file and register it in `registry.ts`. Add texts for its new rule ids in `explanations/rules.ts` (a test fails otherwise). Add golden lines and run all checks. |
| Add a sentence | Add `s(id, template, en, opts)` to a sentence file. Use template tokens, never typed noun forms, except `{=literal\|lexeme}` for lexicalised words. Run `npm test` and `verify:morph`. |
| Add a lesson | Add it to `level-N.ts` with the block helpers; reference words and slots by id. Content tests check every reference. |
| Add an exercise type | Add the type to `ExerciseType`, write a `Generator`, register it in `GENERATORS` and `TYPE_LABEL`, and make sure `ExerciseCard` handles its answer kind. |
| Add a page | Create it under `src/pages/`, add a lazy route in `router.tsx` and, if needed, a nav entry in `nav.ts`. The e2e route test should cover it. |
| Add a photo | Add a manifest entry in `tools/images/commons-manifest.json`, then run `npm run images:fetch`. Review the result; never write a credit by hand. |
| Add recorded audio | Add the file under `public/`, add an entry to `RECORDED` in `AudioService.ts`, and record its `MediaCredit` (provider terms verbatim, per file). |

Import of harvested content (words or sentences from external lists) must go
through the planned staging, check and review pipeline described in
[GRAMMAR_ENGINE.md](GRAMMAR_ENGINE.md#planned-lexicon-import-pipeline). Nothing
harvested reaches learners without human review.

---

## 17. Known limitations and planned work

| Item | Status |
|---|---|
| Native-speaker review | Pending: 0 / 25 groups, 0 / 459 forms. The project is NOT VERIFIED until this is done. |
| Audio quality | Depends on the learner's device voices. The recorded-audio path exists but has no files. Plan: generate clips with a neural Finnish voice and ship them with per-file licence records. |
| Lexicon size | 293 hand-curated words. A reviewed import pipeline is designed but not built. |
| Sync | Progress is per device; moving it needs JSON export/import. |
| Interface language | The interface is English; Finnish appears in explanations according to learner mode. The word-specific walkthrough is English in every mode (with Finnish terms outside beginner mode). |
| Example sentences | Most of the ~8,500 standard forms have no example sentence of their own; their explanation shows the general meaning of the case, labelled as general. 817 of 820 sentences have a "why this case" note. Notes, like sentences, await native-speaker review. |
| Scope | Nouns, adjectives and numerals only; no verbs. |
| Deployment | Manual, from the developer's machine; no CI pipeline. |

---

## 18. Glossary

| Term | Meaning |
|---|---|
| Lexeme | One dictionary word with its inflection data (`Lexeme` / `Noun`) |
| Slot | A number + case combination, e.g. `pl.partitive` |
| Kotus type | Declension type number (1–49) from *Nykysuomen sanalista*; the app uses 35 of them |
| Vowel stem (vokaalivartalo) | The stem most endings attach to: *kiele-* |
| Consonant stem (konsonanttivartalo) | Stem used by some partitives and plural genitives: *kiel-* |
| Consonant gradation (astevaihtelu) | Alternation of p, t, k between strong and weak grades: *kauppa ~ kaupan* |
| Inverse gradation | Weak grade in the base form, strong in the stem: *sade ~ sateen* |
| Vowel harmony (vokaalisointu) | Endings use back (a, o, u) or front (ä, ö, y) vowels to match the word |
| Archiphoneme | A placeholder vowel in an ending template: `A` = a/ä, `O` = o/ö, `U` = u/y; `V` copies the stem's last vowel |
| -i families | pankki (5/6), lehti (7), kieli (23–26), uusi (27–31): four ways nouns ending in -i inflect |
| Principal parts | The slots a type defines itself: sg partitive and illative, pl genitive, partitive and illative |
| Malform | A plausible wrong form with a diagnosis |
| Rule id | Namespaced id of a rule (`grade.weak.closed-syllable`) that links engine output to explanation text |
| Golden forms | Principal parts typed in independently of the engine, used as a test oracle |
| GiellaLT | Open-source Finnish morphological analyser used as a development-time oracle |
| YKI | Yleiset kielitutkinnot, the Finnish National Certificates of Language Proficiency |
