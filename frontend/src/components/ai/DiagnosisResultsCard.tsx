/**
 * DiagnosisResultsCard
 * =====================
 * Shows Top-3 CatBoost predictions with confidence bars.
 * Provides: Confirm Diagnosis / Modify / Generate Treatment Plan actions.
 */

import { CheckCircle, Edit3, Stethoscope, AlertTriangle } from 'lucide-react';

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

interface Props {
  result: DiagnosisResult;
  patientName?: string;
  confirmedDiagnosis: string | null;
  modifyMode: boolean;
  customDiagnosis: string;
  confirming: boolean;
  onConfirm: (diagnosis: string) => void;
  onModify: () => void;
  onCancelModify: () => void;
  onCustomDiagnosisChange: (v: string) => void;
  onModifyConfirm: () => void;
  onGenerateTreatment: () => void;
}

/** Colours for rank 1, 2, 3 */
const RANK_STYLES = [
  { bar: 'bg-[var(--color-primary)]', badge: 'bg-cyan-50 text-[var(--color-primary)] border border-cyan-200', label: 'Diagnostic principal' },
  { bar: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: '2e hypothèse' },
  { bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border border-amber-200', label: '3e hypothèse' },
];

export default function DiagnosisResultsCard({
  result,
  patientName,
  confirmedDiagnosis,
  modifyMode,
  customDiagnosis,
  confirming,
  onConfirm,
  onModify,
  onCancelModify,
  onCustomDiagnosisChange,
  onModifyConfirm,
  onGenerateTreatment,
}: Props) {
  const top = result.predictions[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-[Poppins] font-bold text-[16px] text-[#1C2E4A]">
            Résultats du diagnostic IA
          </p>
          {patientName && (
            <p className="font-[Poppins] text-[12px] text-[#718096] mt-0.5">
              Patient : <span className="font-semibold text-[#1C2E4A]">{patientName}</span>
              {' · '}
              <span className="capitalize">{result.mode === 'automatic' ? 'Mode automatique' : 'Mode manuel'}</span>
            </p>
          )}
        </div>
        <span className="px-3 py-1 rounded-full font-[Poppins] font-bold text-[12px] bg-[var(--color-primary)] text-white">
          {Math.round(top.confidence * 100)}%
        </span>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Top 3 predictions */}
        <div className="space-y-3">
          {result.predictions.map((p, i) => {
            const style = RANK_STYLES[i] ?? RANK_STYLES[2];
            const pct = Math.round(p.confidence * 100);
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-[Poppins] font-medium text-[11px] ${style.badge}`}>
                      {style.label}
                    </span>
                    <span className="font-[Poppins] font-semibold text-[14px] text-[#1C2E4A]">
                      {p.diagnosis}
                    </span>
                  </div>
                  <span className="font-[Poppins] font-bold text-[14px] text-[#1C2E4A]">
                    {pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Active symptoms */}
        {result.symptoms_used.length > 0 && (
          <div>
            <p className="font-[Poppins] font-medium text-[12px] text-[#718096] mb-2">
              Symptômes actifs détectés ({result.symptoms_used.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.symptoms_used.map((s, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 font-[Poppins] text-[11px] text-[#4A5568]"
                >
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Confirmed state ─────────────────────────────────────────────── */}
        {confirmedDiagnosis && !modifyMode && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-[Poppins] font-bold text-[14px] text-emerald-800">
                Diagnostic confirmé
              </p>
              <p className="font-[Poppins] text-[13px] text-emerald-700 mt-0.5">
                {confirmedDiagnosis}
              </p>
            </div>
          </div>
        )}

        {/* ── Modify mode: free-text override ─────────────────────────────── */}
        {modifyMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <p className="font-[Poppins] font-semibold text-[13px] text-amber-800 flex items-center gap-2">
              <AlertTriangle size={15} />
              Modifier le diagnostic
            </p>
            <input
              type="text"
              value={customDiagnosis}
              onChange={e => onCustomDiagnosisChange(e.target.value)}
              placeholder="Saisir le diagnostic confirmé…"
              className="w-full px-4 py-3 border border-amber-300 rounded-xl font-[Poppins] text-[13px] text-[#1C2E4A] focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={onModifyConfirm}
                disabled={confirming || !customDiagnosis.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-[Poppins] font-semibold text-[13px] hover:bg-amber-600 disabled:opacity-50 transition-all"
              >
                {confirming ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : <CheckCircle size={15} />}
                Confirmer ce diagnostic
              </button>
              <button
                onClick={onCancelModify}
                className="px-4 py-2 text-[#718096] bg-white border border-gray-200 rounded-xl font-[Poppins] font-medium text-[13px] hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* ── Action buttons ───────────────────────────────────────────────── */}
        {!modifyMode && (
          <div className="flex flex-wrap gap-3 pt-1">
            {!confirmedDiagnosis && (
              <>
                <button
                  onClick={() => onConfirm(top.diagnosis)}
                  disabled={confirming}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-[Poppins] font-semibold text-[14px] hover:bg-[var(--color-secondary)] disabled:opacity-50 transition-all"
                >
                  {confirming ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : <CheckCircle size={16} />}
                  Confirmer le diagnostic
                </button>
                <button
                  onClick={onModify}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-[#1C2E4A] rounded-xl font-[Poppins] font-semibold text-[14px] hover:bg-gray-50 transition-all"
                >
                  <Edit3 size={16} />
                  Modifier
                </button>
              </>
            )}

            {confirmedDiagnosis && (
              <>
                <button
                  onClick={onGenerateTreatment}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-[Poppins] font-semibold text-[14px] hover:bg-[var(--color-secondary)] transition-all"
                >
                  <Stethoscope size={16} />
                  Générer le plan de traitement
                </button>
                <button
                  onClick={onModify}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-[#718096] rounded-xl font-[Poppins] font-medium text-[13px] hover:bg-gray-50 transition-all"
                >
                  <Edit3 size={15} />
                  Modifier le diagnostic
                </button>
              </>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="font-[Poppins] text-[11px] text-amber-600 pt-1">
          ⚠️ Ces prédictions sont générées par un modèle CatBoost entraîné — elles constituent une
          aide à la décision uniquement et ne remplacent pas l'évaluation clinique du thérapeute.
        </p>
      </div>
    </div>
  );
}
