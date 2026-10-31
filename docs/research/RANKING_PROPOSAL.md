# Choosing nouns: evidence, usefulness and patterns (proposal)

Phase 1 proposal for review (revision 3). **Nothing here is implemented or
approved**, and the app's data is unchanged. Every number with a threshold is
a **product heuristic**, not a research standard.

Related documents:

- the frequency evidence: the full Yle extraction in
  [yle-extraction/](yle-extraction/README.md), assessed in
  [DATA_QUALITY.md](DATA_QUALITY.md) and [COMPARABILITY.md](COMPARABILITY.md);
- the sources: [SOURCES.md](SOURCES.md).

**Changes since revision 2:**

- The full 14-year extraction exists. Frequency evidence is reported with
  several statistics side by side, and **none is chosen as primary**
  (COMPARABILITY.md §7).
- **Bands no longer gate anything.** Revision 2 required F1–F2 for the
  *core* role; that requirement is removed. The bands F1–F4 are
  **descriptive only**. They are never an eligibility criterion or a
  priority rule.
- **What frequency evidence may still do:**
  - limit what the app may *claim* about a word;
  - draw a reviewer's attention to flagged measurements.

## Two separate records: evidence and decisions

| | Frequency evidence (D1) | Pedagogical decisions |
|---|---|---|
| What | Counts, rates, ranks, bands, flags, confidence for one corpus | Stage, role, order of introduction, what the app says |
| Produced by | `extract.py` / `analyse.py` (reproducible, automatic) plus documented rules | People, using all six dimensions; recorded with reasons |
| Where | `docs/research/yle-extraction/data/` (research only) | A future decisions file (Phase 3); not created |
| May change | When the corpus or a rule changes (re-run) | Only by review |
| Never | Overwritten by a decision; used as an eligibility rule | Written back into the evidence |

## Principles

1. **Six dimensions, kept apart.** Corpus evidence, usefulness, themes,
   morphology, lexical quality and verification are recorded separately. None
   is converted into points or blended with another.
2. **One source, one measurement.** Counts from different corpora are never
   added, averaged or merged. The easy-to-read corpus and Suomi24 are
   comparison signals only, and Suomi24 does not influence rankings.
3. **Frequency informs; it does not decide.** No band, rank or statistic is a
   hard criterion for eligibility, role or priority.
4. **No claim without its measure.** The app may never say "common in
   Finnish". Any frequency statement names the source ("frequent in Yle news
   2011–2024") and is allowed only when the evidence supports it (below).
   There is no spoken measure.
5. **`Noun.frequency` keeps its editorial meaning.** It is not overwritten,
   renamed or recomputed.
6. **Uncertain evidence is reported as uncertain.** "Approximate",
   "unresolved" and "unsuitable" are part of the record. Nothing is estimated
   where meanings cannot be separated.

## The six dimensions

| # | Dimension | Content | Origin | Who decides |
|---|---|---|---|---|
| D1 | Corpus frequency evidence | Raw and adjusted counts and several statistics side by side (pooled, per part, median of parts, median of years, variability, corpus ranks), provisional bands, flags, confidence (schema below). No statistic is designated primary | Korp extraction of the primary source ([yle-extraction/](yle-extraction/README.md)) | Automated; rules reviewed by a person |
| D2 | Practical usefulness | How much an adult living in Finland needs the word: *essential*, *useful* or *peripheral*, with a written reason and typical situations (a shop, a health centre, the landlord) | Editorial | Author, then a Finnish teacher or native speaker |
| D3 | Everyday communication themes | Sija `themes`, loosely aligned with the YKI topic areas | Editorial | Author; reviewed |
| D4 | Morphological pattern coverage | Kotus type, gradation, -i family, stem features, compound head | **Computed** by the engine (`grammar.type`, `gradation`, `stems`) | Nobody: never typed by hand |
| D5 | Lexical quality and confidence | Homographs (*kuusi*), POS conflicts (*vieras*), merged senses (*lehti*, *kuu*), lexicalised forms (*koti*), register | Forensic checks (KORP_PILOT §2) | Automated flags plus review |
| D6 | Linguistic verification | Kotus match, oracle match, `nativeReview`, `reviews.toml` | Existing tooling | Unchanged; ranking never alters it |

**On the YKI alignment.** The YKI framework (2011) lists nine topic areas and
classifies topics, not words. Sija's mapping of its themes to those areas is
a loose alignment, used only to check that everyday areas are covered:

| YKI topic area (framework) | Sija themes (our alignment) |
|---|---|
| A Minä ja taustani | family, people, language, leisure |
| B Koti ja asuminen | home |
| C Kauppa ja palvelut | shop, money, services, food |
| D Kulttuuri | leisure, food |
| E Matkustaminen | transport, city |
| F Terveys ja hyvinvointi | health, body |
| G Työ | work, school, daycare |
| H Ympäristö | nature, weather |
| I Yhteiskunta | services, city |
| (no single area) | time, numbers, descriptions |

Sija's stages and classes are **not** YKI or CEFR levels.

## Measurement and data-quality schema

Three record types. The research extraction implements them as files under
[`yle-extraction/data/`](yle-extraction/README.md): `denominators.csv` and the
provenance table (source), `rules.json` (rules), and `counts_by_year.csv`,
`adjustments_by_year.csv` and `statistics.csv` (measurements). None of them
is in `src/`.

**Source record** (one per measured corpus set):

```
sourceId            "korp:yle-fi-2011-2024-s"
corpora[]           per corpus ID: id, years, tokens, wordTokens, sentences, texts, korpUpdated,
                    metadataPid, locationPid
licence             verbatim CMDI fields (licence, availability, restrictionsOfUse, licensor,
                    distributionRightsHolder), licence page URN and date, checkedOn, checkedBy
attribution         text actually used
denominators        tokens (incl. punctuation) | wordTokens | texts, total and per corpus
annotation          attributes; parser per part where stated; "not stated" otherwise
caveats[]           e.g. "sentences scrambled within texts", "overlaps with …"
role                primary | comparison-only | excluded
```

**Rule record** (one per correction rule; J1, J2, K1, S1, H1, F1, P1, R1 in the pilot):

```
ruleId, lemma, kind          exclude | include | not-separable | repeated-text
cqp / description            exact query or pattern
evidence[]                   sample query, n, seed, judgement counts, judgedBy (AI | native speaker)
falseRemovalCheck            the query and result that test whether genuine uses are removed
effect                       hits removed or added
status                       proposed | native-reviewed | rejected
```

**Measurement record** (one per lexeme per source):

```
lexemeId, sourceId, retrieved
target              lemma, POS, sense (when the rule separates one)
query               CQP, group_by, rules applied[]
raw                 count, perMillion
adjusted            count, perMillion, removed, added, ruleIds[]
unresolved          count, description           e.g. "6,683 nominative hits not separable"
statistics          pooled, per part, median of parts, median and mean of years, min/max year, CV, DP,
                    high/low years and parts, body-text equivalents, corpus ranks per statistic
repeatedText        checked: yes/no, threshold, removed
flags[]             homograph-pos, pos-conflict, senses-merged, lexicalised-forms,
                    proper-noun-overlap, topic-skew, repeated-text, near-boundary, unchecked-in-context
bands               provisional band per statistic + distinctBands + nearBoundary (descriptive only)
confidence          usable | approximate | unsuitable, with basis (context-checked or automatic only)
```

A measurement whose confidence is *unsuitable* gets no band. A word
whose only checks are automatic is *unchecked in context*, which is stated,
not hidden.

## Frequency evidence: statistics and bands (descriptive only)

**Statistics.** For every noun, `statistics.csv` reports:

- the pooled rate;
- each part's rate;
- the median of the three part rates;
- the median and mean of the 14 yearly rates, with the range, CV and DP;
- the number of high and low years and parts;
- body-text equivalents;
- corpus ranks under each statistic.

Their advantages and failure modes are compared in COMPARABILITY.md §7. **No
statistic is designated primary.** The parts cover 8, 3 and 3 years with very
different token volumes, and the parser question is open.

**Bands (provisional).** F1 ≥ 100 per million tokens, F2 10–100, F3 1–10,
F4 < 1. Evenly spaced on a log scale, chosen after inspecting the
distribution. They are a heuristic. How each statistic changes the band
counts for the lexicon:

{{BAND_SENS}}

{{BAND_UNSTABLE_COUNT}}

**What bands are used for:**

- **Review tables:** a coarse description of the evidence, shown next to the
  other five dimensions.
- **Claims:** the app may say "frequent in Yle news 2011–2024" only if the
  noun's confidence is *usable* or *approximate* **and** it is F1 under every
  statistic (pooled, every part, both medians). Otherwise the app says nothing
  about frequency. This is a rule about *wording*, not about eligibility.

**What bands are never used for:** deciding whether a noun is taught, its
role, its stage or its order.

## Choosing words: roles, not a sort order

### The roles

Roles are decided by usefulness (D2), themes (D3) and patterns (D4). Frequency
evidence (D1) is shown beside them but **does not decide the role**.

| Role | Decided by | What the learner may be told |
|---|---|---|
| **Core vocabulary** | D2 *essential*: needed across many everyday situations | A frequency statement only if the claim rule above is met; otherwise nothing |
| **Situational word** | D2 *essential* or *useful* for a specific situation (shop, kitchen, health centre) | "A word for [situation]". No frequency claim unless the claim rule is met |
| **Pattern example** | Chosen for a D4 pattern | "Chosen to show how this type inflects". Never presented as common |
| **Contrast word** | Forms a teaching contrast (*tuuli/tuoli*, *kuusi/kuusi*) | "Compare with …" |

### The procedure for one stage

1. **Needs.** The stage definition lists its patterns (D4) and its everyday
   themes (D3).
2. **Candidates.** Lexicon nouns (and later, approved imports) that show a
   needed pattern or belong to a needed theme. A noun that is frequent in
   news but not in the lexicon (*presidentti, poliisi, hallitus*) is **not**
   a candidate unless the usefulness review proposes it.
3. **Eligibility.** D6 machine checks pass (Kotus, oracle), and any D5 issue
   affecting the intended sense is resolved. Frequency is **not** an
   eligibility condition: *vieras* (unsuitable evidence) and *lusikka* (F3)
   are as eligible as *talo*.
4. **Roles,** as defined above.
5. **Evidence review.** The reviewer sees each candidate's frequency profile:
   - statistics and bands under each method;
   - flags and confidence.

   Flags are prompts, not verdicts. A *part-sensitive* or *band-unstable*
   noun is not demoted; its evidence is simply described with care.
6. **Order of introduction within the stage**, in this order:
   - morphological simplicity (fewest additional changes first);
   - usefulness (D2);
   - existing curated sentences.

   The reviewer may consult frequency evidence when two candidates are
   otherwise equal, and records that it was used.
7. **Record.** One decision row per word: `{ lexemeId, stage, role, reason,
   evidenceConsulted, decidedBy, date }`.

### How this keeps news topics and artefacts out of the curriculum

- Frequency never sorts or gates candidates.
- The candidate pool comes from needs (patterns, themes), not from the corpus.
- Several statistics are shown together. A spike (*kortti*, *puhelin*'s
  promotion, *uutinen*'s link lines) shows up as disagreement between them
  and as flags, instead of silently raising one number.
- The forensic rules, the *unresolved* counts and the *unsuitable* status
  keep tagging errors (*joki*, *kuu*, *sää*, *vieras*) from raising or hiding
  a word.

### Pedagogical trade-offs

- **News under-represents daily life.** Kitchen, food and shopping words are
  rare in news (*lusikka*, *keitto*, *banaani*, *kuitti*: F3). Because bands
  no longer gate roles, these words compete on usefulness. The cost: their
  selection rests on editorial judgement, which must be written down and
  reviewed.
- **Usefulness (D2) becomes the deciding dimension.** It is the least
  objective one, so it needs a teacher or native speaker. This is a
  deliberate trade: corpus objectivity is given up where the corpus is
  unrepresentative of the learner's needs.
- **The claim rule is strict.** Requiring F1 under every statistic means few
  words may be described as frequent. Some genuinely common words will carry
  no claim; that is accepted in exchange for never over-claiming.
- **Pattern examples teach the system but can mislead about usefulness.**
  The label must be visible. A cap of one or two pattern examples per pattern
  (a heuristic) keeps the lexicon from filling with rare words.
- **One primary source** keeps licensing clean (CC BY) and the measure
  interpretable, but it is a single register with an unresolved release
  status for 2022–2024 and an unresolved parser question for 2011–2021.
- **Lexicalised forms** (*kotona* under *koti*) and merged senses (*kuu*) are
  teaching decisions, not corpus facts. The records keep both figures.

## Where the data lives

- **Research dataset:** `docs/research/yle-extraction/` holds the scripts,
  the log and the raw and derived data. It is derived from a CC BY source and
  carries its attribution.
- **Raw API responses**, including the 14 full noun lemma lists, stay in a
  cache **outside** the repository; the log's SHA-256 values identify them.
- **Nothing in `src/`.** Whether any frequency information ever ships (at
  most a word's role and a claim flag, with attribution) is a separate
  decision.

## A deliberate set of pattern examples (provisional)

For each pattern: the best-evidenced lexicon noun, and the lower-evidence
nouns with a **proposed** role. Values are Yle per million (pooled, raw) from
the full extraction; the bands are provisional and descriptive. **Low
frequency does not exclude a word**; the roles below are proposals for review.

| Pattern (Kotus type) | Best-evidenced example(s) | Lower-evidence nouns and proposed role |
|---|---|---|
| k23 *tuli*-type (*tulta*, *tulen*) | *tuli* 59 (F2), *lohi* 41 (F2) | *tiili* 3.6, *vuohi* 3.3: **pattern examples** |
| k25 *lumi*-type (*lunta*) | *lumi* 167, *toimi* 164 (F1) | *liemi* 2.7: **pattern example** |
| k26 *kieli*-type | *mieli* 942, *kieli* 167 (F1) | *sääri* 2.4, *kaari* 9.4: **pattern examples**; *juuri* has an adverb homograph and is unchecked |
| k27 *vesi*-type (*vesi ~ veden ~ vettä*) | *vuosi*, *vesi*, *käsi* (F1) | *liesi* 3.7: **situational** (kitchen); *reisi* 5.1, *köysi* ~6: **pattern examples** |
| k28 *kansi*-type (*kantta*) | *länsi* 63, *kansi* 37 (F2) | *varsi* 13, *kynsi* 11 (F2, near the boundary) |
| k30 *veitsi* | — | *veitsi* 13 (F2): the only example; **pattern example and situational** |
| k32 *tytär*-type | *tytär* 70 (F2) | *sisar* 8.5 (F3): **pattern example** |
| k14 *mansikka*-type (*-kka*) | *mansikka* 25 (F2) | *lusikka* 3.8: **situational** |
| k11, k43, k44 | *omena* 16, *olut* 31, *kevät* 452: each the only example | – |
| k41 inverse gradation, *-as* | *asiakas* 371, *asukas* 294 (F1) | *hammas* 30, *rengas* 51 (F2); *vieras*: unsuitable evidence, decide on usefulness |
| k48 *-e*, inverse gradation | *perhe* 378 (F1), *sade* 94 (F2) | *lomake* 15, *kuume* 11 (near the boundary) |
| k6 loanword *-i* | *lääkäri* 199 (F1) | *banaani* 5.1: **situational** |
| k5 gradation in *-i* nouns | *kaupunki*, *pankki* (F1) | *kuppi* ~7, *kuitti* 6.3: **situational** |
| k1 with or without gradation | *katu*, *lippu*, *talo* (F1) | *mehu* ~7, *keitto* 4.9: **situational** |

The other F3 nouns (*pöllö*, *ruoho*, *poski*, *tukka*, *tentti*,
*pankkikortti*) need a role decision. All 21 F3 nouns are listed in the
extraction (`statistics.csv`).

## Screening new candidate words (if the lexicon is ever extended)

- **No blanket form exclusions.** An anomaly is handled with the forensic
  procedure of KORP_PILOT §2:
  1. the original query;
  2. the annotations;
  3. a narrow rule;
  4. a false-removal check;
  5. the remaining uncertainty.
- **Exclude, or review by hand:**
  - lemmas that are not *substantiivi* in the Kotus list;
  - lemmas of 1–2 letters, digits, punctuation, abbreviations and `Foreign`;
  - proper nouns, unless taught on purpose.
- **Check in context before using the count:** lemmas with a high share of
  other POS, or whose top forms are homographs of function words.
- **Compounds** count as their own lemma; record the head.
- **Report colloquial lemmas separately**; they do not enter the standard
  lexicon.
- New words then follow the existing add-a-word procedure and the planned
  staging pipeline in [GRAMMAR_ENGINE.md](../GRAMMAR_ENGINE.md). Each stays
  `nativeReview: false` until reviewed.

## Decisions needed

1. **Evidence and decisions as two records**, and frequency as non-gating
   evidence: the roles decided by D2–D4, and the claim rule for frequency
   statements.
2. **Which statistic(s) to show reviewers by default**, after reading the
   failure modes in COMPARABILITY.md §7. No default is proposed.
3. **The band scale** (decades per million) as a descriptive aid, or no
   bands at all.
4. **The correction rules** J1, J2, K1, S1, H1, F1, P1 and R1, and who
   reviews their samples (native speaker or teacher).
5. **R1 reviews:** confirm or change the AI reader's `boilerplate` /
   `editorial` classifications in `yle-extraction/data/r1_review.json`.
6. **koti:** teach and measure with the lexicalised forms (H1), or use the
   strict lemma count.
7. **Sending the Language Bank questions** ([KIELIPANKKI_QUESTIONS.md](KIELIPANKKI_QUESTIONS.md)).
   Until answered, 2022–2024 release status and 2011–2021 parser identity
   stay open.
8. **Suomi24:** how the NonCommercial licence applies to Sija. Until then it
   is comparison-only.
9. **The pattern-example and situational lists** below, and the cap per
   pattern.
10. **Who reviews D2 (usefulness)** and the role assignments.

## Open questions for a native speaker or Finnish teacher

- Are the AI judgements behind J1, J2, K1, S1, F1 and P1 right? The
  *joista*, *kuin* and *sää* samples matter most.
- Does the plural instructive *kuin* of *kuu* ever occur in current
  Finnish? Rule K1 assumes it does not.
- Should *kotona, kotoa, kotiin* count towards *koti* for teaching?
- Do the proposed situational words (*lusikka, keitto, kuitti, banaani,
  liesi, kuppi, mehu*) match what an adult in Finland needs early?
- For *aika* and *puoli*, should the noun or its fixed constructions
  (*aikana, puolella*) come first?
