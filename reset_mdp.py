import hashlib
from backend.database import get_connection

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Nouveau mot de passe simple
nouveau_mdp = "123456"
hash_mdp = hash_password(nouveau_mdp)

conn = get_connection()
cur = conn.cursor()

# Reinitialiser le mot de passe du Dr. senouci (idtherapeute = 1)
cur.execute(
    "UPDATE psychotherapeute SET motdepasse = %s WHERE idtherapeute = 1",
    (hash_mdp,)
)

conn.commit()
conn.close()

print(">>> Mot de passe du Dr. senouci reinitialise avec succes.")
print(">>> Email    : senouci.ousama@univ-bba.dz")
print(">>> Mot de passe : 123456")
