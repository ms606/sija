"""
Vocabulary audit: the lexicon entries themselves.

Dictionary data (Kotus type and gradation), recognition by the GiellaLT
analyser, homonyms, compounds, vowel harmony, the learner-facing content
fields, and whether each word is actually used and introduced in order.

    tools/morph-oracle/.venv/bin/python tools/audit/vocabulary-audit.py [--list] [--only V01,V02]
"""
import re
from collections import Counter, defaultdict

from framework import Audit
from framework.finnish import spelled_harmony

audit = Audit("vocabulary", "Vocabulary audit", "Lexicon entries: dictionary data, analyser recognition, content fields and usage.")

# Analyser part-of-speech tags that fit each lexicon part of speech.
POS_TAGS = {"noun": {"N"}, "adjective": {"A", "N"}, "numeral": {"Num", "A"}}
KOTUS_INFO = re.compile(r"(\d+)(?:\*([A-M]))?")
# Semantic tags of things a picture can show. Abstract nouns, adjectives and
# numerals have no picture by design (components/media/NounImage.tsx).
CONCRETE = {"person", "animal", "place", "building", "vehicle", "food", "drink", "object", "furniture", "body",
            "nature", "plant", "clothing", "container", "document", "substance", "weather"}


@audit.check("V01", "kotus-entry", "Declension type and gradation match Kotus 2024", severity="error", needs=("kotus",))
def kotus_entry(ctx, r):
    """Each non-compound word must be in the Kotus word list with the inflection
    info the lexicon copies (e.g. `9*A`); its type must be that number and its
    gradation pattern must have that letter, in the type's direction.
    (Compounds are checked against their head in V04.)"""
    patterns = ctx.snapshot.gradation_patterns
    for lex in ctx.lexicon:
        if lex.compound:
            continue
        subject = f"lexeme:{lex.id}"
        rows = ctx.kotus.get(lex.lemma)
        if not rows:
            r.add(subject, f"“{lex.lemma}” is not in the Kotus 2024 word list.", key="not-listed",
                  hint="Check the spelling, or mark the word as a compound of a listed head.")
            continue
        listed = [i.strip() for row in rows for i in row.info.split(",")]
        if lex.kotus not in listed:
            r.add(subject, f"kotus “{lex.kotus}” is not among the listed infos {listed}.", key="info",
                  evidence={"kotus": lex.kotus, "listed": listed})
        m = KOTUS_INFO.fullmatch(lex.kotus)
        if not m:
            r.add(subject, f"Malformed kotus info “{lex.kotus}”.", key="malformed")
            continue
        number, letter = m.groups()
        if lex.type_id != f"k{number}":
            r.add(subject, f"typeId {lex.type_id} but Kotus type {number}.", key="type")
        if letter:
            if not lex.gradation:
                r.add(subject, f"Kotus letter {letter} but no gradation pattern declared.", key="gradation")
                continue
            pattern = lex.gradation["pattern"]
            if patterns[pattern]["kotusLetter"] != letter:
                r.add(subject, f"Pattern {pattern} is letter {patterns[pattern]['kotusLetter']}; Kotus says {letter}.", key="gradation")
            inverse = bool(lex.gradation.get("inverse"))
            if inverse != (ctx.snapshot.types[lex.type_id]["gradation"] == "inverse"):
                r.add(subject, f"Gradation direction ({'inverse' if inverse else 'normal'}) does not match type {lex.type_id}.", key="direction")
        elif lex.gradation:
            r.add(subject, f"Declares {lex.gradation['pattern']} but Kotus has no gradation letter.", key="gradation")


@audit.check("V02", "lemma-recognised", "The analyser knows the lemma as this part of speech", severity="error", needs=("oracle",))
def lemma_recognised(ctx, r):
    """GiellaLT must analyse the lemma as its own singular nominative. If it only
    knows the word as another part of speech (an adjective listed as a noun,
    say), the entry is flagged as a warning."""
    for lex in ctx.lexicon:
        subject = f"lexeme:{lex.id}"
        readings = ctx.oracle.analyse(lex.lemma)
        base = [x for x in readings if x.lemma == lex.lemma and x.case == "Nom" and x.number in ("Sg", None) and not x.px]
        if not readings:
            r.add(subject, f"The analyser does not recognise “{lex.lemma}”.", key="unknown", hint="Check the spelling.")
        elif not base:
            r.add(subject, f"“{lex.lemma}” is analysed, but never as its own base form.", key="not-base",
                  evidence={"analyses": [x.raw for x in readings[:6]]})
        elif not any(x.pos in POS_TAGS[lex.pos] for x in base):
            r.add(subject, f"Listed as a {lex.pos}, but the analyser only knows “{lex.lemma}” as {sorted({x.pos for x in base})}.",
                  key="pos", severity="warning", evidence={"analyses": [x.raw for x in base[:6]]})


@audit.check("V03", "homonyms", "Words spelled alike point to each other", severity="error")
def homonyms(ctx, r):
    """Lexemes with the same lemma must list each other in `homonyms`, so the app
    can tell kuusi 'spruce' from kuusi 'six'. Listed ids must exist and have the
    same spelling."""
    for lemma, group in ctx.by_lemma.items():
        ids = {lex.id for lex in group}
        for lex in group:
            subject = f"lexeme:{lex.id}"
            for other in sorted(ids - {lex.id} - set(lex.homonyms)):
                r.add(subject, f"Spelled like “{other}” but does not list it in homonyms.", key=other,
                      hint=f"Add homonyms: ['{other}'].")
    for lex in ctx.lexicon:
        for h in lex.homonyms:
            other = ctx.lexeme(h)
            if not other:
                r.add(f"lexeme:{lex.id}", f"homonyms lists unknown lexeme “{h}”.", key=h)
            elif other.lemma != lex.lemma:
                r.add(f"lexeme:{lex.id}", f"homonym “{h}” is spelled “{other.lemma}”, not “{lex.lemma}”.", key=h, severity="warning")


@audit.check("V04", "compound-structure", "Compounds are modifier + head and inflect like the head", severity="error")
def compound_structure(ctx, r):
    """A compound's lemma must be its modifier followed by the head's lemma, and
    it must have the head's declension type, gradation and vowel harmony."""
    for lex in ctx.lexicon:
        if not lex.compound:
            continue
        subject = f"lexeme:{lex.id}"
        head = ctx.lexeme(lex.compound["headId"])
        if not head:
            r.add(subject, f"Unknown compound head “{lex.compound['headId']}”.", key="head")
            continue
        if lex.lemma != lex.compound["modifier"] + head.lemma:
            r.add(subject, f"“{lex.compound['modifier']}” + “{head.lemma}” ≠ “{lex.lemma}”.", key="spelling")
        if lex.type_id != head.type_id:
            r.add(subject, f"Type {lex.type_id}, but its head {head.id} is {head.type_id}.", key="type")
        if (lex.gradation or {}).get("pattern") != (head.gradation or {}).get("pattern"):
            r.add(subject, f"Gradation differs from its head {head.id}.", key="gradation",
                  evidence={"compound": lex.gradation, "head": head.gradation})
        if lex.harmony != head.harmony:
            r.add(subject, f"Vowel harmony {lex.harmony}, but its head {head.id} is {head.harmony}.", key="harmony")


@audit.check("V05", "vowel-harmony", "Vowel harmony matches the spelling", severity="warning")
def vowel_harmony(ctx, r):
    """The engine's harmony decision should be what the deciding part's vowels
    predict (any a/o/u → back endings). Declared exceptions are listed as info
    so a reviewer can confirm them."""
    for lex in ctx.lexicon:
        expected = spelled_harmony(lex.harmony_part)
        if lex.harmony == expected:
            continue
        subject = f"lexeme:{lex.id}"
        if lex.declared_harmony:
            r.add(subject, f"Declared {lex.harmony} harmony; the spelling of “{lex.harmony_part}” suggests {expected}.",
                  key="declared", severity="info", hint="Confirm the exception (loanword, compound) against a dictionary.")
        else:
            r.add(subject, f"Engine uses {lex.harmony} harmony; the spelling of “{lex.harmony_part}” suggests {expected}.", key="engine")


@audit.check("V06", "content-fields", "Learner-facing fields are complete", severity="warning")
def content_fields(ctx, r):
    """English gloss, level 1–8 and frequency are required (errors). Themes,
    semantic tags and a locative type for places are expected (warnings): the
    production exercises and the sentence audit's locative check depend on it.
    Concrete nouns without any picture are info; abstract nouns, adjectives and
    numerals have no picture by design."""
    for lex in ctx.lexicon:
        subject = f"lexeme:{lex.id}"
        if not lex.gloss.get("en", "").strip():
            r.add(subject, "No English gloss.", key="gloss", severity="error")
        if not 1 <= lex.level <= 8:
            r.add(subject, f"Level {lex.level} is outside 1–8.", key="level", severity="error")
        if lex.frequency not in ("core", "common", "extra"):
            r.add(subject, f"Unknown frequency “{lex.frequency}”.", key="frequency", severity="error")
        if not lex.themes:
            r.add(subject, "No themes.", key="themes")
        if not lex.semantics:
            r.add(subject, "No semantic tags.", key="semantics")
        if {"place", "building"} & set(lex.semantics) and not lex.locative:
            r.add(subject, "A place without `locative` (inner: kaupassa / outer: torilla).", key="locative",
                  hint="Set loc: 'inner' | 'outer' | 'both'.")
        concrete = lex.pos == "noun" and CONCRETE & set(lex.semantics)
        if concrete and not (lex.image.get("emoji") or lex.image.get("illustration") or lex.image.get("photo")):
            r.add(subject, f"Concrete noun ({', '.join(sorted(CONCRETE & set(lex.semantics)))}) without a picture.", key="image",
                  severity="info", hint="Add an emoji or illustration that depicts it faithfully, or waive: no picture beats a misleading one.")


@audit.check("V07", "usage-coverage", "Words are used in sentences and lessons", severity="warning", options={"min_sentences_core": 3})
def usage_coverage(ctx, r):
    """A word nobody meets is dead weight, and a core word needs enough examples.
    Core/common words in no example sentence are warnings; extra words are
    info; core words with fewer than `min_sentences_core` sentences are info."""
    used = Counter()
    for s in ctx.sentences:
        for lid in {lid for t in s.tokens for lid in t.lexeme_ids}:
            used[lid] += 1
    in_lessons = {w["lexemeId"] for lesson in ctx.snapshot.lessons for w in lesson["words"]}
    minimum = r.options["min_sentences_core"]
    for lex in ctx.lexicon:
        subject = f"lexeme:{lex.id}"
        n = used[lex.id]
        if n == 0:
            sev = "info" if lex.frequency == "extra" else "warning"
            where = "" if lex.id in in_lessons else " or lesson"
            r.add(subject, f"{lex.frequency} word in no example sentence{where}.", key="no-sentence", severity=sev)
        elif lex.frequency == "core" and n < minimum:
            r.add(subject, f"Core word with only {n} example sentence(s) (want {minimum}).", key="few-sentences", severity="info")


@audit.check("V08", "level-order", "Lessons only use words introduced by their level", severity="warning")
def level_order(ctx, r):
    """A word's `level` is where the curriculum introduces it, so a lesson at a
    lower level should not use it. Unknown word ids are errors."""
    for lesson in ctx.snapshot.lessons:
        subject = f"lesson:{lesson['id']}"
        for ref in lesson["words"]:
            lex = ctx.lexeme(ref["lexemeId"])
            if not lex:
                r.add(subject, f"Unknown word “{ref['lexemeId']}” in {ref['where']}.", key=ref["lexemeId"], severity="error")
            elif lex.level > lesson["level"]:
                r.add(subject, f"Level-{lesson['level']} lesson uses {lex.id} (introduced at level {lex.level}) in {ref['where']}.",
                      key=lex.id, hint=f"Lower {lex.id}'s level to {lesson['level']} or pick another word.")


@audit.check("V09", "gloss-collisions", "Different words shown with the same English gloss", severity="info")
def gloss_collisions(ctx, r):
    """Exercises and word lists show a word's first English sense (the gloss up
    to the first `;`, `,` or `(`, as in services/exercises/generators.ts). When
    two words show the same one, learners cannot tell them apart from the
    English alone; a more specific gloss helps (shop → 'shop, store' / 'shop (small)')."""
    shown: dict[str, set[str]] = defaultdict(set)
    for lex in ctx.lexicon:
        first = re.split(r"[;,(]", lex.gloss.get("en", ""))[0].strip().lower()
        if first:
            shown[first].add(lex.id)
    for gloss, ids in sorted(shown.items()):
        if len(ids) > 1:
            r.add(f"gloss:{gloss}", f"“{gloss}” is shown for {', '.join(sorted(ids))}.", key=gloss, evidence={"lexemes": sorted(ids)})


@audit.check("V10", "provenance", "Lexicon provenance and review status", severity="info")
def provenance(ctx, r):
    """Learner-facing words must be curated; imported entries belong in staging
    until they pass QA (errors). The native-review backlog is one info line."""
    pending = [lex for lex in ctx.lexicon if not lex.provenance.get("nativeReview")]
    for lex in ctx.lexicon:
        if lex.provenance.get("source") != "curated":
            r.add(f"lexeme:{lex.id}", f"Source is “{lex.provenance.get('source')}”, not curated.", key="source", severity="error",
                  hint="Imported content goes through the staging/QA pipeline before it reaches learners.")
    if pending:
        r.add("lexicon", f"{len(pending)} of {len(ctx.lexicon)} words await native-speaker review.", key="native-review")


if __name__ == "__main__":
    audit.main()
