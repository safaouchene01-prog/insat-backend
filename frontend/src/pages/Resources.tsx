import { useState, useEffect } from 'react';
import { FileText, Eye, X, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type Ressource = {
  id: number;
  titre: string;
  description?: string;
  fichier_url?: string;
  date_ajout?: string;
};

export default function Resources() {
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ressource | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/ressources/`)
      .then(r => r.json())
      .then(d => setRessources(Array.isArray(d) ? d : []))
      .catch(() => setRessources([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-[var(--color-accent)] mb-2">Ressources & Lectures</h1>
      <p className="text-gray-500 mb-8">Documents et guides mis à votre disposition pour votre bien-être.</p>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : ressources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">Aucune ressource disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ressources.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                <FileText size={24} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{r.titre}</h3>
              {r.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-3 flex-1">{r.description}</p>
              )}
              {r.date_ajout && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                  <Calendar size={12} />
                  {new Date(r.date_ajout).toLocaleDateString('fr-FR')}
                </div>
              )}
              <button
                onClick={() => setSelected(r)}
                className="mt-auto flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-secondary)] transition-colors"
              >
                <Eye size={16} /> Lire le document
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lecteur PDF en plein écran */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col p-4 sm:p-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-lg truncate">{selected.titre}</h2>
            <button
              onClick={() => setSelected(null)}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <iframe
            src={`${API_URL}${selected.fichier_url}`}
            title={selected.titre}
            className="flex-1 w-full rounded-xl bg-white"
          />
        </div>
      )}
    </div>
  );
}
