from fastapi import APIRouter
from backend.database import get_connection

router = APIRouter()

@router.get("/")
def get_agents():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM AgentIA")
    rows = cur.fetchall()
    conn.close()
    return rows
