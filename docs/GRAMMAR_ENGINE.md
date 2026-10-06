# The grammar engine

`src/grammar/` is a pure TypeScript model of Finnish nominal inflection. It
knows nothing about React, the DOM or the app's content: a lexicon is passed in
with `createGrammar(lexicon)`, and the result answers every grammar question the
app asks. It is the only place where forms are made.

## What it answers

| Question | API |
|---|---|
| What declension type is this word? | `classify(word)`: lexicon words by their verified Kotus type; unknown words get ranked candidates with a confidence and an honest caveat (spelling cannot always decide: *lasi/käsi*, *tili/tiili*). |
| What is its stem? | `stems(lex)`: vowel stem (strong/weak), consonant stem, plural stems. |
| Does gradation apply? Strong and weak grade? | `gradation(lex)`: pattern, direction (normal/inverse), strong/weak realisation, and which slots are strong or weak, derived from the actual forms. |
| Every singular and plural case form | `inflect(lex, slot)`, `paradigm(lex)`, `primary`, `accepted` (all standard variants). |
| What changed, and why? | each `FormVariant.steps`: ordered derivation steps with rule ids, before/after text and a predictability label. |
| Which parts are rule-based, which must be memorised? | `predictability(variant)`, `headlineLabel(variant)`. |
| Possessive forms | `withPossessive(lex, slot, person)` |
| Agreement | `inflectPhrase([adj, noun], slot)` |
| Which word and form is *veden*? | `analyze(form)`, `analyzeLoose(form)` (ä/ö-insensitive). |
| Why is an answer wrong? | `malforms(lex, slot)`, `diagnose(lex, slot, answer)` |
| Sentences | `renderSentence(template)` |
| Vowel harmony of a word | `harmony(lex)` |

## Core data types (`types.ts`)

- **Lexeme**: `id`, `lemma`, `pos`, `typeId` (`k1`…`k49`, Kotus numbering),
  `kotus` (as printed in the Kotus list, e.g. `9*A`), optional `gradation`
  (`{ pattern: 'pp-p', inverse?: true }`), `compound` (`{ modifier, headId }`),
  `harmony` (only when spelling misleads), `overrides`, `altStems`, `jGlide`,
  `numberUse` (`mass`, `pl-rare`) and `preferred` variants.
- **SlotKey**: `sg.genitive`, `pl.partitive`, … (15 cases × 2 numbers).
- **Piece**: a part of a form with a role (`root`, `grade`, `stem`, `plural`,
  `ending`, `possessive`, `exception`) and, when it changed, the text it had in
  the base form (`was`). A disappeared consonant is an empty piece with `was`.
- **DerivationStep**: `{ kind, ruleId, params, before, after, label }`. Kinds:
  lemma, type, stem, gradation, stem-change, plural, ending, harmony, spelling,
  possessive, override, result.
- **FormVariant**: `{ text, pieces, steps, register }`, where register is
  `standard`, `variant`, `rare` or `colloquial`.
- **NounForm**: `{ lexemeId, slot, person?, variants, status }`; `variants[0]` is
  the primary form, and `status` can be `not-used` (e.g. singular comitative).

## How a form is derived

`inflect(lex, slot)`:

1. **Type**: look up the `DeclensionTypeDef` (`declension/registry.ts`, 35 types).
2. **Stems** (`stems.ts`): build the vowel stem (`kiele-`), the consonant stem
   (`kiel-`) and the plural stems (`kieli-`) from the type's recipes. Each stem is
   a `Form` (`builder.ts`) that keeps its pieces and steps.
3. **Gradation** (`gradation.ts`, `phonology.ts`): locate the cluster before the
   last syllable nucleus and produce the strong and weak grades (normal or
   inverse). Spelling rules run afterwards: the j-glide (*aika → ajan*) and the
   apostrophe between identical vowels after k-loss (*vaa’an*, *hi’issä*).
4. **Slot recipe** (`slots.ts` defaults + the type's overrides): which stem,
   which grade, and which ending (`-n`, `-A`, `-tA`, `-ttA`, `-Vn`, `-hVn`,
   `-seen`, `-jen`/`-ien`/`-ten`/`-iden`/`-itten`, …). A slot can list several
   recipes; the first is primary, the others are variants or rare forms.
5. **Ending and harmony** (`harmony.ts`): archiphonemes `A`, `O`, `U` become
   back or front vowels from the word or, in a compound, its last part.
6. **Overrides**: lexical exceptions replace or add forms (*meri → merta*,
   *vuosi → vuonna*), always labelled as exceptions or irregular.
7. **Explanation**: grade steps are relabelled with the reason
   (`grade.weak.closed-syllable`, `grade.strong.illative`, `grade.inverse.weak-base`, …).

Results are cached per lexeme and slot.

### Predictability labels

Each step carries a label shown in the UI:

| Label | Meaning | Example |
|---|---|---|
| rule | Works the same way everywhere | -n of the genitive; vowel harmony |
| pattern | Regular within the word's type | *vesi → vete-* in the uusi-type |
| lexical ("memorize") | A property of this word | which -i family a word belongs to |
| exception | A known exception | *merta*, the illative keeping the strong grade |
| irregular | Truly irregular | *vuonna* |
| variant | An accepted alternative | *kielten ~ kielien* |
| advanced | Detail for advanced learners | rare cases |

## Other modules

- **Possessives** (`possessive.ts`): -n/-t drop and the strong grade return on
  the vowel stem (*kaupan → kauppani*); the illative and plural genitive lose
  their -n; -ksi becomes -kse-; 3rd person -Vn after a short vowel (*talossaan ~ talossansa*).
- **Phrases** (`phrase.ts`): agreeing adjective + noun, variant-aligned.
- **Analyzer** (`analyze.ts`): a reverse index built from the engine itself, so
  it can never disagree with it. Base forms are indexed on first use; the much
  larger set of possessive forms only when a query looks possessive.
- **Classification** (`classify.ts`): lexicon first; otherwise spelling-based
  candidates with confidence and caveats. It never claims certainty for -i words.
- **Malforms and diagnosis** (`malforms.ts`): plausible wrong forms in priority
  order, each with a diagnosis (`no-gradation`, `wrong-grade`, `wrong-igroup`,
  `wrong-harmony`, `wrong-partitive-ending`, `wrong-illative`,
  `lemma-plus-ending`, `wrong-number`, `wrong-case`, `missing-umlaut`, …).
  `diagnose` matches a learner's answer against them, reports when it is a real
  word (*uusin* "newest"), and uses the analyzer to name the form they wrote.
- **Sentences** (`sentence.ts`): template tokens such as `{*kauppa:ill}`,
  `{uusi+auto:gen}`, `{talo:ine:1sg}`, `{koira:pl.par}`, `{maito:acc0}`,
  `{=kotona|koti}`, `{^suomi:ine}`. See the header comment of `sentence.ts`.

## Adding a word

1. Add an entry to the right file in `src/data/lexicon/` with `noun(lemma,
   typeId, kotus, gloss, opts)`. Copy the Kotus string from the Kotus list.
2. Add its principal parts to `src/data/golden/principal-parts.ts`, written
   independently from the engine (from Kotus/Wiktionary tables).
3. Run `npm test`, `npm run verify:kotus` and `npm run verify:morph`. Explain
   any disagreement before accepting it (see [VERIFICATION.md](VERIFICATION.md)).

## Adding a declension type

1. Define the `DeclensionTypeDef` in the right family file under
   `src/grammar/declension/` (stems, plural recipes, slot overrides, gradation
   behaviour, membership label and rule id) and register it in `registry.ts`.
2. Add explanation texts for its new rule ids in `src/data/explanations/rules.ts`
   (a content test fails if any rule id lacks text).
3. Add golden lines and run all checks as above.

## Planned: lexicon import pipeline

The current lexicon is curated by hand. A future import pipeline must keep
learner-facing content curated:

1. `tools/import/` reads candidate words (and, separately, candidate sentences)
   from an external list or corpus into a **staging area** that the app never loads.
2. Automatic checks: the Kotus type and gradation letter, then a full paradigm
   from the engine compared with the morphology oracle; sentences must render and
   pass the analyser.
3. Human review: glosses, semantic tags and themes, linguistic review of every
   sentence, and a licence review of the source (recorded per item, never
   generalised).
4. Promotion into `src/data/` with `provenance.source: 'imported'`, its source
   and review status recorded.

Nothing harvested from the internet reaches learners without this review.
