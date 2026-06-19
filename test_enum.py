from backend.database import get_connection
conn = get_connection()
cur = conn.cursor()
cur.execute("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'statutrdv_enum'")
print(cur.fetchall())
