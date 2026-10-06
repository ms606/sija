"""The audit's data model: severities, findings, check specs and check runs."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import TYPE_CHECKING, Any, Callable

if TYPE_CHECKING:
    from .context import Context
    from .reporter import Reporter

SEVERITIES = ("error", "warning", "info")
SEVERITY_RANK = {"error": 0, "warning": 1, "info": 2}


def check_severity(value: str, where: str) -> str:
    if value not in SEVERITIES:
        raise ValueError(f"{where}: severity must be one of {', '.join(SEVERITIES)}, not {value!r}")
    return value


@dataclass
class Finding:
    """One problem (or note) about one subject.

    `subject` names what the finding is about as `kind:id`, e.g. `sentence:p.5`,
    `lexeme:kuusi-six`, `form:talo:sg.inessive`, `lesson:1.2`. `key` tells
    findings of the same check on the same subject apart (the word, the form…);
    check + subject + key is the finding's stable fingerprint, used by waivers
    and by the report to show what is new since the last run.
    """

    check: str
    severity: str
    subject: str
    message: str
    key: str = ""
    hint: str | None = None
    evidence: dict[str, Any] = field(default_factory=dict)
    location: str | None = None
    waived: str | None = None

    @property
    def fingerprint(self) -> str:
        return f"{self.check}|{self.subject}|{self.key}"

    def to_json(self) -> dict[str, Any]:
        d = asdict(self)
        d["fingerprint"] = self.fingerprint
        return {k: v for k, v in d.items() if v not in (None, "", {}) or k in ("check", "severity", "subject", "message")}

    @classmethod
    def from_json(cls, d: dict[str, Any]) -> Finding:
        return cls(**{k: v for k, v in d.items() if k != "fingerprint"})


CheckFn = Callable[["Context", "Reporter"], None]


@dataclass
class CheckSpec:
    """A registered check. `needs` lists resources it cannot run without ("oracle", "kotus")."""

    id: str
    name: str
    title: str
    severity: str
    fn: CheckFn
    audit: str
    needs: tuple[str, ...] = ()
    description: str = ""
    options: dict[str, Any] = field(default_factory=dict)


@dataclass
class CheckRun:
    spec: CheckSpec
    status: str  # "ran" | "skipped" | "crashed"
    reason: str = ""
    seconds: float = 0.0
    findings: list[Finding] = field(default_factory=list)
    options: dict[str, Any] = field(default_factory=dict)

    def counts(self) -> dict[str, int]:
        c = {s: 0 for s in SEVERITIES} | {"waived": 0}
        for f in self.findings:
            c["waived" if f.waived else f.severity] += 1
        return c

    def to_json(self) -> dict[str, Any]:
        return {
            "id": self.spec.id,
            "name": self.spec.name,
            "title": self.spec.title,
            "severity": self.spec.severity,
            "description": self.spec.description,
            "needs": list(self.spec.needs),
            "options": self.options,
            "status": self.status,
            "reason": self.reason,
            "seconds": round(self.seconds, 2),
            "counts": self.counts(),
        }
