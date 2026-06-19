import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection
from backend.services.image_service import image_service

router = APIRouter()

class TherapeuteCreate(BaseModel):
    nom: str
    prenom: str
    email: str
    motDePasse: str
    specialite: Optional[str] = None
    numeroLicence: Optional[str] = None
    tarifSeance: Optional[float] = None
    idClinique: Optional[int] = None

class TherapeuteUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    specialite: Optional[str] = None
    numeroLicence: Optional[str] = None
    tarifSeance: Optional[float] = None
    # Additional profile fields for complete profile management
    sexe: Optional[str] = None
    telephone: Optional[str] = None
    diplome: Optional[str] = None
    anneesExperience: Optional[int] = None
    certifications: Optional[str] = None
    langues: Optional[str] = None
    typeConsultation: Optional[str] = None
    localisationCabinet: Optional[str] = None
    biographie: Optional[str] = None
    motDePasse: Optional[str] = None

@router.get("/")
def get_therapeutes():
    """Get all active therapists for public listing with profile pictures and enhanced data"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                idtherapeute, 
                nom, 
                prenom, 
                email, 
                specialite, 
                tarifseance, 
                notemoyenne,
                profile_picture,
                sexe,
                telephone,
                diplome,
                annees_experience,
                certifications,
                langues,
                type_consultation,
                localisation_cabinet,
                biographie,
                dateinscription
            FROM psychotherapeute 
            WHERE 1=1
            ORDER BY notemoyenne DESC NULLS LAST, dateinscription DESC
        """)
        
        therapeutes = cur.fetchall()
        
        # Add image URLs
        for therapeute in therapeutes:
            if therapeute['profile_picture']:
                therapeute['profile_picture_url'] = image_service.get_image_url('therapist', therapeute['profile_picture'])
            else:
                therapeute['profile_picture_url'] = None
        
        return therapeutes
    finally:
        conn.close()

@router.get("/{id}")
def get_therapeute(id: int):
    """Get single therapist with complete profile information"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                idtherapeute, 
                nom, 
                prenom, 
                email, 
                specialite, 
                numerolicence,
                tarifseance, 
                notemoyenne,
                profile_picture,
                sexe,
                telephone,
                diplome,
                annees_experience,
                certifications,
                langues,
                type_consultation,
                localisation_cabinet,
                biographie,
                dateinscription
            FROM psychotherapeute 
            WHERE idtherapeute = %s
        """, (id,))
        
        therapeute = cur.fetchone()
        if not therapeute:
            raise HTTPException(status_code=404, detail="Thérapeute non trouvé")
        
        # Add image URL
        if therapeute['profile_picture']:
            therapeute['profile_picture_url'] = image_service.get_image_url('therapist', therapeute['profile_picture'])
        else:
            therapeute['profile_picture_url'] = None
            
        return therapeute
    finally:
        conn.close()

@router.patch("/{id}")
def update_therapeute(id: int, t: TherapeuteUpdate):
    import hashlib
    updates = t.model_dump(exclude_none=True)
    # Also drop empty strings: sending "" to an enum column (e.g. specialite_enum)
    # raises "invalid input value for enum".
    updates = {k: v for k, v in updates.items() if v != ""}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    # If a new password is provided, hash it (same scheme as registration: SHA-256)
    if updates.get("motDePasse"):
        updates["motDePasse"] = hashlib.sha256(updates["motDePasse"].encode()).hexdigest()

    # Map the field names to match database column names
    field_mapping = {
        'numeroLicence': 'numerolicence',
        'tarifSeance': 'tarifseance',
        'anneesExperience': 'annees_experience',
        'typeConsultation': 'type_consultation', 
        'localisationCabinet': 'localisation_cabinet',
        'motDePasse': 'motdepasse',
    }
    
    # Convert field names to match database columns
    db_updates = {}
    for key, value in updates.items():
        db_key = field_mapping.get(key, key)
        db_updates[db_key] = value
    
    fields = ", ".join(f"{k} = %s" for k in db_updates)
    values = list(db_updates.values()) + [id]
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        # Check if therapeute exists first
        cur.execute("SELECT idtherapeute FROM psychotherapeute WHERE idtherapeute = %s", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Thérapeute introuvable")
            
        cur.execute(f"UPDATE psychotherapeute SET {fields} WHERE idtherapeute = %s", values)
        conn.commit()
        
        # Return updated profile
        return get_therapeute(id)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")
    finally:
        conn.close()

@router.post("/{id}/profile-picture")
async def upload_therapeute_profile_picture(id: int, file: UploadFile = File(...)):
    """Upload or update therapist profile picture"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Check if therapist exists and get current picture
        cur.execute("SELECT profile_picture FROM psychotherapeute WHERE idtherapeute = %s", (id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Thérapeute introuvable")
        
        old_filename = result['profile_picture']
        
        # Save new image
        filename = await image_service.save_image(file, "therapist", id, old_filename)
        
        # Update database
        cur.execute(
            "UPDATE psychotherapeute SET profile_picture = %s WHERE idtherapeute = %s",
            (filename, id)
        )
        conn.commit()
        
        image_url = image_service.get_image_url('therapist', filename)
        
        return {
            "message": "Photo de profil mise à jour avec succès",
            "filename": filename,
            "image_url": image_url
        }
    finally:
        conn.close()

@router.delete("/{id}/profile-picture")
def delete_therapeute_profile_picture(id: int):
    """Delete therapist profile picture"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Check if therapist exists and get current picture
        cur.execute("SELECT profile_picture FROM psychotherapeute WHERE idtherapeute = %s", (id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Thérapeute introuvable")
        
        old_filename = result['profile_picture']
        
        # Delete image file
        if old_filename:
            image_service.delete_image("therapist", old_filename)
        
        # Update database
        cur.execute(
            "UPDATE psychotherapeute SET profile_picture = NULL WHERE idtherapeute = %s",
            (id,)
        )
        conn.commit()
        
        return {"message": "Photo de profil supprimée avec succès"}
    finally:
        conn.close()

@router.get("/{id}/profile")
def get_therapeute_complete_profile(id: int):
    """Get complete therapeute profile including all professional information"""
    return get_therapeute(id)

@router.post("/")
def create_therapeute(t: TherapeuteCreate):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO Psychotherapeute (nom, prenom, email, motDePasse, specialite, numeroLicence, tarifSeance, idClinique)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING idTherapeute
    """, (t.nom, t.prenom, t.email, t.motDePasse, t.specialite, t.numeroLicence, t.tarifSeance, t.idClinique))
    new_id = cur.fetchone()["idtherapeute"]
    conn.commit()
    conn.close()
    return {"idTherapeute": new_id, "message": "Thérapeute créé avec succès"}