/**
 * TreatmentModule
 * ================
 * Generates a structured treatment plan for a confirmed diagnosis.
 * Calls POST /assistant-ai/treatment-plan.
 *
 * Behaviour:
 *  - Shows a patient + diagnosis selector.
 *  - If a confirmed diagnosis exists in the DB (for this patient/therapist),
 *    it is used automatically when the therapist submits.
 *  - The therapist can also override with any disorder from the dropdown.
 *  - Displays the full plan in categorized cards.
 */

import { useState, useEffect } from 'react';
import { Stethoscope, BookOpen, Brain, Pill, Sparkles, Users, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import TreatmentPlanCard from './TreatmentPlanCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface TreatmentPlan {
  id_patient: number;
  id_therapeute: number;
  diagnosis: string;
  found_in_kb: boolean;
  psychoeducation: string[];
  behavioral: string[];
  cognitive: string[];
  pharmacological: string[];
  complementary: string[];
  recommended_sessions: string;
  disclaimer: string;
}

interface Patient {
  idpatient: number;
  nom: string;
  prenom: string;
}

const SUPPORTED_DISORDERS = [
  'Trouble Dépressif Majeur',
  'Trouble Anxieux Généralisé',
  'Trouble Panique',
  'Trouble Obsessionnel-Compulsif',
  'Trouble de Stress Post-Traumatique',
  'Trouble Bipolaire',
  'Schizophrénie',
  'Trouble de la Personnalité Paranoïaque',
  'Trouble de la Personnalité Borderline',
  'Trouble du Spectre de l\'Autisme',
  'Trouble Déficitaire de l\'Attention avec ou sans Hyperactivité',
  'Troubles liés à l\'usage de substances',
];

export default function TreatmentModule() {
  const { user } = useAuthStore();
  const therapeuteId = user?.id ? Number(user.id) : 0;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [patientsLoading, setPatientsLoading] = useState(true);

  useEffect(() => {
    setPatientsLoading(true);
    fetch(`${API_URL}/patients/`)
      .then(r => r.json())
      .then(data => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, []);

  // Reset plan when patient changes
  useEffect(() => { setPlan(null); }, [selectedPatientId]);

  const handleGenerate = async () => {
    if (!selectedPatientId) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }
    setLoading(true);
    setPlan(null);
    try {
      const body: Record<string, any> = {
        id_patient: selectedPatientId,
        id_therapeute: therapeuteId,
      };
      if (diagnosis) body.diagnosis = diagnosis;

      const res = await fetch(`${API_URL}/assistant-ai/treatment-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur ${res.status}`);
      }
      const data: TreatmentPlan = await res.json();
      setPlan(data);
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedPatient = patients.find(p => p.idpatient === selectedPatientId);

  return (
    <div className="space-y-6">

      {/* Configuration panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="font-[Poppins] font-semibold text-[15px] text-[#1C2E4A]">
          Générer un plan de traitement
        </p>

        {/* Patient */}
        <div>
          <label className="block font-[Poppins] font-medium text-[13px] text-[#4A5568] mb-2">
            Patient
          </label>
          {patientsLoading ? (
            <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl font-[Poppins] text-[14px] text-[#1C2E4A] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none bg-white"
            >
              <option value="">— Sélectionner un patient —</option>
              {patients.map(p => (
                <option key={p.idpatient} value={p.idpatient}>
                  {p.prenom} {p.nom}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Diagnosis override */}
        <div>
          <label className="block font-[Poppins] font-medium text-[13px] text-[#4A5568] mb-1">
            Diagnostic
          </label>
          <p className="font-[Poppins] text-[12px] text-[#718096] mb-2">
            Laissez vide pour utiliser automatiquement le dernier diagnostic confirmé du patient.
          </p>
          <select
            value={diagnosis}
            onChange={e => setDiagnosis(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl font-[Poppins] text-[14px] text-[#1C2E4A] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none bg-white"
          >
            <option value="">— Utiliser le diagnostic confirmé en base —</option>
            {SUPPORTED_DISORDERS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !selectedPatientId}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-[Poppins] font-semibold text-[14px] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Stethoscope size={16} />
              Générer le plan de traitement
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {plan && (
        <div className="space-y-4">

          {/* Plan header */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-[Poppins] font-bold text-[18px] text-[#1C2E4A]">
                  {plan.diagnosis}
                </p>
                {selectedPatient && (
                  <p className="font-[Poppins] text-[13px] text-[#718096] mt-1">
                    Patient : <span className="font-semibold text-[#1C2E4A]">
                      {selectedPatient.prenom} {selectedPatient.nom}
                    </span>
                  </p>
                )}
                <p className="font-[Poppins] text-[13px] text-[#718096] mt-0.5">
                  Sessions recommandées :{' '}
                  <span className="font-semibold text-[var(--color-primary)]">
                    {plan.recommended_sessions}
                  </span>
                </p>
              </div>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 px-3 py-2 text-[#718096] hover:text-[#1C2E4A] bg-gray-50 hover:bg-gray-100 rounded-xl font-[Poppins] text-[12px] transition-all flex-shrink-0"
              >
                <RefreshCw size={13} />
                Recharger
              </button>
            </div>

            {!plan.found_in_kb && (
              <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="text-amber-500">⚠️</span>
                <p className="font-[Poppins] text-[12px] text-amber-700">
                  Ce diagnostic n'a pas été trouvé dans la base de connaissances cliniques.
                </p>
              </div>
            )}
          </div>

          {/* Treatment category cards */}
          <TreatmentPlanCard
            icon={<Users size={18} />}
            title="Psychoéducation"
            color="cyan"
            items={plan.psychoeducation}
          />
          <TreatmentPlanCard
            icon={<Brain size={18} />}
            title="Approches comportementales"
            color="blue"
            items={plan.behavioral}
          />
          <TreatmentPlanCard
            icon={<BookOpen size={18} />}
            title="Techniques cognitives"
            color="purple"
            items={plan.cognitive}
          />
          <TreatmentPlanCard
            icon={<Pill size={18} />}
            title="Pharmacologique (informatif)"
            color="amber"
            items={plan.pharmacological}
            disclaimer="Ces informations sont fournies à titre informatif uniquement. Toute prescription médicamenteuse relève exclusivement de la compétence d'un médecin habilité."
          />
          <TreatmentPlanCard
            icon={<Sparkles size={18} />}
            title="Approches complémentaires"
            color="green"
            items={plan.complementary}
          />

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="font-[Poppins] text-[12px] text-amber-700 leading-relaxed">
              ⚠️ <strong>Avertissement clinique :</strong> {plan.disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
