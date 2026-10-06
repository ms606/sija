"""
Morphology audit: every form the engine generates.

Base paradigms and possessive forms are compared with the GiellaLT analyser
and generator in both directions; the pieces the app colours must spell the
form and their endings must follow vowel harmony; paradigms must be well
formed. Disagreements already settled in tools/morph-oracle/adjudicated.json
are reported as waived, with the adjudication as the reason.

    tools/morph-oracle/.venv/bin/python tools/audit/morphology-audit.py [--list] [--only M01,M03]
"""
import json
import re
from collections import defaultdict
from functools import cache

from framework import Audit
from framework.finnish import BACK_VOWELS, CASE_TAG, FRONT_VOWELS, PERSON_PX, split_slot, vowel_harmony
from framework.review import describe_group, load_reviews
from framework.review import status as review_status
from framework.paths import ADJUDICATED

audit = Audit("morphology", "Morphology audit", "Engine forms and possessives against the GiellaLT oracle, morph pieces, harmony, paradigm shape.")

POS_TAGS = {"noun": ["N"], "adjective": ["A", "N"], "numeral": ["Num", "A"]}
# Old forms GiellaLT still generates without a usage tag (suurna, kaksin-type instructives…).
ARCHAIC = [re.compile(r"[aä]in$"), re.compile(r"h[ie]sin$")]
FORM_CHARS = re.compile(r"[a-zåäöšž’-]+")


@cache
def adjudicated() -> dict:
    return json.loads(ADJUDICATED.read_text(encoding="utf-8"))


def wanted_tags(pos: str, pos_tag: str, slot: str, px: str | None = None) -> tuple[str, ...]:
    """Tags an analysis must carry for a form of `slot` (same rules as tools/morph-oracle/check.py)."""
    number, case = split_slot(slot)
    if case == "comitative":
        # Nouns carry a possessive suffix in the comitative; adjectives agree without one (Cmt).
        if pos == "noun":
            return (pos_tag, "Com", px or "PxSg3")
        return (pos_tag, "Com") if pos == "numeral" else (pos_tag, "Cmt")
    return (pos_tag, "Sg" if number == "sg" else "Pl", CASE_TAG[case], *((px,) if px else ()))


def query(pos: str, lemma: str, pos_tag: str, slot: str, px: str | None = None) -> str:
    number, case = split_slot(slot)
    if case == "comitative":
        return f"{lemma}+{pos_tag}+Com+{px or 'PxSg3'}" if pos == "noun" else f"{lemma}+{pos_tag}+Com"
    return f"{lemma}+{pos_tag}+{'Sg' if number == 'sg' else 'Pl'}+{CASE_TAG[case]}" + (f"+{px}" if px else "")


def recognised(oracle, form: str, lex, slot: str, person: str | None = None) -> bool:
    pxs = PERSON_PX[person] if person else (None,)
    for pos_tag in POS_TAGS[lex.pos]:
        for px in pxs:
            want = wanted_tags(lex.pos, pos_tag, slot, px)
            if any(a.lemma == lex.lemma and all(t in a.tags for t in want) for a in oracle.analyse(form)):
                return True
    return False


def generated(oracle, lex, slot: str, px: str | None = None) -> list[str]:
    for pos_tag in POS_TAGS[lex.pos]:
        out = oracle.generate(query(lex.pos, lex.lemma, pos_tag, slot, px))
        if out:
            return out
    return []


def nonstandard(oracle, form: str, lex, slot: str, person: str | None = None) -> bool:
    """GiellaLT marks this form, as this word and slot, non-standard (Use/NG, Use/Rare,
    Use/Arch…), or it is an archaic shape. Usage marks on readings of other words do not
    count: susta is a standard partitive of suksi although sä+Ela is marked Use/NG."""
    if any(p.search(form) for p in ARCHAIC):
        return True
    pxs = PERSON_PX[person] if person else (None,)
    wanted = [wanted_tags(lex.pos, pos_tag, slot, px) for pos_tag in POS_TAGS[lex.pos] for px in pxs]
    ours = [a for a in oracle.analyse(form) if a.lemma == lex.lemma and any(all(t in a.tags for t in w) for w in wanted)]
    return all(a.usage for a in ours) if ours else any(a.usage for a in oracle.analyse(form))


def in_engine(form: str, forms: list[str]) -> bool:
    return form in forms or form.replace("'", "’") in forms


# ---------------------------------------------------------------------------
# Possessive suffix harmony
#
# The suffix agrees with the vowels of the case ending it attaches to, which is
# usually the word's harmony (talossaan, kylässään) but not always: veri has
# the back-vowel partitive verta, so vertaan / vertansa.


def suffix_split(v) -> tuple[list, str]:
    """(pieces before the possessive suffix, the suffix text)."""
    i = next((k for k, p in enumerate(v.pieces) if p[1] == "possessive"), len(v.pieces))
    return v.pieces[:i], "".join(p[0] for p in v.pieces[i:])


def case_form_harmony(lex, pieces) -> str:
    """Harmony of the case ending (ending/exception pieces); the word's own when they have only e/i."""
    return vowel_harmony("".join(p[0] for p in pieces if p[1] in ("ending", "exception"))) or lex.harmony


def suffix_harmony_ok(lex, v) -> bool:
    base, suffix = suffix_split(v)
    own = vowel_harmony(suffix)
    return own is None or own == case_form_harmony(lex, base)


def flip_suffix(text: str) -> str | None:
    if text.endswith("nsa"):
        return text[:-1] + "ä"
    if text.endswith("nsä"):
        return text[:-1] + "a"
    return None


# ---------------------------------------------------------------------------
# Known GiellaLT defects
#
# Possessive forms where the oracle is demonstrably wrong, settled against
# Kielitoimiston ohjepankki, "Omistusliitteet: muoto eri persoonissa"
# (https://kielitoimistonohjepankki.fi/ohje/omistusliitteet-muoto-eri-persoonissa-yoni-yosi-jne/):
#   - after a short vowel the 3rd person may be -Vn: pihalla+an, lääkäriä+än, itselleen, päälleen;
#   - after an a/ä partitive (koiraa) and after -n cases (auton, autoon, autoihin) only -nsA: koiraansa;
#   - the suffix follows vowel harmony: koiraansa, perheeseensä.
# Matching findings are still reported, as waived with the defect as the reason.

OHJEPANKKI = "Kielitoimiston ohjepankki, Omistusliitteet: muoto eri persoonissa"
TRIPLE_VOWEL = re.compile(r"([aeiouyäö])\1\1")


DEFECTS = {
    "pl-allative-vn": f"GiellaLT does not analyse the plural allative + -Vn (lapsilleen) and generates -llean instead; "
                      f"-Vn follows a short vowel ({OHJEPANKKI}: itselleen, päälleen)",
    "partitive-ea-vn": f"GiellaLT lacks -Vn after the partitive -eA (liemeään); -Vn follows a short vowel ({OHJEPANKKI}: lääkäriä+än)",
    "suffix-harmony": f"GiellaLT gives the suffix the wrong vowel harmony (hetkeensa for hetkeensä); "
                      f"it follows the case ending ({OHJEPANKKI}: koiraansa, perheeseensä)",
    "long-vowel-vn": f"GiellaLT adds -Vn to a long vowel (kalaaan); only -nsA is possible there ({OHJEPANKKI}: koiraansa)",
}


def oracle_rejects_correct_form(ctx, lex, slot: str, person: str, v) -> str | None:
    """The known defect (DEFECTS id) that explains why the oracle rejects a correct engine possessive (M03)."""
    if slot == "pl.allative" and person == "3" and v.text.endswith("lleen"):
        return "pl-allative-vn"
    if slot == "sg.partitive" and person == "3" and re.search(r"e[aä][aä]n$", v.text):
        return "partitive-ea-vn"
    flipped = flip_suffix(v.text)
    if flipped and suffix_harmony_ok(lex, v) and recognised(ctx.oracle, flipped, lex, slot, person):
        return "suffix-harmony"
    return None


def oracle_form_is_wrong(lex, slot: str, person: str, g: str, variants) -> str | None:
    """The known defect (DEFECTS id) that explains an oracle possessive the engine rightly lacks (M04)."""
    if TRIPLE_VOWEL.search(g):
        return "long-vowel-vn"
    if slot == "pl.allative" and person == "3" and re.search(r"lle[aä]n$", g):
        return "pl-allative-vn"
    flipped = flip_suffix(g)
    match = next((v for v in variants if v.text == flipped), None)
    if match and suffix_harmony_ok(lex, match):
        return "suffix-harmony"
    return None


def stem_before_suffix(form: str, slot: str) -> str:
    """The part of a case form a possessive suffix attaches to (talojen → talojeni, taloksi → talokseni)."""
    if form.endswith("n") and slot in ("sg.genitive", "sg.illative", "pl.genitive", "pl.illative"):
        return form[:-1]
    if form.endswith("ksi") and slot.endswith(".translative"):
        return form[:-1] + "e"
    return form


@audit.check("M01", "oracle-analysis", "Every engine form is analysed as that word, number and case", severity="error", needs=("oracle",))
def oracle_analysis(ctx, r):
    """Each variant of each slot must get an analysis with the lexeme's lemma and
    the slot's number and case (the same test as `npm run verify:morph`).
    Hand-entered overrides are marked in the evidence: they bypass the rules."""
    adj = adjudicated()
    for lex in ctx.lexicon:
        overrides = {(o["slot"], f) for o in lex.overrides for f in o["forms"]}
        for slot, v in lex.variants():
            if recognised(ctx.oracle, v.text, lex, slot):
                continue
            number, _ = split_slot(slot)
            reason = adj["engineForms"].get(f"{lex.id}:{slot}:{v.text}") or adj["engineSlots"].get(f"{lex.id}:{number}")
            override = (slot, v.text) in overrides
            r.add(f"form:{lex.id}:{slot}", f"“{v.text}” is not analysed as {lex.lemma} {slot}{' (hand-entered override)' if override else ''}.",
                  key=v.text, waived=f"adjudicated: {reason}" if reason else None,
                  evidence={"analyses": [a.raw for a in ctx.oracle.analyse(v.text)[:5]], "register": v.register, "override": override})


@audit.check("M02", "oracle-coverage", "Standard forms the oracle generates are among the engine's", severity="error", needs=("oracle",))
def oracle_coverage(ctx, r):
    """Every standard form GiellaLT generates for a slot should be one of the
    engine's variants. Forms GiellaLT itself marks non-standard, archaic shapes
    and homonym paradigms listed in adjudicated.json are not counted; slots the
    generator has nothing for are counted in one info line."""
    adj = adjudicated()
    analysis_only = 0
    for lex in ctx.lexicon:
        for slot, form in lex.paradigm.items():
            if form.status == "not-used":
                continue
            out = generated(ctx.oracle, lex, slot)
            if not out:
                analysis_only += 1
                continue
            for g in out:
                if in_engine(g, form.texts):
                    continue
                reason = adj["ignoreMissingForms"].get(f"{lex.id}:{slot}:{g}") or adj["ignoreMissing"].get(lex.id)
                if not reason and nonstandard(ctx.oracle, g, lex, slot):
                    continue
                r.add(f"form:{lex.id}:{slot}", f"The oracle generates “{g}”; the engine has {' / '.join(form.texts)}.", key=g,
                      waived=f"adjudicated: {reason}" if reason else None)
    if analysis_only:
        r.add("lexicon", f"{analysis_only} slots are checked by analysis only: the generator has no form for them.",
              key="analysis-only", severity="info")


@audit.check("M03", "possessive-analysis", "Every possessive form is analysed with its suffix", severity="error", needs=("oracle",))
def possessive_analysis(ctx, r):
    """Possessive forms (talossani, kotinsa…) must be analysed as the lemma with
    the slot's number and case and the person's possessive tag (3rd person:
    PxSg3 or PxPl3). Slots whose base form is adjudicated inherit that verdict;
    known GiellaLT possessive defects (settled against Kielitoimiston
    ohjepankki, listed in morphology-audit.py) are waived with the reason."""
    adj = adjudicated()
    for lex in ctx.lexicon:
        for slot, person, v in lex.possessive_variants():
            if recognised(ctx.oracle, v.text, lex, slot, person):
                continue
            number, _ = split_slot(slot)
            base_key = next((f"{lex.id}:{slot}:{t}" for t in lex.forms(slot) if f"{lex.id}:{slot}:{t}" in adj["engineForms"]), None)
            reason = adj["engineSlots"].get(f"{lex.id}:{number}") or (f"inherits {base_key}: {adj['engineForms'][base_key]}" if base_key else None)
            waived = f"adjudicated: {reason}" if reason else None
            if not waived and (defect := oracle_rejects_correct_form(ctx, lex, slot, person, v)):
                waived = f"known oracle defect [{defect}]: {DEFECTS[defect]}"
            r.add(f"form:{lex.id}:{slot}:{person}", f"“{v.text}” is not analysed as {lex.lemma} {slot} + {person} possessive.", key=v.text,
                  waived=waived, evidence={"analyses": [a.raw for a in ctx.oracle.analyse(v.text)[:5]]})


@audit.check("M04", "possessive-coverage", "Standard possessive forms the oracle generates are among the engine's", severity="warning", needs=("oracle",))
def possessive_coverage(ctx, r):
    """For every noun, slot and person, the forms GiellaLT generates should be
    among the engine's variants (talossaan ~ talossansa). Non-standard and
    archaic oracle forms are not counted. A possessive built on a base form
    the engine lacks takes that base form's verdict: skipped when the base is
    non-standard, waived when it is adjudicated, otherwise reported (the base
    itself is an M02 error). Known GiellaLT defects are waived."""
    adj = adjudicated()
    for lex in ctx.lexicon:
        for slot, by_person in lex.possessives.items():
            base = lex.paradigm[slot]
            oracle_only: dict[str, str | None] = {}  # base form → None (non-standard) or the reason/explanation
            for b in generated(ctx.oracle, lex, slot):
                if in_engine(b, base.texts):
                    continue
                why = adj["ignoreMissingForms"].get(f"{lex.id}:{slot}:{b}") or adj["ignoreMissing"].get(lex.id)
                oracle_only[b] = f"adjudicated: {why}" if why else (None if nonstandard(ctx.oracle, b, lex, slot) else "")
            for person, variants in by_person.items():
                engine = [v.text for v in variants]
                out = sorted({g for px in PERSON_PX[person] for g in generated(ctx.oracle, lex, slot, px)})
                for g in out:
                    if in_engine(g, engine):
                        continue
                    source = next((b for b in oracle_only if g.startswith(stem_before_suffix(b, slot))), None)
                    if source is not None and oracle_only[source] is None:
                        continue  # built on a non-standard base form
                    reason = adj["ignoreMissing"].get(lex.id)
                    if not reason and nonstandard(ctx.oracle, g, lex, slot, person):
                        continue
                    waived = f"adjudicated: {reason}" if reason else None
                    if not waived and source and oracle_only[source]:
                        waived = f"built on “{source}”, {oracle_only[source]}"
                    if not waived and (defect := oracle_form_is_wrong(lex, slot, person, g, variants)):
                        waived = f"known oracle defect [{defect}]: {DEFECTS[defect]}"
                    shown = " / ".join(engine) or "no form"
                    via = f" (built on “{source}”, which the engine lacks: see M02)" if source and not waived else ""
                    r.add(f"form:{lex.id}:{slot}:{person}", f"The oracle generates “{g}”{via}; the engine has {shown}.", key=g, waived=waived)


@audit.check("M05", "piece-integrity", "Coloured pieces spell the form exactly", severity="error")
def piece_integrity(ctx, r):
    """The app colours each form by its pieces (stem, grade, plural, ending,
    possessive). Joined together they must give exactly the form's text."""
    for lex in ctx.lexicon:
        rows = [(f"form:{lex.id}:{slot}", v) for slot, v in lex.variants()]
        rows += [(f"form:{lex.id}:{slot}:{person}", v) for slot, person, v in lex.possessive_variants()]
        for subject, v in rows:
            joined = "".join(p[0] for p in v.pieces)
            if joined != v.text:
                r.add(subject, f"Pieces spell “{joined}”, the form is “{v.text}”.", key=v.text,
                      evidence={"pieces": [[p[0], p[1]] for p in v.pieces]})


@audit.check("M06", "ending-harmony", "Endings follow the word's vowel harmony", severity="error")
def ending_harmony(ctx, r):
    """Case endings follow the word's vowel harmony: a back-harmony word's ending
    pieces have no ä/ö/y, a front-harmony word's no a/o/u (lexical exception
    pieces such as verta are exempt). A possessive suffix follows the case
    ending it attaches to: talossaan, kylässään, but verta → vertansa."""
    for lex in ctx.lexicon:
        wrong = FRONT_VOWELS if lex.harmony == "back" else BACK_VOWELS
        for slot, v in lex.variants():
            bad = [p[0] for p in v.pieces if p[1] == "ending" and wrong & set(p[0])]
            if bad:
                r.add(f"form:{lex.id}:{slot}", f"“{v.text}”: ending {', '.join(bad)} breaks {lex.harmony} harmony.", key=v.text)
        for slot, person, v in lex.possessive_variants():
            if not suffix_harmony_ok(lex, v):
                base, suffix = suffix_split(v)
                expected = case_form_harmony(lex, base)
                r.add(f"form:{lex.id}:{slot}:{person}", f"“{v.text}”: suffix -{suffix} should have {expected} harmony, like the case form "
                      f"“{''.join(p[0] for p in base)}”.", key=v.text)


@audit.check("M07", "paradigm-shape", "Paradigms are complete and well formed", severity="error")
def paradigm_shape(ctx, r):
    """Every slot exists; used slots have forms and unused ones none; no slot
    lists a form twice; forms use only lower-case Finnish letters, ’ and -;
    the first variant of a normal slot is standard (warning)."""
    slots = set(ctx.snapshot.slots)
    for lex in ctx.lexicon:
        missing = slots - set(lex.paradigm)
        if missing:
            r.add(f"lexeme:{lex.id}", f"Missing slots: {', '.join(sorted(missing))}.", key="missing-slots")
        for slot, form in lex.paradigm.items():
            subject = f"form:{lex.id}:{slot}"
            if form.status != "not-used" and not form.variants:
                r.add(subject, f"Status {form.status} but no forms.", key="empty")
            if form.status == "not-used" and form.variants:
                r.add(subject, "Marked not used but has forms.", key="not-used")
            if len(set(form.texts)) != len(form.texts):
                r.add(subject, f"Duplicate variants: {' / '.join(form.texts)}.", key="duplicate")
            if form.status == "ok" and form.variants and form.variants[0].register != "standard":
                r.add(subject, f"Primary form “{form.variants[0].text}” is {form.variants[0].register}, not standard.", key="primary",
                      severity="warning")
        for slot, person, v in [(s, None, v) for s, v in lex.variants()] + list(lex.possessive_variants()):
            if not FORM_CHARS.fullmatch(v.text):
                where = f"{slot}:{person}" if person else slot
                r.add(f"form:{lex.id}:{where}", f"Unexpected characters in “{v.text}”.", key=v.text)
        for slot, by_person in lex.possessives.items():
            for person, vs in by_person.items():
                texts = [v.text for v in vs]
                if len(set(texts)) != len(texts):
                    r.add(f"form:{lex.id}:{slot}:{person}", f"Duplicate variants: {' / '.join(texts)}.", key="duplicate")


@audit.check("M08", "shared-forms", "Forms shared by different words", severity="info")
def shared_forms(ctx, r):
    """A form that belongs to two lexemes (kuusi 'spruce' / kuusi 'six') makes
    identify-the-word tasks ambiguous; each one is listed for review."""
    owners: dict[str, set[tuple[str, str]]] = defaultdict(set)
    for lex in ctx.lexicon:
        for slot, v in lex.variants():
            owners[v.text].add((lex.id, slot))
    for text, where in sorted(owners.items()):
        lexemes = sorted({lid for lid, _ in where})
        if len(lexemes) > 1:
            detail = "; ".join(f"{lid} {', '.join(sorted(s for l2, s in where if l2 == lid))}" for lid in lexemes)
            r.add(f"homograph:{text}", f"“{text}” is a form of {', '.join(lexemes)} ({detail}).", key=text,
                  evidence={"lexemes": lexemes})


@audit.check("M09", "hidden-slots", "Slots the engine hides but the oracle can form", severity="info", needs=("oracle",))
def hidden_slots(ctx, r):
    """Slots marked not used (mass nouns in the plural, …) for which GiellaLT
    still generates a standard form, so a reviewer can confirm hiding them.
    The comitative is skipped: GiellaLT does not mark its number, and the
    engine's plural-only comitative is the standard analysis."""
    for lex in ctx.lexicon:
        for slot, form in lex.paradigm.items():
            if form.status != "not-used" or slot.endswith(".comitative"):
                continue
            out = [g for g in generated(ctx.oracle, lex, slot) if not nonstandard(ctx.oracle, g, lex, slot)]
            if out:
                r.add(f"form:{lex.id}:{slot}", f"Marked not used ({form.status_rule or 'no reason given'}); the oracle generates {' / '.join(out)}.",
                      key=slot)


# ---------------------------------------------------------------------------
# Native-speaker review of forms the oracle does not confirm


def critical_groups(ctx) -> dict[str, dict]:
    """Learner-facing forms whose correctness rests on a source judgement rather than on the
    oracle, grouped by that judgement: adjudicated base forms, possessives the oracle rejects
    (adjudicated or a known oracle defect) and lexicalised literals in sentences. Each form
    records what the engine produces and what GiellaLT says about it."""
    adj = adjudicated()
    groups: dict[str, dict] = {}

    def add(gid: str, reason: str, form: dict) -> None:
        g = groups.setdefault(gid, {"reason": reason, "forms": []})
        same = ("lexemeId", "slot", "person", "form", "sentence")  # a literal is reviewed once per sentence it appears in
        if not any(all(f.get(k) == form.get(k) for k in same) for f in g["forms"]):
            g["forms"].append(form)

    def entry(lex, slot, person, v, basis):
        pxs = PERSON_PX[person] if person else (None,)
        return {
            "lexemeId": lex.id, "lemma": lex.lemma, "slot": slot, "person": person, "form": v.text, "register": v.register,
            "oracleAnalyses": [a.raw for a in ctx.oracle.analyse(v.text)[:4]],
            "oracleGenerates": sorted({g for px in pxs for g in generated(ctx.oracle, lex, slot, px)}),
            "basis": basis,
        }

    for lex in ctx.lexicon:
        for slot, v in lex.variants():
            if recognised(ctx.oracle, v.text, lex, slot):
                continue
            number, _ = split_slot(slot)
            if f"{lex.id}:{slot}:{v.text}" in adj["engineForms"]:
                key = f"{lex.id}:{slot}:{v.text}"
                add(f"adjudicated:{key}", adj["engineForms"][key], entry(lex, slot, None, v, "adjudicated form"))
            elif f"{lex.id}:{number}" in adj["engineSlots"]:
                key = f"{lex.id}:{number}"
                add(f"adjudicated:{key}", adj["engineSlots"][key], entry(lex, slot, None, v, "adjudicated slot"))
            else:
                add("unexplained", "Not recognised by the oracle and not adjudicated (see M01).", entry(lex, slot, None, v, "none"))
        for slot, person, v in lex.possessive_variants():
            if recognised(ctx.oracle, v.text, lex, slot, person):
                continue
            number, _ = split_slot(slot)
            base_key = next((f"{lex.id}:{slot}:{t}" for t in lex.forms(slot) if f"{lex.id}:{slot}:{t}" in adj["engineForms"]), None)
            if f"{lex.id}:{number}" in adj["engineSlots"]:
                add(f"adjudicated:{lex.id}:{number}", adj["engineSlots"][f"{lex.id}:{number}"],
                    entry(lex, slot, person, v, "possessive in an adjudicated slot"))
            elif base_key:
                add(f"adjudicated:{base_key}", adj["engineForms"][base_key],
                    entry(lex, slot, person, v, f"possessive of adjudicated “{base_key.split(':')[-1]}”"))
            elif defect := oracle_rejects_correct_form(ctx, lex, slot, person, v):
                add(f"oracle-defect:{defect}", DEFECTS[defect], entry(lex, slot, person, v, "known oracle defect"))
            else:
                add("unexplained", "Not recognised by the oracle and not adjudicated (see M03).", entry(lex, slot, person, v, "none"))
    for sentence in ctx.sentences:
        for t in sentence.tokens:
            if t.literal is None:
                continue
            lex = ctx.lexeme(t.head_id)
            add(f"literal:{t.literal}", f"Lexicalised form typed in a sentence and linked to {t.head_id} ({t.slot}); the engine does not produce it.",
                {"lexemeId": t.head_id, "lemma": lex.lemma if lex else t.head_id, "slot": t.slot, "person": t.person, "form": t.literal,
                 "register": None, "oracleAnalyses": [a.raw for a in ctx.oracle.analyse(t.literal)[:4]], "oracleGenerates": [],
                 "basis": f"sentence {sentence.id}: {sentence.text}", "sentence": sentence.id})
    return groups


@audit.check("M10", "critical-forms", "Forms that rest on a source judgement are reviewed by a native speaker", severity="warning",
             needs=("oracle",))
def critical_forms(ctx, r):
    """Forms the app shows or accepts that the oracle does not confirm were
    settled against a second source (Wiktionary, Kotus, Kielitoimiston
    ohjepankki) by the app's authors. They are reviewed in groups, along up to
    four dimensions (morphology, natural usage, lexical/semantic, explanation),
    and the verdicts are recorded in tools/audit/reviews.toml (see
    docs/NATIVE_REVIEW.md). Every group is reported with its status: PENDING
    (warning), NEEDS CORRECTION (error) or VERIFIED (shown as waived, with the
    reviewer). Forms the oracle rejects with no adjudication are errors."""
    reviews = load_reviews()
    for gid, g in sorted(critical_groups(ctx).items()):
        forms, n = g["forms"], len(g["forms"])
        examples = ", ".join(f["form"] for f in forms[:4]) + (" …" if n > 4 else "")
        if gid == "unexplained":
            r.add(f"review:{gid}", f"{n} form(s) the oracle rejects with no adjudication: {examples}", key=gid, severity="error",
                  evidence={"forms": forms, "count": n})
            continue
        info = describe_group(ctx, gid, g["reason"], forms)
        st = review_status(gid, info["dimensions"], reviews)
        evidence = {**info, **st, "reason": g["reason"], "forms": forms, "count": n}
        if st["status"] == "VERIFIED":
            who = ", ".join(f"{x['reviewer']} ({x['date']})" for x in st["reviews"] if x["role"] == "native-speaker")
            r.add(f"review:{gid}", f"VERIFIED — {info['title']}: {n} form(s).", key=gid, evidence=evidence,
                  waived=f"verified by native speaker {who}")
        elif st["status"] == "NEEDS CORRECTION":
            flagged = ", ".join(st["incorrectForms"]) or ", ".join(d for d, v in st["dimensions"].items() if v == "incorrect")
            r.add(f"review:{gid}", f"NEEDS CORRECTION — {info['title']}: a reviewer marked {flagged} incorrect.", key=gid,
                  severity="error", evidence=evidence, hint="Fix the engine or data for these forms, then ask for a re-review.")
        else:
            done = [d for d, v in st["dimensions"].items() if v]
            partly = f" (answered so far: {', '.join(done)})" if done else ""
            r.add(f"review:{gid}", f"PENDING — {info['title']}: {n} form(s) await native-speaker review{partly}. Examples: {examples}",
                  key=gid, evidence=evidence, hint="See docs/NATIVE_REVIEW.md; record the verdict in tools/audit/reviews.toml.")


if __name__ == "__main__":
    audit.main()
