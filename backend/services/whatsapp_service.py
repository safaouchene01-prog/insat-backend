"""
Service WhatsApp — Envoi de tickets de confirmation de RDV
==========================================================
Utilise l'API Twilio WhatsApp Sandbox (gratuit pour les tests).

Configuration requise dans .env :
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (numéro sandbox Twilio)
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _format_phone(phone: str) -> str:
    """
    Convertit un numéro algérien au format WhatsApp international.
    Ex: 0765432167 → +213765432167
        213765432167 → +213765432167
        +213765432167 → +213765432167
    """
    if not phone:
        return ""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        return phone
    if phone.startswith("213"):
        return f"+{phone}"
    if phone.startswith("0"):
        return f"+213{phone[1:]}"
    return f"+213{phone}"


def send_whatsapp_confirmation(
    patient_phone: str,
    patient_name: str,
    therapist_name: str,
    date_str: str,
    rdv_id: int,
) -> bool:
    """
    Envoie un ticket de confirmation WhatsApp au patient.
    
    Retourne True si envoyé avec succès, False sinon.
    """
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logger.warning("⚠️  Twilio non configuré — WhatsApp non envoyé")
        return False

    if not patient_phone:
        logger.warning(f"⚠️  Pas de téléphone pour le patient — WhatsApp non envoyé (RDV #{rdv_id})")
        return False

    try:
        from twilio.rest import Client

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        formatted_phone = _format_phone(patient_phone)

        # Message ticket de confirmation
        message_body = (
            f"✅ *INSAT — Confirmation de Rendez-vous*\n\n"
            f"Bonjour *{patient_name}* 👋\n\n"
            f"Votre rendez-vous a été *confirmé* !\n\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"📋 *Détails du rendez-vous*\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"👨‍⚕️ Thérapeute : *{therapist_name}*\n"
            f"📅 Date & Heure : *{date_str}*\n"
            f"🔖 N° RDV : *#{rdv_id}*\n"
            f"━━━━━━━━━━━━━━━━━━━\n\n"
            f"⚠️ En cas d'empêchement, merci de nous prévenir 24h à l'avance.\n\n"
            f"À bientôt sur *INSAT* 💙"
        )

        msg = client.messages.create(
            body=message_body,
            from_=TWILIO_WHATSAPP_FROM,
            to=f"whatsapp:{formatted_phone}",
        )

        logger.info(f"✅ WhatsApp envoyé à {formatted_phone} — SID: {msg.sid}")
        return True

    except ImportError:
        logger.error("❌ twilio non installé — pip install twilio")
        return False
    except Exception as e:
        logger.error(f"❌ Erreur envoi WhatsApp : {e}")
        return False


def send_whatsapp_cancellation(
    patient_phone: str,
    patient_name: str,
    therapist_name: str,
    date_str: str,
    rdv_id: int,
) -> bool:
    """
    Envoie une notification d'annulation WhatsApp au patient.
    """
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not patient_phone:
        return False

    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        formatted_phone = _format_phone(patient_phone)

        message_body = (
            f"❌ *INSAT — Annulation de Rendez-vous*\n\n"
            f"Bonjour *{patient_name}*,\n\n"
            f"Votre rendez-vous avec *{therapist_name}*\n"
            f"prévu le *{date_str}* a été *annulé*.\n\n"
            f"Veuillez prendre un nouveau rendez-vous sur l'application INSAT.\n\n"
            f"💙 *Équipe INSAT*"
        )

        client.messages.create(
            body=message_body,
            from_=TWILIO_WHATSAPP_FROM,
            to=f"whatsapp:{formatted_phone}",
        )
        return True

    except Exception as e:
        logger.error(f"❌ Erreur annulation WhatsApp : {e}")
        return False
