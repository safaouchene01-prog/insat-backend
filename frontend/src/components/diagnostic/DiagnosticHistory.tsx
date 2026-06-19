import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Brain, FileText, Clock, Eye } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Props {
  patientId: number | string;
}

interface DiagnosticHistoryItem {
  id: number;
  patient_id: number;
  predictions: Array<{ diagnosis: string; confidence: number }>;
  final_diagnosis: string;
  mode: 'automatic' | 'manual';
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  confirmed_at?: string;
  date_formatted: string;
}

interface TreatmentPlanHistoryItem {
  id: number;
  diagnosis_id: number;
  treatment_json: any;
  created_at: string;
  date_formatted: string;
  diagnosis_context: {
    final_diagnosis: string;
    diagnosis_mode: string;
  };
}

export default function DiagnosticHistory({ patientId }: Props) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticHistoryItem[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlanHistoryItem[]>([]);
  const [selectedView, setSelectedView] = useState<'diagnostics' | 'treatments'>('diagnostics');

  const formatConfidence = (confidence: any): string => {
    if (confidence === null || confidence === undefined) return '0';
    if (typeof confidence === 'string') {
      const num = parseFloat(confidence);
      return isNaN(num) ? '0' : Math.round(num * (num <= 1 ? 100 : 1)).toString();
    }
    if (typeof confidence === 'number') {
      if (isNaN(confidence)) return '0';
      return Math.round(confidence * (confidence <= 1 ? 100 : 1)).toString();
    }
    return '0';
  };

  const loadHistory = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load all diagnostic history
      const diagnosticsRes = await fetch(
        `${API_URL}/ai-history/diagnostic/patient/${patientId}?doctor_id=${user.id}&limit=50`
      );
      
      if (diagnosticsRes.ok) {
        const diagnosticsData = await diagnosticsRes.json();
        setDiagnostics(Array.isArray(diagnosticsData) ? diagnosticsData : []);
      }

      // Load all treatment plan history
      const treatmentRes = await fetch(
        `${API_URL}/ai-history/treatment-plans/patient/${patientId}?doctor_id=${user.id}&limit=50`
      );
      
      if (treatmentRes.ok) {
        const treatmentData = await treatmentRes.json();
        setTreatmentPlans(Array.isArray(treatmentData) ? treatmentData : []);
      }

    } catch (error) {
      console.error('Error loading diagnostic history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      loadHistory();
    }
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <button
        onClick={toggle}
        className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:underline"
      >
        <Calendar size={16} />
        Historique Complet IA
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          {/* View Selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedView('diagnostics')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedView === 'diagnostics' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Brain size={14} className="inline mr-1" />
              Diagnostics ({diagnostics.length})
            </button>
            <button
              onClick={() => setSelectedView('treatments')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedView === 'treatments' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText size={14} className="inline mr-1" />
              Plans Thérapeutiques ({treatmentPlans.length})
            </button>
          </div>
          {loading && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin mr-2" />
              Chargement de l'historique...
            </div>
          )}

          {!loading && selectedView === 'diagnostics' && (
            <div className="space-y-3">
              {diagnostics.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun diagnostic dans l'historique</p>
              ) : (
                diagnostics.map((diagnostic, index) => (
                  <div key={diagnostic.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                          #{diagnostics.length - index}
                        </span>
                        <span className="text-sm text-gray-600">{diagnostic.date_formatted}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          diagnostic.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          diagnostic.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {diagnostic.status === 'confirmed' ? 'Confirmé' :
                           diagnostic.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Mode {diagnostic.mode === 'automatic' ? 'Auto' : 'Manuel'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {diagnostic.final_diagnosis && (
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                          <p className="text-xs text-green-600 font-medium">Diagnostic Final:</p>
                          <p className="text-sm text-green-800">{diagnostic.final_diagnosis}</p>
                          {diagnostic.confirmed_at && (
                            <p className="text-xs text-green-600 mt-1">
                              Confirmé le {new Date(diagnostic.confirmed_at).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      )}

                      {diagnostic.predictions.length > 0 && (
                        <div className="grid grid-cols-1 gap-1">
                          <p className="text-xs text-gray-600 font-medium">Prédictions IA:</p>
                          {diagnostic.predictions.slice(0, 3).map((pred, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className={idx === 0 ? 'font-medium text-gray-800' : 'text-gray-600'}>
                                {idx + 1}. {pred.diagnosis}
                              </span>
                              <span className="text-gray-500 font-medium">
                                {formatConfidence(pred.confidence)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Compare button for multiple diagnostics */}
                    {index < diagnostics.length - 1 && (
                      <button className="mt-3 text-xs text-purple-600 hover:underline flex items-center gap-1">
                        <Eye size={12} />
                        Comparer avec précédent
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && selectedView === 'treatments' && (
            <div className="space-y-3">
              {treatmentPlans.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun plan thérapeutique dans l'historique</p>
              ) : (
                treatmentPlans.map((plan, index) => (
                  <div key={plan.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
                          Plan #{treatmentPlans.length - index}
                        </span>
                        <span className="text-sm text-gray-600">{plan.date_formatted}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium">Pour diagnostic:</p>
                        <p className="text-sm text-blue-800">{plan.diagnosis_context.final_diagnosis}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Mode: {plan.diagnosis_context.diagnosis_mode}
                        </p>
                      </div>

                      {plan.treatment_json && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {plan.treatment_json.cognitive_techniques && (
                            <div className="p-2 bg-green-50 rounded">
                              <p className="font-medium text-green-800">Techniques Cognitives:</p>
                              <p className="text-green-700">{plan.treatment_json.cognitive_techniques.length} techniques</p>
                            </div>
                          )}
                          {plan.treatment_json.behavioral_techniques && (
                            <div className="p-2 bg-purple-50 rounded">
                              <p className="font-medium text-purple-800">Techniques Comportementales:</p>
                              <p className="text-purple-700">{plan.treatment_json.behavioral_techniques.length} techniques</p>
                            </div>
                          )}
                          {plan.treatment_json.recommended_sessions && (
                            <div className="p-2 bg-orange-50 rounded md:col-span-2">
                              <p className="font-medium text-orange-800">Sessions:</p>
                              <p className="text-orange-700">{plan.treatment_json.recommended_sessions}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button className="mt-3 text-xs text-emerald-600 hover:underline flex items-center gap-1">
                      <Eye size={12} />
                      Voir plan complet
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && (diagnostics.length > 0 || treatmentPlans.length > 0) && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={12} />
                Historique trié par date (plus récent en premier)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}