"""
Native-speaker review of critical forms (check M10, docs/NATIVE_REVIEW.md).

A critical form is one the app shows or accepts that the independent oracle
does not confirm, so its correctness rests on a judgement made against a second
source. Forms are reviewed in groups that share that judgement. A reviewer
answers up to four separate questions per group (the dimensions below) and
records the answers in tools/audit/reviews.toml, the only record of human
review. Nothing in the tooling ever writes to that file.
"""
from __future__ import annotations

import fnmatch
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .config import load_toml
from .paths import REVIEWS_FILE

DIMENSIONS: dict[str, tuple[str, str]] = {
    "morphology": ("Morphology", "Is each form a correct Finnish form of the word in this slot: stem, consonant gradation, "
                                 "ending, possessive suffix, vowel harmony, spelling?"),
    "usage": ("Natural usage", "Would a native speaker write or say it today? Is the app's label right: standard (taught "
                               "as the main form), variant (accepted alternative) or rare (accepted, never taught)?"),
    "semantics": ("Lexical/semantic", "Is the form linked to the right word and meaning, given the homographs, "
                                      "lexicalised forms or mass-noun plurals involved?"),
    "pedagogy": ("Explanation", "Is the explanation the app shows for these forms (quoted below) correct, and clear for a learner?"),
}
VALUES = ("correct", "incorrect", "unsure")
ROLES = ("native-speaker", "linguist", "author")
STATUSES = ("VERIFIED", "NEEDS CORRECTION", "PENDING")

# Group-specific questions for the known GiellaLT possessive defects (morphology-audit.py DEFECTS).
DEFECT_QUESTIONS = {
    "pl-allative-vn": {
        "title": "Plural allative + 3rd-person -Vn (lapsilleen)",
        "morphology": "Are the -lleen forms correct (lapsilleen, taloilleen, ystävilleen)? GiellaLT rejects them and generates -llean (lapsillean).",
        "usage": "The app teaches -lleen as the main 3rd-person form and -llensa as the variant. Is that the right order in modern Finnish?",
    },
    "suffix-harmony": {
        "title": "Vowel harmony of the 3rd-person suffix (hetkeensä, katujensa)",
        "morphology": "Does the suffix follow the word's vowels: hetkeensä, järviinsä, kiviensä (front) and katujensa, katuihinsa (back)? "
                      "GiellaLT has the opposite harmony (hetkeensa, katujensä).",
        "usage": "Are these the forms you would write?",
    },
    "partitive-ea-vn": {
        "title": "3rd-person -Vn after the partitive -eA (liemeään)",
        "morphology": "Are liemeään, lumeaan and toimeaan correct (-Vn after a short vowel, like lääkäriään)? GiellaLT only has -nsA (liemeänsä).",
        "usage": "The app teaches the -Vn form first. Is that natural, or should -nsA come first for these words?",
    },
}

OHJEPANKKI_URL = "https://kielitoimistonohjepankki.fi/ohje/omistusliitteet-muoto-eri-persoonissa-yoni-yosi-jne/"


@dataclass
class Review:
    group: str  # group id from the report (wildcards allowed)
    reviewer: str
    role: str
    date: str
    verdicts: dict[str, str]  # dimension → correct | incorrect | unsure
    incorrect_forms: list[str] = field(default_factory=list)
    note: str = ""

    def flags(self, dimensions: list[str]) -> bool:
        return bool(self.incorrect_forms) or any(self.verdicts.get(d) == "incorrect" for d in dimensions)

    def confirms(self, dimensions: list[str]) -> bool:
        return self.role == "native-speaker" and not self.flags(dimensions) and all(self.verdicts.get(d) == "correct" for d in dimensions)


def reviews_path() -> Path:
    return REVIEWS_FILE


def load_reviews(path: Path | None = None) -> list[Review]:
    """reviews.toml entries. Raises ValueError on anything malformed, so a typo never counts as a review."""
    path = path or reviews_path()
    out = []
    for i, x in enumerate(load_toml(path).get("review", [])):
        where = f"{path.name}: review #{i + 1}"
        missing = [k for k in ("group", "reviewer", "role", "date") if not str(x.get(k, "")).strip()]
        if missing:
            raise ValueError(f"{where} lacks {', '.join(missing)}")
        if x["role"] not in ROLES:
            raise ValueError(f"{where}: role must be one of {', '.join(ROLES)}")
        unknown = set(x) - {"group", "reviewer", "role", "date", "incorrect_forms", "note", *DIMENSIONS}
        if unknown:
            raise ValueError(f"{where}: unknown field(s) {', '.join(sorted(unknown))} (dimensions are {', '.join(DIMENSIONS)})")
        verdicts = {d: x[d] for d in DIMENSIONS if d in x}
        bad = {d: v for d, v in verdicts.items() if v not in VALUES}
        if bad:
            raise ValueError(f"{where}: {', '.join(bad)} must be one of {', '.join(VALUES)}")
        if not verdicts and not x.get("incorrect_forms"):
            raise ValueError(f"{where}: give a verdict for at least one dimension ({', '.join(DIMENSIONS)})")
        out.append(Review(x["group"], x["reviewer"], x["role"], str(x["date"]), verdicts, list(x.get("incorrect_forms", [])), x.get("note", "")))
    return out


def status(group_id: str, dimensions: list[str], reviews: list[Review]) -> dict[str, Any]:
    """VERIFIED: a native speaker answered every dimension 'correct' and flagged no form.
    NEEDS CORRECTION: any reviewer answered 'incorrect' or listed an incorrect form.
    PENDING: anything else, including partial reviews and reviews by non-native reviewers."""
    matching = [r for r in reviews if fnmatch.fnmatchcase(group_id, r.group)]
    if any(r.flags(dimensions) for r in matching):
        value = "NEEDS CORRECTION"
    elif any(r.confirms(dimensions) for r in matching):
        value = "VERIFIED"
    else:
        value = "PENDING"
    done = {d: next((r.verdicts[d] for r in matching if r.role == "native-speaker" and d in r.verdicts), None) for d in dimensions}
    return {
        "status": value,
        "dimensions": done,
        "incorrectForms": sorted({f for r in matching for f in r.incorrect_forms}),
        "reviews": [
            {"reviewer": r.reviewer, "role": r.role, "date": r.date, "verdicts": r.verdicts, "incorrectForms": r.incorrect_forms, "note": r.note}
            for r in matching
        ],
    }


# ---------------------------------------------------------------------------
# Describing a group for the reviewer


def describe_group(ctx, gid: str, reason: str, forms: list[dict]) -> dict[str, Any]:
    """Title, second source, dimensions to review (with the group's own questions) and priority."""
    kind, _, rest = gid.partition(":")
    lemmas = sorted({f["lemma"] for f in forms})
    lexemes = [lex for lid in sorted({f["lexemeId"] for f in forms}) if (lex := ctx.lexeme(lid))]
    first = forms[0]

    if kind == "oracle-defect":
        info = DEFECT_QUESTIONS.get(rest, {})
        title = info.get("title", rest)
        source = {"name": "Kielitoimiston ohjepankki: Omistusliitteet, muoto eri persoonissa", "url": OHJEPANKKI_URL}
        questions = {"morphology": info.get("morphology", DIMENSIONS["morphology"][1]), "usage": info.get("usage", DIMENSIONS["usage"][1])}
    elif kind == "literal":
        title = f"Lexicalised form {rest} ({first['lemma']})"
        source = {"name": "None recorded: typed in the sentence by the authors", "url": None}
        questions = {
            "morphology": f"Is “{rest}” spelled and formed correctly?",
            "usage": f"Is “{rest}” the natural word in each sentence listed?",
            "semantics": f"The app links “{rest}” to {first['lemma']} ({first['slot']}), although it is a lexicalised adverb. Is it right "
                         f"to teach it with {first['lemma']}, and does it mean what the English translation says?",
        }
    else:
        head = rest.split(":")
        what = f"the whole {'plural' if head[-1] == 'pl' else 'singular'}" if len(head) == 2 else f"{head[1]} “{head[2]}”"
        title = f"{lemmas[0]}: {what}"
        source = {"name": "Wiktionary declension table (Kotus types)" if "Wiktionary" in reason else "Kotus", "url":
                  f"https://en.wiktionary.org/wiki/{lemmas[0]}" if "Wiktionary" in reason else None}
        registers = sorted({f["register"] for f in forms if f.get("register")})
        questions = {
            "morphology": f"Are these forms of {', '.join(lemmas)} correct for their slots? The independent analyser does not recognise them.",
            "usage": f"The app labels them {' / '.join(registers) or 'as shown'}. Is that right (standard = taught, variant = accepted "
                     f"alternative, rare = accepted, not taught)?",
        }

    dimensions = ["morphology", "usage", "pedagogy"]
    semantic_why = semantic_reasons(ctx, kind, forms, lexemes)
    if semantic_why:
        dimensions.insert(2, "semantics")
        questions.setdefault("semantics", " ".join(semantic_why))
    questions["pedagogy"] = DIMENSIONS["pedagogy"][1]
    level, score, why = priority(ctx, kind, forms, lexemes)
    return {"kind": kind, "title": title, "source": source, "dimensions": dimensions, "questions": questions,
            "semanticWhy": semantic_why, "priority": level, "priorityScore": score, "priorityWhy": why}


def semantic_reasons(ctx, kind: str, forms: list[dict], lexemes) -> list[str]:
    if kind == "literal":
        return ["The form is not produced by the engine and is linked to a lexeme by hand."]
    out = []
    owners: dict[str, set[str]] = {}
    for lex in ctx.lexicon:
        for _, v in lex.variants():
            owners.setdefault(v.text, set()).add(lex.id)
    shared = sorted({(f["form"], other) for f in forms for other in owners.get(f["form"], set()) if other != f["lexemeId"]})
    if shared:
        out.append("Some forms are also forms of another word: " + ", ".join(f"{form} ({other})" for form, other in shared[:6]) +
                   ". Is the intended word clear wherever the app shows them?")
    mass = [lex.id for lex in lexemes if lex.number_use in ("mass", "pl-rare")]
    if mass and len(mass) == len(lexemes) and any(f["slot"].startswith("pl.") for f in forms):
        out.append(f"{', '.join(mass)} is marked {lexemes[0].number_use}: what does its plural mean, and should learners see it?")
    return out


def exposure(ctx) -> tuple[set, set, set, set]:
    """Where learners meet forms: sentence tokens, lesson blocks (by slot), paradigm tables, possessive tables."""
    in_sentences = {(t.head_id, t.slot, t.person, t.text.lower()) for s in ctx.sentences for t in s.tokens if len(t.lexeme_ids) == 1}
    in_lessons, paradigms, possessive_tables = set(), set(), set()
    for lesson in ctx.snapshot.lessons:
        for w in lesson["words"]:
            if ".paradigm" in w["where"]:
                paradigms.add(w["lexemeId"])
            elif ".possessives" in w["where"]:
                possessive_tables.add((w["lexemeId"], w.get("slot")))
            elif w.get("slot"):
                in_lessons.add((w["lexemeId"], w["slot"], w.get("person")))
    return in_sentences, in_lessons, paradigms, possessive_tables


def priority(ctx, kind: str, forms: list[dict], lexemes) -> tuple[str, int, list[str]]:
    """High / Medium / Low from how much learners depend on the forms and how contested they are:
    taught as the main form (+2) or as a variant (+1); core (+2) or common (+1) word;
    shown in a lesson or sentence (+2); the oracle proposes a different form for the same
    slot (+1); a large group, 50+ forms (+1). High ≥ 5, Medium 3–4, Low ≤ 2."""
    in_sentences, in_lessons, paradigms, px_tables = exposure(ctx)
    score, why = 0, []
    registers = {f.get("register") for f in forms}
    if kind == "literal" or "standard" in registers:
        score += 2
        why.append("taught as the main form")
    elif "variant" in registers:
        score += 1
        why.append("accepted as a variant")
    else:
        why.append("only accepted (marked rare)")
    freq = {lex.frequency for lex in lexemes}
    if "core" in freq:
        score += 2
        why.append("core word")
    elif "common" in freq:
        score += 1
        why.append("common word")
    shown = [
        f for f in forms
        if kind == "literal"
        or (f["lexemeId"], f["slot"], f.get("person"), f["form"].lower()) in in_sentences
        or (f["lexemeId"], f["slot"], f.get("person")) in in_lessons
        or (not f.get("person") and f["lexemeId"] in paradigms)
        or (f.get("person") and (f["lexemeId"], f["slot"]) in px_tables)
    ]
    if shown:
        score += 2
        why.append(f"shown in lessons or example sentences ({len(shown)} form{'s' if len(shown) != 1 else ''})")
    contested = [f for f in forms if f.get("oracleGenerates") and f["form"] not in f["oracleGenerates"]]
    if contested:
        score += 1
        example = contested[0]
        rival = max(example["oracleGenerates"], key=lambda g: (len(os.path.commonprefix([g, example["form"]])), -abs(len(g) - len(example["form"]))))
        why.append(f"the oracle proposes a different form ({rival} for {example['form']})")
    if len(forms) >= 50:
        score += 1
        why.append(f"large group ({len(forms)} forms)")
    level = "High" if score >= 5 else "Medium" if score >= 3 else "Low"
    return level, score, why
