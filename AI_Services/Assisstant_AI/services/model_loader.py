"""
Model Loader — CatBoost diagnostic model + label encoder
=========================================================
Loads models once at startup (singleton pattern).
Exclusively uses:
  - models/diagnostic_model.cbm
  - models/label_encoder.pkl

No OpenAI, no LLM, no rule-based fallback for diagnosis.
"""

import logging
from pathlib import Path
from typing import Optional

import joblib
from catboost import CatBoostClassifier

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────

_MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
_MODEL_PATH = _MODELS_DIR / "diagnostic_model.cbm"
_ENCODER_PATH = _MODELS_DIR / "label_encoder.pkl"

# ── Singletons ────────────────────────────────────────────────────────────────

_model: Optional[CatBoostClassifier] = None
_encoder = None


def get_model() -> CatBoostClassifier:
    """
    Return the loaded CatBoost classifier (lazy singleton).

    Raises
    ------
    FileNotFoundError  — if the .cbm file is missing
    RuntimeError       — if loading fails for any other reason
    """
    global _model
    if _model is None:
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(
                f"CatBoost model not found at: {_MODEL_PATH}\n"
                "Ensure models/diagnostic_model.cbm is present."
            )
        try:
            clf = CatBoostClassifier()
            clf.load_model(str(_MODEL_PATH))
            _model = clf
            logger.info("CatBoost diagnostic model loaded from %s", _MODEL_PATH)
        except Exception as exc:
            raise RuntimeError(
                f"Failed to load CatBoost model: {exc}"
            ) from exc
    return _model


def get_encoder():
    """
    Return the loaded LabelEncoder (lazy singleton).

    Raises
    ------
    FileNotFoundError  — if the .pkl file is missing
    RuntimeError       — if loading fails
    """
    global _encoder
    if _encoder is None:
        if not _ENCODER_PATH.exists():
            raise FileNotFoundError(
                f"Label encoder not found at: {_ENCODER_PATH}\n"
                "Ensure models/label_encoder.pkl is present."
            )
        try:
            _encoder = joblib.load(_ENCODER_PATH)
            logger.info("Label encoder loaded from %s", _ENCODER_PATH)
        except Exception as exc:
            raise RuntimeError(
                f"Failed to load label encoder: {exc}"
            ) from exc
    return _encoder


def get_feature_names() -> list[str]:
    """Return the feature names expected by the model (from model internals)."""
    model = get_model()
    return list(model.feature_names_)
