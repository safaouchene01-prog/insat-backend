"""
Routeur FastAPI — Gestion des disponibilités (dates + heures précises)
=======================================================================
  - POST   /disponibilites/                  -> le medecin ajoute un creneau (date + heure)
  - GET    /disponibilites/therapeute/{id}    -> liste les creneaux d'un medecin
  - DELETE /disponibilites/{id}               -> le medecin supprime un creneau
  - PATCH  /disponibilites/{id}/reserver      -> marque un creneau comme reserve
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict

from backend.database import get_connection

router = APIRouter()

class DispoBulk(BaseModel):
    date: str
    slots: List[str]

# ── GET: which doctors have future available (non-reserved) slots ──
@router.get("/available-doctors")
def get_available_doctors():
    """Returns a list of doctor IDs that have at least one future non-reserved slot."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT DISTINCT idtherapeute
            FROM disponibilite_date
            WHERE reserve = FALSE
              AND date_dispo >= CURRENT_DATE
            """
        )
        rows = cur.fetchall()
        conn.close()
        return [r["idtherapeute"] for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur available-doctors : {e}")

# ── NEW: Bulk GET ──
@router.get("/doctor/{id}/disponibilites")
def get_disponibilites_bulk(id: int, available_only: bool = False):
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        query = """
            SELECT date_dispo, heure
            FROM disponibilite_date
            WHERE idtherapeute = %s
        """
        
        if available_only:
            query += """ 
              AND reserve = FALSE 
              AND (date_dispo > CURRENT_DATE OR (date_dispo = CURRENT_DATE AND heure::time >= LOCALTIME))
            """
            
        query += " ORDER BY date_dispo, heure"
        
        cur.execute(query, (id,))
        rows = cur.fetchall()
        conn.close()

        result: Dict[str, List[str]] = {}
        for r in rows:
            date_str = str(r["date_dispo"])
            if date_str not in result:
                result[date_str] = []
            result[date_str].append(r["heure"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur get_bulk : {e}")

# ── NEW: Bulk POST ──
@router.post("/doctor/{id}/disponibilites")
def post_disponibilites_bulk(id: int, body: DispoBulk):
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # 1. DELETE all NON-RESERVED slots for this doctor + date
        cur.execute(
            """
            DELETE FROM disponibilite_date 
            WHERE idtherapeute = %s AND date_dispo = %s AND reserve = FALSE
            """,
            (id, body.date)
        )
        
        # 2. Get the remaining (reserved) slots
        cur.execute(
            """
            SELECT heure FROM disponibilite_date 
            WHERE idtherapeute = %s AND date_dispo = %s AND reserve = TRUE
            """,
            (id, body.date)
        )
        reserved_slots = {r["heure"] for r in cur.fetchall()}

        # 3. INSERT the new slots
        for heure in body.slots:
            if heure not in reserved_slots:
                cur.execute(
                    """
                    INSERT INTO disponibilite_date (idtherapeute, date_dispo, heure, reserve)
                    VALUES (%s, %s, %s, FALSE)
                    """,
                    (id, body.date, heure)
                )
                
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur post_bulk : {e}")



class DispoCreate(BaseModel):
    idTherapeute: int
    date: str          # format "2026-06-15"
    heure: str         # format "10:00"


# ── Le medecin ajoute un creneau ──
@router.post("/")
def ajouter_dispo(body: DispoCreate):
    try:
        conn = get_connection()
        cur = conn.cursor()
        # éviter les doublons (même médecin, même date, même heure)
        cur.execute(
            """
            SELECT iddispo FROM disponibilite_date
            WHERE idtherapeute = %s AND date_dispo = %s AND heure = %s
            """,
            (body.idTherapeute, body.date, body.heure),
        )
        if cur.fetchone():
            conn.close()
            return {"message": "Créneau déjà existant"}

        cur.execute(
            """
            INSERT INTO disponibilite_date (idtherapeute, date_dispo, heure)
            VALUES (%s, %s, %s)
            RETURNING iddispo
            """,
            (body.idTherapeute, body.date, body.heure),
        )
        new_id = cur.fetchone()["iddispo"]
        conn.commit()
        conn.close()
        return {"iddispo": new_id, "message": "Créneau ajouté"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur ajout : {e}")


# ── Lister les creneaux d'un medecin ──
@router.get("/therapeute/{id}")
def creneaux_therapeute(id: int, only_libres: Optional[bool] = False):
    try:
        conn = get_connection()
        cur = conn.cursor()
        if only_libres:
            cur.execute(
                """
                SELECT iddispo, idtherapeute, date_dispo, heure, reserve
                FROM disponibilite_date
                WHERE idtherapeute = %s AND reserve = FALSE
                ORDER BY date_dispo, heure
                """,
                (id,),
            )
        else:
            cur.execute(
                """
                SELECT iddispo, idtherapeute, date_dispo, heure, reserve
                FROM disponibilite_date
                WHERE idtherapeute = %s
                ORDER BY date_dispo, heure
                """,
                (id,),
            )
        rows = cur.fetchall()
        conn.close()
        return [
            {
                "iddispo": r["iddispo"],
                "idtherapeute": r["idtherapeute"],
                "date": str(r["date_dispo"]),
                "heure": r["heure"],
                "reserve": r["reserve"],
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur liste : {e}")


# ── Le medecin supprime un creneau ──
@router.delete("/{id}")
def supprimer_dispo(id: int):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM disponibilite_date WHERE iddispo = %s", (id,))
        conn.commit()
        conn.close()
        return {"message": "Créneau supprimé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur suppression : {e}")


# ── Marquer un creneau comme reserve ──
@router.patch("/{id}/reserver")
def reserver_dispo(id: int):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE disponibilite_date SET reserve = TRUE WHERE iddispo = %s",
            (id,),
        )
        conn.commit()
        conn.close()
        return {"message": "Créneau réservé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur réservation : {e}")