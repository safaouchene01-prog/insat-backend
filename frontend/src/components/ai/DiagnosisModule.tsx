/**
 * DiagnosisModule
 * ================
 * Orchestrates:
 *   1. Mode selector (Automatic / Manual)
 *   2. Patient selector
 *   3. Automatic diagnosis call
 *   4. Manual diagnosis (SymptomChecklistForm)
 *   5. Results display (DiagnosisResultsCard)
 *   6. Confirm / Modify flow
 */

import { useState, useEffect } from 'react';
import { Zap, ClipboardList } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import DiagnosisResultsCard from './DiagnosisResultsCard';
import SymptomChecklistForm from './SymptomChecklistForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface DiagnosisPrediction {
  diagnosis: string;
  confidence: number;
}

interface DiagnosisResult {
  predictions: DiagnosisPrediction[];
  symptoms_used: string[];
  mode: string;
  id_patient: number;
  id_therapeute: number;
}

interface Patient {
  idpatient: number;
  nom: string;
  prenom: string;
}

interface Props {
  /** Called after the therapist confirms a diagnosis — lets the parent switch to treatment tab */
  onDiagnosisConfirmed: () => void;
}

export default function DiagnosisModule({ onDiagnosisConfirmed }: Props) {
  const { user } = useAuthStore();
  const therapeuteId = user?.id ? Number(user.id) : 0;

  // ── State ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [confirmedDiagnosis, setConfirmedDiagnosis] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [modifyMode, setModifyMode] = useState(false);
  const [customDiagnosis, setCustomDiagnosis] = useState('');
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);

  // ── Load patients ──────────────────────────────────────────────────────────
  useEffect(() => {
    setPatientsLoading(true);
    fetch(`${API_URL}/patients/`)
      .then(r => r.json())
      .then(data => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, []);

  // ── Reset result when mode or patient changes ──────────────────────────────
  useEffect(() => {
    setResult(null);
    setConfirmedDiagnosis(null);
    setModifyMode(false);
    setNoDataMessage(null);   
  }, [mode, selectedPatientId]);

  // ── Automatic diagnosis ────────────────────────────────────────────────────
  // ── Automatic diagnosis ────────────────────────────────────────────────────
  const runAutoDiagnosis = async () => {
    if (!selectedPatientId) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }
    setLoading(true);
    setResult(null);
    setConfirmedDiagnosis(null);
    setNoDataMessage(null);
    try {
      const res = await fetch(`${API_URL}/assistant-ai/diagnosis/automatic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_patient: selectedPatientId,
          id_therapeute: therapeuteId,
        }),
      });

      if (res.ok) {
        const data: DiagnosisResult = await res.json();
        setResult(data);
        return;
      }

      // Parse error body
      const err = await res.json().catch(() => ({}));
      const detail = err?.detail;

      // Case: no symptom data → show guidance card (not a toast error)
      if (
        res.status === 422 &&
        detail &&
        typeof detail === 'object' &&
        detail.reason === 'no_symptom_data'
      ) {
        setNoDataMessage(detail.message);
        return;
      }

      // Any other error
      const msg =
        typeof detail === 'string'
          ? detail
          : detail?.message || `Erreur ${res.status}`;
      throw new Error(msg);
    } catch (e: any) {
      toast.error(`Erreur diagnostic automatique : ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Called by SymptomChecklistForm after successful manual prediction
  const handleManualResult = (data: DiagnosisResult) => {
    setResult(data);
    setConfirmedDiagnosis(null);
    setModifyMode(false);
  };

  // ── Confirm diagnosis ──────────────────────────────────────────────────────
  const handleConfirm = async (diagnosis: string) => {
    if (!selectedPatientId) return;
    setConfirming(true);
    try {
      const res = await fetch(`${API_URL}/assistant-ai/diagnosis/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_patient: selectedPatientId,
          id_therapeute: therapeuteId,
          confirmed_diagnosis: diagnosis,
          ai_top1: result?.predictions[0]?.diagnosis ?? null,
          ai_confidence: result?.predictions[0]?.confidence ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur ${res.status}`);
      }
      setConfirmedDiagnosis(diagnosis);
      setModifyMode(false);
      toast.success('Diagnostic confirmé et enregistré');
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const handleModifyConfirm = async () => {
    if (!customDiagnosis.trim()) {
      toast.error('Veuillez saisir un diagnostic');
      return;
    }
    await handleConfirm(customDiagnosis.trim());
    setCustomDiagnosis('');
  };

  const selectedPatient = patients.find(p => p.idpatient === selectedPatientId);

  return (
    <div className="space-y-6">

      {/* ── Mode selector ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="font-[Poppins] font-semibold text-[14px] text-[#1C2E4A] mb-4">
          Mode de diagnostic
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Automatic */}
          <button
            onClick={() => setMode('automatic')}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              mode === 'automatic'
                ? 'border-[var(--color-primary)] bg-cyan-50'
                : 'border-gray-100 hover:border-gray-200 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              mode === 'automatic' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <Zap size={18} />
            </div>
            <div>
              <p className={`font-[Poppins] font-semibold text-[14px] ${
                mode === 'automatic' ? 'text-[var(--color-primary)]' : 'text-[#1C2E4A]'
              }`}>
                Diagnostic Automatique
              </p>
              <p className="font-[Poppins] text-[12px] text-[#718096] mt-0.5 leading-relaxed">
                Utilise le questionnaire patient et l'historique chatbot
              </p>
            </div>
          </button>

          {/* Manual */}
          <button
            onClick={() => setMode('manual')}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              mode === 'manual'
                ? 'border-[var(--color-primary)] bg-cyan-50'
                : 'border-gray-100 hover:border-gray-200 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              mode === 'manual' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <ClipboardList size={18} />
            </div>
            <div>
              <p className={`font-[Poppins] font-semibold text-[14px] ${
                mode === 'manual' ? 'text-[var(--color-primary)]' : 'text-[#1C2E4A]'
              }`}>
                Diagnostic Manuel
              </p>
              <p className="font-[Poppins] text-[12px] text-[#718096] mt-0.5 leading-relaxed">
                Formulaire de 84 symptômes binaires rempli par le thérapeute
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Patient selector ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block font-[Poppins] font-semibold text-[14px] text-[#1C2E4A] mb-3">
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

      {/* ── Automatic mode: launch button ──────────────────────────────────── */}
      {mode === 'automatic' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="font-[Poppins] text-[13px] text-[#718096] mb-4 leading-relaxed">
            Le système va récupérer automatiquement les réponses au questionnaire et
            l'historique chatbot du patient pour extraire les symptômes et lancer le modèle CatBoost.
          </p>
          <button
            onClick={runAutoDiagnosis}
            disabled={loading || !selectedPatientId}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-[Poppins] font-semibold text-[14px] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyse en cours…
              </>
            ) : (
              <>
                <Zap size={16} />
                Lancer le diagnostic automatique
              </>
            )}
          </button>

          {/* No-data guidance: redirect to manual mode */}
          {noDataMessage && (
            <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="font-[Poppins] font-semibold text-[13px] text-amber-700 mb-1">
                  Données insuffisantes
                </p>
                <p className="font-[Poppins] text-[12px] text-amber-700 leading-relaxed mb-3">
                  {noDataMessage}
                </p>
                <button
                  onClick={() => setMode('manual')}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-[Poppins] font-semibold text-[13px] hover:bg-amber-600 transition-all"
                >
                  <ClipboardList size={15} />
                  Passer en saisie manuelle
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Manual mode: symptom checklist ─────────────────────────────────── */}
      {mode === 'manual' && selectedPatientId !== '' && (
        <SymptomChecklistForm
          patientId={Number(selectedPatientId)}
          therapeuteId={therapeuteId}
          onResult={handleManualResult}
        />
      )}

      {mode === 'manual' && selectedPatientId === '' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-[#718096] font-[Poppins] text-[13px]">
          Sélectionnez d'abord un patient pour accéder au formulaire.
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result && (
        <DiagnosisResultsCard
          result={result}
          patientName={selectedPatient ? `${selectedPatient.prenom} ${selectedPatient.nom}` : undefined}
          confirmedDiagnosis={confirmedDiagnosis}
          modifyMode={modifyMode}
          customDiagnosis={customDiagnosis}
          confirming={confirming}
          onConfirm={handleConfirm}
          onModify={() => { setModifyMode(true); setConfirmedDiagnosis(null); }}
          onCancelModify={() => setModifyMode(false)}
          onCustomDiagnosisChange={setCustomDiagnosis}
          onModifyConfirm={handleModifyConfirm}
          onGenerateTreatment={onDiagnosisConfirmed}
        />
      )}
    </div>
  );
}
