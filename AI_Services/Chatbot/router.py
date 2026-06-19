"""
INSAT – Chatbot Router (psycopg2 version)
Endpoints:
  POST /chatbot/start               → create a new ConversationIA row
  POST /chatbot/message             → send a message, get a reply
  GET  /chatbot/history/{conv_id}   → fetch full history (used to RESUME)
  PUT  /chatbot/end/{conv_id}       → close a conversation (dateFin + satisfaction)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.database import get_connection
from AI_Services.Chatbot.service import (
    process_message,
    load_history,
    get_history_path,
)

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


# ══════════════════════════════════════════════════════════════════════════════
# Schemas
# ══════════════════════════════════════════════════════════════════════════════

class StartConversationRequest(BaseModel):
    id_patient: int
    id_ia: int
    theme: Optional[str] = "autre"


class StartConversationResponse(BaseModel):
    id_conversation: int
    message: str


class SendMessageRequest(BaseModel):
    id_conversation: int
    id_patient: int
    message: str = Field(..., min_length=1, max_length=4000)


class SendMessageResponse(BaseModel):
    id_conversation: int
    reply: str
    nb_messages: int


class EndConversationRequest(BaseModel):
    satisfaction: Optional[int] = Field(None, ge=1, le=5)


class HistoryMessage(BaseModel):
    role: str
    content: str
    timestamp: str


# ══════════════════════════════════════════════════════════════════════════════
# psycopg2 DB helpers
# ══════════════════════════════════════════════════════════════════════════════

def db_fetchone(query: str, params: tuple = ()):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        return cur.fetchone()
    finally:
        conn.close()


def db_execute(query: str, params: tuple = ()):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        conn.commit()
    finally:
        conn.close()


def db_insert_returning(query: str, params: tuple = ()):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        row = cur.fetchone()
        conn.commit()
        return row
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/start", response_model=StartConversationResponse)
async def start_conversation(body: StartConversationRequest):
    """
    Create a new ConversationIA row linked to a patient.
    Saves the history file path in ConversationIA.historique.
    Conversations are per-patient: each patient has their own folder.
    """
    # 1. Validate patient exists
    patient = db_fetchone(
        "SELECT idpatient FROM patient WHERE idpatient = %s",
        (body.id_patient,),
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")

    # 2. Validate AgentIA exists
    agent = db_fetchone(
        "SELECT idia FROM agentia WHERE idia = %s",
        (body.id_ia,),
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent IA introuvable")

    # 3. Insert into ConversationIA
    # Columns used: idPatient, idIA, theme, nbMessages
    # dateDebut defaults to CURRENT_TIMESTAMP per schema
    row = db_insert_returning(
        """
        INSERT INTO conversationia (idpatient, idia, theme, nbmessages)
        VALUES (%s, %s, %s::theme_enum, 0)
        RETURNING idconversation
        """,
        (body.id_patient, body.id_ia, body.theme),
    )
    conversation_id = row["idconversation"]

    # 4. Build history file path → data/chat_histories/patient_{id}/conv_{convId}.json
    # This path is stored in ConversationIA.historique (TEXT column)
    history_path = get_history_path(body.id_patient, conversation_id)
    db_execute(
        "UPDATE conversationia SET historique = %s WHERE idconversation = %s",
        (str(history_path), conversation_id),
    )

    return StartConversationResponse(
        id_conversation=conversation_id,
        message="Conversation démarrée. Comment puis-je vous aider aujourd'hui ?",
    )


@router.post("/message", response_model=SendMessageResponse)
async def send_message(body: SendMessageRequest):
    """
    Process a patient message:
    1. Validates conversation ownership (idPatient check)
    2. Calls OpenRouter AI service
    3. Appends both turns to the history JSON file
    4. Updates nbMessages + historique path in ConversationIA
    """
    conv = db_fetchone(
        "SELECT * FROM conversationia WHERE idconversation = %s",
        (body.id_conversation,),
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    # Security: patient can only write to their own conversations
    if conv["idpatient"] != body.id_patient:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if conv["datefin"] is not None:
        raise HTTPException(status_code=400, detail="Cette conversation est terminée")

    # Get patient name for first-message context injection
    patient = db_fetchone(
        "SELECT prenom, nom FROM patient WHERE idpatient = %s",
        (body.id_patient,),
    )
    patient_name = f"{patient['prenom']} {patient['nom']}" if patient else None

    # Core AI pipeline: loads history → calls OpenRouter → saves updated history
    result = await process_message(
        patient_id=body.id_patient,
        conversation_id=body.id_conversation,
        user_message=body.message,
        patient_name=patient_name,
    )

    # Update nbMessages and confirm historique path in DB
    db_execute(
        """
        UPDATE conversationia
        SET nbmessages = %s,
            historique = %s
        WHERE idconversation = %s
        """,
        (result["nb_messages"], result["history_file"], body.id_conversation),
    )

    return SendMessageResponse(
        id_conversation=body.id_conversation,
        reply=result["reply"],
        nb_messages=result["nb_messages"],
    )


@router.get("/history/{conversation_id}", response_model=list[HistoryMessage])
async def get_history(conversation_id: int, id_patient: int):
    """
    Return the full message history for a conversation.
    Used by the frontend to RESUME an existing open conversation.

    The history is read from the JSON file whose path is stored
    in ConversationIA.historique — NOT from the DB itself.

    e.g. GET /chatbot/history/7?id_patient=42
    """
    conv = db_fetchone(
        "SELECT * FROM conversationia WHERE idconversation = %s",
        (conversation_id,),
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    if conv["idpatient"] != id_patient:
        raise HTTPException(status_code=403, detail="Accès refusé")

    history_path = Path(conv["historique"]) if conv["historique"] else None
    if not history_path or not history_path.exists():
        return []

    raw = load_history(history_path)
    return [
        HistoryMessage(
            role=m["role"],
            content=m["content"],
            timestamp=m.get("timestamp", ""),
        )
        for m in raw
        if m.get("role") in ("user", "assistant")  # exclude any system entries
    ]


@router.put("/end/{conversation_id}")
async def end_conversation(
    conversation_id: int,
    id_patient: int,
    body: EndConversationRequest,
):
    """
    Close a conversation:
    - Sets dateFin = NOW() in ConversationIA
    - Stores satisfaction score (1-5) if provided

    After this call:
    - The conversation cannot receive new messages (datefin check in /message)
    - The history file remains on disk and can still be read via /history

    e.g. PUT /chatbot/end/7?id_patient=42
    """
    conv = db_fetchone(
        "SELECT * FROM conversationia WHERE idconversation = %s",
        (conversation_id,),
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    if conv["idpatient"] != id_patient:
        raise HTTPException(status_code=403, detail="Accès refusé")

    db_execute(
        """
        UPDATE conversationia
        SET datefin      = NOW(),
            satisfaction = %s
        WHERE idconversation = %s
        """,
        (body.satisfaction, conversation_id),
    )
    return {"message": "Conversation terminée avec succès"}


# ══════════════════════════════════════════════════════════════════════════════
# NEW: List all conversations for a patient (like ChatGPT sidebar)
# ══════════════════════════════════════════════════════════════════════════════

class ConversationSummary(BaseModel):
    id_conversation: int
    theme: str
    date_debut: str          # ISO string
    date_fin: Optional[str]  # None = still open
    nb_messages: int
    satisfaction: Optional[int]
    is_open: bool            # True if dateFin is NULL


@router.get("/conversations/{patient_id}", response_model=list[ConversationSummary])
async def list_conversations(patient_id: int):
    """
    Return all conversations for a patient, newest first.
    Used to populate the history sidebar in the chat UI.
    e.g. GET /chatbot/conversations/42
    """
    # Validate patient
    patient = db_fetchone(
        "SELECT idpatient FROM patient WHERE idpatient = %s",
        (patient_id,),
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                idconversation,
                theme,
                datedebut,
                datefin,
                nbmessages,
                satisfaction
            FROM conversationia
            WHERE idpatient = %s
            ORDER BY datedebut DESC
            """,
            (patient_id,),
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    return [
        ConversationSummary(
            id_conversation=r["idconversation"],
            theme=r["theme"] or "autre",
            date_debut=r["datedebut"].isoformat() if r["datedebut"] else "",
            date_fin=r["datefin"].isoformat() if r["datefin"] else None,
            nb_messages=r["nbmessages"] or 0,
            satisfaction=r["satisfaction"],
            is_open=r["datefin"] is None,
        )
        for r in rows
    ]