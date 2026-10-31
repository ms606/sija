#!/usr/bin/env python3
"""Markdown tables for the research documents, generated from data/statistics.csv and data/sensitivity.json (no network)."""
import csv, json, os, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, "data")
OUT = os.path.join(HERE, "report_tables")
os.makedirs(OUT, exist_ok=True)
rows = list(csv.DictReader(open(os.path.join(D, "statistics.csv"), encoding="utf-8")))
sens = json.load(open(os.path.join(D, "sensitivity.json")))
full = json.load(open(os.path.join(D, "full_list_summary.json")))


def f(x, nd=1):
    if x in ("", None):
        return "–"
    v = float(x)
    return f"{v:,.{nd}f}" if v >= 10 or nd == 0 else f"{v:.2f}"


def pct(x):
    return "–" if x in ("", None) else f"{100*float(x):.0f}"


# ---------------- data-quality table (all nouns), grouped by confidence
order = {"unsuitable": 0, "approximate": 1, "usable": 2}
lines = ["| Lemma | Raw N | Pooled /M | Parts A · B · C /M | DP | Body % | Other POS % | Cap. lemma % | Top form (%) | Adjusted /M (rules) | Unresolved | Flags | Confidence (basis) |",
         "|---|--:|--:|---|--:|--:|--:|--:|---|---|--:|---|---|"]
for r in sorted(rows, key=lambda r: (order[r["confidence"]], r["lemma"])):
    flags = " ".join(x for x in r["flags"].split() if not x.startswith("adjusted:"))
    adj = f"{f(r['adj_pooled_pm'])} ({r['adj_rules']})" if r["adj_rules"] else "–"
    basis = "context + auto" if r["context_checked"] else "auto"
    cells = [r["lemma"], f"{int(r['raw_total']):,}", f(r["raw_pooled_pm"]),
             f"{f(r['raw_part_A_pm'])} · {f(r['raw_part_B_pm'])} · {f(r['raw_part_C_pm'])}",
             f(r["raw_dp_years"], 2), pct(r["body_share_of_hits"]), pct(r["other_pos_share"]), pct(r["caplemma_share"]),
             f"*{r['top_form']}* ({pct(r['top_form_share'])})" if r["top_form"] else "–", adj,
             f"{int(r['unresolved_total']):,}" if r["unresolved_total"] else "–", flags or "–", f"{r['confidence']} ({basis})"]
    lines.append("| " + " | ".join(cells) + " |")
open(os.path.join(OUT, "dq_table.md"), "w").write("\n".join(lines) + "\n")

# ---------------- summary counts
conf = sens["confidence"]
flagc = sens["flags"]
summ = ["| Confidence | Nouns |", "|---|--:|"] + [f"| {k} | {conf.get(k,0)} |" for k in ["usable", "approximate", "unsuitable"]]
summ += ["", "| Flag | Nouns |", "|---|--:|"] + [f"| `{k}` | {v} |" for k, v in sorted(flagc.items(), key=lambda x: -x[1])]
ctx = sum(1 for r in rows if r["context_checked"])
summ += ["", f"Context-checked by an AI reader: {ctx} nouns; automatic checks only: {len(rows)-ctx} nouns."]
open(os.path.join(OUT, "dq_summary.md"), "w").write("\n".join(summ) + "\n")

# ---------------- sensitivity tables
meth = ["pooled", "A", "B", "C", "median_parts", "median_years", "min_part", "body_pooled"]
label = {"pooled": "Pooled 2011–2024", "A": "Part A 2011–2018", "B": "Part B 2019–2021", "C": "Part C 2022–2024",
         "median_parts": "Median of the three parts", "median_years": "Median of the 14 years", "min_part": "Lowest part", "body_pooled": "Pooled, body text only"}
bt = ["| Statistic | F1 (≥100/M) | F2 (10–100) | F3 (1–10) | F4 (<1) | absent | Band differs from pooled |", "|---|--:|--:|--:|--:|--:|--:|"]
for m in meth:
    b = sens["band_counts"][m]
    bt.append(f"| {label[m]} | {b['F1']} | {b['F2']} | {b['F3']} | {b['F4']} | {b['F0']} | {'–' if m=='pooled' else sens['band_changes_vs_pooled'][m]} |")
open(os.path.join(OUT, "band_sensitivity.md"), "w").write("\n".join(bt) + "\n")

rk = ["| Statistic | ≤500 | ≤1,000 | ≤2,000 | ≤5,000 | ≤10,000 | Spearman vs pooled | Median rank shift vs pooled |", "|---|--:|--:|--:|--:|--:|--:|--:|"]
for m in ["pooled", "A", "B", "C", "median_parts", "median_years"]:
    c = sens["rank_counts"][m]
    sp = "–" if m == "pooled" else f"{sens['spearman'][m]:.3f}"
    sh = "–" if m == "pooled" else f"{sens['median_abs_rank_shift_vs_pooled'][m]:,.0f}"
    rk.append(f"| {label[m]} | {c['500']} | {c['1000']} | {c['2000']} | {c['5000']} | {c['10000']} | {sp} | {sh} |")
rk += ["", "| Statistic | crosses 500 | crosses 1,000 | crosses 2,000 | crosses 5,000 | crosses 10,000 |", "|---|--:|--:|--:|--:|--:|"]
for m in ["A", "B", "C", "median_parts", "median_years"]:
    c = sens["rank_threshold_crossings"][m]
    rk.append(f"| {label[m]} vs pooled | {c['500']} | {c['1000']} | {c['2000']} | {c['5000']} | {c['10000']} |")
open(os.path.join(OUT, "rank_sensitivity.md"), "w").write("\n".join(rk) + "\n")

vr = ["| Value at corpus rank | " + " | ".join(label[m] for m in ["pooled", "A", "B", "C", "median_parts", "median_years"]) + " |", "|---|" + "--:|" * 6]
for k in ["100", "500", "1000", "2000", "5000", "10000", "20000"]:
    vals = []
    for m in ["pooled", "A", "B", "C", "median_parts", "median_years"]:
        v = full["value_at_rank"][m][k]
        vals.append("–" if v is None else (f"{int(v):,}" if m == "pooled" else f"{v:,.1f}/M"))
    vr.append(f"| {int(k):,} | " + " | ".join(vals) + " |")
open(os.path.join(OUT, "value_at_rank.md"), "w").write("\n".join(vr) + "\n")

# examples: nouns whose band depends on the statistic, and the largest rank shifts
unstable = [r for r in rows if r["confidence"] != "unsuitable" and int(r["distinct_bands"]) > 1]
ex = ["| Lemma | Pooled | A | B | C | Median parts | Median years | Lowest part | Body only | Rank pooled → median parts → median years |", "|---|---|---|---|---|---|---|---|---|---|"]
for r in sorted(unstable, key=lambda r: r["lemma"]):
    ex.append(f"| {r['lemma']} | {r['band_pooled']} | {r['band_A']} | {r['band_B']} | {r['band_C']} | {r['band_median_parts']} | {r['band_median_years']} | {r['band_min_part']} | {r['band_body_pooled']} | "
              f"{r['rank_pooled']} → {r['rank_median_parts']} → {r['rank_median_years']} |")
open(os.path.join(OUT, "band_unstable.md"), "w").write("\n".join(ex) + "\n")

shift = []
for r in rows:
    if r["confidence"] == "unsuitable" or r["rank_pooled"] == "":
        continue
    rp = int(r["rank_pooled"])
    alts = {m: int(r[f"rank_{m}"]) for m in ["A", "B", "C", "median_parts", "median_years"] if r[f"rank_{m}"] != ""}
    m, v = max(alts.items(), key=lambda kv: abs(kv[1] - rp))
    shift.append((abs(v - rp) / rp, r["lemma"], rp, alts))
sh = ["| Lemma | Rank pooled | Part A | Part B | Part C | Median parts | Median years |", "|---|--:|--:|--:|--:|--:|--:|"]
for _, l, rp, alts in sorted(shift, reverse=True)[:20]:
    sh.append(f"| {l} | {rp:,} | {alts.get('A',0):,} | {alts.get('B',0):,} | {alts.get('C',0):,} | {alts.get('median_parts',0):,} | {alts.get('median_years',0):,} |")
open(os.path.join(OUT, "largest_rank_shifts.md"), "w").write("\n".join(sh) + "\n")

# variability summary
hy = [int(r["high_years"]) for r in rows if r["confidence"] != "unsuitable"]
ly = [int(r["low_years"]) for r in rows if r["confidence"] != "unsuitable"]
hp = [int(r["high_parts"]) + int(r["low_parts"]) for r in rows if r["confidence"] != "unsuitable"]
cv = sorted(float(r["raw_cv_years"]) for r in rows if r["raw_cv_years"] not in ("", None))
var = ["| Measure (263 nouns) | Value |", "|---|---|",
       f"| Nouns with ≥1 high year (≥1.5× own median) | {sum(1 for x in hy if x>=1)} |",
       f"| Nouns with ≥3 high years | {sum(1 for x in hy if x>=3)} |",
       f"| Nouns with ≥1 low year (≤ median/1.5) | {sum(1 for x in ly if x>=1)} |",
       f"| Nouns with ≥3 low years | {sum(1 for x in ly if x>=3)} |",
       f"| Nouns with ≥1 high or low part | {sum(1 for x in hp if x>=1)} |",
       f"| Coefficient of variation of yearly rates: median · 90th pct · max | {st.median(cv):.2f} · {cv[int(.9*len(cv))]:.2f} · {cv[-1]:.2f} |"]
open(os.path.join(OUT, "variability.md"), "w").write("\n".join(var) + "\n")
print("tables written:", sorted(os.listdir(OUT)))
