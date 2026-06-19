#!/usr/bin/env python3
"""
Test the complete profile system to verify registration saves all data
"""
import requests
import json

API_URL = "http://localhost:8000"

def test_patient_registration():
    """Test patient registration with complete profile data"""
    print("🧪 Testing patient registration with complete profile...")
    
    # Complete patient registration data
    patient_data = {
        "nom": "Test",
        "prenom": "Patient", 
        "email": "test.patient.profile@example.com",
        "motDePasse": "test123",
        "dateNaissance": "1990-05-15",
        "telephone": "0555123456",
        "sexe": "Homme",
        "contactUrgenceNom": "Jean Dupont",
        "contactUrgenceTel": "0666789012", 
        "conditionsExistantes": "Anxiété légère",
        "suiviPsy": True,
        "troublesSommeil": False,
        "niveauStress": 6
    }
    
    try:
        # Register patient
        response = requests.post(f"{API_URL}/auth/register/patient", json=patient_data)
        
        if response.status_code == 200:
            result = response.json()
            patient_id = result["id"]
            print(f"✅ Patient registered successfully with ID: {patient_id}")
            
            # Fetch complete profile to verify data was saved
            profile_response = requests.get(f"{API_URL}/patients/{patient_id}/profile")
            
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                print("✅ Profile data retrieved successfully!")
                
                # Verify key fields were saved
                checks = [
                    ("nom", "Test"),
                    ("prenom", "Patient"),
                    ("telephone", "0555123456"),
                    ("sexe", "Homme"),
                    ("contact_urgence_nom", "Jean Dupont"),
                    ("contact_urgence_tel", "0666789012"),
                    ("conditions_existantes", "Anxiété légère"),
                    ("suivi_psy", True),
                    ("troubles_sommeil", False),
                    ("niveau_stress", 6)
                ]
                
                all_good = True
                for field, expected in checks:
                    actual = profile_data.get(field)
                    if actual == expected:
                        print(f"  ✅ {field}: {actual}")
                    else:
                        print(f"  ❌ {field}: expected {expected}, got {actual}")
                        all_good = False
                
                if all_good:
                    print("\n🎉 PATIENT PROFILE SYSTEM TEST PASSED!")
                else:
                    print("\n❌ Some profile fields were not saved correctly")
                    
            else:
                print(f"❌ Failed to retrieve profile: {profile_response.status_code}")
                
        else:
            print(f"❌ Registration failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

def test_doctor_registration():
    """Test doctor registration with complete profile data"""
    print("\n🧪 Testing doctor registration with complete profile...")
    
    # Complete doctor registration data
    doctor_data = {
        "nom": "Docteur",
        "prenom": "Test",
        "email": "test.doctor.profile@example.com", 
        "motDePasse": "test123",
        "specialite": "Psychologue",
        "numeroLicence": "PSY123456",
        "tarifSeance": 5000.0,
        "sexe": "Femme",
        "telephone": "0777123456",
        "diplome": "Master en Psychologie Clinique",
        "anneesExperience": 5,
        "certifications": "TCC, EMDR",
        "langues": "Français, Arabe, Anglais", 
        "typeConsultation": "Hybride",
        "localisationCabinet": "Clinique El Rahma, Alger",
        "biographie": "Psychologue spécialisée en TCC avec 5 ans d'expérience."
    }
    
    try:
        # Register doctor
        response = requests.post(f"{API_URL}/auth/register/doctor", json=doctor_data)
        
        if response.status_code == 200:
            result = response.json()
            doctor_id = result["id"]
            print(f"✅ Doctor registered successfully with ID: {doctor_id}")
            print("🎉 DOCTOR PROFILE SYSTEM TEST PASSED!")
        else:
            print(f"❌ Registration failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    print("🔍 Testing Complete Profile System...")
    print("=" * 50)
    
    test_patient_registration()
    test_doctor_registration()
    
    print("\n" + "=" * 50)
    print("✅ Profile system tests completed!")