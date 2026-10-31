# Comparability and sensitivity: the 14 Yle corpora

A research-only report on whether noun counts from the 14 yearly corpora
`YLENEWS_FI_2011_S` … `YLENEWS_FI_2024_S` can be compared, and on how the
choice of statistic changes the results. **Nothing here is a validated
ranking**, and app data is unchanged.

Related documents:

- sources and licences: [SOURCES.md](SOURCES.md);
- the pilot: [KORP_PILOT.md](KORP_PILOT.md);
- the full extraction: [yle-extraction/README.md](yle-extraction/README.md);
- per-noun quality: [DATA_QUALITY.md](DATA_QUALITY.md).

Dates and status:

- **Preflight queries:** 28–29 October 2026.
- **Full extraction:** 29 October 2026 (log:
  [yle-extraction/extraction_log.jsonl](yle-extraction/extraction_log.jsonl)).
- **Korp API:** `https://www.kielipankki.fi/korp/api8/`, backend 8.0.1, CQP 3.4.34.
- **Metadata:** read through the CLARINO OAI-PMH service on 29.10.2026.
  The Kielipankki news pages and download folders were read the same day.
- **Checked by:** AI-drafted research. **No answer from the Language Bank
  yet:** draft questions are in [KIELIPANKKI_QUESTIONS.md](KIELIPANKKI_QUESTIONS.md),
  not sent.

## Summary

- **Release status (2022–2024):** the Language Bank announced the 2022–2024
  extension as a **release candidate** on 11.12.2025. Current records
  (29.10.2026) show none of the release-candidate markers the Language Bank
  describes. **No record states that the status was changed**, so the
  current status is not established (§1).
- **Tag inventories match.** All 14 years have the same POS tags and noun
  MSD features, in the same formats. That is evidence of a common
  **schema**. It does not show identical **parser behaviour**.
- **Ordinary behaviour matches.** Ordinary, gradating and compound nouns are
  lemmatised identically in every year. The known systematic errors (*joista*,
  *kuin*, *kuusi*) recur at similar rates in all three parts.
- **The parser is not established** for 2011–2018 and 2019–2021 (§2).
- **Material differences exist between years and parts:**
  - text composition (image texts 1.9% → 7.9% of tokens);
  - boilerplate present in some parts only;
  - a drifting tagging error (*sää*);
  - shifts in unknown-word and proper-noun tag rates from 2020.

  The cause of these shifts (annotation, content, or both) is **unresolved**.
- **Aggregation is unsettled.** The pooled rate, part rates, the median of
  part rates and the median of yearly rates are all reported side by side,
  with their failure modes (§7). None is designated as the primary statistic.

## 1. Release, version and extraction record

| Item | 2011–2018 | 2019–2021 | 2022–2024 | Combined 2011–2024 |
|---|---|---|---|---|
| Korp corpus IDs | `YLENEWS_FI_2011_S` … `_2018_S` | `_2019_S` … `_2021_S` | `_2022_S` … `_2024_S` | all 14 (alias `ylenews-fi-2011-2024-korp-s`) |
| Resource (metadata PID) | `lb-2019121004` | `lb-2022032201` | `lb-2025110403` | `lb-2025112103` |
| Location PID | `lb-2019121006` | `lb-2022032202` | `lb-2025110404` | `lb-2025112104` |
| Status in Kielipankki's resource table (29.10.2026) | available, PUB, no label | available, PUB, no label | available, PUB, no label | available, PUB, no label |
| Publication year (same table) | 2019 | 2022 | 2025 | 2025 |
| Korp `Updated` | 2019-12-02/03 | 2022-03-31 | 2025-11-20/21 | – |
| `metadataLastDateUpdated` | 2024-03-01 | 2024-03-26 | 2026-02-10 | 2026-02-10 |
| Tokens (metadata = Korp) | 207,500,221 | 79,018,994 | 62,941,530 | 349,460,745 |
| Licence (metadata) | CC-BY, attribution, available-unrestrictedUse | same | same | same |
| Version number | none given | none given | none given | none given |

### Release status of the 2022–2024 extension

**The announcement.** The Language Bank news item "Extended corpus: Yle
Finnish News Archive 2022–2024 (release candidate)", dated **11.12.2025**
(`kielipankki.fi/news/extended-corpus-yle-finnish-news-archive-2022-2024-release-candidate/`,
read 29.10.2026), covers `lb-2025102201` (academic version) and
`lb-2025110403` (scrambled). It links them as "Open the extension of the
corpus in Korp (release candidate)" and states: *"Please note that the
extension is a release candidate and small changes may be made without
further notice."* The whole 2011–2024 collection is linked without that
label.

**The definition.** Kielipankki's "Resource release life cycle" page says a
release candidate:

- carries the label in its name, in Korp and in the list of published
  resources;
- has a `RELEASE_CANDIDATE.txt` file in its download folder;
- has a metadata note that it may change without notice.

The label is removed "if no requests for corrections or changes are received
within a period of around two weeks".

**Current records (29.10.2026):**

| Marker | Found? |
|---|---|
| "release candidate" or "RC" in the CMDI `resourceName` (`lb-2025110403`, `lb-2025112103`) | No |
| A "may change without notice" note in those metadata records | No |
| A label in Kielipankki's resource table | No (status "available") |
| An RC label in the Korp title template (`default_mode.js`, fetched 28.10.2026) | No |
| `RELEASE_CANDIDATE.txt` in `download/YLE/fi/2022-2024-s-vrt/` | No (`LICENSE.txt`, `README.txt`, md5, zip; README `Last-Modified` 05.03.2026). That folder is the VRT resource `lb-2025110405`, not the Korp corpus. |
| A later news item | 10.3.2026, "New resources: Yle Finnish News Archive 2022-2024 in VRT format". It says nothing about the release status of the Korp version. |

**What can and cannot be concluded:**

- **Established:** on 11.12.2025 the extension was a release candidate.
- **Established:** on 29.10.2026, none of the documented markers is present.
- **Not established:** that the status was formally changed, when, or
  whether the data changed. No record found states it. Korp's `Updated`
  date for 2022–2024 (20–21.11.2025) predates the announcement, which
  suggests no re-import since. But `Updated` is not documented as recording
  every change.
- **Therefore:** this report does not call the 2022–2024 part either final
  or provisional. Question 1–2 in [KIELIPANKKI_QUESTIONS.md](KIELIPANKKI_QUESTIONS.md)
  asks the Language Bank directly.
- **Practical consequence:** the extraction log records the SHA-256 of every
  response, so a later re-run would show whether the 2022–2024 counts have
  changed.

### Other version information

- Kielipankki describes the archive as accruing ("Aineistot ovat karttuvia").
- The combined record describes the collection as two sets: "Yle Finnish
  News Archive 2011-2021, scrambled, Korp" and "…2022-2024, scrambled, Korp".
  Korp serves the years through the three part records above.
- The 2011–2018 VRT README gives the harvest date as 2019-03-08.
- The 2022–2024 README says the VRT download was produced from "the yearly
  VRT data from the Korp version".

### Extraction

- **Preflight queries:** 28–29.10.2026.
- **Full extraction:** 29.10.2026. Every request is in
  `yle-extraction/extraction_log.jsonl` (URL, UTC time, size, SHA-256).
- **Attribution:** see SOURCES.md.

## 2. Parser and annotation details

| | 2011–2018 | 2019–2021 | 2022–2024 |
|---|---|---|---|
| `annotationTool` in the part's own metadata | not stated | not stated | **TDPP-LBF** (`urn:nbn:fi:lb-2024021503`) |
| `annotationTool` in the combined 2011–2024 record | TDPP-LBF (for the whole collection) | same | same |
| Korp attribute list (`default_mode.js`) | `attrlist.parsed_tdt` | same | same; the extra props for 2022–2024 add only a struct attribute `text_id_orig` |
| Positional attributes | `word, ref, lemma, lemmacomp, pos, msd, dephead, deprel, lex` | same | same |
| Annotation mode | – | – | automatic (CWB-VRT) |

**Known facts:**

- The 2022–2024 part and the combined record name TDPP-LBF.
- All 14 corpora expose the same attributes and the same Korp attribute
  configuration.

**Not established:**

- Which parser and version annotated 2011–2018 and 2019–2021.
- Whether the combined record's TDPP-LBF entry means the older parts were
  re-annotated, or only repeats the 2022–2024 entry.
- What TDPP-LBF is in detail: its PID has no OAI-PMH record, and the page was
  not read.

**Asked:** questions 3–5 of [KIELIPANKKI_QUESTIONS.md](KIELIPANKKI_QUESTIONS.md)
(draft, not yet sent). The resource READMEs and news items read on
29.10.2026 contain no parser information.

A Kielipankki project report (FIN-CLARIAH 2024–25, D1.1.2) mentions plans
to re-annotate existing corpora with Trankit (UD2). That shows annotation
pipelines do change; it says nothing specific about these corpora.

## 3. Tag inventories across years

- **POS:** the same 14 tags in every year: `N V Punct Adv A C Pron Num Adp
  Foreign Symb Interj CS Pcle`. `CS` (4–47 hits per year) and `Pcle`
  (3–72) are rare in every year.
- **Noun MSD:** the same 39 feature values in every year, in the same
  TDT-style format: `NUM_`, `CASE_` (all 15 cases), `POSS_`, `CLIT_`,
  `DRV_Der_*`, `SUBCAT_Prop|Abbr|Acro|Pfx`, `OTHER_UNK`, `CASECHANGE_Up`, `_`.
  No feature is missing in any year. The number of distinct full MSD strings
  for nouns falls from 1,147–1,289 (2011–2018) to 1,043–1,075 (2022–2024).
  That is consistent with the smaller corpora and is not a change of format.
- **Formats** are identical: *kaupassa* → `NUM_Sg|CASE_Ine`;
  *Suomessa* → `SUBCAT_Prop|NUM_Sg|CASE_Ine|CASECHANGE_Up`; compounds
  `ruoka|kauppa`; possessives `POSS_Px3`.

**The noun query `[lemma="L" & pos="N"]` is syntactically and semantically
applicable in every year.** Identical inventories do not show identical
*decisions*; section 4 tests those.

## 4. Diagnostic queries by year

Each diagnostic was run once over all 14 corpora (`count`, `group_by` as
listed in the appendix). The table shows the range of yearly values within
each part. Per-year values are kept in the scratchpad.

| ID | Diagnostic (share of hits, %) | 2011–2018 | 2019–2021 | 2022–2024 |
|---|---|--:|--:|--:|
| D1 | *talo*, 11 forms → `talo` N | 100.0 | 100.0 | 100.0 |
| D2 | *kauppa*, 10 forms (pp~p) → `kauppa` N | 99.8–99.9 | 99.8–99.9 | 99.9 |
| D3 | *katu*, 6 forms (t~d) → `katu` N (rest: *katua* as the verb "regret") | 95.2–97.2 | 96.2–97.0 | 94.3–96.1 |
| D13 | *vuonna* → `vuosi` N | 100.0 | 100.0 | 100.0 |
| D6 | *kuusen* → `kuusi` N | 100.0 | 100.0 | 100.0 |
| D7 | *kuuden* → `kuusi` Num | 100.0 | 100.0 | 100.0 |
| D5 | bare *kuusi* tagged N (rest Num) | 7.8–12.3 | 8.7–11.4 | 12.0–12.3 |
| D8 | *joista* tagged `joki` N (rest `joka` Pron) | 52.1–59.0 | 54.5–59.4 | 53.9–55.4 |
| D11 | *kuin* tagged `kuu` N (rest conjunction) | 4.2–5.3 | 4.6–5.2 | 4.6–4.9 |
| D10 | bare *sää* tagged **Pron** (rest N) | 71.3–81.2 | 64.6–74.5 | 55.3–69.6 |
| D12 | *kotona* tagged `koto` N (rest adverb) | 16.2–18.6 | 10.8–18.6 | 15.4–15.9 |
| D14 | *ruokakauppa*, 5 forms → `ruokakauppa` N, `lemmacomp` *ruoka\|kauppa* | 100.0 | 100.0 | 100.0 |
| D15 | *terveyskeskus*, 5 forms → `terveyskeskus` N, *terveys\|keskus* | 100.0 | 100.0 | 100.0 |

Also checked: D4 (*kaupassa* MSD), D16 (*Suomessa* lemma and MSD) and D17
(possessive *äitinsä*, `POSS_Px3`) have identical formats in all years.

**Corpus-wide indicators per year** (range within each part):

| Indicator (per year, %) | 2011–2018 | 2019–2021 | 2022–2024 |
|---|--:|--:|--:|
| Nouns, share of all tokens | 39.5–42.1 | 39.5–40.1 | 39.8–40.4 |
| Punctuation, share of all tokens | 13.4–15.5 | 15.4–15.9 | 15.6–15.8 |
| Nouns with `OTHER_UNK` (not in the analyser lexicon) | 12.9–13.5 | 11.0–13.9 | 10.4–11.3 |
| Nouns with `SUBCAT_Prop` (proper) | 23.1–24.2 | 20.2–23.8 | 20.5–21.4 |
| Nouns with `CASECHANGE_Up` | 36.7–37.5 | 33.7–37.5 | 34.3–35.1 |
| Tokens in paragraph type `text` (body) | 78.8–81.4 | 79.3–79.7 | 76.5–78.1 |
| … `image` (captions, image texts) | 1.9–5.6 | 6.3–7.1 | 7.3–7.9 |
| … `headline` | 4.2–5.3 | 5.6–5.9 | 6.3–7.2 |
| … `lead` | 3.4–11.9 | 2.7–3.7 | 3.9–4.1 |

**Reading the indicators:**

- No indicator shows a step at either part boundary (2018→2019,
  2021→2022).
- `OTHER_UNK`, `SUBCAT_Prop` and `CASECHANGE_Up` drop from **2020**, which is
  *inside* the 2019–2021 part.
- Image text and headlines grow gradually from 2011.

No step was observed at the part boundaries. That does **not** identify the
cause: the shifts may come from content, from format, from annotation, or
from a combination. The cause is unresolved.

## 5. Material discrepancies

| # | Discrepancy | Evidence | Effect on noun counts |
|---|---|---|---|
| M1 | **Parser identity unknown** for 2011–2021 | §2 | Cannot be measured directly; the diagnostics found no step at the boundaries |
| M2 | ***sää* tagged as a pronoun**, at a rate that drifts | D10: 81% → 55–70% | The raw `pos="N"` count of *sää* is not comparable across years. With rule P1 (all analyses of the bare form) it becomes comparable. |
| M3 | **Text composition changes** | Image text 1.9% → 7.9%, headlines 4.2% → 7.2%, leads 11.9% → ~4% | Raises nouns frequent in captions: *kylki* in 2022–2024 is 74.3/M overall but 20.9/M in body text ("…ajoneuvon kyljessä…"). It also lowers the body share of concrete nouns: *seinä*, *piha*, *lippu*. |
| M4 | **Boilerplate present in one part only** | *uutinen* 2022–2024: 574.9/M, against 262.6 in 2011–2018 (regional link lines: "Lisää Pirkanmaan uutisia…" 2,109, "Lue lisää Kainuun uutisia…" 1,676). *puhelin* 2018–2020: the app promotion. | Inflates specific nouns in specific parts. The body-text filter does **not** remove it; rule R1 does, if applied per part. |
| M5 | **Format or topic spikes** | *kortti*: 301.7/M in 2019–2021 against 44–102 elsewhere (live football); *hinta* 565.6/M in 2022–2024 (prices); *hoitaja*, *ravintola* (2020–2021) | Real content, not error, but it moves classes. Body-text-only reduces *kortti* (ratio 6.85 → 1.69), not the others. |
| M6 | **Homograph shares vary** | *katua* as a verb 2.8–5.7%; bare *kuusi* as a noun 7.8–12.3%; *kotona* → `koto` 10.8% in 2020 against 15–19% | Small (*katua*), or handled by rules S1 and H1, which are applied per year |
| M7 | **Punctuation share rises** | 14.8% / 15.6% / 15.7% by part | Per-million-token rates of a constant word drift by about 1% between parts. Negligible next to class widths. |

**Overall size** (263 lexicon nouns; *vieras* excluded):

| Measure | Max ÷ min ratio of the three per-part rates: median | 90th percentile | Nouns > 1.5× | Nouns > 2× | Nouns whose provisional class differs between parts |
|---|--:|--:|--:|--:|--:|
| All text | 1.30 | 1.74 | 58 | 13 | 24 |
| Body text only | 1.28 | 1.77 | 66 | 17 | 24 |

Restricting to body text does **not** reduce part differences overall. It
fixes caption-driven cases (*kylki*, *kortti*) and lowers caption-heavy
concrete nouns. So text structure alone does not explain most of the
differences.

A content cause was shown only for the cases read in context (*kortti*,
*uutinen*, *puhelin*, *kylki*). For the other nouns, the cause (content,
boilerplate, annotation, or a combination) is **unresolved**.

## 6. Conclusions

| Comparison | Conclusion |
|---|---|
| POS and noun MSD inventories, tag formats, lemma and `lemmacomp` formats | **Sufficiently comparable** |
| Lemmatisation of ordinary, gradating and compound nouns (D1, D2, D13–D15) | **Sufficiently comparable** |
| Systematic errors handled by rules J1/J2, K1 and S1 (D5, D8, D11) | **Comparable with caveats:** same pattern and similar rates in every part; the rules must be applied per year |
| *koti* lexicalised forms (D12) | **Comparable with caveats:** rule H1's combined count is stable; the split between analyses varies with content (2020) |
| *sää* (D10) | **Not comparable as a raw noun count**; comparable with caveats only with rule P1 |
| Unknown-word and proper-noun tagging rates | **Not established** whether the 2020+ shift is annotation or content |
| Parser and annotation pipeline identity across parts | **Not established** |
| Text composition and boilerplate across parts | **Material difference:** comparable only with caveats (rule R1, the body-text sensitivity check, per-part reporting) |
| Pooling the 14 years into one rate | **Not established as valid**; see §7 |

## 7. Recommended counting strategy (while M1 is unresolved)

1. **Extract per corpus ID, never pooled at extraction.** For each lemma and
   year, keep the raw count for all text and for body text
   (`_.sentence_paragraph_type="text"`), with that year's denominators
   (tokens, word tokens, body tokens) and the retrieval date.
2. **Apply the rules per year** (J1, J2, K1, S1, H1, F1, P1). Keep raw and
   adjusted values side by side.
3. **Report per part** (2011–2018, 2019–2021, 2022–2024), with each part's
   own denominator.
4. **Primary summary: the median of the three part rates.** This gives each
   release equal weight and resists one part being off. A pooled 2011–2024
   rate is reported as secondary only. In the current data, the median of
   part rates changes the class of 10 of 263 nouns compared with the pooled
   rate, all within 20% of a boundary.
5. **Mark a noun *part-sensitive*** when its per-part rates differ by more
   than 1.5× (heuristic) or its class differs between parts. Its confidence
   is then *approximate*: check R1 windows and read samples before relying on
   its class.
6. **Body-text rates are a sensitivity check, not the primary measure.**
   Removing captions systematically lowers concrete, picturable nouns, which
   are pedagogically important.
7. **No validated rankings yet.** Classes stay *provisional* until M1 is
   answered and the rules are native-reviewed.
8. **Resolve M1 by asking Kielipankki** (FIN-CLARIN support) which parser
   and version annotated each part. If the answer is that the pipelines
   differ, treat each part as a separate source and never pool. The 2022–2024
   part (62.9 million tokens, documented TDPP-LBF) can then serve as a
   single-pipeline reference.

## 8. What was extracted and what was not

- **Extracted (raw, scratchpad only):** per-year counts for all 264 lexicon
  noun lemmas, all text and body text (2 requests), plus the diagnostic
  counts above.
- **Not run:** the 14 full noun lemma lists. They should follow the
  strategy above (per year, all text plus body text) once you approve it.
- **Not resolved:**
  - M1, the parser identity for 2011–2021;
  - whether the combined record's TDPP-LBF covers 2011–2021;
  - whether the 2020+ tagging-rate shifts are annotation or content;
  - any earlier RC status.

## Appendix: queries

All requests used `count` with `corpus` = the 14 Yle corpora (per-corpus
results read from the response). Repeated-window checks used
`default_within=sentence`.

| ID | CQP | `group_by` |
|---|---|---|
| I1 | `[]` | `pos` |
| I2 | `[pos="N"]` | `msd` |
| I3 | `[]` | `group_by_struct=sentence_paragraph_type` |
| D1 | `[word="talo\|talon\|talossa\|taloon\|talosta\|talolla\|taloa\|talot\|talojen\|taloja\|taloissa" %c]` | `lemma,pos` |
| D2 | `[word="kauppa\|kaupan\|kaupassa\|kauppaan\|kaupasta\|kauppaa\|kaupat\|kauppojen\|kauppoja\|kaupoissa" %c]` | `lemma,pos` |
| D3 | `[word="katu\|kadun\|kadulla\|katua\|kadut\|kaduilla" %c]` | `lemma,pos` |
| D4 | `[word="kaupassa" %c]` | `lemma,pos,msd` |
| D5 / D6 / D7 | `[word="kuusi" %c]` / `[word="kuusen" %c]` / `[word="kuuden" %c]` | `lemma,pos` |
| D8 / D9 | `[word="joista" %c]` / `[word=","] [word="joista" %c]` | `lemma,pos` |
| D10 / D11 / D12 / D13 | `[word="sää" %c]` / `[word="kuin" %c]` / `[word="kotona" %c]` / `[word="vuonna" %c]` | `lemma,pos` |
| D14 | `[word="ruokakauppa\|ruokakaupan\|ruokakaupassa\|ruokakauppaan\|ruokakaupasta" %c]` | `lemma,lemmacomp,pos` |
| D15 | `[word="terveyskeskus\|terveyskeskuksen\|terveyskeskuksessa\|terveyskeskukseen\|terveyskeskuksesta" %c]` | `lemma,lemmacomp,pos` |
| D16 / D17 | `[word="Suomessa"]` / `[word="talossaan\|äitinsä" %c]` | `lemma,pos,msd` |
| E1 | `[lemma="(…264 lemmas…)" & pos="N" & _.sentence_paragraph_type="text"]` | `lemma` |
| E2 | `[lemma="L" & pos="N"]` and the same with `& _.sentence_paragraph_type="text"` (*talo, puhelin, uutinen, kylki, kello, kortti, hoitaja, hinta, ravintola*) | `pos` |
| E3 | `[lemma="L" & pos="N"]` on 2011–2018 and on 2022–2024 (*kylki, uutinen, kello*) | `word` (`ignore_case=word`); plus 7-token windows on 2022–2024 |

Metadata: OAI-PMH `GetRecord` (`metadataPrefix=cmdi`) for `lb-2019121004`,
`lb-2022032201`, `lb-2025110403` and `lb-2025112103`. Kielipankki resource
table: `wp-admin/admin-ajax.php`, `action=wpda_datatables`, `pubid=2|5`,
`group_name=ylenews`.
