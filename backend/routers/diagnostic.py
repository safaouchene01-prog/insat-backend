"""
Routeur Diagnostic — endpoint de prédiction pour le questionnaire patient.
Expose POST /diagnostic/predire : reçoit les réponses du questionnaire,
lance le modèle CatBoost via diagnose_manual(), sauvegarde en base et
renvoie le diagnostic au format attendu par le frontend (SymptomeChatbot).
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict

logger = logging.getLogger(__name__)

router = APIRouter()


class PredictionRequest(BaseModel):
    symptomes: Dict[str, int]
    idPatient: Optional[int] = None
    idTherapeute: Optional[int] = None


@router.post("/predire")
def predire_diagnostic(req: PredictionRequest):
    """
    Reçoit le questionnaire du patient et renvoie le diagnostic IA (Top-3).
    """
    if not req.idPatient or not req.idTherapeute:
        raise HTTPException(
            status_code=400,
            detail="idPatient et idTherapeute sont requis.",
        )

    try:
        # Import ici (et non en haut) pour éviter de charger le modèle au démarrage
        from AI_Services.Assisstant_AI.services.diagnosis_service import diagnose_manual

        result = diagnose_manual(
            id_patient=int(req.idPatient),
            id_therapeute=int(req.idTherapeute),
            symptoms=req.symptomes,
        )

        # result est un DiagnosisResponse (predictions, symptoms_used, ...)
        predictions = result.predictions
        top1 = predictions[0] if predictions else None

        # Format renvoyé au frontend
        return {
            "trouble_predit": top1.diagnosis if top1 else None,
            "confiance": round(top1.confidence * 100, 1) if top1 else 0,
            "top3": [
                {"trouble": p.diagnosis, "confiance": round(p.confidence * 100, 1)}
                for p in predictions
            ],
            "symptomes": result.symptoms_used,
            "message": "Vos réponses ont été analysées et transmises au médecin.",
        }

    except Exception as exc:
        logger.error("Erreur prédiction diagnostic : %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'analyse : {exc}",
        )
