"""
Pydantic schemas — Diagnosis module
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional

# ── Shared symptom feature list (84 binary features) ─────────────────────────

SYMPTOM_FEATURES: list[str] = [
    "humeur_depressive_persistante",
    "perte_interet_plaisir",
    "modification_appetit_poids",
    "insomnie_hypersomnie",
    "agitation_ralentissement_psychomoteur",
    "fatigue_perte_energie",
    "devalorisation_culpabilite",
    "difficulte_concentration",
    "pensees_recurrentes_mort",
    "anxiete_excessive_persistante",
    "difficulte_controle_inquietudes",
    "tension_musculaire",
    "fatigabilite",
    "irritabilite",
    "troubles_sommeil",
    "palpitations",
    "dyspnee",
    "douleurs_thoraciques",
    "vertiges",
    "tremblements",
    "sudation",
    "peur_mourir",
    "peur_perdre_controle",
    "pensees_intrusives",
    "images_mentales_recurrentes",
    "impulsions_non_desirees",
    "lavages_excessifs",
    "verifications_repetees",
    "comptages",
    "rituels_mentaux",
    "reorganisation_compulsive",
    "reviviscences_traumatiques",
    "cauchemars",
    "flashbacks",
    "evitement",
    "hypervigilance",
    "humeur_expansive",
    "reduction_besoin_sommeil",
    "acceleration_pensee",
    "hyperactivite",
    "prises_risques_excessives",
    "hallucinations",
    "idees_delirantes",
    "discours_desorganise",
    "comportement_desorganise",
    "aplatissement_affectif",
    "retrait_social",
    "avolition",
    "pauvrete_discours",
    "deficits_attentionnels",
    "troubles_executifs",
    "difficultes_memoire_travail",
    "mefiance_excessive",
    "suspicion_permanente",
    "hypersensibilite_critiques",
    "difficulte_accorder_confiance",
    "interpretation_intentions_malveillantes",
    "instabilite_relationnelle",
    "impulsivite",
    "perturbation_identite",
    "instabilite_emotionnelle",
    "peur_intense_abandon",
    "sentiment_chronique_vide",
    "difficultes_interactions_sociales",
    "difficultes_reciprocite_emotionnelle",
    "difficultes_relationnelles",
    "stereotypies",
    "interets_restreints",
    "rigidite_comportementale",
    "particularites_sensorielles",
    "distractibilite",
    "oublis_frequents",
    "desorganisation",
    "difficulte_maintien_attention",
    "agitation_motrice",
    "difficulte_rester_assis",
    "interruptions_frequentes",
    "reponses_impulsives",
    "craving",
    "perte_controle",
    "tolerance",
    "symptomes_sevrage",
    "alteration_fonctionnement_social",
    "poursuite_malgre_consequences",
]


# ── Request schemas ───────────────────────────────────────────────────────────

class AutomaticDiagnosisRequest(BaseModel):
    """
    Automatic diagnosis from questionnaire answers + chatbot history.
    The patient and therapist IDs are required.
    """
    id_patient: int = Field(..., gt=0, description="Patient ID")
    id_therapeute: int = Field(..., gt=0, description="Therapist ID requesting the diagnosis")

    class Config:
        json_schema_extra = {
            "example": {
                "id_patient": 3,
                "id_therapeute": 1
            }
        }


class ManualDiagnosisRequest(BaseModel):
    """
    Manual diagnosis: therapist fills the 84-feature symptom form.
    Each symptom value must be 0 or 1.
    """
    id_patient: int = Field(..., gt=0)
    id_therapeute: int = Field(..., gt=0)
    symptoms: dict[str, int] = Field(
        ...,
        description="Dict of symptom_name -> 0 or 1 (84 binary features)"
    )

    @field_validator("symptoms")
    @classmethod
    def validate_binary_values(cls, v: dict) -> dict:
        for key, val in v.items():
            if val not in (0, 1):
                raise ValueError(
                    f"Symptom '{key}' must be 0 or 1, got {val}"
                )
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "id_patient": 3,
                "id_therapeute": 1,
                "symptoms": {
                    "humeur_depressive_persistante": 1,
                    "perte_interet_plaisir": 1,
                    "fatigue_perte_energie": 1,
                    "difficulte_concentration": 0
                }
            }
        }


class ConfirmDiagnosisRequest(BaseModel):
    """
    Therapist confirms or modifies the AI-suggested diagnosis.
    The confirmed_diagnosis may differ from the top AI prediction.
    """
    id_patient: int = Field(..., gt=0)
    id_therapeute: int = Field(..., gt=0)
    confirmed_diagnosis: str = Field(
        ..., min_length=2, description="Final diagnosis chosen by the therapist"
    )
    ai_top1: Optional[str] = Field(None, description="AI's first prediction (for audit trail)")
    ai_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    notes: Optional[str] = Field(None, description="Clinical notes from the therapist")

    class Config:
        json_schema_extra = {
            "example": {
                "id_patient": 3,
                "id_therapeute": 1,
                "confirmed_diagnosis": "Trouble Anxieux Généralisé",
                "ai_top1": "Trouble Anxieux Généralisé",
                "ai_confidence": 0.81,
                "notes": "Confirme le diagnostic IA. Patient suit un traitement depuis 3 mois."
            }
        }


# ── Response schemas ──────────────────────────────────────────────────────────

class DiagnosisPrediction(BaseModel):
    diagnosis: str
    confidence: float = Field(..., description="Probability score between 0 and 1")


class DiagnosisResponse(BaseModel):
    predictions: list[DiagnosisPrediction] = Field(
        ..., description="Top 3 predicted diagnoses with confidence scores"
    )
    symptoms_used: list[str] = Field(
        default_factory=list,
        description="List of active symptoms (value=1) used for prediction"
    )
    mode: str = Field(..., description="'automatic' or 'manual'")
    id_patient: int
    id_therapeute: int


class ConfirmDiagnosisResponse(BaseModel):
    id_diagnostic: int
    confirmed_diagnosis: str
    id_patient: int
    id_therapeute: int
    message: str


class SymptomListResponse(BaseModel):
    symptoms: list[str]
    total: int