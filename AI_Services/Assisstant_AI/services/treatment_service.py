"""
Treatment Service
=================
Generates clinical treatment recommendations using the rule-based
knowledge base engine (techniques.json / technique_engine.py).
NO secondary model is trained or used here.
The therapist's confirmed diagnosis drives all recommendations.

The generated plan is also persisted to the ai_treatment_plans table
(linked to the latest confirmed ai_diagnoses row when available).
"""

import json
import logging
from typing import Optional

from backend.database import get_connection
from AI_Services.Assisstant_AI.knowledge_base.technique_engine import (
    get_treatment_plan,
    get_supported_disorders,
)
from AI_Services.Assisstant_AI.services.diagnosis_service import get_latest_confirmed_diagnosis
from AI_Services.Assisstant_AI.schemas.treatment import TreatmentPlanResponse

logger = logging.getLogger(__name__)

_DISCLAIMER = (
    "Ces recommandations sont des suggestions d'aide à la décision clinique basées "
    "sur des protocoles thérapeutiques validés. Le thérapeute conserve l'autorité "
    "finale sur le diagnostic et le plan de traitement."
)


def generate_treatment_plan(
    id_patient: int,
    id_therapeute: int,
    diagnosis: Optional[str] = None,
) -> TreatmentPlanResponse:
    """
    Generate a complete treatment recommendation for a patient.

    Logic:
      1. If `diagnosis` is provided, use it directly.
      2. Otherwise, look up the most recent confirmed diagnosis for
         this patient/therapist pair in the DB.
      3. Query the clinical knowledge base for the disorder.
      4. Persist the plan to ai_treatment_plans (non-fatal).
      5. Return a structured TreatmentPlanResponse.

    Parameters
    ----------
    id_patient    : int
    id_therapeute : int
    diagnosis     : str | None — override; if None, fetched from DB

    Returns
    -------
    TreatmentPlanResponse

    Raises
    ------
    ValueError   — if no diagnosis can be resolved (not passed and not in DB)
    """
    resolved_diagnosis = diagnosis

    # Auto-fetch from DB if not explicitly provided
    if not resolved_diagnosis:
        resolved_diagnosis = get_latest_confirmed_diagnosis(id_patient, id_therapeute)
        if resolved_diagnosis:
            logger.info(
                "Treatment plan: using confirmed diagnosis '%s' from DB "
                "(patient=%d, therapist=%d).",
                resolved_diagnosis,
                id_patient,
                id_therapeute,
            )
        else:
            raise ValueError(
                f"No confirmed diagnosis found for patient {id_patient} "
                f"with therapist {id_therapeute}. "
                "Please confirm a diagnosis first or provide it explicitly."
            )

    # Query knowledge base
    plan = get_treatment_plan(resolved_diagnosis)

    if not plan["found"]:
        logger.warning(
            "Diagnosis '%s' not found in knowledge base. "
            "Returning empty plan.",
            resolved_diagnosis,
        )

    response = TreatmentPlanResponse(
        id_patient=id_patient,
        id_therapeute=id_therapeute,
        diagnosis=plan["diagnosis"],
        found_in_kb=plan["found"],
        psychoeducation=plan["psychoeducation"],
        behavioral=plan["behavioral"],
        cognitive=plan["cognitive"],
        pharmacological=plan["pharmacological"],
        complementary=plan["complementary"],
        recommended_sessions=plan["recommended_sessions"],
        disclaimer=_DISCLAIMER,
    )

    # Persist the generated plan (non-fatal)
    _save_treatment_plan_to_db(
        id_patient=id_patient,
        id_therapeute=id_therapeute,
        response=response,
    )

    return response


def list_supported_disorders() -> list[str]:
    """Return the list of disorders covered by the knowledge base."""
    return get_supported_disorders()


# ── DB persistence helper ─────────────────────────────────────────────────────

def _get_latest_diagnosis_id(
    cur,
    id_patient: int,
    id_therapeute: int,
) -> Optional[int]:
    """
    Return the id of the most recent confirmed ai_diagnoses row for this
    patient/therapist pair, falling back to the most recent row of any status.
    Returns None if no diagnosis row exists.
    """
    # Prefer the latest confirmed diagnosis
    cur.execute(
        """
        SELECT id FROM ai_diagnoses
        WHERE patient_id = %s AND doctor_id = %s AND status = 'confirmed'
        ORDER BY confirmed_at DESC, created_at DESC
        LIMIT 1
        """,
        (id_patient, id_therapeute),
    )
    row = cur.fetchone()
    if row:
        return row["id"]

    # Fallback: latest diagnosis of any status
    cur.execute(
        """
        SELECT id FROM ai_diagnoses
        WHERE patient_id = %s AND doctor_id = %s
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (id_patient, id_therapeute),
    )
    row = cur.fetchone()
    return row["id"] if row else None


def _save_treatment_plan_to_db(
    id_patient: int,
    id_therapeute: int,
    response: TreatmentPlanResponse,
) -> None:
    """
    Save the generated treatment plan to ai_treatment_plans.
    Non-fatal: logs on failure but does not raise.

    The full structured plan is stored in treatment_json (JSONB).
    diagnosis_id links to the latest confirmed ai_diagnoses row when available.
    """
    treatment_json = json.dumps(
        {
            "diagnosis": response.diagnosis,
            "found_in_kb": response.found_in_kb,
            "psychoeducation": response.psychoeducation,
            "behavioral": response.behavioral,
            "cognitive": response.cognitive,
            "pharmacological": response.pharmacological,
            "complementary": response.complementary,
            "recommended_sessions": response.recommended_sessions,
        },
        ensure_ascii=False,
    )

    try:
        conn = get_connection()
        try:
            cur = conn.cursor()

            diagnosis_id = _get_latest_diagnosis_id(cur, id_patient, id_therapeute)

            cur.execute(
                """
                INSERT INTO ai_treatment_plans
                    (diagnosis_id, patient_id, doctor_id, treatment_json)
                VALUES (%s, %s, %s, %s::jsonb)
                RETURNING id
                """,
                (diagnosis_id, id_patient, id_therapeute, treatment_json),
            )
            new_id = cur.fetchone()["id"]
            conn.commit()

            logger.info(
                "Treatment plan saved (id=%d, diagnosis_id=%s) for patient=%d therapist=%d.",
                new_id,
                diagnosis_id,
                id_patient,
                id_therapeute,
            )
        finally:
            conn.close()
    except Exception as exc:
        logger.warning("Could not save treatment plan to DB: %s", exc)