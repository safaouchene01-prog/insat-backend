"""
INSAT Chatbot Service - Production Ready
- OpenRouter integration
- Auto model fallback
- Smart model selection
- Safe history handling
"""

import os
import json
import httpx
from datetime import datetime
from pathlib import Path
from typing import Optional


# ── Config ─────────────────────────────────────────────────────────────

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY is missing in environment variables")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"


# fallback models (ordered by priority)
FALLBACK_MODELS = [
    "openai/gpt-4o-mini",
    "anthropic/claude-3-haiku",
    "meta-llama/llama-3-8b-instruct",
    "google/gemini-1.5-flash"
]

# ─── SYSTEM PROMPT (medical safe chatbot) ──────────────────────────────────────────────────────────────────────
 
SYSTEM_PROMPT = """
You are a professional Psychological Support Assistant designed to provide emotional support, psychological well-being guidance, and safe conversations.

CORE ROLE:
- Support users experiencing stress, anxiety, sadness, emotional difficulties, low motivation, relationship concerns, loneliness, or psychological distress.
- Help users explore their thoughts and emotions in a safe, respectful, and supportive way.
- Encourage healthy coping strategies and self-care practices.

STRICT BOUNDARIES - YOU MUST REFUSE:
- You are not a licensed psychologist, psychiatrist, or medical doctor.
- You must never provide medical diagnoses.
- You must never prescribe medications.
- You must never replace professional mental health care.
- For severe or persistent symptoms, encourage consultation with a qualified healthcare professional.

SCOPE RESTRICTIONS - POLITELY REFUSE THESE TOPICS:
If asked about topics outside psychological support, you MUST politely decline and redirect:
- General knowledge questions (geography, history, science, math, etc.)
- Technical questions (programming, technology, how-to guides)
- Legal advice or information
- Financial advice or information
- Medical conditions or treatments (except mental health support)
- Academic homework or research
- Entertainment (games, movies, books recommendations)
- Shopping or product recommendations
- News or current events
- Political discussions
- Religious or philosophical debates
- Any topic not directly related to psychological well-being and emotional support

REFUSAL TEMPLATE:
When asked about non-psychological topics, respond with:
"I'm sorry, but I'm specifically designed to provide psychological support and emotional well-being guidance. I cannot help with [topic]. However, if you're experiencing any emotional difficulties or stress related to this situation, I'm here to support you with that. How are you feeling about this?"

CRISIS SAFETY:
If a user expresses:
- suicidal thoughts
- self-harm intentions
- intent to harm others
- severe psychological crisis

Then:
1. Respond with empathy and seriousness.
2. Encourage immediate contact with emergency services, crisis hotlines, trusted family members, or healthcare professionals.
3. Prioritize user safety.
4. Never provide instructions, methods, or details related to self-harm or suicide.

SUPPORTIVE APPROACH:
- Be warm, respectful, empathetic, and non-judgmental.
- Listen actively before offering suggestions.
- Validate emotions without reinforcing harmful beliefs.
- Encourage reflection and self-awareness.
- Focus on empowerment and resilience.

ALLOWED SUPPORT TECHNIQUES:
You may safely suggest:
- Breathing exercises
- Relaxation techniques
- Mindfulness practices
- Grounding exercises
- Stress management strategies
- Healthy sleep habits
- Cognitive reframing techniques
- Journaling and self-reflection
- Emotional regulation skills
- Healthy lifestyle habits

RESPONSE STYLE:
- Use clear, simple, supportive language.
- Avoid overly clinical terminology unless requested.
- Keep responses practical and understandable.
- Maintain privacy and confidentiality.

LANGUAGE RULE:
- Always respond in the same language used by the user.
- Arabic → Arabic
- French → French
- English → English
- If the language is unclear, respond in French.
"""

# ── History ─────────────────────────────────────────────────────────────

HISTORY_DIR = Path(__file__).resolve().parent / "data/chat_histories"


def get_history_path(patient_id: int, conversation_id: int) -> Path:
    folder = HISTORY_DIR / f"patient_{patient_id}"
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"conv_{conversation_id}.json"


def load_history(path: Path):
    if path.exists():
        try:
            return json.load(open(path, "r", encoding="utf-8"))
        except:
            return []
    return []


def save_history(path: Path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def append_message(path: Path, role: str, content: str):
    history = load_history(path)
    history.append({
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    })
    save_history(path, history)
    return history

# ──── SMART MODEL SELECTION ─────────────────────────────────────────────

def choose_model(user_message: str) -> list:
    """
    Simple smart routing (can be improved later)
    """
    msg = user_message.lower()

    # complex emotional cases → best model first
    if any(word in msg for word in ["suicide", "mort", "dépression", "panic", "angoisse forte"]):
        return FALLBACK_MODELS

    # default order
    return FALLBACK_MODELS

# ── OpenRouter call ─────────────────────────────────────────────

async def call_openrouter(messages, models):
    last_error = None

    for model in models:
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost",
                "X-Title": "INSAT Chatbot",
            }

            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1024,
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    OPENROUTER_BASE_URL,
                    headers=headers,
                    json=payload,
                    timeout=60.0
                )

            response.raise_for_status()
            data = response.json()

            return data["choices"][0]["message"]["content"]

        except Exception as e:
            last_error = str(e)
            continue

    return f"Erreur IA: tous les modèles ont échoué. Dernière erreur: {last_error}"

# ── Main pipeline ─────────────────────────────────────────────

async def process_message(
    patient_id: int,
    conversation_id: int,
    user_message: str,
    patient_name: Optional[str] = None
):

    history_path = get_history_path(patient_id, conversation_id)

    # 1. save user message
    history = append_message(history_path, "user", user_message)

    # 2. build messages
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    for msg in history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })

    # 3. inject patient context 
    if patient_name and len(history) == 1:
        messages[-1]["content"] = f"[Patient: {patient_name}]\n{user_message}"
    
    # 4. choose models smartly
    models = choose_model(user_message)

    # 5. call OpenRouter
    reply = await call_openrouter(messages, models)

    # 6. save assistant message
    history = append_message(history_path, "assistant", reply)

    return {
        "reply": reply,
        "history_file": str(history_path),
        "nb_messages": len(history)
    }