"""
Notification Service
====================
Central helper called by every router that needs to emit a notification.
Inserts a row into the `notifications` table — no external dependency.

Usage:
    from backend.services.notification_service import create_notification

    create_notification(
        conn=conn,          # existing open psycopg2 connection (caller commits)
        user_id=patient_id,
        user_role="patient",
        notif_type="appointment",
        title="Rendez-vous confirmé",
        body="Votre RDV du 12 juin à 10h00 est confirmé.",
        related_id=rdv_id,
        related_type="rendezvous",
    )

The function never raises — failures are logged and silently ignored so that
a notification bug never breaks the main business transaction.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Valid type values (must match the DB enum)
VALID_TYPES = {
    "appointment",
    "appointment_confirmed",
    "appointment_cancelled",
    "appointment_approved",
    "appointment_rejected",
    "message",
    "session_created",
    "session_completed",
    "payment",
    "ai_diagnosis",
    "ai_treatment",
    "system",
    "reminder",
}


def create_notification(
    conn,
    user_id: int,
    user_role: str,
    notif_type: str,
    title: str,
    body: str,
    related_id: Optional[int] = None,
    related_type: Optional[str] = None,
) -> Optional[int]:
    """
    Insert one notification row using an already-open connection.
    The caller is responsible for committing the transaction.

    Returns the new notification id, or None on failure.
    """
    if notif_type not in VALID_TYPES:
        logger.warning("Unknown notification type '%s' — defaulting to 'system'", notif_type)
        notif_type = "system"

    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO notifications
                (user_id, user_role, type, title, body, related_id, related_type)
            VALUES (%s, %s, %s::notif_type_enum, %s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, user_role, notif_type, title, body, related_id, related_type),
        )
        row = cur.fetchone()
        notif_id = row["id"] if row else None
        logger.debug(
            "Notification created: id=%s user=%s/%s type=%s",
            notif_id, user_id, user_role, notif_type,
        )
        return notif_id
    except Exception as exc:
        logger.error("Failed to create notification: %s", exc)
        return None


def create_notification_standalone(
    user_id: int,
    user_role: str,
    notif_type: str,
    title: str,
    body: str,
    related_id: Optional[int] = None,
    related_type: Optional[str] = None,
) -> Optional[int]:
    """
    Same as create_notification but opens, commits and closes its own connection.
    Use this when you need to emit a notification outside an existing transaction.
    """
    from backend.database import get_connection
    try:
        conn = get_connection()
        notif_id = create_notification(
            conn=conn,
            user_id=user_id,
            user_role=user_role,
            notif_type=notif_type,
            title=title,
            body=body,
            related_id=related_id,
            related_type=related_type,
        )
        conn.commit()
        conn.close()
        return notif_id
    except Exception as exc:
        logger.error("Standalone notification failed: %s", exc)
        return None
