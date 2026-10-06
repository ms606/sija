"""
An `Audit` is a named group of checks. Each audit script creates one,
registers checks with `@audit.check(...)` and calls `audit.main()`:

    audit = Audit("sentence", "Sentence audit")

    @audit.check("S05", "quantifier-government", "Numerals and quantifiers take the partitive",
                 severity="error", needs=("oracle",))
    def quantifier_government(ctx, r):
        '''Docstring = the description shown in the report.'''
        for s in ctx.sentences:
            ...
            r.add(f"sentence:{s.id}", "…", key=word, hint="…")

`main()` runs the enabled checks, applies waivers, writes
out/findings/<audit>.json for generate-report.py and prints a summary.
"""
from __future__ import annotations

import argparse
import inspect
import json
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .config import Settings, Waivers
from .context import Context
from .model import SEVERITIES, SEVERITY_RANK, CheckFn, CheckRun, CheckSpec, check_severity
from .paths import FINDINGS_DIR, ROOT, SNAPSHOT
from .reporter import Reporter
from .snapshot import SnapshotMissing

FAIL_LEVELS = (*SEVERITIES, "never")
ICON = {"error": "✗", "warning": "!", "info": "·"}
COLOR = {"error": "\033[31m", "warning": "\033[33m", "info": "\033[36m", "dim": "\033[2m", "bold": "\033[1m", "end": "\033[0m"}


def failing(severity: str, fail_on: str) -> bool:
    return fail_on != "never" and SEVERITY_RANK[severity] <= SEVERITY_RANK[fail_on]


class Audit:
    def __init__(self, name: str, title: str, description: str = ""):
        self.name = name
        self.title = title
        self.description = description
        self.checks: dict[str, CheckSpec] = {}

    def check(
        self,
        id: str,
        name: str,
        title: str,
        *,
        severity: str,
        needs: tuple[str, ...] = (),
        options: dict[str, Any] | None = None,
    ) -> Callable[[CheckFn], CheckFn]:
        """Registers a check. `options` are defaults that audit.toml [checks.<id>] can override."""

        def register(fn: CheckFn) -> CheckFn:
            if id in self.checks:
                raise ValueError(f"Duplicate check id {id}")
            self.checks[id] = CheckSpec(
                id=id,
                name=name,
                title=title,
                severity=check_severity(severity, id),
                fn=fn,
                audit=self.name,
                needs=needs,
                description=inspect.getdoc(fn) or "",
                options=dict(options or {}),
            )
            return fn

        return register

    # ------------------------------------------------------------------ run

    def run(self, ctx: Context, settings: Settings, only: set[str] | None = None, skip: set[str] | None = None) -> list[CheckRun]:
        runs: list[CheckRun] = []
        for spec in self.checks.values():
            options = settings.options(spec.id, spec.options)
            run = CheckRun(spec, "ran", options=options)
            runs.append(run)
            if (only and spec.id not in only) or (skip and spec.id in skip):
                run.status, run.reason = "skipped", "not selected on the command line"
                continue
            if not settings.enabled(spec.id):
                run.status, run.reason = "skipped", "disabled in audit.toml"
                continue
            missing = next((reason for need in spec.needs if (reason := ctx.unavailable(need))), None)
            if missing:
                run.status, run.reason = "skipped", missing
                continue
            reporter = Reporter(spec, ctx, options, settings.severity(spec.id))
            start = time.perf_counter()
            try:
                spec.fn(ctx, reporter)
            except SnapshotMissing:
                raise
            except Exception:
                run.status = "crashed"
                run.reason = traceback.format_exc(limit=6)
            run.seconds = time.perf_counter() - start
            run.findings = reporter.findings
        return runs

    # ----------------------------------------------------------------- main

    def main(self, argv: list[str] | None = None) -> None:
        settings = Settings()
        report = settings.report
        p = argparse.ArgumentParser(prog=f"{self.name}-audit", description=f"{self.title}. {self.description}")
        p.add_argument("--only", help="comma-separated check ids to run (e.g. S01,S05)")
        p.add_argument("--skip", help="comma-separated check ids to skip")
        p.add_argument("--list", action="store_true", help="list the checks and exit")
        p.add_argument("--show", type=int, default=report.get("show_per_check", 5), help="findings to print per check (0 = none)")
        p.add_argument("--all", action="store_true", help="print every finding, including info and waived")
        p.add_argument("--fail-on", choices=FAIL_LEVELS, default=report.get("fail_on", "error"), help="lowest unwaived severity that fails the run")
        p.add_argument("--snapshot", default=str(SNAPSHOT), help="snapshot JSON written by export-snapshot.ts")
        args = p.parse_args(argv)

        if args.list:
            self.print_catalogue(settings)
            return

        ctx = Context(snapshot_path=Path(args.snapshot))
        only = set(args.only.split(",")) if args.only else None
        skip = set(args.skip.split(",")) if args.skip else None
        unknown = ((only or set()) | (skip or set())) - set(self.checks)
        if unknown:
            p.error(f"unknown check id(s): {', '.join(sorted(unknown))}")

        started = time.perf_counter()
        try:
            snapshot = ctx.snapshot
            runs = self.run(ctx, settings, only, skip)
        except SnapshotMissing as e:
            print(f"✗ {e}", file=sys.stderr)
            sys.exit(2)
        except ValueError as e:  # bad audit.toml / waivers.toml
            print(f"✗ {e}", file=sys.stderr)
            sys.exit(2)

        waivers = Waivers()
        findings = [f for r in runs for f in r.findings]
        used = waivers.apply(findings)
        ran_ids = {r.spec.id for r in runs if r.status == "ran"}
        stale = [
            {"check": w.check, "subject": w.subject, "key": w.key, "reason": w.reason, "where": w.describe()}
            for w in waivers.entries
            if w.check in ran_ids and w.index not in used
        ]

        out = {
            "audit": self.name,
            "title": self.title,
            "description": self.description,
            "ranAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "snapshot": snapshot.generated_at,
            "partial": bool(only or skip),
            "seconds": round(time.perf_counter() - started, 2),
            "checks": [r.to_json() for r in runs],
            "staleWaivers": stale,
            "findings": [f.to_json() for f in sorted(findings, key=lambda f: (SEVERITY_RANK[f.severity], f.check, f.subject, f.key))],
        }
        FINDINGS_DIR.mkdir(parents=True, exist_ok=True)
        path = FINDINGS_DIR / f"{self.name}.json"
        path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

        code = self.print_summary(runs, stale, args, path, snapshot.generated_at)
        sys.exit(code)

    # -------------------------------------------------------------- output

    def print_catalogue(self, settings: Settings) -> None:
        print(f"{self.title} ({self.name})")
        for spec in self.checks.values():
            state = "" if settings.enabled(spec.id) else "  [disabled]"
            sev = settings.severity(spec.id) or spec.severity
            needs = f"  needs: {', '.join(spec.needs)}" if spec.needs else ""
            print(f"  {spec.id}  {spec.name:<28} {sev:<8}{needs}{state}")
            print(f"        {spec.title}")
            opts = settings.options(spec.id, spec.options)
            if opts:
                print(f"        options: {', '.join(f'{k}={v!r}' for k, v in opts.items())}")

    def print_summary(self, runs: list[CheckRun], stale: list[dict[str, Any]], args: argparse.Namespace, path: Path, snapshot_at: str) -> int:
        tty = sys.stdout.isatty()

        def c(kind: str, text: str) -> str:
            return f"{COLOR[kind]}{text}{COLOR['end']}" if tty else text

        print(c("bold", f"{self.title}") + c("dim", f"  (snapshot {snapshot_at})"))
        for r in runs:
            n = r.counts()
            if r.status == "ran":
                parts = [c(s, f"{n[s]} {s}") if n[s] else c("dim", f"0 {s}") for s in SEVERITIES]
                waived = c("dim", f"  {n['waived']} waived") if n["waived"] else ""
                status = "  ".join(parts) + waived + c("dim", f"  {r.seconds:.1f}s")
            elif r.status == "skipped":
                status = c("dim", f"skipped: {r.reason}")
            else:
                status = c("error", "CRASHED (see below)")
            print(f"  {r.spec.id} {r.spec.name:<28} {status}")

        for r in runs:
            if r.status == "crashed":
                print(c("error", f"\n{r.spec.id} crashed:\n{r.reason}"))

        shown_any = False
        for r in runs:
            visible = [f for f in r.findings if args.all or (not f.waived and f.severity != "info")]
            if not visible or args.show == 0:
                continue
            if not shown_any:
                print()
                shown_any = True
            limit = len(visible) if args.all else args.show
            print(c("bold", f"{r.spec.id} {r.spec.title}"))
            for f in visible[:limit]:
                icon = "=" if f.waived else ICON[f.severity]
                print(f"  {c(f.severity if not f.waived else 'dim', icon)} {f.subject}  {f.message}")
                if f.location:
                    print(c("dim", f"      {f.location}"))
                if f.hint:
                    print(c("dim", f"      → {f.hint}"))
                if f.waived:
                    print(c("dim", f"      ({f.waived})"))
            if len(visible) > limit:
                print(c("dim", f"  … {len(visible) - limit} more (--all, or see the report)"))

        for w in stale:
            print(c("warning", f"! stale waiver (matches nothing): {w['where']}"))

        totals = {s: 0 for s in SEVERITIES} | {"waived": 0}
        for r in runs:
            for k, v in r.counts().items():
                totals[k] += v
        crashed = [r for r in runs if r.status == "crashed"]
        failed = any(failing(f.severity, args.fail_on) for r in runs for f in r.findings if not f.waived)
        verdict = "CRASHED" if crashed else ("FAIL" if failed else ("DONE" if args.fail_on == "never" else "PASS"))
        summary = ", ".join(f"{totals[s]} {s}" for s in SEVERITIES) + f", {totals['waived']} waived"
        print(f"\n{c('bold', verdict)} — {summary} (fails on: {args.fail_on})")
        print(c("dim", f"Findings: {path.relative_to(ROOT)}"))
        return 2 if crashed else (1 if failed else 0)
