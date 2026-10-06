"""What a check receives to record its findings."""
from __future__ import annotations

from typing import Any

from .context import Context
from .model import CheckSpec, Finding, check_severity


class Reporter:
    def __init__(self, spec: CheckSpec, ctx: Context, options: dict[str, Any], severity_override: str | None):
        self.spec = spec
        self.ctx = ctx
        self.options = options
        self._override = severity_override
        self.findings: list[Finding] = []
        self._seen: set[str] = set()

    def add(
        self,
        subject: str,
        message: str,
        *,
        key: str = "",
        severity: str | None = None,
        hint: str | None = None,
        evidence: dict[str, Any] | None = None,
        location: str | None = None,
        waived: str | None = None,
    ) -> None:
        """Records a finding. Severity defaults to the check's; audit.toml may override it.

        A second finding with the same subject and key is dropped, so checks
        can report from loops without deduplicating themselves.
        """
        sev = self._override or check_severity(severity or self.spec.severity, f"{self.spec.id}")
        f = Finding(
            check=self.spec.id,
            severity=sev,
            subject=subject,
            message=message,
            key=key,
            hint=hint,
            evidence=evidence or {},
            location=location or self.ctx.sources.locate(subject),
            waived=waived,
        )
        if f.fingerprint in self._seen:
            return
        self._seen.add(f.fingerprint)
        self.findings.append(f)
