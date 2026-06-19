"""
Chatbot History Service
=======================
Retrieves a patient's chatbot conversation history and uses LLM-based extraction
to identify symptom-relevant content that can enrich the binary symptom vector.

History files live at:
  AI_Services/Chatbot/data/chat_histories/patient_{id}/conv_{id}.json

Each message is structured as:
  { "role": "user"|"assistant", "content": "...", "timestamp": "..." }

The symptom extraction now uses OpenRouter API with LLM models (GPT-4o-mini, etc.)
instead of keyword matching for more accurate clinical symptom identification.
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional
import httpx

from backend.database import get_connection

logger = logging.getLogger(__name__)

# ── Path to chatbot history root ──────────────────────────────────────────────

_HISTORY_ROOT = (
    Path(__file__).resolve().parents[3] / "AI_Services" / "Chatbot" / "data" / "chat_histories"
)


# ── OpenRouter API Configuration ────────────────────────────────────────────

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

# Fallback models in order of preference
OPENROUTER_MODELS = [
    "openai/gpt-4o-mini",
    "anthropic/claude-3-haiku",
    "meta-llama/llama-3-8b-instruct",
    "google/gemini-1.5-flash"
]


# ── Public API ────────────────────────────────────────────────────────────────

def get_patient_conversations(patient_id: int) -> list[dict]:
    """
    Return all conversation records for a patient from the DB.
    """
    try:
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT idconversation, historique, datedebut
                FROM conversationia
                WHERE idpatient = %s
                ORDER BY datedebut DESC
                """,
                (patient_id,),
            )
            return cur.fetchall()
        finally:
            conn.close()
    except Exception as exc:
        logger.warning("Could not fetch conversations for patient %d: %s", patient_id, exc)
        return []


def load_all_messages(patient_id: int) -> list[dict]:
    """
    Load all user messages from every conversation history file for a patient.

    Returns
    -------
    list of message dicts with keys: role, content, timestamp, conversation_id
    """
    conversations = get_patient_conversations(patient_id)
    all_messages: list[dict] = []

    for conv in conversations:
        conv_id = conv["idconversation"]
        hist_path_str = conv.get("historique")

        # Try DB-stored path first
        if hist_path_str:
            hist_path = Path(hist_path_str)
        else:
            # Fallback: reconstruct path from convention
            hist_path = _HISTORY_ROOT / f"patient_{patient_id}" / f"conv_{conv_id}.json"

        if not hist_path.exists():
            logger.debug("History file not found: %s", hist_path)
            continue

        try:
            with open(hist_path, "r", encoding="utf-8") as f:
                messages = json.load(f)
            for msg in messages:
                msg["conversation_id"] = conv_id
                all_messages.append(msg)
        except Exception as exc:
            logger.warning("Could not read history file %s: %s", hist_path, exc)

    logger.info(
        "Chatbot history: %d total messages loaded for patient %d.",
        len(all_messages),
        patient_id,
    )
    return all_messages


async def _call_openrouter_llm(user_text: str, feature_names: list[str]) -> Optional[dict[str, int]]:
    """
    Call OpenRouter API to extract symptoms from user text using LLM.
    
    Parameters
    ----------
    user_text : str
        Aggregated user messages text
    feature_names : list[str]
        Model feature names to extract
        
    Returns
    -------
    Optional[dict[str, int]]
        Symptom extraction results or None if failed
    """
    if not OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY not configured")
        return None
        
    # Create feature names list for the prompt
    features_list = ", ".join([f'"{name}"' for name in feature_names])
    
    system_prompt = f"""You are a clinical symptom extraction system.
Your task is to analyze patient chat messages and extract ONLY binary symptom indicators.
Return ONLY valid JSON.

Rules:
- Use 0 or 1 only
- 1 = symptom is present or clearly implied
- 0 = symptom not present
- Do NOT explain anything
- Do NOT add text outside JSON
- Use EXACT feature names provided

Expected features: {features_list}

OUTPUT FORMAT EXAMPLE:
{{"depression": 1, "anxiety": 0}}"""

    user_prompt = f"Analyze this patient text for symptoms:\n\n{user_text}"
    
    payload = {
        "model": OPENROUTER_MODELS[0],  # Start with preferred model
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 1000
    }
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://localhost",
        "X-Title": "INSAT Medical AI"
    }
    
    # Try each model in order until one works
    for model in OPENROUTER_MODELS:
        payload["model"] = model
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    OPENROUTER_BASE_URL,
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"].strip()
                    
                    # Parse JSON response
                    try:
                        symptoms = json.loads(content)
                        # Validate that it's a dict with int values
                        if isinstance(symptoms, dict) and all(
                            isinstance(v, int) and v in [0, 1] for v in symptoms.values()
                        ):
                            logger.info(f"LLM extraction successful with model: {model}")
                            return symptoms
                        else:
                            logger.warning(f"Invalid symptom format from {model}: {content}")
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON from {model}: {content}")
                        
                else:
                    logger.warning(f"OpenRouter API error with {model}: {response.status_code}")
                    
        except Exception as exc:
            logger.warning(f"Error calling {model}: {exc}")
            
    logger.error("All OpenRouter models failed for symptom extraction")
    return None


def extract_symptoms_from_history(
    patient_id: int,
    feature_names: list[str],
) -> dict[str, int]:
    """
    Extract symptoms from patient chatbot messages using LLM-based analysis.
    
    Only user messages are analyzed (not assistant messages).
    Uses OpenRouter API with fallback to zero vector if LLM fails.

    Parameters
    ----------
    patient_id    : int
    feature_names : list[str] — model feature names

    Returns
    -------
    dict[str, int] — {feature_name: 0_or_1}
    """
    # Initialize zero vector as fallback
    vector: dict[str, int] = {feat: 0 for feat in feature_names}
    messages = load_all_messages(patient_id)

    # Collect all user text into one corpus
    user_text = " ".join(
        msg["content"]
        for msg in messages
        if msg.get("role") == "user" and msg.get("content", "").strip()
    )

    if not user_text.strip():
        logger.info("No user messages found in chatbot history for patient %d.", patient_id)
        return vector

    logger.info(f"Extracting symptoms from {len(user_text)} characters of user text for patient {patient_id}")
    
    # Call LLM for symptom extraction
    try:
        import asyncio
        
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            llm_result = loop.run_until_complete(
                _call_openrouter_llm(user_text, feature_names)
            )
        finally:
            loop.close()
            
        if llm_result:
            # Map LLM results to feature vector, ensuring all features are covered
            detected = 0
            for feature in feature_names:
                if feature in llm_result:
                    vector[feature] = llm_result[feature]
                    if llm_result[feature] == 1:
                        detected += 1
                        
            logger.info(
                "LLM-based extraction: %d symptom signals extracted for patient %d.",
                detected,
                patient_id,
            )
            return vector
        else:
            logger.warning(f"LLM extraction failed for patient {patient_id}, using zero vector")
            
    except Exception as exc:
        logger.error(f"Error during LLM symptom extraction for patient {patient_id}: {exc}")
        
    # Fallback to zero vector
    logger.info(f"Using fallback zero vector for patient {patient_id}")
    return vector
