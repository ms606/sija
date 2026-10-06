"""
Independent cross-check of the Sija grammar engine against the GiellaLT
Finnish morphology (GPL-3+, used locally as a dev tool only, never shipped).

Two checks per (lexeme, slot):
  1. analysis  - every engine form must be analysed by the normative analyser
                 as exactly that lemma + number + case;
  2. coverage  - every standard form the normative generator produces should be
                 among the engine's variants.

Disagreements are settled against a second source (Wiktionary / Kotus) and
recorded in adjudicated.json. Oracle forms that GiellaLT itself tags as
non-standard (Use/NG, Use/Rare, Use/Arch …) are listed, not counted as missing.

Usage: npm run verify:morph   (exports paradigms first)
Writes tools/morph-oracle/.cache/report.json and prints a summary.
"""
import json
import os
import re
import sys

from uralicNLP import uralicApi

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, "models", "fin")
GEN = os.path.join(MODELS, "generator-gt-norm.hfstol")
ANA = os.path.join(MODELS, "analyser-gt-norm.hfstol")
CACHE = os.path.join(HERE, ".cache")
ADJ = json.load(open(os.path.join(HERE, "adjudicated.json"), encoding="utf-8"))

CASE_TAG = {
    "nominative": "Nom", "genitive": "Gen", "partitive": "Par", "inessive": "Ine",
    "elative": "Ela", "illative": "Ill", "adessive": "Ade", "ablative": "Abl",
    "allative": "All", "essive": "Ess", "translative": "Tra", "abessive": "Abe",
    "comitative": "Com", "instructive": "Ins",
}
POS_TAGS = {"noun": ["N"], "adjective": ["A", "N"], "numeral": ["Num", "A"]}
KEEP = {"N", "A", "Num", "Sg", "Pl", *CASE_TAG.values(), "Cmt", "PxSg3", "PxPl3"}
ARCHAIC = [re.compile(r"[aä]in$"), re.compile(r"h[ie]sin$")]


def gen(query):
    try:
        return sorted({x[0] for x in uralicApi.generate(query, "fin", filename=GEN)})
    except Exception:
        return []


_ana = {}


def analyses(word):
    if word not in _ana:
        out = []
        for w in {word, word.replace("’", "'"), word.replace("’", "")}:
            try:
                out += [a[0] for a in uralicApi.analyze(w, "fin", filename=ANA)]
            except Exception:
                pass
        _ana[word] = out
    return _ana[word]


def normalize(analysis):
    """'lapsi+N+Use/NG+Pl+Gen' -> ('lapsi', ('N','Pl','Gen')). Compounds: lemma = joined parts."""
    segs = analysis.split("#")
    lemma = "".join(s.split("+")[0] for s in segs)
    tags = tuple(t for t in segs[-1].split("+")[1:] if t in KEEP)
    return lemma, tags


def usage_tags(word, lemma=None, pos=None, slot=None):
    """GiellaLT usage marks (Use/NG, Use/Rare…) on the word's readings. Given lemma, pos and
    slot, only readings of that word in that slot count (susta is a standard partitive of
    suksi, although its reading as the pronoun sä is marked Use/NG)."""
    readings = analyses(word)
    if lemma:
        wanted = [slot_tags(pos, pos_tag, slot) for pos_tag in POS_TAGS[pos]]
        ours = [a for a in readings if (lambda n: n[0] == lemma and any(all(t in n[1] for t in w) for w in wanted))(normalize(a))]
        readings = ours or readings
        if ours and not all(any(t.startswith("Use/") for t in a.replace("#", "+").split("+")) for a in ours):
            return set()
    return {t for a in readings for t in a.replace("#", "+").split("+") if t.startswith("Use/")}


def slot_tags(pos, pos_tag, slot):
    number, case = slot.split(".")
    c = CASE_TAG[case]
    if c == "Com":
        # Adjectives/numerals agree in the comitative without a possessive suffix; GiellaLT tags them Cmt.
        if pos == "noun":
            return (pos_tag, "Com", "PxSg3")
        return (pos_tag, "Com") if pos == "numeral" else (pos_tag, "Cmt")
    return (pos_tag, "Sg" if number == "sg" else "Pl", c)


def query(pos, lemma, pos_tag, slot):
    number, case = slot.split(".")
    c = CASE_TAG[case]
    if c == "Com":
        return f"{lemma}+{pos_tag}+Com+PxSg3" if pos == "noun" else f"{lemma}+{pos_tag}+Com"
    return f"{lemma}+{pos_tag}+{'Sg' if number == 'sg' else 'Pl'}+{c}"


def recognized(form, lemma, pos, slot):
    for pos_tag in POS_TAGS[pos]:
        want = slot_tags(pos, pos_tag, slot)
        for a in analyses(form):
            lem, tags = normalize(a)
            if lem == lemma and all(t in tags for t in want):
                return True
    return False


def main():
    data = json.load(open(os.path.join(CACHE, "paradigms.json"), encoding="utf-8"))
    report = {"unrecognized": [], "missing": [], "adjudicated": [], "nonstandardSkipped": [], "noGeneration": []}
    checked = 0
    for entry in data["entries"]:
        lid, lemma, pos = entry["id"], entry["lemma"], entry["pos"]
        for slot, info in entry["slots"].items():
            key = f"{lid}:{slot}"
            forms = info["forms"]
            for form in forms:
                checked += 1
                if recognized(form, lemma, pos, slot):
                    continue
                reason = ADJ["engineForms"].get(f"{key}:{form}") or ADJ["engineSlots"].get(f"{lid}:{slot.split('.')[0]}")
                item = {"key": key, "form": form, "analyses": analyses(form)[:4]}
                if reason:
                    report["adjudicated"].append({**item, "reason": reason})
                else:
                    report["unrecognized"].append(item)
            generated = []
            for pos_tag in POS_TAGS[pos]:
                generated = gen(query(pos, lemma, pos_tag, slot))
                if generated:
                    break
            if not generated:
                report["noGeneration"].append(key)
                continue
            for g in generated:
                if g in forms or g.replace("'", "’") in forms:
                    continue
                reason = ADJ["ignoreMissingForms"].get(f"{key}:{g}") or ADJ["ignoreMissing"].get(lid)
                if reason:
                    report["adjudicated"].append({"key": key, "form": g, "reason": reason})
                elif any(p.search(g) for p in ARCHAIC) or usage_tags(g, lemma, pos, slot):
                    report["nonstandardSkipped"].append({"key": key, "form": g, "tags": sorted(usage_tags(g, lemma, pos, slot))})
                else:
                    report["missing"].append({"key": key, "form": g, "engine": forms})
    report["stats"] = {
        "lexemes": len(data["entries"]),
        "formsChecked": checked,
        "unrecognized": len(report["unrecognized"]),
        "missing": len(report["missing"]),
        "adjudicated": len(report["adjudicated"]),
        "nonstandardSkipped": len(report["nonstandardSkipped"]),
        "slotsCheckedByAnalysisOnly": len(report["noGeneration"]),
    }
    json.dump(report, open(os.path.join(CACHE, "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    s = report["stats"]
    print(f"Lexemes: {s['lexemes']}  engine forms checked: {s['formsChecked']}")
    print(f"✗ Engine forms the analyser does not recognise: {s['unrecognized']}")
    for u in report["unrecognized"]:
        print(f"    {u['key']}  {u['form']}  analyses={u['analyses']}")
    print(f"+ Standard oracle forms missing from the engine: {s['missing']}")
    for m in report["missing"]:
        print(f"    {m['key']}  {m['form']}  (engine: {'/'.join(m['engine'])})")
    print(f"= Adjudicated (documented in adjudicated.json): {s['adjudicated']}")
    print(f"~ Oracle forms tagged non-standard by GiellaLT (listed in report): {s['nonstandardSkipped']}")
    print(f"  Slots checked by analysis only (generator gave nothing): {s['slotsCheckedByAnalysisOnly']}")
    sys.exit(1 if (s["unrecognized"] or s["missing"]) else 0)


if __name__ == "__main__":
    main()
