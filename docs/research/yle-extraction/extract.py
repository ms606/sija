#!/usr/bin/env python3
"""
Sija research extraction: noun frequencies of the lexicon in the Yle Finnish
News Archive 2011-2024, scrambled (Korp), per year and corpus ID.

Research only. Nothing here is used by the app. Python 3 standard library.

Usage:
    python3 extract.py --cache DIR [--phase core|r1|all] [--r1-lemmas a,b,c]

  --cache   directory for gzipped API responses (keep it OUTSIDE the repository)
  --phase   core: denominators, lexicon counts, rule queries, full noun lists
            r1:   repeated-text windows for the lemmas in --r1-lemmas
Outputs (next to this file): data/*.csv, data/*.json, extraction_log.jsonl.
Raw counts and adjustments are written to separate files and never overwrite
each other. See README.md for the field definitions.
"""
import argparse, csv, gzip, hashlib, json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

API = "https://www.kielipankki.fi/korp/api8"
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
LOG = os.path.join(HERE, "extraction_log.jsonl")

YEARS = list(range(2011, 2025))
CORPORA = [f"YLENEWS_FI_{y}_S" for y in YEARS]
PART = {y: ("A_2011_2018" if y <= 2018 else "B_2019_2021" if y <= 2021 else "C_2022_2024") for y in YEARS}
BODY = '_.sentence_paragraph_type="text"'


# ----------------------------------------------------------------- requests
class Client:
    def __init__(self, cache, log=True, offline=False):
        self.cache = cache
        self.log_enabled = log
        self.offline = offline  # analysis: read the cache only, never fetch
        os.makedirs(cache, exist_ok=True)

    def get(self, command, params, note=""):
        query = urllib.parse.urlencode(sorted(params.items()))
        url = f"{API}/{command}?{query}"
        key = hashlib.sha1(url.encode()).hexdigest()[:20]
        path = os.path.join(self.cache, f"{command}_{key}.json.gz")
        if os.path.exists(path):
            with gzip.open(path, "rt", encoding="utf-8") as f:
                rec = json.load(f)
            self._log({"event": "cache-hit", "command": command, "url": url, "note": note,
                       "fetched_utc": rec["fetched_utc"], "sha256": rec["sha256"], "bytes": rec["bytes"]})
            return rec["response"]
        if self.offline:
            raise RuntimeError(f"not in cache (offline): {note}")
        for attempt in range(4):
            t0 = time.time()
            try:
                req = urllib.request.Request(url, headers={"Accept-Encoding": "gzip", "User-Agent": "sija-research/1"})
                with urllib.request.urlopen(req, timeout=1800) as r:
                    body = r.read()
                    if r.headers.get("Content-Encoding") == "gzip":
                        body = gzip.decompress(body)
                    status = r.status
                break
            except Exception as e:  # transient network or server error: wait and retry
                self._log({"event": "error", "command": command, "url": url, "note": note, "error": str(e), "attempt": attempt})
                if attempt == 3:
                    raise
                time.sleep(15 * (attempt + 1))
        data = json.loads(body)
        rec = {"url": url, "fetched_utc": datetime.now(timezone.utc).isoformat(), "sha256": hashlib.sha256(body).hexdigest(),
               "bytes": len(body), "seconds": round(time.time() - t0, 1), "status": status, "response": data}
        with gzip.open(path, "wt", encoding="utf-8") as f:
            json.dump(rec, f, ensure_ascii=False)
        self._log({"event": "fetch", "command": command, "url": url, "note": note, "status": status,
                   "fetched_utc": rec["fetched_utc"], "sha256": rec["sha256"], "bytes": rec["bytes"], "seconds": rec["seconds"],
                   "error": data.get("ERROR")})
        if "ERROR" in data:
            raise RuntimeError(f"{note}: {data['ERROR']}")
        time.sleep(2)  # be polite to a shared public service
        return data

    def count(self, cqp, group_by=None, corpora=CORPORA, ignore_case=None, struct=None, note=""):
        p = {"corpus": ",".join(corpora), "cqp": cqp, "default_within": "sentence"}
        if group_by:
            p["group_by"] = group_by
        if struct:
            p["group_by_struct"] = struct
        if ignore_case:
            p["ignore_case"] = ignore_case
        return self.get("count", p, note)

    def _log(self, entry):
        if not self.log_enabled:
            return
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def rows(d, corpus):
    out = []
    for r in d["corpora"].get(corpus, {}).get("rows", []):
        v = {k: (" ".join(x) if isinstance(x, list) else x) for k, x in r["value"].items()}
        out.append((v, r["absolute"]))
    return out


def total(d, corpus):
    return d["corpora"].get(corpus, {}).get("sums", {}).get("absolute", 0)


def write_csv(name, header, records):
    with open(os.path.join(DATA, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(records)


# ----------------------------------------------------------------- rules
RULES = [
    {"id": "J1", "lemma": "joki", "kind": "remove",
     "description": "joista tagged joki/N directly after a comma token, except when followed by ja|sekä|tai|, (lists)",
     "cqp_total": '[word=","] [word="joista" %c & lemma="joki" & pos="N"{body}]',
     "cqp_exempt": '[word=","] [word="joista" %c & lemma="joki" & pos="N"{body}] [word="ja|sekä|tai|,"]'},
    {"id": "J2", "lemma": "joki", "kind": "remove",
     "description": "plural -kin forms tagged joki/N that coincide with the pronoun jokin",
     "cqp": '[word="joillakin|joillekin|joissakin|joistakin|joiltakin|joiksikin" %c & lemma="joki" & pos="N"{body}]'},
    {"id": "J0", "lemma": "joki", "kind": "unresolved",
     "description": "joista tagged joki/N NOT after a comma (about 44% pronoun in a 50-hit sample); kept in the count, reported as unresolved",
     "cqp": '[word!=","] [word="joista" %c & lemma="joki" & pos="N"{body}]'},
    {"id": "K1", "lemma": "kuu", "kind": "remove",
     "description": "kuin tagged kuu/N (plural instructive)",
     "cqp": '[word="kuin" %c & lemma="kuu" & pos="N"{body}]'},
    {"id": "S1", "lemma": "kuusi", "kind": "unresolved-remove",
     "description": "nominative singular kuusi tagged N: spruce vs numeral not separable; excluded from the adjusted count and reported as unresolved",
     "cqp": '[word="kuusi" %c & lemma="kuusi" & pos="N"{body}]'},
    {"id": "H1", "lemma": "koti", "kind": "add",
     "description": "lexicalised locatives: koto/N forms matching ^koto(na|a)(ni|si|an|nsa|mme|nne)?(kin|kaan|kään)?$ plus lemmas kotona|kotoa|kotiin tagged Adv",
     "cqp_koto": '[lemma="koto" & pos="N"{body}]', "cqp_adv": '[lemma="kotona|kotoa|kotiin" & pos="Adv"{body}]'},
    {"id": "F1", "lemma": "suomi", "kind": "replace",
     "description": "language sense = lemma suomi|Suomi, pos N, word form with lowercase initial, not sentence-initial; sentence-initial hits are unresolved",
     "cqp_all": '[lemma="suomi|Suomi" & pos="N"{body}]', "cqp_initial": '<sentence> [lemma="suomi|Suomi" & pos="N"{body}]'},
    {"id": "P1", "lemma": "sää", "kind": "add",
     "description": "bare sää tagged Pron (20/20 sampled were the weather noun)",
     "cqp": '[word="sää" %c & lemma="sää" & pos="Pron"{body}]'},
]
KOTO_RE = r"^koto(na|a)(ni|si|an|nsa|mme|nne)?(kin|kaan|kään)?$"


def run_rules(c):
    import re
    out = []  # (lemma, rule, corpus, year, scope, kind, count)
    for scope, b in (("all", ""), ("body", " & " + BODY)):
        for r in RULES:
            rid, lemma = r["id"], r["lemma"]
            if rid == "J1":
                t = c.count(r["cqp_total"].format(body=b), "pos", note=f"rule J1 total {scope}")
                e = c.count(r["cqp_exempt"].format(body=b), "pos", note=f"rule J1 exempt {scope}")
                for co, y in zip(CORPORA, YEARS):
                    out.append((lemma, rid, co, y, scope, "remove", total(t, co) - total(e, co)))
                    out.append((lemma, "J1x", co, y, scope, "unresolved", total(e, co)))
            elif rid == "H1":
                k = c.count(r["cqp_koto"].format(body=b), "word", ignore_case="word", note=f"rule H1 koto {scope}")
                a = c.count(r["cqp_adv"].format(body=b), "lemma", note=f"rule H1 adverbs {scope}")
                for co, y in zip(CORPORA, YEARS):
                    keep = sum(n for v, n in rows(k, co) if re.match(KOTO_RE, v["word"]))
                    out.append((lemma, "H1koto", co, y, scope, "add", keep))
                    out.append((lemma, "H1adv", co, y, scope, "add", total(a, co)))
            elif rid == "F1":
                al = c.count(r["cqp_all"].format(body=b), "word", note=f"rule F1 all {scope}")
                ini = c.count(r["cqp_initial"].format(body=b), "word", note=f"rule F1 initial {scope}")
                for co, y in zip(CORPORA, YEARS):
                    lower_all = sum(n for v, n in rows(al, co) if v["word"][:1].islower())
                    lower_ini = sum(n for v, n in rows(ini, co) if v["word"][:1].islower())
                    out.append((lemma, "F1lang", co, y, scope, "replace", lower_all - lower_ini))
                    out.append((lemma, "F1initial", co, y, scope, "unresolved", total(ini, co)))
            else:
                d = c.count(r["cqp"].format(body=b), "pos", note=f"rule {rid} {scope}")
                for co, y in zip(CORPORA, YEARS):
                    out.append((lemma, rid, co, y, scope, r["kind"], total(d, co)))
    return out


# ----------------------------------------------------------------- phases
def phase_core(c, lex):
    lemmas = sorted({n["lemma"] for n in lex})
    alt = "|".join(lemmas)
    started = datetime.now(timezone.utc).isoformat()

    # Denominators
    info = c.get("corpus_info", {"corpus": ",".join(CORPORA)}, "corpus_info")
    punct = c.count('[pos="Punct"]', "pos", note="denominator: punctuation")
    texts = c.count("<text> []", "pos", note="denominator: texts")
    ptype = c.count("[]", struct="sentence_paragraph_type", note="denominator: tokens by paragraph type")
    types = ["text", "lead", "headline", "heading", "image", "quote", "summary", "shortSummary"]
    den = []
    for co, y in zip(CORPORA, YEARS):
        i = info["corpora"][co]["info"]
        tok = int(i["Size"]); pu = total(punct, co)
        pt = {}
        for v, n in rows(ptype, co):
            pt[v.get("sentence_paragraph_type", "")] = pt.get(v.get("sentence_paragraph_type", ""), 0) + n
        den.append([co, y, PART[y], tok, pu, tok - pu, total(texts, co), int(i["Sentences"]), i.get("Updated", "")]
                   + [pt.get(t, 0) for t in types] + [sum(pt.values())])
    write_csv("denominators.csv", ["corpus_id", "year", "part", "tokens", "punct_tokens", "word_tokens", "texts", "sentences", "korp_updated"]
              + [f"tokens_ptype_{t}" for t in types] + ["tokens_ptype_sum"], den)

    # Lexicon counts
    b1 = c.count(f'[lemma="({alt})"]', "lemma,pos", note="lexicon: lemma x POS, all text, case-sensitive")
    b2 = c.count(f'[lemma="({alt})" %c & pos="N"]', "lemma", note="lexicon: noun lemma, case-insensitive (capitalised variants)")
    b3 = c.count(f'[lemma="({alt})" & pos="N" & {BODY}]', "lemma", note="lexicon: noun lemma, body text")
    b4 = c.count(f'[lemma="({alt})" & pos="N"]', "lemma,word", ignore_case="word", note="lexicon: noun lemma x word form, all text")
    recs = []
    for co, y in zip(CORPORA, YEARS):
        for v, n in rows(b1, co):
            m = "n_all" if v["pos"] == "N" else f"other_pos_{v['pos']}"
            recs.append([v["lemma"], co, y, PART[y], m, n])
        for v, n in rows(b2, co):
            if v["lemma"] in lemmas:
                continue  # exact-case lemma already counted as n_all
            low = v["lemma"].lower()
            if low in lemmas:
                recs.append([low, co, y, PART[y], f"n_caplemma:{v['lemma']}", n])
        for v, n in rows(b3, co):
            recs.append([v["lemma"], co, y, PART[y], "n_body", n])
    write_csv("counts_by_year.csv", ["lemma", "corpus_id", "year", "part", "measure", "count"], recs)
    forms = {}
    for co in CORPORA:
        for v, n in rows(b4, co):
            forms[(v["lemma"], v["word"])] = forms.get((v["lemma"], v["word"]), 0) + n
    write_csv("forms_pooled.csv", ["lemma", "word_lowercased", "count_2011_2024"],
              sorted(([l, w, n] for (l, w), n in forms.items()), key=lambda r: (r[0], -r[2])))

    # Rule queries (adjustments are separate records; raw counts are never changed)
    adj = run_rules(c)
    write_csv("adjustments_by_year.csv", ["lemma", "rule_id", "corpus_id", "year", "scope", "kind", "count"], adj)
    json.dump({"rules": RULES, "koto_allow_regex": KOTO_RE, "status": "proposed; samples judged by an AI reader; NOT native-reviewed"},
              open(os.path.join(DATA, "rules.json"), "w"), ensure_ascii=False, indent=1)

    # Full noun lemma lists, one request per corpus (raw responses stay in the cache)
    for co in CORPORA:
        c.count('[pos="N"]', "lemma", corpora=[co], note=f"full noun lemma list {co}")

    json.dump({"phase": "core", "started_utc": started, "finished_utc": datetime.now(timezone.utc).isoformat()},
              open(os.path.join(DATA, "run_core.json"), "w"), indent=1)


def phase_r1(c, lemmas):
    recs = []
    for l in lemmas:
        d = c.count(f'[] [] [] [lemma="{l}" & pos="N"] [] [] []', "word", ignore_case="word", note=f"R1 windows {l}")
        agg = {}
        for co, y in zip(CORPORA, YEARS):
            for v, n in rows(d, co):
                agg.setdefault(v["word"], {})[y] = agg.setdefault(v["word"], {}).get(y, 0) + n
        windowed = sum(sum(v.values()) for v in agg.values())
        for w, per in agg.items():
            tot = sum(per.values())
            if tot >= 100:
                recs.append([l, w, tot, windowed] + [per.get(y, 0) for y in YEARS])
    write_csv("r1_windows.csv", ["lemma", "window_lowercased", "count_2011_2024", "lemma_hits_with_full_window"] + [f"y{y}" for y in YEARS],
              sorted(recs, key=lambda r: (r[0], -r[2])))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    ap.add_argument("--phase", default="core", choices=["core", "r1"])
    ap.add_argument("--r1-lemmas", default="")
    a = ap.parse_args()
    os.makedirs(DATA, exist_ok=True)
    lex = json.load(open(os.path.join(DATA, "lexicon_nouns_input.json")))["nouns"]
    c = Client(a.cache)
    if a.phase == "core":
        phase_core(c, lex)
    else:
        phase_r1(c, [x for x in a.r1_lemmas.split(",") if x])


if __name__ == "__main__":
    main()
