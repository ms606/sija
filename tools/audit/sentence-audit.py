"""
Sentence audit: example sentences and all other hand-written Finnish.

Noun forms inside {tokens} come from the engine; everything around them was
typed by hand. This audit checks the hand-written words (spelling, nouns that
should be tokens), the grammar between words and tokens (agreement, numerals,
adpositions, verb government, negation, object case, subject–verb number),
whether each sentence fits its lexemes and its place in the app, and the
spelling of lesson text, glossary and YKI model answers.

The grammar checks are deliberately narrow: they look at adjacent words in one
clause and only report what the analyser reads unambiguously. Rule tables
live in tools/audit/rules.toml.

    tools/morph-oracle/.venv/bin/python tools/audit/sentence-audit.py [--list] [--only S05,S06]
"""
import re
from collections import defaultdict

from framework import Audit
from framework.finnish import (
    CASE_TAG, GRAMMATICAL_CASES, INNER_CASES, PX_PERSON, WORD_RE, slot_from_reading, token_for,
)

audit = Audit("sentence", "Sentence audit", "Example sentences, the grammar around engine tokens, and all hand-written Finnish copy.")

NON_NOMINAL = {"V", "Adv", "Pcle", "Pron", "Adp", "Po", "Pr", "CC", "CS", "Interj"}


# ---------------------------------------------------------------------------
# Helpers


def readings(ctx, word, model="norm"):
    """Normal readings of a word: no GiellaLT usage marks, no proper-noun readings."""
    return [x for x in ctx.oracle.analyse(word, model) if x.clean and not x.proper]


def describe(rs, limit=3):
    return ", ".join(x.raw for x in rs[:limit]) or "no analysis"


def clauses(ctx, s):
    return s.clauses(set(ctx.rules.get("clauses", {}).get("boundary_words", [])))


def is_attribute(rs):
    """Unambiguously an agreeing attribute: an adjective, demonstrative or ordinal, whose only
    other readings are the same word used as a noun (GiellaLT also reads iso, punainen as N)."""
    attr = [x for x in rs if x.pos == "A" or (x.pos == "Pron" and "Dem" in x.tags) or (x.pos == "Num" and "Ord" in x.tags)]
    lemmas = {x.lemma for x in attr}
    return bool(attr) and all(x in attr or (x.pos == "N" and x.lemma in lemmas) for x in rs)


def agreement(token):
    """(number, case) readings an attribute of this token may have; number None = any."""
    if token.case == "accusative":
        return {("Pl", "Nom")} if token.number == "pl" else {("Sg", "Gen"), ("Sg", "Nom")}
    if token.case == "comitative":
        return {(None, "Com"), (None, "Cmt")}
    return {("Sg" if token.number == "sg" else "Pl", CASE_TAG[token.case])}


def agrees(rs, token):
    want = agreement(token)
    return any((n is None or x.number == n) and x.case == c for x in rs for n, c in want)


def next_head(ctx, s, clause, i):
    """The token a governor at clause[i] governs: the next unit, past agreeing attributes and
    a genitive modifier (kaksi talon ovea → ovea). Returns (token unit, attribute units) or (None, [])."""
    attrs = []
    j = i + 1
    while j < len(clause):
        u = clause[j]
        if u.token:
            nxt = clause[j + 1] if j + 1 < len(clause) else None
            lex = ctx.lexeme(u.token.head_id)
            if lex and lex.pos == "numeral" and nxt is not None and nxt.token:  # odotin kaksi tuntia → the noun is tuntia
                j += 1
                continue
            if u.token.case == "genitive" and nxt is not None:
                if nxt.token:  # kaksi talon ovea → the governed noun is ovea
                    j += 1
                    continue
                if nxt.is_word and (nxt.text.lower() in postpositions(ctx) or any(x.pos in ("N", "Adp", "Po") for x in readings(ctx, nxt.text, s.model))):
                    return None, []  # odotan oven edessä, pidän auton väristä: a modifier, not the object
            return u, attrs
        if u.is_word and is_attribute(readings(ctx, u.text, s.model)):
            attrs.append(u)
            j += 1
            continue
        return None, []
    return None, []


def postpositions(ctx):
    return {w for e in ctx.rules.get("adposition", []) if e.get("position") == "after" for w in e["words"]}


def object_like(token):
    """Is the token in a grammatical (object or subject) case rather than an adverbial one?"""
    return token.case in GRAMMATICAL_CASES


POS_OF_TAG = {"N": "noun", "A": "adjective", "Num": "numeral"}


def lexeme_ref(ctx, reading):
    """What a template writes for a reading of a lexicon word: the lemma when unique,
    else the id of the lexeme with the reading's part of speech (kuudelta → kuusi-six)."""
    lexemes = ctx.by_lemma.get(reading.lemma, [])
    if len(lexemes) == 1:
        return reading.lemma
    same_pos = [lex.id for lex in lexemes if lex.pos == POS_OF_TAG.get(reading.pos)]
    return same_pos[0] if len(same_pos) == 1 else " / ".join(lex.id for lex in lexemes)


def entries(ctx, table):
    for e in ctx.rules.get(table, []):
        yield e


def matches_entry(e, word, rs):
    if word.lower() in [w.lower() for w in e.get("words", [])]:
        return True
    return any(x.lemma in e.get("lemmas", []) for x in rs)


# ---------------------------------------------------------------------------
# Spelling and hand-written forms


@audit.check("S01", "spelling", "Every word is a word the analyser recognises", severity="error", needs=("oracle",))
def spelling(ctx, r):
    """Every word of every rendered sentence must be a recognised Finnish word
    form: the normative analyser for standard sentences, the descriptive one
    for spoken-register sentences (as `npm run verify:morph` does)."""
    for s in ctx.sentences:
        if s.text is None:
            continue
        for word in WORD_RE.findall(s.text):
            if not ctx.oracle.known(word, s.model):
                r.add(f"sentence:{s.id}", f"“{word}” is not recognised ({s.model} analyser): {s.text}", key=word)


@audit.check("S02", "untokenised-noun", "Lexicon words written by hand instead of as tokens", severity="warning", needs=("oracle",),
             options={"report_ambiguous": False})
def untokenised_noun(ctx, r):
    """A form of a lexicon word typed as plain text bypasses the engine, so it is
    never checked against the grammar and cannot be a blank. Inflected forms are
    warnings with the token to use; uninflected base forms (kaksi) are info.
    A token is suggested only when the engine produces exactly the typed form
    (comparatives such as paras have no token). Words that could also be read
    as something else (tuli: noun or verb) are skipped unless `report_ambiguous`
    is on. For an object, use :acc rather than :gen (Otan {kirja:acc})."""
    for s in ctx.sentences:
        for u in s.units:
            if not u.is_word:
                continue
            rs = readings(ctx, u.text, s.model)
            ours = [x for x in rs if x.nominal and x.lemma in ctx.by_lemma]
            if not ours:
                continue
            if any(x.pos in NON_NOMINAL for x in rs) and not r.options["report_ambiguous"]:
                continue
            first_word = next(w for w in s.units if w.is_word or w.token) is u
            cap = "^" if u.text[:1].isupper() and not first_word else ""
            suggestions, producible = [], []
            for x in ours:
                slot = slot_from_reading(x.number, x.case)
                person = PX_PERSON.get(x.px or "")
                for lex in ctx.by_lemma[x.lemma]:
                    if not slot or lex.pos != POS_OF_TAG.get(x.pos):
                        continue
                    forms = [v.text for v in lex.possessives.get(slot, {}).get(person, [])] if person else lex.forms(slot)
                    if u.text.lower() in (f.lower() for f in forms):
                        producible.append(x)
                        suggestions.append(token_for(cap + lexeme_ref(ctx, x), slot, person))
            if not producible:
                continue  # comparison or derivation (paras, kovemmalla): no token can produce it
            base_form = all(x.case == "Nom" and x.number == "Sg" and not x.px for x in producible)
            r.add(f"sentence:{s.id}", f"“{u.text}” ({describe(producible)}) is typed by hand: {s.text}", key=u.text,
                  severity="info" if base_form else None,
                  hint=f"Write {' or '.join(dict.fromkeys(suggestions))} so the engine produces it.")


@audit.check("S03", "literal-forms", "Lexicalised forms in {=…} tokens are real words", severity="error", needs=("oracle",))
def literal_forms(ctx, r):
    """`{=kotona|koti}` tokens show a hand-typed, lexicalised form linked to a
    lexeme (kotona is an adverb historically formed from koti). The engine does
    not produce it, so the analyser must at least recognise it."""
    for s in ctx.sentences:
        for t in s.tokens:
            if t.literal is not None and not ctx.oracle.known(t.literal, s.model):
                r.add(f"sentence:{s.id}", f"Literal “{t.literal}” is not recognised: {s.text}", key=t.literal)


# ---------------------------------------------------------------------------
# Grammar around tokens


@audit.check("S04", "attribute-agreement", "Adjectives before a token agree with it", severity="warning", needs=("oracle",))
def attribute_agreement(ctx, r):
    """Hand-written adjectives, demonstratives and ordinals directly before a
    token must share its number and case (hienon lahjan, kauniita kuvia). A
    singular accusative accepts genitive or nominative attributes; the
    comitative accepts -ine forms. Words that could be something else are skipped."""
    for s in ctx.sentences:
        for clause in clauses(ctx, s):
            for i, u in enumerate(clause):
                if not u.token or u.token.literal is not None:
                    continue
                j = i - 1
                while j >= 0 and clause[j].is_word:
                    rs = readings(ctx, clause[j].text, s.model)
                    if not is_attribute(rs):
                        break
                    if not agrees(rs, u.token):
                        r.add(f"sentence:{s.id}", f"“{clause[j].text}” ({describe(rs)}) does not agree with “{u.text}” ({u.token.slot}): {s.text}",
                              key=f"{clause[j].text}>{u.text}")
                    j -= 1


@audit.check("S05", "quantifier-government", "Numerals and quantifiers take the partitive", severity="error", needs=("oracle",))
def quantifier_government(ctx, r):
    """After a numeral from two up, monta, paljon, a measure word… the noun is
    in the partitive (rules.toml [[quantifier]]). Numerals and measure words may
    be tokens or typed; the noun must be a token in a grammatical case."""
    for s in ctx.sentences:
        for clause in clauses(ctx, s):
            for i, u in enumerate(clause):
                rule, word = None, u.text
                if u.is_word or u.kind == "number":
                    rs = readings(ctx, u.text, s.model) if u.is_word else []
                    for e in entries(ctx, "quantifier"):
                        if e.get("numerals"):
                            numeral = u.kind == "number" or any(x.pos == "Num" and "Card" in x.tags and x.case == "Nom" for x in rs)
                            if numeral and u.text.lower() not in e.get("except", []) and not any(x.lemma in e.get("except", []) for x in rs):
                                rule = e
                        elif matches_entry(e, u.text, rs):
                            rule = e
                        if rule:
                            break
                elif u.token and u.token.literal is None:
                    lex = ctx.lexeme(u.token.head_id)
                    for e in entries(ctx, "quantifier"):
                        numeral = e.get("numerals") and lex and lex.pos == "numeral" and u.token.slot == "sg.nominative" and lex.lemma not in e.get("except", [])
                        if numeral or (lex and lex.lemma in e.get("lemmas", [])):
                            rule = e
                            break
                if not rule:
                    continue
                head, _ = next_head(ctx, s, clause, i)
                if not head or not object_like(head.token) or head.token.slot in rule["requires"]:
                    continue
                r.add(f"sentence:{s.id}", f"“{word} {head.text}”: {head.token.slot} after “{word}”; expected {' or '.join(rule['requires'])}. {s.text}",
                      key=f"{word}>{head.text}", severity=rule.get("severity"), hint=rule.get("note"))


@audit.check("S06", "adposition-government", "Postpositions take the genitive, prepositions their case", severity="error", needs=("oracle",))
def adposition_government(ctx, r):
    """A token directly before a postposition (edessä, kanssa, jälkeen…) must be
    genitive; a token directly after ilman/ennen must be partitive
    (rules.toml [[adposition]])."""
    for s in ctx.sentences:
        for clause in clauses(ctx, s):
            for i, u in enumerate(clause):
                if not u.is_word:
                    continue
                low = u.text.lower()
                for e in entries(ctx, "adposition"):
                    if low not in e["words"]:
                        continue
                    k = i - 1 if e["position"] == "after" else i + 1
                    if not 0 <= k < len(clause) or not clause[k].token:
                        continue
                    t = clause[k].token
                    if t.case in e["requires"]:
                        continue
                    pair = f"{clause[k].text} {u.text}" if e["position"] == "after" else f"{u.text} {clause[k].text}"
                    r.add(f"sentence:{s.id}", f"“{pair}”: {t.slot} with “{u.text}”; expected {' or '.join(e['requires'])}. {s.text}",
                          key=pair, severity=e.get("severity"), hint=e.get("note"))


@audit.check("S07", "verb-government", "Verbs get the case they govern", severity="warning", needs=("oracle",))
def verb_government(ctx, r):
    """The noun right after a verb from rules.toml [[verb]] (odottaa, tykätä,
    luottaa…) must be in the verb's case when it is in a grammatical case:
    *Odotan bussin → bussia, *Tykkään kahvia → kahvista."""
    for s in ctx.sentences:
        for clause in clauses(ctx, s):
            for i, u in enumerate(clause):
                if not u.is_word:
                    continue
                rs = [x for x in readings(ctx, u.text, s.model) if x.pos == "V"]
                if not rs:
                    continue
                for e in entries(ctx, "verb"):
                    if not any(x.lemma in e["lemmas"] for x in rs):
                        continue
                    head, _ = next_head(ctx, s, clause, i)
                    if not head or head.token.literal is not None or not object_like(head.token) or head.token.case in e["object"]:
                        continue
                    r.add(f"sentence:{s.id}", f"“{u.text} {head.text}”: {head.token.slot} after {rs[0].lemma}; expected {' or '.join(e['object'])}. {s.text}",
                          key=f"{u.text}>{head.text}", severity=e.get("severity"), hint=e.get("note"))


@audit.check("S08", "negated-object", "No accusative object under negation", severity="error", needs=("oracle",))
def negated_object(ctx, r):
    """After a negative verb (en, et, ei…, älä) the object is partitive:
    En osta autoa, not *En osta auton. Accusative tokens later in the same
    clause are errors."""
    for s in ctx.sentences:
        for clause in clauses(ctx, s):
            negated = False
            for u in clause:
                if u.is_word and any(x.lemma == "ei" and x.pos == "V" and "Neg" in x.tags for x in readings(ctx, u.text, s.model)):
                    negated = True
                elif negated and u.token and u.token.case == "accusative":
                    r.add(f"sentence:{s.id}", f"“{u.text}” is accusative after a negative verb: {s.text}", key=u.text,
                          hint=f"Use the partitive: {token_for(u.token.refs[-1] if len(u.token.refs) == 1 else '+'.join(u.token.refs), u.token.number + '.partitive')}.")


@audit.check("S09", "object-form", "Nominative-form objects only where Finnish uses them", severity="warning", needs=("oracle",))
def object_form(ctx, r):
    """A singular total object has the nominative form (Osta maito!) only with an
    imperative, a passive, an A-infinitive or a necessity word in the clause
    (rules.toml [nominative_object]); otherwise it takes -n (Ostan maidon).
    Conversely, -n after a clear imperative or passive verb is flagged."""
    cfg = ctx.rules.get("nominative_object", {})
    tags, lemmas = set(cfg.get("trigger_tags", [])), set(cfg.get("trigger_lemmas", []))
    for s in ctx.sentences:
        for clause in clauses(ctx, s):
            words = [u for u in clause if u.is_word]
            all_rs = [readings(ctx, u.text, s.model) for u in words]
            trigger = any(tags & x.tags or x.lemma in lemmas for rs in all_rs for x in rs)
            imperative_or_passive = any(
                verbs and all("Imprt" in x.tags or "ConNeg" in x.tags or "Pss" in x.tags for x in verbs) and len(verbs) == len(rs)
                for rs in all_rs
                for verbs in [[x for x in rs if x.pos == "V"]]
            )
            for u in clause:
                t = u.token
                if not t or t.slot != "sg.accusative" or t.literal is not None:
                    continue
                lex = ctx.lexeme(t.head_id)
                nominative_form = bool(lex) and u.text.split(" ")[-1].lower() in [f.lower() for f in lex.forms("sg.nominative")]
                if nominative_form and not trigger:
                    r.add(f"sentence:{s.id}", f"“{u.text}” is a nominative-form object, but the clause has no imperative, passive, infinitive or necessity verb: {s.text}",
                          key=u.text, hint="Use the -n accusative ({…:acc}) or check the verb.")
                elif not nominative_form and imperative_or_passive:
                    r.add(f"sentence:{s.id}", f"“{u.text}” takes -n after an imperative or passive verb: {s.text}", key=u.text,
                          hint="Imperatives and passives take the nominative-form object: Osta maito! ({…:acc0}).")


@audit.check("S10", "subject-verb-number", "A nominative subject agrees with its verb", severity="warning", needs=("oracle",))
def subject_verb_number(ctx, r):
    """A clause that starts with a nominative token (after any attributes) and
    continues with a finite verb: a plural subject needs a plural verb (Lapset
    leikkivät), a singular one a singular verb. Only verbs read unambiguously
    as one number are judged; spoken-register sentences are skipped."""
    for s in ctx.sentences:
        if s.register == "spoken":
            continue
        for clause in clauses(ctx, s):
            k = 0
            while k < len(clause) and clause[k].is_word and is_attribute(readings(ctx, clause[k].text, s.model)):
                k += 1
            if k + 1 >= len(clause) or not clause[k].token or clause[k].token.case != "nominative" or not clause[k + 1].is_word:
                continue
            subject, verb = clause[k], clause[k + 1]
            persons = {x.finite_person for x in readings(ctx, verb.text, s.model) if x.finite_person}
            if not persons:
                continue
            if subject.token.number == "pl" and "Sg3" in persons and "Pl3" not in persons:
                r.add(f"sentence:{s.id}", f"Plural subject “{subject.text}” with singular verb “{verb.text}”: {s.text}", key=f"{subject.text}>{verb.text}")
            if subject.token.number == "sg" and "Pl3" in persons and "Sg3" not in persons:
                r.add(f"sentence:{s.id}", f"Singular subject “{subject.text}” with plural verb “{verb.text}”: {s.text}", key=f"{subject.text}>{verb.text}")


# ---------------------------------------------------------------------------
# Tokens against the lexicon


@audit.check("S11", "locative-type", "Places take their inner or outer locative cases", severity="warning")
def locative_type(ctx, r):
    """Words marked `locative: 'outer'` (tori → torilla) should not appear in the
    inessive or illative (warning); the elative is noted as info, since it also
    means 'about' (Puhumme torista). Inner places in outer cases are not
    checked: bussilla 'by bus' and kunnalta 'from the municipality' are normal."""
    for s in ctx.sentences:
        for t in s.tokens:
            lex = ctx.lexeme(t.head_id)
            if not lex or not lex.locative or lex.locative == "both" or t.person:
                continue
            if lex.locative == "outer" and t.case in INNER_CASES:
                sev = "info" if t.case == "elative" else None
                r.add(f"sentence:{s.id}", f"{lex.id} takes outer locatives, but “{t.text}” is {t.case}: {s.text}", key=t.text, severity=sev,
                      hint="If both are right with different meanings (meressä 'in the water' / merellä 'at sea'), set loc: 'both'.")


@audit.check("S12", "number-use", "Mass and singular-only words stay singular", severity="warning")
def number_use(ctx, r):
    """A token in the plural for a word marked `numberUse: 'mass'` is a warning;
    for `pl-rare` it is info."""
    for s in ctx.sentences:
        for t in s.tokens:
            lex = ctx.lexeme(t.head_id)
            if lex and t.number == "pl" and lex.number_use in ("mass", "pl-rare"):
                r.add(f"sentence:{s.id}", f"{lex.id} is marked {lex.number_use}, but “{t.text}” is plural: {s.text}", key=t.text,
                      severity="info" if lex.number_use == "pl-rare" else None)


@audit.check("S13", "case-examples", "Case examples show their case", severity="error")
def case_examples(ctx, r):
    """A sentence listed as an example of a case on its case page, or whose id
    promises a case (c.par.* — rules.toml [case_sentence_ids]), must contain
    that case in a focus token (or in any token when it has no focus)."""
    by_id = {s.id: s for s in ctx.sentences}
    promised: dict[str, set[str]] = defaultdict(set)
    for c in ctx.snapshot.cases:
        for u in c["usages"]:
            for sid in u["sentenceIds"]:
                if sid not in by_id:
                    r.add(f"case:{c['id']}", f"Usage “{u['title']}” lists unknown sentence {sid}.", key=sid)
                else:
                    promised[sid].add(c["id"])
    for prefix, case in ctx.rules.get("case_sentence_ids", {}).items():
        for s in ctx.sentences:
            if s.id.startswith(prefix):
                promised[s.id].add(case)
    for sid, cases in sorted(promised.items()):
        s = by_id[sid]
        shown = [t for t in s.tokens if t.focus] or s.tokens
        for case in sorted(cases):
            if not any(t.case == case for t in shown):
                r.add(f"sentence:{sid}", f"Should show the {case}, but its {'focus ' if any(t.focus for t in s.tokens) else ''}tokens are "
                      f"{', '.join(t.slot for t in shown) or 'none'}: {s.text}", key=case)


@audit.check("S14", "level-order", "Sentences only use words introduced by their level", severity="warning")
def level_order(ctx, r):
    """A sentence's `level` should be at least the level of every word in its
    tokens; otherwise a beginner meets it before the word is taught."""
    for s in ctx.sentences:
        later = sorted({(lex.level, lex.id) for t in s.tokens for lid in t.lexeme_ids if (lex := ctx.lexeme(lid)) and lex.level > s.level})
        if later:
            r.add(f"sentence:{s.id}", f"Level-{s.level} sentence uses {', '.join(f'{lid} (level {lvl})' for lvl, lid in later)}: {s.text}",
                  key="level", hint=f"Raise its level to {later[-1][0]} or pick other words.")


@audit.check("S23", "lesson-example-level", "Lessons show sentences of their own level", severity="warning")
def lesson_example_level(ctx, r):
    """A sentence in a lesson's examples should not be above the lesson's
    level. With S14 this keeps levels consistent: words ≤ sentence ≤ the
    earliest lesson that shows it."""
    by_id = {s.id: s for s in ctx.sentences}
    for lesson in ctx.snapshot.lessons:
        for sid in lesson["sentenceIds"]:
            s = by_id.get(sid)
            if not s:
                r.add(f"lesson:{lesson['id']}", f"Shows unknown sentence {sid}.", key=sid, severity="error")
            elif s.level > lesson["level"]:
                r.add(f"lesson:{lesson['id']}", f"Level-{lesson['level']} lesson shows {sid} (level {s.level}): {s.text}", key=sid,
                      hint="Lower the sentence's level (and its words'), or show another sentence.")


# ---------------------------------------------------------------------------
# Sentence hygiene


@audit.check("S15", "render", "Every sentence renders", severity="error")
def render(ctx, r):
    """The engine must render every template (unknown words, unused slots and
    bad tokens make it fail)."""
    for s in ctx.sentences:
        if s.error:
            r.add(f"sentence:{s.id}", f"Does not render: {s.error}", key="render")


@audit.check("S16", "duplicates", "No sentence appears twice", severity="warning")
def duplicates(ctx, r):
    """Two ids with the same rendered text show learners the same item twice."""
    seen: dict[str, str] = {}
    for s in ctx.sentences:
        if s.text is None:
            continue
        key = re.sub(r"\s+", " ", s.text.strip().lower())
        if key in seen:
            r.add(f"sentence:{s.id}", f"Same text as {seen[key]}: {s.text}", key=seen[key])
        else:
            seen[key] = s.id


@audit.check("S17", "translation-mood", "Questions are translated as questions", severity="warning")
def translation_mood(ctx, r):
    """A Finnish question must have an English question as its translation and
    vice versa (comparing the final ? after closing brackets and quotes)."""
    for s in ctx.sentences:
        if s.text is None:
            continue
        fi_q = s.text.rstrip(" \"'”»)").endswith("?")
        en_q = s.en.rstrip(" \"'”»)").endswith("?")
        if fi_q != en_q:
            r.add(f"sentence:{s.id}", f"{'Finnish' if fi_q else 'English'} is a question, the other is not: {s.text} / {s.en}", key="mood")


@audit.check("S18", "register", "Spoken-register sentences really are spoken", severity="info", needs=("oracle",))
def register(ctx, r):
    """A sentence marked `register: 'spoken'` whose every word is standard
    Finnish may be mislabelled."""
    for s in ctx.sentences:
        if s.register == "spoken" and s.text and all(ctx.oracle.known(w, "norm") for w in WORD_RE.findall(s.text)):
            r.add(f"sentence:{s.id}", f"Marked spoken, but every word is standard: {s.text}", key="register")


@audit.check("S19", "focus", "Sentences have a focus token", severity="info")
def focus(ctx, r):
    """Fill-in-the-blank and highlight views use the focus token ({*…}); a
    sentence without one cannot be used for them."""
    for s in ctx.sentences:
        if s.tokens and not any(t.focus for t in s.tokens):
            r.add(f"sentence:{s.id}", f"No focus token: {s.text}", key="focus")


@audit.check("S20", "outside-lexicon", "Nouns used in sentences but missing from the lexicon", severity="info", needs=("oracle",),
             options={"min_sentences": 2})
def outside_lexicon(ctx, r):
    """Hand-written nouns whose lemma is not in the lexicon are never checked by
    the engine. Each lemma used in at least `min_sentences` sentences is listed,
    as a candidate for the lexicon."""
    seen: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    for s in ctx.sentences:
        for u in s.units:
            if not u.is_word:
                continue
            rs = readings(ctx, u.text, s.model)
            if not rs or any(x.pos != "N" for x in rs) or any(x.lemma in ctx.by_lemma for x in rs):
                continue
            lemma = sorted({x.lemma for x in rs})[0]
            seen[lemma][s.id].add(u.text)
    for lemma, by_sentence in sorted(seen.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        if len(by_sentence) < r.options["min_sentences"]:
            continue
        forms = sorted({f for fs in by_sentence.values() for f in fs})
        r.add(f"lemma:{lemma}", f"{lemma}: {len(by_sentence)} sentences ({', '.join(forms)}), not in the lexicon.", key=lemma,
              evidence={"sentences": sorted(by_sentence)})


@audit.check("S21", "copy-spelling", "Finnish copy is spelled correctly", severity="warning", needs=("oracle",))
def copy_spelling(ctx, r):
    """Lesson text, case pages, explanations, glossary terms and YKI model
    answers and prompts: every Finnish word must be recognised (normative or
    descriptive analyser). Skipped as notation: affixes and stems (-ssa,
    kiele-), segmented and starred forms (talo|ssa, *audon), letter clusters
    (nt → nn), anything next to → ~ > or after a colon (k:ksi), {placeholders},
    abbreviations and rules.toml [copy] ignore_words. In a hyphenated compound
    only the last part is checked (uusi-tyypissä → tyypissä)."""
    ignore = {w.lower() for w in ctx.rules.get("copy", {}).get("ignore_words", [])}
    has_vowel = re.compile(r"[aeiouyäöå]", re.I)
    for item in ctx.snapshot.copy:
        text = re.sub(r"\{[^}]*\}", " ", item["text"])
        for m in WORD_RE.finditer(text):
            raw = m.group()
            before, after = text[max(0, m.start() - 2):m.start()], text[m.end():m.end() + 2]
            if raw[0] == "-" or raw[-1] == "-" or before[-1:] in ("*", "|", "+", "/", ":") or after[:1] in ("|", "+"):
                continue
            if any(sym in before + after for sym in "→~>"):
                continue
            word = raw.split("-")[-1].strip("'’")
            if not has_vowel.search(word) or sum(ch.isupper() for ch in word) > 1 or raw.lower() in ignore or word.lower() in ignore:
                continue
            if not (ctx.oracle.known(word, "norm") or ctx.oracle.known(word, "desc")):
                r.add(f"copy:{item['source']}|{item['path']}", f"“{raw}” is not recognised in: {item['text']}", key=raw)


@audit.check("S22", "provenance", "Sentence provenance and review status", severity="info")
def provenance(ctx, r):
    """Learner-facing sentences must be curated (imported ones go through staging
    and QA first: errors). The native-review backlog is one info line."""
    pending = sum(1 for s in ctx.sentences if not s.provenance.get("nativeReview"))
    for s in ctx.sentences:
        if s.provenance.get("source") != "curated":
            r.add(f"sentence:{s.id}", f"Source is “{s.provenance.get('source')}”, not curated.", key="source", severity="error")
    if pending:
        r.add("sentences", f"{pending} of {len(ctx.sentences)} sentences await native-speaker review.", key="native-review")


if __name__ == "__main__":
    audit.main()
