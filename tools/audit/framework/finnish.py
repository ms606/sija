"""Small pieces of Finnish shared by the audits: slots, case tags, vowels, words."""
from __future__ import annotations

import re

# Engine case id → GiellaLT case tag (the comitative is special-cased by callers).
CASE_TAG = {
    "nominative": "Nom", "genitive": "Gen", "partitive": "Par", "accusative": "Acc", "inessive": "Ine",
    "elative": "Ela", "illative": "Ill", "adessive": "Ade", "ablative": "Abl", "allative": "All",
    "essive": "Ess", "translative": "Tra", "abessive": "Abe", "comitative": "Com", "instructive": "Ins",
}
TAG_CASE = {v: k for k, v in CASE_TAG.items()} | {"Cmt": "comitative"}

# Template abbreviations (src/grammar/sentence.ts), for suggesting tokens.
CASE_ABBR = {
    "nominative": "nom", "genitive": "gen", "partitive": "par", "accusative": "acc", "inessive": "ine",
    "elative": "ela", "illative": "ill", "adessive": "ade", "ablative": "abl", "allative": "all",
    "essive": "ess", "translative": "tra", "abessive": "abe", "comitative": "com", "instructive": "ins",
}

# Engine person → GiellaLT possessive tags (3rd person: either tag, same forms).
PERSON_PX = {"1sg": ("PxSg1",), "2sg": ("PxSg2",), "3": ("PxSg3", "PxPl3"), "1pl": ("PxPl1",), "2pl": ("PxPl2",)}
PX_PERSON = {px: p for p, tags in PERSON_PX.items() for px in tags}

GRAMMATICAL_CASES = {"nominative", "genitive", "accusative", "partitive"}
INNER_CASES = {"inessive", "elative", "illative"}
OUTER_CASES = {"adessive", "ablative", "allative"}

BACK_VOWELS = set("aouAOU")
FRONT_VOWELS = set("äöyÄÖY")

WORD = r"[A-Za-zÅÄÖåäöŠšŽž’'-]+"
WORD_RE = re.compile(WORD)
TOKEN_RE = re.compile(rf"(?P<word>{WORD})|(?P<number>\d+(?:[.,]\d+)*)|(?P<punct>[^\sA-Za-zÅÄÖåäöŠšŽž’'\d-])")


def split_slot(slot: str) -> tuple[str, str]:
    """'pl.partitive' → ('pl', 'partitive')."""
    number, case = slot.split(".")
    return number, case


def slot_from_reading(number: str | None, case: str | None) -> str | None:
    if not case or case not in TAG_CASE:
        return None
    return f"{'pl' if number == 'Pl' else 'sg'}.{TAG_CASE[case]}"


def token_for(ref: str, slot: str, person: str | None = None) -> str:
    """The template token that produces a form: ('bussi', 'sg.inessive') → '{bussi:ine}'."""
    number, case = split_slot(slot)
    abbr = ("pl." if number == "pl" else "") + CASE_ABBR[case]
    body = ref if slot == "sg.nominative" and not person else f"{ref}:{abbr}"
    return "{" + body + (f":{person}" if person else "") + "}"


def spelled_harmony(word: str) -> str:
    """Harmony a word's spelling predicts: any of a, o, u → back; otherwise front."""
    return "back" if any(ch in BACK_VOWELS for ch in word) else "front"


def vowel_harmony(text: str) -> str | None:
    """'back' (a, o, u), 'front' (ä, ö, y) or None when the text has only e, i or no vowels."""
    if any(ch in BACK_VOWELS for ch in text):
        return "back"
    if any(ch in FRONT_VOWELS for ch in text):
        return "front"
    return None


def words(text: str) -> list[str]:
    return WORD_RE.findall(text)
