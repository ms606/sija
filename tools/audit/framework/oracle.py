"""
The GiellaLT Finnish analyser and generator as an independent oracle (GPL-3+,
dev-only, never shipped; set up as described in docs/VERIFICATION.md).

Analyses come back as strings like `talo+N+Sg+Ine+PxSg1` or, for compounds,
`kahvi+N+Cmp/SgNom#lassa+N+Sg+Nom`; `Reading` turns them into fields.
"""
from __future__ import annotations

import importlib.util
from dataclasses import dataclass
from functools import cached_property

from .paths import ORACLE_MODELS

POS = {"N", "A", "V", "Num", "Pron", "Adv", "Pcle", "Adp", "Po", "Pr", "CC", "CS", "Interj", "Punct", "Abbr", "Acr", "Symbol"}
CASES = {"Nom", "Gen", "Par", "Ine", "Ela", "Ill", "Ade", "Abl", "All", "Ess", "Tra", "Abe", "Com", "Cmt", "Ins", "Acc", "Lat"}
NOMINAL = {"N", "A", "Num"}
PERSON_TAGS = {"Sg1", "Sg2", "Sg3", "Pl1", "Pl2", "Pl3"}

MODELS = {
    "norm": ("analyser-gt-norm.hfstol", "generator-gt-norm.hfstol"),
    "desc": ("analyser-gt-desc.hfstol", "generator-gt-desc.hfstol"),
}


@dataclass(frozen=True)
class Reading:
    raw: str
    lemma: str
    pos: str | None
    number: str | None  # "Sg" | "Pl"
    case: str | None
    px: str | None
    tags: frozenset[str]  # tags of the last compound part
    usage: frozenset[str]  # GiellaLT usage marks (Use/NG, Use/Rare, Use/Circ…) anywhere in the analysis
    compound: bool

    @classmethod
    def parse(cls, raw: str) -> Reading:
        segments = raw.split("#")
        lemma = "".join(s.split("+")[0] for s in segments)
        last = segments[-1].split("+")[1:]
        every = [t for s in segments for t in s.split("+")[1:]]
        return cls(
            raw=raw,
            lemma=lemma,
            pos=next((t for t in last if t in POS), None),
            number=next((t for t in last if t in ("Sg", "Pl")), None),
            case=next((t for t in last if t in CASES), None),
            px=next((t for t in last if t.startswith("Px")), None),
            tags=frozenset(last),
            usage=frozenset(t for t in every if t.startswith("Use/")),
            compound=len(segments) > 1,
        )

    @property
    def clean(self) -> bool:
        """A normal reading: not marked non-standard or guessed (no Use/… tags)."""
        return not self.usage

    @property
    def proper(self) -> bool:
        return "Prop" in self.tags

    @property
    def nominal(self) -> bool:
        return self.pos in NOMINAL

    @property
    def finite_person(self) -> str | None:
        """Sg1…Pl3 for a finite active verb form."""
        if self.pos != "V":
            return None
        return next((t for t in self.tags if t in PERSON_TAGS), None)

    def has(self, *tags: str) -> bool:
        return all(t in self.tags for t in tags)

    def __str__(self) -> str:
        return self.raw


class Oracle:
    """Lazy, cached access to the analysers and generators. Check `available` first."""

    def __init__(self) -> None:
        self._analyses: dict[tuple[str, str], list[Reading]] = {}
        self._generated: dict[tuple[str, str], list[str]] = {}

    @cached_property
    def unavailable_reason(self) -> str | None:
        if importlib.util.find_spec("uralicNLP") is None:
            return "uralicNLP is not installed (run the audit with tools/morph-oracle/.venv/bin/python)"
        missing = [f for pair in MODELS.values() for f in pair if not (ORACLE_MODELS / f).exists()]
        if missing:
            return f"GiellaLT model files missing in {ORACLE_MODELS}: {', '.join(missing)} (see docs/VERIFICATION.md)"
        return None

    @property
    def available(self) -> bool:
        return self.unavailable_reason is None

    @cached_property
    def _api(self):
        from uralicNLP import uralicApi

        return uralicApi

    def analyse(self, word: str, model: str = "norm") -> list[Reading]:
        """All readings of `word`, trying apostrophe and lower-case spellings too."""
        key = (word, model)
        if key not in self._analyses:
            spellings = dict.fromkeys([word, word.replace("’", "'"), word.replace("’", ""), word.lower()])
            raws: dict[str, None] = {}
            for w in spellings:
                try:
                    for a in self._api.analyze(w, "fin", filename=str(ORACLE_MODELS / MODELS[model][0])):
                        raws[a[0]] = None
                except Exception:
                    pass
            self._analyses[key] = [Reading.parse(r) for r in raws]
        return self._analyses[key]

    def known(self, word: str, model: str = "norm") -> bool:
        return bool(self.analyse(word, model))

    def generate(self, query: str, model: str = "norm") -> list[str]:
        """Surface forms for an analysis string, e.g. `talo+N+Sg+Ine+PxSg1`."""
        key = (query, model)
        if key not in self._generated:
            try:
                out = sorted({x[0] for x in self._api.generate(query, "fin", filename=str(ORACLE_MODELS / MODELS[model][1]))})
            except Exception:
                out = []
            self._generated[key] = out
        return self._generated[key]
