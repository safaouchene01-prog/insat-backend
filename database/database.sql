--
-- PostgreSQL database dump
--

\restrict gMflvDSbapqOmNJu0yx8Kn1KnelCqapck6R7wExihOuhg0hEDUJ4dmbHjBvdhzA

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: etatgeneral_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.etatgeneral_enum AS ENUM (
    'BON',
    'MOYEN',
    'CRITIQUE'
);


ALTER TYPE public.etatgeneral_enum OWNER TO postgres;

--
-- Name: groupesanguin_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.groupesanguin_enum AS ENUM (
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-'
);


ALTER TYPE public.groupesanguin_enum OWNER TO postgres;

--
-- Name: modeleia_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.modeleia_enum AS ENUM (
    'gpt4',
    'claude',
    'llama',
    'gemini'
);


ALTER TYPE public.modeleia_enum OWNER TO postgres;

--
-- Name: modepaiement_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.modepaiement_enum AS ENUM (
    'carte',
    'virement',
    'paypal',
    'cib',
    'edahabia',
    'especes'
);


ALTER TYPE public.modepaiement_enum OWNER TO postgres;

--
-- Name: niveau_acces_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.niveau_acces_enum AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'MODERATEUR'
);


ALTER TYPE public.niveau_acces_enum OWNER TO postgres;

--
-- Name: niveaurecommandation_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.niveaurecommandation_enum AS ENUM (
    'DEBUTANT',
    'INTERMEDIAIRE',
    'AVANCE'
);


ALTER TYPE public.niveaurecommandation_enum OWNER TO postgres;

--
-- Name: notif_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notif_type_enum AS ENUM (
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


ALTER TYPE public.notif_type_enum OWNER TO postgres;

--
-- Name: ressentiglobal_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ressentiglobal_enum AS ENUM (
    'POSITIF',
    'NEUTRE',
    'NEGATIF'
);


ALTER TYPE public.ressentiglobal_enum OWNER TO postgres;

--
-- Name: specialite_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.specialite_enum AS ENUM (
    'psychologue',
    'orthophoniste',
    'psychiatre',
    'pedopsychiatre',
    'addictologue'
);


ALTER TYPE public.specialite_enum OWNER TO postgres;

--
-- Name: statutp_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statutp_enum AS ENUM (
    'en_attente',
    'valide',
    'echoue',
    'rembourse'
);


ALTER TYPE public.statutp_enum OWNER TO postgres;

--
-- Name: statutrdv_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statutrdv_enum AS ENUM (
    'PLANIFIE',
    'CONFIRME',
    'ANNULE',
    'TERMINE',
    'REPORTE'
);


ALTER TYPE public.statutrdv_enum OWNER TO postgres;

--
-- Name: statutst_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statutst_enum AS ENUM (
    'planifiee',
    'en_cours',
    'termine',
    'annulee'
);


ALTER TYPE public.statutst_enum OWNER TO postgres;

--
-- Name: theme_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.theme_enum AS ENUM (
    'anxiete',
    'stress',
    'sommeil',
    'relations',
    'depression',
    'motivation',
    'solitude',
    'autre'
);


ALTER TYPE public.theme_enum OWNER TO postgres;

--
-- Name: typea_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.typea_enum AS ENUM (
    'CHAT',
    'DIAGNOSTIC',
    'SUPPORT'
);


ALTER TYPE public.typea_enum OWNER TO postgres;

--
-- Name: typeet_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.typeet_enum AS ENUM (
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


ALTER TYPE public.typeet_enum OWNER TO postgres;

--
-- Name: typest_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.typest_enum AS ENUM (
    'appel_video',
    'chat',
    'appel_audio',
    'presentiel'
);


ALTER TYPE public.typest_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agentia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agentia (
    idia integer NOT NULL,
    nom character varying(100),
    version character varying(50),
    modeleia public.modeleia_enum,
    seuilalerte integer,
    typea public.typea_enum,
    CONSTRAINT agentia_seuilalerte_check CHECK (((seuilalerte >= 1) AND (seuilalerte <= 10)))
);


ALTER TABLE public.agentia OWNER TO postgres;

--
-- Name: agentia_idia_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.agentia ALTER COLUMN idia ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.agentia_idia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ai_diagnoses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_diagnoses (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    predictions jsonb NOT NULL,
    top_prediction character varying(200),
    confidence_score double precision,
    top3_text text,
    symptoms_text text,
    symptoms_used text[],
    mode character varying(20) DEFAULT 'manual'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    final_diagnosis character varying(150),
    clinical_notes text,
    ai_top1_backup character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    confirmed_at timestamp without time zone,
    is_confirmed boolean GENERATED ALWAYS AS (((status)::text = 'confirmed'::text)) STORED,
    CONSTRAINT ai_diagnoses_mode_check CHECK (((mode)::text = ANY ((ARRAY['automatic'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT ai_diagnoses_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.ai_diagnoses OWNER TO postgres;

--
-- Name: ai_diagnoses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_diagnoses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_diagnoses_id_seq OWNER TO postgres;

--
-- Name: ai_diagnoses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_diagnoses_id_seq OWNED BY public.ai_diagnoses.id;


--
-- Name: ai_treatment_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_treatment_plans (
    id integer NOT NULL,
    diagnosis_id integer,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    treatment_json jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_treatment_plans OWNER TO postgres;

--
-- Name: ai_treatment_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_treatment_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_treatment_plans_id_seq OWNER TO postgres;

--
-- Name: ai_treatment_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_treatment_plans_id_seq OWNED BY public.ai_treatment_plans.id;


--
-- Name: cliniquepartenaire; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cliniquepartenaire (
    idclinique integer NOT NULL,
    nom character varying(150) NOT NULL,
    adresse character varying(255),
    telephone character varying(30),
    email character varying(150) NOT NULL,
    validated boolean DEFAULT false,
    featured boolean DEFAULT false,
    logourl character varying(255),
    ville character varying(100),
    doctorcount integer DEFAULT 0,
    profile_picture character varying(255),
    description text,
    localisation character varying(255),
    motdepasse text
);


ALTER TABLE public.cliniquepartenaire OWNER TO postgres;

--
-- Name: cliniquepartenaire_idclinique_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.cliniquepartenaire ALTER COLUMN idclinique ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cliniquepartenaire_idclinique_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: conversationia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversationia (
    idconversation integer NOT NULL,
    idpatient integer,
    idia integer,
    datedebut timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    datefin timestamp without time zone,
    theme public.theme_enum,
    nbmessages integer DEFAULT 0,
    satisfaction integer,
    historique text,
    CONSTRAINT conversationia_satisfaction_check CHECK (((satisfaction >= 1) AND (satisfaction <= 5)))
);


ALTER TABLE public.conversationia OWNER TO postgres;

--
-- Name: conversationia_idconversation_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.conversationia ALTER COLUMN idconversation ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.conversationia_idconversation_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: disponibilite_date; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disponibilite_date (
    iddispo integer NOT NULL,
    idtherapeute integer NOT NULL,
    date_dispo date NOT NULL,
    heure character varying(5) NOT NULL,
    reserve boolean DEFAULT false
);


ALTER TABLE public.disponibilite_date OWNER TO postgres;

--
-- Name: disponibilite_date_iddispo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.disponibilite_date_iddispo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disponibilite_date_iddispo_seq OWNER TO postgres;

--
-- Name: disponibilite_date_iddispo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.disponibilite_date_iddispo_seq OWNED BY public.disponibilite_date.iddispo;


--
-- Name: dme; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dme (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    nom character varying(100),
    prenom character varying(100),
    email character varying(150),
    telephone character varying(20),
    sexe character varying(10),
    adresse text,
    date_naissance date,
    contact_urgence_nom character varying(100),
    contact_urgence_tel character varying(20),
    numero_assurance character varying(50),
    groupe_sanguin character varying(10),
    profession character varying(100),
    situation_familiale character varying(50),
    medecin_traitant character varying(150),
    allergies text,
    medicaments_en_cours text,
    antecedents_medicaux text,
    antecedents_psychologiques text,
    motif_consultation text,
    compte_rendu text,
    diagnostic text,
    plan_traitement text,
    updated_by character varying(20),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.dme OWNER TO postgres;

--
-- Name: dme_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dme_documents (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_url character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    uploaded_by character varying(20) NOT NULL,
    uploaded_by_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.dme_documents OWNER TO postgres;

--
-- Name: dme_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dme_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dme_documents_id_seq OWNER TO postgres;

--
-- Name: dme_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dme_documents_id_seq OWNED BY public.dme_documents.id;


--
-- Name: dme_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dme_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dme_id_seq OWNER TO postgres;

--
-- Name: dme_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dme_id_seq OWNED BY public.dme.id;


--
-- Name: doctor_patient_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctor_patient_assignments (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    patient_id integer NOT NULL,
    assigned_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    notes text
);


ALTER TABLE public.doctor_patient_assignments OWNER TO postgres;

--
-- Name: doctor_patient_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.doctor_patient_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_patient_assignments_id_seq OWNER TO postgres;

--
-- Name: doctor_patient_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.doctor_patient_assignments_id_seq OWNED BY public.doctor_patient_assignments.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_role character varying(20) NOT NULL,
    type public.notif_type_enum DEFAULT 'system'::public.notif_type_enum NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    related_id integer,
    related_type character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: paiement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paiement (
    idpaiement integer NOT NULL,
    montant numeric(10,2),
    datepaiement timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modepaiement public.modepaiement_enum,
    statut public.statutp_enum,
    checkoutid character varying(255),
    idpatient integer,
    idsession integer,
    idrendezvous integer,
    CONSTRAINT paiement_montant_check CHECK ((montant > (0)::numeric))
);


ALTER TABLE public.paiement OWNER TO postgres;

--
-- Name: paiement_idpaiement_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.paiement ALTER COLUMN idpaiement ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.paiement_idpaiement_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: password_reset_otp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_otp (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    otp character varying(6) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false
);


ALTER TABLE public.password_reset_otp OWNER TO postgres;

--
-- Name: password_reset_otp_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_otp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_otp_id_seq OWNER TO postgres;

--
-- Name: password_reset_otp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_otp_id_seq OWNED BY public.password_reset_otp.id;


--
-- Name: patient; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient (
    idpatient integer NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    motdepasse character varying(255) NOT NULL,
    dateinscription date DEFAULT CURRENT_DATE,
    datenaissance date NOT NULL,
    numerosecuritesociale character varying(50),
    niveauanxieteinitial integer,
    telephone character varying(20),
    sexe character varying(10),
    contact_urgence_nom character varying(100),
    contact_urgence_tel character varying(20),
    conditions_existantes text,
    suivi_psy boolean DEFAULT false,
    troubles_sommeil boolean DEFAULT false,
    niveau_stress integer,
    profile_picture character varying(255),
    ville character varying(100),
    adresse text,
    CONSTRAINT patient_niveau_stress_check CHECK (((niveau_stress >= 1) AND (niveau_stress <= 10))),
    CONSTRAINT patient_niveauanxieteinitial_check CHECK (((niveauanxieteinitial >= 1) AND (niveauanxieteinitial <= 10)))
);


ALTER TABLE public.patient OWNER TO postgres;

--
-- Name: patient_idpatient_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.patient ALTER COLUMN idpatient ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.patient_idpatient_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: psychotherapeute; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.psychotherapeute (
    idtherapeute integer NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    motdepasse character varying(255) NOT NULL,
    dateinscription date DEFAULT CURRENT_DATE,
    specialite public.specialite_enum,
    numerolicence character varying(100),
    tarifseance numeric(10,2),
    notemoyenne numeric(3,2),
    idclinique integer,
    validated boolean DEFAULT false,
    featured boolean DEFAULT false,
    whatsapp character varying(30),
    ville character varying(100),
    avatarurl character varying(255),
    typeet public.typeet_enum[],
    rejection_reason text,
    sexe character varying(10),
    telephone character varying(20),
    diplome character varying(200),
    annees_experience integer DEFAULT 0,
    certifications text,
    langues character varying(200),
    type_consultation character varying(50),
    localisation_cabinet character varying(300),
    biographie text,
    profile_picture character varying(255)
);


ALTER TABLE public.psychotherapeute OWNER TO postgres;

--
-- Name: psychotherapeute_idtherapeute_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.psychotherapeute ALTER COLUMN idtherapeute ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.psychotherapeute_idtherapeute_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: questionnaire_reponses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questionnaire_reponses (
    idreponse integer NOT NULL,
    idpatient integer NOT NULL,
    symptome character varying(100) NOT NULL,
    valeur smallint NOT NULL,
    date_reponse timestamp without time zone DEFAULT now(),
    CONSTRAINT questionnaire_reponses_valeur_check CHECK ((valeur = ANY (ARRAY[0, 1])))
);


ALTER TABLE public.questionnaire_reponses OWNER TO postgres;

--
-- Name: questionnaire_reponses_idreponse_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.questionnaire_reponses_idreponse_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questionnaire_reponses_idreponse_seq OWNER TO postgres;

--
-- Name: questionnaire_reponses_idreponse_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.questionnaire_reponses_idreponse_seq OWNED BY public.questionnaire_reponses.idreponse;


--
-- Name: rendezvous; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rendezvous (
    idrendezvous integer NOT NULL,
    dateheure timestamp without time zone NOT NULL,
    statut public.statutrdv_enum,
    idpatient integer,
    idtherapeute integer
);


ALTER TABLE public.rendezvous OWNER TO postgres;

--
-- Name: rendezvous_idrendezvous_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.rendezvous ALTER COLUMN idrendezvous ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.rendezvous_idrendezvous_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ressourcespedagogique; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ressourcespedagogique (
    idressource integer NOT NULL,
    titrerp character varying(150) NOT NULL,
    type character varying(50),
    contenutexte text,
    tags text,
    dureelecture integer,
    niveaurecommandation public.niveaurecommandation_enum,
    fichier_pdf character varying(255),
    CONSTRAINT ressourcespedagogique_dureelecture_check CHECK ((dureelecture > 0))
);


ALTER TABLE public.ressourcespedagogique OWNER TO postgres;

--
-- Name: ressourcespedagogique_idressource_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.ressourcespedagogique ALTER COLUMN idressource ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ressourcespedagogique_idressource_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sessiontherapie; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessiontherapie (
    idsession integer NOT NULL,
    dateheuredebut timestamp without time zone,
    dureeminutes integer,
    statut public.statutst_enum,
    type public.typest_enum,
    lienvisio character varying(255),
    compterendu text,
    idpatient integer,
    idtherapeute integer,
    idrendezvous integer,
    idia integer
);


ALTER TABLE public.sessiontherapie OWNER TO postgres;

--
-- Name: sessiontherapie_idsession_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.sessiontherapie ALTER COLUMN idsession ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sessiontherapie_idsession_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ai_diagnoses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_diagnoses ALTER COLUMN id SET DEFAULT nextval('public.ai_diagnoses_id_seq'::regclass);


--
-- Name: ai_treatment_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_treatment_plans ALTER COLUMN id SET DEFAULT nextval('public.ai_treatment_plans_id_seq'::regclass);


--
-- Name: disponibilite_date iddispo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilite_date ALTER COLUMN iddispo SET DEFAULT nextval('public.disponibilite_date_iddispo_seq'::regclass);


--
-- Name: dme id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dme ALTER COLUMN id SET DEFAULT nextval('public.dme_id_seq'::regclass);


--
-- Name: dme_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dme_documents ALTER COLUMN id SET DEFAULT nextval('public.dme_documents_id_seq'::regclass);


--
-- Name: doctor_patient_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_patient_assignments ALTER COLUMN id SET DEFAULT nextval('public.doctor_patient_assignments_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: password_reset_otp id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_otp ALTER COLUMN id SET DEFAULT nextval('public.password_reset_otp_id_seq'::regclass);


--
-- Name: questionnaire_reponses idreponse; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questionnaire_reponses ALTER COLUMN idreponse SET DEFAULT nextval('public.questionnaire_reponses_idreponse_seq'::regclass);


--
-- Data for Name: agentia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agentia (idia, nom, version, modeleia, seuilalerte, typea) FROM stdin;
1	Assistant Psychologique Principal	1.0	gpt4	7	CHAT
2	Diagnostic Assistant	1.0	claude	8	DIAGNOSTIC
3	Support Émotionnel	1.0	gpt4	6	SUPPORT
\.


--
-- Data for Name: ai_diagnoses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_diagnoses (id, patient_id, doctor_id, predictions, top_prediction, confidence_score, top3_text, symptoms_text, symptoms_used, mode, status, final_diagnosis, clinical_notes, ai_top1_backup, created_at, confirmed_at) FROM stdin;
1	1	1	[{"diagnosis": "Trouble de la Personnalité Paranoïaque", "confidence": 0.0991}]	\N	0.0991	\N	\N	\N	manual	confirmed	Trouble de la Personnalité Paranoïaque	\N	Trouble de la Personnalité Paranoïaque	2026-06-17 17:12:20.443946	2026-06-17 17:12:20.443946
2	1	1	[{"diagnosis": "Trouble de la Personnalité Paranoïaque", "confidence": 0.0991}, {"diagnosis": "Trouble Bipolaire", "confidence": 0.0948}, {"diagnosis": "Trouble de la Personnalité Borderline", "confidence": 0.0939}]	Trouble de la Personnalité Paranoïaque	0.0991	\N	[]	{}	automatic	confirmed	Trouble de la Personnalité Paranoïaque	\N	Trouble de la Personnalité Paranoïaque	2026-06-17 17:55:08.443757	2026-06-17 17:55:20.968863
3	1	1	[{"diagnosis": "Troubles liés à l'usage de substances", "confidence": 0.1733}, {"diagnosis": "Trouble Dépressif Majeur", "confidence": 0.1146}, {"diagnosis": "Trouble de la Personnalité Borderline", "confidence": 0.0834}]	Troubles liés à l'usage de substances	0.1733	\N	["pensees_recurrentes_mort", "poursuite_malgre_consequences"]	{pensees_recurrentes_mort,poursuite_malgre_consequences}	manual	confirmed	Troubles liés à l'usage de substances	\N	Troubles liés à l'usage de substances	2026-06-17 18:07:37.301418	2026-06-17 18:08:00.482881
4	1	1	[{"diagnosis": "Trouble Dépressif Majeur", "confidence": 0.1032}, {"diagnosis": "Trouble de la Personnalité Paranoïaque", "confidence": 0.0984}, {"diagnosis": "Trouble de la Personnalité Borderline", "confidence": 0.0921}]	Trouble Dépressif Majeur	0.1032	\N	["fatigue_perte_energie"]	{fatigue_perte_energie}	automatic	confirmed	Trouble Dépressif Majeur	\N	Trouble Dépressif Majeur	2026-06-17 18:12:50.306843	2026-06-17 18:12:58.533401
5	1	1	[{"diagnosis": "Trouble Dépressif Majeur", "confidence": 0.1032}, {"diagnosis": "Trouble de la Personnalité Paranoïaque", "confidence": 0.0984}, {"diagnosis": "Trouble de la Personnalité Borderline", "confidence": 0.0921}]	Trouble Dépressif Majeur	0.1032	\N	["fatigue_perte_energie"]	{fatigue_perte_energie}	automatic	confirmed	Trouble Dépressif Majeur	\N	Trouble Dépressif Majeur	2026-06-17 18:24:05.861427	2026-06-17 18:24:10.147809
\.


--
-- Data for Name: ai_treatment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_treatment_plans (id, diagnosis_id, patient_id, doctor_id, treatment_json, created_at) FROM stdin;
1	2	1	1	{"cognitive": ["Restructuration des biais d'attribution hostile", "Exposition cognitive aux incertitudes relationnelles", "Travail sur les schémas précoces inadaptés (méfiance, abus, défectuosité)", "Entraînement à la mentalisation"], "diagnosis": "Trouble de la Personnalité Paranoïaque", "behavioral": ["Thérapie de Soutien (alliance thérapeutique prioritaire)", "Thérapie Cognitive ciblant les interprétations hostiles", "Thérapie des Schémas (Young) — schéma méfiance/abus", "Développement progressif de l'Alliance Thérapeutique", "Travail de mentalisation et théorie de l'esprit"], "found_in_kb": true, "complementary": ["Neurofeedback", "Thérapie de groupe (en phase avancée, après consolidation de l'alliance)", "Mindfulness pour la réduction de la réactivité émotionnelle"], "pharmacological": ["Antipsychotiques à faibles doses si symptômes quasi-psychotiques", "Traitement ciblé des comorbidités (anxiété, dépression)"], "psychoeducation": ["Expliquer les schémas cognitifs sous-jacents (méfiance, interprétation malveillante)", "Travailler sur la reconnaissance de l'impact interpersonnel des comportements", "Aborder la fonction adaptative historique de la méfiance", "Psychoéducation sur les effets du schéma paranoïaque sur les relations"], "recommended_sessions": "Thérapie long terme — minimum 1 à 2 ans de suivi régulier"}	2026-06-17 17:55:32.494519
2	3	1	1	{"cognitive": ["Identification et gestion des déclencheurs (triggers)", "Restructuration des croyances addictives (anticipatoires, de soulagement, de permission)", "Résolution de problèmes et gestion du stress sans substances", "Développement d'un mode de vie équilibré"], "diagnosis": "Troubles liés à l'usage de substances", "behavioral": ["Entretien Motivationnel (EM)", "TCC centrée sur l'addiction (prévention de la rechute — Marlatt)", "Prévention de la Rechute structurée", "Thérapie Familiale et de Couple", "Groupes de soutien (AA, NA, SMART Recovery)"], "found_in_kb": true, "complementary": ["Neurofeedback", "Mindfulness-Based Relapse Prevention (MBRP)", "Activité physique et rééducation du bien-être", "Réinsertion sociale et professionnelle"], "pharmacological": ["Traitement de substitution (méthadone, buprénorphine) pour les opioïdes si indiqué", "Naltrexone, acamprosate pour l'alcool si indiqué", "Gestion médicalisée du sevrage"], "psychoeducation": ["Expliquer le circuit de la récompense et les mécanismes neurobiologiques de l'addiction", "Informer sur les stades du changement (Prochaska et DiClemente)", "Expliquer les symptômes de sevrage et leur gestion", "Travailler sur les croyances liées à la substance et à l'identité"], "recommended_sessions": "Suivi intensif : 2 ans minimum — phase initiale hebdomadaire, puis espacement progressif"}	2026-06-17 18:08:15.807241
3	3	1	1	{"cognitive": ["Identification et gestion des déclencheurs (triggers)", "Restructuration des croyances addictives (anticipatoires, de soulagement, de permission)", "Résolution de problèmes et gestion du stress sans substances", "Développement d'un mode de vie équilibré"], "diagnosis": "Troubles liés à l'usage de substances", "behavioral": ["Entretien Motivationnel (EM)", "TCC centrée sur l'addiction (prévention de la rechute — Marlatt)", "Prévention de la Rechute structurée", "Thérapie Familiale et de Couple", "Groupes de soutien (AA, NA, SMART Recovery)"], "found_in_kb": true, "complementary": ["Neurofeedback", "Mindfulness-Based Relapse Prevention (MBRP)", "Activité physique et rééducation du bien-être", "Réinsertion sociale et professionnelle"], "pharmacological": ["Traitement de substitution (méthadone, buprénorphine) pour les opioïdes si indiqué", "Naltrexone, acamprosate pour l'alcool si indiqué", "Gestion médicalisée du sevrage"], "psychoeducation": ["Expliquer le circuit de la récompense et les mécanismes neurobiologiques de l'addiction", "Informer sur les stades du changement (Prochaska et DiClemente)", "Expliquer les symptômes de sevrage et leur gestion", "Travailler sur les croyances liées à la substance et à l'identité"], "recommended_sessions": "Suivi intensif : 2 ans minimum — phase initiale hebdomadaire, puis espacement progressif"}	2026-06-17 18:08:54.514869
4	5	1	1	{"cognitive": ["Identification et restructuration des pensées automatiques négatives", "Travail sur la triade cognitive de Beck (soi, monde, avenir)", "Défusion cognitive (ACT)", "Journal de gratitude et bilan quotidien positif"], "diagnosis": "Trouble Dépressif Majeur", "behavioral": ["Thérapie Cognitive-Comportementale (TCC) — protocole dépression", "Thérapie d'Acceptation et d'Engagement (ACT)", "Thérapie Interpersonnelle (TIP)", "Activation comportementale et planification d'activités plaisantes", "Hygiène du sommeil et régulation du rythme circadien"], "found_in_kb": true, "complementary": ["Neurofeedback (régulation des ondes cérébrales)", "rTMS (Stimulation Magnétique Transcrânienne répétitive)", "ECT (Électroconvulsivothérapie) pour les formes résistantes", "Activité physique régulière (30 min/jour minimum)", "Techniques de pleine conscience (Mindfulness-Based Cognitive Therapy — MBCT)"], "pharmacological": ["Antidépresseurs (ISRS, IRSN) lorsqu'indiqués cliniquement — à prescrire par un médecin habilité", "Réévaluation régulière de la tolérance et de l'efficacité du traitement médicamenteux"], "psychoeducation": ["Expliquer la nature biopsychosociale de la dépression", "Informer sur le cycle pensées-émotions-comportements", "Aborder les idées reçues sur la dépression et la stigmatisation", "Expliquer l'importance de l'observance thérapeutique"], "recommended_sessions": "16 à 20 séances hebdomadaires (phase aiguë), puis suivi mensuel"}	2026-06-17 18:24:21.277079
5	5	1	1	{"cognitive": ["TCC adaptée au TDAH adulte (Safren)", "Entraînement à la mémoire de travail (Cogmed, RoboMemo)", "Planification et gestion du temps", "Stratégies d'auto-régulation et de monitoring", "Mindfulness pour le TDAH (Mindfulness-Based Cognitive Therapy for ADHD)"], "diagnosis": "Trouble Déficitaire de l'Attention avec ou sans Hyperactivité", "behavioral": ["Entraînement parental (Parent Training) — programmes Barkley ou Webster-Stratton", "Thérapie Comportementale pour le TDAH", "Entraînement aux Fonctions Exécutives", "Aménagements environnementaux et organisationnels", "Coaching TDAH"], "found_in_kb": true, "complementary": ["Neurofeedback (thêta/bêta — protocole TDAH)", "Activité physique régulière (effet bénéfique démontré sur l'attention)", "Aménagements scolaires et professionnels", "Applications de gestion du temps et d'organisation"], "pharmacological": ["Méthylphénidate (Ritaline, Concerta) lorsque cliniquement indiqué", "Atomoxétine (Strattera) en alternative", "Surveillance cardiovasculaire et du développement pondéral"], "psychoeducation": ["Expliquer le modèle neurobiologique du TDAH (dopamine, cortex préfrontal)", "Distinguer TDAH inattentif, hyperactif-impulsif et mixte", "Psychoéducation parentale et familiale", "Expliquer les forces associées au profil TDAH (créativité, hyperfocus)"], "recommended_sessions": "Traitement multimodal continu — réévaluation semestrielle"}	2026-06-17 18:24:27.737274
6	5	1	1	{"cognitive": ["Identification et restructuration des pensées automatiques négatives", "Travail sur la triade cognitive de Beck (soi, monde, avenir)", "Défusion cognitive (ACT)", "Journal de gratitude et bilan quotidien positif"], "diagnosis": "Trouble Dépressif Majeur", "behavioral": ["Thérapie Cognitive-Comportementale (TCC) — protocole dépression", "Thérapie d'Acceptation et d'Engagement (ACT)", "Thérapie Interpersonnelle (TIP)", "Activation comportementale et planification d'activités plaisantes", "Hygiène du sommeil et régulation du rythme circadien"], "found_in_kb": true, "complementary": ["Neurofeedback (régulation des ondes cérébrales)", "rTMS (Stimulation Magnétique Transcrânienne répétitive)", "ECT (Électroconvulsivothérapie) pour les formes résistantes", "Activité physique régulière (30 min/jour minimum)", "Techniques de pleine conscience (Mindfulness-Based Cognitive Therapy — MBCT)"], "pharmacological": ["Antidépresseurs (ISRS, IRSN) lorsqu'indiqués cliniquement — à prescrire par un médecin habilité", "Réévaluation régulière de la tolérance et de l'efficacité du traitement médicamenteux"], "psychoeducation": ["Expliquer la nature biopsychosociale de la dépression", "Informer sur le cycle pensées-émotions-comportements", "Aborder les idées reçues sur la dépression et la stigmatisation", "Expliquer l'importance de l'observance thérapeutique"], "recommended_sessions": "16 à 20 séances hebdomadaires (phase aiguë), puis suivi mensuel"}	2026-06-17 18:34:36.547948
\.


--
-- Data for Name: cliniquepartenaire; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cliniquepartenaire (idclinique, nom, adresse, telephone, email, validated, featured, logourl, ville, doctorcount, profile_picture, description, localisation, motdepasse) FROM stdin;
1	Nafsia	Setif, Alger	0773682988	nafsia@gmail.com	f	f	\N	\N	0	e4108abc-3b57-44b3-bb1a-eebeefdb0a46.jpg	\N	\N	8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
\.


--
-- Data for Name: conversationia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversationia (idconversation, idpatient, idia, datedebut, datefin, theme, nbmessages, satisfaction, historique) FROM stdin;
1	1	1	2026-06-17 17:01:34.331759	\N	stress	20	\N	C:\\Users\\Houda\\OneDrive\\Documents\\INSAT_V9\\AI_Services\\Chatbot\\data\\chat_histories\\patient_1\\conv_1.json
\.


--
-- Data for Name: disponibilite_date; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disponibilite_date (iddispo, idtherapeute, date_dispo, heure, reserve) FROM stdin;
1	1	2026-06-18	08:00	f
2	1	2026-06-19	08:30	f
\.


--
-- Data for Name: dme; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dme (id, patient_id, nom, prenom, email, telephone, sexe, adresse, date_naissance, contact_urgence_nom, contact_urgence_tel, numero_assurance, groupe_sanguin, profession, situation_familiale, medecin_traitant, allergies, medicaments_en_cours, antecedents_medicaux, antecedents_psychologiques, motif_consultation, compte_rendu, diagnostic, plan_traitement, updated_by, updated_at, created_at) FROM stdin;
1	1	Takouk	Nour Elhouda	houda@gmail.com	0557411954	Femme	Bordj Bou Arreridj	2003-10-28	\N	\N	\N	O+	\N	\N	\N	\N	None	\N	\N	\N	\N	\N	\N	doctor	2026-06-17 17:06:52.17269	2026-06-17 16:37:44.611656
\.


--
-- Data for Name: dme_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dme_documents (id, patient_id, filename, original_name, file_url, file_type, uploaded_by, uploaded_by_name, created_at) FROM stdin;
\.


--
-- Data for Name: doctor_patient_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.doctor_patient_assignments (id, doctor_id, patient_id, assigned_date, is_active, notes) FROM stdin;
1	1	1	2026-06-17 19:09:47.495607	t	Assignment created for diagnosis testing
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, user_role, type, title, body, is_read, related_id, related_type, created_at) FROM stdin;
1	1	doctor	system	Bienvenue sur INSAT 👋	Bonjour Dr. Haroune Kachkach, votre compte thérapeute a été créé avec toutes vos informations professionnelles. Votre profil sera vérifié par notre équipe avant activation complète.	t	\N	\N	2026-06-17 16:31:32.674982
2	1	patient	system	Bienvenue sur INSAT 👋	Bonjour Nour Elhouda, votre compte patient a été créé avec succès. Votre profil médical a été sauvegardé et vous pouvez le modifier à tout moment.	t	\N	\N	2026-06-17 16:36:48.435416
4	1	patient	appointment	Demande de rendez-vous envoyée	Votre demande auprès de Dr. Haroune Kachkach pour le 18/06/2026 à 08:00 est en attente de confirmation.	t	1	rendezvous	2026-06-17 17:05:51.480655
3	1	doctor	appointment	Nouvelle demande de rendez-vous	Nour Elhouda Takouk souhaite un rendez-vous le 18/06/2026 à 08:00.	t	1	rendezvous	2026-06-17 17:05:51.480655
6	1	doctor	appointment_confirmed	Rendez-vous confirmé	Votre RDV avec Nour Elhouda Takouk le 18/06/2026 à 08:00 a été confirmé.	t	1	rendezvous	2026-06-17 17:06:24.739387
5	1	patient	appointment_confirmed	Rendez-vous confirmé ✓	Votre RDV avec Dr. Haroune Kachkach le 18/06/2026 à 08:00 est confirmé.	t	1	rendezvous	2026-06-17 17:06:24.739387
7	1	doctor	ai_diagnosis	Diagnostic IA généré (automatique)	Le diagnostic automatique du patient #1 est disponible — Top 1 : Trouble de la Personnalité Paranoïaque (10%).	t	1	diagnostic	2026-06-17 17:07:23.225299
8	1	doctor	ai_diagnosis	Diagnostic confirmé et enregistré	Le diagnostic « Trouble de la Personnalité Paranoïaque » pour le patient #1 a été confirmé.	t	1	diagnostic	2026-06-17 17:12:20.649439
9	1	doctor	ai_treatment	Plan de traitement généré	Le plan de traitement pour « Trouble de la Personnalité Paranoïaque » (patient #1) est prêt.	t	1	diagnostic	2026-06-17 17:12:38.810198
10	1	doctor	ai_treatment	Plan de traitement généré	Le plan de traitement pour « Trouble de la Personnalité Paranoïaque » (patient #1) est prêt.	t	1	diagnostic	2026-06-17 17:27:32.05742
11	1	doctor	ai_treatment	Plan de traitement généré	Le plan de traitement pour « Troubles liés à l'usage de substances » (patient #1) est prêt.	t	1	diagnostic	2026-06-17 17:27:36.367476
12	1	doctor	ai_diagnosis	Diagnostic IA généré (automatique)	Le diagnostic automatique du patient #1 est disponible — Top 1 : Trouble de la Personnalité Paranoïaque (10%).	t	1	diagnostic	2026-06-17 17:55:08.56909
13	1	doctor	ai_diagnosis	Diagnostic confirmé et enregistré	Le diagnostic « Trouble de la Personnalité Paranoïaque » pour le patient #1 a été confirmé.	t	1	diagnostic	2026-06-17 17:55:21.049893
14	1	doctor	ai_treatment	Plan de traitement généré	Le plan de traitement pour « Trouble de la Personnalité Paranoïaque » (patient #1) est prêt.	t	1	diagnostic	2026-06-17 17:55:32.593937
15	1	doctor	ai_diagnosis	Diagnostic IA généré (manuel)	Le diagnostic IA du patient #1 est disponible — Top 1 : Troubles liés à l'usage de substances.	t	1	diagnostic	2026-06-17 18:07:37.66382
16	1	doctor	ai_diagnosis	Diagnostic confirmé et enregistré	Le diagnostic « Troubles liés à l'usage de substances » pour le patient #1 a été confirmé.	t	1	diagnostic	2026-06-17 18:08:00.64463
17	1	doctor	ai_treatment	Plan de traitement généré	Le plan de traitement pour « Troubles liés à l'usage de substances » (patient #1) est prêt.	t	1	diagnostic	2026-06-17 18:08:16.153427
18	1	doctor	ai_treatment	Plan de traitement généré	Le plan de traitement pour « Troubles liés à l'usage de substances » (patient #1) est prêt.	t	1	diagnostic	2026-06-17 18:08:54.820515
19	1	doctor	ai_diagnosis	Diagnostic IA généré (automatique)	Le diagnostic automatique du patient #1 est disponible — Top 1 : Trouble Dépressif Majeur (10%).	t	1	diagnostic	2026-06-17 18:12:50.515508
20	1	doctor	ai_diagnosis	Diagnostic confirmé et enregistré	Le diagnostic « Trouble Dépressif Majeur » pour le patient #1 a été confirmé.	t	1	diagnostic	2026-06-17 18:12:58.77525
21	1	doctor	ai_diagnosis	Diagnostic IA généré (automatique)	Le diagnostic automatique du patient #1 est disponible — Top 1 : Trouble Dépressif Majeur (10%).	t	1	diagnostic	2026-06-17 18:24:06.069292
22	1	doctor	ai_diagnosis	Diagnostic confirmé et enregistré	Le diagnostic « Trouble Dépressif Majeur » pour le patient #1 a été confirmé.	t	1	diagnostic	2026-06-17 18:24:10.349948
23	1	doctor	ai_treatment	Plan de traitement généré	Le plan de traitement pour « Trouble Dépressif Majeur » (patient #1) est prêt.	t	1	diagnostic	2026-06-17 18:24:21.557089
24	1	doctor	ai_treatment	Plan de traitement généré	Le plan de traitement pour « Trouble Déficitaire de l'Attention avec ou sans Hyperactivité » (patient #1) est prêt.	t	1	diagnostic	2026-06-17 18:24:27.953192
25	1	doctor	ai_treatment	Plan de traitement généré	Le plan de traitement pour « Trouble Dépressif Majeur » (patient #1) est prêt.	t	1	diagnostic	2026-06-17 18:34:36.767544
26	1	clinic	system	Bienvenue sur INSAT 👋	La clinique « Nafsia » a été enregistrée avec succès. Votre compte sera validé par notre équipe sous 48h.	t	\N	\N	2026-06-17 20:06:40.45111
29	1	doctor	appointment	Nouvelle demande de rendez-vous	Nour Elhouda Takouk souhaite un rendez-vous le 18/06/2026 à 08:00.	t	3	rendezvous	2026-06-17 20:14:01.534041
27	1	doctor	appointment	Nouvelle demande de rendez-vous	Nour Elhouda Takouk souhaite un rendez-vous le 19/06/2026 à 08:30.	t	2	rendezvous	2026-06-17 20:10:21.588189
32	1	doctor	appointment_cancelled	Rendez-vous annulé	Le RDV avec Nour Elhouda Takouk le 18/06/2026 à 08:00 a été annulé.	t	3	rendezvous	2026-06-17 20:14:34.687629
34	1	doctor	appointment_confirmed	Rendez-vous confirmé	Votre RDV avec Nour Elhouda Takouk le 19/06/2026 à 08:30 a été confirmé.	t	2	rendezvous	2026-06-17 20:14:36.186758
33	1	patient	appointment_confirmed	Rendez-vous confirmé ✓	Votre RDV avec Dr. Haroune Kachkach le 19/06/2026 à 08:30 est confirmé.	t	2	rendezvous	2026-06-17 20:14:36.186758
28	1	patient	appointment	Demande de rendez-vous envoyée	Votre demande auprès de Dr. Haroune Kachkach pour le 19/06/2026 à 08:30 est en attente de confirmation.	t	2	rendezvous	2026-06-17 20:10:21.588189
30	1	patient	appointment	Demande de rendez-vous envoyée	Votre demande auprès de Dr. Haroune Kachkach pour le 18/06/2026 à 08:00 est en attente de confirmation.	t	3	rendezvous	2026-06-17 20:14:01.534041
31	1	patient	appointment_cancelled	Rendez-vous annulé	Votre RDV avec Dr. Haroune Kachkach le 18/06/2026 à 08:00 a été annulé.	t	3	rendezvous	2026-06-17 20:14:34.687629
36	1	patient	appointment	Demande de rendez-vous envoyée	Votre demande auprès de Dr. Haroune Kachkach pour le 18/06/2026 à 08:00 est en attente de confirmation.	t	4	rendezvous	2026-06-17 22:00:56.58826
35	1	doctor	appointment	Nouvelle demande de rendez-vous	Nour Elhouda Takouk souhaite un rendez-vous le 18/06/2026 à 08:00.	t	4	rendezvous	2026-06-17 22:00:56.58826
37	1	patient	appointment_cancelled	Rendez-vous annulé	Votre RDV avec Dr. Haroune Kachkach le 18/06/2026 à 08:00 a été annulé.	t	4	rendezvous	2026-06-17 22:02:33.591734
38	1	doctor	appointment_cancelled	Rendez-vous annulé	Le RDV avec Nour Elhouda Takouk le 18/06/2026 à 08:00 a été annulé.	t	4	rendezvous	2026-06-17 22:02:33.591734
39	1	doctor	appointment	Nouvelle demande de rendez-vous	Nour Elhouda Takouk souhaite un rendez-vous le 18/06/2026 à 08:00.	t	5	rendezvous	2026-06-17 22:52:47.992941
42	1	doctor	appointment_confirmed	Rendez-vous confirmé	Votre RDV avec Nour Elhouda Takouk le 18/06/2026 à 08:00 a été confirmé.	t	5	rendezvous	2026-06-17 22:53:25.153819
43	1	doctor	appointment	Nouvelle demande de rendez-vous	Nour Elhouda Takouk souhaite un rendez-vous le 19/06/2026 à 08:30.	f	6	rendezvous	2026-06-17 23:04:18.927423
46	1	doctor	appointment_confirmed	Rendez-vous confirmé	Votre RDV avec Nour Elhouda Takouk le 19/06/2026 à 08:30 a été confirmé.	f	6	rendezvous	2026-06-17 23:04:50.120682
40	1	patient	appointment	Demande de rendez-vous envoyée	Votre demande auprès de Dr. Haroune Kachkach pour le 18/06/2026 à 08:00 est en attente de confirmation.	t	5	rendezvous	2026-06-17 22:52:47.992941
41	1	patient	appointment_confirmed	Rendez-vous confirmé ✓	Votre RDV avec Dr. Haroune Kachkach le 18/06/2026 à 08:00 est confirmé.	t	5	rendezvous	2026-06-17 22:53:25.153819
44	1	patient	appointment	Demande de rendez-vous envoyée	Votre demande auprès de Dr. Haroune Kachkach pour le 19/06/2026 à 08:30 est en attente de confirmation.	t	6	rendezvous	2026-06-17 23:04:18.927423
45	1	patient	appointment_confirmed	Rendez-vous confirmé ✓	Votre RDV avec Dr. Haroune Kachkach le 19/06/2026 à 08:30 est confirmé.	t	6	rendezvous	2026-06-17 23:04:50.120682
\.


--
-- Data for Name: paiement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paiement (idpaiement, montant, datepaiement, modepaiement, statut, checkoutid, idpatient, idsession, idrendezvous) FROM stdin;
\.


--
-- Data for Name: password_reset_otp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_otp (id, email, otp, expires_at, used) FROM stdin;
\.


--
-- Data for Name: patient; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient (idpatient, nom, prenom, email, motdepasse, dateinscription, datenaissance, numerosecuritesociale, niveauanxieteinitial, telephone, sexe, contact_urgence_nom, contact_urgence_tel, conditions_existantes, suivi_psy, troubles_sommeil, niveau_stress, profile_picture, ville, adresse) FROM stdin;
1	Takouk	Nour Elhouda	houda@gmail.com	8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92	2026-06-17	2003-10-28	\N	\N	0791359057	Femme			Aucune	f	f	5	35486729-2d7e-4409-adc0-a8a3b53f4a84.png	Bordj Bou Arréridj	\N
\.


--
-- Data for Name: psychotherapeute; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.psychotherapeute (idtherapeute, nom, prenom, email, motdepasse, dateinscription, specialite, numerolicence, tarifseance, notemoyenne, idclinique, validated, featured, whatsapp, ville, avatarurl, typeet, rejection_reason, sexe, telephone, diplome, annees_experience, certifications, langues, type_consultation, localisation_cabinet, biographie, profile_picture) FROM stdin;
1	Kachkach	Haroune	haroune@gmail.com	8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92	2026-06-17	psychiatre	12768	1500.00	\N	\N	f	f	\N	\N	\N	\N	\N	Homme	0773682988	Master 2 on psychologie	5		Arabe, Francais, Englais	Hybride	Clinique INSAT Setif	Psychiatre diplômé, spécialisé dans le diagnostic et le traitement des troubles mentaux, émotionnels et comportementaux chez l’adulte et l’adolescent. J’adopte une approche clinique basée sur l’écoute, l’évaluation rigoureuse et des thérapies adaptées à chaque patient afin d’améliorer leur bien-être psychologique et leur qualité de vie.	778f0512-9974-4f33-897a-f8d7d6de589a.jpg
\.


--
-- Data for Name: questionnaire_reponses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questionnaire_reponses (idreponse, idpatient, symptome, valeur, date_reponse) FROM stdin;
\.


--
-- Data for Name: rendezvous; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rendezvous (idrendezvous, dateheure, statut, idpatient, idtherapeute) FROM stdin;
1	2026-06-18 08:00:00	CONFIRME	1	1
3	2026-06-18 08:00:00	ANNULE	1	1
2	2026-06-19 08:30:00	CONFIRME	1	1
4	2026-06-18 08:00:00	ANNULE	1	1
5	2026-06-18 08:00:00	CONFIRME	1	1
6	2026-06-19 08:30:00	CONFIRME	1	1
\.


--
-- Data for Name: ressourcespedagogique; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ressourcespedagogique (idressource, titrerp, type, contenutexte, tags, dureelecture, niveaurecommandation, fichier_pdf) FROM stdin;
1	اضطراب الشخصية الحدية	PDF		\N	\N	\N	58119e289c394bcca25e8ac369d93e92.pdf
2	اضطراب ثنائي القطب	PDF		\N	\N	\N	f0d2b388d8074178a7fc26fb0172a015.pdf
3	القلق الوجودي جيمس بارك-1	PDF		\N	\N	\N	8ea3192d45fd4ea98eefbd4049493d8f.pdf
\.


--
-- Data for Name: sessiontherapie; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessiontherapie (idsession, dateheuredebut, dureeminutes, statut, type, lienvisio, compterendu, idpatient, idtherapeute, idrendezvous, idia) FROM stdin;
\.


--
-- Name: agentia_idia_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agentia_idia_seq', 3, true);


--
-- Name: ai_diagnoses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_diagnoses_id_seq', 5, true);


--
-- Name: ai_treatment_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_treatment_plans_id_seq', 6, true);


--
-- Name: cliniquepartenaire_idclinique_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cliniquepartenaire_idclinique_seq', 1, true);


--
-- Name: conversationia_idconversation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversationia_idconversation_seq', 1, true);


--
-- Name: disponibilite_date_iddispo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disponibilite_date_iddispo_seq', 2, true);


--
-- Name: dme_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dme_documents_id_seq', 1, false);


--
-- Name: dme_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dme_id_seq', 1, true);


--
-- Name: doctor_patient_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.doctor_patient_assignments_id_seq', 1, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 46, true);


--
-- Name: paiement_idpaiement_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paiement_idpaiement_seq', 1, false);


--
-- Name: password_reset_otp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_otp_id_seq', 1, false);


--
-- Name: patient_idpatient_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patient_idpatient_seq', 1, true);


--
-- Name: psychotherapeute_idtherapeute_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.psychotherapeute_idtherapeute_seq', 1, true);


--
-- Name: questionnaire_reponses_idreponse_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.questionnaire_reponses_idreponse_seq', 1, false);


--
-- Name: rendezvous_idrendezvous_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rendezvous_idrendezvous_seq', 6, true);


--
-- Name: ressourcespedagogique_idressource_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ressourcespedagogique_idressource_seq', 3, true);


--
-- Name: sessiontherapie_idsession_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessiontherapie_idsession_seq', 1, false);


--
-- Name: agentia agentia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agentia
    ADD CONSTRAINT agentia_pkey PRIMARY KEY (idia);


--
-- Name: ai_diagnoses ai_diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_diagnoses
    ADD CONSTRAINT ai_diagnoses_pkey PRIMARY KEY (id);


--
-- Name: ai_treatment_plans ai_treatment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_treatment_plans
    ADD CONSTRAINT ai_treatment_plans_pkey PRIMARY KEY (id);


--
-- Name: cliniquepartenaire cliniquepartenaire_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliniquepartenaire
    ADD CONSTRAINT cliniquepartenaire_email_key UNIQUE (email);


--
-- Name: cliniquepartenaire cliniquepartenaire_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliniquepartenaire
    ADD CONSTRAINT cliniquepartenaire_pkey PRIMARY KEY (idclinique);


--
-- Name: conversationia conversationia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversationia
    ADD CONSTRAINT conversationia_pkey PRIMARY KEY (idconversation);


--
-- Name: disponibilite_date disponibilite_date_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilite_date
    ADD CONSTRAINT disponibilite_date_pkey PRIMARY KEY (iddispo);


--
-- Name: dme_documents dme_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dme_documents
    ADD CONSTRAINT dme_documents_pkey PRIMARY KEY (id);


--
-- Name: dme dme_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dme
    ADD CONSTRAINT dme_pkey PRIMARY KEY (id);


--
-- Name: doctor_patient_assignments doctor_patient_assignments_doctor_id_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_patient_assignments
    ADD CONSTRAINT doctor_patient_assignments_doctor_id_patient_id_key UNIQUE (doctor_id, patient_id);


--
-- Name: doctor_patient_assignments doctor_patient_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_patient_assignments
    ADD CONSTRAINT doctor_patient_assignments_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: paiement paiement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiement
    ADD CONSTRAINT paiement_pkey PRIMARY KEY (idpaiement);


--
-- Name: password_reset_otp password_reset_otp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_otp
    ADD CONSTRAINT password_reset_otp_pkey PRIMARY KEY (id);


--
-- Name: patient patient_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient
    ADD CONSTRAINT patient_email_key UNIQUE (email);


--
-- Name: patient patient_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient
    ADD CONSTRAINT patient_pkey PRIMARY KEY (idpatient);


--
-- Name: psychotherapeute psychotherapeute_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.psychotherapeute
    ADD CONSTRAINT psychotherapeute_email_key UNIQUE (email);


--
-- Name: psychotherapeute psychotherapeute_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.psychotherapeute
    ADD CONSTRAINT psychotherapeute_pkey PRIMARY KEY (idtherapeute);


--
-- Name: questionnaire_reponses questionnaire_reponses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questionnaire_reponses
    ADD CONSTRAINT questionnaire_reponses_pkey PRIMARY KEY (idreponse);


--
-- Name: rendezvous rendezvous_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rendezvous
    ADD CONSTRAINT rendezvous_pkey PRIMARY KEY (idrendezvous);


--
-- Name: ressourcespedagogique ressourcespedagogique_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ressourcespedagogique
    ADD CONSTRAINT ressourcespedagogique_pkey PRIMARY KEY (idressource);


--
-- Name: sessiontherapie sessiontherapie_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessiontherapie
    ADD CONSTRAINT sessiontherapie_pkey PRIMARY KEY (idsession);


--
-- Name: idx_ai_diagnoses_confirmed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_diagnoses_confirmed ON public.ai_diagnoses USING btree (is_confirmed) WHERE (is_confirmed = true);


--
-- Name: idx_ai_diagnoses_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_diagnoses_created ON public.ai_diagnoses USING btree (created_at DESC);


--
-- Name: idx_ai_diagnoses_doctor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_diagnoses_doctor ON public.ai_diagnoses USING btree (doctor_id);


--
-- Name: idx_ai_diagnoses_mode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_diagnoses_mode ON public.ai_diagnoses USING btree (mode);


--
-- Name: idx_ai_diagnoses_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_diagnoses_patient ON public.ai_diagnoses USING btree (patient_id);


--
-- Name: idx_ai_diagnoses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_diagnoses_status ON public.ai_diagnoses USING btree (status);


--
-- Name: idx_ai_treatment_plans_diagnosis; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_treatment_plans_diagnosis ON public.ai_treatment_plans USING btree (diagnosis_id);


--
-- Name: idx_ai_treatment_plans_doctor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_treatment_plans_doctor ON public.ai_treatment_plans USING btree (doctor_id);


--
-- Name: idx_ai_treatment_plans_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_treatment_plans_patient ON public.ai_treatment_plans USING btree (patient_id);


--
-- Name: idx_dispo_date_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dispo_date_date ON public.disponibilite_date USING btree (date_dispo);


--
-- Name: idx_dispo_date_reserve; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dispo_date_reserve ON public.disponibilite_date USING btree (reserve);


--
-- Name: idx_dispo_date_therapeute; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dispo_date_therapeute ON public.disponibilite_date USING btree (idtherapeute);


--
-- Name: idx_dme_documents_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dme_documents_patient_id ON public.dme_documents USING btree (patient_id);


--
-- Name: idx_dme_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dme_patient_id ON public.dme USING btree (patient_id);


--
-- Name: idx_doctor_patient_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctor_patient_doctor_id ON public.doctor_patient_assignments USING btree (doctor_id);


--
-- Name: idx_doctor_patient_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctor_patient_patient_id ON public.doctor_patient_assignments USING btree (patient_id);


--
-- Name: idx_notif_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notif_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_notif_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_user ON public.notifications USING btree (user_id, user_role);


--
-- Name: idx_patient_adresse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_adresse ON public.patient USING btree (adresse);


--
-- Name: idx_patient_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_email ON public.patient USING btree (email);


--
-- Name: idx_patient_telephone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_telephone ON public.patient USING btree (telephone);


--
-- Name: idx_patient_ville; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_ville ON public.patient USING btree (ville);


--
-- Name: idx_psychotherapeute_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_psychotherapeute_email ON public.psychotherapeute USING btree (email);


--
-- Name: idx_psychotherapeute_specialite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_psychotherapeute_specialite ON public.psychotherapeute USING btree (specialite);


--
-- Name: idx_psychotherapeute_telephone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_psychotherapeute_telephone ON public.psychotherapeute USING btree (telephone);


--
-- Name: idx_questionnaire_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questionnaire_patient ON public.questionnaire_reponses USING btree (idpatient);


--
-- Name: idx_questionnaire_symptome; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questionnaire_symptome ON public.questionnaire_reponses USING btree (symptome);


--
-- Name: idx_rdv_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rdv_patient ON public.rendezvous USING btree (idpatient);


--
-- Name: idx_rdv_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rdv_statut ON public.rendezvous USING btree (statut);


--
-- Name: idx_rdv_therapeute; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rdv_therapeute ON public.rendezvous USING btree (idtherapeute);


--
-- Name: ai_diagnoses ai_diagnoses_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_diagnoses
    ADD CONSTRAINT ai_diagnoses_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.psychotherapeute(idtherapeute) ON DELETE CASCADE;


--
-- Name: ai_diagnoses ai_diagnoses_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_diagnoses
    ADD CONSTRAINT ai_diagnoses_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(idpatient) ON DELETE CASCADE;


--
-- Name: ai_treatment_plans ai_treatment_plans_diagnosis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_treatment_plans
    ADD CONSTRAINT ai_treatment_plans_diagnosis_id_fkey FOREIGN KEY (diagnosis_id) REFERENCES public.ai_diagnoses(id) ON DELETE CASCADE;


--
-- Name: ai_treatment_plans ai_treatment_plans_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_treatment_plans
    ADD CONSTRAINT ai_treatment_plans_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.psychotherapeute(idtherapeute) ON DELETE CASCADE;


--
-- Name: ai_treatment_plans ai_treatment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_treatment_plans
    ADD CONSTRAINT ai_treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(idpatient) ON DELETE CASCADE;


--
-- Name: conversationia conversationia_idia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversationia
    ADD CONSTRAINT conversationia_idia_fkey FOREIGN KEY (idia) REFERENCES public.agentia(idia) ON DELETE SET NULL;


--
-- Name: conversationia conversationia_idpatient_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversationia
    ADD CONSTRAINT conversationia_idpatient_fkey FOREIGN KEY (idpatient) REFERENCES public.patient(idpatient) ON DELETE RESTRICT;


--
-- Name: disponibilite_date disponibilite_date_idtherapeute_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilite_date
    ADD CONSTRAINT disponibilite_date_idtherapeute_fkey FOREIGN KEY (idtherapeute) REFERENCES public.psychotherapeute(idtherapeute) ON DELETE CASCADE;


--
-- Name: dme_documents dme_documents_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dme_documents
    ADD CONSTRAINT dme_documents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(idpatient) ON DELETE CASCADE;


--
-- Name: dme dme_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dme
    ADD CONSTRAINT dme_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(idpatient) ON DELETE CASCADE;


--
-- Name: paiement paiement_idpatient_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiement
    ADD CONSTRAINT paiement_idpatient_fkey FOREIGN KEY (idpatient) REFERENCES public.patient(idpatient) ON DELETE RESTRICT;


--
-- Name: paiement paiement_idrendezvous_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiement
    ADD CONSTRAINT paiement_idrendezvous_fkey FOREIGN KEY (idrendezvous) REFERENCES public.rendezvous(idrendezvous) ON DELETE SET NULL;


--
-- Name: paiement paiement_idsession_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiement
    ADD CONSTRAINT paiement_idsession_fkey FOREIGN KEY (idsession) REFERENCES public.sessiontherapie(idsession) ON DELETE SET NULL;


--
-- Name: psychotherapeute psychotherapeute_idclinique_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.psychotherapeute
    ADD CONSTRAINT psychotherapeute_idclinique_fkey FOREIGN KEY (idclinique) REFERENCES public.cliniquepartenaire(idclinique) ON DELETE SET NULL;


--
-- Name: questionnaire_reponses questionnaire_reponses_idpatient_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questionnaire_reponses
    ADD CONSTRAINT questionnaire_reponses_idpatient_fkey FOREIGN KEY (idpatient) REFERENCES public.patient(idpatient) ON DELETE CASCADE;


--
-- Name: rendezvous rendezvous_idpatient_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rendezvous
    ADD CONSTRAINT rendezvous_idpatient_fkey FOREIGN KEY (idpatient) REFERENCES public.patient(idpatient) ON DELETE CASCADE;


--
-- Name: rendezvous rendezvous_idtherapeute_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rendezvous
    ADD CONSTRAINT rendezvous_idtherapeute_fkey FOREIGN KEY (idtherapeute) REFERENCES public.psychotherapeute(idtherapeute) ON DELETE CASCADE;


--
-- Name: sessiontherapie sessiontherapie_idia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessiontherapie
    ADD CONSTRAINT sessiontherapie_idia_fkey FOREIGN KEY (idia) REFERENCES public.agentia(idia) ON DELETE SET NULL;


--
-- Name: sessiontherapie sessiontherapie_idpatient_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessiontherapie
    ADD CONSTRAINT sessiontherapie_idpatient_fkey FOREIGN KEY (idpatient) REFERENCES public.patient(idpatient) ON DELETE RESTRICT;


--
-- Name: sessiontherapie sessiontherapie_idrendezvous_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessiontherapie
    ADD CONSTRAINT sessiontherapie_idrendezvous_fkey FOREIGN KEY (idrendezvous) REFERENCES public.rendezvous(idrendezvous) ON DELETE SET NULL;


--
-- Name: sessiontherapie sessiontherapie_idtherapeute_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessiontherapie
    ADD CONSTRAINT sessiontherapie_idtherapeute_fkey FOREIGN KEY (idtherapeute) REFERENCES public.psychotherapeute(idtherapeute) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict gMflvDSbapqOmNJu0yx8Kn1KnelCqapck6R7wExihOuhg0hEDUJ4dmbHjBvdhzA

