from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import hashlib
from backend.database import get_connection
from backend.services.notification_service import create_notification
import random
from datetime import datetime, timedelta

router = APIRouter()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed


def generate_otp():
    return str(random.randint(100000, 999999))


def otp_expiry():
    return datetime.now() + timedelta(minutes=10)


class LoginRequest(BaseModel):
    email: str
    motDePasse: str


class PatientRegisterRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    motDePasse: str
    dateNaissance: Optional[str] = None
    # Additional profile fields collected during registration
    telephone: Optional[str] = None
    sexe: Optional[str] = None
    contactUrgenceNom: Optional[str] = None
    contactUrgenceTel: Optional[str] = None
    conditionsExistantes: Optional[str] = None
    suiviPsy: Optional[bool] = False
    troublesSommeil: Optional[bool] = False
    niveauStress: Optional[int] = None


class DoctorRegisterRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    motDePasse: str
    specialite: Optional[str] = None
    numeroLicence: Optional[str] = None
    tarifSeance: Optional[float] = None
    # Additional profile fields collected during registration
    sexe: Optional[str] = None
    telephone: Optional[str] = None
    diplome: Optional[str] = None
    anneesExperience: Optional[int] = None
    certifications: Optional[str] = None
    langues: Optional[str] = None
    typeConsultation: Optional[str] = None
    localisationCabinet: Optional[str] = None
    biographie: Optional[str] = None


class ClinicRegisterRequest(BaseModel):
    nom: str
    email: str
    motDePasse: str
    adresse: Optional[str] = None
    telephone: Optional[str] = None
    ville: Optional[str] = None
    website: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class VerifyOtpRequest(BaseModel):
    email: str
    otp: str


class ResetPasswordConfirmRequest(BaseModel):
    email: str
    resetToken: str
    newPassword: str


# ── Login ──────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(body: LoginRequest):
    # ── Compte administrateur (en dur) ──
    # Identifiants admin : à changer selon vos besoins
    ADMIN_EMAIL = "admin@insat.dz"
    ADMIN_PASSWORD = "admin2026"
    if body.email == ADMIN_EMAIL:
        if body.motDePasse != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
        return {
            "id": 0, "nom": "Administrateur", "prenom": "INSAT",
            "email": ADMIN_EMAIL, "role": "admin",
            "profile_picture": None, "profile_picture_url": None,
        }

    conn = get_connection()
    try:
        cur = conn.cursor()

        # Patient
        cur.execute(
            "SELECT idpatient AS id, nom, prenom, email, motdepasse, profile_picture "
            "FROM patient WHERE email = %s",
            (body.email,),
        )
        row = cur.fetchone()
        if row:
            if not verify_password(body.motDePasse, row["motdepasse"]):
                raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
            
            # Generate profile picture URL if exists
            profile_picture_url = None
            if row.get("profile_picture"):
                from backend.services.image_service import image_service
                profile_picture_url = image_service.get_image_url('patient', row["profile_picture"])
            
            return {
                "id": row["id"], "nom": row["nom"], "prenom": row["prenom"],
                "email": row["email"], "role": "patient",
                "profile_picture": row.get("profile_picture"),
                "profile_picture_url": profile_picture_url,
            }

        # Psychotherapeute
        cur.execute(
            "SELECT idtherapeute AS id, nom, prenom, email, motdepasse, profile_picture "
            "FROM psychotherapeute WHERE email = %s",
            (body.email,),
        )
        row = cur.fetchone()
        if row:
            if not verify_password(body.motDePasse, row["motdepasse"]):
                raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
            
            # Generate profile picture URL if exists
            profile_picture_url = None
            if row.get("profile_picture"):
                from backend.services.image_service import image_service
                profile_picture_url = image_service.get_image_url('therapist', row["profile_picture"])
            
            return {
                "id": row["id"], "nom": row["nom"], "prenom": row["prenom"],
                "email": row["email"], "role": "doctor",
                "profile_picture": row.get("profile_picture"),
                "profile_picture_url": profile_picture_url,
            }

        # Clinique
        cur.execute(
            "SELECT idclinique AS id, nom, email, motdepasse, profile_picture "
            "FROM cliniquepartenaire WHERE email = %s",
            (body.email,),
        )
        row = cur.fetchone()
        if row:
            if not verify_password(body.motDePasse, row["motdepasse"]):
                raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
            
            # Generate profile picture URL if exists
            profile_picture_url = None
            if row.get("profile_picture"):
                from backend.services.image_service import image_service
                profile_picture_url = image_service.get_image_url('clinic', row["profile_picture"])
            
            return {
                "id": row["id"], "nom": row["nom"], "prenom": "",
                "email": row["email"], "role": "clinic",
                "profile_picture": row.get("profile_picture"),
                "profile_picture_url": profile_picture_url,
            }

        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    finally:
        conn.close()


# ── Register patient ──────────────────────────────────────────────────────────

@router.post("/register/patient")
def register_patient(body: PatientRegisterRequest):
    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute("SELECT idpatient FROM patient WHERE email = %s", (body.email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Cet email est déjà utilisé")

        hashed_pw = hash_password(body.motDePasse)
        
        # Insert complete patient profile information
        cur.execute(
            """
            INSERT INTO patient (
                nom, prenom, email, motdepasse, datenaissance,
                telephone, sexe, 
                contact_urgence_nom, contact_urgence_tel,
                conditions_existantes, suivi_psy, troubles_sommeil, niveau_stress,
                dateinscription
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE)
            RETURNING idpatient AS id
            """,
            (
                body.nom, body.prenom, body.email, hashed_pw, body.dateNaissance,
                body.telephone, body.sexe,
                body.contactUrgenceNom, body.contactUrgenceTel,
                body.conditionsExistantes, body.suiviPsy, body.troublesSommeil, body.niveauStress
            ),
        )
        new_id = cur.fetchone()["id"]

        # Welcome notification
        create_notification(
            conn=conn,
            user_id=new_id,
            user_role="patient",
            notif_type="system",
            title="Bienvenue sur INSAT 👋",
            body=f"Bonjour {body.prenom}, votre compte patient a été créé avec succès. Votre profil médical a été sauvegardé et vous pouvez le modifier à tout moment.",
        )

        conn.commit()
        return {"id": new_id, "role": "patient", "message": "Compte créé avec succès"}
    finally:
        conn.close()


# ── Register doctor ───────────────────────────────────────────────────────────

@router.post("/register/doctor")
def register_doctor(body: DoctorRegisterRequest):
    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute(
            "SELECT idtherapeute FROM psychotherapeute WHERE email = %s", (body.email,)
        )
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Cet email est déjà utilisé")

        hashed_pw = hash_password(body.motDePasse)
        
        # Insert complete doctor profile information
        cur.execute(
            """
            INSERT INTO psychotherapeute
                (nom, prenom, email, motdepasse, specialite, numerolicence, tarifseance,
                 sexe, telephone, diplome, annees_experience, certifications, langues,
                 type_consultation, localisation_cabinet, biographie, dateinscription)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE)
            RETURNING idtherapeute AS id
            """,
            (
                body.nom, body.prenom, body.email, hashed_pw, body.specialite, body.numeroLicence, body.tarifSeance,
                body.sexe, body.telephone, body.diplome, body.anneesExperience, body.certifications, body.langues,
                body.typeConsultation, body.localisationCabinet, body.biographie
            ),
        )
        new_id = cur.fetchone()["id"]

        # Welcome notification
        create_notification(
            conn=conn,
            user_id=new_id,
            user_role="doctor",
            notif_type="system",
            title="Bienvenue sur INSAT 👋",
            body=(
                f"Bonjour Dr. {body.prenom} {body.nom}, votre compte thérapeute a été créé avec toutes vos informations professionnelles. "
                "Votre profil sera vérifié par notre équipe avant activation complète."
            ),
        )

        conn.commit()
        return {"id": new_id, "role": "doctor", "message": "Compte créé avec succès"}
    finally:
        conn.close()


# ── Register clinic ───────────────────────────────────────────────────────────

@router.post("/register/clinic")
def register_clinic(body: ClinicRegisterRequest):
    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute(
            "SELECT idclinique FROM cliniquepartenaire WHERE email = %s", (body.email,)
        )
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Cet email est déjà utilisé")

        hashed_pw = hash_password(body.motDePasse)
        cur.execute(
            """
            INSERT INTO cliniquepartenaire (nom, email, motdepasse, adresse, telephone, ville)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING idclinique AS id
            """,
            (body.nom, body.email, hashed_pw, body.adresse, body.telephone, body.ville),
        )
        new_id = cur.fetchone()["id"]

        # Welcome notification
        create_notification(
            conn=conn,
            user_id=new_id,
            user_role="clinic",
            notif_type="system",
            title="Bienvenue sur INSAT 👋",
            body=(
                f"La clinique « {body.nom} » a été enregistrée avec succès. "
                "Votre compte sera validé par notre équipe sous 48h."
            ),
        )

        conn.commit()
        return {"id": new_id, "role": "clinic", "message": "Compte créé avec succès"}
    finally:
        conn.close()


# ── Password reset flow ───────────────────────────────────────────────────────

@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest):
    return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé."}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest):
    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute("SELECT email FROM patient WHERE email=%s", (body.email,))
        patient = cur.fetchone()
        cur.execute("SELECT email FROM psychotherapeute WHERE email=%s", (body.email,))
        doctor = cur.fetchone()
        cur.execute("SELECT email FROM cliniquepartenaire WHERE email=%s", (body.email,))
        clinic = cur.fetchone()

        if not (patient or doctor or clinic):
            raise HTTPException(status_code=404, detail="Email introuvable")

        otp = generate_otp()
        expires = otp_expiry()

        cur.execute(
            "INSERT INTO password_reset_otp (email, otp, expires_at) VALUES (%s, %s, %s)",
            (body.email, otp, expires),
        )
        conn.commit()

        # TODO: send real email via SMTP / SendGrid
        print(f"OTP for {body.email}: {otp}")

        return {"message": "Code OTP envoyé"}
    finally:
        conn.close()


@router.post("/verify-otp")
def verify_otp(body: VerifyOtpRequest):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT otp, expires_at, used
            FROM password_reset_otp
            WHERE email=%s AND otp=%s
            ORDER BY id DESC LIMIT 1
            """,
            (body.email, body.otp),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Code invalide")
        if row["used"]:
            raise HTTPException(status_code=400, detail="Code déjà utilisé")
        if datetime.now() > row["expires_at"]:
            raise HTTPException(status_code=400, detail="Code expiré")

        cur.execute(
            "UPDATE password_reset_otp SET used = TRUE WHERE email=%s AND otp=%s",
            (body.email, body.otp),
        )
        conn.commit()

        reset_token = hashlib.sha256(f"{body.email}{body.otp}".encode()).hexdigest()
        return {"message": "OTP validé", "resetToken": reset_token}
    finally:
        conn.close()


@router.post("/reset-password-confirm")
def reset_password_confirm(body: ResetPasswordConfirmRequest):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT otp FROM password_reset_otp WHERE email=%s ORDER BY id DESC LIMIT 1",
            (body.email,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Aucun OTP trouvé")

        expected_token = hashlib.sha256(
            f"{body.email}{row['otp']}".encode()
        ).hexdigest()
        if body.resetToken != expected_token:
            raise HTTPException(status_code=400, detail="Token invalide")

        hashed_pw = hash_password(body.newPassword)
        cur.execute("UPDATE patient SET motdepasse=%s WHERE email=%s", (hashed_pw, body.email))
        cur.execute(
            "UPDATE psychotherapeute SET motdepasse=%s WHERE email=%s", (hashed_pw, body.email)
        )
        cur.execute(
            "UPDATE cliniquepartenaire SET motdepasse=%s WHERE email=%s", (hashed_pw, body.email)
        )
        conn.commit()

        return {"message": "Mot de passe mis à jour avec succès"}
    finally:
        conn.close()
