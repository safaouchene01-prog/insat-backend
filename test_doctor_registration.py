#!/usr/bin/env python3
"""
Test complet de l'inscription des psychothérapeutes
"""
from backend.database import get_connection
from backend.routers.auth import register_doctor, DoctorRegisterRequest
from pydantic import ValidationError

def test_doctor_registration_direct():
    """Test direct de l'endpoint d'inscription docteur"""
    print("🧪 Test d'inscription psychothérapeute...")
    
    # Données d'inscription correctes
    doctor_data = DoctorRegisterRequest(
        nom="Dupont",
        prenom="Marie",
        email="marie.test.doctor@example.com",
        motDePasse="test123",
        specialite="psychologue",  # Valeur enum correcte
        numeroLicence="PSY123456",
        tarifSeance=5000.0,
        sexe="Femme",
        telephone="0777123456",
        diplome="Master en Psychologie Clinique",
        anneesExperience=5,
        certifications="TCC, EMDR",
        langues="Français, Arabe, Anglais",
        typeConsultation="Hybride",
        localisationCabinet="Clinique El Rahma, Alger",
        biographie="Psychologue spécialisée en TCC avec 5 ans d'expérience."
    )
    
    try:
        # Test de l'inscription
        result = register_doctor(doctor_data)
        print(f"✅ Inscription réussie ! ID: {result['id']}")
        
        # Vérifier que les données ont été sauvegardées
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT nom, prenom, email, specialite, numerolicence, tarifseance,
                   sexe, telephone, diplome, annees_experience, certifications,
                   langues, type_consultation, localisation_cabinet, biographie
            FROM psychotherapeute 
            WHERE idtherapeute = %s
        """, (result['id'],))
        
        saved_data = cur.fetchone()
        if saved_data:
            print("✅ Données sauvegardées correctement:")
            for key, value in saved_data.items():
                print(f"  - {key}: {value}")
                
            # Nettoyage
            cur.execute("DELETE FROM psychotherapeute WHERE idtherapeute = %s", (result['id'],))
            conn.commit()
            print("✅ Nettoyage effectué")
        else:
            print("❌ Données non trouvées après inscription")
            
        conn.close()
        return True
        
    except ValidationError as e:
        print(f"❌ Erreur de validation: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur d'inscription: {e}")
        return False

def test_speciality_enum_values():
    """Test des valeurs autorisées pour la spécialité"""
    print("\n🧪 Test des valeurs enum spécialité...")
    
    valid_specialties = ['psychologue', 'orthophoniste', 'psychiatre', 'pedopsychiatre', 'addictologue']
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Test avec chaque spécialité valide
        for specialty in valid_specialties:
            cur.execute("""
                INSERT INTO psychotherapeute (nom, prenom, email, motdepasse, specialite, numerolicence)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING idtherapeute
            """, (f"Test{specialty}", "Doc", f"test.{specialty}@test.com", "hashedpw", specialty, "LIC123"))
            
            doctor_id = cur.fetchone()['idtherapeute']
            print(f"✅ Spécialité '{specialty}' acceptée (ID: {doctor_id})")
            
            # Nettoyage immédiat
            cur.execute("DELETE FROM psychotherapeute WHERE idtherapeute = %s", (doctor_id,))
            conn.commit()
            
        print("✅ Toutes les spécialités enum sont valides")
        return True
        
    except Exception as e:
        print(f"❌ Erreur avec les spécialités: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔍 Test complet de l'inscription psychothérapeute")
    print("=" * 50)
    
    enum_ok = test_speciality_enum_values()
    registration_ok = test_doctor_registration_direct()
    
    print("\n" + "=" * 50)
    if enum_ok and registration_ok:
        print("🎉 TOUS LES TESTS SONT PASSÉS!")
        print("✅ L'inscription des psychothérapeutes fonctionne")
        print("\nLes valeurs de spécialité à utiliser dans le frontend:")
        print("  - psychologue")
        print("  - orthophoniste") 
        print("  - psychiatre")
        print("  - pedopsychiatre")
        print("  - addictologue")
    else:
        print("❌ Certains tests ont échoué")