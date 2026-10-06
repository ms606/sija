"""
Writes docs/NATIVE_REVIEW.md, the native-speaker review packet, from the
grammar audit's M10 findings: every review group, every affected form, what
GiellaLT and the second source say, what to check along each review dimension,
the explanations the app shows, priority, current status and a ready-made
reviews.toml entry per group.

    tools/morph-oracle/.venv/bin/python tools/audit/native-review.py

`npm run audit:grammar` runs it at the end (generate-report.py). It only reads
the audit output and tools/audit/reviews.toml; it never records a review.
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from framework.paths import FINDINGS_DIR, OUT_DIR, ROOT
from framework.review import DIMENSIONS

PACKET = ROOT / "docs" / "NATIVE_REVIEW.md"
STATUS_ICON = {"VERIFIED": "✅ VERIFIED", "NEEDS CORRECTION": "❌ NEEDS CORRECTION", "PENDING": "⏳ PENDING"}
# Derivation steps quoted for the explanation review: the ones that carry the group's judgement.
FRAME_KINDS = {"lemma", "type", "result"}


def load_groups() -> list[dict]:
    path = FINDINGS_DIR / "morphology.json"
    if not path.exists():
        sys.exit("No morphology findings. Run `npm run audit:grammar` first.")
    data = json.loads(path.read_text(encoding="utf-8"))
    run = next((c for c in data["checks"] if c["id"] == "M10"), None)
    if not run or run["status"] != "ran":
        sys.exit(f"Check M10 did not run ({run['reason'] if run else 'missing'}); cannot build the review packet.")
    groups = [{"id": f["key"], **f["evidence"]} for f in data["findings"] if f["check"] == "M10" and f["key"] != "unexplained"]
    order = {"High": 0, "Medium": 1, "Low": 2}
    return sorted(groups, key=lambda g: (order[g["priority"]], -g["priorityScore"], -g["count"], g["id"]))


def explanations(groups: list[dict]) -> dict[tuple, list[dict]]:
    """The app's own explanation steps for every form (via explain-forms.ts)."""
    requests = []
    for g in groups:
        for f in g["forms"]:
            if g["kind"] == "literal":
                requests.append({"lexemeId": f["lexemeId"], "text": f["form"], "literal": True})
            else:
                requests.append({"lexemeId": f["lexemeId"], "slot": f["slot"], "person": f.get("person"), "text": f["form"]})
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = Path(tmp) / "in.json", Path(tmp) / "out.json"
        src.write_text(json.dumps(requests), encoding="utf-8")
        try:
            subprocess.run(["npx", "tsx", str(ROOT / "tools/audit/explain-forms.ts"), str(src), str(dst)], cwd=ROOT, check=True,
                           capture_output=True, text=True)
        except (OSError, subprocess.CalledProcessError) as e:
            print(f"! Could not render explanations ({e}); the packet lists the forms without them.", file=sys.stderr)
            return {}
        out = json.loads(dst.read_text(encoding="utf-8"))
    return {(r["lexemeId"], r.get("slot"), r.get("person"), r["text"]): r["steps"] for r in out}


def slot_label(f: dict) -> str:
    return f["slot"] + (f" + {f['person']}" if f.get("person") else "")


def cell(text) -> str:
    return str(text if text not in (None, "", []) else "—").replace("|", "\\|").replace("\n", " ")


def toml_entry(g: dict) -> str:
    lines = ["[[review]]", f'group = "{g["id"]}"', 'reviewer = ""             # your name', 'role = "native-speaker"',
             'date = ""                 # e.g. "2026-10-12"']
    lines += [f'{d + " = " + chr(34) + "unsure" + chr(34):<26}# correct | incorrect | unsure' for d in g["dimensions"]]
    lines += ['incorrect_forms = []      # e.g. ["' + g["forms"][0]["form"] + '"]', 'note = ""']
    return "\n".join(lines)


def quoted_steps(g: dict, steps: dict) -> list[tuple[dict, str]]:
    """The explanations a reviewer should judge for this group."""
    def key(f):
        return (f["lexemeId"], None, None, f["form"]) if g["kind"] == "literal" else (f["lexemeId"], f["slot"], f.get("person"), f["form"])

    if g["kind"] == "oracle-defect":  # the possessive suffix is what the judgement is about
        picks = [(st, f["form"]) for f in g["forms"] for st in steps.get(key(f), []) if st["kind"] == "possessive"]
    elif g["kind"] == "adjudicated":  # the full derivation of the adjudicated form, then its possessive suffixes
        base = [f for f in g["forms"] if not f.get("person")][:1]
        px = [f for f in g["forms"] if f.get("person")]
        picks = [(st, f["form"]) for f in base for st in steps.get(key(f), []) if st["kind"] not in FRAME_KINDS]
        picks += [(st, f["form"]) for f in px for st in steps.get(key(f), []) if st["kind"] == "possessive"]
    else:
        picks = [(st, f["form"]) for f in g["forms"] for st in steps.get(key(f), [])]
    seen, out = set(), []
    for st, form in picks:
        if st["ruleId"] not in seen:
            seen.add(st["ruleId"])
            out.append((st, form))
    return out


def build(groups: list[dict], steps: dict) -> str:
    total_forms = sum(g["count"] for g in groups)
    by_status = {s: [g for g in groups if g["status"] == s] for s in STATUS_ICON}
    reviewed = by_status["VERIFIED"] + by_status["NEEDS CORRECTION"]
    out = [
        "# Native-speaker review",
        "",
        "<!-- Generated by `npm run audit:grammar` (tools/audit/native-review.py) from the grammar audit. Do not edit:",
        "     record verdicts in tools/audit/reviews.toml and re-run. -->",
        "",
        "The app's Finnish forms are checked by machine against an independent analyser (GiellaLT). "
        f"{total_forms} learner-facing forms are **not** confirmed by it: the app's authors settled them against a second source "
        "(Wiktionary, Kotus, Kielitoimiston ohjepankki), or they are lexicalised words typed into sentences. "
        "Only a native speaker can confirm them. They are reviewed in "
        f"{len(groups)} groups that share one judgement each.",
        "",
        "`tools/audit/reviews.toml` is the only record of review decisions. This document is regenerated from it.",
        "",
        "## Current status",
        "",
        "| | |",
        "|---|---|",
        f"| Groups reviewed | {len(reviewed)} / {len(groups)} |",
        f"| Forms reviewed | {sum(g['count'] for g in reviewed)} / {total_forms} |",
        f"| Verified (correct) | {len(by_status['VERIFIED'])} groups, {sum(g['count'] for g in by_status['VERIFIED'])} forms |",
        f"| Needs correction | {len(by_status['NEEDS CORRECTION'])} groups, {sum(g['count'] for g in by_status['NEEDS CORRECTION'])} forms |",
        f"| Pending | {len(by_status['PENDING'])} groups, {sum(g['count'] for g in by_status['PENDING'])} forms |",
        "",
        "## How to review",
        "",
        "1. Read the **reviewer checklist** below (5 minutes).",
        "2. Work through the groups in the order of the **overview** table: High priority first. "
        "Each group lists the questions it needs answered, the explanation the app shows and every affected form.",
        "3. For each group, copy its `[[review]]` entry into `tools/audit/reviews.toml` and fill it in: "
        "your name, `role = \"native-speaker\"`, the date, and `correct`, `incorrect` or `unsure` for each dimension. "
        "List every form you find wrong in `incorrect_forms`.",
        "4. Run `npm run audit:grammar`. Each group then shows **VERIFIED**, **NEEDS CORRECTION** or **PENDING** "
        "here and in the audit report.",
        "",
        "A group is VERIFIED only when a native speaker answers `correct` for every dimension it lists and marks no form wrong. "
        "Any `incorrect` answer or listed form makes it NEEDS CORRECTION: the developers then fix the engine or the data, "
        "and the group is reviewed again. `unsure` leaves it PENDING. The app's grammar is never changed just to make a review pass.",
        "",
        "## Reviewer checklist",
        "",
        "For every group:",
        "",
        "- [ ] **Morphology**: each form is a correct Finnish form of the word in the slot shown "
        "(stem, consonant gradation, ending, possessive suffix, vowel harmony, spelling).",
        "- [ ] **Natural usage**: you would write or say it; the label fits. `standard` is taught as the main form, "
        "`variant` is an accepted alternative, `rare` is accepted but never taught.",
        "- [ ] **Lexical/semantic** (only where the group asks): the form belongs to the word and meaning shown.",
        "- [ ] **Explanation**: the quoted explanation is correct and clear for a learner.",
        "- [ ] Wrong forms are listed in `incorrect_forms`, with a note on what is right.",
        "- [ ] When in doubt, answer `unsure` and say why in `note`; never guess.",
        "",
        "Slots read as *number.case*, with *+ person* for a possessive suffix: `pl.allative + 3` is the plural allative "
        "with the 3rd-person suffix (*lapsilleen* 'to his/her/their children').",
        "",
        "## Review dimensions",
        "",
        "These four questions are answered separately, so that a correct form with a poor explanation, or a correct form "
        "that nobody uses, is not mixed up with a wrong form.",
        "",
        "| Dimension | `reviews.toml` key | Question |",
        "|---|---|---|",
    ]
    out += [f"| {title} | `{key}` | {question} |" for key, (title, question) in DIMENSIONS.items()]
    out += ["", "## Overview", "", "| # | Priority | Group | Forms | Morphology | Usage | Semantics | Explanation | Status |",
            "|--:|---|---|--:|:-:|:-:|:-:|:-:|---|"]
    for i, g in enumerate(groups, 1):
        marks = [("✓" if d in g["dimensions"] else "—") for d in DIMENSIONS]
        out.append(f"| {i} | {g['priority']} | [{cell(g['title'])}](#group-{i}) `{g['id']}` | {g['count']} | " + " | ".join(marks)
                   + f" | {STATUS_ICON[g['status']]} |")
    out += ["", "✓ = the group asks this question. Priority weighs how much learners depend on the forms (taught as the main form, "
            "common words, shown in lessons) and whether the analyser proposes a different form; each group says why."]

    for i, g in enumerate(groups, 1):
        out += ["", f'<a id="group-{i}"></a>', "", f"## {i}. {g['title']}", "",
                f"`{g['id']}` · **{g['priority']} priority** · {g['count']} form(s) · {STATUS_ICON[g['status']]}", ""]
        out.append(f"**Why this priority:** {'; '.join(g['priorityWhy'])}.")
        out += ["", "**Why a person must check it:** the independent analyser (GiellaLT) does not confirm these forms. "
                + {"oracle-defect": "The authors judged that GiellaLT is wrong here: ",
                   "adjudicated": "The authors settled the difference against a second source: ",
                   "literal": "The form is typed by hand, not produced by the grammar engine: "}.get(g["kind"], "")
                + cell(g["reason"]).rstrip(".") + "."]
        src = g["source"]
        out += ["", "**Compared with:** GiellaLT (generated forms and its reading of the engine form are in the table); "
                "second source: " + (f"[{src['name']}]({src['url']})" if src.get("url") else src["name"]) + "."]
        if g.get("reviews"):
            out += ["", "**Reviews so far:**"]
            for rv in g["reviews"]:
                verdicts = ", ".join(f"{d}: {v}" for d, v in rv["verdicts"].items())
                wrong = f"; incorrect forms: {', '.join(rv['incorrectForms'])}" if rv["incorrectForms"] else ""
                out.append(f"- {rv['reviewer']} ({rv['role']}, {rv['date']}): {verdicts}{wrong}" + (f". {rv['note']}" if rv["note"] else ""))
        out += ["", "**What to check:**", "", "| Dimension | Question for this group |", "|---|---|"]
        for d in g["dimensions"]:
            out.append(f"| {DIMENSIONS[d][0]} | {cell(g['questions'].get(d, DIMENSIONS[d][1]))} |")
        skipped = [DIMENSIONS[d][0] for d in DIMENSIONS if d not in g["dimensions"]]
        if skipped:
            out.append(f"| {', '.join(skipped)} | Not asked: the word and its meaning are not in question here, only the form. |")

        quoted = quoted_steps(g, steps)
        if quoted:
            out += ["", "**Explanation the app shows** (beginner mode in English; intermediate mode in Finnish):", ""]
            for st, form in quoted[:8]:
                out.append(f"- *{form}*, `{st['ruleId']}`: “{cell(st['en'])}”" + (f" / “{cell(st['fi'])}”" if st["fi"] != st["en"] else ""))

        rows = ["| # | Word | Slot | Engine form | App label | GiellaLT generates | GiellaLT reads the engine form as | Basis |",
                "|--:|---|---|---|---|---|---|---|"]
        for n, f in enumerate(g["forms"], 1):
            rows.append(f"| {n} | {cell(f['lemma'])} | {cell(slot_label(f))} | **{cell(f['form'])}** | {cell(f.get('register'))} | "
                        f"{cell(', '.join(f.get('oracleGenerates', [])))} | {cell(', '.join(f.get('oracleAnalyses', [])) or 'not recognised')} | "
                        f"{cell(f.get('basis'))} |")
        if len(g["forms"]) > 12:
            out += ["", f"<details><summary><b>All {len(g['forms'])} forms</b></summary>", "", *rows, "", "</details>"]
        else:
            out += ["", *rows]
        out += ["", "**Record your review** in `tools/audit/reviews.toml`:", "", "```toml", toml_entry(g), "```"]
    return "\n".join(out) + "\n"


def write_packet() -> Path:
    """Writes docs/NATIVE_REVIEW.md, or, in a dry run with a trial reviews file
    (GRAMMAR_AUDIT_REVIEWS), out/NATIVE_REVIEW.trial.md so the real packet never shows trial verdicts."""
    groups = load_groups()
    target = OUT_DIR / "NATIVE_REVIEW.trial.md" if os.environ.get("GRAMMAR_AUDIT_REVIEWS") else PACKET
    target.write_text(build(groups, explanations(groups)), encoding="utf-8")
    return target


if __name__ == "__main__":
    path = write_packet()
    print(f"Review packet: {path.relative_to(ROOT)}")
