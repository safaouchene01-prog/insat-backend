import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import (
    patients,
    therapeutes,
    sessions,
    rendezvouss,
    paiements,
    agents_ia,
    conversations,
    cliniques,
    auth,
    assistant_ai,
    disponibilites,
    stats,
    notifications,
    ai_diagnostic_history,
    dme,
    admin,
    ressources,
    diagnostic,
)

from AI_Services.Chatbot.router import router as chatbot_router

app = FastAPI(title="INSAT API", version="1.0.0")

# Create upload directories
os.makedirs("backend/static/uploads/patients", exist_ok=True)
os.makedirs("backend/static/uploads/therapists", exist_ok=True) 
os.makedirs("backend/static/uploads/clinics", exist_ok=True)
os.makedirs("backend/static/uploads/ressources", exist_ok=True)
# Legacy profile pictures directory
os.makedirs("backend/static/profile_pictures", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tourmaline-salmiakki-5972e7.netlify.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentification"])
app.include_router(patients.router, prefix="/patients", tags=["Patients"])
app.include_router(therapeutes.router, prefix="/therapeutes", tags=["Thérapeutes"])
app.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
app.include_router(rendezvouss.router, prefix="/rendezvous", tags=["Rendez-vous"])
app.include_router(paiements.router, prefix="/paiements", tags=["Paiements"])
app.include_router(agents_ia.router, prefix="/agents-ia", tags=["Agents IA"])
app.include_router(conversations.router, prefix="/conversations", tags=["Conversations IA"])
app.include_router(cliniques.router, prefix="/cliniques", tags=["Cliniques"])
app.include_router(chatbot_router)
app.include_router(assistant_ai.router, prefix="/assistant-ai", tags=["Assistant IA Thérapeute"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(disponibilites.router, prefix="/disponibilites", tags=["Disponibilités"])
app.include_router(disponibilites.router, prefix="/api", tags=["Disponibilités Bulk"])
app.include_router(stats.router, prefix="/api", tags=["Statistiques"])
app.include_router(ai_diagnostic_history.router, prefix="/ai-history", tags=["AI Diagnostic History"])
app.include_router(dme.router, prefix="/dme", tags=["DME"])
app.include_router(admin.router, prefix="/admin", tags=["Administration"])
app.include_router(ressources.router, prefix="/ressources", tags=["Ressources Pédagogiques"])
app.include_router(diagnostic.router, prefix="/diagnostic", tags=["Diagnostic IA"])


@app.get("/")
def root():
    return {"message": "INSAT API fonctionne !"}
