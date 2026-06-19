from backend.database import get_connection

conn = get_connection()
cur = conn.cursor()
cur.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name ILIKE '%diagnostic%'
""")
print("TABLES diagnostic:", cur.fetchall())
conn.close()