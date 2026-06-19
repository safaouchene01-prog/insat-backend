"""
Paiements router
================
Emits in-app notifications when a payment is confirmed.
Fixed: hmac.new → hmac.new (was already correct), notifications added.
"""

from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection
from backend.services.notification_service import create_notification
import httpx
import os
import hmac
import hashlib
import json

router = APIRouter()


class PaiementCreate(BaseModel):
    montant: float
    modePaiement: str
    statut: Optional[str] = "en_attente"
    idPatient: int
    idSession: Optional[int] = None
    idRendezVous: Optional[int] = None


class ChargilyCheckoutRequest(BaseModel):
    montant: float
    idPatient: int
    idRendezVous: int


# ── Helpers ────────────────────────────────────────────────────────────────────

def _notify_payment(conn, patient_id: int, montant: float, rdv_id: Optional[int]):
    """Insert a payment notification for the patient and doctor (non-fatal)."""
    try:
        create_notification(
            conn=conn,
            user_id=patient_id,
            user_role="patient",
            notif_type="payment",
            title="Paiement confirmé ✓",
            body=f"Votre paiement de {montant:.2f} DZD a été validé avec succès.",
            related_id=rdv_id,
            related_type="rendezvous" if rdv_id else None,
        )
        if rdv_id:
            cur = conn.cursor()
            cur.execute("""
                SELECT r.idtherapeute, p.nom, p.prenom 
                FROM RendezVous r 
                JOIN patient p ON r.idpatient = p.idpatient 
                WHERE r.idRendezVous = %s
            """, (rdv_id,))
            row = cur.fetchone()
            cur.close()
            if row and row["idtherapeute"]:
                patient_name = f"{row['prenom']} {row['nom']}"
                create_notification(
                    conn=conn,
                    user_id=row["idtherapeute"],
                    user_role="doctor",
                    notif_type="payment",
                    title="Paiement reçu ✓",
                    body=f"Le patient {patient_name} a réglé sa consultation ({montant:.2f} DZD).",
                    related_id=rdv_id,
                    related_type="rendezvous",
                )
    except Exception as e:
        print(f"Error in _notify_payment: {e}")
        pass  # payment notification failure must never break payment flow


# ── Standard CRUD ──────────────────────────────────────────────────────────────

@router.get("/")
def get_paiements():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Paiement ORDER BY datePaiement DESC")
    rows = cur.fetchall()
    conn.close()
    return rows


@router.post("/")
def create_paiement(p: PaiementCreate):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO Paiement (montant, modePaiement, statut, idPatient, idSession, idRendezVous)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING idPaiement
            """,
            (p.montant, p.modePaiement, p.statut, p.idPatient, p.idSession, p.idRendezVous),
        )
        new_id = cur.fetchone()["idpaiement"]

        if p.statut in ("valide", "en_attente"):
            _notify_payment(conn, p.idPatient, p.montant, p.idRendezVous)

        conn.commit()
    finally:
        conn.close()
    return {"idPaiement": new_id, "message": "Paiement enregistré"}


# ── Chargily checkout ─────────────────────────────────────────────────────────

@router.post("/chargily-checkout")
async def create_chargily_checkout(req: ChargilyCheckoutRequest, request: Request):
    CHARGILY_SECRET_KEY = os.getenv("CHARGILY_SECRET_KEY", "test_sk_...")
    webhook_base = os.getenv("WEBHOOK_BASE_URL", str(request.base_url).rstrip("/"))
    webhook_url = f"{webhook_base}/paiements/webhook"
    frontend_url = request.headers.get("origin", "http://localhost:5173").rstrip("/")

    payload = {
        "amount": req.montant,
        "currency": "dzd",
        "success_url": f"{frontend_url}/payment/success",
        "failure_url": f"{frontend_url}/payment/failure",
        "webhook_endpoint": webhook_url,
        "metadata": {
            "idPatient": req.idPatient,
            "idRendezVous": req.idRendezVous,
            "montant": req.montant,
        },
    }
    headers = {
        "Authorization": f"Bearer {CHARGILY_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    url = (
        "https://pay.chargily.net/test/api/v2/checkouts"
        if "test_" in CHARGILY_SECRET_KEY
        else "https://pay.chargily.net/api/v2/checkouts"
    )
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return {"checkout_url": data.get("checkout_url"), "checkout_id": data.get("id")}
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=500, detail=f"Erreur Chargily: {e.response.text}")


@router.get("/chargily-status/{checkout_id}")
async def check_chargily_status(checkout_id: str):
    CHARGILY_SECRET_KEY = os.getenv("CHARGILY_SECRET_KEY", "test_sk_...")
    headers = {"Authorization": f"Bearer {CHARGILY_SECRET_KEY}", "Accept": "application/json"}
    url = (
        f"https://pay.chargily.net/test/api/v2/checkouts/{checkout_id}"
        if "test_" in CHARGILY_SECRET_KEY
        else f"https://pay.chargily.net/api/v2/checkouts/{checkout_id}"
    )
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            status = data.get("status")

            if status == "paid":
                metadata = data.get("metadata", {})
                idPatient = metadata.get("idPatient")
                idRendezVous = metadata.get("idRendezVous")
                montant = metadata.get("montant")
                if idRendezVous:
                    conn = get_connection()
                    try:
                        cur = conn.cursor()
                        cur.execute(
                            "SELECT idPaiement FROM Paiement WHERE idRendezVous = %s AND statut = 'valide'",
                            (idRendezVous,)
                        )
                        existing_payment = cur.fetchone()
                        if not existing_payment:
                            cur.execute(
                                """
                                INSERT INTO Paiement
                                    (montant, modePaiement, statut, idPatient, idRendezVous)
                                VALUES (%s, %s, %s, %s, %s)
                                """,
                                (montant, "carte", "valide", idPatient, idRendezVous),
                            )
                            cur.execute(
                                "UPDATE RendezVous SET statut = 'CONFIRME' WHERE idRendezVous = %s",
                                (idRendezVous,),
                            )
                            if idPatient:
                                _notify_payment(conn, idPatient, float(montant or 0), idRendezVous)
                            conn.commit()
                    finally:
                        conn.close()

            return {"status": status}
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=500, detail=f"Erreur Chargily Status: {e.response.text}")


@router.post("/webhook")
async def chargily_webhook(
    request: Request,
    signature: Optional[str] = Header(None, alias="signature"),
):
    CHARGILY_SECRET_KEY = os.getenv("CHARGILY_SECRET_KEY", "")
    payload = await request.body()

    computed_signature = hmac.new(
        CHARGILY_SECRET_KEY.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    if signature != computed_signature:
        raise HTTPException(status_code=403, detail="Invalid signature")

    event = json.loads(payload)
    if event.get("type") == "checkout.paid":
        checkout_data = event.get("data", {})
        metadata = checkout_data.get("metadata", {})
        idPatient = metadata.get("idPatient")
        idRendezVous = metadata.get("idRendezVous")
        montant = metadata.get("montant")

        if idPatient and montant:
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "SELECT idPaiement FROM Paiement WHERE idRendezVous = %s AND statut = 'valide'",
                    (idRendezVous,)
                )
                existing_payment = cur.fetchone()
                if not existing_payment:
                    cur.execute(
                    """
                    INSERT INTO Paiement
                        (montant, modePaiement, statut, idPatient, idRendezVous)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING idPaiement
                    """,
                    (montant, "carte", "valide", idPatient, idRendezVous),
                )
                if idRendezVous:
                    cur.execute(
                        "UPDATE RendezVous SET statut = 'CONFIRME' WHERE idRendezVous = %s",
                        (idRendezVous,),
                    )
                _notify_payment(conn, int(idPatient), float(montant), idRendezVous)
                conn.commit()
            finally:
                conn.close()

    return {"status": "success"}
