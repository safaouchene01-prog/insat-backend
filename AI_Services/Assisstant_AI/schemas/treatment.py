"""
Pydantic schemas — Treatment Recommendation module
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Request schemas ───────────────────────────────────────────────────────────

class TreatmentPlanRequest(BaseModel):
    """
    Generate a treatment plan for a confirmed diagnosis.

    If a confirmed diagnosis already exists in the DB for this patient
    (linked to this therapist), it is used automatically.
    Otherwise, the therapist must supply the diagnosis explicitly.
    """
    id_patient: int = Field(..., gt=0)
    id_therapeute: int = Field(..., gt=0)
    diagnosis: Optional[str] = Field(
        None,
        description=(
            "Confirmed diagnosis. If omitted, the system will fetch the "
            "most recent confirmed diagnosis for this patient."
        )
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id_patient": 3,
                "id_therapeute": 1,
                "diagnosis": "Trouble Anxieux Généralisé"
            }
        }


# ── Response schemas ──────────────────────────────────────────────────────────

class TreatmentPlanResponse(BaseModel):
    id_patient: int
    id_therapeute: int
    diagnosis: str
    found_in_kb: bool = Field(
        ...,
        description="True if the diagnosis was found in the clinical knowledge base"
    )
    psychoeducation: list[str]
    behavioral: list[str]
    cognitive: list[str]
    pharmacological: list[str]
    complementary: list[str]
    recommended_sessions: str
    disclaimer: str = Field(
        default=(
            "Ces recommandations sont des suggestions d'aide à la décision clinique. "
            "Le thérapeute conserve l'autorité finale sur le plan de traitement."
        )
    )


class SupportedDisordersResponse(BaseModel):
    disorders: list[str]
    total: int
