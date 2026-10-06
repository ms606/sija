"""Where the audit reads and writes. Everything is relative to the repository root."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
AUDIT_DIR = ROOT / "tools" / "audit"
OUT_DIR = AUDIT_DIR / "out"
FINDINGS_DIR = OUT_DIR / "findings"
SNAPSHOT = OUT_DIR / "snapshot.json"

SETTINGS_FILE = AUDIT_DIR / "audit.toml"
RULES_FILE = AUDIT_DIR / "rules.toml"
WAIVERS_FILE = AUDIT_DIR / "waivers.toml"
# The record of human review. GRAMMAR_AUDIT_REVIEWS points at another file for dry runs only.
REVIEWS_FILE = Path(os.environ.get("GRAMMAR_AUDIT_REVIEWS", AUDIT_DIR / "reviews.toml"))

# Dev-only resources shared with the existing verifiers (see docs/VERIFICATION.md).
ORACLE_DIR = ROOT / "tools" / "morph-oracle"
ORACLE_MODELS = ORACLE_DIR / "models" / "fin"
ADJUDICATED = ORACLE_DIR / "adjudicated.json"
KOTUS_LIST = ROOT / "tools" / "kotus" / ".cache" / "nykysuomensanalista2024.txt"
