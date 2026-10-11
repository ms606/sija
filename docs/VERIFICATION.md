# Verification

Accuracy matters more than quantity, so every noun form the app shows is checked
in several independent ways.

**Status: NOT VERIFIED.** Every machine check passes, there are no engine
errors, and every difference with the independent analyser is either fixed or
explained against a second source. But 459 learner-facing forms in 25 groups
rest on such a source judgement, made by the app's authors, and no native
speaker has reviewed them yet (§7). The project is marked verified only when
that review is recorded.

| Check | Command | Baseline, 5 Oct 2026 | Second run, 6 Oct 2026 |
|---|---|---|---|
| Unit, rule and content tests | `npm test` | 206 pass | 213 pass |
| Kotus declension types and gradation letters | `npm run verify:kotus` | 275 / 275 words | 293 / 293 words |
| Engine forms vs. an independent analyser | `npm run verify:morph` | 7,627 forms: 0 unrecognised, 0 missing, 293 adjudicated | 8,126 forms: 0 unrecognised, 0 missing, 312 adjudicated (§3) |
| Every example sentence recognised by the analyser | `npm run verify:morph` | 820 / 820 sentences | 817 / 817 sentences |
| End-to-end (production build, desktop + Pixel 7) | `npm run e2e` | 25 pass, 1 skipped | 25 pass, 1 skipped (keyboard test runs on desktop only) |
| Grammar audit: lexicon, all forms incl. possessives, sentences, Finnish copy | `npm run audit:grammar` | FAIL: 140 errors, 272 warnings, 800 info | PASS: 0 errors; 25 warnings, all the native-review groups of §7; 34 info |
| Grammar audit self-tests | `npm run audit:test` | 24 pass | 29 pass |

## 1. Hand-written golden forms

`src/data/golden/principal-parts.ts` lists principal parts (nominative,
genitive, partitive, illative, essive, inessive singular; nominative, genitive,
partitive, inessive, illative plural) for 131 words covering all 35 declension types,
typed in independently from the engine.
`src/grammar/__tests__/golden.test.ts` compares the engine with them. Other
engine tests cover vowel harmony, gradation sites, inverse gradation, illative
endings, plural stems, possessives, agreement, analysis ambiguity (*kuusen* /
*kuuden*, *taloni*) and error diagnosis (*kauppan*, *uusin*, *talossä*, *paivan*).

## 2. Kotus word list

`tools/kotus/verify-kotus.ts` downloads *Nykysuomen sanalista* (Kotimaisten
kielten keskus, CC BY 4.0) into `tools/kotus/.cache/` and checks each word's
type number and gradation letter, inverse gradation for the types where it
applies, and that compounds inflect like their head. The required attribution is
shown on the app's Credits page.

## 3. Morphology oracle (development only)

`tools/morph-oracle/check.py` compares the engine with the GiellaLT Finnish
analyser and generator (normative models), using `uralicNLP` and `pyhfst`:

1. **Analysis**: every engine form must be analysed as exactly that lemma,
   number and case.
2. **Coverage**: every standard form the generator produces should be among the
   engine's variants. Forms GiellaLT itself tags as non-standard (`Use/NG`,
   `Use/Rare`, `Use/Arch`, …) are listed in the report but not counted.

Only usage marks on readings of *this* word in *this* slot count. Until
6 October 2026 a mark on any reading excused a missing form: *susta* was skipped
as a partitive of *suksi* because its reading as the pronoun *sä* is marked
`Use/NG`. Tightening this surfaced 18 hidden differences, now adjudicated below.

`tools/morph-oracle/sentences.py` then spell-checks every rendered example
sentence (descriptive analyser for spoken-register sentences).

**Licence and distribution.** The GiellaLT Finnish models are GPL-3+ (per the
copyright file in the package). They are used only on the development machine
and are **not distributed** with the app. Nothing from them is copied into the
app's data.

**Setup** (once):

```sh
python3 -m venv tools/morph-oracle/.venv
tools/morph-oracle/.venv/bin/pip install -r tools/morph-oracle/requirements.txt
# Models: the giella-fin package from the Apertium nightly repository (HTTPS):
#   https://apertium.projectjj.com/apt/nightly/pool/main/g/giella-fin/
# Extract analyser-gt-norm.hfstol, analyser-gt-desc.hfstol, generator-gt-norm.hfstol
# and generator-gt-desc.hfstol into tools/morph-oracle/models/fin/.
```

(uralicNLP's own model download was not used because it fetches over plain HTTP
without certificate verification.)

### Adjudicated differences

When the engine and GiellaLT disagree, the case is settled against a second
source (Wiktionary declension tables, which follow the Kotus types) and recorded
in `tools/morph-oracle/adjudicated.json` with the reason. The 312 adjudicated
forms come from these rules:

- **Engine form confirmed (17 forms)**, e.g. *tyttärien / tyttäriä / tyttäriin*
  (Kotus 32*C keeps the strong grade; GiellaLT generates weak *tytäriä*),
  *tee → teiden / teitten*, *vihreätä / vaikeata* (accepted -tA variants),
  *taivasten* (Wiktionary: rare, as *vierasten*).
- **Whole slots confirmed (2)**: the plural of *veri* and of *hiki*
  (Wiktionary lists them; *hi’issä* is written with an apostrophe).
- **Oracle paradigms ignored for a different lexeme (13 words)**: homonyms where
  GiellaLT also generates another word, e.g. *vuori* 'lining' (Kotus 5) next to our
  *vuori* 'mountain' (Kotus 26), *kuori* 'choir', *lahti* 2, a non-gradating
  *äiti* paradigm.
- **Archaic or dialectal oracle forms (14)**: e.g. consonant-stem essives
  *suurna*, *nuorna*, *punaisna*.
- **Oracle forms the second source does not list (18)**: GiellaLT spells 17
  forms of *ruoka* with an apostrophe (*ruo’an*); Wiktionary lists only *ruoan /
  ruuan*, and the apostrophe marks two identical vowels meeting (*vaa’an*). It
  also generates *susta*; Wiktionary gives *suksi* (Kotus 7) only *suksea*.

Changes made to the engine because of the oracle (all confirmed in Wiktionary):
the grade of the type 14 plural essive; type 23 plural genitive *-ten*; rare *-ten* for types
27/28; rare *-ihin* for types 41/44; *-isiin* for type 43; the order and rarity of
the short *o*-plurals of type 11; the comitative *-inensA* for nouns and *-ine*
for adjectives; the apostrophe character; *vuonna* as the essive of *vuosi*.

## 4. Content

- `src/data/__tests__/content.test.ts`: every sentence renders through the
  engine, has an English translation, is capitalised and contains no
  placeholder text; every case's usage sentences and demo forms exist; every rule
  id and diagnosis has explanation text.
- `src/data/__tests__/curriculum.test.ts`: 54 lessons, prerequisites in order,
  every referenced word, form, sentence and glossary term exists, and every
  lesson check can generate its exercises.
- `src/data/__tests__/yki.test.ts`: every noun form listed for a YKI model
  answer appears in that answer exactly as the engine builds it.
- `src/services/__tests__/exercises.test.ts`: all ten exercise generators
  produce well-formed items whose answers come from the engine; distractors are
  never accepted spellings; error-correction "mistakes" are never real word forms.

### Word-specific explanations

`npm run audit:explanations` (`tools/audit/explanation-audit.ts`) and
`src/services/__tests__/explain.test.ts` check the "Explain this form"
explanations against the engine:

- every form (9,007 base-form variants; with `-- --px` also the possessive
  forms) gets an explanation built from its own derivation, and the explanation
  checks itself: the coloured pieces spell exactly the form, the named stem is one
  of the word's stems (`grammar.stems()`), and stem + ending (+ suffix)
  reproduces the engine's result, replaying any spelling change the engine
  recorded. Forms handled by an override (*vuonna*, *merta*) or lexicalised in a
  sentence (*kotona*) are reported as *recorded* and get no regular derivation;
- each sentence's "why this case here" note uses a reason that fits the token's
  case and number, and its trigger word really occurs in the sentence;
- every Finnish form cited in a general rule text is derived with that rule
  (deliberate counter-examples are listed by name), and the examples of rule
  notes such as the Plural Lab's show the stated pattern, including the j
  spelling.

These checks prove consistency with the engine, not linguistic correctness:
the templates, reasons and notes are curated content and await native-speaker
review like the sentences.

While building this, one engine metadata problem was found and fixed
separately: variant stems (*ruoka* → *ruua-*, *ruui-*) marked the whole
differing tail as a stem change, so the plural *i* of *ruuissa* was coloured as
part of the change. `altForm` in `src/grammar/stems.ts` now marks only the
differing letters (*u*, was *o*) and keeps a shared ending with its roles; the
forms themselves did not change (engine test "variant stems").

### Native-speaker review

The example sentences, lessons and explanations were drafted for this app and
checked by machine (the engine renders every form; the analyser recognises every
word). **They have not yet been reviewed by a native speaker.** Every sentence
and word carries `provenance.nativeReview: false` until it has been.

## 5. Media licences

Photos (35) come from Wikimedia Commons through `tools/images/fetch-commons.ts`:

- Each file was chosen by hand after viewing it and its metadata
  (`tools/images/commons-manifest.json` records the review date).
- The script copies the file's own metadata from the Commons API: licence name
  and URL, author, the provider's attribution text, usage terms, restrictions.
- It rejects any file without a licence name or author, with an unknown author,
  with restrictions (e.g. personality rights, trademarks), or with a licence
  outside the accepted list (CC0, public domain, CC BY, CC BY-SA). The list is
  our acceptance policy; it is not a statement about any file.
- Thumbnails (500 px) are stored locally; the modification is recorded per file.
- `src/data/__tests__/photos.test.ts` fails if any credit field is missing, a
  licence is not on the list, a file is not shipped locally, or a word lacks a
  picture fallback.

Illustrations are original SVG artwork made for the app. Emoji are drawn by the
user's system font and are not bundled.

## 6. Grammar audit

`npm run audit:grammar` runs 43 checks in three audits and writes a filterable
report to `tools/audit/out/report.html`, with a separate verification status
(how it works and how to extend it: [tools/audit/README.md](../tools/audit/README.md)):

- **Vocabulary** (V01–V10): Kotus data, the analyser knows every lemma,
  homonyms, compounds, vowel harmony, content fields, usage and level order.
- **Morphology** (M01–M10): every base and possessive form (8,126 + 39,066)
  against GiellaLT in both directions, morph pieces, ending and suffix harmony,
  paradigm shape, and the native-review gate (§7). M01/M02 reproduce
  `verify:morph`.
- **Sentence** (S01–S23): spelling, lexicon words typed by hand instead of as
  tokens, the grammar around tokens (agreement, numerals, adpositions, verb
  government, negation, object form, subject–verb number), levels, and the
  spelling of lesson text, glossary and YKI answers.

`npm run audit:test` checks that every grammar check flags a deliberately wrong
sentence and accepts the corrected one.

### From the baseline (5 October) to the second run (6 October)

**Engine errors fixed (138 possessive forms).** Disagreements were settled
against Kielitoimiston ohjepankki, *Omistusliitteet: muoto eri persoonissa*:
after an *n*-final case (genitive, illative) only *-nsA* is possible; after a
short vowel *-Vn* is possible; the suffix follows vowel harmony.

- The engine added *-Vn* after the illative: *taloihiin*, *maahaan*, *työhöön*.
  Now only *taloihinsa*, *maahansa*, *työhönsä* (`src/grammar/possessive.ts`).
- The suffix took the word's harmony instead of the case ending's: *mertansä*,
  *vertansä*. Now *mertansa*, *vertansa*, after the back-vowel partitive *merta*.
- Rare case forms now take possessive suffixes too (*hampaihin* →
  *hampaihini*), marked rare, as GiellaLT has them.

Unit tests cover all three. GiellaLT's own possessive defects are recorded as
known oracle defects in `morphology-audit.py` (it rejects *lapsilleen* and
generates *lapsillean*; gives *hetki* back-vowel suffixes; generates *kalaaan*;
lacks *liemeään*).

**Content cleaned up.**

- 18 nouns that sentences used as plain text were added to the lexicon (Kotus
  types checked): *aurinko, elokuu, euro, jää, keitto, keskusta, lauantai,
  lintu, metsä, perjantai, peruna, ranta, ruoho, sunnuntai, syksy, taivas, takki,
  uutinen*.
- 408 hand-typed lexicon words in sentences became engine tokens. Objects use
  `:acc` (*Otan {kirja:acc} pöydältä*), imperative and passive objects `:acc0`.
  All 820 sentences rendered character for character as before. Only
  comparatives (*paras*) remain typed: the engine does not form them.
- Levels made consistent: 20 words take the level of the first lesson that uses
  them; 517 sentences take at least the level of their words and at most that
  of the first lesson that shows them. Lesson 2.1 shows *Asumme kaupungissa*
  instead of a level-5 word.
- Duplicate sentences f.1, n.73 and h.52 removed; their tags moved to the
  sentences they duplicated. *meri* takes both inner and outer locatives;
  *työ* is no longer tagged a place (*töissä* is lexical); five English glosses
  no longer collide; 14 concrete nouns got a faithful emoji; *kotona* is now
  the focus of *Olen kotona koko päivän*.
- Exercise generators: when a form fills several slots (*lauantaita*:
  singular and plural partitive), every correct answer is now offered.

**Reviewed exceptions** are in `tools/audit/waivers.toml`, each with its
reason. They cover:

- *Odota hetki* (a duration adverbial);
- *saareen* 'to the island';
- one analyser part-of-speech error (*suukko*);
- the contrastive *ilman rahaa* example;
- 25 concrete nouns with no faithful emoji.

## 7. Native-speaker review gate

Some learner-facing forms are not confirmed by the independent analyser:
the engine's form was settled against a second source by the app's authors.
Check M10 lists them in groups by that judgement:

| Group | Groups | Forms |
|---|--:|--:|
| Adjudicated base forms and their possessives (§3), e.g. *tyttärien*, *teiden*, the rare *-sten* genitives, the plural of *veri* | 19 | 165 |
| Known GiellaLT possessive defects: plural allative *-lleen* (264), suffix harmony (23), *-Vn* after *-eA* (3) | 3 | 290 |
| Lexicalised literals in sentences: *kotona*, *kotoa*, *kotiin* | 3 | 4 |
| **Total** | **25** | **459** |

The reviewer's packet is [NATIVE_REVIEW.md](NATIVE_REVIEW.md), regenerated by
every `npm run audit:grammar`. It lists every group and form, with:

- what GiellaLT says and the second source;
- why a person must check it;
- the group's priority: 6 High, 10 Medium, 9 Low;
- a reviewer checklist;
- separate questions on morphology, natural usage, lexical/semantic
  correctness and the explanation the app shows.

The decisions are recorded in `tools/audit/reviews.toml`, the authoritative
record, which only people edit. Each group is then:

- **VERIFIED** when a native speaker answered `correct` on every dimension it
  asks;
- **NEEDS CORRECTION** when anyone answered `incorrect` or marked a form wrong
  (an error until fixed and reviewed again);
- **PENDING** otherwise.

`npm run audit:grammar` prints each group's status. The project counts as
verified only when all 25 groups are VERIFIED. The report shows all five
criteria:

1. no engine errors;
2. no unexplained morphology differences;
3. every critical form reviewed by a native speaker;
4. no other open errors or warnings;
5. every check ran on one snapshot.

`npm run verify:all` runs every automated check and prints the final summary.
On 6 October 2026 every automated check passes, but no group has been reviewed
(0/25 groups, 0/459 forms). The final status is therefore **NOT VERIFIED**.

## Known limitations

- Possessive forms are checked slot by slot against the oracle by the grammar
  audit (§6), not by `verify:morph`.
- The audit's sentence grammar checks look only at neighbouring words inside a
  clause; they catch clear errors, not every error.
- The lexicon covers 293 words and the 35 declension types they need; spelling-
  based classification of other words is a hint, never a verdict.
- Rare cases (abessive, comitative, instructive) are generated for every word,
  but their use is limited in modern Finnish; the app labels them as rare.
