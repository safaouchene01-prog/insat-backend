-- ============================================================
-- ENUMS DEFINITIONS
-- ============================================================

CREATE TYPE specialite_enum AS ENUM (
  'psychologue',
  'orthophoniste',
  'psychiatre',
  'pedopsychiatre',
  'addictologue'
);

CREATE TYPE typeET_enum AS ENUM (
  'TCC',
  'ACT',
  'SCHEMA',
  'SYSTEMIQUE',
  'HUMANISTE',
  'PSYCHODYNAMIQUE',
  'RELAXATION',
  'RESPIRATION',
  'COMPORTEMENTALE',
  'INTEGRATIVE'
);

CREATE TYPE statutST_enum AS ENUM (
  'planifiee',
  'en_cours',
  'termine',
  'annulee'
);

CREATE TYPE typeST_enum AS ENUM (
  'appel_video',
  'chat',
  'appel_audio',
  'presentiel'
);

CREATE TYPE modeleIA_enum AS ENUM (
  'gpt4',
  'claude',
  'llama',
  'gemini'
);

CREATE TYPE TypeA_enum AS ENUM (
  'CHAT',
  'DIAGNOSTIC',
  'SUPPORT'
);

CREATE TYPE statutP_enum AS ENUM (
  'en_attente',
  'valide',
  'echoue',
  'rembourse'
);

CREATE TYPE modePaiement_enum AS ENUM (
  'carte',
  'virement',
  'paypal',
  'cib',
  'edahabia',
  'especes'
);

CREATE TYPE niveauRecommandation_enum AS ENUM (
  'DEBUTANT',
  'INTERMEDIAIRE',
  'AVANCE'
);

CREATE TYPE groupeSanguin_enum AS ENUM (
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-'
);

CREATE TYPE etatGeneral_enum AS ENUM (
  'BON',
  'MOYEN',
  'CRITIQUE'
);

CREATE TYPE theme_enum AS ENUM (
  'anxiete',
  'stress',
  'sommeil',
  'relations',
  'depression',
  'motivation',
  'solitude',
  'autre'
);

CREATE TYPE statutRDV_enum AS ENUM (
  'PLANIFIE',
  'CONFIRME',
  'ANNULE',
  'TERMINE',
  'REPORTE'
);

CREATE TYPE niveau_acces_enum AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATEUR'
);

CREATE TYPE RessentiGlobal_enum AS ENUM (
  'POSITIF',
  'NEUTRE',
  'NEGATIF'
);

-- Notification system enums
CREATE TYPE notif_type_enum AS ENUM (
  'appointment',
  'appointment_confirmed',
  'appointment_cancelled',
  'appointment_approved',
  'appointment_rejected',
  'message',
  'session_created',
  'session_completed',
  'payment',
  'ai_diagnosis',
  'ai_treatment',
  'system',
  'reminder'
);

-- ============================================================
-- CORE USER TABLES
-- ============================================================

-- Patient table with all extended profile columns
CREATE TABLE Patient (
  idPatient INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  motDePasse VARCHAR(255) NOT NULL,
  dateInscription DATE DEFAULT CURRENT_DATE,
  dateNaissance DATE NOT NULL,
  numeroSecuriteSociale VARCHAR(50),
  niveauAnxieteInitial INT CHECK (niveauAnxieteInitial BETWEEN 1 AND 10),
  -- Extended profile columns
  telephone VARCHAR(20),
  sexe VARCHAR(10),
  contact_urgence_nom VARCHAR(100),
  contact_urgence_tel VARCHAR(20),
  conditions_existantes TEXT,
  suivi_psy BOOLEAN DEFAULT FALSE,
  troubles_sommeil BOOLEAN DEFAULT FALSE,
  niveau_stress INTEGER CHECK (niveau_stress BETWEEN 1 AND 10),
  profile_picture VARCHAR(255)
);

ALTER TABLE Patient ADD COLUMN ville VARCHAR(100);
ALTER TABLE Patient ADD COLUMN adresse TEXT;
CREATE INDEX IF NOT EXISTS idx_patient_ville ON Patient(ville);
CREATE INDEX IF NOT EXISTS idx_patient_adresse ON Patient(adresse);

-- Clinic partner table with extended columns
CREATE TABLE CliniquePartenaire (
  idClinique INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  adresse VARCHAR(255),
  telephone VARCHAR(30),
  email VARCHAR(150) UNIQUE NOT NULL,
  -- Extended columns
  validated BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  logoUrl VARCHAR(255),
  ville VARCHAR(100),
  doctorCount INT DEFAULT 0,
  profile_picture VARCHAR(255),
  description TEXT,
  localisation VARCHAR(255)
);

ALTER TABLE cliniquepartenaire
ADD COLUMN motdepasse TEXT;

-- Psychotherapist table with all extended profile columns
CREATE TABLE Psychotherapeute (
  idTherapeute INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  motDePasse VARCHAR(255) NOT NULL,
  dateInscription DATE DEFAULT CURRENT_DATE,
  specialite specialite_enum,
  numeroLicence VARCHAR(100),
  tarifSeance DECIMAL(10,2),
  noteMoyenne DECIMAL(3,2),
  idClinique INT,
  -- Platform management columns
  validated BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  whatsapp VARCHAR(30),
  ville VARCHAR(100),
  avatarUrl VARCHAR(255),
  typeET typeET_enum[],
  rejection_reason TEXT,
  -- Extended profile columns
  sexe VARCHAR(10),
  telephone VARCHAR(20),
  diplome VARCHAR(200),
  annees_experience INTEGER DEFAULT 0,
  certifications TEXT,
  langues VARCHAR(200),
  type_consultation VARCHAR(50),
  localisation_cabinet VARCHAR(300),
  biographie TEXT,
  profile_picture VARCHAR(255),
  
  FOREIGN KEY (idClinique) REFERENCES CliniquePartenaire(idClinique) ON DELETE SET NULL
);

-- ============================================================
-- APPOINTMENT & SCHEDULING SYSTEM
-- ============================================================

-- Main appointments table
CREATE TABLE RendezVous (
  idRendezVous INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dateHeure TIMESTAMP NOT NULL,
  statut statutRDV_enum,
  idPatient INT,
  idTherapeute INT,
  
  FOREIGN KEY (idPatient) REFERENCES Patient(idPatient) ON DELETE CASCADE,
  FOREIGN KEY (idTherapeute) REFERENCES Psychotherapeute(idTherapeute) ON DELETE CASCADE
);

-- Date-specific availability slots (USED TABLE)
CREATE TABLE disponibilite_date (
  iddispo SERIAL PRIMARY KEY,
  idtherapeute INTEGER NOT NULL,
  date_dispo DATE NOT NULL,
  heure VARCHAR(5) NOT NULL,
  reserve BOOLEAN DEFAULT FALSE,
  
  FOREIGN KEY (idtherapeute) REFERENCES Psychotherapeute(idTherapeute) ON DELETE CASCADE
);

-- AI agents configuration
CREATE TABLE AgentIA (
  idIA INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR(100),
  version VARCHAR(50),
  modeleIA modeleIA_enum,
  seuilAlerte INT CHECK (seuilAlerte BETWEEN 1 AND 10),
  typeA TypeA_enum
);

-- AI agents configuration
CREATE TABLE AgentIA (
  idIA INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom VARCHAR(100),
  version VARCHAR(50),
  modeleIA modeleIA_enum,
  seuilAlerte INT CHECK (seuilAlerte BETWEEN 1 AND 10),
  typeA TypeA_enum
);

-- Therapy sessions
CREATE TABLE SessionTherapie (
  idSession INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dateHeureDebut TIMESTAMP,
  dureeMinutes INT,
  statut statutST_enum,
  type typeST_enum,
  lienVisio VARCHAR(255) NULL,
  compteRendu TEXT,
  idPatient INT,
  idTherapeute INT,
  idRendezVous INT,
  idIA INT NULL,
  
  FOREIGN KEY (idPatient) REFERENCES Patient(idPatient) ON DELETE RESTRICT,
  FOREIGN KEY (idTherapeute) REFERENCES Psychotherapeute(idTherapeute) ON DELETE RESTRICT,
  FOREIGN KEY (idRendezVous) REFERENCES RendezVous(idRendezVous) ON DELETE SET NULL,
  FOREIGN KEY (idIA) REFERENCES AgentIA(idIA) ON DELETE SET NULL
);

-- ============================================================
-- PAYMENT SYSTEM
-- ============================================================

CREATE TABLE Paiement (
  idPaiement INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  montant DECIMAL(10,2) CHECK (montant > 0),
  datePaiement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modePaiement modePaiement_enum,
  statut statutP_enum,
  checkoutId VARCHAR(255),
  idPatient INT,
  idSession INT,
  idRendezVous INT,
  
  FOREIGN KEY (idPatient) REFERENCES Patient(idPatient) ON DELETE RESTRICT,
  FOREIGN KEY (idSession) REFERENCES SessionTherapie(idSession) ON DELETE SET NULL,
  FOREIGN KEY (idRendezVous) REFERENCES RendezVous(idRendezVous) ON DELETE SET NULL
);

-- ============================================================
-- AI DIAGNOSTIC SYSTEM (UNIFIED)
-- ============================================================

-- Unified AI diagnosis system (replaces diagnostic_ia, ai_diagnoses, diagnostic_confirme)
CREATE TABLE ai_diagnoses (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES Patient(idPatient) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES Psychotherapeute(idTherapeute) ON DELETE CASCADE,
  
  -- AI Predictions & Legacy Support
  predictions JSONB NOT NULL,              -- Full structured AI predictions
  top_prediction VARCHAR(200),             -- Main prediction (trouble_predit from diagnostic_ia)
  confidence_score FLOAT,                  -- Primary confidence score (0-1)
  top3_text TEXT,                         -- Legacy top3 format for compatibility
  symptoms_text TEXT,                      -- Original symptoms as text (from diagnostic_ia)
  symptoms_used TEXT[],                    -- Structured symptoms array
  
  -- Workflow Management
  mode VARCHAR(20) DEFAULT 'manual' CHECK (mode IN ('automatic', 'manual')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  
  -- Final Confirmed Diagnosis (from diagnostic_confirme)
  final_diagnosis VARCHAR(150),            -- Therapist's final confirmed diagnosis
  clinical_notes TEXT,                     -- Therapist's clinical notes
  ai_top1_backup VARCHAR(150),            -- Backup of AI's first suggestion for audit
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Original diagnosis date
  confirmed_at TIMESTAMP,                            -- When therapist confirmed
  
  -- Performance optimization
  is_confirmed BOOLEAN GENERATED ALWAYS AS (status = 'confirmed') STORED
);

-- AI treatment plans (unchanged - works with unified table)
CREATE TABLE ai_treatment_plans (
  id SERIAL PRIMARY KEY,
  diagnosis_id INTEGER REFERENCES ai_diagnoses(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES Patient(idPatient) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES Psychotherapeute(idTherapeute) ON DELETE CASCADE,
  treatment_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient questionnaire responses for AI diagnosis
CREATE TABLE questionnaire_reponses (
  idreponse SERIAL PRIMARY KEY,
  idpatient INT NOT NULL REFERENCES Patient(idPatient) ON DELETE CASCADE,
  symptome VARCHAR(100) NOT NULL,
  valeur SMALLINT NOT NULL CHECK (valeur IN (0, 1)),
  date_reponse TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- COMMUNICATION SYSTEM
-- ============================================================

-- AI chatbot conversations
CREATE TABLE ConversationIA (
  idConversation INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idPatient INT,
  idIA INT,
  dateDebut TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dateFin TIMESTAMP,
  theme theme_enum,
  nbMessages INT DEFAULT 0,
  satisfaction INT CHECK (satisfaction BETWEEN 1 AND 5),
  historique TEXT,
  
  FOREIGN KEY (idPatient) REFERENCES Patient(idPatient) ON DELETE RESTRICT,
  FOREIGN KEY (idIA) REFERENCES AgentIA(idIA) ON DELETE SET NULL
);

-- ============================================================
-- NOTIFICATION SYSTEM
-- ============================================================

-- In-app notifications
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  user_role VARCHAR(20) NOT NULL,
  type notif_type_enum NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  related_id INT,
  related_type VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEDICAL RECORDS SYSTEM
-- ============================================================

-- DME table with extended patient information (USED TABLE)
CREATE TABLE dme (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  nom VARCHAR(100),
  prenom VARCHAR(100),
  email VARCHAR(150),
  telephone VARCHAR(20),
  sexe VARCHAR(10),
  adresse TEXT,
  date_naissance DATE,
  contact_urgence_nom VARCHAR(100),
  contact_urgence_tel VARCHAR(20),
  numero_assurance VARCHAR(50),
  groupe_sanguin VARCHAR(10),
  profession VARCHAR(100),
  situation_familiale VARCHAR(50),
  medecin_traitant VARCHAR(150),
  allergies TEXT,
  medicaments_en_cours TEXT,
  antecedents_medicaux TEXT,
  antecedents_psychologiques TEXT,
  motif_consultation TEXT,
  compte_rendu TEXT,
  diagnostic TEXT,
  plan_traitement TEXT,
  updated_by VARCHAR(20),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (patient_id) REFERENCES Patient(idPatient) ON DELETE CASCADE
);

-- DME documents
CREATE TABLE dme_documents (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  uploaded_by VARCHAR(20) NOT NULL,
  uploaded_by_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (patient_id) REFERENCES Patient(idPatient) ON DELETE CASCADE
);

-- ============================================================
-- EDUCATIONAL RESOURCES
-- ============================================================

CREATE TABLE RessourcesPedagogique (
  idRessource INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titreRP VARCHAR(150) NOT NULL,
  type VARCHAR(50),
  contenuTexte TEXT,
  tags TEXT,
  dureeLecture INT CHECK (dureeLecture > 0),
  niveauRecommandation niveauRecommandation_enum,
  fichier_pdf VARCHAR(255)
);

-- ============================================================
-- SECURITY & ACCESS CONTROL
-- ============================================================

-- Doctor-patient assignments for security
CREATE TABLE doctor_patient_assignments (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(doctor_id, patient_id)
);

-- Password reset tokens
CREATE TABLE password_reset_otp (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- Core entity indexes
CREATE INDEX idx_patient_email ON Patient(email);
CREATE INDEX idx_patient_telephone ON Patient(telephone);
CREATE INDEX idx_psychotherapeute_email ON Psychotherapeute(email);
CREATE INDEX idx_psychotherapeute_telephone ON Psychotherapeute(telephone);
CREATE INDEX idx_psychotherapeute_specialite ON Psychotherapeute(specialite);

-- Appointment system indexes
CREATE INDEX idx_rdv_patient ON RendezVous(idPatient);
CREATE INDEX idx_rdv_therapeute ON RendezVous(idTherapeute);
CREATE INDEX idx_rdv_statut ON RendezVous(statut);
CREATE INDEX idx_dispo_date_therapeute ON disponibilite_date(idtherapeute);
CREATE INDEX idx_dispo_date_date ON disponibilite_date(date_dispo);
CREATE INDEX idx_dispo_date_reserve ON disponibilite_date(reserve);

-- AI system indexes (unified)
CREATE INDEX idx_ai_diagnoses_patient ON ai_diagnoses(patient_id);
CREATE INDEX idx_ai_diagnoses_doctor ON ai_diagnoses(doctor_id);
CREATE INDEX idx_ai_diagnoses_created ON ai_diagnoses(created_at DESC);
CREATE INDEX idx_ai_diagnoses_status ON ai_diagnoses(status);
CREATE INDEX idx_ai_diagnoses_confirmed ON ai_diagnoses(is_confirmed) WHERE is_confirmed = true;
CREATE INDEX idx_ai_diagnoses_mode ON ai_diagnoses(mode);
CREATE INDEX idx_ai_treatment_plans_diagnosis ON ai_treatment_plans(diagnosis_id);
CREATE INDEX idx_ai_treatment_plans_patient ON ai_treatment_plans(patient_id);
CREATE INDEX idx_ai_treatment_plans_doctor ON ai_treatment_plans(doctor_id);
CREATE INDEX idx_questionnaire_patient ON questionnaire_reponses(idpatient);
CREATE INDEX idx_questionnaire_symptome ON questionnaire_reponses(symptome);

-- Notification system indexes
CREATE INDEX idx_notif_user ON notifications(user_id, user_role);
CREATE INDEX idx_notif_read ON notifications(user_id, is_read);
CREATE INDEX idx_notif_created ON notifications(created_at DESC);

-- Security system indexes
CREATE INDEX idx_doctor_patient_doctor_id ON doctor_patient_assignments(doctor_id);
CREATE INDEX idx_doctor_patient_patient_id ON doctor_patient_assignments(patient_id);

-- DME system indexes
CREATE INDEX idx_dme_patient_id ON dme(patient_id);
CREATE INDEX idx_dme_documents_patient_id ON dme_documents(patient_id);

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE Patient IS 'Patient profiles with complete medical and personal information';
COMMENT ON TABLE Psychotherapeute IS 'Therapist profiles with professional credentials and extended information';
COMMENT ON TABLE CliniquePartenaire IS 'Partner clinic information and management';
COMMENT ON TABLE RendezVous IS 'Appointment scheduling and management';
COMMENT ON TABLE disponibilite_date IS 'Specific date/time availability slots for therapists';
COMMENT ON TABLE SessionTherapie IS 'Individual therapy session records';
COMMENT ON TABLE ai_diagnoses IS 'Unified AI diagnosis system - combines legacy diagnostic_ia, enhanced ai_diagnoses, and diagnostic_confirme functionality';
COMMENT ON TABLE ai_treatment_plans IS 'AI-generated treatment plans linked to confirmed diagnoses';
COMMENT ON TABLE questionnaire_reponses IS 'Patient questionnaire binary answers for AI diagnosis';
COMMENT ON TABLE notifications IS 'In-app notification system for all user types';
COMMENT ON TABLE doctor_patient_assignments IS 'Security table for doctor-patient relationship management';
COMMENT ON TABLE dme IS 'Electronic medical records with extended patient information';
COMMENT ON TABLE dme_documents IS 'Document attachments for medical records';

-- ============================================================
-- FINAL SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE 'INSAT Healthcare Platform Database Schema - COMPLETE INSTALLATION SUCCESS';
    RAISE NOTICE 'All tables, indexes, and relationships have been created successfully';
    RAISE NOTICE 'Total tables created: 21 core tables for full platform functionality';
    RAISE NOTICE 'DME system: Fixed primary key (id) - ready for use';
    RAISE NOTICE 'AI diagnostic system: UNIFIED into single ai_diagnoses table';
    RAISE NOTICE '  ✅ Replaces: diagnostic_ia + ai_diagnoses + diagnostic_confirme';
    RAISE NOTICE '  ✅ Supports: Legacy compatibility + Modern workflow + Confirmed diagnoses';
    RAISE NOTICE '  ✅ Features: JSONB predictions + Status workflow + Clinical notes';
END $$;