"""
Sessions router
===============
Emits in-app notifications when a therapy session is created or completed.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from backend.database import get_connection
from backend.services.notification_service import create_notification

router = APIRouter()


class SessionCreate(BaseModel):
    dateHeureDebut: datetime
    dureeMinutes: Optional[int] = None
    statut: Optional[str] = "planifiee"
    type: str
    lienVisio: Optional[str] = None
    idPatient: int
    idTherapeute: int
    idRendezVous: Optional[int] = None


def _fmt_date(dt) -> str:
    try:
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt)
        return dt.strftime("%d/%m/%Y à %H:%M")
    except Exception:
        return str(dt)


@router.get("/")
def get_sessions():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM SessionTherapie ORDER BY dateHeureDebut DESC")
    rows = cur.fetchall()
    conn.close()
    return rows


@router.get("/{id}")
def get_session(id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM SessionTherapie WHERE idSession = %s", (id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Session introuvable")
    return row


@router.post("/")
def create_session(s: SessionCreate):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO SessionTherapie
                (dateHeureDebut, dureeMinutes, statut, type, lienVisio,
                 idPatient, idTherapeute, idRendezVous)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING idSession
            """,
            (
                s.dateHeureDebut, s.dureeMinutes, s.statut, s.type,
                s.lienVisio, s.idPatient, s.idTherapeute, s.idRendezVous,
            ),
        )
        new_id = cur.fetchone()["idsession"]
        date_str = _fmt_date(s.dateHeureDebut)

        # Fetch therapist name
        cur.execute(
            "SELECT nom, prenom FROM psychotherapeute WHERE idtherapeute = %s",
            (s.idTherapeute,),
        )
        t = cur.fetchone()
        therapist_name = f"Dr. {t['prenom']} {t['nom']}" if t else f"Thérapeute #{s.idTherapeute}"

        # Notify patient: session created
        create_notification(
            conn=conn,
            user_id=s.idPatient,
            user_role="patient",
            notif_type="session_created",
            title="Nouvelle session thérapeutique planifiée",
            body=f"Une session {s.type} avec {therapist_name} est planifiée le {date_str}."
            + (f" Lien visio : {s.lienVisio}" if s.lienVisio else ""),
            related_id=new_id,
            related_type="session",
        )

        conn.commit()
    finally:
        conn.close()

    return {"idSession": new_id, "message": "Session créée avec succès"}


@router.patch("/{id}/statut")
def update_session_statut(id: int, statut: str):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT idpatient, idtherapeute, dateheurededebut FROM SessionTherapie WHERE idSession = %s",
            (id,),
        )
        session = cur.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session introuvable")

        cur.execute(
            "UPDATE SessionTherapie SET statut = %s WHERE idSession = %s",
            (statut, id),
        )

        if statut.lower() in ("terminee", "completed"):
            date_str = _fmt_date(session["dateheurededebut"])
            cur.execute(
                "SELECT nom, prenom FROM psychotherapeute WHERE idtherapeute = %s",
                (session["idtherapeute"],),
            )
            t = cur.fetchone()
            therapist_name = f"Dr. {t['prenom']} {t['nom']}" if t else f"Thérapeute #{session['idtherapeute']}"

            create_notification(
                conn=conn,
                user_id=session["idpatient"],
                user_role="patient",
                notif_type="session_completed",
                title="Session terminée",
                body=f"Votre session avec {therapist_name} du {date_str} est terminée.",
                related_id=id,
                related_type="session",
            )

        conn.commit()
    finally:
        conn.close()

    return {"message": f"Statut session mis à jour : {statut}"}
