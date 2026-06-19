from database import get_connection

try:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM patient")
    result = cur.fetchone()

    print("OK: patients count =", result)

except Exception as e:
    print("ERREUR:", e)

finally:
    cur.close()
    conn.close()