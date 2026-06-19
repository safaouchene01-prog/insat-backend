"""
Routeur Ressources Pédagogiques (PDF)
=====================================
  - POST   /ressources/upload    -> uploader un PDF (admin)
  - GET    /ressources/          -> liste de toutes les ressources
  - GET    /ressources/{id}      -> détails d'une ressource
  - DELETE /ressources/{id}      -> supprimer une ressource (admin)

Les fichiers PDF sont stockés dans backend/static/uploads/ressources/
et servis publiquement via /static/uploads/ressources/<fichier>.
"""

import os
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from backend.database import get_connection

router = APIRouter()

UPLOAD_DIR = "backend/static/uploads/ressources"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Uploader un PDF ─────────────────────────────────────────────────────────────
@router.post("/upload")
async def upload_ressource(
    titre: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
):
    """Uploader un fichier PDF comme ressource pédagogique (réservé à l'admin)."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")

    # Nom de fichier unique pour éviter les collisions
    unique_name = f"{uuid.uuid4().hex}.pdf"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    # Sauvegarder le fichier sur le serveur
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Enregistrer en base
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO RessourcesPedagogique (titreRP, contenuTexte, type, fichier_pdf)
            VALUES (%s, %s, 'PDF', %s)
            RETURNING idRessource
            """,
            (titre, description, unique_name),
        )
        new_id = cur.fetchone()["idressource"]
        conn.commit()
        return {
            "message": "Ressource ajoutée avec succès",
            "idRessource": new_id,
            "fichier_url": f"/static/uploads/ressources/{unique_name}",
        }
    except Exception as e:
        conn.rollback()
        # Nettoyer le fichier si l'insertion échoue
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Erreur : {e}")
    finally:
        conn.close()


# ── Lister toutes les ressources ────────────────────────────────────────────────
@router.get("/")
def get_ressources():
    """Liste de toutes les ressources PDF disponibles (pour les patients)."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT idressource, titrerp, contenuTexte, type, fichier_pdf
            FROM RessourcesPedagogique
            WHERE fichier_pdf IS NOT NULL
            ORDER BY idressource DESC
            """
        )
        rows = cur.fetchall()
        return [
            {
                "id": r["idressource"],
                "titre": r["titrerp"],
                "description": r.get("contenuTexte"),
                "type": r.get("type"),
                "fichier_url": f"/static/uploads/ressources/{r['fichier_pdf']}" if r.get("fichier_pdf") else None,
            }
            for r in rows
        ]
    finally:
        conn.close()


# ── Détails d'une ressource ─────────────────────────────────────────────────────
@router.get("/{id}")
def get_ressource(id: int):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT idressource, titrerp, contenuTexte, fichier_pdf FROM RessourcesPedagogique WHERE idressource = %s",
            (id,),
        )
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Ressource introuvable")
        return {
            "id": r["idressource"],
            "titre": r["titrerp"],
            "description": r.get("contenuTexte"),
            "fichier_url": f"/static/uploads/ressources/{r['fichier_pdf']}" if r.get("fichier_pdf") else None,
        }
    finally:
        conn.close()


# ── Supprimer une ressource ─────────────────────────────────────────────────────
@router.delete("/{id}")
def delete_ressource(id: int):
    """Supprimer une ressource (réservé à l'admin)."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT fichier_pdf FROM RessourcesPedagogique WHERE idressource = %s", (id,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Ressource introuvable")

        # Supprimer le fichier physique
        if r.get("fichier_pdf"):
            file_path = os.path.join(UPLOAD_DIR, r["fichier_pdf"])
            if os.path.exists(file_path):
                os.remove(file_path)

        cur.execute("DELETE FROM RessourcesPedagogique WHERE idressource = %s", (id,))
        conn.commit()
        return {"message": "Ressource supprimée"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur : {e}")
    finally:
        conn.close()
