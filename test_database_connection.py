#!/usr/bin/env python3
"""
Test Database Connection
========================
Tests the database connection with the new local PostgreSQL setup.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import get_connection
from dotenv import load_dotenv

def test_connection():
    """Test database connection and display configuration."""
    
    load_dotenv()
    
    print("=" * 60)
    print("🔍 DATABASE CONNECTION TEST")
    print("=" * 60)
    
    # Display configuration
    print("\n📋 Current Configuration:")
    print(f"   DB_HOST: {os.getenv('DB_HOST', 'NOT SET')}")
    print(f"   DB_PORT: {os.getenv('DB_PORT', 'NOT SET')}")
    print(f"   DB_NAME: {os.getenv('DB_NAME', 'NOT SET')}")
    print(f"   DB_USER: {os.getenv('DB_USER', 'NOT SET')}")
    print(f"   DB_PASSWORD: {'***' if os.getenv('DB_PASSWORD') else 'NOT SET'}")
    
    database_url = os.getenv('DATABASE_URL')
    print(f"   DATABASE_URL: {'SET (NEON)' if database_url else 'NOT SET'}")
    
    # Test connection
    print("\n🔌 Testing Connection...")
    
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Test basic query
        cur.execute("SELECT version();")
        version = cur.fetchone()
        
        # Test table count
        cur.execute("""
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        table_count = cur.fetchone()
        
        # Test specific table existence
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('patient', 'psychotherapeute', 'ai_diagnoses')
            ORDER BY table_name
        """)
        key_tables = cur.fetchall()
        
        conn.close()
        
        print("✅ Connection SUCCESSFUL!")
        print(f"\n📊 Database Info:")
        print(f"   PostgreSQL Version: {version['version'][:50]}...")
        print(f"   Total Tables: {table_count['table_count']}")
        print(f"   Key Tables Found: {len(key_tables)}/3")
        
        if key_tables:
            print("   📋 Key Tables:")
            for table in key_tables:
                print(f"      ✓ {table['table_name']}")
        
        missing_tables = []
        expected_tables = ['patient', 'psychotherapeute', 'ai_diagnoses']
        found_table_names = [t['table_name'] for t in key_tables]
        
        for expected in expected_tables:
            if expected not in found_table_names:
                missing_tables.append(expected)
        
        if missing_tables:
            print(f"\n⚠️  Missing Tables: {', '.join(missing_tables)}")
            print("   💡 Run SQLSchema.sql to create missing tables")
        else:
            print("\n🎉 All key tables are present!")
            
        return True
        
    except Exception as e:
        print(f"❌ Connection FAILED!")
        print(f"   Error: {str(e)}")
        
        print(f"\n🔧 Troubleshooting:")
        print(f"   1. Ensure PostgreSQL is running on localhost:5432")
        print(f"   2. Verify database 'DataBase' exists")
        print(f"   3. Check user 'postgres' has access")
        print(f"   4. Verify password is correct")
        
        return False


def create_database_if_not_exists():
    """Create the database if it doesn't exist."""
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    
    print("\n🔧 Checking if database exists...")
    
    try:
        # Connect to postgres database to create our database
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            port=int(os.getenv('DB_PORT', 5432)),
            database='postgres',  # Connect to default postgres db
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Check if our database exists
        db_name = os.getenv('DB_NAME')
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        exists = cur.fetchone()
        
        if not exists:
            print(f"📦 Creating database '{db_name}'...")
            cur.execute(f'CREATE DATABASE "{db_name}"')
            print(f"✅ Database '{db_name}' created successfully!")
        else:
            print(f"✅ Database '{db_name}' already exists")
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Failed to create database: {str(e)}")
        return False


if __name__ == "__main__":
    print("🚀 INSAT Healthcare Platform - Database Connection Test\n")
    
    # First, try to create database if it doesn't exist
    if create_database_if_not_exists():
        # Then test the connection
        success = test_connection()
        
        if success:
            print(f"\n🎯 READY TO GO!")
            print(f"   Your application should now connect to local PostgreSQL")
            print(f"   Run 'python -m uvicorn backend.main:app --reload' to start the API")
        else:
            print(f"\n❌ SETUP INCOMPLETE")
            print(f"   Please fix the connection issues above")
    else:
        print(f"\n❌ SETUP FAILED")
        print(f"   Could not create or verify database")