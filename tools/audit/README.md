# Grammar audit

A development tool that checks the app's Finnish: the lexicon, every form the
engine generates (possessives included), the example sentences and the
hand-written Finnish copy. It reports problems by severity and links each one
to the line in `src/data/` that causes it. Nothing here ships with the app.

```sh
npm run audit:grammar   # export a snapshot, run all three audits, write the report (~2 min)
npm run audit:test      # self-tests: every check flags a wrong example and accepts a right one
```

The report is written to `tools/audit/out/`. Open `report.html` in a browser
(filters, search, "new only") or read `report.md`. The run fails (exit 1) when
unwaived findings reach `fail_on` in `audit.toml` (default: errors).

The report also gives a **verification status**, separate from pass/fail.
VERIFIED requires five things:

1. no engine errors;
2. no unexplained morphology differences;
3. every critical learner-facing form reviewed by a native speaker;
4. no other open errors or warnings;
5. every check ran on one snapshot.

`generate-report.py --require-verified` exits 1 unless it is VERIFIED.

## How it works

```
src/data + src/grammar ──export-snapshot.ts──▶ out/snapshot.json
                                                    │
   vocabulary-audit.py ─┐                           │ (read-only)
   morphology-audit.py ─┼─▶ out/findings/<audit>.json ──generate-report.py──▶ out/report.{md,html,json}
   sentence-audit.py ───┘
```

- **`export-snapshot.ts`** renders everything with the real engine (lexicon,
  7.6k forms, 36k possessive forms, 820 sentences with their tokens, lesson
  references, ~800 Finnish copy strings) into one JSON file. The Python audits
  never import the app.
- **The audits** run their checks, apply waivers and write their findings.
  Each can be run alone:

  ```sh
  PY=tools/morph-oracle/.venv/bin/python
  $PY tools/audit/sentence-audit.py --list          # checks, severities, options
  $PY tools/audit/sentence-audit.py --only S05,S06  # selected checks
  $PY tools/audit/morphology-audit.py --all         # print every finding, waived ones included
  ```

- **`generate-report.py`** merges the findings, marks what is new since the
  previous report, lists what was resolved, and flags stale waivers and audits
  run on different snapshots.

The independent oracle is the GiellaLT Finnish analyser and generator (same
setup as `npm run verify:morph`; see `docs/VERIFICATION.md`). The Kotus check
reads the word list that `npm run verify:kotus` downloads. When either is
missing, the checks that need it are reported as **skipped**, never as passed.

## The audits

| Audit | Checks | Looks at |
|---|---|---|
| Vocabulary | V01–V10 | Kotus type and gradation, the analyser knows each lemma, homonyms, compounds, vowel harmony, content fields, words used and introduced in order, colliding glosses, provenance |
| Morphology | M01–M10 | Every form and every possessive form against the oracle (both directions), coloured pieces spell the form, ending and suffix harmony, paradigm shape, forms shared between words, hidden slots; M10 lists the forms awaiting native-speaker review |
| Sentence | S01–S23 | Spelling; lexicon words typed by hand instead of as tokens; agreement, numerals and quantifiers, adpositions, verb government, negation, object form and subject–verb number around tokens; locative type, number use, case-page examples, levels (words ≤ sentence ≤ lesson), duplicates, questions, register, focus, nouns missing from the lexicon; spelling of lesson text, glossary and YKI answers |

`--list` or the report's check catalogue describes every check.

**Severities.** `error`: wrong Finnish or broken data. `warning`: probably
wrong, or against the content rules (e.g. a lexicon word typed by hand, so
the engine never checks it). `info`: worth knowing, no action required.

**The grammar checks are deliberately narrow.** S04–S10 look only at
neighbouring words inside one clause and only judge words the analyser reads
unambiguously. They miss things rather than invent them. A clean run means
nothing obvious is wrong; it does not replace a native speaker's review.

## When a finding is not a problem

There are three places to record that, depending on who is wrong:

| Situation | Where |
|---|---|
| The engine's base form is right and GiellaLT disagrees | `tools/morph-oracle/adjudicated.json` (shared with `verify:morph`). The audit shows these as waived, with the adjudication as the reason. |
| GiellaLT has a systematic defect in possessive forms | `KNOWN GiellaLT defects` in `morphology-audit.py`, each settled against Kielitoimiston ohjepankki. |
| Anything else that was reviewed and is correct | `waivers.toml`: check, subject, optional key (wildcards allowed) and a **required reason**. |

Waived findings stay visible in the report. A waiver that matches nothing is
reported as stale. `subject` may be a list when several subjects share one
reason.

## Native-speaker review (M10, `reviews.toml`)

Some forms the app shows or accepts are not confirmed by the oracle. The
engine's choice was settled against a second source: adjudicated forms, known
oracle defects, and lexicalised literals such as *kotona*. M10 groups them by
that judgement. Each run of `npm run audit:grammar` regenerates the reviewer's
packet, [docs/NATIVE_REVIEW.md](../../docs/NATIVE_REVIEW.md). For every group
the packet gives:

- every form, with its lemma and slot, the engine's form and label, what
  GiellaLT generates and how it reads the form;
- the second source and why a person must check it;
- its priority (High / Medium / Low, with reasons);
- the questions for each review dimension: morphology, natural usage,
  lexical/semantic, explanation (the explanation is quoted as the app shows it);
- a ready-made `reviews.toml` entry.

`reviews.toml` is the only record of review decisions. No tool writes to it.

```toml
[[review]]
group = "oracle-defect:pl-allative-vn"   # group id from the packet
reviewer = "Full name"
role = "native-speaker"                  # only native-speaker reviews verify a group
date = "2026-10-12"
morphology = "correct"                   # correct | incorrect | unsure, per dimension the group asks
usage = "correct"
pedagogy = "correct"
incorrect_forms = []                     # any form found wrong
note = ""
```

The rules for a group's status:

- **VERIFIED**: a native speaker answered `correct` for every dimension the
  group lists and marked no form wrong. The group then shows as waived, with
  the reviewer's name.
- **NEEDS CORRECTION**: any reviewer answered `incorrect` or listed a form. This
  is an error, so the audit fails until the engine or data is fixed and the
  group is reviewed again.
- **PENDING**: anything else (`unsure`, unanswered dimensions, non-native
  reviewers). This is a warning.

`audit:grammar` prints every group with its status.

To rehearse without touching the record, point `GRAMMAR_AUDIT_REVIEWS` at a
trial file. The packet then goes to `out/NATIVE_REVIEW.trial.md`.

## Explanation audit (`npm run audit:explanations`)

A separate TypeScript audit of the learner-facing explanations ("Explain this
form"). It reports, in `out/explanations.md` and `out/explanations.json`:

- how many forms have a complete, derivation-backed explanation, how many are
  partial, recorded (memorized forms: no derivation claimed) or unexplained;
- mismatched visual pieces (pieces that do not spell the form) and mismatched
  derivation steps (formula, stem or result that disagree with the engine);
- how many forms have an annotated example sentence ("why this case here"),
  which sentences have no note yet, and invalid annotations (reason does not fit
  the case or number, trigger word missing from the sentence, …);
- Finnish forms cited in rule texts whose own derivation does not use the rule,
  and rule-note examples that do not show the stated pattern.

It exits 1 on failures; missing sentence notes are gaps, not failures. Add
`-- --px` to include about 41k possessive forms. Like the other audits, a clean
run is not a linguistic verification.

## Final verification summary

`npm run verify:all` runs Kotus, the morphology oracle, the golden tests, the
grammar audit and the end-to-end tests. It then prints the summary (automated
results, human review counts, final status) and saves it to
`out/verification-summary.txt`, with each step's log in `out/logs/`. It exits
0 only when the final status is VERIFIED.

## Extending the framework

### Add a check

Add a function to the audit it belongs to, decorated with `@audit.check`. Its
docstring becomes the description in the report:

```python
@audit.check("S23", "ordinal-agreement", "Ordinals agree with their noun", severity="warning",
             needs=("oracle",), options={"min_length": 3})
def ordinal_agreement(ctx, r):
    """Ordinal numerals before a token share its number and case (toisessa talossa)."""
    for s in ctx.sentences:
        for clause in clauses(ctx, s):
            ...
            r.add(f"sentence:{s.id}", "“toinen talossa”: …", key="toinen>talossa",
                  hint="Use toisessa.", evidence={"readings": [...]})
```

- `ctx` gives the snapshot (`ctx.lexicon`, `ctx.sentences`, `ctx.lexeme(id)`,
  `ctx.by_lemma`, `ctx.snapshot.lessons`, `.cases`, `.copy`), the oracle
  (`ctx.oracle.analyse(word)` → `Reading`s with `lemma`, `pos`, `number`,
  `case`, `px`, `tags`; `ctx.oracle.generate("talo+N+Sg+Ine")`), the Kotus
  list (`ctx.kotus`) and `ctx.rules` (rules.toml).
- `r.add(subject, message, key=…, severity=…, hint=…, evidence=…)` records a
  finding. `subject` is `kind:id` (`sentence:p.5`, `lexeme:talo`,
  `lesson:1.2`, `form:talo:sg.inessive`); the source location is found from it
  automatically. Subject + key must identify the finding stably: waivers and
  "new since last run" depend on it.
- `needs=("oracle",)` or `("kotus",)` skips the check when that resource is missing.
- `options` are defaults that `audit.toml` can override (`r.options["min_length"]`).
- Add a test to `tests/test_audit.py`: one sentence the check must flag and one it must accept.

Check ids must be unique across audits (a test enforces it).

### Add grammar knowledge without code

`rules.toml` holds the tables the sentence checks read: clause boundaries,
quantifiers, postpositions and prepositions, verb government, triggers for
nominative-form objects, case-sentence id prefixes and copy spell-check
exceptions. Each entry can carry its own `severity` and a `note` that is shown
with its findings.

### Tune or silence a check

In `audit.toml`: `[checks.S14] enabled = false`, or `severity = "info"`, or set
one of its options.

### Export more data

Add it to `export-snapshot.ts`, then load it in `framework/snapshot.py` (raw
JSON is also available as `ctx.snapshot.data`).

### Add an audit

Create `<name>-audit.py` with `audit = Audit("<name>", "Title")`, checks, and
`audit.main()`, then add the name to `AUDITS` in `generate-report.py`.

## Files

| Path | Purpose |
|---|---|
| `export-snapshot.ts` | Engine + content → `out/snapshot.json` |
| `vocabulary-audit.py`, `morphology-audit.py`, `sentence-audit.py` | The checks |
| `generate-report.py` | Merged report, comparison with the previous run |
| `framework/` | `Audit` and check registry, `Reporter`, findings, snapshot loading, oracle wrapper, Kotus list, settings, waivers, source locations |
| `audit.toml` | Which checks run, at what severity, with which options; report settings |
| `rules.toml` | Linguistic rule tables |
| `waivers.toml` | Reviewed findings accepted as correct |
| `reviews.toml` | Native-speaker review decisions for the critical forms (M10): the authoritative record |
| `native-review.py`, `explain-forms.ts` | Build docs/NATIVE_REVIEW.md, quoting the app's own word-specific explanations |
| `explanation-audit.ts` | `npm run audit:explanations`: explanation coverage, self-checks, sentence-reason validity and rule-text examples (see below) |
| `verify-all.py` | Runs every verification step and prints the final summary (`npm run verify:all`) |
| `tests/` | Self-tests (`npm run audit:test`) |
| `out/` | Generated: snapshot, findings, reports (git-ignored) |
