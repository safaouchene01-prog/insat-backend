import os
import uuid
import hashlib
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import date
from backend.database import get_connection
from backend.services.image_service import image_service

router = APIRouter()

# Legacy support for old upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "profile_pictures")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class PatientCreate(BaseModel):
    nom: str
    prenom: str
    email: str
    motDePasse: str
    dateNaissance: date
    numeroSecuriteSociale: Optional[str] = None
    niveauAnxieteInitial: Optional[int] = None

class PatientUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    dateNaissance: Optional[date] = None
    numeroSecuriteSociale: Optional[str] = None
    niveauAnxieteInitial: Optional[int] = None
    # Additional profile fields for complete profile management
    telephone: Optional[str] = None
    sexe: Optional[str] = None
    ville: Optional[str] = None
    adresse: Optional[str] = None
    contactUrgenceNom: Optional[str] = None
    contactUrgenceTel: Optional[str] = None
    conditionsExistantes: Optional[str] = None
    suiviPsy: Optional[bool] = None
    troublesSommeil: Optional[bool] = None
    niveauStress: Optional[int] = None
    motDePasse: Optional[str] = None


@router.get("/")
def get_patients():
    """Get all patients - ADMIN USE ONLY. Regular doctors should use /doctor/{doctor_id}/patients"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT idPatient, nom, prenom, email, dateNaissance FROM Patient")
        return cur.fetchall()
    finally:
        conn.close()


@router.get("/doctor/{doctor_id}")
def get_doctor_patients(doctor_id: int):
    """
    Get only patients assigned to this specific doctor.
    Uses proper doctor-patient assignment table for security.
    Falls back to appointment-based relationships if assignment table is empty.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # First try the proper assignment table
        cur.execute("""
            SELECT DISTINCT 
                p.idPatient, 
                p.nom, 
                p.prenom, 
                p.email, 
                p.dateNaissance,
                p.profile_picture,
                dpa.assigned_date,
                dpa.notes
            FROM Patient p
            INNER JOIN doctor_patient_assignments dpa ON dpa.patient_id = p.idPatient
            WHERE dpa.doctor_id = %s AND dpa.is_active = true
            ORDER BY p.nom, p.prenom
        """, (doctor_id,))
        
        result = cur.fetchall()
        
        # If no assignments found, fall back to appointment-based relationships
        if not result:
            cur.execute("""
                SELECT DISTINCT 
                    p.idPatient, 
                    p.nom, 
                    p.prenom, 
                    p.email, 
                    p.dateNaissance,
                    p.profile_picture,
                    MIN(r.dateheure) as first_appointment,
                    NULL as notes
                FROM Patient p
                INNER JOIN RendezVous r ON r.idPatient = p.idPatient
                WHERE r.idTherapeute = %s
                GROUP BY p.idPatient, p.nom, p.prenom, p.email, p.dateNaissance, p.profile_picture
                ORDER BY p.nom, p.prenom
            """, (doctor_id,))
            result = cur.fetchall()
            
        # Ajouter l'URL complète de la photo pour chaque patient
        for patient in result:
            if patient.get('profile_picture'):
                patient['profile_picture_url'] = image_service.get_image_url('patient', patient['profile_picture'])
            else:
                patient['profile_picture_url'] = None

        return result
    finally:
        conn.close()


@router.post("/doctor/{doctor_id}/assign/{patient_id}")
def assign_patient_to_doctor(doctor_id: int, patient_id: int, notes: str = ""):
    """Manually assign a patient to a doctor"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Verify doctor exists
        cur.execute("SELECT idtherapeute FROM psychotherapeute WHERE idtherapeute = %s", (doctor_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Doctor not found")
            
        # Verify patient exists
        cur.execute("SELECT idpatient FROM patient WHERE idpatient = %s", (patient_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Create assignment
        cur.execute("""
            INSERT INTO doctor_patient_assignments (doctor_id, patient_id, notes)
            VALUES (%s, %s, %s)
            ON CONFLICT (doctor_id, patient_id) 
            DO UPDATE SET is_active = true, notes = EXCLUDED.notes
        """, (doctor_id, patient_id, notes))
        
        conn.commit()
        return {"message": "Patient assigned to doctor successfully"}
    finally:
        conn.close()


@router.get("/security/doctor/{doctor_id}/summary")
def get_doctor_security_summary(doctor_id: int):
    """Security summary for a doctor - shows their access permissions"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Verify doctor exists
        cur.execute("SELECT nom, prenom, specialite FROM psychotherapeute WHERE idtherapeute = %s", (doctor_id,))
        doctor = cur.fetchone()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        # Count assigned patients  
        cur.execute("SELECT COUNT(*) FROM doctor_patient_assignments WHERE doctor_id = %s AND is_active = true", (doctor_id,))
        result = cur.fetchone()
        assigned_patients = result['count'] if isinstance(result, dict) else result[0]
        
        # Count appointments
        cur.execute("SELECT COUNT(*) FROM rendezvous WHERE idtherapeute = %s", (doctor_id,))
        result = cur.fetchone()
        total_appointments = result['count'] if isinstance(result, dict) else result[0]
        
        return {
            "doctor_id": doctor_id,
            "doctor_name": f"Dr. {doctor['prenom']} {doctor['nom']}" if doctor else f"Doctor #{doctor_id}",
            "specialty": doctor.get('specialite') if doctor else None,
            "assigned_patients_count": assigned_patients,
            "total_appointments_count": total_appointments,
            "security_status": "SECURED" if assigned_patients > 0 else "NO_PATIENTS",
            "access_level": "DOCTOR_RESTRICTED"
        }
        
    finally:
        conn.close()


@router.get("/{id}")
def get_patient(id: int):
    """Get patient with profile picture URL"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                idPatient, nom, prenom, email, dateNaissance, profile_picture,
                telephone, sexe, ville, adresse, contact_urgence_nom, contact_urgence_tel,
                conditions_existantes, suivi_psy, troubles_sommeil, niveau_stress,
                numeroSecuriteSociale, niveauAnxieteInitial, dateInscription
            FROM Patient 
            WHERE idPatient = %s
        """, (id,))
        patient = cur.fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient introuvable")
        
        # Add image URL
        if patient['profile_picture']:
            # Handle both old format (full URL) and new format (filename only)
            if patient['profile_picture'].startswith('/static/'):
                patient['profile_picture_url'] = patient['profile_picture']
            else:
                patient['profile_picture_url'] = image_service.get_image_url('patient', patient['profile_picture'])
        else:
            patient['profile_picture_url'] = None
            
        return patient
    finally:
        conn.close()


@router.get("/{id}/profile")
def get_patient_complete_profile(id: int):
    """Get complete patient profile including all registration information"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                idPatient as id, nom, prenom, email, dateNaissance, profile_picture,
                telephone, sexe, ville, adresse, contact_urgence_nom, contact_urgence_tel,
                conditions_existantes, suivi_psy, troubles_sommeil, niveau_stress,
                numeroSecuriteSociale, niveauAnxieteInitial, dateInscription
            FROM Patient 
            WHERE idPatient = %s
        """, (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Patient introuvable")
        return row
    finally:
        conn.close()


@router.post("/")
def create_patient(p: PatientCreate):
    import hashlib
    hashed_pw = hashlib.sha256(p.motDePasse.encode()).hexdigest()
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO Patient (nom, prenom, email, motDePasse, dateNaissance, numeroSecuriteSociale, niveauAnxieteInitial)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING idPatient
        """, (p.nom, p.prenom, p.email, hashed_pw, p.dateNaissance,
              p.numeroSecuriteSociale, p.niveauAnxieteInitial))
        new_id = cur.fetchone()["idpatient"]
        conn.commit()
        return {"idPatient": new_id, "message": "Patient créé avec succès"}
    finally:
        conn.close()


@router.patch("/{id}")
def update_patient(id: int, p: PatientUpdate):
    updates = p.model_dump(exclude_none=True)
    print(f"🔍 RAW Updates received for patient {id}: {updates}")

    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    # If a new password is provided, hash it (same scheme as registration: SHA-256)
    if updates.get("motDePasse"):
        updates["motDePasse"] = hashlib.sha256(updates["motDePasse"].encode()).hexdigest()

    # Map the field names to match database column names
    field_mapping = {
        'dateNaissance': 'datenaissance',
        'numeroSecuriteSociale': 'numerosecuritesociale',
        'niveauAnxieteInitial': 'niveauanxieteinitial',
        'contactUrgenceNom': 'contact_urgence_nom',
        'contactUrgenceTel': 'contact_urgence_tel', 
        'conditionsExistantes': 'conditions_existantes',
        'suiviPsy': 'suivi_psy',
        'troublesSommeil': 'troubles_sommeil',
        'niveauStress': 'niveau_stress',
        'motDePasse': 'motdepasse',
        # ville et adresse sont déjà en lowercase, pas besoin de mapping
    }
    
    # Convert field names to match database columns
    db_updates = {}
    for key, value in updates.items():
        db_key = field_mapping.get(key, key)
        db_updates[db_key] = value
        print(f"  🔄 {key} -> {db_key} = {value}")
    
    fields = ", ".join(f"{k} = %s" for k in db_updates)
    values = list(db_updates.values()) + [id]
    
    sql_query = f"UPDATE Patient SET {fields} WHERE idPatient = %s"
    print(f"🔍 SQL Query: {sql_query}")
    print(f"🔍 Values: {values}")
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        # Check if patient exists first
        cur.execute("SELECT idPatient FROM Patient WHERE idPatient = %s", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Patient introuvable")
            
        cur.execute(sql_query, values)
        rows_affected = cur.rowcount
        print(f"✅ Rows affected: {rows_affected}")
        conn.commit()
        
        # Return updated profile
        updated_patient = get_patient(id)
        print(f"🔍 Updated patient ville: {updated_patient.get('ville', 'NOT FOUND')}")
        return updated_patient
    except Exception as e:
        print(f"❌ Error during update: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")
    finally:
        conn.close()


@router.patch("/{id}/profile")
def update_patient_profile(id: int, p: PatientUpdate):
    """Update patient profile - same functionality as patch /{id} but with more descriptive endpoint"""
    return update_patient(id, p)


@router.delete("/{id}")
def delete_patient(id: int):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM Patient WHERE idPatient = %s", (id,))
        conn.commit()
        return {"message": "Patient supprimé"}
    finally:
        conn.close()


@router.post("/{id}/profile-picture")
async def upload_patient_profile_picture(id: int, file: UploadFile = File(...)):
    """Upload or update patient profile picture using new image service"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Check if patient exists and get current picture
        cur.execute("SELECT profile_picture FROM Patient WHERE idPatient = %s", (id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Patient introuvable")
        
        old_filename = result['profile_picture']
        # Handle old format where full URL was stored
        if old_filename and old_filename.startswith('/static/'):
            old_filename = os.path.basename(old_filename)
        
        # Save new image
        filename = await image_service.save_image(file, "patient", id, old_filename)
        
        # Update database
        cur.execute(
            "UPDATE Patient SET profile_picture = %s WHERE idPatient = %s",
            (filename, id)
        )
        conn.commit()
        
        image_url = image_service.get_image_url('patient', filename)
        
        return {
            "message": "Photo de profil mise à jour avec succès",
            "filename": filename,
            "profile_picture_url": image_url
        }
    finally:
        conn.close()

@router.delete("/{id}/profile-picture")
def delete_patient_profile_picture(id: int):
    """Delete patient profile picture"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Check if patient exists and get current picture
        cur.execute("SELECT profile_picture FROM Patient WHERE idPatient = %s", (id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Patient introuvable")
        
        old_filename = result['profile_picture']
        
        # Handle old format where full URL was stored
        if old_filename and old_filename.startswith('/static/'):
            old_filename = os.path.basename(old_filename)
        
        # Delete image file
        if old_filename:
            image_service.delete_image("patient", old_filename)
        
        # Update database
        cur.execute(
            "UPDATE Patient SET profile_picture = NULL WHERE idPatient = %s",
            (id,)
        )
        conn.commit()
        
        return {"message": "Photo de profil supprimée avec succès"}
    finally:
        conn.close()
