import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Props {
  patientId: number | string;
}

export default function DiagnosticPatient({ patientId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  const toggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !loaded) {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/diagnostic/patient/${patientId}`);
        const data = await res.json();
        setDiagnostics(Array.isArray(data) ? data : []);
      } catch {
        setDiagnostics([]);
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    }
  };

  return (
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
        <div className="mt-3">
          {loading && <p className="text-sm text-gray-400">Chargement…</p>}

          {!loading && diagnostics.length === 0 && (
            <p className="text-sm text-gray-400">Aucun questionnaire rempli par ce patient.</p>
          )}

          {!loading && diagnostics.map((d) => (
            <div key={d.iddiagnostic} className="mb-3 p-4 rounded-xl bg-cyan-50 border border-cyan-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-gray-500">Trouble le plus probable</p>
                  <p className="font-bold text-[var(--color-dark)]">{d.trouble_predit}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-bold bg-[var(--color-primary)] text-white">
                  {d.confiance}%
                </span>
              </div>

              {/* Top 3 */}
              {d.top3 && d.top3.length > 0 && (
                <div className="mt-2">
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

              {/* Symptômes cochés */}
              {d.symptomes && d.symptomes.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Symptômes signalés :</p>
                  <div className="flex flex-wrap gap-1">
                    {d.symptomes.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-white border border-cyan-200 text-xs text-gray-600">
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-400 mt-3">
                Rempli le {new Date(d.datediagnostic).toLocaleString('fr-FR')}
              </p>
              <p className="text-[11px] text-amber-600 mt-1">
                ⚠️ Aide à la décision uniquement — ne remplace pas votre jugement clinique.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
