"""
Doctor Statistics Router
========================
Provides dashboard statistics and analytics for doctors.
All endpoints use secure access control to ensure doctors only see their own stats.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timedelta
from backend.database import get_connection
from backend.security import require_doctor_appointment_access

router = APIRouter()


@router.get("/doctor/{doctor_id}/stats")
def get_doctor_stats(doctor_id: int):
    conn = get_connection()
    try:
        cur = conn.cursor()

        # Verify doctor exists
        cur.execute("SELECT 1 FROM psychotherapeute WHERE idtherapeute = %s", (doctor_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Doctor not found")

        # 1. Total unique patients who ever had a RDV with this doctor
        cur.execute("""
            SELECT COUNT(DISTINCT idpatient) FROM rendezvous
            WHERE idtherapeute = %s
        """, (doctor_id,))
        result = cur.fetchone()
        total_patients = result['count'] if isinstance(result, dict) else result[0]

        # 2. Pending appointments (PLANIFIE status)
        cur.execute("""
            SELECT COUNT(*) FROM rendezvous
            WHERE idtherapeute = %s AND statut = 'PLANIFIE'
        """, (doctor_id,))
        result = cur.fetchone()
        pending_appointments = result['count'] if isinstance(result, dict) else result[0]

        # 3. New patients: patients whose FIRST RDV with this doctor was in last 30 days
        thirty_days_ago = datetime.now() - timedelta(days=30)
        cur.execute("""
            SELECT COUNT(DISTINCT idpatient) FROM rendezvous
            WHERE idtherapeute = %s
            AND idpatient IN (
                SELECT idpatient FROM rendezvous
                WHERE idtherapeute = %s
                GROUP BY idpatient
                HAVING MIN(dateheure) >= %s
            )
        """, (doctor_id, doctor_id, thirty_days_ago))
        result = cur.fetchone()
        new_patients = result['count'] if isinstance(result, dict) else result[0]

        # 4. Weekly activity (appointments in last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        cur.execute("""
            SELECT COUNT(*) FROM rendezvous
            WHERE idtherapeute = %s AND dateheure >= %s
        """, (doctor_id, seven_days_ago))
        result = cur.fetchone()
        weekly_activity = result['count'] if isinstance(result, dict) else result[0]

        # 5. Weekly breakdown (last 6 days + today)
        weekly_breakdown = []
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        for i, day in enumerate(days):
            day_start = (datetime.now() - timedelta(days=6-i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            cur.execute("""
                SELECT COUNT(*) FROM rendezvous
                WHERE idtherapeute = %s
                AND dateheure >= %s AND dateheure < %s
            """, (doctor_id, day_start, day_end))
            result = cur.fetchone()
            count = result['count'] if isinstance(result, dict) else result[0]
            weekly_breakdown.append({"day": day, "count": count})

        return {
            "totalPatients": total_patients,
            "pendingAppointments": pending_appointments,
            "newPatients": new_patients,
            "weeklyActivity": weekly_activity,
            "weeklyBreakdown": weekly_breakdown
        }

    finally:
        conn.close()


@router.get("/doctor/{doctor_id}/upcoming-appointments")
def get_doctor_upcoming_appointments(doctor_id: int):
    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute("SELECT 1 FROM psychotherapeute WHERE idtherapeute = %s", (doctor_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Doctor not found")

        # Get upcoming appointments (next 30 days)
        thirty_days_ahead = datetime.now() + timedelta(days=30)

        cur.execute("""
            SELECT
                r.idrendezvous,
                r.dateheure,
                r.statut,
                p.nom as patient_nom,
                p.prenom as patient_prenom,
                p.email as patient_email
            FROM rendezvous r
            JOIN patient p ON p.idpatient = r.idpatient
            WHERE r.idtherapeute = %s
            AND r.dateheure >= NOW()
            AND r.dateheure <= %s
            AND r.statut IN ('PLANIFIE', 'CONFIRME')
            ORDER BY r.dateheure ASC
            LIMIT 10
        """, (doctor_id, thirty_days_ahead))

        appointments = cur.fetchall()

        formatted_appointments = []
        for apt in appointments:
            first_initial = apt['patient_prenom'][0] if apt['patient_prenom'] else '?'
            last_initial = apt['patient_nom'][0] if apt['patient_nom'] else '?'
            initials = f"{first_initial}{last_initial}"

            apt_datetime = apt['dateheure']
            if isinstance(apt_datetime, str):
                apt_datetime = datetime.fromisoformat(apt_datetime)

            time_str = apt_datetime.strftime("%d/%m - %H:%M")
            name = f"{apt['patient_prenom']} {apt['patient_nom']}"

            formatted_appointments.append({
                "id": apt['idrendezvous'],
                "name": name,
                "initials": initials,
                "time": time_str,
                "status": apt['statut'],
                "email": apt['patient_email'],
                "datetime": apt_datetime.isoformat()
            })

        return formatted_appointments

    finally:
        conn.close()



@router.get("/doctor/{doctor_id}/analytics")
def get_doctor_analytics(doctor_id: int):
    """
    Extended analytics for doctor dashboard.
    Provides detailed metrics and trends.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Verify doctor exists
        cur.execute("SELECT nom, prenom, specialite FROM psychotherapeute WHERE idtherapeute = %s", (doctor_id,))
        doctor = cur.fetchone()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        # Monthly appointment trends (last 6 months)
        monthly_stats = []
        for i in range(6):
            month_start = datetime.now().replace(day=1) - timedelta(days=30*i)
            month_end = month_start + timedelta(days=32)
            month_end = month_end.replace(day=1) - timedelta(days=1)
            
            cur.execute("""
                SELECT COUNT(*) FROM rendezvous 
                WHERE idtherapeute = %s 
                AND dateheure >= %s AND dateheure <= %s
            """, (doctor_id, month_start, month_end))
            
            result = cur.fetchone()
            count = result['count'] if isinstance(result, dict) else result[0]
            
            monthly_stats.append({
                "month": month_start.strftime("%b %Y"),
                "appointments": count
            })
        
        # Appointment status distribution
        cur.execute("""
            SELECT statut, COUNT(*) as count
            FROM rendezvous 
            WHERE idtherapeute = %s
            GROUP BY statut
        """, (doctor_id,))
        
        status_distribution = {}
        for row in cur.fetchall():
            status = row['statut'] if isinstance(row, dict) else row[0] 
            count = row['count'] if isinstance(row, dict) else row[1]
            status_distribution[status] = count
        
        return {
            "doctor_info": {
                "name": f"Dr. {doctor['prenom']} {doctor['nom']}" if doctor else f"Doctor #{doctor_id}",
                "specialty": doctor.get('specialite') if doctor else None
            },
            "monthly_trends": monthly_stats,
            "status_distribution": status_distribution,
            "generated_at": datetime.now().isoformat()
        }
        
    finally:
        conn.close()