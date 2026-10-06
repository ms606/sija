"""
Self-tests for the grammar audit: each check must flag a deliberately wrong
example and stay quiet on the correct one. Sentences are built from the real
snapshot's engine forms, so run `npm run audit:export` first.

    tools/morph-oracle/.venv/bin/python -m unittest discover -s tools/audit/tests -v
"""
import copy
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

AUDIT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AUDIT_DIR))

from framework.config import Settings, Waiver, Waivers  # noqa: E402
from framework.review import Review, load_reviews  # noqa: E402
from framework.review import status as review_status  # noqa: E402
from framework.context import Context  # noqa: E402
from framework.model import Finding  # noqa: E402
from framework.reporter import Reporter  # noqa: E402
from framework.snapshot import Sentence  # noqa: E402


def load_audit(name):
    return load_audit_script(f"{name}-audit")


def load_audit_script(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), AUDIT_DIR / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SENTENCE = load_audit("sentence")
MORPHOLOGY = load_audit("morphology")
CTX = Context()
ORACLE = CTX.oracle.available


def tok(ref, slot="sg.nominative", variant=0, focus=True):
    """A token part as export-snapshot.ts writes it, with the engine's form for the slot."""
    lex = CTX.lexeme(ref)
    if slot.endswith(".accusative"):
        number = slot.split(".")[0]
        forms = lex.forms("pl.nominative") if number == "pl" else lex.forms("sg.genitive") + lex.forms("sg.nominative")
    else:
        forms = lex.forms(slot)
    text = forms[variant]
    return {"text": text, "token": {"raw": ("*" if focus else "") + ref, "focus": focus, "refs": [ref], "lexemeIds": [lex.id],
                                    "slot": slot, "person": None, "variant": variant, "literal": None, "accepted": forms}}


def sentence(sid, *parts, register="standard", level=8):
    parts = [{"text": p} if isinstance(p, str) else p for p in parts]
    text = "".join(p["text"] for p in parts)
    text = text[0].upper() + text[1:]
    if not parts[0].get("token"):
        parts[0] = {"text": parts[0]["text"][0].upper() + parts[0]["text"][1:]}
    return Sentence.load({"id": sid, "template": "", "en": "Test.", "register": register, "level": level, "tags": [],
                          "provenance": {"source": "curated", "nativeReview": False}, "text": text, "parts": parts})


def run_check(module, check_id, sentences=None, ctx=CTX):
    """Runs one check against the snapshot, with `sentences` replacing the real ones."""
    spec = module.audit.checks[check_id]
    if sentences is not None:
        ctx = Context()
        ctx.snapshot.__dict__["sentences"] = sentences
    r = Reporter(spec, ctx, dict(spec.options), None)
    spec.fn(ctx, r)
    return r.findings


class GrammarChecks(unittest.TestCase):
    def assertFlags(self, check, wrong, right):
        flagged = {f.subject for f in run_check(SENTENCE, check, [wrong, right])}
        self.assertIn(f"sentence:{wrong.id}", flagged, f"{check} should flag: {wrong.text}")
        self.assertNotIn(f"sentence:{right.id}", flagged, f"{check} should accept: {right.text}")

    def test_s05_numeral_takes_singular_partitive(self):
        self.assertFlags("S05", sentence("bad", "Kaksi ", tok("talo", "pl.nominative"), "."), sentence("ok", "Kaksi ", tok("talo", "sg.partitive"), "."))

    def test_s05_quantifier_skips_adjectives(self):
        self.assertFlags("S05", sentence("bad", "Monta uutta ", tok("talo", "pl.partitive"), "."),
                         sentence("ok", "Monta uutta ", tok("talo", "sg.partitive"), "."))

    def test_s06_postposition_takes_genitive(self):
        self.assertFlags("S06", sentence("bad", "Auto on ", tok("talo"), " edessä."), sentence("ok", "Auto on ", tok("talo", "sg.genitive"), " edessä."))

    def test_s07_partitive_verb(self):
        self.assertFlags("S07", sentence("bad", "Odotan ", tok("bussi", "sg.accusative"), "."), sentence("ok", "Odotan ", tok("bussi", "sg.partitive"), "."))

    def test_s07_genitive_before_postposition_is_not_the_object(self):
        flagged = run_check(SENTENCE, "S07", [sentence("ok", "Odotan ", tok("talo", "sg.genitive"), " edessä.")])
        self.assertEqual(flagged, [])

    def test_s07_numeral_heads_a_quantity_phrase(self):
        self.assertEqual(run_check(SENTENCE, "S07", [sentence("ok", "Odotin ", tok("kaksi", focus=False), " ", tok("tunti", "sg.partitive"), ".")]), [])

    def test_s02_skips_forms_the_engine_cannot_produce(self):
        self.assertEqual(run_check(SENTENCE, "S02", [sentence("ok", tok("kesä"), " on paras ", tok("kausi"), ".")]), [])

    def test_s07_elative_verb(self):
        self.assertFlags("S07", sentence("bad", "Tykkään ", tok("kahvi", "sg.partitive"), "."), sentence("ok", "Tykkään ", tok("kahvi", "sg.elative"), "."))

    def test_s08_no_accusative_under_negation(self):
        self.assertFlags("S08", sentence("bad", "En osta ", tok("auto", "sg.accusative"), "."), sentence("ok", "En osta ", tok("auto", "sg.partitive"), "."))

    def test_s09_nominative_object_needs_a_trigger(self):
        self.assertFlags("S09", sentence("bad", "Ostan ", tok("auto", "sg.accusative", variant=1), "."),
                         sentence("ok", "Osta ", tok("auto", "sg.accusative", variant=1), "!"))

    def test_s09_imperative_takes_nominative_form(self):
        self.assertFlags("S09", sentence("bad", "Osta ", tok("auto", "sg.accusative"), "!"), sentence("ok", "Ostan ", tok("auto", "sg.accusative"), "."))

    def test_s10_plural_subject_plural_verb(self):
        self.assertFlags("S10", sentence("bad", tok("lapsi", "pl.nominative"), " leikkii pihalla."),
                         sentence("ok", tok("lapsi", "pl.nominative"), " leikkivät pihalla."))

    def test_s04_attribute_agreement(self):
        self.assertFlags("S04", sentence("bad", "Muutan isossa ", tok("talo", "sg.illative"), "."),
                         sentence("ok", "Muutan isoon ", tok("talo", "sg.illative"), "."))

    def test_s02_hand_typed_lexicon_word(self):
        flagged = run_check(SENTENCE, "S02", [sentence("bad", "Asun talossa.")])
        self.assertEqual([f.hint for f in flagged], ["Write {talo:ine} so the engine produces it."])

    def test_s11_outer_place_in_inessive(self):
        self.assertFlags("S11", sentence("bad", "Olen ", tok("tori", "sg.inessive"), "."), sentence("ok", "Olen ", tok("tori", "sg.adessive"), "."))

    def test_s13_case_sentence_shows_its_case(self):
        self.assertFlags("S13", sentence("c.par.900", "Juon ", tok("vesi", "sg.genitive"), "."),
                         sentence("c.par.901", "Juon ", tok("vesi", "sg.partitive"), "."))

    def test_s16_duplicates(self):
        a, b = sentence("a", "Talo on iso."), sentence("b", "Talo on iso.")
        self.assertEqual([f.subject for f in run_check(SENTENCE, "S16", [a, b])], ["sentence:b"])

    def test_s17_question_translated_as_question(self):
        s = sentence("q", "Missä ", tok("talo"), " on?")
        self.assertEqual(len(run_check(SENTENCE, "S17", [s])), 1)


for name in [n for n in dir(GrammarChecks) if n.startswith("test_s") and n[6:8] not in ("13", "16", "17")]:
    setattr(GrammarChecks, name, unittest.skipUnless(ORACLE, "GiellaLT oracle not available")(getattr(GrammarChecks, name)))


class MorphologyChecks(unittest.TestCase):
    def mutated(self, lexeme_id, mutate):
        ctx = Context()
        lex = copy.deepcopy(ctx.lexeme(lexeme_id))
        mutate(lex)
        ctx.snapshot.__dict__["lexicon"] = [lex]
        ctx.snapshot.__dict__["_by_id"] = {lex.id: lex}
        return ctx

    def test_m05_pieces_must_spell_the_form(self):
        def break_pieces(lex):
            v = lex.paradigm["sg.inessive"].variants[0]
            v.pieces = v.pieces[:-1]
        self.assertEqual(len(run_check(MORPHOLOGY, "M05", ctx=self.mutated("talo", break_pieces))), 1)

    def test_m06_ending_harmony(self):
        def front_ending(lex):
            v = lex.paradigm["sg.inessive"].variants[0]
            v.pieces[-1] = ("ssä", "ending", None)
            v.text = "talossä"
        findings = run_check(MORPHOLOGY, "M06", ctx=self.mutated("talo", front_ending))
        self.assertEqual([f.key for f in findings], ["talossä"])

    def test_m06_suffix_follows_the_case_ending(self):
        # verta has a back-vowel ending although veri is front: vertansa is right, vertansä wrong.
        lex = CTX.lexeme("veri")
        variants = {v.text: v for v in lex.possessives["sg.partitive"]["3"]}
        right = copy.deepcopy(next(iter(variants.values())))
        right.text, right.pieces = "vertansa", [("ver", "root", None), ("ta", "exception", None), ("nsa", "possessive", None)]
        wrong = copy.deepcopy(right)
        wrong.text, wrong.pieces = "vertansä", right.pieces[:2] + [("nsä", "possessive", None)]
        self.assertTrue(MORPHOLOGY.suffix_harmony_ok(lex, right))
        self.assertFalse(MORPHOLOGY.suffix_harmony_ok(lex, wrong))

    @unittest.skipUnless(ORACLE, "GiellaLT oracle not available")
    def test_known_oracle_defects_are_recognised(self):
        lex = CTX.lexeme("talo")
        variants = lex.possessives["pl.allative"]["3"]
        vn = next(v for v in variants if v.text == "taloilleen")
        self.assertEqual(MORPHOLOGY.oracle_rejects_correct_form(CTX, lex, "pl.allative", "3", vn), "pl-allative-vn")
        self.assertEqual(MORPHOLOGY.oracle_form_is_wrong(lex, "sg.partitive", "3", "kalaaan", []), "long-vowel-vn")
        # A real engine error is not excused: -Vn after an illative.
        ill = next((v for v in lex.possessives["pl.illative"]["3"] if v.text.endswith("iin")), None)
        if ill:
            self.assertIsNone(MORPHOLOGY.oracle_rejects_correct_form(CTX, lex, "pl.illative", "3", ill))


class Reviews(unittest.TestCase):
    DIMS = ["morphology", "usage", "pedagogy"]

    def review(self, role="native-speaker", incorrect_forms=(), **verdicts):
        return Review("g:1", "Reviewer", role, "2026-10-06", verdicts, list(incorrect_forms))

    def test_status_rules(self):
        all_correct = {d: "correct" for d in self.DIMS}
        cases = [
            ([], "PENDING"),
            ([self.review(morphology="correct")], "PENDING"),                                   # partial
            ([self.review(**{**all_correct, "usage": "unsure"})], "PENDING"),                   # unsure
            ([self.review(role="author", **all_correct)], "PENDING"),                           # not a native speaker
            ([self.review(**all_correct)], "VERIFIED"),
            ([self.review(**{**all_correct, "pedagogy": "incorrect"})], "NEEDS CORRECTION"),     # any dimension wrong
            ([self.review(incorrect_forms=["x"], **all_correct)], "NEEDS CORRECTION"),          # a form marked wrong
            ([self.review(**all_correct), self.review(role="linguist", usage="incorrect")], "NEEDS CORRECTION"),
        ]
        for reviews, expected in cases:
            self.assertEqual(review_status("g:1", self.DIMS, reviews)["status"], expected, reviews)

    def test_review_file_validation(self):
        bad = [
            'group = "g"\nreviewer = "R"\nrole = "native-speaker"\ndate = "2026-10-06"\nmorphology = "yes"',   # bad value
            'group = "g"\nreviewer = "R"\nrole = "native-speaker"\ndate = "2026-10-06"\nverdict = "correct"', # unknown field
            'group = "g"\nreviewer = ""\nrole = "native-speaker"\ndate = "2026-10-06"\nmorphology = "correct"',
            'group = "g"\nreviewer = "R"\nrole = "native-speaker"\ndate = "2026-10-06"',                       # no verdict
            'group = "g"\nreviewer = "R"\nrole = "teacher"\ndate = "2026-10-06"\nmorphology = "correct"',
        ]
        with tempfile.TemporaryDirectory() as tmp:
            for i, body in enumerate(bad):
                path = Path(tmp) / f"r{i}.toml"
                path.write_text("[[review]]\n" + body + "\n", encoding="utf-8")
                with self.assertRaises(ValueError, msg=body):
                    load_reviews(path)

    def test_the_real_reviews_file_is_valid(self):
        load_reviews()


@unittest.skipUnless(ORACLE, "GiellaLT oracle not available")
class ReviewWorkflow(unittest.TestCase):
    """One M10 run, then the groups, statuses and the review packet built from them."""

    @classmethod
    def setUpClass(cls):
        cls.findings = run_check(MORPHOLOGY, "M10")
        cls.groups = {f.key: f for f in cls.findings}

    def test_every_form_is_explained(self):
        self.assertNotIn("unexplained", self.groups)
        for f in self.findings:
            e = f.evidence
            self.assertEqual(e["count"], len(e["forms"]))
            self.assertIn(e["priority"], ("High", "Medium", "Low"))
            self.assertTrue(set(e["dimensions"]) >= {"morphology", "usage", "pedagogy"})
            for form in e["forms"]:
                self.assertTrue(form["lemma"] and form["slot"] and form["form"], form)

    def test_a_native_review_closes_only_its_group(self):
        gid = "oracle-defect:partitive-ea-vn"
        dims = self.groups[gid].evidence["dimensions"]
        original = MORPHOLOGY.load_reviews
        try:
            MORPHOLOGY.load_reviews = lambda: [Review(gid, "N. Speaker", "native-speaker", "2026-10-06", {d: "correct" for d in dims})]
            after = {f.key: f for f in run_check(MORPHOLOGY, "M10")}
        finally:
            MORPHOLOGY.load_reviews = original
        self.assertEqual(after[gid].evidence["status"], "VERIFIED")
        self.assertTrue(after[gid].waived)
        self.assertEqual(sum(1 for f in after.values() if f.evidence["status"] == "VERIFIED"), 1)

    def test_packet_lists_every_group_and_form(self):
        packet = load_audit_script("native-review")
        groups = sorted(({"id": f.key, **f.evidence} for f in self.findings), key=lambda g: g["id"])
        text = packet.build(groups, {})
        for g in groups:
            self.assertIn(f"`{g['id']}`", text)
            self.assertIn(f'group = "{g["id"]}"', text)
            for form in g["forms"]:
                self.assertIn(f"**{form['form']}**", text)


class Framework(unittest.TestCase):
    def test_waiver_wildcards(self):
        w = Waiver("S02", "sentence:c.*", "talo*", "reason", None, 0)
        self.assertTrue(w.matches(Finding("S02", "warning", "sentence:c.par.1", "m", key="talossa")))
        self.assertFalse(w.matches(Finding("S02", "warning", "sentence:p.1", "m", key="talossa")))
        self.assertFalse(w.matches(Finding("S03", "warning", "sentence:c.par.1", "m", key="talossa")))

    def test_waivers_file_is_valid_and_reasoned(self):
        for w in Waivers().entries:
            self.assertTrue(w.reason.strip())

    def test_unknown_option_is_rejected(self):
        s = Settings()
        s.data = {"checks": {"V07": {"min_sentences_cor": 2}}}
        with self.assertRaises(ValueError):
            s.options("V07", {"min_sentences_core": 3})

    def test_check_ids_are_unique_across_audits(self):
        ids = [i for m in (SENTENCE, MORPHOLOGY, load_audit("vocabulary")) for i in m.audit.checks]
        self.assertEqual(len(ids), len(set(ids)))


if __name__ == "__main__":
    unittest.main()
