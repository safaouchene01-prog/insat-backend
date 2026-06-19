from backend.database import get_connection
from datetime import datetime

conn = get_connection()
cur = conn.cursor()

# Check what patients exist
cur.execute("SELECT idpatient, nom, prenom FROM Patient LIMIT 5")
patients = cur.fetchall()
print("Patients:", patients)

# Check what therapeutes exist
cur.execute("SELECT idtherapeute, nom, prenom FROM Psychotherapeute LIMIT 5")
therapeues = cur.fetchall()
print("Therapeutes:", therapeues)

# Try inserting a RDV manually
if patients and therapeues:
    idPatient = patients[0]['idpatient']
    idTherapeute = therapeues[0]['idtherapeute']
    try:
        cur.execute("""
            INSERT INTO RendezVous (dateHeure, statut, idPatient, idTherapeute)
            VALUES (%s, %s, %s, %s)
            RETURNING idRendezVous
        """, (datetime.now(), 'PLANIFIE', idPatient, idTherapeute))
        new_id = cur.fetchone()
        conn.commit()
        print(f"RDV created successfully! ID: {new_id}")
    except Exception as e:
        print(f"Error creating RDV: {e}")
else:
    print("No patients or therapeutes found in DB!")

conn.close()
