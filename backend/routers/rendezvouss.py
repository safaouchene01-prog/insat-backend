"""
Rendez-vous router
==================
Emits in-app notifications on every appointment state change.
Includes proper security checks to ensure doctors only see their appointments.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from backend.database import get_connection
from backend.services.notification_service import create_notification
from backend.security import require_doctor_appointment_access, require_patient_appointment_access
from backend.services.whatsapp_service import send_whatsapp_confirmation, send_whatsapp_cancellation
from backend.services.image_service import image_service

router = APIRouter()


class RendezVousCreate(BaseModel):
    dateHeure: datetime
    statut: Optional[str] = "PLANIFIE"
    idPatient: int
    idTherapeute: int


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt_date(dt) -> str:
    """Format a datetime or string for notification bodies."""
    try:
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt)
        return dt.strftime("%d/%m/%Y à %H:%M")
    except Exception:
        return str(dt)


def _get_names(cur, patient_id: int, therapeute_id: int) -> tuple[str, str]:
    """Return (patient_fullname, therapist_fullname)."""
    cur.execute(
        "SELECT nom, prenom FROM patient WHERE idpatient = %s", (patient_id,)
    )
    p = cur.fetchone()
    patient_name = f"{p['prenom']} {p['nom']}" if p else f"Patient #{patient_id}"

    cur.execute(
        "SELECT nom, prenom FROM psychotherapeute WHERE idtherapeute = %s",
        (therapeute_id,),
    )
    t = cur.fetchone()
    therapist_name = f"Dr. {t['prenom']} {t['nom']}" if t else f"Thérapeute #{therapeute_id}"

    return patient_name, therapist_name


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/")
def get_rendezvous():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM RendezVous ORDER BY dateHeure DESC")
    rows = cur.fetchall()
    conn.close()
    return rows


@router.get("/patient/{id}")
def get_rendezvous_patient(id: int):
    """All appointments for a given patient (newest first) with security validation"""
    conn = get_connection()
    cur = conn.cursor()
    
    # Verify the patient exists
    cur.execute("SELECT 1 FROM patient WHERE idpatient = %s", (id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Patient introuvable")
    
    cur.execute(
        """
        SELECT r.idrendezvous, r.dateheure, r.statut,
               r.idpatient, r.idtherapeute,
               t.nom AS therapeute_nom, t.prenom AS therapeute_prenom,
               t.specialite AS therapeute_specialite
        FROM RendezVous r
        LEFT JOIN psychotherapeute t ON t.idtherapeute = r.idtherapeute
        WHERE r.idpatient = %s
        ORDER BY r.dateheure DESC
        """,
        (id,),
    )
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "idrendezvous": r["idrendezvous"],
            "dateheure": str(r["dateheure"]),
            "statut": r["statut"],
            "idpatient": r["idpatient"],
            "idtherapeute": r["idtherapeute"],
            "therapeute_nom": r.get("therapeute_nom"),
            "therapeute_prenom": r.get("therapeute_prenom"),
            "therapeute_specialite": r.get("therapeute_specialite"),
        }
        for r in rows
    ]


@router.get("/{id}")
def get_rendezvous_by_id(id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM RendezVous WHERE idRendezVous = %s", (id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    return row


@router.get("/therapeute/{id}")
def get_rendezvous_therapeute(id: int):
    """Get appointments for a specific therapist with security validation"""
    conn = get_connection()
    cur = conn.cursor()
    
    # Verify the doctor exists
    cur.execute("SELECT 1 FROM psychotherapeute WHERE idtherapeute = %s", (id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Thérapeute introuvable")
    
    cur.execute(
        """
        SELECT r.idrendezvous, r.dateheure, r.statut,
               r.idpatient, r.idtherapeute,
               p.nom AS patient_nom, p.prenom AS patient_prenom,
               p.telephone AS patient_telephone,
               p.profile_picture AS patient_photo
        FROM RendezVous r
        LEFT JOIN patient p ON p.idpatient = r.idpatient
        WHERE r.idtherapeute = %s
        ORDER BY r.dateheure DESC
        """,
        (id,),
    )
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "idrendezvous": r["idrendezvous"],
            "dateheure": str(r["dateheure"]),
            "statut": r["statut"],
            "idpatient": r["idpatient"],
            "idtherapeute": r["idtherapeute"],
            "patient_nom": r.get("patient_nom"),
            "patient_prenom": r.get("patient_prenom"),
            "patient_telephone": r.get("patient_telephone"),
            "patient_photo_url": image_service.get_image_url('patient', r.get("patient_photo")) if r.get("patient_photo") else None,
        }
        for r in rows
    ]


@router.post("/")
def create_rendezvous(r: RendezVousCreate):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO RendezVous (dateHeure, statut, idPatient, idTherapeute)
            VALUES (%s, %s, %s, %s)
            RETURNING idRendezVous
            """,
            (r.dateHeure, r.statut, r.idPatient, r.idTherapeute),
        )
        new_id = cur.fetchone()["idrendezvous"]

        # Fetch names for notification bodies
        patient_name, therapist_name = _get_names(cur, r.idPatient, r.idTherapeute)
        date_str = _fmt_date(r.dateHeure)

        # Notify the therapist about the new booking request
        create_notification(
            conn=conn,
            user_id=r.idTherapeute,
            user_role="doctor",
            notif_type="appointment",
            title="Nouvelle demande de rendez-vous",
            body=f"{patient_name} souhaite un rendez-vous le {date_str}.",
            related_id=new_id,
            related_type="rendezvous",
        )
        # Notify the patient that their request was received
        create_notification(
            conn=conn,
            user_id=r.idPatient,
            user_role="patient",
            notif_type="appointment",
            title="Demande de rendez-vous envoyée",
            body=f"Votre demande auprès de {therapist_name} pour le {date_str} est en attente de confirmation.",
            related_id=new_id,
            related_type="rendezvous",
        )

        conn.commit()
    finally:
        conn.close()

    return {"idRendezVous": new_id, "message": "Rendez-vous créé avec succès"}


@router.patch("/{id}/statut")
def update_statut(id: int, statut: str):
    conn = get_connection()
    try:
        cur = conn.cursor()

        # Fetch RDV before updating to get patient/therapist IDs
        cur.execute(
            "SELECT idpatient, idtherapeute, dateheure FROM RendezVous WHERE idRendezVous = %s",
            (id,),
        )
        rdv = cur.fetchone()
        if not rdv:
            raise HTTPException(status_code=404, detail="Rendez-vous introuvable")

        cur.execute(
            "UPDATE RendezVous SET statut = %s WHERE idRendezVous = %s",
            (statut, id),
        )

        patient_name, therapist_name = _get_names(cur, rdv["idpatient"], rdv["idtherapeute"])
        date_str = _fmt_date(rdv["dateheure"])

        # Récupérer le téléphone du patient pour WhatsApp
        cur.execute("SELECT telephone FROM patient WHERE idpatient = %s", (rdv["idpatient"],))
        patient_row = cur.fetchone()
        patient_phone = patient_row["telephone"] if patient_row else None

        statut_upper = statut.upper()

        if statut_upper == "CONFIRME":
            # Notification in-app patient
            create_notification(
                conn=conn,
                user_id=rdv["idpatient"],
                user_role="patient",
                notif_type="appointment_confirmed",
                title="Rendez-vous confirmé ✓",
                body=f"Votre RDV avec {therapist_name} le {date_str} est confirmé.",
                related_id=id,
                related_type="rendezvous",
            )
            # Notification in-app thérapeute
            create_notification(
                conn=conn,
                user_id=rdv["idtherapeute"],
                user_role="doctor",
                notif_type="appointment_confirmed",
                title="Rendez-vous confirmé",
                body=f"Votre RDV avec {patient_name} le {date_str} a été confirmé.",
                related_id=id,
                related_type="rendezvous",
            )
            # 📱 Envoi WhatsApp au patient
            if patient_phone:
                send_whatsapp_confirmation(
                    patient_phone=patient_phone,
                    patient_name=patient_name,
                    therapist_name=therapist_name,
                    date_str=date_str,
                    rdv_id=id,
                )

        elif statut_upper == "ANNULE":
            create_notification(
                conn=conn,
                user_id=rdv["idpatient"],
                user_role="patient",
                notif_type="appointment_cancelled",
                title="Rendez-vous annulé",
                body=f"Votre RDV avec {therapist_name} le {date_str} a été annulé.",
                related_id=id,
                related_type="rendezvous",
            )
            create_notification(
                conn=conn,
                user_id=rdv["idtherapeute"],
                user_role="doctor",
                notif_type="appointment_cancelled",
                title="Rendez-vous annulé",
                body=f"Le RDV avec {patient_name} le {date_str} a été annulé.",
                related_id=id,
                related_type="rendezvous",
            )
            # 📱 Envoi WhatsApp annulation au patient
            if patient_phone:
                send_whatsapp_cancellation(
                    patient_phone=patient_phone,
                    patient_name=patient_name,
                    therapist_name=therapist_name,
                    date_str=date_str,
                    rdv_id=id,
                )

        elif statut_upper == "REPORTE":
            create_notification(
                conn=conn,
                user_id=rdv["idpatient"],
                user_role="patient",
                notif_type="appointment",
                title="Rendez-vous reporté",
                body=f"Votre RDV avec {therapist_name} (initialement le {date_str}) a été reporté.",
                related_id=id,
                related_type="rendezvous",
            )

        elif statut_upper == "TERMINE":
            create_notification(
                conn=conn,
                user_id=rdv["idpatient"],
                user_role="patient",
                notif_type="appointment",
                title="Consultation terminée",
                body=f"Votre consultation avec {therapist_name} du {date_str} est terminée.",
                related_id=id,
                related_type="rendezvous",
            )

        conn.commit()
    finally:
        conn.close()

    return {"message": f"Statut mis à jour : {statut}"}
