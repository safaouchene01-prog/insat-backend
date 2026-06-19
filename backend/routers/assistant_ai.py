"""
FastAPI Router — Therapist AI Assistant
========================================
Provides AI-assisted clinical decision support for licensed psychologists.

Endpoints:
  POST /assistant-ai/diagnosis/automatic   → Auto diagnosis (questionnaire + chatbot)
  POST /assistant-ai/diagnosis/manual      → Manual diagnosis (therapist fills form)
  POST /assistant-ai/diagnosis/confirm     → Therapist confirms / modifies diagnosis
  POST /assistant-ai/treatment-plan        → Generate therapeutic recommendations
  GET  /assistant-ai/symptoms              → List all 84 symptom features
  GET  /assistant-ai/disorders             → List all supported disorders

IMPORTANT: The AI is a clinical decision-support tool only.
           The therapist always retains full authority over clinical decisions.
"""

import logging
from fastapi import APIRouter, HTTPException, status

from backend.services.notification_service import create_notification_standalone
from AI_Services.Assisstant_AI.schemas.diagnosis import (
    AutomaticDiagnosisRequest,
    ManualDiagnosisRequest,
    ConfirmDiagnosisRequest,
    DiagnosisResponse,
    ConfirmDiagnosisResponse,
    SymptomListResponse,
    SYMPTOM_FEATURES,
)
from AI_Services.Assisstant_AI.schemas.treatment import (
    TreatmentPlanRequest,
    TreatmentPlanResponse,
    SupportedDisordersResponse,
)
from AI_Services.Assisstant_AI.services.diagnosis_service import (
    diagnose_automatic,
    diagnose_manual,
    confirm_diagnosis,
    NoSymptomDataError,
)
from AI_Services.Assisstant_AI.services.treatment_service import (
    generate_treatment_plan,
    list_supported_disorders,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Assistant IA Thérapeute"])


# ── Diagnosis — Automatic mode ────────────────────────────────────────────────

@router.post(
    "/diagnosis/automatic",
    response_model=DiagnosisResponse,
    summary="Diagnostic automatique (questionnaire + historique chatbot)",
    description=(
        "Fusionne les réponses au questionnaire et l'historique chatbot du patient, "
        "extrait les symptômes, construit le vecteur binaire et exécute le modèle "
        "CatBoost pour retourner le Top 3 des diagnostics avec scores de confiance."
    ),
)
def automatic_diagnosis(body: AutomaticDiagnosisRequest) -> DiagnosisResponse:
    try:
        result = diagnose_automatic(
            id_patient=body.id_patient,
            id_therapeute=body.id_therapeute,
        )
        # Notify therapist that AI automatic diagnosis is ready
        create_notification_standalone(
            user_id=body.id_therapeute,
            user_role="doctor",
            notif_type="ai_diagnosis",
            title="Diagnostic IA généré (automatique)",
            body=(
                f"Le diagnostic automatique du patient #{body.id_patient} est disponible"
                f" — Top 1 : {result.predictions[0].diagnosis if result.predictions else 'N/A'}"
                f" ({round(result.predictions[0].confidence * 100)}%)."
                if result.predictions else
                f"Le diagnostic automatique du patient #{body.id_patient} est disponible."
            ),
            related_id=body.id_patient,
            related_type="diagnostic",
        )
        return result
    except NoSymptomDataError as exc:
        # No questionnaire AND no chatbot history → guide therapist to manual mode
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": str(exc),
                "redirect_to": "manual",
                "reason": "no_symptom_data",
            },
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Modèle de diagnostic non disponible : {exc}",
        )
    except Exception as exc:
        logger.exception("Automatic diagnosis failed for patient %d", body.id_patient)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du diagnostic automatique : {exc}",
        )


# ── Diagnosis — Manual mode ───────────────────────────────────────────────────

@router.post(
    "/diagnosis/manual",
    response_model=DiagnosisResponse,
    summary="Diagnostic manuel (formulaire symptômes rempli par le thérapeute)",
    description=(
        "Le thérapeute soumet les 84 symptômes binaires manuellement. "
        "Le système construit le vecteur de features, exécute CatBoost "
        "et retourne le Top 3 des diagnostics."
    ),
)
def manual_diagnosis(body: ManualDiagnosisRequest) -> DiagnosisResponse:
    try:
        result = diagnose_manual(
            id_patient=body.id_patient,
            id_therapeute=body.id_therapeute,
            symptoms=body.symptoms,
        )
        # Notify therapist that AI diagnosis is ready
        create_notification_standalone(
            user_id=body.id_therapeute,
            user_role="doctor",
            notif_type="ai_diagnosis",
            title="Diagnostic IA généré (manuel)",
            body=f"Le diagnostic IA du patient #{body.id_patient} est disponible — Top 1 : {result.predictions[0].diagnosis if result.predictions else 'N/A'}.",
            related_id=body.id_patient,
            related_type="diagnostic",
        )
        return result
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Modèle de diagnostic non disponible : {exc}",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Manual diagnosis failed for patient %d", body.id_patient)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du diagnostic manuel : {exc}",
        )


# ── Diagnosis — Confirm ───────────────────────────────────────────────────────

@router.post(
    "/diagnosis/confirm",
    response_model=ConfirmDiagnosisResponse,
    summary="Confirmer ou modifier le diagnostic (décision finale du thérapeute)",
    description=(
        "Le thérapeute valide ou corrige le diagnostic suggéré par l'IA. "
        "Le diagnostic confirmé est persisté en base de données et sera "
        "utilisé automatiquement pour les recommandations thérapeutiques."
    ),
)
def confirm_diagnosis_endpoint(body: ConfirmDiagnosisRequest) -> ConfirmDiagnosisResponse:
    try:
        result = confirm_diagnosis(
            id_patient=body.id_patient,
            id_therapeute=body.id_therapeute,
            confirmed_diagnosis=body.confirmed_diagnosis,
            ai_top1=body.ai_top1,
            ai_confidence=body.ai_confidence,
            notes=body.notes,
        )
        # Notify the therapist that the diagnosis has been saved
        create_notification_standalone(
            user_id=body.id_therapeute,
            user_role="doctor",
            notif_type="ai_diagnosis",
            title="Diagnostic confirmé et enregistré",
            body=f"Le diagnostic « {body.confirmed_diagnosis} » pour le patient #{body.id_patient} a été confirmé.",
            related_id=body.id_patient,
            related_type="diagnostic",
        )
        return result
    except Exception as exc:
        logger.exception(
            "Failed to confirm diagnosis for patient %d", body.id_patient
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la confirmation du diagnostic : {exc}",
        )


# ── Treatment plan ────────────────────────────────────────────────────────────

@router.post(
    "/treatment-plan",
    response_model=TreatmentPlanResponse,
    summary="Générer un plan de recommandations thérapeutiques",
    description=(
        "Génère des suggestions de prise en charge basées sur le diagnostic confirmé. "
        "Si un diagnostic confirmé existe déjà en base pour ce patient, il est utilisé "
        "automatiquement. Sinon, le thérapeute peut le fournir explicitement dans le corps "
        "de la requête. "
        "IMPORTANT : Ces suggestions sont un outil d'aide à la décision clinique uniquement."
    ),
)
def treatment_plan(body: TreatmentPlanRequest) -> TreatmentPlanResponse:
    try:
        result = generate_treatment_plan(
            id_patient=body.id_patient,
            id_therapeute=body.id_therapeute,
            diagnosis=body.diagnosis,
        )
        # Notify the therapist that the treatment plan is ready
        create_notification_standalone(
            user_id=body.id_therapeute,
            user_role="doctor",
            notif_type="ai_treatment",
            title="Plan de traitement généré",
            body=f"Le plan de traitement pour « {result.diagnosis} » (patient #{body.id_patient}) est prêt.",
            related_id=body.id_patient,
            related_type="diagnostic",
        )
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception(
            "Failed to generate treatment plan for patient %d", body.id_patient
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la génération du plan de traitement : {exc}",
        )


# ── Utility endpoints ─────────────────────────────────────────────────────────

@router.get(
    "/symptoms",
    response_model=SymptomListResponse,
    summary="Liste des 84 symptômes binaires du modèle",
)
def list_symptoms() -> SymptomListResponse:
    return SymptomListResponse(
        symptoms=SYMPTOM_FEATURES,
        total=len(SYMPTOM_FEATURES),
    )


@router.get(
    "/disorders",
    response_model=SupportedDisordersResponse,
    summary="Liste des troubles pris en charge par la base de connaissances",
)
def list_disorders() -> SupportedDisordersResponse:
    try:
        disorders = list_supported_disorders()
        return SupportedDisordersResponse(disorders=disorders, total=len(disorders))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du chargement de la base de connaissances : {exc}",
        )