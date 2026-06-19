import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection
from backend.services.image_service import image_service

router = APIRouter()

class CliniqueUpdate(BaseModel):
    nom: Optional[str] = None
    adresse: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    motDePasse: Optional[str] = None
    
class CliniqueCreate(BaseModel):
    nom: str
    adresse: str
    telephone: str
    email: str
    description: Optional[str] = None

@router.get("/")
def get_cliniques():
    """Get all active clinics with complete information including images"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                idclinique, 
                nom, 
                email, 
                telephone, 
                adresse, 
                description,
                profile_picture
            FROM cliniquepartenaire 
            WHERE nom IS NOT NULL AND nom != ''
            ORDER BY nom
        """)
        
        cliniques = cur.fetchall()
        
        # Add image URLs
        for clinique in cliniques:
            if clinique['profile_picture']:
                clinique['profile_picture_url'] = image_service.get_image_url('clinic', clinique['profile_picture'])
            else:
                clinique['profile_picture_url'] = None
        
        return cliniques
    finally:
        conn.close()

@router.get("/{id}")
def get_clinique(id: int):
    """Get single clinic with complete information including image"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                idclinique, 
                nom, 
                email, 
                telephone, 
                adresse, 
                description,
                profile_picture
            FROM cliniquepartenaire 
            WHERE idclinique = %s
        """, (id,))
        
        clinique = cur.fetchone()
        if not clinique:
            raise HTTPException(status_code=404, detail="Clinique non trouvée")
        
        # Add image URL
        if clinique['profile_picture']:
            clinique['profile_picture_url'] = image_service.get_image_url('clinic', clinique['profile_picture'])
        else:
            clinique['profile_picture_url'] = None
            
        return clinique
    finally:
        conn.close()

@router.patch("/{id}")
def update_clinique(id: int, updates: CliniqueUpdate):
    """Update clinic information"""
    import hashlib
    update_data = updates.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    # If a new password is provided, hash it (same scheme as registration: SHA-256)
    # and store it in the 'motdepasse' column.
    if update_data.get("motDePasse"):
        update_data["motdepasse"] = hashlib.sha256(update_data.pop("motDePasse").encode()).hexdigest()
    else:
        update_data.pop("motDePasse", None)

    fields = ", ".join(f"{k} = %s" for k in update_data)
    values = list(update_data.values()) + [id]
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        # Check if clinic exists first
        cur.execute("SELECT idclinique FROM cliniquepartenaire WHERE idclinique = %s", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Clinique introuvable")
            
        cur.execute(f"UPDATE cliniquepartenaire SET {fields} WHERE idclinique = %s", values)
        conn.commit()
        return {"message": "Profil clinique mis à jour avec succès"}
    finally:
        conn.close()

@router.post("/{id}/profile-picture")
async def upload_clinique_profile_picture(id: int, file: UploadFile = File(...)):
    """Upload or update clinic profile picture"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Check if clinic exists and get current picture
        cur.execute("SELECT profile_picture FROM cliniquepartenaire WHERE idclinique = %s", (id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Clinique introuvable")
        
        old_filename = result['profile_picture']
        
        # Save new image
        filename = await image_service.save_image(file, "clinic", id, old_filename)
        
        # Update database
        cur.execute(
            "UPDATE cliniquepartenaire SET profile_picture = %s WHERE idclinique = %s",
            (filename, id)
        )
        conn.commit()
        
        image_url = image_service.get_image_url('clinic', filename)
        
        return {
            "message": "Image de la clinique mise à jour avec succès",
            "filename": filename,
            "profile_picture_url": image_url
        }
    finally:
        conn.close()

@router.delete("/{id}/profile-picture")
def delete_clinique_profile_picture(id: int):
    """Delete clinic profile picture"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Check if clinic exists and get current picture
        cur.execute("SELECT profile_picture FROM cliniquepartenaire WHERE idclinique = %s", (id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Clinique introuvable")
        
        old_filename = result['profile_picture']
        
        # Delete image file
        if old_filename:
            image_service.delete_image("clinic", old_filename)
        
        # Update database
        cur.execute(
            "UPDATE cliniquepartenaire SET profile_picture = NULL WHERE idclinique = %s",
            (id,)
        )
        conn.commit()
        
        return {"message": "Image de la clinique supprimée avec succès"}
    finally:
        conn.close()

@router.post("/")
def create_clinique(c: CliniqueCreate):
    """Create new clinic"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO cliniquepartenaire (nom, adresse, telephone, email, description)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING idclinique
        """, (c.nom, c.adresse, c.telephone, c.email, c.description))
        new_id = cur.fetchone()["idclinique"]
        conn.commit()
        return {"idClinique": new_id, "message": "Clinique créée avec succès"}
    finally:
        conn.close()