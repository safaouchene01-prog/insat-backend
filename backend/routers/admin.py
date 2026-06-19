"""
Routeur Admin — Espace Administrateur
=====================================
  - GET    /admin/users               -> liste tous les utilisateurs (patients, thérapeutes, cliniques)
  - DELETE /admin/users/{role}/{id}   -> supprime un utilisateur
  - GET    /admin/stats               -> statistiques globales de la plateforme
  - GET    /admin/clinics             -> liste des cliniques avec leurs métriques
"""

from fastapi import APIRouter, HTTPException
from backend.database import get_connection

router = APIRouter()


# ── Lister tous les utilisateurs ────────────────────────────────────────────────
@router.get("/users")
def get_all_users():
    """Renvoie tous les utilisateurs de la plateforme, avec leur rôle."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        users = []

        # Patients
        cur.execute("SELECT idpatient AS id, nom, prenom, email FROM patient ORDER BY idpatient")
        for r in cur.fetchall():
            users.append({
                "id": r["id"], "nom": r["nom"], "prenom": r["prenom"],
                "email": r["email"], "role": "patient",
            })

        # Thérapeutes
        cur.execute("SELECT idtherapeute AS id, nom, prenom, email FROM psychotherapeute ORDER BY idtherapeute")
        for r in cur.fetchall():
            users.append({
                "id": r["id"], "nom": r["nom"], "prenom": r["prenom"],
                "email": r["email"], "role": "doctor",
            })

        # Cliniques
        cur.execute("SELECT idclinique AS id, nom, email FROM cliniquepartenaire ORDER BY idclinique")
        for r in cur.fetchall():
            users.append({
                "id": r["id"], "nom": r["nom"], "prenom": "",
                "email": r["email"], "role": "clinic",
            })

        return users
    finally:
        conn.close()


# ── Supprimer un utilisateur ────────────────────────────────────────────────────
@router.delete("/users/{role}/{id}")
def delete_user(role: str, id: int):
    """Supprime un utilisateur selon son rôle (patient / doctor / clinic)."""
    table_map = {
        "patient": ("patient", "idpatient"),
        "doctor": ("psychotherapeute", "idtherapeute"),
        "clinic": ("cliniquepartenaire", "idclinique"),
    }
    if role not in table_map:
        raise HTTPException(status_code=400, detail="Rôle invalide")

    table, id_col = table_map[role]
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM {table} WHERE {id_col} = %s", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        cur.execute(f"DELETE FROM {table} WHERE {id_col} = %s", (id,))
        conn.commit()
        return {"message": f"Utilisateur {role} #{id} supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur suppression : {e}")
    finally:
        conn.close()


# ── Statistiques globales ───────────────────────────────────────────────────────
@router.get("/stats")
def get_global_stats():
    """Métriques transversales de la plateforme."""
    conn = get_connection()
    try:
        cur = conn.cursor()

        def count(query):
            cur.execute(query)
            row = cur.fetchone()
            return list(row.values())[0] if row else 0

        nb_patients = count("SELECT COUNT(*) FROM patient")
        nb_therapeutes = count("SELECT COUNT(*) FROM psychotherapeute")
        nb_cliniques = count("SELECT COUNT(*) FROM cliniquepartenaire")
        nb_rdv = count("SELECT COUNT(*) FROM rendezvous")
        nb_rdv_confirmes = count("SELECT COUNT(*) FROM rendezvous WHERE statut = 'CONFIRME'")
        nb_rdv_attente = count("SELECT COUNT(*) FROM rendezvous WHERE statut = 'PLANIFIE'")

        return {
            "totalUsers": nb_patients + nb_therapeutes + nb_cliniques,
            "patients": nb_patients,
            "therapeutes": nb_therapeutes,
            "cliniques": nb_cliniques,
            "rendezvous": nb_rdv,
            "rdvConfirmes": nb_rdv_confirmes,
            "rdvEnAttente": nb_rdv_attente,
        }
    finally:
        conn.close()


# ── Cliniques avec métriques ────────────────────────────────────────────────────
@router.get("/clinics")
def get_clinics_with_metrics():
    """Liste des cliniques partenaires avec quelques informations."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT idclinique AS id, nom, email, adresse, telephone FROM cliniquepartenaire ORDER BY idclinique"
        )
        return cur.fetchall()
    finally:
        conn.close()
