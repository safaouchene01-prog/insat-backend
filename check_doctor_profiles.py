from backend.database import get_connection

conn = get_connection()
cur = conn.cursor()

# Vérifier les derniers psychothérapeutes inscrits
cur.execute("""
    SELECT idtherapeute, nom, prenom, email, specialite, telephone, diplome, 
           annees_experience, certifications, langues, type_consultation,
           localisation_cabinet, biographie, dateinscription
    FROM psychotherapeute 
    ORDER BY dateinscription DESC NULLS LAST, idtherapeute DESC 
    LIMIT 3
""")

doctors = cur.fetchall()
print('📋 Derniers psychothérapeutes inscrits:')
for doc in doctors:
    print(f"ID: {doc['idtherapeute']} - {doc['prenom']} {doc['nom']}")
    print(f"  Email: {doc['email']}")
    print(f"  Spécialité: {doc['specialite']}")
    print(f"  Téléphone: {doc['telephone']}")
    print(f"  Diplôme: {doc['diplome']}")
    print(f"  Expérience: {doc['annees_experience']} ans")
    print(f"  Certifications: {doc['certifications']}")
    print(f"  Langues: {doc['langues']}")
    print(f"  Type consultation: {doc['type_consultation']}")
    print(f"  Localisation: {doc['localisation_cabinet']}")
    bio = doc['biographie'][:50] if doc['biographie'] else "Aucune"
    print(f"  Biographie: {bio}...")
    print(f"  Date inscription: {doc['dateinscription']}")
    print('---')

conn.close()