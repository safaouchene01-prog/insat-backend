"""
Technique Engine — Rule-Based Treatment Recommendation System
=============================================================
Loads the clinical knowledge base (techniques.json) and returns
structured treatment recommendations for a confirmed diagnosis.

This is a pure rule-based engine — no LLM, no secondary model.
"""

import json
from pathlib import Path
from typing import Optional

# ── Path resolution ──────────────────────────────────────────────────────────

_KB_PATH = Path(__file__).resolve().parent / "techniques.json"


# ── Knowledge base loader (singleton) ────────────────────────────────────────

_knowledge_base: Optional[dict] = None


def _load_knowledge_base() -> dict:
    global _knowledge_base
    if _knowledge_base is None:
        if not _KB_PATH.exists():
            raise FileNotFoundError(
                f"Knowledge base not found at: {_KB_PATH}"
            )
        with open(_KB_PATH, "r", encoding="utf-8") as f:
            _knowledge_base = json.load(f)
    return _knowledge_base


# ── Public API ────────────────────────────────────────────────────────────────

def get_supported_disorders() -> list[str]:
    """Return the list of all disorders covered by the knowledge base."""
    kb = _load_knowledge_base()
    return list(kb.keys())


def get_treatment_plan(diagnosis: str) -> dict:
    """
    Return the full treatment plan for a given confirmed diagnosis.

    Parameters
    ----------
    diagnosis : str
        The confirmed disorder name — must match a key in techniques.json
        (case-sensitive, exact match first, then case-insensitive fallback).

    Returns
    -------
    dict with keys:
        diagnosis            : str  — normalised disorder name
        psychoeducation      : list[str]
        behavioral           : list[str]
        cognitive            : list[str]
        pharmacological      : list[str]
        complementary        : list[str]
        recommended_sessions : str
        found                : bool — False when disorder is not in the KB

    Raises
    ------
    ValueError
        If the knowledge base file cannot be loaded.
    """
    kb = _load_knowledge_base()

    # 1. Exact match
    if diagnosis in kb:
        plan = kb[diagnosis]
        return _build_response(diagnosis, plan, found=True)

    # 2. Case-insensitive fallback
    diagnosis_lower = diagnosis.strip().lower()
    for key, plan in kb.items():
        if key.lower() == diagnosis_lower:
            return _build_response(key, plan, found=True)

    # 3. Partial match fallback (useful if model output has slight variations)
    for key, plan in kb.items():
        if diagnosis_lower in key.lower() or key.lower() in diagnosis_lower:
            return _build_response(key, plan, found=True)

    # 4. Not found — return empty plan with flag
    return _build_response(diagnosis, {}, found=False)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _build_response(diagnosis: str, plan: dict, found: bool) -> dict:
    return {
        "diagnosis": diagnosis,
        "found": found,
        "psychoeducation": plan.get("psychoeducation", []),
        "behavioral": plan.get("behavioral", []),
        "cognitive": plan.get("cognitive", []),
        "pharmacological": plan.get("pharmacological", []),
        "complementary": plan.get("complementary", []),
        "recommended_sessions": plan.get("recommended_sessions", "À définir selon évaluation clinique"),
    }
