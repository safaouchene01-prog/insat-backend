import requests

BASE = "http://localhost:8000"
PATIENT_ID = 1
AGENT_ID = 1

def safe_json(r):
    try:
        return r.json()
    except:
        return r.text

# 1. Start
r = requests.post(f"{BASE}/chatbot/start", json={
    "id_patient": PATIENT_ID,
    "id_ia": AGENT_ID,
    "theme": "anxiete"
})

print("START:", safe_json(r))

data = r.json()
conv_id = data["id_conversation"]

# 2. Message
r = requests.post(f"{BASE}/chatbot/message", json={
    "id_conversation": conv_id,
    "id_patient": PATIENT_ID,
    "message": "J'ai beaucoup d'anxiété en ce moment, je n'arrive pas à dormir."
})

print("STATUS:", r.status_code)
print("RESPONSE:", safe_json(r))

# stop if error
if r.status_code != 200:
    exit()

# 3. Second message
r = requests.post(f"{BASE}/chatbot/message", json={
    "id_conversation": conv_id,
    "id_patient": PATIENT_ID,
    "message": "Quels exercices me conseilles-tu ?"
})

print("REPLY 2:", safe_json(r))

# 4. History
r = requests.get(f"{BASE}/chatbot/history/{conv_id}?id_patient={PATIENT_ID}")
print("HISTORY:", safe_json(r))

# 5. End
r = requests.put(
    f"{BASE}/chatbot/end/{conv_id}?id_patient={PATIENT_ID}",
    json={"satisfaction": 5}
)

print("END:", safe_json(r))