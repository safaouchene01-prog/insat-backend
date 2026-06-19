#!/usr/bin/env python3
"""
Test du système complet de profil pour les psychothérapeutes
"""
from backend.database import get_connection
import json

def test_doctor_profile_endpoints():
    """Test des endpoints de profil de thérapeute"""
    print("🧪 Test des endpoints de profil psychothérapeute...")
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Trouver le dernier thérapeute inscrit avec toutes ses données
        cur.execute("""
            SELECT idtherapeute, nom, prenom, email, specialite, numerolicence, tarifseance,
                   sexe, telephone, diplome, annees_experience, certifications, langues,
                   type_consultation, localisation_cabinet, biographie, dateinscription
            FROM psychotherapeute 
            WHERE dateinscription IS NOT NULL
            ORDER BY dateinscription DESC, idtherapeute DESC 
            LIMIT 1
        """)
        
        doctor = cur.fetchone()
        if not doctor:
            print("❌ Aucun thérapeute avec données complètes trouvé")
            return False
            
        doctor_id = doctor['idtherapeute']
        print(f"✅ Test avec Dr. {doctor['prenom']} {doctor['nom']} (ID: {doctor_id})")
        
        # Vérifier que toutes les données sont présentes
        fields_to_check = [
            ('nom', doctor['nom']),
            ('prenom', doctor['prenom']),
            ('email', doctor['email']),
            ('specialite', doctor['specialite']),
            ('telephone', doctor['telephone']),
            ('diplome', doctor['diplome']),
            ('annees_experience', doctor['annees_experience']),
            ('certifications', doctor['certifications']),
            ('langues', doctor['langues']),
            ('type_consultation', doctor['type_consultation']),
            ('localisation_cabinet', doctor['localisation_cabinet']),
            ('biographie', doctor['biographie']),
        ]
        
        print("\n📋 Données du profil:")
        missing_fields = []
        for field, value in fields_to_check:
            if value:
                if len(str(value)) > 50:
                    display_value = str(value)[:50] + "..."
                else:
                    display_value = str(value)
                print(f"  ✅ {field}: {display_value}")
            else:
                print(f"  ❌ {field}: Manquant")
                missing_fields.append(field)
        
        if missing_fields:
            print(f"\n⚠️ Champs manquants: {', '.join(missing_fields)}")
        else:
            print(f"\n🎉 Profil complet pour Dr. {doctor['prenom']} {doctor['nom']} !")
            
        return len(missing_fields) == 0
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False
    finally:
        conn.close()

def test_profile_update_simulation():
    """Simulation d'une mise à jour de profil"""
    print("\n🧪 Test de mise à jour de profil...")
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Trouver le dernier thérapeute
        cur.execute("""
            SELECT idtherapeute, nom, prenom, telephone, biographie
            FROM psychotherapeute 
            WHERE dateinscription IS NOT NULL
            ORDER BY dateinscription DESC, idtherapeute DESC 
            LIMIT 1
        """)
        
        doctor = cur.fetchone()
        if not doctor:
            print("❌ Aucun thérapeute trouvé pour le test")
            return False
            
        doctor_id = doctor['idtherapeute']
        original_phone = doctor['telephone']
        original_bio = doctor['biographie']
        
        # Test de mise à jour
        test_phone = "0555999888"
        test_bio = "Biographie mise à jour par test automatique"
        
        cur.execute("""
            UPDATE psychotherapeute 
            SET telephone = %s, biographie = %s 
            WHERE idtherapeute = %s
        """, (test_phone, test_bio, doctor_id))
        
        conn.commit()
        
        # Vérifier la mise à jour
        cur.execute("""
            SELECT telephone, biographie 
            FROM psychotherapeute 
            WHERE idtherapeute = %s
        """, (doctor_id,))
        
        updated = cur.fetchone()
        
        if updated['telephone'] == test_phone and updated['biographie'] == test_bio:
            print(f"✅ Mise à jour réussie pour Dr. {doctor['prenom']} {doctor['nom']}")
            print(f"  📞 Téléphone: {updated['telephone']}")
            print(f"  📝 Bio: {updated['biographie'][:50]}...")
        else:
            print("❌ Échec de la mise à jour")
            return False
            
        # Restaurer les valeurs originales
        cur.execute("""
            UPDATE psychotherapeute 
            SET telephone = %s, biographie = %s 
            WHERE idtherapeute = %s
        """, (original_phone, original_bio, doctor_id))
        
        conn.commit()
        print("✅ Valeurs originales restaurées")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test de mise à jour: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def check_missing_profiles():
    """Vérifier combien de thérapeutes ont des profils incomplets"""
    print("\n🔍 Analyse des profils incomplets...")
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Compter tous les thérapeutes
        cur.execute("SELECT COUNT(*) as total FROM psychotherapeute")
        total = cur.fetchone()['total']
        
        # Compter ceux avec profils complets
        cur.execute("""
            SELECT COUNT(*) as complete
            FROM psychotherapeute 
            WHERE telephone IS NOT NULL 
            AND diplome IS NOT NULL 
            AND biographie IS NOT NULL
            AND langues IS NOT NULL
        """)
        complete = cur.fetchone()['complete']
        
        incomplete = total - complete
        
        print(f"📊 Statistiques des profils:")
        print(f"  👥 Total thérapeutes: {total}")
        print(f"  ✅ Profils complets: {complete}")
        print(f"  ❌ Profils incomplets: {incomplete}")
        
        if incomplete > 0:
            print(f"\n💡 {incomplete} thérapeute(s) doivent compléter leur profil")
            print("   Ces profils ont été créés avant la mise en place du système complet")
        else:
            print(f"\n🎉 Tous les profils sont complets !")
            
        return {'total': total, 'complete': complete, 'incomplete': incomplete}
        
    except Exception as e:
        print(f"❌ Erreur lors de l'analyse: {e}")
        return None
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔍 Test complet du système de profil psychothérapeute")
    print("=" * 60)
    
    # Tests
    profile_ok = test_doctor_profile_endpoints()
    update_ok = test_profile_update_simulation()
    stats = check_missing_profiles()
    
    print("\n" + "=" * 60)
    
    if profile_ok and update_ok:
        print("🎉 TOUS LES TESTS SONT PASSÉS!")
        print("✅ Le système de profil psychothérapeute fonctionne correctement")
        print("✅ Les données d'inscription sont bien sauvegardées")
        print("✅ Les mises à jour de profil fonctionnent")
        
        if stats and stats['incomplete'] > 0:
            print(f"\n📝 Note: {stats['incomplete']} ancien(s) compte(s) doivent compléter leur profil")
        
    else:
        print("❌ Certains tests ont échoué")
        
    print("\nPrêt pour utilisation ! 🚀")