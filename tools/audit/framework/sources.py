"""
Finds where a subject is defined in src/ so findings link to the right line.
Subjects look like `sentence:p.5`, `lexeme:kuusi-six`, `lesson:1.2`,
`form:talo:sg.inessive`; anything unknown gets no location.
"""
from __future__ import annotations

import re
from functools import cached_property
from pathlib import Path

from .paths import ROOT

DATA = ROOT / "src" / "data"

PATTERNS: dict[str, tuple[str, re.Pattern[str]]] = {
    "sentence": ("sentences/*.ts", re.compile(r"\bs\(\s*'([^']+)'")),
    "lesson": ("curriculum/level-*.ts", re.compile(r"\bid:\s*'(\d+\.\d+)'")),
    "yki": ("yki/index.ts", re.compile(r"^\s{4}id:\s*'([^']+)'")),
    "case": ("cases.ts", re.compile(r"^\s{2}([a-z]+):\s*\{")),
    "rule": ("explanations/rules.ts", re.compile(r"^\s*'([^']+)':\s*m\(")),
    "diagnosis": ("explanations/diagnoses.ts", re.compile(r"^\s*'([^']+)':\s*m\(")),
    "glossary": ("glossary.ts", re.compile(r"\{\s*fi:\s*'([^']+)'")),
}
LEXEME_RE = re.compile(r"\b(?:noun|adj|num)\(\s*'([^']+)'")
LEXEME_ID_RE = re.compile(r"\bid:\s*'([^']+)'")


class SourceIndex:
    @cached_property
    def _index(self) -> dict[str, dict[str, str]]:
        index: dict[str, dict[str, str]] = {kind: {} for kind in PATTERNS}
        for kind, (glob, rx) in PATTERNS.items():
            for path in sorted(DATA.glob(glob)):
                for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                    for m in rx.finditer(line):
                        index[kind].setdefault(m.group(1), self._loc(path, n))
        index["lexeme"] = {}
        for path in sorted((DATA / "lexicon").glob("*.ts")):
            for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                m = LEXEME_RE.search(line)
                if not m:
                    continue
                explicit = LEXEME_ID_RE.search(line)
                index["lexeme"].setdefault(explicit.group(1) if explicit else m.group(1), self._loc(path, n))
        return index

    @staticmethod
    def _loc(path: Path, line: int) -> str:
        return f"{path.relative_to(ROOT).as_posix()}:{line}"

    def locate(self, subject: str) -> str | None:
        kind, _, rest = subject.partition(":")
        if kind == "form":  # form:<lexeme>:<slot>…
            kind, rest = "lexeme", rest.split(":")[0]
        if kind == "copy":  # copy:<source kind>:<id>|<path>
            kind, _, rest = rest.partition(":")
            rest = rest.split("|")[0]
        return self._index.get(kind, {}).get(rest)
