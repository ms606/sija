"""Everything a check can read, loaded on first use."""
from __future__ import annotations

from functools import cached_property
from pathlib import Path
from typing import Any

from .config import load_rules
from .kotus import KotusList
from .oracle import Oracle
from .paths import RULES_FILE, SNAPSHOT
from .snapshot import Lexeme, Sentence, Snapshot
from .sources import SourceIndex


class Context:
    """Shared by all checks of a run (so oracle results are cached across checks)."""

    def __init__(self, snapshot_path: Path = SNAPSHOT, rules_path: Path = RULES_FILE):
        self.snapshot_path = snapshot_path
        self.rules_path = rules_path

    @cached_property
    def snapshot(self) -> Snapshot:
        return Snapshot(self.snapshot_path)

    @cached_property
    def oracle(self) -> Oracle:
        return Oracle()

    @cached_property
    def kotus(self) -> KotusList:
        return KotusList()

    @cached_property
    def rules(self) -> dict[str, Any]:
        return load_rules(self.rules_path)

    @cached_property
    def sources(self) -> SourceIndex:
        return SourceIndex()

    def unavailable(self, need: str) -> str | None:
        """Why a resource a check needs is missing, or None when it is there."""
        if need == "oracle":
            return self.oracle.unavailable_reason
        if need == "kotus":
            return KotusList.unavailable_reason()
        raise ValueError(f"Unknown resource {need!r} (known: oracle, kotus)")

    # Shortcuts used by most checks.
    @property
    def lexicon(self) -> list[Lexeme]:
        return self.snapshot.lexicon

    @property
    def sentences(self) -> list[Sentence]:
        return self.snapshot.sentences

    def lexeme(self, lexeme_id: str) -> Lexeme | None:
        return self.snapshot.lexeme(lexeme_id)

    @property
    def by_lemma(self) -> dict[str, list[Lexeme]]:
        return self.snapshot.by_lemma
