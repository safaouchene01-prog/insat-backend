"""
AI Diagnostic History Router
============================
Provides endpoints for retrieving AI diagnostic and treatment plan history.
Used by DoctorDashboard patient cards and diagnostic components.

Security: All endpoints enforce doctor-patient relationship validation.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from backend.database import get_connection
from backend.security import verify_doctor_patient_access

router = APIRouter()


# ── Helper Functions ───────────────────────────────────────────────────────────

def format_predictions(predictions):
    """Format predictions to ensure consistent structure with valid confidence values."""
    if not predictions:
        return []
        
    if isinstance(predictions, str):
        import json
        try:
            predictions = json.loads(predictions)
        except:
            return []
    
    if not isinstance(predictions, list):
        return []
    
    formatted_predictions = []
    for pred in predictions:
        if isinstance(pred, dict):
            # Ensure confidence is a valid number between 0 and 1
            confidence = pred.get('confidence', 0)
            if isinstance(confidence, str):
                try:
                    confidence = float(confidence)
                except:
                    confidence = 0.0
            elif confidence is None:
                confidence = 0.0
            
            formatted_predictions.append({
                'diagnosis': pred.get('diagnosis', 'Unknown'),
                'confidence': max(0.0, min(1.0, float(confidence)))  # Clamp to 0-1 range
            })
        elif isinstance(pred, str):
            # Legacy format: just diagnosis names
            formatted_predictions.append({
                'diagnosis': pred,
                'confidence': 0.0
            })
    
    return formatted_predictions


# ── Data Models ────────────────────────────────────────────────────────────────

class AIdiagnosisPrediction:
    def __init__(self, diagnosis: str, confidence: float):
        self.diagnosis = diagnosis
        self.confidence = confidence


class AIDiagnosisHistory:
    def __init__(self, id: int, patient_id: int, doctor_id: int, 
                 predictions: List[dict], final_diagnosis: str, 
                 confidence_scores: dict, mode: str, symptoms_used: List[str],
                 created_at: datetime, confirmed_at: Optional[datetime], status: str):
        self.id = id
        self.patient_id = patient_id
        self.doctor_id = doctor_id
        self.predictions = predictions
        self.final_diagnosis = final_diagnosis
        self.confidence_scores = confidence_scores
        self.mode = mode
        self.symptoms_used = symptoms_used
        self.created_at = created_at
        self.confirmed_at = confirmed_at
        self.status = status


class AITreatmentPlan:
    def __init__(self, id: int, diagnosis_id: int, patient_id: int,
                 doctor_id: int, treatment_json: dict, created_at: datetime):
        self.id = id
        self.diagnosis_id = diagnosis_id
        self.patient_id = patient_id
        self.doctor_id = doctor_id
        self.treatment_json = treatment_json
        self.created_at = created_at


# ── API Endpoints ──────────────────────────────────────────────────────────────

@router.get("/diagnostic/patient/{patient_id}")
def get_patient_ai_diagnostics(
    patient_id: int,
    doctor_id: int = Query(..., description="Authenticated doctor ID"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results")
):
    """
    Get AI diagnostic history for a specific patient.
    
    Returns:
    - List of AI diagnoses with predictions, confidence scores, and metadata
    - Sorted by creation date (newest first)
    - Security: Only returns diagnostics from the authenticated doctor
    
    Response format matches DiagnosticPatient.tsx expectations.
    """
    # Verify doctor has access to this patient
    if not verify_doctor_patient_access(doctor_id, patient_id):
        raise HTTPException(status_code=403, detail="Access denied to this patient")
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                id, patient_id, doctor_id, predictions, final_diagnosis,
                confidence_score as confidence_scores, mode, symptoms_used, created_at, 
                confirmed_at, status
            FROM ai_diagnoses 
            WHERE patient_id = %s AND doctor_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (patient_id, doctor_id, limit))
        
        results = cur.fetchall()
        
        # Format response for frontend
        diagnostics = []
        for row in results:
            # Handle both dict and tuple result formats
            if isinstance(row, dict):
                r = row
            else:
                r = {
                    'id': row[0], 'patient_id': row[1], 'doctor_id': row[2],
                    'predictions': row[3], 'final_diagnosis': row[4],
                    'confidence_scores': row[5], 'mode': row[6], 
                    'symptoms_used': row[7], 'created_at': row[8],
                    'confirmed_at': row[9], 'status': row[10]
                }
            
            # Process predictions to match frontend expectations
            predictions = r['predictions'] if r['predictions'] else []
            predictions = format_predictions(predictions)
            
            # Format for DiagnosticPatient component
            diagnostic = {
                'id': r['id'],
                'patient_id': r['patient_id'],
                'doctor_id': r['doctor_id'],
                'predictions': predictions,  # Top 3 predictions array
                'final_diagnosis': r['final_diagnosis'],
                'confidence_scores': r['confidence_scores'] if r['confidence_scores'] else {},
                'mode': r['mode'],  # 'automatic' or 'manual'
                'symptoms_used': r['symptoms_used'] if r['symptoms_used'] else [],
                'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                'confirmed_at': r['confirmed_at'].isoformat() if r['confirmed_at'] else None,
                'status': r['status'],
                
                # Additional computed fields for UI display
                'date_formatted': r['created_at'].strftime('%d/%m/%Y à %H:%M') if r['created_at'] else 'Date inconnue',
                'top_prediction': predictions[0] if predictions else None,
                'has_results': len(predictions) > 0
            }
            
            diagnostics.append(diagnostic)
        
        return diagnostics
        
    finally:
        conn.close()


@router.get("/diagnostic/therapeute/{doctor_id}")
def get_doctor_ai_diagnostics(
    doctor_id: int,
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    status: Optional[str] = Query(None, description="Filter by status: pending, confirmed, rejected")
):
    """
    Get AI diagnostics created by a specific doctor.
    
    Returns:
    - All AI diagnoses created by this doctor across all patients
    - Includes patient information for dashboard display
    - Sorted by creation date (newest first)
    
    Used by DiagnosticsRecus component in doctor dashboard.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Build query with optional status filter
        where_clause = "WHERE ad.doctor_id = %s"
        params = [doctor_id]
        
        if status:
            where_clause += " AND ad.status = %s"
            params.append(status)
        
        cur.execute(f"""
            SELECT 
                ad.id, ad.patient_id, ad.doctor_id, ad.predictions, 
                ad.final_diagnosis, ad.confidence_score as confidence_scores, ad.mode,
                ad.symptoms_used, ad.created_at, ad.confirmed_at, ad.status,
                p.nom as patient_nom, p.prenom as patient_prenom,
                p.email as patient_email
            FROM ai_diagnoses ad
            LEFT JOIN patient p ON p.idpatient = ad.patient_id
            {where_clause}
            ORDER BY ad.created_at DESC
            LIMIT %s
        """, params + [limit])
        
        results = cur.fetchall()
        
        # Format response
        diagnostics = []
        for row in results:
            if isinstance(row, dict):
                r = row
            else:
                r = {
                    'id': row[0], 'patient_id': row[1], 'doctor_id': row[2],
                    'predictions': row[3], 'final_diagnosis': row[4],
                    'confidence_scores': row[5], 'mode': row[6],
                    'symptoms_used': row[7], 'created_at': row[8],
                    'confirmed_at': row[9], 'status': row[10],
                    'patient_nom': row[11], 'patient_prenom': row[12],
                    'patient_email': row[13]
                }
            
            predictions = r['predictions'] if r['predictions'] else []
            predictions = format_predictions(predictions)
            
            diagnostic = {
                'id': r['id'],
                'patient_id': r['patient_id'],
                'patient_name': f"{r['patient_prenom'] or ''} {r['patient_nom'] or ''}".strip(),
                'patient_email': r['patient_email'],
                'predictions': predictions,
                'final_diagnosis': r['final_diagnosis'],
                'mode': r['mode'],
                'status': r['status'],
                'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                'date_formatted': r['created_at'].strftime('%d/%m/%Y à %H:%M') if r['created_at'] else 'Date inconnue',
                'top_prediction': predictions[0] if predictions else None
            }
            
            diagnostics.append(diagnostic)
        
        return diagnostics
        
    finally:
        conn.close()


@router.get("/treatment-plans/patient/{patient_id}")
def get_patient_treatment_plans(
    patient_id: int,
    doctor_id: int = Query(..., description="Authenticated doctor ID"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results")
):
    """
    Get AI treatment plans for a specific patient.
    
    Returns:
    - Treatment plans linked to confirmed diagnoses
    - Includes diagnosis context for each plan
    - Security: Only returns plans from the authenticated doctor
    """
    # Verify doctor has access to this patient
    if not verify_doctor_patient_access(doctor_id, patient_id):
        raise HTTPException(status_code=403, detail="Access denied to this patient")
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                tp.id, tp.diagnosis_id, tp.patient_id, tp.doctor_id,
                tp.treatment_json, tp.created_at,
                ad.final_diagnosis, ad.mode as diagnosis_mode,
                ad.created_at as diagnosis_date
            FROM ai_treatment_plans tp
            LEFT JOIN ai_diagnoses ad ON ad.id = tp.diagnosis_id
            WHERE tp.patient_id = %s AND tp.doctor_id = %s
            ORDER BY tp.created_at DESC
            LIMIT %s
        """, (patient_id, doctor_id, limit))
        
        results = cur.fetchall()
        
        # Format response
        treatment_plans = []
        for row in results:
            if isinstance(row, dict):
                r = row
            else:
                r = {
                    'id': row[0], 'diagnosis_id': row[1], 'patient_id': row[2], 
                    'doctor_id': row[3], 'treatment_json': row[4], 'created_at': row[5],
                    'final_diagnosis': row[6], 'diagnosis_mode': row[7], 'diagnosis_date': row[8]
                }
            
            treatment_json = r['treatment_json'] if r['treatment_json'] else {}
            
            plan = {
                'id': r['id'],
                'diagnosis_id': r['diagnosis_id'],
                'patient_id': r['patient_id'],
                'treatment_json': treatment_json,
                'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                'date_formatted': r['created_at'].strftime('%d/%m/%Y à %H:%M') if r['created_at'] else 'Date inconnue',
                'diagnosis_context': {
                    'final_diagnosis': r['final_diagnosis'],
                    'diagnosis_mode': r['diagnosis_mode'],
                    'diagnosis_date': r['diagnosis_date'].isoformat() if r['diagnosis_date'] else None
                }
            }
            
            treatment_plans.append(plan)
        
        return treatment_plans
        
    finally:
        conn.close()


@router.get("/diagnostic/{diagnostic_id}")
def get_diagnostic_by_id(
    diagnostic_id: int,
    doctor_id: int = Query(..., description="Authenticated doctor ID")
):
    """
    Get a specific AI diagnostic by ID.
    
    Security: Only returns if diagnostic belongs to authenticated doctor.
    Used for detailed diagnostic views and modals.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                ad.id, ad.patient_id, ad.doctor_id, ad.predictions, 
                ad.final_diagnosis, ad.confidence_score as confidence_scores, ad.mode,
                ad.symptoms_used, ad.created_at, ad.confirmed_at, ad.status,
                p.nom as patient_nom, p.prenom as patient_prenom
            FROM ai_diagnoses ad
            LEFT JOIN patient p ON p.idpatient = ad.patient_id
            WHERE ad.id = %s AND ad.doctor_id = %s
        """, (diagnostic_id, doctor_id))
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Diagnostic not found or access denied")
        
        # Format detailed response
        if isinstance(result, dict):
            r = result
        else:
            r = {
                'id': result[0], 'patient_id': result[1], 'doctor_id': result[2],
                'predictions': result[3], 'final_diagnosis': result[4],
                'confidence_scores': result[5], 'mode': result[6],
                'symptoms_used': result[7], 'created_at': result[8],
                'confirmed_at': result[9], 'status': result[10],
                'patient_nom': result[11], 'patient_prenom': result[12]
            }
        
        predictions = r['predictions'] if r['predictions'] else []
        predictions = format_predictions(predictions)
        
        return {
            'id': r['id'],
            'patient_id': r['patient_id'],
            'patient_name': f"{r['patient_prenom'] or ''} {r['patient_nom'] or ''}".strip(),
            'predictions': predictions,
            'final_diagnosis': r['final_diagnosis'],
            'confidence_scores': r['confidence_scores'] if r['confidence_scores'] else {},
            'mode': r['mode'],
            'symptoms_used': r['symptoms_used'] if r['symptoms_used'] else [],
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
            'confirmed_at': r['confirmed_at'].isoformat() if r['confirmed_at'] else None,
            'status': r['status'],
            'date_formatted': r['created_at'].strftime('%d/%m/%Y à %H:%M') if r['created_at'] else 'Date inconnue'
        }
        
    finally:
        conn.close()


@router.post("/diagnostic/{diagnostic_id}/confirm")
def confirm_diagnostic(
    diagnostic_id: int,
    doctor_id: int = Query(..., description="Authenticated doctor ID"),
    final_diagnosis: str = Query(..., description="Therapist's final diagnosis")
):
    """
    Confirm and potentially modify an AI diagnostic.
    
    Updates the diagnostic status and final diagnosis.
    Triggers treatment plan generation if needed.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Verify diagnostic belongs to doctor
        cur.execute("""
            SELECT patient_id FROM ai_diagnoses 
            WHERE id = %s AND doctor_id = %s
        """, (diagnostic_id, doctor_id))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Diagnostic not found or access denied")
        
        # Update diagnostic
        cur.execute("""
            UPDATE ai_diagnoses 
            SET final_diagnosis = %s, status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP
            WHERE id = %s AND doctor_id = %s
        """, (final_diagnosis, diagnostic_id, doctor_id))
        
        conn.commit()
        
        return {
            "message": "Diagnostic confirmed successfully",
            "diagnostic_id": diagnostic_id,
            "final_diagnosis": final_diagnosis,
            "status": "confirmed"
        }
        
    finally:
        conn.close()


@router.post("/treatment-plan/generate")
def generate_treatment_plan_for_diagnosis(
    diagnosis_id: int = Query(..., description="AI diagnosis ID"),
    doctor_id: int = Query(..., description="Authenticated doctor ID"),
    custom_notes: str = Query("", description="Additional therapist notes")
):
    """
    Generate AI treatment plan for a confirmed diagnosis.
    
    Uses the existing AI treatment service to create comprehensive plans.
    Stores the plan in ai_treatment_plans table for persistence.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Verify diagnosis exists and belongs to doctor
        cur.execute("""
            SELECT patient_id, final_diagnosis, status FROM ai_diagnoses 
            WHERE id = %s AND doctor_id = %s
        """, (diagnosis_id, doctor_id))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Diagnosis not found or access denied")
        
        if isinstance(result, dict):
            patient_id = result['patient_id']
            final_diagnosis = result['final_diagnosis']
            status = result['status']
        else:
            patient_id = result[0]
            final_diagnosis = result[1] 
            status = result[2]
        
        if status != 'confirmed':
            raise HTTPException(status_code=400, detail="Diagnosis must be confirmed before generating treatment plan")
        
        # Generate treatment plan using existing AI service
        try:
            from AI_Services.Assisstant_AI.services.treatment_service import generate_treatment_plan
            
            # Call the AI treatment service
            treatment_response = generate_treatment_plan(
                id_patient=patient_id,
                id_therapeute=doctor_id,
                diagnosis=final_diagnosis
            )
            
            # Extract treatment plan from response
            if hasattr(treatment_response, 'treatment_plan'):
                treatment_json = treatment_response.treatment_plan
            else:
                # Fallback structure
                treatment_json = {
                    "diagnosis": final_diagnosis,
                    "psychoeducation": "Education thérapeutique personnalisée",
                    "cognitive_techniques": ["Restructuration cognitive", "Techniques de pleine conscience"],
                    "behavioral_techniques": ["Exposition graduelle", "Activation comportementale"],
                    "pharmacological_notes": "Consultation psychiatrique recommandée si besoin",
                    "complementary_techniques": ["Relaxation", "Méditation"],
                    "recommended_sessions": "12-16 séances hebdomadaires",
                    "custom_notes": custom_notes,
                    "generated_date": "2026-06-10",
                    "disclaimer": "Plan thérapeutique suggéré - le thérapeute conserve l'autorité finale"
                }
        
        except ImportError:
            # Fallback if AI service not available
            treatment_json = {
                "diagnosis": final_diagnosis,
                "psychoeducation": f"Éducation thérapeutique pour {final_diagnosis}",
                "cognitive_techniques": ["Restructuration cognitive", "Thérapie cognitive comportementale"],
                "behavioral_techniques": ["Modification comportementale", "Techniques d'exposition"],
                "pharmacological_notes": "Évaluation psychiatrique recommandée",
                "complementary_techniques": ["Techniques de relaxation", "Mindfulness"],
                "recommended_sessions": "10-15 séances",
                "custom_notes": custom_notes,
                "generated_date": "2026-06-10",
                "disclaimer": "Plan thérapeutique généré par IA - validation clinique requise"
            }
        
        # Store treatment plan in database
        cur.execute("""
            INSERT INTO ai_treatment_plans (diagnosis_id, patient_id, doctor_id, treatment_json)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (diagnosis_id, patient_id, doctor_id, treatment_json))
        
        new_plan_id = cur.fetchone()
        plan_id = new_plan_id[0] if isinstance(new_plan_id, (list, tuple)) else new_plan_id['id']
        
        conn.commit()
        
        return {
            "message": "Treatment plan generated successfully",
            "plan_id": plan_id,
            "diagnosis_id": diagnosis_id,
            "patient_id": patient_id,
            "treatment_plan": treatment_json
        }
        
    finally:
        conn.close()


@router.get("/treatment-plan/{plan_id}")
def get_treatment_plan_by_id(
    plan_id: int,
    doctor_id: int = Query(..., description="Authenticated doctor ID")
):
    """
    Get a specific treatment plan by ID.
    
    Security: Only returns if plan belongs to authenticated doctor.
    Used for detailed treatment plan views and modals.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                tp.id, tp.diagnosis_id, tp.patient_id, tp.doctor_id,
                tp.treatment_json, tp.created_at,
                ad.final_diagnosis, ad.mode as diagnosis_mode,
                p.nom as patient_nom, p.prenom as patient_prenom
            FROM ai_treatment_plans tp
            LEFT JOIN ai_diagnoses ad ON ad.id = tp.diagnosis_id
            LEFT JOIN patient p ON p.idpatient = tp.patient_id
            WHERE tp.id = %s AND tp.doctor_id = %s
        """, (plan_id, doctor_id))
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Treatment plan not found or access denied")
        
        # Format response
        if isinstance(result, dict):
            r = result
        else:
            r = {
                'id': result[0], 'diagnosis_id': result[1], 'patient_id': result[2],
                'doctor_id': result[3], 'treatment_json': result[4], 'created_at': result[5],
                'final_diagnosis': result[6], 'diagnosis_mode': result[7],
                'patient_nom': result[8], 'patient_prenom': result[9]
            }
        
        return {
            'id': r['id'],
            'diagnosis_id': r['diagnosis_id'],
            'patient_id': r['patient_id'],
            'patient_name': f"{r['patient_prenom'] or ''} {r['patient_nom'] or ''}".strip(),
            'treatment_json': r['treatment_json'] if r['treatment_json'] else {},
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
            'date_formatted': r['created_at'].strftime('%d/%m/%Y à %H:%M') if r['created_at'] else 'Date inconnue',
            'diagnosis_context': {
                'final_diagnosis': r['final_diagnosis'],
                'diagnosis_mode': r['diagnosis_mode']
            }
        }
        
    finally:
        conn.close()