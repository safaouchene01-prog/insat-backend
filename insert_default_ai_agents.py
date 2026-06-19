#!/usr/bin/env python3
"""
Insert default AI agents into AgentIA table
Run this script to populate the AgentIA table with default chatbot agents
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    """Same connection logic as backend/database.py"""
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
            return psycopg2.connect(
                host=db_host,
                port=int(db_port),
                database=db_name,
                user=db_user,
                password=db_password,
                cursor_factory=RealDictCursor
            )
        else:
            raise ValueError("Database configuration missing")

def insert_default_agents():
    """Insert default AI agents for chatbot functionality"""
    
    # Default AI agents configuration
    default_agents = [
        {
            'nom': 'Assistant Psychologique Principal',
            'version': '1.0',
            'modeleIA': 'gpt4',
            'seuilAlerte': 7,
            'typeA': 'CHAT'
        },
        {
            'nom': 'Diagnostic Assistant',
            'version': '1.0', 
            'modeleIA': 'claude',
            'seuilAlerte': 8,
            'typeA': 'DIAGNOSTIC'
        },
        {
            'nom': 'Support Émotionnel',
            'version': '1.0',
            'modeleIA': 'gpt4',
            'seuilAlerte': 6,
            'typeA': 'SUPPORT'
        }
    ]
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Check if agents already exist
        cur.execute("SELECT COUNT(*) as count FROM agentia")
        count_result = cur.fetchone()
        
        if count_result['count'] > 0:
            print(f"AgentIA table already has {count_result['count']} records.")
            print("Existing agents:")
            cur.execute("SELECT idia, nom, version, modeleia, typea FROM agentia ORDER BY idia")
            agents = cur.fetchall()
            for agent in agents:
                print(f"  ID: {agent['idia']} - {agent['nom']} (Type: {agent['typea']}, Model: {agent['modeleia']})")
            return
        
        # Insert default agents
        insert_query = """
        INSERT INTO agentia (nom, version, modeleia, seuilalerte, typea)
        VALUES (%(nom)s, %(version)s, %(modeleIA)s::modeleIA_enum, %(seuilAlerte)s, %(typeA)s::TypeA_enum)
        RETURNING idia, nom, typea
        """
        
        print("Inserting default AI agents...")
        inserted_agents = []
        
        for agent in default_agents:
            cur.execute(insert_query, agent)
            result = cur.fetchone()
            inserted_agents.append(result)
            print(f"  ✅ Inserted: ID {result['idia']} - {result['nom']} ({result['typea']})")
        
        conn.commit()
        print(f"\n🎉 Successfully inserted {len(inserted_agents)} AI agents!")
        print("\nYou can now use these agent IDs in the chatbot:")
        for agent in inserted_agents:
            print(f"  - Agent ID {agent['idia']}: {agent['nom']}")
            
    except Exception as e:
        conn.rollback()
        print(f"❌ Error inserting AI agents: {e}")
        raise
    finally:
        conn.close()

def test_chatbot_access():
    """Test if chatbot can now access agents"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT idia, nom, typea FROM agentia WHERE typea = 'CHAT' LIMIT 1")
        agent = cur.fetchone()
        
        if agent:
            print(f"\n✅ Chatbot test: Found chat agent ID {agent['idia']} - {agent['nom']}")
            print(f"   Frontend can use agent_id = {agent['idia']} for chatbot conversations")
        else:
            print("\n❌ No CHAT type agents found")
            
    except Exception as e:
        print(f"❌ Error testing chatbot access: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("INSAT Healthcare - AI Agent Setup")
    print("=" * 50)
    
    try:
        insert_default_agents()
        test_chatbot_access()
        
        print("\n" + "=" * 50)
        print("✅ AI Agent setup completed successfully!")
        print("The chatbot should now work without 'Agent IA introuvable' error.")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        print("\nPlease check:")
        print("1. Database connection is working")
        print("2. AgentIA table exists in your database") 
        print("3. Environment variables are set correctly")