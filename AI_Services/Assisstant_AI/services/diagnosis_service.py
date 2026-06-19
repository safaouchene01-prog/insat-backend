"""
Diagnosis Service
=================
Core diagnostic logic:
  - Automatic mode  : questionnaire + chatbot history → CatBoost
  - Manual mode     : therapist-supplied symptom vector → CatBoost
  - Confirm         : persist the therapist's final decision to unified ai_diagnoses table
  - Audit           : store every AI prediction in the unified ai_diagnoses table

Only uses CatBoost (models/diagnostic_model.cbm + models/label_encoder.pkl).
No LLM, no OpenAI, no rule-based fallback for diagnosis.
"""

import json
import logging
from typing import Optional

import numpy as np
import pandas as pd

from backend.database import get_connection
from AI_Services.Assisstant_AI.services.model_loader import get_model, get_encoder, get_feature_names
from AI_Services.Assisstant_AI.services.questionnaire_service import get_symptom_vector_from_questionnaire
from AI_Services.Assisstant_AI.services.chatbot_history_service import extract_symptoms_from_history
from AI_Services.Assisstant_AI.schemas.diagnosis import (
    DiagnosisResponse,
    DiagnosisPrediction,
    ConfirmDiagnosisResponse,
    SYMPTOM_FEATURES,
)

logger = logging.getLogger(__name__)


# ── Custom exceptions ─────────────────────────────────────────────────────────

class NoSymptomDataError(Exception):
    """
    Raised when automatic diagnosis is requested but no symptom data
    exists for the patient (empty questionnaire AND empty chatbot history).
    Signals the API layer to redirect the therapist to manual mode.
    """
    pass


# ── Internal prediction helper ────────────────────────────────────────────────

def _run_catboost(symptom_vector: dict[str, int]) -> tuple[list[DiagnosisPrediction], list[str]]:
    """
    Build the feature DataFrame and run CatBoost inference.

    Returns
    -------
    (predictions, active_symptoms)
      predictions     : list of top-3 DiagnosisPrediction (confidence as float 0-1)
      active_symptoms : list of symptom names where value == 1
    """
    model = get_model()
    encoder = get_encoder()
    feature_names = get_feature_names()

    # Build ordered feature row — unknown features default to 0
    row = {feat: symptom_vector.get(feat, 0) for feat in feature_names}
    X = pd.DataFrame([row])[feature_names]

    probabilities: np.ndarray = model.predict_proba(X)[0]

    # Top 3 by descending probability
    top3_indices = np.argsort(probabilities)[::-1][:3]
    predictions = [
        DiagnosisPrediction(
            diagnosis=encoder.inverse_transform([int(i)])[0],
            confidence=round(float(probabilities[int(i)]), 4),
        )
        for i in top3_indices
    ]

    active_symptoms = [feat for feat, val in symptom_vector.items() if val == 1]

    return predictions, active_symptoms


# ── Automatic mode ────────────────────────────────────────────────────────────

def diagnose_automatic(
    id_patient: int,
    id_therapeute: int,
) -> DiagnosisResponse:
    """
    Build the symptom vector by merging:
      1. Questionnaire answers (DB)
      2. Chatbot history extraction (JSON files)
    Then run CatBoost and return Top-3 predictions.

    Questionnaire answers and chatbot extraction are merged with OR logic
    (symptom = 1 if either source says 1).

    If NO symptom data is available from either source, raises
    NoSymptomDataError to redirect the therapist to manual mode.
    """
    feature_names = get_feature_names()

    # Source 1: questionnaire
    q_vector = get_symptom_vector_from_questionnaire(id_patient, feature_names)

    # Source 2: chatbot history
    c_vector = extract_symptoms_from_history(id_patient, feature_names)

    # Merge with OR logic
    merged: dict[str, int] = {
        feat: max(q_vector.get(feat, 0), c_vector.get(feat, 0))
        for feat in feature_names
    }

    # ── Guard: no data available → redirect to manual mode ──────────────
    active_count = sum(merged.values())
    if active_count == 0:
        logger.info(
            "Automatic diagnosis aborted for patient %d: no symptom data "
            "(neither questionnaire nor chatbot history).",
            id_patient,
        )
        raise NoSymptomDataError(
            "Aucune donnée symptomatique n'est disponible pour ce patient "
            "(ni questionnaire rempli, ni historique de conversation avec le chatbot). "
            "Le diagnostic automatique n'est pas possible. "
            "Veuillez utiliser le mode manuel pour saisir les symptômes directement."
        )

    predictions, active_symptoms = _run_catboost(merged)

    # Persist prediction to DB for audit trail
    _save_prediction_to_db(
        id_patient=id_patient,
        id_therapeute=id_therapeute,
        active_symptoms=active_symptoms,
        predictions=predictions,
        mode="automatic",
    )

    return DiagnosisResponse(
        predictions=predictions,
        symptoms_used=active_symptoms,
        mode="automatic",
        id_patient=id_patient,
        id_therapeute=id_therapeute,
    )


# ── Manual mode ───────────────────────────────────────────────────────────────

def diagnose_manual(
    id_patient: int,
    id_therapeute: int,
    symptoms: dict[str, int],
) -> DiagnosisResponse:
    """
    Use the therapist-supplied binary symptom dict directly.
    Validates and aligns to model features before running CatBoost.
    """
    feature_names = get_feature_names()

    # Align: keep only known features; pad missing ones with 0
    aligned: dict[str, int] = {feat: symptoms.get(feat, 0) for feat in feature_names}

    unknown = [k for k in symptoms if k not in set(feature_names)]
    if unknown:
        logger.warning(
            "Manual diagnosis: %d unrecognised symptom(s) ignored: %s",
            len(unknown),
            unknown[:5],
        )

    predictions, active_symptoms = _run_catboost(aligned)

    _save_prediction_to_db(
        id_patient=id_patient,
        id_therapeute=id_therapeute,
        active_symptoms=active_symptoms,
        predictions=predictions,
        mode="manual",
    )

    return DiagnosisResponse(
        predictions=predictions,
        symptoms_used=active_symptoms,
        mode="manual",
        id_patient=id_patient,
        id_therapeute=id_therapeute,
    )


# ── Confirm diagnosis ─────────────────────────────────────────────────────────

def confirm_diagnosis(
    id_patient: int,
    id_therapeute: int,
    confirmed_diagnosis: str,
    ai_top1: Optional[str] = None,
    ai_confidence: Optional[float] = None,
    notes: Optional[str] = None,
) -> ConfirmDiagnosisResponse:
    """
    Persist the therapist's confirmed (or modified) diagnosis to the unified ai_diagnoses table.
    This is the authoritative record used downstream by the treatment module.
    """
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()

            # First, get the latest AI diagnosis for this patient to update it
            cur.execute(
                """
                SELECT id FROM ai_diagnoses
                WHERE patient_id = %s AND doctor_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (id_patient, id_therapeute)
            )
            existing_row = cur.fetchone()

            if existing_row:
                # Update existing diagnosis record to confirmed status
                cur.execute(
                    """
                    UPDATE ai_diagnoses SET
                        final_diagnosis = %s,
                        clinical_notes = %s,
                        ai_top1_backup = %s,
                        confidence_score = %s,
                        status = 'confirmed',
                        confirmed_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id
                    """,
                    (
                        confirmed_diagnosis,
                        notes,
                        ai_top1,
                        ai_confidence,
                        existing_row['id']
                    ),
                )
                new_id = cur.fetchone()["id"]
            else:
                # Create new confirmed diagnosis record
                # Build minimal predictions JSONB for required field
                predictions_jsonb = json.dumps([{
                    "diagnosis": ai_top1 or confirmed_diagnosis,
                    "confidence": ai_confidence or 0.95
                }])

                cur.execute(
                    """
                    INSERT INTO ai_diagnoses
                        (patient_id, doctor_id, final_diagnosis, clinical_notes,
                         ai_top1_backup, confidence_score, predictions, status, confirmed_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, 'confirmed', CURRENT_TIMESTAMP)
                    RETURNING id
                    """,
                    (
                        id_patient,
                        id_therapeute,
                        confirmed_diagnosis,
                        notes,
                        ai_top1,
                        ai_confidence,
                        predictions_jsonb,
                    ),
                )
                new_id = cur.fetchone()["id"]

            conn.commit()
        finally:
            conn.close()

        logger.info(
            "Diagnosis confirmed: patient=%d therapist=%d diagnosis='%s'",
            id_patient,
            id_therapeute,
            confirmed_diagnosis,
        )

        return ConfirmDiagnosisResponse(
            id_diagnostic=new_id,
            confirmed_diagnosis=confirmed_diagnosis,
            id_patient=id_patient,
            id_therapeute=id_therapeute,
            message="Diagnostic confirmé et enregistré avec succès.",
        )

    except Exception as exc:
        logger.error("Failed to confirm diagnosis: %s", exc)
        raise


# ── Fetch latest confirmed diagnosis ─────────────────────────────────────────

def get_latest_confirmed_diagnosis(
    id_patient: int,
    id_therapeute: int,
) -> Optional[str]:
    """
    Return the most recent confirmed diagnosis for a patient/therapist pair.
    Returns None if no confirmed diagnosis exists.
    """
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT final_diagnosis
                FROM ai_diagnoses
                WHERE patient_id = %s AND doctor_id = %s AND status = 'confirmed'
                ORDER BY confirmed_at DESC, created_at DESC
                LIMIT 1
                """,
                (id_patient, id_therapeute),
            )
            row = cur.fetchone()
        finally:
            conn.close()
        return row["final_diagnosis"] if row else None
    except Exception as exc:
        logger.warning("Could not fetch latest confirmed diagnosis: %s", exc)
        return None


# ── DB persistence helper ─────────────────────────────────────────────────────

def _save_prediction_to_db(
    id_patient: int,
    id_therapeute: int,
    active_symptoms: list[str],
    predictions: list[DiagnosisPrediction],
    mode: str,
) -> None:
    """
    Save AI prediction to the unified ai_diagnoses table (audit trail).
    Non-fatal: logs on failure but does not raise.
    """
    if not predictions:
        return

    top1 = predictions[0]

    # Build structured predictions for JSONB column
    predictions_jsonb = json.dumps(
        [{"diagnosis": p.diagnosis, "confidence": p.confidence} for p in predictions],
        ensure_ascii=False,
    )

    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO ai_diagnoses
                    (patient_id, doctor_id, predictions, top_prediction, confidence_score,
                     symptoms_text, symptoms_used, mode, status)
                VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s, %s, 'pending')
                """,
                (
                    id_patient,
                    id_therapeute,
                    predictions_jsonb,
                    top1.diagnosis,
                    top1.confidence,
                    json.dumps(active_symptoms, ensure_ascii=False),
                    active_symptoms,
                    mode,
                ),
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.warning("Could not save AI prediction to DB: %s", exc)