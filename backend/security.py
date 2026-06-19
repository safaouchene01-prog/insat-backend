"""
Security utilities for the telepsychology platform
=================================================
Provides authentication and authorization helpers to ensure
doctors can only access their own patients and data.
"""

from typing import Optional
from fastapi import HTTPException
from backend.database import get_connection


def verify_doctor_patient_access(doctor_id: int, patient_id: int) -> bool:
    """
    Verify that a doctor has access to a specific patient.
    Returns True if access is allowed, False otherwise.
    
    Checks:
    1. Doctor-patient assignment table
    2. Fallback to appointment history
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Check assignment table first
        cur.execute("""
            SELECT 1 FROM doctor_patient_assignments 
            WHERE doctor_id = %s AND patient_id = %s AND is_active = true
        """, (doctor_id, patient_id))
        
        if cur.fetchone():
            return True
            
        # Fallback: check if they have appointment history
        cur.execute("""
            SELECT 1 FROM rendezvous 
            WHERE idtherapeute = %s AND idpatient = %s
        """, (doctor_id, patient_id))
        
        return cur.fetchone() is not None
        
    finally:
        conn.close()


def verify_doctor_appointment_access(doctor_id: int, appointment_id: int) -> bool:
    """
    Verify that a doctor has access to a specific appointment.
    Returns True if the appointment belongs to this doctor.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 1 FROM rendezvous 
            WHERE idrendezvous = %s AND idtherapeute = %s
        """, (appointment_id, doctor_id))
        
        return cur.fetchone() is not None
        
    finally:
        conn.close()


def verify_patient_appointment_access(patient_id: int, appointment_id: int) -> bool:
    """
    Verify that a patient has access to a specific appointment.
    Returns True if the appointment belongs to this patient.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 1 FROM rendezvous 
            WHERE idrendezvous = %s AND idpatient = %s
        """, (appointment_id, patient_id))
        
        return cur.fetchone() is not None
        
    finally:
        conn.close()


def get_user_role_from_id(user_id: int) -> Optional[str]:
    """
    Determine user role from their ID by checking which table contains them.
    Returns 'doctor', 'patient', or None if not found.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Check if it's a doctor
        cur.execute("SELECT 1 FROM psychotherapeute WHERE idtherapeute = %s", (user_id,))
        if cur.fetchone():
            return 'doctor'
            
        # Check if it's a patient
        cur.execute("SELECT 1 FROM patient WHERE idpatient = %s", (user_id,))
        if cur.fetchone():
            return 'patient'
            
        return None
        
    finally:
        conn.close()


class SecurityError(HTTPException):
    """Custom exception for security violations"""
    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=403, detail=detail)


def require_doctor_patient_access(doctor_id: int, patient_id: int):
    """
    Raises SecurityError if doctor doesn't have access to patient.
    Use as a security check in endpoints.
    """
    if not verify_doctor_patient_access(doctor_id, patient_id):
        raise SecurityError(f"Doctor {doctor_id} does not have access to patient {patient_id}")


def require_doctor_appointment_access(doctor_id: int, appointment_id: int):
    """
    Raises SecurityError if doctor doesn't have access to appointment.
    Use as a security check in endpoints.
    """
    if not verify_doctor_appointment_access(doctor_id, appointment_id):
        raise SecurityError(f"Doctor {doctor_id} does not have access to appointment {appointment_id}")


def require_patient_appointment_access(patient_id: int, appointment_id: int):
    """
    Raises SecurityError if patient doesn't have access to appointment.
    Use as a security check in endpoints.
    """
    if not verify_patient_appointment_access(patient_id, appointment_id):
        raise SecurityError(f"Patient {patient_id} does not have access to appointment {appointment_id}")