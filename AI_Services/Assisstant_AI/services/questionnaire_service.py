"""
Questionnaire Service
=====================
Retrieves a patient's questionnaire answers from the database
and maps them to binary symptom features used by the CatBoost model.

Expected DB table:  questionnaire_reponses
  - idpatient       INT
  - symptome        VARCHAR   (symptom key)
  - valeur          INT       (0 or 1)
  - date_reponse    TIMESTAMP

Falls back gracefully if the table does not exist or has no data.
"""

import logging
from typing import Optional

from backend.database import get_connection

logger = logging.getLogger(__name__)


def get_symptom_vector_from_questionnaire(
    patient_id: int,
    feature_names: list[str],
) -> dict[str, int]:
    """
    Query the most recent questionnaire answers for a patient and return
    a binary symptom dict keyed by feature name.

    Parameters
    ----------
    patient_id    : int   — database patient ID
    feature_names : list  — ordered list of features expected by the model

    Returns
    -------
    dict[str, int]  — {symptom_name: 0_or_1} for all model features.
                      Missing answers default to 0.
    """
    # Initialise all features to 0
    vector: dict[str, int] = {feat: 0 for feat in feature_names}

    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            # Fetch the most recent answer per symptom for this patient
            cur.execute(
                """
                SELECT DISTINCT ON (symptome)
                    symptome,
                    valeur
                FROM questionnaire_reponses
                WHERE idpatient = %s
                ORDER BY symptome, date_reponse DESC
                """,
                (patient_id,),
            )
            rows = cur.fetchall()
        finally:
            conn.close()

        for row in rows:
            symptome = row["symptome"]
            valeur = row["valeur"]
            if symptome in vector:
                vector[symptome] = int(bool(valeur))
            else:
                logger.debug(
                    "Questionnaire symptom '%s' not in model features — ignored.",
                    symptome,
                )

        logger.info(
            "Questionnaire: %d answers loaded for patient %d (%d active symptoms).",
            len(rows),
            patient_id,
            sum(vector.values()),
        )

    except Exception as exc:
        # Non-fatal: return zero vector and log the error
        logger.warning(
            "Could not load questionnaire data for patient %d: %s",
            patient_id,
            exc,
        )

    return vector


def get_active_symptoms_from_questionnaire(patient_id: int) -> list[str]:
    """
    Return just the list of symptom names where the patient answered 1.
    Useful for building the symptoms_used audit field.
    """
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT DISTINCT ON (symptome) symptome
                FROM questionnaire_reponses
                WHERE idpatient = %s AND valeur = 1
                ORDER BY symptome, date_reponse DESC
                """,
                (patient_id,),
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        return [row["symptome"] for row in rows]
    except Exception as exc:
        logger.warning("Could not fetch active questionnaire symptoms: %s", exc)
        return []
