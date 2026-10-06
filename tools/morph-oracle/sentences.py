"""
Spell-checks every rendered example sentence with the GiellaLT Finnish
analyser: each word must be a recognised Finnish word form. (Dev-only.)
Proper nouns and numbers are allowed; spoken-register sentences are
checked with the descriptive analyser.
"""
import json, os, re, sys
from uralicNLP import uralicApi

HERE = os.path.dirname(os.path.abspath(__file__))
NORM = os.path.join(HERE, "models", "fin", "analyser-gt-norm.hfstol")
DESC = os.path.join(HERE, "models", "fin", "analyser-gt-desc.hfstol")
data = json.load(open(os.path.join(HERE, ".cache", "paradigms.json"), encoding="utf-8"))

cache = {}
def known(word, analyser):
    key = (word, analyser)
    if key not in cache:
        forms = {word, word.lower(), word.replace("’", "'")}
        cache[key] = any(uralicApi.analyze(f, "fin", filename=analyser) for f in forms)
    return cache[key]

problems = []
for s in data["sentences"]:
    analyser = DESC if s["register"] == "spoken" else NORM
    for word in re.findall(r"[A-Za-zÅÄÖåäöŠšŽž’'-]+", s["text"]):
        if not known(word, analyser):
            problems.append((s["id"], word, s["text"]))

print(f"Sentences checked: {len(data['sentences'])}")
print(f"Unrecognised words: {len(problems)}")
for sid, word, text in problems:
    print(f"  {sid}: '{word}' in: {text}")
sys.exit(1 if problems else 0)
