#!/usr/bin/env python3
"""
Test the profile system by checking database schema and testing basic operations
"""
from backend.database import get_connection

def test_patient_table_schema():
    """Test that patient table has all required columns"""
    print("🧪 Testing patient table schema...")
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'patient' 
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        
        required_columns = [
            'nom', 'prenom', 'email', 'telephone', 'sexe',
            'contact_urgence_nom', 'contact_urgence_tel', 
            'conditions_existantes', 'suivi_psy', 'troubles_sommeil', 'niveau_stress'
        ]
        
        existing_columns = [col['column_name'] for col in columns]
        
        print("📋 Patient table columns:")
        for col in columns:
            nullable = "NULL" if col["is_nullable"] == "YES" else "NOT NULL" 
            print(f"  - {col['column_name']}: {col['data_type']} ({nullable})")
        
        missing_columns = [col for col in required_columns if col not in existing_columns]
        
        if missing_columns:
            print(f"\n❌ Missing columns: {missing_columns}")
            return False
        else:
            print(f"\n✅ All required patient profile columns exist!")
            return True
            
    except Exception as e:
        print(f"❌ Error checking patient schema: {e}")
        return False
    finally:
        conn.close()

def test_doctor_table_schema():
    """Test that psychotherapeute table has all required columns"""
    print("\n🧪 Testing psychotherapeute table schema...")
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'psychotherapeute' 
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        
        required_columns = [
            'nom', 'prenom', 'email', 'sexe', 'telephone', 'diplome',
            'annees_experience', 'certifications', 'langues', 'type_consultation',
            'localisation_cabinet', 'biographie', 'specialite', 'numerolicence'
        ]
        
        existing_columns = [col['column_name'] for col in columns]
        
        print("📋 Psychotherapeute table columns:")
        for col in columns:
            nullable = "NULL" if col["is_nullable"] == "YES" else "NOT NULL"
            print(f"  - {col['column_name']}: {col['data_type']} ({nullable})")
        
        missing_columns = [col for col in required_columns if col not in existing_columns]
        
        if missing_columns:
            print(f"\n❌ Missing columns: {missing_columns}")
            return False
        else:
            print(f"\n✅ All required doctor profile columns exist!")
            return True
            
    except Exception as e:
        print(f"❌ Error checking doctor schema: {e}")
        return False
    finally:
        conn.close()

def test_profile_operations():
    """Test basic profile operations"""
    print("\n🧪 Testing profile operations...")
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Test inserting a complete patient profile
        cur.execute("""
            INSERT INTO patient (
                nom, prenom, email, motdepasse, datenaissance,
                telephone, sexe, contact_urgence_nom, contact_urgence_tel,
                conditions_existantes, suivi_psy, troubles_sommeil, niveau_stress
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING idpatient
        """, (
            'TestProfile', 'Patient', 'test.profile@test.com', 'hashedpw', '1990-01-01',
            '0555123456', 'Homme', 'Emergency Contact', '0666789012',
            'Test conditions', True, False, 7
        ))
        
        patient_id = cur.fetchone()['idpatient']
        print(f"✅ Successfully inserted patient profile with ID: {patient_id}")
        
        # Test retrieving the complete profile
        cur.execute("""
            SELECT nom, prenom, telephone, sexe, contact_urgence_nom, 
                   conditions_existantes, suivi_psy, niveau_stress
            FROM patient WHERE idpatient = %s
        """, (patient_id,))
        
        profile = cur.fetchone()
        if profile:
            print("✅ Successfully retrieved complete patient profile:")
            for key, value in profile.items():
                print(f"  - {key}: {value}")
        
        # Clean up test data
        cur.execute("DELETE FROM patient WHERE idpatient = %s", (patient_id,))
        conn.commit()
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing profile operations: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔍 Testing Complete Profile System Database Schema...")
    print("=" * 60)
    
    patient_ok = test_patient_table_schema()
    doctor_ok = test_doctor_table_schema()
    operations_ok = test_profile_operations()
    
    print("\n" + "=" * 60)
    if patient_ok and doctor_ok and operations_ok:
        print("🎉 ALL PROFILE SYSTEM TESTS PASSED!")
        print("✅ Database schema is ready")
        print("✅ Profile operations work correctly")
        print("✅ Registration system can now save complete profiles")
    else:
        print("❌ Some tests failed - check the output above")
        
    print("\nNext steps:")
    print("1. Test patient registration via frontend")
    print("2. Test doctor registration via frontend") 
    print("3. Verify profile editing works in dashboards")