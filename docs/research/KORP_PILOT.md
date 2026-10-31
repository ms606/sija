# Korp pilot: 49 nouns, anomaly forensics and measurement quality

A Phase 1 test of a method (revision 2), **not a frequency list**. The figures
are corpus findings for the named corpora, with automatic annotation. They are
not evidence about "Finnish" in general, not about speech, and not app data.
The sources and their licences are in [SOURCES.md](SOURCES.md).

- Queries run on: 28–29 October 2026, Kielipankki Korp API
  `https://www.kielipankki.fi/korp/api8/`
- Run by: AI-drafted research. Every context judgement in this document was
  made by an AI reader, **not a native speaker**. Each rule below is a
  proposal awaiting native-speaker review.
- Raw responses, each with its request URL and UTC time, are kept on the
  development machine only, outside the repository. The query list in the
  appendix reproduces them.

**Changes since revision 1.** The blanket "exclude *joista* from *joki*" idea
is withdrawn. Each anomaly now has a forensic analysis, a narrow rule, and a
check of whether that rule removes genuine uses. The measures now include a
verified denominator, the median of yearly rates, year dispersion, document
frequency for one year, and a repeated-text check. Suomi24 and the
easy-to-read corpus are shown only as separate comparison signals.

## 1. Corpora and denominators

**Primary measure:** the 14 corpora `YLENEWS_FI_2011_S` … `YLENEWS_FI_2024_S`
(Yle Finnish News Archive 2011–2024, scrambled; CC BY 4.0, verified per part
in [SOURCES.md](SOURCES.md)).

| Denominator | Value | Source |
|---|--:|---|
| Tokens, punctuation included (Korp `Size`) | 349,460,745 | `corpus_info`. Equals the token sizes in the three metadata records (207,500,221 + 79,018,994 + 62,941,530) |
| Punctuation tokens (`pos="Punct"`) | 52,845,138 (15.1%) | `count [pos="Punct"]` |
| Word tokens (tokens minus punctuation) | 296,615,607 | computed |
| Sentences | 30,955,308 | `corpus_info` |
| Texts | 1,043,653 | `count <text> []` |

**Normalised measure:** occurrences **per million tokens**, using the first
row (punctuation included). This matches Korp's own `relative` values and the
metadata. Per million *word tokens* would be 1.178 times higher. The choice
matters only near a threshold: switching denominators changes the proposed
class of 13 of the 264 lexicon nouns, all of them near a boundary (see
[RANKING_PROPOSAL.md](RANKING_PROPOSAL.md)).

**Comparison signals, never added to the primary measure:**

- **Easy-to-read news**, `YLENEWS_FI_2011_2018_SELKO_S`: 826,737 tokens,
  132,802 punctuation, 4,063 texts. A **subset** of the Yle archive, so not
  independent.
- **Suomi24 2023**, `S24_2023`: 171,487,470 tokens. CC BY-NC 4.0, so it is
  **not used for any ranking** until the non-commercial question is settled.

**The sample:** 49 nouns from the current lexicon, chosen to test the
method, not at random:

- 24 everyday words;
- 11 words for Kotus type coverage;
- 11 suspected annotation edge cases: *koti, lehti, joki, suomi, aika, kuu,
  tuli, kuusi, puoli, vuosi, varsi*;
- 3 compounds: *ruokakauppa, terveyskeskus, työpaikka*.

Together they cover 28 of the 32 Kotus types used by the lexicon's nouns.

**Validation on known forms (Yle):**

- Correct analyses:
  - *vuonna* → *vuosi* N 560,347;
  - *kaupassa* → *kauppa* N 8,861;
  - *ruokakaupassa* → *ruokakauppa* (parts *ruoka* + *kauppa*) 1,488;
  - *varsin* → adverb 31,986 (*varsi* N only 46);
  - *puolesta* → postposition 51,568 (*puoli* N 212);
  - *jokin* → pronoun 14,224.
- *tuli* splits into *tulla* V 183,356 and *tuli* N 3,037; 19 of 20 sampled
  noun hits mean "fire".
- The forms that needed a forensic check are covered in §2.

## 2. Anomaly forensics

For each case: the original query, the offending annotations, the proposed
rule, a check of whether the rule removes genuine uses, and what remains
uncertain. A sample of 20–100 hits can **identify** a problem. It does not
give a precise error rate (0 of 50 is consistent with a true rate up to
about 6%).

### 2.1 *joki* "river"

**Original query:** `[lemma="joki" & pos="N"]`, 61,711 hits. In revision 1,
the share of *joista* in this count (36,316, 59%) was wrongly treated as all
pronoun.

**Annotations.** For the form *joista*, the parser gives two analyses:

| Analysis | `msd` | Main `deprel` | Hits |
|---|---|---|--:|
| `joki`/N | `NUM_Pl\|CASE_Ela` | `nommod` (36,146) | 36,316 |
| `joka`/Pron | `SUBCAT_Rel\|NUM_Pl\|CASE_Ela` | `rel` (28,158) | 29,452 |

The noun analysis of a pronoun carries ordinary noun tags, so **POS and MSD
filtering alone cannot separate them**: the error is in the tags themselves.
Word order can: 35,821 of the 36,316 noun-tagged *joista* (98.6%) come
directly after a comma token, where a relative clause usually starts.

A second source of error was found: plural forms with the clitic *-kin* (tag
`CLIT_Foc_kin`) are mostly the indefinite pronoun *jokin*. These are
*joillakin* 1,814, *joillekin* 1,614, *joissakin* 780, *joistakin* 278,
*joiltakin* 114 and *joiksikin* 2.

**Checks** (AI reading of random samples; Korp `query`, `sort=random`):

| Subset | Hits | Sample | River | Pronoun |
|---|--:|--:|--:|--:|
| *joista*→*joki* after a comma | 35,821 | 50 | 0 | 50 |
| … where the comma follows an elative noun ("kolmesta naisesta, joista…") | 1,166 | 30 | 0 | 30 |
| … followed by *ja / sekä / tai / ,* (a list) | 17 | all 17 | ~7 ("Tammerkoskesta, Näsijärvestä, Pyhäjärvestä, joista ja ojista") | ~10 |
| … at the end of a phrase (followed by `. ! ? ; : )`) | 1 | 1 | 0 | 1 |
| *joista*→*joki* **not** after a comma | 495 | 50 | 28 | 22 |
| *joillakin / joillekin*→*joki* | 3,428 | 20 | 0 | 20 |
| *joissakin / joistakin / joiltakin*→*joki* | 1,172 | 30 | 0 | 30 |
| other forms (*joen, jokeen, jokien, joki*) | 13,657 | 20 | 18 | 0 (2 surnames: *Joki*, *Joen*) |

**Proposed rules:**

- **J1:** remove *joista* tagged *joki* when it directly follows a comma token
  and is **not** followed by *ja, sekä, tai* or a comma. This removes 35,804
  hits. The 17 list cases are kept as unresolved.
- **J2:** remove *joki* tokens in the six plural *-kin* forms listed above.
  This removes 4,602 hits. Singular *-kin* forms (*joessakin*, …) are kept.

**Do the rules remove genuine uses?** The only subset where rivers were
found after a comma (lists) is excluded from J1. No sampled J1 or J2 hit was
a river. A small number of river uses may still be removed; the samples
cannot rule that out.

**Result:** 21,305 hits (61.0/M), down from 61,711 (176.6/M). Still
unresolved: about 748 hits (the 495 non-comma *joista*, the 17 lists, and
236 rare plural forms such as *joiksi* and *joilta* that are also pronoun
forms), plus surnames. That is about 3.5% of the adjusted count.
**Approximate: suitable for a coarse class, not for a precise rank.**

### 2.2 *kuu* "month; moon"

**Original query:** `[lemma="kuu" & pos="N"]`, 64,282 hits. 32,140 of them
are the word *kuin*, all tagged `NUM_Pl|CASE_Ins` (plural instructive), with
`deprel` mostly `advmod`. *kuin* is grammatically a plural instructive of
*kuu*, so the parser chose a real but implausible analysis. Overall it tags
*kuin* as the conjunction 633,763 times and as *kuu* 32,140 times (5%).

**Proposed rule K1:** remove *kuin* tagged *kuu*.

**Check:** 100 of 100 random hits were the conjunction ("ikään kuin", "kuin
ennen", comparatives). This is an AI judgement that the plural instructive of
*kuu* does not occur in this text; please have a native speaker confirm it.

**Result:** 32,142 (92.0/M). Still unresolved:

- 952 *kuusta* hits. One of 30 sampled *kuu* hits was really the partitive of
  *kuusi* "spruce".
- The senses are merged: about 22 of 30 meant "month" (*viime kuussa*) and
  about 5 "moon".

**Approximate.** The rate is within 15% of a proposed class boundary.

### 2.3 *kuusi* "spruce"

**Original query:** `[lemma="kuusi" & pos="N"]`, 13,747 hits. The numeral
*kuusi* "six" is mostly tagged `Num` (102,277), but the bare form *kuusi* is
also tagged N 6,683 times. Only the **nominative singular** is shared between
"spruce" and "six". The numeral's other forms differ (*kuuden, kuutta* versus
*kuusen, kuusta*) and were never tagged as nouns in the samples.

**Checks:**

| Subset | Sample | Spruce | Numeral | Surname |
|---|--:|--:|--:|--:|
| nominative *kuusi*, tagged N (6,683 hits) | 50 | 10 | 37 | 3 |
| *kuusen, kuusia, kuuset, kuuseen, kuusesta* (5,398 hits) | 30 | 28 | 0 | 2 |
| *kuusta* tagged *kuusi* (128 hits) | 20 | 20 | 0 | 0 |

No context rule was found that reliably separates nominative "spruce" from
"six": the numeral often stands without a following partitive ("joista kuusi
on…", "kello kuusi").

**Rule S1:** count only the non-nominative forms, 7,064 hits (20.2/M), and
report the 6,683 nominative hits as **not separable**. Even if every
nominative hit were "spruce", the rate would stay in the same proposed class
(at most 39.3/M). **Approximate (lower bound).** Surnames (*Kuusi*, *Kuusen*)
are included.

### 2.4 *koti* "home"

**Original query:** `[lemma="koti" & pos="N"]`, 92,009 hits. This includes
*kotiin* (35,831), but the parser analyses *kotona* and *kotoa* elsewhere:

| Analysis | Forms | Hits |
|---|---|--:|
| `koti`/N | *kotiin, kotiinsa, kodin, koti, …* | 92,009 |
| `koto`/N | *kotona* 6,162, *kotoa* 5,645, *kotonaan* 4,881, *kotoaan* 936, … | 18,036 |
| `kotona`/Adv | *kotona* 32,046, *kotonaan* 9,801, … | 42,720 |
| `kotoa`/Adv | *kotoaan* 2,060, *kotoa* 882, … | 3,093 |
| `kotiin`/Adv | *kotiin* | 99 |

**Rule H1 (an addition, not an exclusion):** add `koto`/N tokens whose form
matches `koto(na|a)` + an optional possessive suffix + an optional *-kin*,
*-kaan* or *-kään* (17,906 hits), and the adverb lemmas *kotona, kotoa, kotiin*
(45,912 hits).

**Check:** 20 of 20 sampled `koto` hits were forms of *koti*. The pattern
leaves out 130 hits, among them the verb *kotoillaan*, the archaic *koto*
itself and seven *kotonahan* (a clitic the pattern does not cover).

**Result:** 155,827 (445.9/M) with H1, or 92,009 (263.3/M) for the strict
lemma. Both are in the same proposed class. Whether the lexicalised forms
belong to *koti* for teaching is a **pedagogical decision**. Sija already
treats *kotona* as a lexicalised form of *koti*. **Approximate; both figures
are reported.**

### 2.5 *suomi* "Finnish (language)" / *Suomi* "Finland"

**Original query:** `[lemma="suomi" & pos="N"]`, 40,337 hits, beside the
capitalised lemma *Suomi* with 1,122,265. Lemma case does not separate the
senses: 12 of 20 lowercase-lemma hits meant Finland, usually at the start of
a sentence.

**Annotations:** both lemmas are `N`. `SUBCAT_Prop` appears on the
capitalised forms but not consistently, so MSD cannot separate the senses
either. Finnish spelling can, outside sentence starts: the country is
capitalised (*Suomessa*), the language is not (*suomeksi*).

| Subset (lemma `suomi\|Suomi`, N) | Hits | Sample | Reading |
|---|--:|--:|---|
| lowercase form, not sentence-initial | 23,799 | 50 | 44 language; 5 Finland written in lowercase (*suomen vienti*); 1 misparse (*suomin*, from *suoda*) |
| capitalised form, not sentence-initial | 861,196 | 30 | 30 country or names (*Suomen Pankki*) |
| sentence-initial (`<sentence>` + target) | 277,457 | – | 99.9% capitalised whatever the meaning: **not separable** |

**Rule F1:** count the language sense as lowercase, non-sentence-initial
forms: 23,799 (68.1/M). **Approximate (lower bound):** about 1 in 8 sampled
were not the language, and language uses at sentence starts (*Suomeksi*…)
are missing. The country is a proper noun and is not a Sija noun target.

### 2.6 Found in the lexicon-wide query (not in the 49-word sample)

| Lemma | Finding | Rule / status |
|---|---|---|
| *sää* "weather" | 22,736 bare *sää* tokens are tagged **Pron**. 20 of 20 sampled were the weather noun ("Aurinkoinen sää houkutteli…"). The noun count (15,027) is too low. | **P1 (proposal):** add *sää* tagged Pron, giving 37,763 (108.1/M). Approximate: genuine dialect pronoun uses were not found, but the sample is small. |
| *vieras* "guest" | Every hit (59,360) is tagged `A` (adjective "foreign, unfamiliar"). The noun cannot be separated from the adjective. | **Unsuitable.** |
| *kortti* "card" | 137/M overall, but 7,896 / 13,311 / 9,450 hits in 2018–2020 against about 1,000–2,500 in other years (DP 0.41). There is no repeated window of 100 or more; the spike comes from live football reports ("toinen keltainen kortti ja punainen kortti"). | Topic or format skew. The median of yearly rates is 72.4/M, which changes the proposed class. |
| *juuri* "root" | 91% of its hits have another POS (the adverb "just"). | Not checked in context. |

## 3. Frequency quality for the 49 pilot nouns

Columns:

- **Raw:** the original noun count.
- **Adjusted:** the count after the rules of §2, if any.
- **Median of yearly /M:** the median of the 14 yearly rates, which damps
  one-off spikes.
- **DP:** Gries' *deviation of proportions* over the 14 yearly corpora (0 =
  spread like the corpus, 1 = concentrated in one year). It measures
  dispersion across years only, not across documents.
- **Texts in 2024:** how many of the 56,038 texts of `YLENEWS_FI_2024_S`
  contain the noun (from `group_by_struct=text_id`).
- **Class:** the provisional, **not approved** classes of
  [RANKING_PROPOSAL.md](RANKING_PROPOSAL.md).

Dispersion and document figures for adjusted lemmas were computed on the raw
query, so they include the excluded hits.

**Confidence:**

- **Usable:** passed the automatic checks (POS split, top word forms, year
  dispersion), and any correction is documented and small.
- **Approximate:** a correction was needed or part of the count cannot be
  separated. The class holds, but the number should not be quoted precisely.
- **Unsuitable:** the target noun cannot be isolated.

"Automatic checks only" means the word was not read in context.

| Lemma | Raw N | Raw /M | Rule applied | Adjusted N | Adjusted /M | Median of yearly /M | DP (years) | Texts in 2024 | Class | Confidence | Why |
|---|--:|--:|---|--:|--:|--:|--:|--:|---|---|---|
| talo | 103,885 | 297.3 | – | 103,885 | 297.3 | 297.5 | 0.04 | 2,575 (4.6%) | F1 | usable | automatic checks only |
| koulu | 242,864 | 695.0 | – | 242,864 | 695.0 | 698.6 | 0.06 | 3,370 (6.0%) | F1 | usable | 1,995 A readings excluded, unchecked |
| viikko | 362,632 | 1,037.7 | – | 362,632 | 1,037.7 | 944.3 | 0.08 | 10,631 (19.0%) | F1 | usable | automatic checks only |
| asunto | 79,360 | 227.1 | – | 79,360 | 227.1 | 209.8 | 0.07 | 2,074 (3.7%) | F1 | usable | automatic checks only |
| palvelu | 127,243 | 364.1 | – | 127,243 | 364.1 | 359.3 | 0.05 | 4,036 (7.2%) | F1 | usable | automatic checks only |
| koti | 92,009 | 263.3 | H1 +17,906 (*koto* forms) +45,912 (adverbs) | 155,827 | 445.9 | 258.8 | 0.04 | 2,731 (4.9%) | F1 | approximate | strict lemma count 92,009 also reported; adding lexicalised forms is a pedagogical choice |
| kaupunki | 428,529 | 1,226.3 | – | 428,529 | 1,226.3 | 1,183.4 | 0.07 | 9,259 (16.5%) | F1 | usable | automatic checks only |
| tunti | 111,982 | 320.4 | – | 111,982 | 320.4 | 321.0 | 0.02 | 3,951 (7.1%) | F1 | usable | automatic checks only |
| äiti | 82,321 | 235.6 | – | 82,321 | 235.6 | 221.7 | 0.08 | 1,548 (2.8%) | F1 | usable | automatic checks only |
| lääkäri | 69,632 | 199.3 | – | 69,632 | 199.3 | 199.1 | 0.04 | 1,293 (2.3%) | F1 | usable | automatic checks only |
| nimi | 129,351 | 370.1 | – | 129,351 | 370.1 | 374.2 | 0.04 | 4,541 (8.1%) | F1 | usable | automatic checks only |
| lehti | 65,832 | 188.4 | – | 65,832 | 188.4 | 182.4 | 0.12 | 1,610 (2.9%) | F1 | usable | senses merged (newspaper dominates) |
| joki | 61,711 | 176.6 | J1 −35,804; J2 −4,602 | 21,305 | 61.0 | 174.3 | 0.04 | 2,789 (5.0%) | F2 | approximate | ~748 hits still ambiguous (non-comma *joista*, list cases, rare plural homographs); surnames not removed |
| suomi | 40,337 | 115.4 | F1: lowercase, not sentence-initial | 23,799 | 68.1 | 117.0 | 0.06 | 1,515 (2.7%) | F2 | approximate (lower bound) | about 1 in 8 sampled were Finland, not the language; 277,457 sentence-initial hits not separable |
| kauppa | 112,643 | 322.3 | – | 112,643 | 322.3 | 330.0 | 0.05 | 2,595 (4.6%) | F1 | usable | automatic checks only |
| kirja | 66,201 | 189.4 | – | 66,201 | 189.4 | 184.2 | 0.07 | 1,064 (1.9%) | F1 | usable | 204 hits in a repeated programme credit line (0.3%) |
| raha | 134,834 | 385.8 | – | 134,834 | 385.8 | 380.6 | 0.03 | 3,792 (6.8%) | F1 | usable | automatic checks only |
| aika | 1,015,240 | 2,905.2 | – | 1,015,240 | 2,905.2 | 2,872.5 | 0.02 | 27,098 (48.4%) | F1 | usable | mostly fixed uses (*aikana*, *ajan*) |
| ilta | 83,671 | 239.4 | – | 83,671 | 239.4 | 245.3 | 0.06 | 2,876 (5.1%) | F1 | usable | capitalised *Ilta* (7,542) excluded |
| hinta | 116,017 | 332.0 | – | 116,017 | 332.0 | 301.1 | 0.13 | 2,846 (5.1%) | F1 | usable | uneven across years (DP 0.13) |
| päivä | 342,726 | 980.7 | – | 342,726 | 980.7 | 991.0 | 0.03 | 10,244 (18.3%) | F1 | usable | automatic checks only |
| ruoka | 67,302 | 192.6 | – | 67,302 | 192.6 | 196.5 | 0.05 | 1,450 (2.6%) | F1 | usable | automatic checks only |
| omena | 5,468 | 15.6 | – | 5,468 | 15.6 | 16.1 | 0.09 | 89 (0.2%) | F2 | usable | automatic checks only |
| ravintola | 59,312 | 169.7 | – | 59,312 | 169.7 | 129.2 | 0.20 | 1,052 (1.9%) | F1 | usable | uneven across years (DP 0.20) |
| sairaala | 94,308 | 269.9 | – | 94,308 | 269.9 | 248.4 | 0.09 | 2,171 (3.9%) | F1 | usable | automatic checks only |
| maa | 383,412 | 1,097.2 | – | 383,412 | 1,097.2 | 1,094.0 | 0.02 | 10,444 (18.6%) | F1 | usable | capitalised *Maa* (25,231) excluded, unchecked |
| kuu | 64,282 | 183.9 | K1 −32,140 | 32,142 | 92.0 | 186.1 | 0.04 | 2,406 (4.3%) | F2 (near boundary) | approximate | 952 *kuusta* hits ambiguous with "spruce"; "month" and "moon" merged |
| työ | 329,432 | 942.7 | – | 329,432 | 942.7 | 952.6 | 0.02 | 8,341 (14.9%) | F1 | usable | automatic checks only |
| tuli | 20,788 | 59.5 | – | 20,788 | 59.5 | 60.4 | 0.07 | 836 (1.5%) | F2 | usable | verb homograph separated well (19–20 of 20) |
| kuusi | 13,747 | 39.3 | S1: nominative (6,683) not separable | 7,064 | 20.2 | 42.7 | 0.06 | 398 (0.7%) | F2 | approximate (lower bound) | nominative "spruce" vs "six" not separable; surnames included |
| lumi | 58,218 | 166.6 | – | 58,218 | 166.6 | 165.6 | 0.06 | 1,508 (2.7%) | F1 | usable | 1,565 A readings excluded, unchecked |
| kieli | 58,418 | 167.2 | – | 58,418 | 167.2 | 175.3 | 0.09 | 1,224 (2.2%) | F1 | usable | automatic checks only |
| puoli | 213,410 | 610.7 | – | 213,410 | 610.7 | 608.5 | 0.02 | 8,175 (14.6%) | F1 | usable | mostly *puolet* / *puolella* |
| vesi | 142,657 | 408.2 | – | 142,657 | 408.2 | 402.2 | 0.07 | 3,467 (6.2%) | F1 | usable | automatic checks only |
| vuosi | 1,801,248 | 5,154.4 | – | 1,801,248 | 5,154.4 | 5,135.2 | 0.02 | 31,288 (55.8%) | F1 | usable | *vuonna* validated |
| varsi | 4,696 | 13.4 | – | 4,696 | 13.4 | 12.8 | 0.06 | 193 (0.3%) | F2 | usable | mostly *tien varsilla* |
| lapsi | 377,814 | 1,081.1 | – | 377,814 | 1,081.1 | 1,056.7 | 0.04 | 5,772 (10.3%) | F1 | usable | automatic checks only |
| tytär | 24,516 | 70.2 | – | 24,516 | 70.2 | 61.4 | 0.11 | 614 (1.1%) | F2 | usable | automatic checks only |
| puhelin | 43,594 | 124.7 | R1 −5,365 (promo sentence) | 38,229 | 109.4 | 114.7 | 0.11 | 1,383 (2.5%) | F1 (near boundary) | usable | after documented removal of one repeated promotional sentence |
| ihminen | 566,861 | 1,622.1 | – | 566,861 | 1,622.1 | 1,570.3 | 0.04 | 13,651 (24.4%) | F1 | usable | automatic checks only |
| kysymys | 108,430 | 310.3 | – | 108,430 | 310.3 | 304.0 | 0.05 | 3,720 (6.6%) | F1 | usable | automatic checks only |
| terveys | 42,048 | 120.3 | – | 42,048 | 120.3 | 101.2 | 0.14 | 1,630 (2.9%) | F1 | usable | uneven across years (DP 0.14) |
| asiakas | 129,800 | 371.4 | – | 129,800 | 371.4 | 357.7 | 0.05 | 3,477 (6.2%) | F1 | usable | automatic checks only |
| mies | 458,779 | 1,312.8 | – | 458,779 | 1,312.8 | 1,365.2 | 0.04 | 9,238 (16.5%) | F1 | usable | automatic checks only |
| kevät | 157,984 | 452.1 | – | 157,984 | 452.1 | 443.7 | 0.05 | 5,427 (9.7%) | F1 | usable | automatic checks only |
| perhe | 132,211 | 378.3 | – | 132,211 | 378.3 | 390.8 | 0.07 | 3,005 (5.4%) | F1 | usable | automatic checks only |
| ruokakauppa | 7,482 | 21.4 | – | 7,482 | 21.4 | 21.1 | 0.12 | 297 (0.5%) | F2 | usable | automatic checks only |
| terveyskeskus | 20,127 | 57.6 | – | 20,127 | 57.6 | 60.0 | 0.11 | 446 (0.8%) | F2 | usable | automatic checks only |
| työpaikka | 70,211 | 200.9 | – | 70,211 | 200.9 | 203.5 | 0.04 | 1,683 (3.0%) | F1 | usable | automatic checks only |

### Document dispersion

A text-level document frequency over all 14 corpora was computed only for
*puhelin* (24,552 texts), *lääkäri* (25,859) and *kirja* (21,720). For
frequent nouns the API returns one row per text: hundreds of thousands of rows
for *vuosi*, which is too heavy for a shared service. One-year document
frequency (2024) and year dispersion (DP) are therefore the dispersion
measures used. A full document-dispersion measure across all years is **not
feasible with the available API** at this scale.

### Repeated text

**Rule R1:** a 7-token window inside one sentence (3 tokens, the noun, 3
tokens; case-insensitive) that recurs 100 or more times in the corpus set is
a repeated-text candidate. It is read by a person; if it is not editorial
text (a promotion or a credit line), its occurrences are removed. The
threshold of 100 is a heuristic. Windows exist only where the sentence has
three tokens on each side, so the check covers part of the hits.

| Noun | Noun hits | Hits with a full window | Hits in windows recurring ≥100 times | What they are | Effect |
|---|--:|--:|--:|---|---|
| *puhelin* | 43,594 | 24,443 | 5,365 | "Onhan sinulla jo puhelimessasi Ylen Uutisvahti?", a Yle app promotion: 900 in 2018, 2,583 in 2019, 1,868 in 2020, 14 later | Removed by R1: 124.7/M → 109.4/M (−12.3%). The class is unchanged. |
| *lääkäri* | 69,632 | 34,248 | 0 (largest window: 69, a named-person phrase; next 61, a repeated stock-photo caption) | | None |
| *kirja* | 66,201 | 31,557 | 204 (top window 103: a programme credit line "…sadan vuoden kirjat -sarjassa Yle Radio") | Second window not inspected | Not removed (0.3%) |

Repeated text was **not checked** for the other 46 nouns. The pattern, an
app promotion appended to articles in 2018–2020, suggests that other nouns in
promotional lines (*sovellus*, *uutiset*) may be inflated in those years. The
median of yearly rates is the safeguard proposed against this.

## 4. Comparison signals (not used for ranking)

Kept separate, as source-specific raw counts. The easy-to-read corpus
overlaps with the primary measure. The Suomi24 counts carry a non-commercial
licence and must not influence rankings until that is resolved. Neither has
been corrected with the §2 rules.

| Lemma | Easy-to-read N | Easy-to-read /M | Rank among 18,656 common-noun lemmas | Suomi24 2023 N | Suomi24 2023 /M |
|---|--:|--:|--:|--:|--:|
| talo | 322 | 389.5 | 109 | 33,077 | 192.9 |
| koulu | 843 | 1,019.7 | 34 | 44,539 | 259.7 |
| viikko | 976 | 1,180.5 | 27 | 54,860 | 319.9 |
| asunto | 280 | 338.7 | 139 | 39,181 | 228.5 |
| palvelu | 204 | 246.8 | 206 | 27,416 | 159.9 |
| koti | 366 | 442.7 | 97 | 35,269 | 205.7 |
| kaupunki | 885 | 1,070.5 | 31 | 60,366 | 352.0 |
| tunti | 296 | 358.0 | 124 | 33,119 | 193.1 |
| äiti | 251 | 303.6 | 165 | 45,889 | 267.6 |
| lääkäri | 297 | 359.2 | 122 | 35,308 | 205.9 |
| nimi | 515 | 622.9 | 60 | 93,176 | 543.3 |
| lehti | 172 | 208.0 | 240 | 31,140 | 181.6 |
| joki | 108 | 130.6 | 389 | 15,287 | 89.1 |
| suomi | 706 | 854.0 | 42 | 102,299 | 596.5 |
| kauppa | 704 | 851.5 | 43 | 48,596 | 283.4 |
| kirja | 284 | 343.5 | 134 | 33,121 | 193.1 |
| raha | 911 | 1,101.9 | 29 | 176,655 | 1,030.1 |
| aika | 1,571 | 1,900.2 | 16 | 406,329 | 2,369.4 |
| ilta | 177 | 214.1 | 236 | 24,458 | 142.6 |
| hinta | 465 | 562.5 | 67 | 70,001 | 408.2 |
| päivä | 1,366 | 1,652.3 | 20 | 152,090 | 886.9 |
| ruoka | 478 | 578.2 | 65 | 47,029 | 274.2 |
| omena | 33 | 39.9 | 1223 | 3,346 | 19.5 |
| ravintola | 183 | 221.4 | 230 | 9,567 | 55.8 |
| sairaala | 342 | 413.7 | 102 | 13,333 | 77.7 |
| maa | 1,587 | 1,919.6 | 15 | 230,693 | 1,345.2 |
| kuu | 161 | 194.7 | 254 | 46,416 | 270.7 |
| työ | 1,332 | 1,611.2 | 21 | 203,402 | 1,186.1 |
| tuli | 96 | 116.1 | 435 | 11,276 | 65.8 |
| kuusi | 56 | 67.7 | 738 | 2,296 | 13.4 |
| lumi | 735 | 889.0 | 40 | 9,838 | 57.4 |
| kieli | 670 | 810.4 | 45 | 42,748 | 249.3 |
| puoli | 430 | 520.1 | 78 | 84,817 | 494.6 |
| vesi | 633 | 765.7 | 48 | 43,940 | 256.2 |
| vuosi | 5,126 | 6,200.3 | 1 | 348,384 | 2,031.5 |
| varsi | 10 | 12.1 | 3082 | 2,071 | 12.1 |
| lapsi | 1,907 | 2,306.7 | 6 | 184,929 | 1,078.4 |
| tytär | 45 | 54.4 | 895 | 10,296 | 60.0 |
| puhelin | 194 | 234.7 | 212 | 17,135 | 99.9 |
| ihminen | 4,820 | 5,830.1 | 2 | 458,753 | 2,675.1 |
| kysymys | 108 | 130.6 | 388 | 60,946 | 355.4 |
| terveys | 203 | 245.5 | 207 | 12,440 | 72.5 |
| asiakas | 302 | 365.3 | 118 | 26,575 | 155.0 |
| mies | 1,761 | 2,130.1 | 8 | 297,528 | 1,735.0 |
| kevät | 434 | 525.0 | 77 | 15,390 | 89.7 |
| perhe | 418 | 505.6 | 81 | 36,610 | 213.5 |
| ruokakauppa | 83 | 100.4 | 498 | 1,812 | 10.6 |
| terveyskeskus | 27 | 32.7 | 1444 | 3,765 | 22.0 |
| työpaikka | 586 | 708.8 | 52 | 35,160 | 205.0 |

**Attribution:**

- *Yle Finnish News Archive 2011–2024, scrambled, Korp* and *Yle News Archive
  Easy-to-read Finnish 2011–2018, scrambled, Korp*: Yle, the Finnish
  Broadcasting Company, CC BY 4.0.
- *Suomi24 virkkeet -korpus 2001–2023, Korp-versio*: City Digital Group,
  CC BY-NC 4.0.

All counts were retrieved through Kielipankki Korp on 28–29.10.2026 and
aggregated for this document.

## 5. Word forms (Yle news; raw noun readings)

For *joki* and *kuu*, the top forms show the artefacts of §2 (*joista*,
*kuin*).

| Lemma | Distinct forms | Five most frequent forms (share of the noun count) |
|---|--:|---|
| talo | 126 | *talon* 34%, *talo* 18%, *talossa* 12%, *taloon* 6%, *talosta* 5% |
| koulu | 155 | *koulun* 29%, *koulu* 12%, *koulussa* 11%, *koulujen* 9%, *kouluun* 6% |
| viikko | 115 | *viikolla* 32%, *viikon* 31%, *viikkoa* 11%, *viikko* 8%, *viikossa* 7% |
| asunto | 118 | *asunnon* 16%, *asuntojen* 12%, *asuntoja* 12%, *asuntoa* 9%, *asunto* 7% |
| palvelu | 143 | *palvelut* 15%, *palveluita* 10%, *palveluiden* 9%, *palveluja* 9%, *palvelun* 9% |
| koti | 143 | *kotiin* 39%, *kodin* 13%, *koti* 9%, *kotinsa* 5%, *kotiinsa* 4% |
| kaupunki | 135 | *kaupungin* 40%, *kaupunki* 27%, *kaupungissa* 8%, *kaupunkiin* 3%, *kaupunkia* 3% |
| tunti | 100 | *tuntia* 31%, *tunnin* 31%, *tunnissa* 11%, *tunteja* 6%, *tunti* 4% |
| äiti | 152 | *äiti* 41%, *äidin* 17%, *äitinsä* 8%, *äidit* 5%, *äitiä* 4% |
| lääkäri | 133 | *lääkäri* 30%, *lääkärin* 17%, *lääkärit* 12%, *lääkäreitä* 6%, *lääkäreiden* 5% |
| nimi | 169 | *nimi* 20%, *nimeä* 8%, *nimiä* 8%, *nimen* 7%, *nimet* 6% |
| lehti | 112 | *lehden* 22%, *lehti* 16%, *-lehden* 9%, *lehdet* 8%, *lehtien* 6% |
| joki | 79 | *joista* 59%, *joen* 10%, *jokeen* 4%, *jokien* 4%, *joki* 4% |
| suomi | 73 | *suomen* 24%, *suomeksi* 19%, *suomesta* 15%, *suomella* 13%, *suomea* 12% |
| kauppa | 129 | *kaupan* 26%, *kauppa* 13%, *kaupassa* 8%, *kauppojen* 7%, *kauppaa* 7% |
| kirja | 155 | *kirjan* 21%, *kirja* 18%, *kirjaa* 10%, *kirjassa* 7%, *kirjoja* 6% |
| raha | 135 | *rahaa* 49%, *rahat* 13%, *raha* 8%, *rahan* 7%, *rahalla* 4% |
| aika | 174 | *aikana* 34%, *ajan* 17%, *aikaa* 13%, *aikaan* 12%, *aika* 6% |
| ilta | 104 | *illalla* 32%, *illan* 25%, *ilta* 10%, *iltana* 10%, *iltaan* 5% |
| hinta | 107 | *hinta* 31%, *hinnat* 16%, *hinnan* 9%, *hintaa* 8%, *hintojen* 8% |
| päivä | 169 | *päivän* 22%, *päivä* 17%, *päivänä* 15%, *päivää* 15%, *päivässä* 7% |
| ruoka | 140 | *ruokaa* 36%, *ruoka* 14%, *ruoan* 12%, *ruuan* 11%, *ruokaan* 4% |
| omena | 63 | *omenoita* 18%, *omena* 15%, *omenan* 14%, *omenat* 14%, *omenaa* 10% |
| ravintola | 113 | *ravintola* 18%, *ravintolan* 13%, *ravintoloiden* 11%, *ravintolassa* 11%, *ravintolat* 10% |
| sairaala | 79 | *sairaalan* 27%, *sairaalassa* 20%, *sairaalaan* 19%, *sairaala* 10%, *sairaalasta* 5% |
| maa | 167 | *maan* 26%, *maassa* 15%, *maahan* 8%, *maata* 7%, *maiden* 7% |
| kuu | 70 | *kuin* 50%, *kuussa* 23%, *kuun* 17%, *kuu* 3%, *kuuhun* 2% |
| työ | 216 | *töitä* 17%, *työtä* 15%, *työn* 10%, *töihin* 8%, *työ* 7% |
| tuli | 66 | *tuleen* 39%, *tulessa* 15%, *tulen* 15%, *tuli* 15%, *tulta* 8% |
| kuusi | 67 | *kuusi* 49%, *kuusen* 22%, *kuusia* 7%, *kuuset* 6%, *kuuseen* 3% |
| lumi | 74 | *lunta* 44%, *lumen* 17%, *lumi* 15%, *lumesta* 4%, *lumet* 3% |
| kieli | 130 | *kielen* 30%, *kieltä* 17%, *kieli* 13%, *kielellä* 9%, *kielten* 6% |
| puoli | 131 | *puolet* 26%, *puolella* 20%, *puolen* 15%, *puolelle* 9%, *puolilla* 5% |
| vesi | 102 | *vettä* 29%, *veden* 21%, *vesi* 18%, *vedessä* 5%, *veteen* 5% |
| vuosi | 152 | *vuonna* 31%, *vuoden* 29%, *vuotta* 14%, *vuosina* 4%, *vuodessa* 3% |
| varsi | 36 | *varsilla* 24%, *varsille* 19%, *varteen* 11%, *varsilta* 11%, *varsi* 9% |
| lapsi | 214 | *lasten* 21%, *lapset* 14%, *lapsen* 13%, *lapsi* 11%, *lapsia* 10% |
| tytär | 125 | *tytär* 35%, *tyttärensä* 19%, *tyttären* 13%, *tytärtään* 4%, *tyttäreni* 4% |
| puhelin | 133 | *puhelimen* 15%, *puhelin* 14%, *puhelimessasi* 12%, *puhelimessa* 12%, *puhelimeen* 8% |
| ihminen | 128 | *ihmiset* 19%, *ihmistä* 19%, *ihmisiä* 19%, *ihmisten* 12%, *ihmisen* 9% |
| kysymys | 132 | *kysymys* 37%, *kysymyksiä* 15%, *kysymyksiin* 13%, *kysymykseen* 8%, *kysymystä* 5% |
| terveys | 72 | *terveyden* 42%, *terveys* 11%, *terveyttä* 9%, *terveydelle* 8%, *terveyteen* 8% |
| asiakas | 158 | *asiakkaita* 15%, *asiakkaat* 14%, *asiakas* 12%, *asiakkaiden* 11%, *asiakkaan* 9% |
| mies | 175 | *mies* 37%, *miesten* 16%, *miehen* 14%, *miehet* 8%, *miestä* 8% |
| kevät | 67 | *keväällä* 34%, *kevään* 30%, *keväänä* 18%, *kevät* 8%, *keväästä* 3% |
| perhe | 186 | *perheen* 26%, *perhe* 18%, *perheiden* 6%, *perheessä* 5%, *perheensä* 5% |
| ruokakauppa | 56 | *ruokakaupassa* 20%, *ruokakaupan* 16%, *ruokakaupoissa* 11%, *ruokakauppa* 9%, *ruokakauppojen* 8% |
| terveyskeskus | 61 | *terveyskeskuksen* 31%, *terveyskeskus* 15%, *terveyskeskuksessa* 12%, *terveyskeskukseen* 10%, *terveyskeskusten* 8% |
| työpaikka | 115 | *työpaikkoja* 19%, *työpaikkaa* 14%, *työpaikan* 10%, *työpaikkojen* 9%, *työpaikoilla* 7% |

Corpus findings, limited to news text:

- **Time nouns appear mostly in time expressions:** *vuonna* is 31% of
  *vuosi*, *viikolla* 32% of *viikko*, *illalla* 32% of *ilta*, *keväällä*
  34% of *kevät*, *aikana* 34% of *aika*.
- **Mass nouns appear mostly in the partitive:** *rahaa* 49%, *lunta* 44%,
  *ruokaa* 36%, *vettä* 29%.
- **Kinship nouns often carry possessive suffixes:** *tyttärensä* 19% of
  *tytär*.

How much weight these deserve in the curriculum is a pedagogical decision.

## 6. Limitations not resolved

- **Automatic annotation.** Rules J1, J2, K1, S1, H1, F1 and P1 rest on
  AI-read samples of 20–100 hits. None is native-reviewed.
- **Mixed parsers.** Only the 2022–2024 metadata names a parser (TDPP-LBF),
  so the annotation may differ between the three parts. This was not tested.
- **Partial checks.** Of the 264 lexicon nouns, only the 49 pilot nouns had
  their top forms reviewed, and only 11 edge cases plus *sää*, *vieras* and
  *kortti* were read in context. Repeated text was checked for 3 nouns.
- **Coarse dispersion.** Dispersion is measured across years. Document
  frequency covers one year only.
- **Overlap and licensing.** The easy-to-read corpus overlaps the primary
  measure. Suomi24 is excluded from ranking for licensing reasons. There is
  **no spoken measure**.
- **Senses and homographs** stay merged unless a rule above separates them.
  Compounds are their own lemmas.

## Appendix A: queries

All `count` requests go to `…/korp/api8/count` with `corpus` set to the 14
Yle corpora unless stated otherwise. Samples use `…/query` with `start=0`,
`end=n−1`, `default_context=1 sentence`, `sort=random` and the seed shown.

| ID | CQP | Parameters |
|---|---|---|
| Q1 | `[lemma="L" %c]` | `group_by=lemma,pos` (each pilot lemma; also on the easy-to-read corpus and `S24_2023`) |
| Q2 | `[lemma="L" & pos="N"]` | `group_by=word`, `ignore_case=word` |
| Q264 | `[lemma="(…264 lexicon noun lemmas…)"]` | `group_by=lemma,pos` (one request) |
| D1 | `[pos="Punct"]`; `<text> []` | `group_by=pos` (per-corpus sums) |
| D2 | `[lemma="L" & pos="N"]` | `group_by_struct=text_id`, corpus `YLENEWS_FI_2024_S` (49 lemmas); all 14 for *puhelin, lääkäri, kirja* |
| R1 | `[] [] [] [lemma="L" & pos="N"] [] [] []` | `group_by=word`, `ignore_case=word`, `default_within=sentence` |
| R1b | `[word="Onhan" %c] [word="sinulla" %c] [word="jo" %c] [word="puhelimessasi" %c] [word="Ylen" %c] [word="Uutisvahti" %c]` | `group_by=pos` |
| J | `[word="joista" %c]` (`group_by=lemma,pos,msd,deprel`); `[lemma="joki" & pos="N"]` (`word,msd`); `[word=","] [word="joista" %c & lemma="joki"]`; the same followed by `[word="ja\|,\|sekä\|tai"]` or `[word="[.!?;:)]"]`; `[msd=".*CASE_Ela.*"] [word=","] [word="joista" %c & lemma="joki"]`; `[word!=","] [word="joista" %c & lemma="joki"]`; `[lemma="joki" & pos="N" & msd=".*CLIT_Foc_kin.*"]` | samples: seeds 11, 3, 5 |
| K | `[word="kuin" %c & lemma="kuu"]` (`group_by=msd,deprel`); `[lemma="kuu" & pos="N" & word!="kuin" %c]` | samples of 100 and 30, seed 21 |
| S | `[lemma="kuusi" & pos="N"]` (`word,msd`); `[lemma="kuusi" & pos="Num"]`; `[word="kuusi" %c & lemma="kuusi" & pos="N"]`; `[word="kuusen\|kuusia\|kuuset\|kuuseen\|kuusesta" %c & lemma="kuusi" & pos="N"]`; `[word="kuusta" %c & lemma="kuusi"]` | samples of 50, 30 and 20, seed 21 |
| H | `[lemma="koto" & pos="N"]` (`word`); `[word="kotona\|kotoa\|kotiin\|…" %c]` (`word,lemma,pos`); `[lemma="kotona\|kotoa\|kotiin" & pos="Adv"]` (`lemma`) | |
| F | `[lemma="suomi\|Suomi" & pos="N"]` and `<sentence> [lemma="suomi\|Suomi" & pos="N"]` (`group_by=word`, case-sensitive); samples `[] [word="suom.*" & lemma="suomi\|Suomi" & pos="N"]` and `[] [word="Suom.*" …]` with `default_within=sentence` | seed 31 |
| P | `[lemma="sää"]` (`lemma,pos,word`); `[word="sää" %c & lemma="sää" & pos="Pron"]`; `[lemma="vieras"]` (`pos`); R1 on `YLENEWS_FI_2019_S` for *kortti* | seed 4 |

## Appendix B: the pilot script

Python 3, standard library only. It produced Q1, Q2 and the first validation
queries; the forensic queries in Appendix A used the same request function
(`get`, with caching).

```python
"""
Sija Phase 1 Korp pilot (scratchpad only; never part of the app).

For each sample lemma and each corpus set, runs two Korp API `count` queries:
  Q1  [lemma="<L>" %c]             group_by=lemma,pos   -> POS split, case variants (suomi/Suomi)
  Q2  [lemma="<L>" & pos="N"]      group_by=word, ignore_case=word -> top surface forms of the noun reading
plus a fixed set of validation queries on known forms (V*).

Every request URL, the UTC time and the raw JSON response are saved in raw/.
Usage: python3 pilot.py            (re-uses cached responses in raw/)
"""
import hashlib, json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

API = "https://www.kielipankki.fi/korp/api8"
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
os.makedirs(RAW, exist_ok=True)

YLE = [f"YLENEWS_FI_{y}_S" for y in range(2011, 2025)]
SETS = {
    "yle": YLE,                                   # CC BY 4.0, Yle
    "selko": ["YLENEWS_FI_2011_2018_SELKO_S"],    # CC BY 4.0, Yle (subset of yle)
    "s24_2023": ["S24_2023"],                     # CC BY-NC 4.0, City Digital Group
}

# lemma, Kotus type in the Sija lexicon, sample category, why it is in the sample
SAMPLE = [
    ("talo", "k1", "everyday", ""), ("koulu", "k1", "everyday", ""), ("viikko", "k1", "everyday", ""),
    ("asunto", "k1", "everyday", ""), ("palvelu", "k2", "type", ""),
    ("koti", "k5", "edge", "kotona/kotiin/kotoa are often lemmatised as adverbs or as 'koto'"),
    ("kaupunki", "k5", "everyday", ""), ("tunti", "k5", "everyday", ""), ("äiti", "k5", "everyday", ""),
    ("lääkäri", "k6", "everyday", ""), ("nimi", "k7", "everyday", ""),
    ("lehti", "k7", "edge", "polysemy: leaf / newspaper / magazine"),
    ("joki", "k7", "edge", "secondary list ranks it #21; possible confusion with the pronoun jokin"),
    ("suomi", "k7", "edge", "language (suomi) vs proper noun Suomi 'Finland'"),
    ("kauppa", "k9", "everyday", ""), ("kirja", "k9", "everyday", ""), ("raha", "k9", "everyday", ""),
    ("aika", "k9", "edge", "noun 'time' vs adverb 'quite'"),
    ("ilta", "k9", "everyday", ""), ("hinta", "k9", "everyday", ""), ("päivä", "k10", "everyday", ""),
    ("ruoka", "k10", "everyday", ""), ("omena", "k11", "type", ""), ("ravintola", "k12", "type", ""),
    ("sairaala", "k13", "type", ""), ("maa", "k18", "everyday", ""),
    ("kuu", "k18", "edge", "moon / month; month names are compounds (tammikuu)"),
    ("työ", "k19", "everyday", ""), ("tuli", "k23", "edge", "noun 'fire' vs past tense of tulla"),
    ("kuusi", "k24", "edge", "noun 'spruce' vs numeral 'six' (two lexemes in Sija)"),
    ("lumi", "k25", "type", ""), ("kieli", "k26", "everyday", ""),
    ("puoli", "k26", "edge", "noun 'half/side' vs postposition/adverb uses (puolesta, puolella)"),
    ("vesi", "k27", "everyday", ""), ("vuosi", "k27", "edge", "essive vuonna; secondary list shows a 'vuo' artefact"),
    ("varsi", "k28", "edge", "secondary list ranks it #50; possible confusion with varsin/varsinkin"),
    ("lapsi", "k29", "everyday", ""), ("tytär", "k32", "type", ""), ("puhelin", "k33", "type", ""),
    ("ihminen", "k38", "everyday", ""), ("kysymys", "k39", "type", ""), ("terveys", "k40", "type", ""),
    ("asiakas", "k41", "type", ""), ("mies", "k42", "everyday", ""), ("kevät", "k44", "type", ""),
    ("perhe", "k48", "everyday", ""),
    ("ruokakauppa", "k9", "compound", "ruoka + kauppa"), ("terveyskeskus", "k39", "compound", "terveys + keskus"),
    ("työpaikka", "k9", "compound", "työ + paikka"),
]

VALIDATION = [
    ("V1", '[word="vuonna" %c]', "lemma,pos", "expect vuosi N"),
    ("V2", '[word="kotona" %c]', "lemma,pos", "lexicalised adverb vs koti N"),
    ("V3", '[word="kotiin" %c]', "lemma,pos", "lexicalised adverb vs koti N"),
    ("V4", '[word="tuli" %c]', "lemma,pos", "mostly tulla V expected"),
    ("V5", '[word="kuusi" %c]', "lemma,pos", "numeral vs noun"),
    ("V6", '[word="kaupassa" %c]', "lemma,pos", "expect kauppa N"),
    ("V7", '[word="ruokakaupassa" %c]', "lemma,lemmacomp,pos", "expect ruokakauppa, lemmacomp ruoka|kauppa"),
    ("V8", '[word="jokin" %c]', "lemma,pos", "expect jokin Pron, not joki N"),
    ("V9", '[word="varsin" %c]', "lemma,pos", "expect varsin Adv, not varsi N"),
    ("V10", '[word="puolesta" %c]', "lemma,pos", "postposition vs noun puoli"),
]


def get(command, params):
    url = f"{API}/{command}?" + urllib.parse.urlencode(params)
    key = hashlib.sha1(url.encode()).hexdigest()[:16]
    path = os.path.join(RAW, f"{command}_{key}.json")
    if os.path.exists(path):
        return json.load(open(path))["response"]
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=600) as r:
                data = json.load(r)
            break
        except Exception as e:  # network hiccup: wait and retry
            if attempt == 2:
                raise
            time.sleep(10)
    json.dump({"url": url, "fetched_utc": datetime.now(timezone.utc).isoformat(), "response": data},
              open(path, "w"), ensure_ascii=False)
    time.sleep(1.0)  # be polite to a shared public service
    return data


def count(corpora, cqp, group_by, ignore_case=None):
    p = {"corpus": ",".join(corpora), "cqp": cqp, "group_by": group_by}
    if ignore_case:
        p["ignore_case"] = ignore_case
    d = get("count", p)
    if "ERROR" in d:
        raise RuntimeError(f"{cqp}: {d['ERROR']}")
    return d


def rows(d):
    return sorted(
        ({"value": {k: " ".join(v) for k, v in r["value"].items()}, "abs": r["absolute"], "pm": r["relative"]}
         for r in d["combined"]["rows"]),
        key=lambda r: -r["abs"])


def main():
    info = get("corpus_info", {"corpus": ",".join(sum(SETS.values(), []))})
    sizes = {s: sum(int(info["corpora"][c]["info"]["Size"]) for c in cs) for s, cs in SETS.items()}
    out = {"generated_utc": datetime.now(timezone.utc).isoformat(), "sizes": sizes, "lemmas": [], "validation": {}}
    for lemma, typ, cat, note in SAMPLE:
        rec = {"lemma": lemma, "type": typ, "category": cat, "note": note, "sets": {}}
        for s, cs in SETS.items():
            q1 = rows(count(cs, f'[lemma="{lemma}" %c]', "lemma,pos"))
            q2 = rows(count(cs, f'[lemma="{lemma}" & pos="N"]', "word", "word"))
            noun_lower = sum(r["abs"] for r in q1 if r["value"]["pos"] == "N" and r["value"]["lemma"] == lemma)
            noun_other_case = sum(r["abs"] for r in q1 if r["value"]["pos"] == "N" and r["value"]["lemma"] != lemma)
            other_pos = sum(r["abs"] for r in q1 if r["value"]["pos"] != "N")
            rec["sets"][s] = {
                "noun": noun_lower,
                "noun_pm": noun_lower / sizes[s] * 1e6,
                "noun_capitalised_lemma": noun_other_case,
                "other_pos": other_pos,
                "pos_split": q1,
                "top_forms": q2[:10],
                "distinct_forms": len(q2),
            }
        out["lemmas"].append(rec)
        print(lemma, {s: rec["sets"][s]["noun"] for s in SETS}, file=sys.stderr)
    for vid, cqp, gb, expect in VALIDATION:
        out["validation"][vid] = {"cqp": cqp, "expect": expect, "rows": rows(count(SETS["yle"], cqp, gb))[:8]}
    json.dump(out, open(os.path.join(HERE, "pilot_results.json"), "w"), ensure_ascii=False, indent=1)
    print("done", file=sys.stderr)


if __name__ == "__main__":
    main()
```
