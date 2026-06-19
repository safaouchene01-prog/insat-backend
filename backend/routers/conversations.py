from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection

router = APIRouter()

class ConversationCreate(BaseModel):
    idPatient: int
    idIA: int
    theme: Optional[str] = None

@router.get("/")
def get_conversations():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM ConversationIA ORDER BY dateDebut DESC")
    rows = cur.fetchall()
    conn.close()
    return rows

@router.post("/")
def create_conversation(c: ConversationCreate):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO ConversationIA (idPatient, idIA, theme)
        VALUES (%s, %s, %s)
        RETURNING idConversation
    """, (c.idPatient, c.idIA, c.theme))
    new_id = cur.fetchone()["idconversation"]
    conn.commit()
    conn.close()
    return {"idConversation": new_id, "message": "Conversation créée"}
