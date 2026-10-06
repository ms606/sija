"""
Merges the audits' findings (out/findings/*.json) into one report:

    out/report.md     summary, findings by severity and check, links to the source
    out/report.html   the same, filterable (open it in a browser)
    out/report.json   everything, for tooling and for the next run's comparison

It marks findings that are new since the previous report and lists the ones
that were resolved, warns about stale waivers and about audits run on
different snapshots, and exits 1 when unwaived findings reach `fail_on`.

    tools/morph-oracle/.venv/bin/python tools/audit/generate-report.py [--run-audits] [--fail-on warning]

`--run-audits` runs the three audits first (as `npm run audit:grammar` does).
"""
import argparse
import html
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from framework.audit import FAIL_LEVELS, failing
from framework.config import Settings
from framework.model import SEVERITIES, SEVERITY_RANK
from framework.paths import AUDIT_DIR, FINDINGS_DIR, OUT_DIR, ROOT

AUDITS = ["vocabulary", "morphology", "sentence"]
REPORT_JSON = OUT_DIR / "report.json"


def run_audits() -> None:
    for name in AUDITS:
        print(f"\n▶ {name}-audit.py", flush=True)
        # Audits exit 1 on findings; the report decides the overall result.
        code = subprocess.call([sys.executable, str(AUDIT_DIR / f"{name}-audit.py"), "--show", "0", "--fail-on", "never"])
        if code not in (0, 1):
            print(f"  {name} audit exited with {code}", file=sys.stderr)


def load_audits() -> list[dict]:
    out = []
    for name in AUDITS:
        path = FINDINGS_DIR / f"{name}.json"
        if path.exists():
            out.append(json.loads(path.read_text(encoding="utf-8")))
    return out


def unwaived(findings: list[dict]) -> list[dict]:
    return [f for f in findings if not f.get("waived")]


def human_review(findings: list[dict]) -> dict:
    """Every native-review group (check M10) with its status, and the totals."""
    groups = [
        {"id": f["key"], "title": f["evidence"].get("title", f["key"]), "priority": f["evidence"].get("priority", "—"),
         "forms": f["evidence"].get("count", 0), "status": f["evidence"].get("status", "NEEDS CORRECTION" if f["key"] == "unexplained" else "PENDING")}
        for f in findings if f["check"] == "M10"
    ]
    order = {"NEEDS CORRECTION": 0, "PENDING": 1, "VERIFIED": 2}
    groups.sort(key=lambda g: (order[g["status"]], {"High": 0, "Medium": 1}.get(g["priority"], 2), g["id"]))

    def count(status=None):
        sel = [g for g in groups if status is None or g["status"] == status]
        return len(sel), sum(g["forms"] for g in sel)

    reviewed = [g for g in groups if g["status"] != "PENDING"]
    return {
        "groups": groups,
        "total": count(),
        "reviewed": (len(reviewed), sum(g["forms"] for g in reviewed)),
        "verified": count("VERIFIED"),
        "needsCorrection": count("NEEDS CORRECTION"),
        "pending": count("PENDING"),
    }


def verification(checks: list[dict], findings: list[dict], notes: list[str]) -> dict:
    """The project counts as verified only when every criterion holds. This is separate from
    PASS/FAIL: a run can pass (no errors) while forms still await native-speaker review."""
    open_ = unwaived(findings)
    engine = [f for f in open_ if f["audit"] == "morphology" and f["severity"] == "error" and f["check"] != "M10"]
    unexplained = [f for f in open_ if f["check"] in ("M01", "M02", "M03", "M04") and f["severity"] != "info"]
    review = [f for f in open_ if f["check"] == "M10"]
    hr = human_review(findings)
    m10_ran = any(c["id"] == "M10" and c["status"] == "ran" for c in checks)
    other = [f for f in open_ if f["severity"] in ("error", "warning") and f not in engine + unexplained + review]
    not_ran = [c["id"] for c in checks if c["status"] != "ran"]
    criteria = [
        ("No engine errors", not engine, f"{len(engine)} open morphology error(s)"),
        ("No unexplained morphology differences", not unexplained, f"{len(unexplained)} difference(s) with the oracle neither fixed nor adjudicated"),
        ("Every critical learner-facing form reviewed by a native speaker",
         m10_ran and not review and hr["total"][0] == hr["verified"][0],
         f"{hr['verified'][0]}/{hr['total'][0]} groups verified; {hr['needsCorrection'][0]} need correction, {hr['pending'][0]} pending "
         f"({hr['pending'][1]} of {hr['total'][1]} forms) — docs/NATIVE_REVIEW.md"),
        ("No other open errors or warnings", not other, f"{len(other)} open finding(s)"),
        ("Every check ran, on one snapshot", not not_ran and not notes, ", ".join(not_ran + notes) or ""),
    ]
    return {
        "status": "VERIFIED" if all(ok for _, ok, _ in criteria) else "NOT VERIFIED",
        "criteria": [{"label": label, "ok": ok, "detail": "" if ok else detail} for label, ok, detail in criteria],
    }


def main() -> None:
    settings = Settings()
    rep = settings.report
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0].strip(), formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--run-audits", action="store_true", help="run the vocabulary, morphology and sentence audits first")
    p.add_argument("--fail-on", choices=FAIL_LEVELS, default=rep.get("fail_on", "error"))
    p.add_argument("--compare", type=Path, default=REPORT_JSON, help="earlier report.json to compare with (default: the previous report)")
    p.add_argument("--per-check", type=int, default=rep.get("report_per_check", 50), help="findings per check in report.md")
    p.add_argument("--require-verified", action="store_true", help="also exit 1 unless the verification status is VERIFIED")
    args = p.parse_args()

    if args.run_audits:
        run_audits()
    audits = load_audits()
    if not audits:
        sys.exit("No findings in tools/audit/out/findings. Run the audits first (npm run audit:grammar).")

    previous = json.loads(args.compare.read_text(encoding="utf-8")) if args.compare.exists() else None
    before = {f["fingerprint"] for f in unwaived(previous["findings"])} if previous else None

    findings, checks, notes = [], [], []
    for a in audits:
        for c in a["checks"]:
            checks.append({**c, "audit": a["audit"]})
        for f in a["findings"]:
            f["audit"] = a["audit"]
            f["new"] = before is not None and not f.get("waived") and f["fingerprint"] not in before
            findings.append(f)
        if a.get("partial"):
            notes.append(f"The {a['audit']} audit ran only some checks (--only/--skip).")
        for w in a.get("staleWaivers", []):
            notes.append(f"Stale waiver, matches nothing: {w['where']} — {w['reason']}")
    missing = [n for n in AUDITS if n not in {a["audit"] for a in audits}]
    if missing:
        notes.append(f"No findings file for: {', '.join(missing)}.")
    if len({a["snapshot"] for a in audits}) > 1:
        notes.append("The audits ran on different snapshots: " + ", ".join(f"{a['audit']} {a['snapshot']}" for a in audits) + ".")

    now = {f["fingerprint"] for f in unwaived(findings)}
    resolved = [f for f in unwaived(previous["findings"]) if f["fingerprint"] not in now] if previous else []

    totals = {s: 0 for s in SEVERITIES} | {"waived": 0}
    for f in findings:
        totals["waived" if f.get("waived") else f["severity"]] += 1
    crashed = [c for c in checks if c["status"] == "crashed"]
    failed = any(failing(f["severity"], args.fail_on) for f in unwaived(findings))
    verdict = "CRASHED" if crashed else ("FAIL" if failed else ("DONE" if args.fail_on == "never" else "PASS"))

    report = {
        "verification": verification(checks, findings, notes),
        "humanReview": human_review(findings),
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "snapshot": audits[0]["snapshot"],
        "verdict": verdict,
        "failOn": args.fail_on,
        "totals": totals,
        "comparedWith": previous["generatedAt"] if previous else None,
        "new": sum(1 for f in findings if f["new"]),
        "resolved": resolved,
        "notes": notes,
        "audits": [{k: a[k] for k in ("audit", "title", "description", "ranAt", "seconds", "partial")} for a in audits],
        "checks": checks,
        "findings": sorted(findings, key=lambda f: (bool(f.get("waived")), SEVERITY_RANK[f["severity"]], f["check"], f["subject"], f["key"] if "key" in f else "")),
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT_DIR / "report.md").write_text(markdown(report, args.per_check), encoding="utf-8")
    (OUT_DIR / "report.html").write_text(html_page(report), encoding="utf-8")

    print(f"\n{verdict} — " + ", ".join(f"{totals[s]} {s}" for s in SEVERITIES) + f", {totals['waived']} waived (fails on: {args.fail_on})")
    v = report["verification"]
    print(f"Verification: {v['status']}")
    for c in v["criteria"]:
        print(f"  {'✓' if c['ok'] else '✗'} {c['label']}" + (f" — {c['detail']}" if c["detail"] else ""))
    print_human_review(report["humanReview"])
    if previous:
        print(f"Since {previous['generatedAt']}: {report['new']} new, {len(resolved)} resolved")
    for n in notes:
        print(f"! {n}")
    print(f"Report: {(OUT_DIR / 'report.md').relative_to(ROOT)}  ·  {(OUT_DIR / 'report.html').relative_to(ROOT)}")
    if any(c["id"] == "M10" and c["status"] == "ran" for c in checks):
        packet = load_script("native-review").write_packet()
        print(f"Review packet: {packet.relative_to(ROOT)}")
    unverified = args.require_verified and v["status"] != "VERIFIED"
    sys.exit(2 if crashed else (1 if failed or unverified else 0))


STATUS_MARK = {"VERIFIED": "✅", "NEEDS CORRECTION": "❌", "PENDING": "⏳"}


def print_human_review(hr: dict) -> None:
    if not hr["groups"]:
        return
    from framework.review import reviews_path

    path = reviews_path()
    shown = path.relative_to(ROOT) if path.is_relative_to(ROOT) else f"{path} — DRY RUN, not the record"
    print(f"Human review — {hr['reviewed'][0]}/{hr['total'][0]} groups, {hr['reviewed'][1]}/{hr['total'][1]} forms reviewed ({shown}):")
    for g in hr["groups"]:
        print(f"  {STATUS_MARK[g['status']]} {g['status']:<16} {g['priority']:<6} {g['forms']:>4} forms  {g['id']}")


def load_script(name: str):
    """Imports a sibling script with a hyphen in its name (native-review.py)."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), AUDIT_DIR / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# ---------------------------------------------------------------------------
# Markdown


def md_link(location: str | None) -> str:
    if not location:
        return ""
    path, _, line = location.rpartition(":")
    rel = Path("../../..") / path  # report.md lives in tools/audit/out/
    return f"[{Path(path).name}:{line}]({rel.as_posix()}#L{line})"


def md_escape(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def markdown(r: dict, per_check: int) -> str:
    t = r["totals"]
    out = [
        "# Grammar audit report",
        "",
        f"Generated {r['generatedAt']} from the snapshot of {r['snapshot']}.",
        "",
        f"**{r['verdict']}** — {t['error']} errors, {t['warning']} warnings, {t['info']} info, {t['waived']} waived (fails on: {r['failOn']}).",
    ]
    if r["comparedWith"]:
        out.append(f"Since the report of {r['comparedWith']}: **{r['new']} new**, {len(r['resolved'])} resolved.")
    for n in r["notes"]:
        out.append(f"\n> ⚠️ {n}")
    v = r["verification"]
    out += ["", f"## Verification status: {v['status']}", ""]
    out += [f"- [{'x' if c['ok'] else ' '}] {c['label']}" + (f" — {md_escape(c['detail'])}" if c["detail"] else "") for c in v["criteria"]]
    hr = r["humanReview"]
    if hr["groups"]:
        out += ["", "## Human review", "",
                f"{hr['reviewed'][0]}/{hr['total'][0]} groups and {hr['reviewed'][1]}/{hr['total'][1]} forms reviewed by a native speaker "
                f"(verdicts in `tools/audit/reviews.toml`; the packet is [docs/NATIVE_REVIEW.md](../../../docs/NATIVE_REVIEW.md)).", "",
                "| Status | Priority | Group | Forms |", "|---|---|---|--:|"]
        out += [f"| {STATUS_MARK[g['status']]} {g['status']} | {g['priority']} | `{g['id']}` {md_escape(g['title'])} | {g['forms']} |" for g in hr["groups"]]

    out += ["", "## Checks", "", "| Check | | Errors | Warnings | Info | Waived | Status |", "|---|---|--:|--:|--:|--:|---|"]
    for c in r["checks"]:
        n = c["counts"]
        status = {"ran": f"{c['seconds']}s", "skipped": f"skipped: {c['reason']}", "crashed": "**crashed**"}[c["status"]]
        cells = [str(n[s]) if n[s] else "·" for s in (*SEVERITIES, "waived")]
        out.append(f"| {c['id']} `{c['name']}` | {md_escape(c['title'])} | " + " | ".join(cells) + f" | {md_escape(status)} |")

    by_check = {c["id"]: c for c in r["checks"]}
    for sev, heading in (("error", "Errors"), ("warning", "Warnings"), ("info", "Info")):
        group = [f for f in r["findings"] if f["severity"] == sev and not f.get("waived")]
        if not group:
            continue
        out += ["", f"## {heading} ({len(group)})"]
        for cid in dict.fromkeys(f["check"] for f in group):
            items = [f for f in group if f["check"] == cid]
            c = by_check[cid]
            out += ["", f"### {cid} {c['title']} ({len(items)})", "", f"<sub>{md_escape(c['description'])}</sub>", ""]
            limit = per_check if sev != "info" else min(per_check, 15)
            for f in items[:limit]:
                new = " 🆕" if f.get("new") else ""
                link = md_link(f.get("location"))
                out.append(f"- `{f['subject']}`{new} {md_escape(f['message'])}" + (f" — {link}" if link else ""))
                if f.get("hint"):
                    out.append(f"  - → {md_escape(f['hint'])}")
            if len(items) > limit:
                out.append(f"- … {len(items) - limit} more in report.html / report.json")

    waived = [f for f in r["findings"] if f.get("waived")]
    if waived:
        out += ["", f"## Waived ({len(waived)})", "", "| Check | Reason | Findings |", "|---|---|--:|"]
        reasons: dict[tuple[str, str], int] = {}
        for f in waived:
            reason = f["waived"]
            # Group per-form oracle defects by their general reason.
            if "known oracle defect" in reason and "“" in reason:
                reason = reason.split("“")[0] + "…"
            reasons[(f["check"], reason)] = reasons.get((f["check"], reason), 0) + 1
        for (cid, reason), n in sorted(reasons.items(), key=lambda kv: (-kv[1], kv[0])):
            out.append(f"| {cid} | {md_escape(reason)} | {n} |")

    if r["resolved"]:
        out += ["", f"## Resolved since the last report ({len(r['resolved'])})", ""]
        out += [f"- {f['check']} `{f['subject']}` {md_escape(f['message'])}" for f in r["resolved"][:per_check]]

    out += ["", "## Check catalogue", ""]
    for c in r["checks"]:
        needs = f" Needs: {', '.join(c['needs'])}." if c["needs"] else ""
        opts = f" Options: {', '.join(f'`{k}={v}`' for k, v in c['options'].items())}." if c["options"] else ""
        out.append(f"- **{c['id']} {c['name']}** ({c['audit']}, {c['severity']}) — {md_escape(c['description'])}{needs}{opts}")
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------------------
# HTML


def html_page(r: dict) -> str:
    data = json.dumps({**r, "root": str(ROOT)}, ensure_ascii=False).replace("</", "<\\/")
    t = r["totals"]
    title = f"Grammar audit — {r['verdict']}"
    return HTML.replace("{{TITLE}}", html.escape(title)).replace("{{DATA}}", data).replace(
        "{{SUMMARY}}", html.escape(f"{t['error']} errors · {t['warning']} warnings · {t['info']} info · {t['waived']} waived")
    )


HTML = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<style>
:root {
  --bg: #fafaf9; --panel: #ffffff; --text: #1c1917; --muted: #78716c; --line: #e7e5e4;
  --error: #b91c1c; --error-bg: #fef2f2; --warning: #a16207; --warning-bg: #fefce8;
  --info: #0e7490; --info-bg: #ecfeff; --waived: #57534e; --waived-bg: #f5f5f4; --accent: #4f46e5;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0c0a09; --panel: #1c1917; --text: #f5f5f4; --muted: #a8a29e; --line: #292524;
    --error: #f87171; --error-bg: #2a1212; --warning: #facc15; --warning-bg: #2a2410;
    --info: #22d3ee; --info-bg: #0b2529; --waived: #a8a29e; --waived-bg: #232120; --accent: #a5b4fc;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 22px; margin: 0 0 4px; }
.meta { color: var(--muted); margin: 0 0 20px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
.card b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; }
.card span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
.card.error b { color: var(--error); } .card.warning b { color: var(--warning); } .card.info b { color: var(--info); }
.verdict { display: inline-block; padding: 2px 10px; border-radius: 999px; font-weight: 600; margin-right: 8px; }
.verdict.PASS { background: #dcfce7; color: #166534; } .verdict.FAIL { background: var(--error-bg); color: var(--error); }
.verdict.CRASHED { background: var(--error); color: white; }
.verdict.DONE { background: var(--waived-bg); color: var(--text); }
.criteria { margin: 0 0 16px; padding: 12px 14px; list-style: none; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; }
.criteria li { padding: 2px 0; } .criteria .ok { color: var(--muted); } .criteria .no { font-weight: 600; }
.criteria h2 { font-size: 15px; margin: 0 0 6px; }
.notes { margin: 0 0 16px; padding: 0; list-style: none; }
.notes li { background: var(--warning-bg); color: var(--warning); border-radius: 8px; padding: 8px 12px; margin-bottom: 6px; }
.filters { position: sticky; top: 0; z-index: 2; background: var(--bg); padding: 10px 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; border-bottom: 1px solid var(--line); margin-bottom: 12px; }
.filters label { display: inline-flex; gap: 4px; align-items: center; color: var(--muted); }
.filters input[type=search], .filters select { background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; font: inherit; }
.filters input[type=search] { flex: 1 1 220px; min-width: 0; }
.count { color: var(--muted); margin-left: auto; }
details.check { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; margin-bottom: 10px; }
details.check > summary { cursor: pointer; padding: 10px 14px; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; list-style: none; }
details.check > summary::-webkit-details-marker { display: none; }
details.check > summary .id { font-weight: 700; font-family: ui-monospace, Menlo, monospace; }
details.check > summary .title { font-weight: 600; flex: 1 1 280px; }
.desc { color: var(--muted); padding: 0 14px 8px; margin: 0; max-width: 80ch; }
.pill { border-radius: 999px; padding: 0 8px; font-size: 12px; font-weight: 600; }
.pill.error { background: var(--error-bg); color: var(--error); } .pill.warning { background: var(--warning-bg); color: var(--warning); }
.pill.info { background: var(--info-bg); color: var(--info); } .pill.waived { background: var(--waived-bg); color: var(--waived); }
.pill.new { background: var(--accent); color: var(--panel); }
ul.findings { list-style: none; margin: 0; padding: 0 0 6px; }
ul.findings li { border-top: 1px solid var(--line); padding: 8px 14px; display: grid; grid-template-columns: 16px 1fr; gap: 0 8px; }
.dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 7px; }
.dot.error { background: var(--error); } .dot.warning { background: var(--warning); } .dot.info { background: var(--info); } .dot.waived { background: var(--waived); }
.subject { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
.msg { overflow-wrap: anywhere; }
.hint, .waived-reason { color: var(--muted); font-size: 13px; }
.hint::before { content: "→ "; }
a { color: var(--accent); }
pre { margin: 4px 0 0; font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--muted); }
.more { padding: 8px 14px; }
button { font: inherit; background: none; border: 1px solid var(--line); color: var(--text); border-radius: 8px; padding: 4px 10px; cursor: pointer; }
.empty { color: var(--muted); padding: 24px; text-align: center; }
</style>
</head>
<body>
<main>
  <h1>Grammar audit</h1>
  <p class="meta" id="meta"></p>
  <div class="cards" id="cards"></div>
  <ul class="criteria" id="criteria"></ul>
  <ul class="notes" id="notes"></ul>
  <div class="filters">
    <label><input type="checkbox" data-sev="error" checked> Errors</label>
    <label><input type="checkbox" data-sev="warning" checked> Warnings</label>
    <label><input type="checkbox" data-sev="info"> Info</label>
    <label><input type="checkbox" data-sev="waived"> Waived</label>
    <label><input type="checkbox" id="newOnly"> New only</label>
    <select id="audit"><option value="">All audits</option></select>
    <input type="search" id="q" placeholder="Search subject, message, word…" aria-label="Search findings">
    <span class="count" id="count"></span>
  </div>
  <div id="list"></div>
</main>
<script type="application/json" id="data">{{DATA}}</script>
<script>
const R = JSON.parse(document.getElementById("data").textContent);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PAGE = 100;

$("meta").innerHTML = `<span class="verdict ${R.verdict}">${R.verdict}</span>Generated ${esc(R.generatedAt)} · snapshot ${esc(R.snapshot)} · fails on ${esc(R.failOn)}` +
  (R.comparedWith ? ` · since ${esc(R.comparedWith)}: <b>${R.new} new</b>, ${R.resolved.length} resolved` : "");
const T = R.totals;
$("cards").innerHTML = [["error", "Errors"], ["warning", "Warnings"], ["info", "Info"], ["waived", "Waived"]]
  .map(([k, label]) => `<div class="card ${k}"><b>${T[k]}</b><span>${label}</span></div>`).join("") +
  `<div class="card"><b>${R.checks.filter((c) => c.status === "ran").length}/${R.checks.length}</b><span>Checks ran</span></div>`;
$("criteria").innerHTML = `<h2>Verification status: ${esc(R.verification.status)}</h2>` + R.verification.criteria
  .map((c) => `<li class="${c.ok ? "ok" : "no"}">${c.ok ? "✓" : "✗"} ${esc(c.label)}${c.detail ? ` — ${esc(c.detail)}` : ""}</li>`).join("");
$("notes").innerHTML = R.notes.map((n) => `<li>${esc(n)}</li>`).join("") +
  (R.humanReview.groups.length ? `<li><b>Human review: ${R.humanReview.reviewed[0]}/${R.humanReview.total[0]} groups, ` +
    `${R.humanReview.reviewed[1]}/${R.humanReview.total[1]} forms reviewed</b> — ` +
    ["VERIFIED", "NEEDS CORRECTION", "PENDING"].map((s) => `${R.humanReview.groups.filter((g) => g.status === s).length} ${s.toLowerCase()}`).join(", ") +
    ` (search “review:” below)</li>` : "") +
  R.checks.filter((c) => c.status !== "ran").map((c) => `<li>${esc(c.id)} ${c.status}: ${esc(c.reason.split("\n")[0])}</li>`).join("");
for (const a of R.audits) $("audit").insertAdjacentHTML("beforeend", `<option value="${esc(a.audit)}">${esc(a.title)}</option>`);

const kind = (f) => (f.waived ? "waived" : f.severity);
function link(loc) {
  if (!loc) return "";
  const i = loc.lastIndexOf(":");
  return ` · <a href="vscode://file/${encodeURI(R.root + "/" + loc.slice(0, i))}:${loc.slice(i + 1)}">${esc(loc)}</a>`;
}
function row(f) {
  const evidence = Object.fromEntries(Object.entries(f.evidence ?? {}).filter(([, v]) => v !== false && !(Array.isArray(v) && !v.length)));
  const ev = Object.keys(evidence).length ? `<pre>${esc(JSON.stringify(evidence))}</pre>` : "";
  return `<li><span class="dot ${kind(f)}"></span><div>
    <div class="subject">${esc(f.subject)}${f.new ? ' <span class="pill new">new</span>' : ""}${link(f.location)}</div>
    <div class="msg">${esc(f.message)}</div>
    ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}
    ${f.waived ? `<div class="waived-reason">Waived — ${esc(f.waived)}</div>` : ""}${ev}</div></li>`;
}
function render() {
  const sev = new Set([...document.querySelectorAll("[data-sev]")].filter((c) => c.checked).map((c) => c.dataset.sev));
  const audit = $("audit").value, q = $("q").value.trim().toLowerCase(), newOnly = $("newOnly").checked;
  const shown = R.findings.filter((f) => sev.has(kind(f)) && (!audit || f.audit === audit) && (!newOnly || f.new) &&
    (!q || `${f.subject} ${f.message} ${f.key ?? ""} ${f.hint ?? ""}`.toLowerCase().includes(q)));
  $("count").textContent = `${shown.length} of ${R.findings.length} findings`;
  const groups = new Map();
  for (const f of shown) (groups.get(f.check) ?? groups.set(f.check, []).get(f.check)).push(f);
  // Most severe first: checks with errors, then warnings, info, waived; report order within each.
  const RANK = { error: 0, warning: 1, info: 2, waived: 3 };
  const worst = (id) => Math.min(...groups.get(id).map((f) => RANK[kind(f)]));
  const checks = R.checks.filter((c) => groups.has(c.id)).sort((a, b) => worst(a.id) - worst(b.id));
  $("list").innerHTML = checks.length ? checks.map((c) => {
    const items = groups.get(c.id);
    const pills = ["error", "warning", "info", "waived"].map((k) => [k, items.filter((f) => kind(f) === k).length]).filter(([, n]) => n)
      .map(([k, n]) => `<span class="pill ${k}">${n} ${k}</span>`).join(" ");
    const open = items.some((f) => kind(f) === "error") || checks.length <= 3 ? " open" : "";
    return `<details class="check"${open} data-id="${esc(c.id)}"><summary><span class="id">${esc(c.id)}</span><span class="title">${esc(c.title)}</span>${pills}</summary>
      <p class="desc">${esc(c.description.replace(/\s*\n\s*/g, " "))}</p><ul class="findings">${items.slice(0, PAGE).map(row).join("")}</ul>
      ${items.length > PAGE ? `<div class="more"><button data-more="${esc(c.id)}">Show all ${items.length}</button></div>` : ""}</details>`;
  }).join("") : `<p class="empty">No findings match.</p>`;
  for (const b of document.querySelectorAll("[data-more]")) b.onclick = () => {
    b.closest("details").querySelector("ul").innerHTML = groups.get(b.dataset.more).map(row).join("");
    b.parentElement.remove();
  };
}
for (const el of document.querySelectorAll(".filters input, .filters select")) el.addEventListener("input", render);
render();
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
