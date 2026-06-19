import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    # Try DATABASE_URL first (for cloud services like Neon) - preferred method
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return psycopg2.connect(
            database_url,
            cursor_factory=RealDictCursor
        )
    else:
        # Fallback to individual DB parameters (local PostgreSQL)
        db_host = os.getenv("DB_HOST")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME")
        db_user = os.getenv("DB_USER")
        db_password = os.getenv("DB_PASSWORD")
        
        if all([db_host, db_name, db_user, db_password]):
            # Use individual parameters (local PostgreSQL)
            return psycopg2.connect(
                host=db_host,
                port=int(db_port),
                database=db_name,
                user=db_user,
                password=db_password,
                cursor_factory=RealDictCursor
            )
        else:
            raise ValueError("Database configuration missing. Please provide either DATABASE_URL (for Neon) or individual DB parameters (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)")