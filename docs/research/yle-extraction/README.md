# Yle noun-frequency extraction (research only)

Noun frequencies for every noun in Sija's lexicon (264 nouns), per year, in
the Yle Finnish News Archive 2011–2024, scrambled (Korp).

**Nothing in this folder is used by the app.** No corpus-derived field is in
`src/`. The figures are corpus findings for this corpus under automatic
annotation. They are **not** a validated ranking. Correction rules are
proposals checked by an AI reader, **not native-reviewed**.

Reports built on this data:

- [DATA_QUALITY.md](../DATA_QUALITY.md): every noun's quality;
- [COMPARABILITY.md](../COMPARABILITY.md): comparability and the sensitivity
  of the statistics;
- [RANKING_PROPOSAL.md](../RANKING_PROPOSAL.md): how the evidence may be used.

## Provenance

| Item | Value |
|---|---|
| Corpus IDs | `YLENEWS_FI_2011_S` … `YLENEWS_FI_2024_S` (14) |
| Resource | *Yle Finnish News Archive 2011–2024, scrambled, Korp*, `urn:nbn:fi:lb-2025112103`. Parts: `lb-2019121004` (2011–2018), `lb-2022032201` (2019–2021), `lb-2025110403` (2022–2024) |
| Licence | CC BY 4.0, licensor Yleisradio Oy (resource metadata `licence: CC-BY`, `restrictionsOfUse: attribution`). Licence page `urn:nbn:fi:lb-2022082901` |
| Release status | 2022–2024 announced as a release candidate on 11.12.2025; current status not established (COMPARABILITY.md §1) |
| Access | Korp API `https://www.kielipankki.fi/korp/api8/` (backend 8.0.1), no login |
| Metadata read | 29.10.2026 (OAI-PMH, CMDI) |
| Extraction | 29.10.2026; every request is in `extraction_log.jsonl` |
| Input | `data/lexicon_nouns_input.json`: the 264 nouns of `src/data/lexicon` at commit `f18c1d2613ecba4f07f2236ba4b8ab148f9ccf5f` |

**Attribution** (required by CC BY): "Frequencies derived from *Yle Finnish
News Archive 2011–2024, scrambled, Korp* (Yleisradio Oy / Yle, the Finnish
Broadcasting Company), http://urn.fi/urn:nbn:fi:lb-2025112103, CC BY 4.0.
Counts retrieved through the Kielipankki Korp API on 29.10.2026; aggregated
and, where marked, adjusted."

## Reproduce

```sh
cd docs/research/yle-extraction
python3 extract.py --cache /path/outside/repo/yle-cache --phase core
python3 extract.py --cache /path/outside/repo/yle-cache --phase r1 --r1-lemmas a,b,c   # see extraction_log.jsonl for the list used
python3 analyse.py --cache /path/outside/repo/yle-cache
```

- Python 3, standard library only.
- The cache holds the gzipped API responses, including the 14 full noun
  lemma lists (about 70–110 MB each before compression). It is kept
  **outside** the repository.
- Re-running with the same cache reproduces every output exactly.
- Re-running without it refetches the data. Compare the `sha256` values in
  the log to see whether the corpus has changed (relevant while the
  2022–2024 release status is unclear).
- The input snapshot was exported from the lexicon with a one-off `tsx`
  script that read `LEXICON` (`pos === "noun"`) and wrote id, lemma, Kotus
  type, compound, editorial frequency, level, themes and gloss.

## Files

| File | Content |
|---|---|
| `extract.py` | All Korp queries. Writes the raw data files below and the log |
| `analyse.py` | Statistics, ranks, bands, flags, confidence. Offline: reads the data files and the cache only |
| `extraction_log.jsonl` | One JSON line per request: event (`fetch`, `cache-hit`, `error`), command, full URL, purpose, UTC time, HTTP status, bytes, seconds, SHA-256 of the response body |
| `data/lexicon_nouns_input.json` | Input snapshot (see Provenance) |
| `data/denominators.csv` | Per corpus ID: tokens (punctuation included), punctuation tokens, word tokens, texts, sentences, Korp `Updated`, tokens per paragraph type (`text` = body, `lead`, `headline`, `heading`, `image`, `quote`, `summary`, `shortSummary`) |
| `data/counts_by_year.csv` | **Raw counts.** One row per lemma × corpus ID × measure (below) |
| `data/forms_pooled.csv` | Raw noun-reading counts per lemma and word form (lowercased), 2011–2024 pooled |
| `data/adjustments_by_year.csv` | **Adjustments, separate from raw counts.** One row per lemma × rule × corpus ID × scope (`all` or `body`) with the kind (`remove`, `add`, `replace`, `unresolved`) and the count |
| `data/rules.json` | The exact CQP of every rule, its description and status (proposed, not native-reviewed) |
| `data/r1_windows.csv` | Repeated 7-token windows (≥100 occurrences) for the nouns checked, with counts per year |
| `data/r1_review.json` | The AI reader's classification of those windows (`boilerplate`, `editorial` or `unclear`). Only `boilerplate` windows are subtracted, in the adjusted fields |
| `data/statistics.csv` | Per noun: raw and adjusted statistics, ranks, bands, flags and confidence (below) |
| `data/full_list_summary.json` | The corpus noun-lemma population used for ranks, and the value at selected ranks for each statistic |
| `data/sensitivity.json` | How ranks and bands change between statistics |
| `data/run_core.json` | Start and end time of the core extraction |

### Measures in `counts_by_year.csv`

| Measure | Query (all 14 corpora; per-corpus rows) |
|---|---|
| `n_all` | `[lemma="(…264 lemmas…)"]`, `group_by=lemma,pos`, rows with `pos=N` and the exact lemma |
| `other_pos_<POS>` | same query, rows with another POS (e.g. *juuri* Adv, *sää* Pron) |
| `n_caplemma:<Lemma>` | `[lemma="(…)" %c & pos="N"]`, `group_by=lemma`, rows whose lemma differs from the lexicon lemma only in case (*Suomi*, *Maa*, *Ilta*) |
| `n_body` | `[lemma="(…)" & pos="N" & _.sentence_paragraph_type="text"]`, `group_by=lemma` |

Every query uses `default_within=sentence`. Lemma matching is exact and
case-sensitive unless `%c` is shown.

### Rules (`adjustments_by_year.csv`, `rules.json`)

| Rule | Lemma | Kind | Effect on the adjusted count |
|---|---|---|---|
| J1 | *joki* | remove | *joista* after a comma, not followed by *ja/sekä/tai/,*. `J1x` records the list cases as unresolved |
| J2 | *joki* | remove | plural *-kin* forms equal to the pronoun *jokin* |
| J0 | *joki* | unresolved | *joista* not after a comma: kept, reported |
| K1 | *kuu* | remove | *kuin* tagged *kuu* |
| S1 | *kuusi* | unresolved, excluded | nominative *kuusi* tagged N (spruce or numeral) |
| H1 (`H1koto`, `H1adv`) | *koti* | add | allow-listed `koto` forms; adverbs *kotona/kotoa/kotiin* |
| F1 (`F1lang`, `F1initial`) | *suomi* | replace | language sense = lowercase, non-sentence-initial forms; sentence-initial hits unresolved |
| P1 | *sää* | add | bare *sää* tagged Pron |
| R1 | any checked noun | remove | only windows classified `boilerplate` in `r1_review.json` |

Each rule is computed per year and for both scopes (all text, body text).
Raw counts are never changed.

### Fields in `statistics.csv`

Rates are **per million tokens**, punctuation included (Korp `Size`), unless
named `…_word_tokens` (punctuation excluded) or `body_…` (body-text tokens).

| Field(s) | Definition |
|---|---|
| `raw_total`, `raw_pooled_pm` | sum over 14 years; ÷ all 14 years' tokens (token-weighted) |
| `raw_pooled_pm_word_tokens` | same, ÷ word tokens |
| `raw_part_A/B/C_pm` | per part: 2011–2018, 2019–2021, 2022–2024, each ÷ its own tokens |
| `raw_median_parts_pm` | median of the three part rates (each part weighted equally) |
| `raw_median_years_pm`, `raw_mean_years_pm` | median and unweighted mean of the 14 yearly rates |
| `raw_min_year_pm`, `raw_max_year_pm`, `raw_cv_years` | range and coefficient of variation of yearly rates |
| `raw_dp_years` | Gries' deviation of proportions over the 14 yearly corpora (0 = spread like the corpus, 1 = all in one year) |
| `raw_part_ratio` | max ÷ min of the three part rates |
| `high_years`, `low_years` | years with a rate ≥ 1.5× / ≤ 1/1.5× the noun's own median yearly rate (heuristic) |
| `high_parts`, `low_parts` | the same for the three parts against the median of parts |
| `years_F1` … `years_F4_or_absent` | number of years in each provisional band |
| `body_total`, `body_pooled_pm`, `body_median_parts_pm`, `body_share_of_hits` | body-text counts and rates; share of the noun's hits in body text |
| `other_pos_total`, `other_pos_share` | readings of the same lemma with another POS |
| `caplemma_total`, `caplemma_share` | noun readings with a capitalised lemma variant |
| `top_form`, `top_form_share` | most frequent word form of the noun reading and its share |
| `adj_rules`, `adj_total`, `adj_pooled_pm`, `adj_part_*_pm`, `adj_median_*_pm` | the same statistics after the rules in `adj_rules`; empty when no rule applies |
| `unresolved_total` | hits a rule marks as not separable or uncertain |
| `r1_windows_ge100`, `r1_hits_in_windows_ge100` | repeated windows found (only for nouns checked with R1) |
| `rank_<method>` | corpus rank among all noun lemmas with a lowercase initial, under `pooled` (raw count), `A`, `B`, `C`, `median_parts` or `median_years` (rates). Competition ranking: 1 + the number of lemmas with a strictly higher value. An adjusted value is ranked against the raw population |
| `band_<method>` | provisional band F1 ≥ 100/M, F2 10–100, F3 1–10, F4 < 1, F0 absent, under each method; `min_part` = the lowest part rate; `body_pooled` = body text |
| `distinct_bands` | how many different bands the methods give |
| `flags` | automatic flags (below) |
| `confidence` | `usable`, `approximate` or `unsuitable` (below) |
| `context_checked`, `confidence_basis` | whether an AI reader looked at samples (Phase 1), or only automatic checks ran |

Ranks, bands and flags use the **adjusted** value where a rule applies; the
raw values stay in their own fields.

**Flags** (heuristic thresholds; no flag removes data):

| Flag | Meaning |
|---|---|
| `homograph-pos` | ≥ 10% of the lemma's readings have another POS |
| `proper-noun-overlap` | ≥ 10% of noun readings have a capitalised lemma |
| `form-concentrated` | one word form makes up ≥ 40% |
| `part-sensitive` | part rates differ ≥ 1.5× |
| `year-uneven` | DP ≥ 0.20 |
| `band-unstable` | methods disagree on the band |
| `near-boundary` | pooled rate or median of parts is within 15% of a band boundary |
| `non-body-heavy` | under 50% of hits in body text |
| `repeated-text-candidate` / `repeated-text-reviewed` | R1 windows found, not yet reviewed / reviewed |
| `adjusted:<rules>` | a rule applies |
| `unresolved-part` | part of the count could not be separated |
| `pos-conflict` | the noun cannot be isolated |

**Confidence:**

- **Unsuitable:** the target noun cannot be isolated (*vieras*).
- **Approximate:** a rule applies, or any flag other than `near-boundary` or
  `repeated-text-reviewed` is present.
- **Usable:** no such flag.

Confidence describes the **measurement**, not the word's usefulness. For
nouns not read in context, it rests on automatic checks only.

## Limitations

- Automatic annotation; the parser for 2011–2021 is not established, and
  annotation equivalence across parts is **not** assumed.
- The 2022–2024 part was announced as a release candidate; its current status
  is not established.
- The rules rest on AI-read samples of 20–100 hits and are not native-reviewed.
- **Rank population:** all noun lemmas with a lowercase initial. It includes
  compounds and misparsed tokens. Per-year entries with a count of 1 are
  dropped (they cannot outrank any lexicon noun). Proper nouns written in
  lowercase are not removed.
- **R1** (repeated text) was run only for the nouns listed in the log. Other
  nouns may contain unchecked boilerplate.
- **Scope.** News text only: no spoken measure, and Suomi24 is not used.
