"""
DME : dossier medical electronique partage patient <-> therapeute.
Droits :
  - patient   : peut LIRE et REMPLIR les infos ; peut AJOUTER un document.
                Ne peut PAS ecrire le compte-rendu, ni supprimer un document.
  - therapeute: peut TOUT (infos + compte-rendu + ajouter/supprimer documents).
Le role est passe via le query param ?role=patient|doctor.
"""
import os
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection

router = APIRouter()

UPLOAD_DIR = "backend/static/uploads/dme"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Champs que le PATIENT a le droit de modifier
PATIENT_FIELDS = {
    "nom", "prenom", "date_naissance", "sexe", "adresse", "telephone", "email",
    "contact_urgence_nom", "contact_urgence_tel", "numero_assurance",
    "groupe_sanguin", "profession", "situation_familiale", "medecin_traitant",
    "allergies", "medicaments_en_cours", "antecedents_medicaux",
    "antecedents_psychologiques", "motif_consultation",
}
# Champs reserves au THERAPEUTE
DOCTOR_ONLY_FIELDS = {"compte_rendu", "diagnostic", "plan_traitement"}


class DMEUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    date_naissance: Optional[str] = None
    sexe: Optional[str] = None
    adresse: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    contact_urgence_nom: Optional[str] = None
    contact_urgence_tel: Optional[str] = None
    numero_assurance: Optional[str] = None
    groupe_sanguin: Optional[str] = None
    profession: Optional[str] = None
    situation_familiale: Optional[str] = None
    medecin_traitant: Optional[str] = None
    allergies: Optional[str] = None
    medicaments_en_cours: Optional[str] = None
    antecedents_medicaux: Optional[str] = None
    antecedents_psychologiques: Optional[str] = None
    motif_consultation: Optional[str] = None
    compte_rendu: Optional[str] = None
    diagnostic: Optional[str] = None
    plan_traitement: Optional[str] = None


def _iso(v):
    if v is None:
        return None
    try:
        return v.isoformat()
    except AttributeError:
        return str(v)


@router.get("/{patient_id}")
def get_dme(patient_id: int):
    """Return the patient's DME (creates an empty one if none exists)."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM dme WHERE patient_id = %s", (patient_id,))
        row = cur.fetchone()
        if not row:
            # Pre-fill from the patient table on first access
            cur.execute("""
                SELECT nom, prenom, email, telephone, sexe, adresse,
                       dateNaissance, contact_urgence_nom, contact_urgence_tel
                FROM patient WHERE idPatient = %s
            """, (patient_id,))
            p = cur.fetchone() or {}
            cur.execute("""
                INSERT INTO dme (patient_id, nom, prenom, email, telephone, sexe,
                                 adresse, date_naissance, contact_urgence_nom, contact_urgence_tel)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
            """, (
                patient_id, p.get("nom"), p.get("prenom"), p.get("email"),
                p.get("telephone"), p.get("sexe"), p.get("adresse"),
                p.get("datenaissance"), p.get("contact_urgence_nom"), p.get("contact_urgence_tel"),
            ))
            row = cur.fetchone()
            conn.commit()

        result = dict(row)
        if "date_naissance" in result:
            result["date_naissance"] = _iso(result["date_naissance"])
        result["updated_at"] = _iso(result.get("updated_at"))

        # Attach documents
        cur.execute("SELECT * FROM dme_documents WHERE patient_id = %s ORDER BY created_at DESC", (patient_id,))
        docs = []
        for d in cur.fetchall():
            dd = dict(d)
            dd["created_at"] = _iso(dd.get("created_at"))
            docs.append(dd)
        result["documents"] = docs
        return result
    finally:
        conn.close()


@router.patch("/{patient_id}")
def update_dme(patient_id: int, updates: DMEUpdate, role: str = "patient"):
    """Update the DME. Patient cannot write doctor-only fields."""
    data = updates.model_dump(exclude_none=True)

    # Enforce permissions
    if role != "doctor":
        blocked = DOCTOR_ONLY_FIELDS.intersection(data.keys())
        if blocked:
            raise HTTPException(status_code=403, detail="Le compte-rendu est réservé au thérapeute.")
        data = {k: v for k, v in data.items() if k in PATIENT_FIELDS}

    if not data:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM dme WHERE patient_id = %s", (patient_id,))
        if not cur.fetchone():
            cur.execute("INSERT INTO dme (patient_id) VALUES (%s)", (patient_id,))

        fields = ", ".join(f"{k} = %s" for k in data)
        values = list(data.values()) + [role, patient_id]
        cur.execute(
            f"UPDATE dme SET {fields}, updated_by = %s, updated_at = CURRENT_TIMESTAMP WHERE patient_id = %s",
            values,
        )
        conn.commit()
        return {"message": "Dossier mis à jour avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/{patient_id}/documents")
async def upload_document(
    patient_id: int,
    file: UploadFile = File(...),
    role: str = Form("patient"),
    uploader_name: str = Form(""),
):
    """Upload a document (photo or PDF). Patient and doctor can both add."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"]:
        raise HTTPException(status_code=415, detail="Formats acceptés : images et PDF.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 10MB).")

    fname = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOAD_DIR, fname)
    with open(path, "wb") as f:
        f.write(contents)
    file_url = f"/static/uploads/dme/{fname}"
    file_type = "pdf" if ext == ".pdf" else "image"

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO dme_documents
                (patient_id, filename, original_name, file_url, file_type, uploaded_by, uploaded_by_name)
            VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (patient_id, fname, file.filename, file_url, file_type, role, uploader_name))
        new_id = cur.fetchone()["id"]
        conn.commit()
        return {"id": new_id, "file_url": file_url, "file_type": file_type, "original_name": file.filename}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/{patient_id}/documents/{doc_id}")
def delete_document(patient_id: int, doc_id: int, role: str = "patient"):
    """Delete a document. Only the therapist may delete."""
    if role != "doctor":
        raise HTTPException(status_code=403, detail="Seul le thérapeute peut supprimer un document.")
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT filename FROM dme_documents WHERE id = %s AND patient_id = %s", (doc_id, patient_id))
        row = cur.fetchone()
        if row:
            try:
                os.remove(os.path.join(UPLOAD_DIR, row["filename"]))
            except OSError:
                pass
        cur.execute("DELETE FROM dme_documents WHERE id = %s AND patient_id = %s", (doc_id, patient_id))
        conn.commit()
        return {"message": "Document supprimé"}
    finally:
        conn.close()
