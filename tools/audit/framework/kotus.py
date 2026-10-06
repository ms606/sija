"""
Kotus "Nykysuomen sanalista" 2024 (CC BY 4.0), read from the copy that
`npm run verify:kotus` downloads once. The audit never downloads anything.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .paths import KOTUS_LIST


@dataclass(frozen=True)
class KotusRow:
    word: str
    homonym: str
    pos: str
    info: str  # e.g. "9*A" or "5, 6"


class KotusList:
    def __init__(self, path: Path = KOTUS_LIST):
        self.rows: dict[str, list[KotusRow]] = {}
        for line in path.read_text(encoding="utf-8").splitlines()[1:]:
            word, homonym, pos, info = (line.split("\t") + ["", "", ""])[:4]
            if word:
                self.rows.setdefault(word, []).append(KotusRow(word, homonym, pos, info.strip()))

    def get(self, word: str) -> list[KotusRow]:
        return self.rows.get(word, [])

    @staticmethod
    def unavailable_reason(path: Path = KOTUS_LIST) -> str | None:
        return None if path.exists() else f"{path} not found; run `npm run verify:kotus` once to download it"
