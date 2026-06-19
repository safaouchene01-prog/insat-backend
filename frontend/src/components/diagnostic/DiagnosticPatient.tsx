import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Calendar, Eye, Play, AlertTriangle, CheckCircle, Clock, Pill, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Props {
  patientId: number | string;
}

interface AIDiagnostic {
  id: number;
  patient_id: number;
  doctor_id: number;
  predictions: Array<{ diagnosis: string; confidence: number }>;
  final_diagnosis: string;
  confidence_scores: Record<string, any>;
  mode: 'automatic' | 'manual';
  symptoms_used: string[];
  created_at: string;
  confirmed_at?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  date_formatted: string;
  top_prediction?: { diagnosis: string; confidence: number };
  has_results: boolean;
}

interface AITreatmentPlan {
  id: number;
  diagnosis_id: number;
  patient_id: number;
  treatment_json: {
    diagnosis: string;
    psychoeducation?: string | string[];
    psychoeducational?: string | string[];
    cognitive_techniques?: string[];
    cognitive?: string[];
    behavioral_techniques?: string[];
    behavioral?: string[];
    pharmacological_notes?: string | string[];
    pharmacological?: string | string[];
    complementary_techniques?: string[];
    complementary?: string[];
    recommended_sessions?: string;
    custom_notes?: string;
    found_in_kb?: boolean;
    [key: string]: any; // Allow additional properties
  };
  created_at: string;
  date_formatted: string;
  diagnosis_context: {
    final_diagnosis: string;
    diagnosis_mode: string;
  };
}

export default function DiagnosticPatient({ patientId }: Props) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AIDiagnostic[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<AITreatmentPlan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<AIDiagnostic | null>(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState<AITreatmentPlan | null>(null);
  const [showReExecuteModal, setShowReExecuteModal] = useState(false);

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

  const toggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !loaded) {
      await loadData();
    }
  };

  const loadData = async () => {
    if (!user?.id) {
      console.error('User not authenticated');
      toast.error('Utilisateur non authentifié');
      return;
    }

    setLoading(true);
    try {
      // Load AI diagnostics - get only the most recent one
      const diagnosticsRes = await fetch(
        `${API_URL}/ai-history/diagnostic/patient/${patientId}?doctor_id=${user.id}&limit=1`
      );
      
      if (diagnosticsRes.ok) {
        const diagnosticsData = await diagnosticsRes.json();
        console.log('Diagnostics data:', diagnosticsData); // Debug log
        setDiagnostics(Array.isArray(diagnosticsData) ? diagnosticsData : []);
      } else if (diagnosticsRes.status === 403) {
        console.error('Access denied to this patient');
        toast.error('Accès refusé pour ce patient');
        setDiagnostics([]);
      } else if (diagnosticsRes.status === 404) {
        // No diagnostics found - this is normal
        console.log('No diagnostics found (404)');
        setDiagnostics([]);
      } else {
        console.error('Diagnostics error:', diagnosticsRes.status, await diagnosticsRes.text().catch(() => 'Unable to read response'));
        setDiagnostics([]);
      }

      // Load treatment plans - get only the most recent one
      const treatmentRes = await fetch(
        `${API_URL}/ai-history/treatment-plans/patient/${patientId}?doctor_id=${user.id}&limit=1`
      );
      
      if (treatmentRes.ok) {
        const treatmentData = await treatmentRes.json();
        console.log('Treatment plans data:', treatmentData); // Debug log
        setTreatmentPlans(Array.isArray(treatmentData) ? treatmentData : []);
      } else if (treatmentRes.status !== 404) {
        // Only show error if it's not "not found" (404 is normal)
        console.error('Treatment plans error:', treatmentRes.status, await treatmentRes.text());
        setTreatmentPlans([]);
      } else {
        console.log('No treatment plans found (404)');
        setTreatmentPlans([]);
      }

    } catch (error) {
      console.error('Error loading AI diagnostic data:', error);
      toast.error('Erreur de connexion lors du chargement des données IA');
      setDiagnostics([]);
      setTreatmentPlans([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const openDiagnosticModal = (diagnostic: AIDiagnostic) => {
    setSelectedDiagnostic(diagnostic);
    setShowModal(true);
  };
  const openTreatmentModal = (treatmentPlan: AITreatmentPlan) => {
    console.log('Opening treatment plan modal:', treatmentPlan); // Debug log
    if (!treatmentPlan || !treatmentPlan.treatment_json) {
      toast.error('Données du plan thérapeutique manquantes');
      return;
    }
    
    // Validate essential data
    const plan = treatmentPlan.treatment_json;
    if (!plan.diagnosis && !plan.psychoeducation && !plan.cognitive && !plan.behavioral) {
      toast.error('Plan thérapeutique incomplet - données manquantes');
      return;
    }
    
    setSelectedTreatmentPlan(treatmentPlan);
    setShowTreatmentModal(true);
  };

  const handleReExecute = () => {
    setShowReExecuteModal(true);
  };

  const confirmReExecute = () => {
    setShowReExecuteModal(false);
    // Navigate to AI Assistant for new diagnosis
    toast.success('Redirection vers l\'Assistant IA...');
    window.location.href = '/ai';
  };

  // Generate treatment plan function (available for future use if needed)
  // Commented to avoid unused warning - can be activated when treatment plan generation is needed
  /*
  const handleGenerateTreatmentPlan = async (diagnosticId: number) => {
    if (!user?.id) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    try {
      toast.loading('Génération du plan thérapeutique...');
      const response = await fetch(
        `${API_URL}/ai-history/treatment-plan/generate?diagnosis_id=${diagnosticId}&doctor_id=${user.id}`,
        { method: 'POST' }
      );

      if (response.ok) {
        await response.json();
        // Reload treatment plans
        await loadData();
        toast.success('Plan thérapeutique généré avec succès !');
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Erreur lors de la génération du plan thérapeutique');
      }
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      toast.error('Erreur de connexion lors de la génération du plan thérapeutique');
    }
  };
  */

  return (
    <>
      <div className="mt-3 border-t border-gray-100 pt-3">
        <button
          onClick={toggle}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          <Brain size={16} />
          Diagnostic IA
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {open && (
          <div className="mt-3 space-y-3">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                Chargement des données IA...
              </div>
            )}
            {!loading && diagnostics.length === 0 && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                <Brain className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">
                  Le diagnostic assisté par intelligence artificielle n'a pas encore été effectué pour ce patient.
                </p>
                <button 
                  onClick={() => {
                    toast.success('Redirection vers l\'Assistant IA...');
                    window.location.href = '/ai';
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-secondary)] transition-colors"
                >
                  <Play size={14} />
                  Générer Diagnostic IA
                </button>
              </div>
            )}

            {!loading && diagnostics.length > 0 && (
              <>
                {/* Show only the latest diagnostic - no map, just first element */}
                {diagnostics.length > 0 && (() => {
                  const diagnostic = diagnostics[0]; // Most recent diagnostic
                  return (
                    <div key={diagnostic.id} className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
                      {/* Header with status and date */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          {diagnostic.status === 'confirmed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                          {diagnostic.status === 'pending' && <Clock className="w-4 h-4 text-amber-600" />}
                          {diagnostic.status === 'rejected' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          <span className="text-xs text-gray-500">
                            {diagnostic.date_formatted} • Mode {diagnostic.mode === 'automatic' ? 'Automatique' : 'Manuel'}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          diagnostic.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          diagnostic.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {diagnostic.status === 'confirmed' ? 'Confirmé' :
                           diagnostic.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </span>
                      </div>

                      {/* AI Diagnosis Results */}
                      {diagnostic.has_results && diagnostic.predictions && diagnostic.predictions.length > 0 ? (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2 font-medium">Résultat du Diagnostic IA :</p>
                          <div className="space-y-1">
                            {diagnostic.predictions.slice(0, 3).map((prediction, idx) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span className={`text-sm ${idx === 0 ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
                                  {prediction.diagnosis}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  idx === 0 ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {formatConfidence(prediction.confidence)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-700">
                            🔍 Diagnostic en cours d'analyse ou données incomplètes
                          </p>
                        </div>
                      )}
                      {/* Final diagnosis if confirmed */}
                      {diagnostic.final_diagnosis && diagnostic.status === 'confirmed' && (
                        <div className="mb-3 p-2 rounded-lg bg-white/70">
                          <p className="text-xs text-gray-500 mb-1">Diagnostic final confirmé :</p>
                          <p className="text-sm font-bold text-gray-800">{diagnostic.final_diagnosis}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => openDiagnosticModal(diagnostic)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                        >
                          <Eye size={12} />
                          Voir Diagnostic IA
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Show only the latest treatment plan if exists */}
                {treatmentPlans.length > 0 && (
                  <div className="border-t border-gray-200 pt-3 mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <BookOpen size={14} />
                      Dernier Plan Thérapeutique IA
                    </h4>
                    {(() => {
                      const plan = treatmentPlans[0]; // Most recent plan
                      return (
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                Plan pour: {plan.diagnosis_context.final_diagnosis}
                              </p>
                              <p className="text-xs text-gray-500">{plan.date_formatted}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => openTreatmentModal(plan)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            <Eye size={12} />
                            Voir Plan Thérapeutique IA
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* Re-execute button */}
                <div className="border-t border-gray-200 pt-3 mt-4">
                  <button
                    onClick={handleReExecute}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all shadow-sm"
                  >
                    <Play size={14} />
                    Nouveau Diagnostic IA
                  </button>
                </div>

                <p className="text-[11px] text-amber-600 mt-3 flex items-start gap-1">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  Aide à la décision uniquement — ne remplace pas votre jugement clinique.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Diagnostic Detail Modal */}
      {showModal && selectedDiagnostic && (
        <DiagnosticModal 
          diagnostic={selectedDiagnostic} 
          onClose={() => setShowModal(false)} 
        />
      )}

      {/* Treatment Plan Modal */}
      {showTreatmentModal && selectedTreatmentPlan && (
        <TreatmentPlanModal 
          treatmentPlan={selectedTreatmentPlan} 
          onClose={() => setShowTreatmentModal(false)} 
        />
      )}

      {/* Re-execute Confirmation Modal */}
      {showReExecuteModal && (
        <ReExecuteModal 
          lastDiagnosticDate={diagnostics.length > 0 ? diagnostics[0].date_formatted : 'date inconnue'}
          onConfirm={confirmReExecute}
          onClose={() => setShowReExecuteModal(false)}
        />
      )}
    </>
  );
}
// Diagnostic Detail Modal Component
function DiagnosticModal({ diagnostic, onClose }: { diagnostic: AIDiagnostic; onClose: () => void }) {
  // Use the formatConfidence function from parent component
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-800">Diagnostic IA - Détails</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Status and Date */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {diagnostic.status === 'confirmed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {diagnostic.status === 'pending' && <Clock className="w-5 h-5 text-amber-600" />}
                {diagnostic.status === 'rejected' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                <span className="font-medium">
                  Statut: {diagnostic.status === 'confirmed' ? 'Confirmé' : 
                           diagnostic.status === 'pending' ? 'En attente' : 'Rejeté'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Généré le: {diagnostic.date_formatted}
              </div>
            </div>

            {/* Mode */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">
                Mode: {diagnostic.mode === 'automatic' ? 'Automatique (Questionnaire + Historique chatbot)' : 'Manuel (Symptômes sélectionnés)'}
              </p>
            </div>

            {/* Top 3 Predictions */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Top 3 des Diagnostics Prédits</h3>
              <div className="space-y-2">
                {diagnostic.predictions.map((prediction, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    idx === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={`${idx === 0 ? 'font-bold text-blue-900' : 'text-gray-700'}`}>
                        {idx + 1}. {prediction.diagnosis}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
                      }`}>
                        {formatConfidence(prediction.confidence)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Final Diagnosis */}
            {diagnostic.final_diagnosis && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Diagnostic Final Confirmé</h3>
                <p className="text-green-700">{diagnostic.final_diagnosis}</p>
                {diagnostic.confirmed_at && (
                  <p className="text-sm text-green-600 mt-1">
                    Confirmé le: {new Date(diagnostic.confirmed_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Symptoms Used */}
            {diagnostic.symptoms_used.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Symptômes Utilisés pour l'Analyse</h3>
                <div className="flex flex-wrap gap-2">
                  {diagnostic.symptoms_used.map((symptom, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {symptom.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 mt-6">
              <p className="text-xs text-amber-600 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                Ce diagnostic est généré par intelligence artificielle et doit être validé par votre expertise clinique. Il s'agit d'un outil d'aide à la décision uniquement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// Treatment Plan Modal Component  
function TreatmentPlanModal({ treatmentPlan, onClose }: { treatmentPlan: AITreatmentPlan; onClose: () => void }) {
  const plan = treatmentPlan.treatment_json;
  
  // Handle different treatment plan JSON structures
  const getArrayValue = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  };
  
  const getStringValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    return '';
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Plan Thérapeutique IA</h2>
              <p className="text-sm text-gray-600">Pour: {plan.diagnosis}</p>
              <p className="text-xs text-gray-500">Généré le: {treatmentPlan.date_formatted}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Psychoeducation */}
            {(plan.psychoeducation || plan.psychoeducational) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <BookOpen size={16} />
                  Psychoéducation
                </h3>
                {getArrayValue(plan.psychoeducation || plan.psychoeducational).map((item, idx) => (
                  <p key={idx} className="text-blue-700 mb-2 last:mb-0">{item}</p>
                ))}
              </div>
            )}

            {/* Cognitive Techniques */}
            {(plan.cognitive_techniques || plan.cognitive) && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Techniques Cognitives</h3>
                <ul className="list-disc list-inside space-y-1 text-green-700">
                  {getArrayValue(plan.cognitive_techniques || plan.cognitive).map((technique, idx) => (
                    <li key={idx}>{technique}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Behavioral Techniques */}
            {(plan.behavioral_techniques || plan.behavioral) && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">Techniques Comportementales</h3>
                <ul className="list-disc list-inside space-y-1 text-purple-700">
                  {getArrayValue(plan.behavioral_techniques || plan.behavioral).map((technique, idx) => (
                    <li key={idx}>{technique}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pharmacological Notes */}
            {(plan.pharmacological_notes || plan.pharmacological) && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                  <Pill size={16} />
                  Notes Pharmacologiques
                </h3>
                {getArrayValue(plan.pharmacological_notes || plan.pharmacological).map((item, idx) => (
                  <p key={idx} className="text-orange-700 mb-2 last:mb-0">{item}</p>
                ))}
              </div>
            )}

            {/* Complementary Techniques */}
            {(plan.complementary_techniques || plan.complementary) && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <h3 className="font-semibold text-teal-800 mb-2">Techniques Complémentaires</h3>
                <ul className="list-disc list-inside space-y-1 text-teal-700">
                  {getArrayValue(plan.complementary_techniques || plan.complementary).map((technique, idx) => (
                    <li key={idx}>{technique}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Sessions */}
            {(plan.recommended_sessions) && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <h3 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Sessions Recommandées
                </h3>
                <p className="text-indigo-700">{getStringValue(plan.recommended_sessions)}</p>
              </div>
            )}

            {/* Custom Notes */}
            {plan.custom_notes && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Notes Personnalisées</h3>
                <p className="text-gray-700">{getStringValue(plan.custom_notes)}</p>
              </div>
            )}

            {/* Knowledge Base Indicator */}
            {plan.found_in_kb && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle size={14} />
                  Plan basé sur la base de connaissances thérapeutiques
                </p>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-amber-600 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                Ce plan thérapeutique est généré par intelligence artificielle et constitue une suggestion. Le thérapeute conserve l'autorité finale pour adapter le traitement selon son expertise clinique et les besoins spécifiques du patient.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-execute Confirmation Modal
function ReExecuteModal({ lastDiagnosticDate, onConfirm, onClose }: { 
  lastDiagnosticDate: string; 
  onConfirm: () => void; 
  onClose: () => void; 
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Nouveau Diagnostic IA</h3>
        <p className="text-gray-600 mb-6">
          Un diagnostic a déjà été effectué le {lastDiagnosticDate}. 
          Souhaitez-vous générer un nouveau diagnostic ?
        </p>
        <p className="text-sm text-amber-600 mb-6">
          Le nouveau diagnostic sera ajouté à l'historique sans supprimer les précédents.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-secondary)] transition-colors"
          >
            Générer Nouveau Diagnostic
          </button>
        </div>
      </div>
    </div>
  );
}