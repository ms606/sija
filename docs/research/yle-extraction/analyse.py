#!/usr/bin/env python3
"""
Statistics, sensitivity, flags and confidence for the Yle lexicon extraction.
Reads data/*.csv written by extract.py and, for corpus ranks, the cached full
noun lemma lists (offline: never fetches). Python 3 standard library only.

Usage: python3 analyse.py --cache DIR
Writes: data/statistics.csv, data/full_list_summary.json, data/sensitivity.json,
        and Markdown tables in report_tables/ for the research documents.

Every threshold below is a PRODUCT HEURISTIC, not a research standard. None of
the statistics is designated as the primary measure.
"""
import argparse, csv, json, math, os, re, statistics as st
from extract import Client, CORPORA, YEARS, PART, DATA, HERE

PARTS = ["A_2011_2018", "B_2019_2021", "C_2022_2024"]
BANDS = [(100, "F1"), (10, "F2"), (1, "F3")]          # provisional decade bands, per million
FLAG_OTHER_POS = 0.10       # share of other-POS readings
FLAG_CAPLEMMA = 0.10        # share of capitalised-lemma noun readings
FLAG_TOP_FORM = 0.40        # share of the single most frequent form
FLAG_PART_RATIO = 1.5       # max/min of the three part rates
FLAG_DP = 0.20              # Gries' DP over the 14 years
FLAG_BODY_SHARE = 0.50      # share of hits in body text
NEAR = 0.15                 # within 15% of a band boundary
HIGH_LOW = 1.5              # a year/part is "high" at >= 1.5x the noun's median, "low" at <= median/1.5
RANK_THRESHOLDS = [500, 1000, 2000, 5000, 10000]

CONTEXT_CHECKED = {  # read in context by an AI reader in Phase 1 (KORP_PILOT.md, COMPARABILITY.md)
    "joki": "J0/J1/J2 samples", "kuu": "K1 samples", "kuusi": "S1 samples", "koti": "H1 samples", "suomi": "F1 samples",
    "sää": "P1 sample", "tuli": "verb/noun sample", "varsi": "sample", "puoli": "sample", "aika": "sample",
    "lehti": "sense sample", "kortti": "spike sample", "puhelin": "R1 promo sample", "vuosi": "vuonna validated",
}
UNSUITABLE = {"vieras": "every hit is tagged A (adjective); the noun 'guest' cannot be isolated"}


def band(pm):
    if pm is None:
        return "-"
    for lim, b in BANDS:
        if pm >= lim:
            return b
    return "F4" if pm > 0 else "F0"


def near(pm):
    return pm is not None and any(pm > 0 and abs(pm - lim) / lim <= NEAR for lim, _ in BANDS)


def read_csv(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return list(csv.DictReader(f))


def dp(counts, sizes):
    tot = sum(counts)
    if not tot:
        return None
    S = sum(sizes)
    return 0.5 * sum(abs(c / tot - s / S) for c, s in zip(counts, sizes))


def spearman(a, b):
    def ranks(x):
        order = sorted(range(len(x)), key=lambda i: -x[i])
        r = [0.0] * len(x)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and x[order[j + 1]] == x[order[i]]:
                j += 1
            for k in range(i, j + 1):
                r[order[k]] = (i + j) / 2 + 1
            i = j + 1
        return r
    ra, rb = ranks(a), ranks(b)
    n = len(a)
    ma, mb = sum(ra) / n, sum(rb) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    va = math.sqrt(sum((x - ma) ** 2 for x in ra)); vb = math.sqrt(sum((y - mb) ** 2 for y in rb))
    return cov / (va * vb) if va and vb else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    a = ap.parse_args()
    lex = json.load(open(os.path.join(DATA, "lexicon_nouns_input.json")))["nouns"]
    den = {int(r["year"]): r for r in read_csv("denominators.csv")}
    tok = {y: int(den[y]["tokens"]) for y in YEARS}
    wtok = {y: int(den[y]["word_tokens"]) for y in YEARS}
    btok = {y: int(den[y]["tokens_ptype_text"]) for y in YEARS}
    ptok = {p: sum(tok[y] for y in YEARS if PART[y] == p) for p in PARTS}
    pbtok = {p: sum(btok[y] for y in YEARS if PART[y] == p) for p in PARTS}
    T, WT, BT = sum(tok.values()), sum(wtok.values()), sum(btok.values())

    # counts per lemma, measure, year
    cnt = {}
    for r in read_csv("counts_by_year.csv"):
        cnt.setdefault(r["lemma"], {}).setdefault(r["measure"], {})[int(r["year"])] = int(r["count"])
    forms = {}
    for r in read_csv("forms_pooled.csv"):
        forms.setdefault(r["lemma"], []).append((r["word_lowercased"], int(r["count_2011_2024"])))
    adj = {}
    for r in read_csv("adjustments_by_year.csv"):
        adj.setdefault((r["lemma"], r["scope"]), {}).setdefault(r["rule_id"], {})[int(r["year"])] = int(r["count"])
    r1 = {}
    if os.path.exists(os.path.join(DATA, "r1_windows.csv")):
        for r in read_csv("r1_windows.csv"):
            r1.setdefault(r["lemma"], []).append(r)
    r1_review = json.load(open(os.path.join(DATA, "r1_review.json"))) if os.path.exists(os.path.join(DATA, "r1_review.json")) else {}

    def series(lemma, measure="n_all"):
        m = cnt.get(lemma, {}).get(measure, {})
        return [m.get(y, 0) for y in YEARS]

    def adjusted_series(lemma, scope):
        """Adjusted yearly counts, the rule ids applied and the unresolved yearly counts (None if no rule applies)."""
        A = adj.get((lemma, scope), {})
        base = series(lemma, "n_all" if scope == "all" else "n_body")
        g = lambda rid: [A.get(rid, {}).get(y, 0) for y in YEARS]
        rules, unres = [], [0] * 14
        if lemma == "joki":
            out = [b - x - z for b, x, z in zip(base, g("J1"), g("J2"))]; rules = ["J1", "J2"]
            unres = [x + z for x, z in zip(g("J0"), g("J1x"))]
        elif lemma == "kuu":
            out = [b - x for b, x in zip(base, g("K1"))]; rules = ["K1"]
        elif lemma == "kuusi":
            out = [b - x for b, x in zip(base, g("S1"))]; rules = ["S1"]; unres = g("S1")
        elif lemma == "koti":
            out = [b + x + z for b, x, z in zip(base, g("H1koto"), g("H1adv"))]; rules = ["H1"]
        elif lemma == "suomi":
            out = g("F1lang"); rules = ["F1"]; unres = g("F1initial")
        elif lemma == "sää":
            out = [b + x for b, x in zip(base, g("P1"))]; rules = ["P1"]
        else:
            out = None
        if scope == "all" and lemma in r1_review:   # reviewed repeated-text windows only
            rm = [0] * 14
            for w in r1.get(lemma, []):
                if r1_review[lemma].get(w["window_lowercased"]) == "boilerplate":
                    rm = [x + int(w[f"y{y}"]) for x, y in zip(rm, YEARS)]
            if any(rm):
                out = [b - x for b, x in zip(out if out else base, rm)]; rules = rules + ["R1"]
        return out, rules, unres

    def stats(series_, sizes_by_year, sizes_by_part):
        tot = sum(series_)
        yr = [c / sizes_by_year[y] * 1e6 for c, y in zip(series_, YEARS)]
        parts = {p: sum(c for c, y in zip(series_, YEARS) if PART[y] == p) / sizes_by_part[p] * 1e6 for p in PARTS}
        med_years = st.median(yr)
        med_parts = st.median(parts.values())
        mean_y = st.mean(yr)
        return {
            "total": tot, "pooled_pm": tot / sum(sizes_by_year.values()) * 1e6, "part_pm": parts, "median_parts_pm": med_parts,
            "median_years_pm": med_years, "mean_years_pm": mean_y, "min_year_pm": min(yr), "max_year_pm": max(yr),
            "cv_years": (st.pstdev(yr) / mean_y) if mean_y else None, "dp_years": dp(series_, [sizes_by_year[y] for y in YEARS]),
            "high_years": sum(1 for v in yr if med_years and v >= HIGH_LOW * med_years),
            "low_years": sum(1 for v in yr if med_years and v <= med_years / HIGH_LOW),
            "high_parts": sum(1 for v in parts.values() if med_parts and v >= HIGH_LOW * med_parts),
            "low_parts": sum(1 for v in parts.values() if med_parts and v <= med_parts / HIGH_LOW),
            "part_ratio": (max(parts.values()) / min(parts.values())) if min(parts.values()) > 0 else None,
            "years_by_band": {b: sum(1 for v in yr if band(v) == b) for b in ["F1", "F2", "F3", "F4", "F0"]},
            "year_pm": yr,
        }

    # ------------------------------------------------ full noun lemma lists -> corpus ranks
    c = Client(a.cache, log=False, offline=True)
    per_year, dropped = {}, {}
    for co, y in zip(CORPORA, YEARS):
        d = c.count('[pos="N"]', "lemma", corpora=[co], note=f"full noun lemma list {co}")
        m, drop = {}, 0
        for r in d["combined"]["rows"]:
            l = r["value"]["lemma"][0] if isinstance(r["value"]["lemma"], list) else r["value"]["lemma"]
            if not l[:1].islower():
                continue
            if r["absolute"] < 2:
                drop += 1
                continue
            m[l] = r["absolute"]
        per_year[y] = m; dropped[y] = drop
    union = set().union(*per_year.values())
    pop = {}
    for l in union:
        s = [per_year[y].get(l, 0) for y in YEARS]
        parts = {p: sum(v for v, y in zip(s, YEARS) if PART[y] == p) / ptok[p] * 1e6 for p in PARTS}
        pop[l] = {"pooled": sum(s), "A": parts[PARTS[0]], "B": parts[PARTS[1]], "C": parts[PARTS[2]],
                  "median_parts": st.median(parts.values()), "median_years": st.median([v / tok[y] * 1e6 for v, y in zip(s, YEARS)])}
    methods = ["pooled", "A", "B", "C", "median_parts", "median_years"]
    sorted_vals = {m: sorted((v[m] for v in pop.values()), reverse=True) for m in methods}

    def rank(m, value):
        # competition rank: 1 + number of lemmas with a strictly greater value (binary search on the sorted list)
        lo, hi, arr = 0, len(sorted_vals[m]), sorted_vals[m]
        while lo < hi:
            mid = (lo + hi) // 2
            if arr[mid] > value:
                lo = mid + 1
            else:
                hi = mid
        return lo + 1

    full_summary = {
        "population": "noun lemmas (pos=N) with a lowercase initial; per-year entries with count 1 dropped (cannot outrank any lexicon noun)",
        "dropped_count1_per_year": dropped,
        "distinct_lemmas_kept": len(union),
        "value_at_rank": {m: {str(k): (sorted_vals[m][k - 1] if k <= len(sorted_vals[m]) else None) for k in [100] + RANK_THRESHOLDS + [20000]} for m in methods},
        "units": "pooled: raw count; A/B/C/median_parts/median_years: per million tokens",
    }
    json.dump(full_summary, open(os.path.join(DATA, "full_list_summary.json"), "w"), indent=1)

    # ------------------------------------------------ per-lexeme statistics, flags, confidence
    out = []
    for n in lex:
        l = n["lemma"]
        s_all = series(l); s_body = series(l, "n_body")
        other = sum(sum(v.values()) for k, v in cnt.get(l, {}).items() if k.startswith("other_pos_"))
        cap = sum(sum(v.values()) for k, v in cnt.get(l, {}).items() if k.startswith("n_caplemma:"))
        S = stats(s_all, tok, ptok)
        SB = stats(s_body, btok, pbtok)
        SW = sum(s_all) / WT * 1e6
        fl = sorted(forms.get(l, []), key=lambda x: -x[1])
        top_form, top_share = (fl[0][0], fl[0][1] / sum(x for _, x in fl)) if fl and sum(x for _, x in fl) else ("", 0)
        adj_s, rules, unres = adjusted_series(l, "all")
        SA = stats(adj_s, tok, ptok) if adj_s else None
        primary = SA or S   # for flags/bands: adjusted where a rule applies (raw values are kept alongside)
        r = {
            "id": n["id"], "lemma": l, "kotus_type": n["typeId"], "compound": bool(n["compound"]), "editorial_frequency": n["editorialFrequency"],
            "raw_total": S["total"], "raw_pooled_pm": S["pooled_pm"], "raw_pooled_pm_word_tokens": SW,
            "raw_part_A_pm": S["part_pm"][PARTS[0]], "raw_part_B_pm": S["part_pm"][PARTS[1]], "raw_part_C_pm": S["part_pm"][PARTS[2]],
            "raw_median_parts_pm": S["median_parts_pm"], "raw_median_years_pm": S["median_years_pm"], "raw_mean_years_pm": S["mean_years_pm"],
            "raw_min_year_pm": S["min_year_pm"], "raw_max_year_pm": S["max_year_pm"], "raw_cv_years": S["cv_years"], "raw_dp_years": S["dp_years"],
            "raw_part_ratio": S["part_ratio"], "high_years": S["high_years"], "low_years": S["low_years"],
            "high_parts": S["high_parts"], "low_parts": S["low_parts"],
            "years_F1": S["years_by_band"]["F1"], "years_F2": S["years_by_band"]["F2"], "years_F3": S["years_by_band"]["F3"],
            "years_F4_or_absent": S["years_by_band"]["F4"] + S["years_by_band"]["F0"],
            "body_total": SB["total"], "body_pooled_pm": SB["pooled_pm"], "body_median_parts_pm": SB["median_parts_pm"],
            "body_share_of_hits": SB["total"] / S["total"] if S["total"] else None,
            "other_pos_total": other, "other_pos_share": other / (S["total"] + other) if S["total"] + other else None,
            "caplemma_total": cap, "caplemma_share": cap / (S["total"] + cap) if S["total"] + cap else None,
            "top_form": top_form, "top_form_share": top_share,
            "adj_rules": "+".join(rules), "adj_total": SA["total"] if SA else "", "adj_pooled_pm": SA["pooled_pm"] if SA else "",
            "adj_part_A_pm": SA["part_pm"][PARTS[0]] if SA else "", "adj_part_B_pm": SA["part_pm"][PARTS[1]] if SA else "",
            "adj_part_C_pm": SA["part_pm"][PARTS[2]] if SA else "", "adj_median_parts_pm": SA["median_parts_pm"] if SA else "",
            "adj_median_years_pm": SA["median_years_pm"] if SA else "", "unresolved_total": sum(unres) if any(unres) else "",
            "r1_windows_ge100": len(r1.get(l, [])), "r1_hits_in_windows_ge100": sum(int(w["count_2011_2024"]) for w in r1.get(l, [])),
        }
        # ranks (corpus population is raw; an adjusted value is ranked against the raw population)
        vals = {"pooled": primary["total"], "A": primary["part_pm"][PARTS[0]], "B": primary["part_pm"][PARTS[1]], "C": primary["part_pm"][PARTS[2]],
                "median_parts": primary["median_parts_pm"], "median_years": primary["median_years_pm"]}
        for m in methods:
            r[f"rank_{m}"] = rank(m, vals[m]) if vals[m] > 0 else ""
        # provisional bands under each method
        bands = {"pooled": band(primary["pooled_pm"]), "A": band(primary["part_pm"][PARTS[0]]), "B": band(primary["part_pm"][PARTS[1]]),
                 "C": band(primary["part_pm"][PARTS[2]]), "median_parts": band(primary["median_parts_pm"]),
                 "median_years": band(primary["median_years_pm"]), "min_part": band(min(primary["part_pm"].values())),
                 "body_pooled": band(SB["pooled_pm"])}
        for k, v in bands.items():
            r[f"band_{k}"] = v
        r["distinct_bands"] = len({v for k, v in bands.items()})
        # flags
        f = []
        if l in UNSUITABLE: f.append("pos-conflict")
        if r["other_pos_share"] and r["other_pos_share"] >= FLAG_OTHER_POS: f.append("homograph-pos")
        if r["caplemma_share"] and r["caplemma_share"] >= FLAG_CAPLEMMA: f.append("proper-noun-overlap")
        if top_share >= FLAG_TOP_FORM: f.append("form-concentrated")
        pr = (max(primary["part_pm"].values()) / min(primary["part_pm"].values())) if min(primary["part_pm"].values()) > 0 else None
        if pr is None or pr >= FLAG_PART_RATIO: f.append("part-sensitive")
        if primary["dp_years"] is not None and primary["dp_years"] >= FLAG_DP: f.append("year-uneven")
        if r["distinct_bands"] > 1: f.append("band-unstable")
        if near(primary["pooled_pm"]) or near(primary["median_parts_pm"]): f.append("near-boundary")
        if r["body_share_of_hits"] is not None and r["body_share_of_hits"] < FLAG_BODY_SHARE: f.append("non-body-heavy")
        if r1.get(l) and l not in r1_review: f.append("repeated-text-candidate")
        if l in r1_review and any(v != "boilerplate" for v in r1_review[l].values()): f.append("repeated-text-reviewed")
        if rules: f.append("adjusted:" + "+".join(rules))
        if any(unres): f.append("unresolved-part")
        r["flags"] = " ".join(f)
        risk = {"homograph-pos", "proper-noun-overlap", "form-concentrated", "part-sensitive", "year-uneven", "band-unstable",
                "non-body-heavy", "repeated-text-candidate", "unresolved-part"}
        if l in UNSUITABLE:
            conf = "unsuitable"
        elif rules or (set(f) & risk):
            conf = "approximate"
        else:
            conf = "usable"
        r["confidence"] = conf
        r["context_checked"] = CONTEXT_CHECKED.get(l, "")
        r["confidence_basis"] = ("context-checked (AI reader) + automatic" if l in CONTEXT_CHECKED else "automatic checks only")
        r["note"] = UNSUITABLE.get(l, "")
        out.append(r)

    with open(os.path.join(DATA, "statistics.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
        w.writeheader()
        for r in out:
            w.writerow({k: (f"{v:.4f}" if isinstance(v, float) else v) for k, v in r.items()})

    # ------------------------------------------------ sensitivity summary
    ok = [r for r in out if r["lemma"] not in UNSUITABLE]
    sens = {"n": len(ok), "spearman": {}, "rank_threshold_crossings": {}, "band_counts": {}, "band_changes_vs_pooled": {},
            "median_abs_rank_shift_vs_pooled": {}}
    for m in ["A", "B", "C", "median_parts", "median_years"]:
        xs = [r for r in ok if r["rank_pooled"] != "" and r[f"rank_{m}"] != ""]
        sens["spearman"][m] = spearman([-r["rank_pooled"] for r in xs], [-r[f"rank_{m}"] for r in xs])
        sens["median_abs_rank_shift_vs_pooled"][m] = st.median(abs(r["rank_pooled"] - r[f"rank_{m}"]) for r in xs)
        sens["rank_threshold_crossings"][m] = {t: sum(1 for r in xs if (r["rank_pooled"] <= t) != (r[f"rank_{m}"] <= t)) for t in RANK_THRESHOLDS}
    for m in ["pooled", "A", "B", "C", "median_parts", "median_years", "min_part", "body_pooled"]:
        sens["band_counts"][m] = {b: sum(1 for r in ok if r[f"band_{m}"] == b) for b in ["F1", "F2", "F3", "F4", "F0"]}
        sens["band_changes_vs_pooled"][m] = sum(1 for r in ok if r[f"band_{m}"] != r["band_pooled"])
    sens["rank_counts_pooled"] = {t: sum(1 for r in ok if r["rank_pooled"] != "" and r["rank_pooled"] <= t) for t in RANK_THRESHOLDS}
    sens["rank_counts"] = {m: {t: sum(1 for r in ok if r[f"rank_{m}"] != "" and r[f"rank_{m}"] <= t) for t in RANK_THRESHOLDS} for m in methods}
    sens["confidence"] = {k: sum(1 for r in out if r["confidence"] == k) for k in ["usable", "approximate", "unsuitable"]}
    sens["flags"] = {}
    for r in out:
        for fl in r["flags"].split():
            k = fl.split(":")[0]
            sens["flags"][k] = sens["flags"].get(k, 0) + 1
    json.dump(sens, open(os.path.join(DATA, "sensitivity.json"), "w"), indent=1)
    print(json.dumps(sens, indent=1)[:4000])


if __name__ == "__main__":
    main()
