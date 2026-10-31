# Frequency and lexical sources: access and licences

Phase 1 research for the learning map (revision 2). **Nothing in this
document is used by the app.** No frequency data has been added to `src/`,
and `Noun.frequency` keeps its editorial meaning.

- Checked on: 28–29 October 2026
- Checked by: AI-drafted research, not yet reviewed by a person
- Companion documents: [KORP_PILOT.md](KORP_PILOT.md) (queries, forensics and
  measurements), [RANKING_PROPOSAL.md](RANKING_PROPOSAL.md) (how the evidence
  could be used)

## Summary

| Source | Role | Status |
|---|---|---|
| Yle Finnish News Archive 2011–2024, scrambled (14 Korp corpora) | **Primary** written measure | Licence verified **per corpus ID** from the resource metadata: CC BY, attribution required |
| Yle News Archive Easy-to-read Finnish 2011–2018, scrambled | Separate comparison signal only | Licence verified: CC BY. A subset of the Yle archive, so never added to the primary measure |
| Suomi24 2023 (Korp) | Comparison signal only | CC BY-NC 4.0 (verified). **Not used to influence rankings** until the non-commercial question is resolved |
| Other Korp corpora | Spoken and other registers | Examined, not used. No suitable spoken corpus found |
| Kotus *Nykysuomen sanalista* 2024 | Lemma, part of speech, inflection type | CC BY 4.0. No frequency data |
| Kotus Parole frequency list | — | **Licence now verified as restricted:** "academic-nonCommercialUse", "shareAlike". Excluded |
| Sketch Engine fiTenTen24 | — | No access. Not purchased |
| pol.ho.ua "Finnish Frequency Dictionary" | — | Not copied, not used. No licence stated |
| OPH YKI framework (2011) | Loose alignment of everyday topics | Read. Nine topic areas recorded |

## How sources were checked

| What | How |
|---|---|
| Corpus inventory, sizes, attributes | Korp API `https://www.kielipankki.fi/korp/api8/`: `info`, `corpus_info` |
| Which metadata record belongs to which corpus ID | The Korp front-end configuration `https://www.kielipankki.fi/korp/modes/default_mode.js`. For Yle it lists, for each range of years, a metadata PID and a location PID (`funcs.ylenews_fi_addCorpora("s", …)`) |
| Resource metadata (licence, availability, licensor, size) | The CMDI records, through the CLARINO OAI-PMH service: `https://clarino.uib.no/oai?verb=GetRecord&metadataPrefix=cmdi&identifier=oai:clarino.uib.no:lb-<PID>`. The browser pages for these records need JavaScript, but the OAI-PMH service does not. |
| Licence text and covered resources | The Kielipankki licence page each licence URN resolves to |
| Where each PID points | `urn.fi` redirects, checked one by one |

A public API does not mean an open licence. Every corpus below can be queried
without logging in. The licence decides what may be kept or shipped.

## Primary measure: the 14 Yle corpus IDs

### One record per corpus ID

The sizes come from Korp. Word tokens are tokens minus `pos="Punct"`, and
texts are counts of `<text>`. All 14 corpora have the same positional
attributes: `word, ref, lemma, lemmacomp, pos, msd, dephead, deprel, lex`.

| Korp corpus ID | Tokens | Word tokens | Sentences | Texts | Korp `Updated` | Part (metadata PID / location PID) |
|---|--:|--:|--:|--:|---|---|
| `YLENEWS_FI_2011_S` | 21,571,867 | 18,670,955 | 1,982,702 | 99,376 | 2019-12-02 | 2011–2018: `lb-2019121004` / `lb-2019121006` |
| `YLENEWS_FI_2012_S` | 22,798,812 | 19,570,628 | 2,098,765 | 96,658 | 2019-12-02 | 2011–2018: `lb-2019121004` / `lb-2019121006` |
| `YLENEWS_FI_2013_S` | 26,385,539 | 22,584,406 | 2,400,977 | 100,209 | 2019-12-03 | 2011–2018: `lb-2019121004` / `lb-2019121006` |
| `YLENEWS_FI_2014_S` | 29,079,880 | 24,804,409 | 2,610,219 | 103,743 | 2019-12-03 | 2011–2018: `lb-2019121004` / `lb-2019121006` |
| `YLENEWS_FI_2015_S` | 31,037,909 | 26,361,486 | 2,808,698 | 99,539 | 2019-12-03 | 2011–2018: `lb-2019121004` / `lb-2019121006` |
| `YLENEWS_FI_2016_S` | 27,844,603 | 23,635,305 | 2,485,916 | 79,511 | 2019-12-03 | 2011–2018: `lb-2019121004` / `lb-2019121006` |
| `YLENEWS_FI_2017_S` | 23,545,537 | 19,922,948 | 2,093,235 | 58,802 | 2019-12-03 | 2011–2018: `lb-2019121004` / `lb-2019121006` |
| `YLENEWS_FI_2018_S` | 25,236,074 | 21,328,087 | 2,227,719 | 65,835 | 2019-12-03 | 2011–2018: `lb-2019121004` / `lb-2019121006` |
| `YLENEWS_FI_2019_S` | 25,772,447 | 21,673,979 | 2,246,747 | 65,811 | 2022-03-31 | 2019–2021: `lb-2022032201` / `lb-2022032202` |
| `YLENEWS_FI_2020_S` | 27,871,609 | 23,534,134 | 2,391,136 | 63,004 | 2022-03-31 | 2019–2021: `lb-2022032201` / `lb-2022032202` |
| `YLENEWS_FI_2021_S` | 25,374,938 | 21,457,118 | 2,165,455 | 56,543 | 2022-03-31 | 2019–2021: `lb-2022032201` / `lb-2022032202` |
| `YLENEWS_FI_2022_S` | 21,981,517 | 18,549,457 | 1,872,875 | 49,539 | 2025-11-20 | 2022–2024: `lb-2025110403` / `lb-2025110404` |
| `YLENEWS_FI_2023_S` | 20,238,822 | 17,049,479 | 1,754,276 | 49,045 | 2025-11-21 | 2022–2024: `lb-2025110403` / `lb-2025110404` |
| `YLENEWS_FI_2024_S` | 20,721,191 | 17,473,216 | 1,816,588 | 56,038 | 2025-11-20 | 2022–2024: `lb-2025110403` / `lb-2025110404` |
| **Total** | **349,460,745** | **296,615,607** | **30,955,308** | **1,043,653** | | |

Each location PID resolves to the Korp corpus group it names, e.g.
`lb-2019121006` → `korp/#?corpus=ylenews-fi-2011-2018-s`.

### The resource metadata behind each part

Fields are quoted from the CMDI records.

| Field | 2011–2018 (`lb-2019121004`) | 2019–2021 (`lb-2022032201`) | 2022–2024 (`lb-2025110403`) |
|---|---|---|---|
| `resourceName` | "Yle Finnish News Archive 2011-2018, scrambled, Korp" | "Yle Finnish News Archive 2019-2021, scrambled, Korp" | "Yle Finnish News Archive 2022-2024, scrambled, Korp" |
| `licence` | CC-BY | CC-BY | CC-BY |
| `availability` | available-unrestrictedUse | available-unrestrictedUse | available-unrestrictedUse |
| `restrictionsOfUse` | attribution | attribution | attribution |
| `distributionAccessMedium` | accessibleThroughInterface | accessibleThroughInterface | accessibleThroughInterface |
| Licensor | Yleisradio Oy (Finnish Broadcasting Company, Yle) | Yleisradio Oy | Yleisradio Oy ("Yle, the Finnish Broadcasting Company") |
| Distribution rights holder | University of Helsinki | University of Helsinki | University of Helsinki |
| Size in the record | 207,500,221 tokens; 18,708,231 sentences | 79,018,994 tokens; 6,803,338 sentences | 62,941,530 tokens; 5,443,739 sentences |
| Matches the Korp sizes above? | Yes (2011–2018 sum) | Yes | Yes |
| `annotationTool` | not stated | not stated | TDPP-LBF (`urn:nbn:fi:lb-2024021503`) |
| `metadataLastDateUpdated` | 2024-03-01 | 2024-03-26 | 2026-02-10 |

A fourth record, `lb-2025112103` ("Yle Finnish News Archive 2011-2024,
scrambled, Korp"), describes all three parts together: CC-BY,
available-unrestrictedUse, 349,460,745 tokens and 30,955,308 sentences.

**Licence page:** `urn:nbn:fi:lb-2022082901` →
`kielipankki.fi/lic/ylenews-scrambled-sentences-eng`, "Public end-user
license (CC-BY)", "Last modified on 2026-01-29", rightholder "Yle, the
Finnish Broadcasting Company". It names all three metadata PIDs above (and
`lb-2025112103`) among the resources it covers.

**What this establishes:** every one of the 14 corpus IDs belongs to a part
whose own metadata record says CC BY with attribution, available for
unrestricted use. The years do not differ in licence.

**What it does not establish:**

- **No citation text.** The records give no recommended citation; the
  attribution draft below is ours.
- **Annotation may not be uniform.** The parser is named only for 2022–2024.
  The Korp configuration gives all 14 the same attribute set
  (`attrlist.parsed_tdt`), but that is not proof that the same parser
  version was used.
- **Scrambling.** Sentences are scrambled within each text. Token counts are
  unaffected; context beyond one sentence is not available.

## Comparison signals

### Yle News Archive Easy-to-read Finnish 2011–2018, scrambled

| Field | Value |
|---|---|
| Korp corpus ID | `YLENEWS_FI_2011_2018_SELKO_S` |
| Metadata record `lb-2019121204` | "Yle News Archive Easy-to-read Finnish 2011-2018, scrambled, Korp". `licence` CC-BY; `availability` available-unrestrictedUse; `restrictionsOfUse` attribution; licensor Yleisradio Oy; 826,737 tokens, 112,485 sentences |
| Location PID | `lb-2019121206` → `korp/#?corpus=ylenews-fi-2011-2018-selko-s-korp` |
| Texts / punctuation | 4,063 texts; 132,802 punctuation tokens |
| Dates | Korp gives 20.9.2014 – 31.12.2018 although the name says 2011–2018. **Not explained.** |
| Use | A separate signal for plain-language news. The Korp configuration says the main archive **contains** these items, so the two are not independent, and the counts are never added together. |

### Suomi24 2023

| Field | Value |
|---|---|
| Korp corpus ID | `S24_2023` (one of the yearly corpora `S24_2001` … `S24_2023`) |
| Resource | "Suomi24 virkkeet -korpus 2001-2023, Korp-versio", `urn:nbn:fi:lb-2024051601` |
| Size | 171,487,470 tokens (all 23 years: 5,056,282,796) |
| Register | Anonymous discussion forum: informal **written** language, not speech |
| Licence | CC BY-NC 4.0. Licence page `urn:nbn:fi:lb-2022021922`, "Tätä sivua on viimeksi päivitetty: 8.4.2025", rightholder "City Digital Group" |
| Use | Source-specific counts are kept in the pilot for comparison only. **Not used to influence rankings** until the implications of NonCommercial for Sija are decided. Not shipped. |

## Corpora examined but not used

| Korp ID | Tokens | Register | Licence | Why not used |
|---|--:|---|---|---|
| `STT_1992` … `STT_2018` (27) | 583,774,553 | News agency wire, 1992–2018 | CC BY-NC 4.0, verified on its licence page (`lb-2023022703`) | Older; non-commercial |
| `OPENSUB_FI_2017` | 267,645,406 | Subtitles, mostly translated | Declared CC BY 4.0 in the Korp configuration; **not verified** | Translated dialogue |
| `EDUSKUNTA` | 22,458,581 | Parliament plenary transcripts, 2008–2016 | Declared "Tekijänoikeusvapaa; +PRIV"; **not verified** | Formal spoken; personal data |
| `ARKISYN` | 326,946 | Conversational Finnish | Declared CC BY-ND; **not verified** | Too small; NoDerivatives |
| `SKN` | 841,755 | Dialect samples | Declared CC BY 4.0; **not verified** | Dialectal |
| `YLILAUTA` | 26,869,417 | Imageboard, 2013–2014 | Declared CC BY-NC; **not verified** | Old, small, offensive content |
| `YLENEWS_FI_*_A` and other protected corpora | n/a | | Login or permission required | Not examined |

Now that the OAI-PMH route works, the declared licences above can be verified
the same way if any of these corpora is ever considered. That has not been done.

**Spoken-language gap.** No openly accessible, adequately sized corpus of
everyday spoken Finnish with a verified licence was found. There is no spoken
frequency measure.

## Other sources

### Kotus *Nykysuomen sanalista* 2024

- Licence CC BY 4.0. The required attribution is already in
  `src/data/credits.ts`.
- The page says the list was updated 11.4.2025. The download's
  `Last-Modified` header is 15 May 2024. The live file and the copy cached by
  `verify:kotus` are identical (SHA-256 `bfa3d6a6…4473cb3`).
- It contains no frequency data. Kotus states: "Sanalista ei ole tyhjentävä
  tai normatiivinen luettelo suomen kielen sanoista" (the list is neither an
  exhaustive nor a normative inventory of Finnish words).

### Kotus Parole frequency list: licence verified, excluded

The metadata record `lb-20140730146` ("Frequency List of Written Finnish Word
Forms"), read through OAI-PMH, says:

| Field | Value |
|---|---|
| `licence` | other |
| `availability` | available-restrictedUse |
| `restrictionsOfUse` | academic-nonCommercialUse, other, shareAlike |
| `distributionAccessMedium` | downloadable |
| Licensor | Kotimaisten kielten keskus (Institute for the Languages of Finland, Kotus) |
| Size | 327,000 entries |
| `metadataLastDateUpdated` | 2021-09-29 |

Kotus' general CC BY 4.0 policy for its public language materials therefore
does **not** cover this list. The record's restrictions are academic,
non-commercial use, share-alike, and "other" (not specified in the record).
The corpus behind it was compiled in 1996–1998 and the list ranks word forms,
not lemmas. **Parole stays excluded:** not used, not redistributed, nothing
derived from it kept.

### Sketch Engine: fiTenTen24 (not purchased)

- **What it would add:** web text across many sites (4.4 billion words,
  crawled in 2019, 2020 and 2024) and ready-made lemma lists by part of speech.
- **Why that is worth little now:**
  - Korp already gives recent edited prose under CC BY.
  - The secondary list built on fiTenTen24 shows lemmatisation artefacts
    (*vuo*, *n*, *of*, *helsing*), while Korp analysed *vuonna* correctly.
  - No public statement was found on storing or redistributing exported
    word lists.
- **Recommendation:** do not buy access at this stage.

### pol.ho.ua "Finnish Frequency Dictionary: Nouns"

No publisher, method or licence is stated. Not copied, stored or used.

### OPH: YKI tests

- The OPH YKI page maps YKI grades 1–6 to CEFR A1–C2 and lists four subtests.
- The framework it links, *Yleisten kielitutkintojen perusteet* (2011 PDF),
  lists topic areas: "A Minä ja taustani, B Koti ja asuminen, C Kauppa ja
  palvelut, D Kulttuuri, E Matkustaminen, F Terveys ja hyvinvointi, G Työ,
  H Ympäristö, I Yhteiskunta".
- The framework classifies topics, **not words**, and says nothing about
  frequency. Any link from a Sija word or theme to an area is Sija's own
  loose alignment. Sija's stages are not YKI or CEFR levels.

## Attribution drafts (if derived data is ever kept or shown)

Drafts only; no citation text is given in the metadata records.

- Yle: "Frequencies derived by Sija from *Yle Finnish News Archive 2011–2024,
  scrambled, Korp* (Yleisradio Oy / Yle, the Finnish Broadcasting Company),
  http://urn.fi/urn:nbn:fi:lb-2025112103, CC BY. Counts retrieved through the
  Kielipankki Korp API on [date]; aggregated and adjusted by Sija (rules
  documented in KORP_PILOT.md)."
- Suomi24 (only if the licence question is resolved): "… *Suomi24 virkkeet
  -korpus 2001–2023, Korp-versio* (City Digital Group),
  http://urn.fi/urn:nbn:fi:lb-2024051601, CC BY-NC 4.0."

## Still unverified

1. Which parser and version annotated the 2011–2018 and 2019–2021 parts.
   The comparability preflight ([COMPARABILITY.md](COMPARABILITY.md)) found
   identical tag inventories and consistent behaviour, but this is still not
   established.
2. Why the easy-to-read corpus starts in 2014 although its name says 2011.
3. The licences of the unused corpora (declared only).
4. Whether Kielipankki has usage terms for the Korp API itself (none were found).
5. Sketch Engine's terms for exported data.
6. Parole's "other" restriction, which the record does not specify. Moot while Parole is excluded.
