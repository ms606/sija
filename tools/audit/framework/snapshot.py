"""
The snapshot written by export-snapshot.ts, loaded into small typed objects.

Sentences are split into units: engine-produced tokens (`{kauppa:ill}` →
"kauppaan", one unit even for phrases like "uuden auton"), hand-written words,
numbers and punctuation. Checks that look at word order work on these units.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import cached_property
from pathlib import Path
from typing import Any, Iterator

from .finnish import TOKEN_RE, split_slot


class SnapshotMissing(Exception):
    pass


@dataclass
class Variant:
    text: str
    register: str
    pieces: list[tuple[str, str, str | None]]  # (text, role, grade)

    @classmethod
    def load(cls, d: dict[str, Any]) -> Variant:
        return cls(d["text"], d["register"], [(p[0], p[1], p[2] if len(p) > 2 else None) for p in d["pieces"]])


@dataclass
class Form:
    status: str  # "ok" | "rare" | "not-used"
    variants: list[Variant]
    status_rule: str | None = None

    @property
    def texts(self) -> list[str]:
        return [v.text for v in self.variants]


@dataclass
class Lexeme:
    id: str
    lemma: str
    pos: str
    type_id: str
    kotus: str
    gradation: dict[str, Any] | None
    compound: dict[str, str] | None
    declared_harmony: str | None
    harmony: str
    harmony_part: str
    gloss: dict[str, str]
    semantics: list[str]
    locative: str | None
    themes: list[str]
    level: int
    frequency: str
    image: dict[str, Any]
    homonyms: list[str]
    notes: list[str]
    number_use: str
    overrides: list[dict[str, Any]]
    provenance: dict[str, Any]
    paradigm: dict[str, Form]
    possessives: dict[str, dict[str, list[Variant]]]

    @classmethod
    def load(cls, d: dict[str, Any]) -> Lexeme:
        return cls(
            id=d["id"], lemma=d["lemma"], pos=d["pos"], type_id=d["typeId"], kotus=d["kotus"],
            gradation=d["gradation"], compound=d["compound"], declared_harmony=d["declaredHarmony"],
            harmony=d["harmony"]["value"], harmony_part=d["harmony"]["decidingPart"], gloss=d["gloss"],
            semantics=d["semantics"], locative=d["locative"], themes=d["themes"], level=d["level"],
            frequency=d["frequency"], image=d["image"], homonyms=d["homonyms"], notes=d["notes"],
            number_use=d["numberUse"], overrides=d["overrides"], provenance=d["provenance"],
            paradigm={
                slot: Form(f["status"], [Variant.load(v) for v in f["variants"]], f.get("statusRuleId"))
                for slot, f in d["paradigm"].items()
            },
            possessives={
                slot: {person: [Variant.load(v) for v in vs] for person, vs in by_person.items()}
                for slot, by_person in d["possessives"].items()
            },
        )

    def forms(self, slot: str) -> list[str]:
        f = self.paradigm.get(slot)
        return f.texts if f else []

    def variants(self) -> Iterator[tuple[str, Variant]]:
        for slot, f in self.paradigm.items():
            for v in f.variants:
                yield slot, v

    def possessive_variants(self) -> Iterator[tuple[str, str, Variant]]:
        for slot, by_person in self.possessives.items():
            for person, vs in by_person.items():
                for v in vs:
                    yield slot, person, v


@dataclass
class Token:
    raw: str
    text: str
    focus: bool
    refs: list[str]
    lexeme_ids: list[str]
    slot: str
    person: str | None
    variant: int
    literal: str | None
    accepted: list[str]

    @property
    def number(self) -> str:
        return split_slot(self.slot)[0]

    @property
    def case(self) -> str:
        return split_slot(self.slot)[1]

    @property
    def head_id(self) -> str:
        """The lexeme that heads the token (the last word of a phrase)."""
        return self.lexeme_ids[-1]


@dataclass
class Unit:
    kind: str  # "token" | "word" | "number" | "punct"
    text: str
    index: int
    token: Token | None = None

    @property
    def is_word(self) -> bool:
        return self.kind == "word"


@dataclass
class Sentence:
    id: str
    template: str
    en: str
    register: str
    level: int
    tags: list[str]
    provenance: dict[str, Any]
    text: str | None
    error: str | None
    units: list[Unit] = field(default_factory=list)

    @classmethod
    def load(cls, d: dict[str, Any]) -> Sentence:
        s = cls(d["id"], d["template"], d["en"], d["register"], d["level"], d["tags"], d["provenance"], d["text"], d.get("error"))
        for part in d["parts"]:
            if "token" in part:
                t = part["token"]
                token = Token(
                    raw=t["raw"], text=part["text"], focus=t["focus"], refs=t["refs"], lexeme_ids=t["lexemeIds"],
                    slot=t["slot"], person=t["person"], variant=t["variant"], literal=t["literal"], accepted=t["accepted"],
                )
                s.units.append(Unit("token", part["text"], len(s.units), token))
                continue
            for m in TOKEN_RE.finditer(part["text"]):
                kind = m.lastgroup or "punct"
                s.units.append(Unit(kind, m.group(), len(s.units)))
        return s

    @property
    def tokens(self) -> list[Token]:
        return [u.token for u in self.units if u.token]

    @property
    def model(self) -> str:
        """Which analyser fits the sentence: descriptive for spoken register."""
        return "desc" if self.register == "spoken" else "norm"

    def clauses(self, boundary_words: set[str], boundary_punct: str = ".,;:!?()–—\"«»") -> list[list[Unit]]:
        """Units split at punctuation and at clause-joining words (ja, mutta, koska…)."""
        out: list[list[Unit]] = [[]]
        for u in self.units:
            if (u.kind == "punct" and u.text in boundary_punct) or (u.is_word and u.text.lower() in boundary_words):
                if out[-1]:
                    out.append([])
                continue
            out[-1].append(u)
        return [c for c in out if c]


class Snapshot:
    def __init__(self, path: Path):
        if not path.exists():
            raise SnapshotMissing(f"{path} not found. Run `npm run audit:export` (or `npm run audit:grammar`) first.")
        self.path = path
        self.data = json.loads(path.read_text(encoding="utf-8"))
        self.generated_at: str = self.data["generatedAt"]
        self.slots: list[str] = self.data["slots"]
        self.persons: list[str] = self.data["persons"]
        self.gradation_patterns: dict[str, dict[str, Any]] = self.data["gradationPatterns"]
        self.types: dict[str, dict[str, Any]] = self.data["types"]
        self.lessons: list[dict[str, Any]] = self.data["lessons"]
        self.cases: list[dict[str, Any]] = self.data["cases"]
        self.copy: list[dict[str, Any]] = self.data["copy"]

    @cached_property
    def lexicon(self) -> list[Lexeme]:
        return [Lexeme.load(d) for d in self.data["lexicon"]]

    @cached_property
    def sentences(self) -> list[Sentence]:
        return [Sentence.load(d) for d in self.data["sentences"]]

    @cached_property
    def _by_id(self) -> dict[str, Lexeme]:
        return {lex.id: lex for lex in self.lexicon}

    @cached_property
    def by_lemma(self) -> dict[str, list[Lexeme]]:
        out: dict[str, list[Lexeme]] = {}
        for lex in self.lexicon:
            out.setdefault(lex.lemma, []).append(lex)
        return out

    def lexeme(self, lexeme_id: str) -> Lexeme | None:
        return self._by_id.get(lexeme_id)
