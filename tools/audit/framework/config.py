"""Settings (audit.toml), linguistic rule tables (rules.toml) and waivers (waivers.toml)."""
from __future__ import annotations

import fnmatch
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .model import Finding, check_severity
from .paths import RULES_FILE, SETTINGS_FILE, WAIVERS_FILE


def load_toml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("rb") as f:
        return tomllib.load(f)


class Settings:
    """audit.toml: per-check `enabled`, `severity` and options, plus report settings."""

    def __init__(self, path: Path = SETTINGS_FILE):
        self.path = path
        self.data = load_toml(path)

    def check(self, check_id: str) -> dict[str, Any]:
        return dict(self.data.get("checks", {}).get(check_id, {}))

    def enabled(self, check_id: str) -> bool:
        return bool(self.check(check_id).get("enabled", True))

    def severity(self, check_id: str) -> str | None:
        sev = self.check(check_id).get("severity")
        return check_severity(sev, f"{self.path.name} [checks.{check_id}]") if sev else None

    def options(self, check_id: str, defaults: dict[str, Any]) -> dict[str, Any]:
        overrides = {k: v for k, v in self.check(check_id).items() if k not in ("enabled", "severity")}
        unknown = set(overrides) - set(defaults)
        if unknown:
            raise ValueError(f"{self.path.name} [checks.{check_id}]: unknown option(s) {', '.join(sorted(unknown))}")
        return defaults | overrides

    @property
    def report(self) -> dict[str, Any]:
        return dict(self.data.get("report", {}))


@dataclass
class Waiver:
    check: str
    subject: str | list[str]  # one pattern, or a list for several subjects with the same reason
    key: str | None
    reason: str
    reviewed: str | None
    index: int

    def matches(self, f: Finding) -> bool:
        subjects = [self.subject] if isinstance(self.subject, str) else self.subject
        if f.check != self.check or not any(fnmatch.fnmatchcase(f.subject, s) for s in subjects):
            return False
        return self.key is None or fnmatch.fnmatchcase(f.key, self.key)

    def describe(self) -> str:
        key = f" key={self.key}" if self.key else ""
        subject = self.subject if isinstance(self.subject, str) else f"{len(self.subject)} subjects"
        return f"[[waiver]] #{self.index + 1}: {self.check} {subject}{key}"


class Waivers:
    """Reviewed findings that are accepted as they are. Every waiver must give a reason."""

    def __init__(self, path: Path = WAIVERS_FILE):
        self.path = path
        self.entries: list[Waiver] = []
        for i, w in enumerate(load_toml(path).get("waiver", [])):
            missing = [k for k in ("check", "subject", "reason") if not str(w.get(k, "")).strip()]
            if missing:
                raise ValueError(f"{path.name}: waiver #{i + 1} lacks {', '.join(missing)}")
            self.entries.append(Waiver(w["check"], w["subject"], w.get("key"), w["reason"], w.get("reviewed"), i))

    def apply(self, findings: list[Finding]) -> set[int]:
        """Marks matching findings as waived; returns the indexes of the waivers that matched."""
        used: set[int] = set()
        for f in findings:
            if f.waived:
                continue
            for w in self.entries:
                if w.matches(f):
                    f.waived = f"waiver: {w.reason}"
                    used.add(w.index)
                    break
        return used


def load_rules(path: Path = RULES_FILE) -> dict[str, Any]:
    return load_toml(path)

