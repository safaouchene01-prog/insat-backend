/**
 * AI Assistant — Therapist-facing page
 * Route: /ai  (accessible from the sidebar "Assistant IA" link)
 *
 * Tab structure (via ?tab= query param, matching DoctorDashboard pattern):
 *   (default / "diagnosis") → Diagnosis module (automatic + manual modes)
 *   "treatment"             → Treatment plan module
 */

import { useSearchParams } from 'react-router-dom';
import { Brain, Stethoscope } from 'lucide-react';
import DiagnosisModule from '../components/ai/DiagnosisModule';
import TreatmentModule from '../components/ai/TreatmentModule';

export default function AIAssistant() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'diagnosis';

  const setTab = (t: string) => setSearchParams({ tab: t });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto w-full">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-[var(--color-primary)] flex items-center justify-center">
            <Brain size={22} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-[Poppins] font-bold text-[22px] text-[#1C2E4A]">
              Assistant IA Thérapeute
            </h1>
            <p className="font-[Poppins] text-[13px] text-[#718096]">
              Aide à la décision clinique — le thérapeute conserve l'autorité finale
            </p>
          </div>
        </div>

        {/* Clinical disclaimer banner */}
        <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
          <p className="font-[Poppins] text-[12px] text-amber-700 leading-relaxed">
            <strong>Outil d'aide à la décision clinique uniquement.</strong> Les suggestions de
            diagnostic et de traitement générées par l'IA ne remplacent pas votre jugement
            clinique. Vous conservez l'autorité finale sur tout diagnostic et plan de traitement.
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6 bg-gray-50 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('diagnosis')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-[Poppins] font-medium text-[14px] transition-all ${
            tab === 'diagnosis'
              ? 'bg-white text-[var(--color-primary)] shadow-sm'
              : 'text-[#718096] hover:text-[#1C2E4A]'
          }`}
        >
          <Brain size={16} />
          Diagnostic IA
        </button>
        <button
          onClick={() => setTab('treatment')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-[Poppins] font-medium text-[14px] transition-all ${
            tab === 'treatment'
              ? 'bg-white text-[var(--color-primary)] shadow-sm'
              : 'text-[#718096] hover:text-[#1C2E4A]'
          }`}
        >
          <Stethoscope size={16} />
          Plan de traitement
        </button>
      </div>

      {/* Content */}
      {tab === 'diagnosis' && (
        <DiagnosisModule onDiagnosisConfirmed={() => setTab('treatment')} />
      )}
      {tab === 'treatment' && <TreatmentModule />}
    </div>
  );
}
