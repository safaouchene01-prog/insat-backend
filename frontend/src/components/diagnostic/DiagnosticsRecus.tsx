import { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function DiagnosticsRecus() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`${API_URL}/ai-history/diagnostic/therapeute/${user.id}`)
      .then(r => r.json())
      .then(data => setDiagnostics(Array.isArray(data) ? data : []))
      .catch(() => setDiagnostics([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6 flex items-center gap-2">
        <Brain className="text-[var(--color-primary)]" size={22} /> Diagnostics reçus (IA)
      </h2>

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
          Chargement…
        </div>
      )}

      {!loading && diagnostics.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Brain className="w-14 h-14 text-cyan-200 mx-auto mb-4" />
          <p className="text-gray-500">Aucun questionnaire ne vous a encore été adressé.</p>
        </div>
      )}

      {!loading && diagnostics.length > 0 && (
        <div className="space-y-4">
          {diagnostics.map((d) => (
            <div key={d.iddiagnostic} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {/* En-tête patient */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold flex-shrink-0">
                    {d.patient_nom?.[0]}{d.patient_prenom?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {d.patient_prenom} {d.patient_nom}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(d.datediagnostic).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-bold bg-[var(--color-primary)] text-white">
                  {d.confiance}%
                </span>
              </div>

              {/* Trouble prédit */}
              <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-100 mb-3">
                <p className="text-xs text-gray-500">Trouble le plus probable</p>
                <p className="font-bold text-[var(--color-dark)]">{d.trouble_predit}</p>
              </div>

              {/* Top 3 */}
              {d.top3 && d.top3.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Autres hypothèses :</p>
                  <div className="space-y-1">
                    {d.top3.map((t: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{t.trouble}</span>
                        <span className="text-gray-500 font-medium">{t.confiance}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Symptômes */}
              {d.symptomes && d.symptomes.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Symptômes signalés :</p>
                  <div className="flex flex-wrap gap-1">
                    {d.symptomes.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-600">
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-amber-600 mt-3">
                ⚠️ Aide à la décision uniquement — ne remplace pas votre jugement clinique.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
