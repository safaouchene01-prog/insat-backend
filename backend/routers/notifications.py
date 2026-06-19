"""
Notifications Router
====================
Provides the complete CRUD API for the in-app notification system.

Endpoints:
  GET    /notifications/               → list all notifications for the current user
  GET    /notifications/unread         → unread notifications only + count
  POST   /notifications/               → create a notification (internal / admin use)
  PATCH  /notifications/{id}/read      → mark one notification as read
  PATCH  /notifications/read-all       → mark all notifications as read
  DELETE /notifications/{id}           → delete one notification
  DELETE /notifications/               → delete all notifications for the user

Authentication:
  All endpoints require ?user_id=<int>&user_role=<str> query params.
  (The existing project uses no JWT middleware — auth is validated
   by matching user_id/user_role from the frontend auth store.)
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.database import get_connection
from backend.services.notification_service import create_notification, VALID_TYPES

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    user_id: int
    user_role: str
    type: str
    title: str
    body: str
    is_read: bool
    related_id: Optional[int]
    related_type: Optional[str]
    created_at: str


class NotificationCreate(BaseModel):
    user_id: int
    user_role: str
    type: str
    title: str
    body: str
    related_id: Optional[int] = None
    related_type: Optional[str] = None


class UnreadResponse(BaseModel):
    count: int
    notifications: list[NotificationOut]


# ── Helpers ────────────────────────────────────────────────────────────────────

def _row_to_dict(r) -> dict:
    return {
        "id": r["id"],
        "user_id": r["user_id"],
        "user_role": r["user_role"],
        "type": r["type"],
        "title": r["title"],
        "body": r["body"],
        "is_read": r["is_read"],
        "related_id": r.get("related_id"),
        "related_type": r.get("related_type"),
        "created_at": r["created_at"].isoformat() if r["created_at"] else "",
    }


# ── GET /notifications/ ────────────────────────────────────────────────────────

@router.get("/", summary="Toutes les notifications de l'utilisateur")
def get_notifications(
    user_id: int = Query(..., gt=0),
    user_role: str = Query(...),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, user_id, user_role, type, title, body,
                       is_read, related_id, related_type, created_at
                FROM notifications
                WHERE user_id = %s AND user_role = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                (user_id, user_role, limit, offset),
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        return [_row_to_dict(r) for r in rows]
    except Exception as exc:
        logger.exception("get_notifications failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── GET /notifications/unread ──────────────────────────────────────────────────

@router.get("/unread", summary="Notifications non lues + compteur")
def get_unread(
    user_id: int = Query(..., gt=0),
    user_role: str = Query(...),
):
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, user_id, user_role, type, title, body,
                       is_read, related_id, related_type, created_at
                FROM notifications
                WHERE user_id = %s AND user_role = %s AND is_read = FALSE
                ORDER BY created_at DESC
                """,
                (user_id, user_role),
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        items = [_row_to_dict(r) for r in rows]
        return {"count": len(items), "notifications": items}
    except Exception as exc:
        logger.exception("get_unread failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── POST /notifications/ ───────────────────────────────────────────────────────

@router.post("/", status_code=201, summary="Créer une notification")
def create_notification_endpoint(body: NotificationCreate):
    try:
        conn = get_connection()
        try:
            notif_id = create_notification(
                conn=conn,
                user_id=body.user_id,
                user_role=body.user_role,
                notif_type=body.type,
                title=body.title,
                body=body.body,
                related_id=body.related_id,
                related_type=body.related_type,
            )
            conn.commit()
        finally:
            conn.close()
        if notif_id is None:
            raise HTTPException(status_code=500, detail="Échec de la création")
        return {"id": notif_id, "message": "Notification créée"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("create_notification_endpoint failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── PATCH /notifications/{id}/read ────────────────────────────────────────────

@router.patch("/{notif_id}/read", summary="Marquer une notification comme lue")
def mark_read(
    notif_id: int,
    user_id: int = Query(..., gt=0),
    user_role: str = Query(...),
):
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE id = %s AND user_id = %s AND user_role = %s
                """,
                (notif_id, user_id, user_role),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Notification introuvable")
            conn.commit()
        finally:
            conn.close()
        return {"message": "Notification marquée comme lue"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("mark_read failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── PATCH /notifications/read-all ─────────────────────────────────────────────

@router.patch("/read-all", summary="Marquer toutes les notifications comme lues")
def mark_all_read(
    user_id: int = Query(..., gt=0),
    user_role: str = Query(...),
):
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE user_id = %s AND user_role = %s AND is_read = FALSE
                """,
                (user_id, user_role),
            )
            updated = cur.rowcount
            conn.commit()
        finally:
            conn.close()
        return {"message": f"{updated} notification(s) marquée(s) comme lues"}
    except Exception as exc:
        logger.exception("mark_all_read failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── DELETE /notifications/{id} ────────────────────────────────────────────────

@router.delete("/{notif_id}", summary="Supprimer une notification")
def delete_notification(
    notif_id: int,
    user_id: int = Query(..., gt=0),
    user_role: str = Query(...),
):
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM notifications WHERE id = %s AND user_id = %s AND user_role = %s",
                (notif_id, user_id, user_role),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Notification introuvable")
            conn.commit()
        finally:
            conn.close()
        return {"message": "Notification supprimée"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("delete_notification failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── DELETE /notifications/ ────────────────────────────────────────────────────

@router.delete("/", summary="Supprimer toutes les notifications de l'utilisateur")
def delete_all_notifications(
    user_id: int = Query(..., gt=0),
    user_role: str = Query(...),
):
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM notifications WHERE user_id = %s AND user_role = %s",
                (user_id, user_role),
            )
            deleted = cur.rowcount
            conn.commit()
        finally:
            conn.close()
        return {"message": f"{deleted} notification(s) supprimée(s)"}
    except Exception as exc:
        logger.exception("delete_all_notifications failed")
        raise HTTPException(status_code=500, detail=str(exc))
