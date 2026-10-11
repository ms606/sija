"""
Runs the whole verification and prints the final summary (`npm run verify:all`):
the automated checks, then the native-speaker review recorded in
tools/audit/reviews.toml. The final status is VERIFIED only when every
automated check passes and every review group is verified.

    tools/morph-oracle/.venv/bin/python tools/audit/verify-all.py [--skip-e2e]

Each step's output is saved in tools/audit/out/logs/; the summary in
tools/audit/out/verification-summary.txt (and .json).
"""
import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone

from framework.paths import OUT_DIR, ROOT

STEPS = [
    ("Kotus", "kotus", ["npm", "run", "verify:kotus"]),
    ("Morphology oracle", "morph-oracle", ["npm", "run", "verify:morph"]),
    ("Golden tests", "golden", ["npx", "vitest", "run", "src/grammar/__tests__/golden.test.ts"]),
    ("Grammar audit", "grammar-audit", ["npm", "run", "audit:grammar"]),
    ("Explanation audit", "explanation-audit", ["npm", "run", "audit:explanations"]),
    ("E2E", "e2e", ["npm", "run", "e2e"]),
]


def run(slug: str, cmd: list[str]) -> tuple[str, float]:
    log = OUT_DIR / "logs" / f"{slug}.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    start = time.perf_counter()
    with log.open("w", encoding="utf-8") as f:
        code = subprocess.call(cmd, cwd=ROOT, stdout=f, stderr=subprocess.STDOUT)
    return ("PASS" if code == 0 else "FAIL"), time.perf_counter() - start


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0].strip())
    p.add_argument("--skip-e2e", action="store_true", help="skip the end-to-end tests (the final status then cannot be VERIFIED)")
    args = p.parse_args()

    results = {}
    for label, slug, cmd in STEPS:
        if slug == "e2e" and args.skip_e2e:
            results[label] = {"result": "SKIPPED", "seconds": 0, "log": None}
            continue
        print(f"▶ {label} …", end=" ", flush=True)
        result, seconds = run(slug, cmd)
        results[label] = {"result": result, "seconds": round(seconds, 1), "log": f"tools/audit/out/logs/{slug}.log"}
        print(f"{result} ({seconds:.0f}s)")

    report_path = OUT_DIR / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {}
    hr = report.get("humanReview") or {"total": [0, 0], "reviewed": [0, 0], "verified": [0, 0], "needsCorrection": [0, 0], "pending": [0, 0], "groups": []}
    audit_verified = report.get("verification", {}).get("status") == "VERIFIED"
    automated_ok = all(r["result"] == "PASS" for r in results.values())
    final = "VERIFIED" if automated_ok and audit_verified else "NOT VERIFIED"

    lines = ["AUTOMATED VERIFICATION"]
    lines += [f"{label}: {r['result']}" for label, r in results.items()]
    lines += [
        "",
        "HUMAN REVIEW",
        f"Groups reviewed: {hr['reviewed'][0]}/{hr['total'][0]}",
        f"Forms reviewed: {hr['reviewed'][1]}/{hr['total'][1]}",
        f"Correct: {hr['verified'][0]} groups, {hr['verified'][1]} forms",
        f"Needs correction: {hr['needsCorrection'][0]} groups, {hr['needsCorrection'][1]} forms",
        f"Pending: {hr['pending'][0]} groups, {hr['pending'][1]} forms",
        "",
        "FINAL STATUS",
        final,
    ]
    if final != "VERIFIED":
        why = [f"{label} {r['result'].lower()}" for label, r in results.items() if r["result"] != "PASS"]
        why += [c["label"].lower() + f" ({c['detail']})" for c in report.get("verification", {}).get("criteria", []) if not c["ok"]]
        lines += ["", "Why not verified:", *[f"- {w}" for w in why]]
    summary = "\n".join(lines)
    print("\n" + summary)

    (OUT_DIR / "verification-summary.txt").write_text(summary + "\n", encoding="utf-8")
    (OUT_DIR / "verification-summary.json").write_text(json.dumps({
        "ranAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "automated": results,
        "humanReview": {k: hr[k] for k in ("total", "reviewed", "verified", "needsCorrection", "pending")},
        "groups": hr["groups"],
        "final": final,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    sys.exit(0 if final == "VERIFIED" else 1)


if __name__ == "__main__":
    main()
