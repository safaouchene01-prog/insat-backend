import { useState, useEffect } from 'react';
import { FileText, Trash2, UploadCloud, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type Ressource = {
  id: number;
  titre: string;
  description?: string;
  fichier_url?: string;
};

export default function AdminResources() {
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadRessources = () => {
    fetch(`${API_URL}/ressources/`)
      .then(r => r.json())
      .then(d => setRessources(Array.isArray(d) ? d : []))
      .catch(() => setRessources([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRessources(); }, []);

  const handleUpload = async () => {
    if (!titre.trim()) { toast.error('Veuillez saisir un titre.'); return; }
    if (!file) { toast.error('Veuillez choisir un fichier PDF.'); return; }
    if (!file.name.toLowerCase().endsWith('.pdf')) { toast.error('Seuls les PDF sont acceptés.'); return; }

    const formData = new FormData();
    formData.append('titre', titre);
    formData.append('description', description);
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/ressources/upload`, { method: 'POST', body: formData });
      if (!res.ok) {
        const text = await res.text();
        console.error('Upload failed:', res.status, text);
        // try parse json
        try {
          const json = JSON.parse(text);
          throw new Error(json.detail || json.message || text || 'Échec de l\'upload');
        } catch {
          throw new Error(text || `Échec de l'upload (status ${res.status})`);
        }
      }
      toast.success('Ressource ajoutée !');
      setTitre(''); setDescription(''); setFile(null);
      (document.getElementById('pdf-input') as HTMLInputElement).value = '';
      loadRessources();
    } catch (e: any) {
      console.error('Upload error:', e);
      toast.error(e.message || 'Erreur');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (r: Ressource) => {
    if (!confirm(`Supprimer "${r.titre}" ?`)) return;
    try {
      const res = await fetch(`${API_URL}/ressources/${r.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Échec de la suppression');
      setRessources(prev => prev.filter(x => x.id !== r.id));
      toast.success('Supprimée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6">Gestion des ressources PDF</h2>

      {/* Formulaire d'upload */}
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8">
        <h3 className="font-semibold text-gray-700 mb-4">Ajouter un nouveau document</h3>
        <div className="grid gap-3">
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Titre du document"
            className="border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnelle)"
            rows={2}
            className="border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <input
            id="pdf-input"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border border-gray-200 rounded-xl px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:text-white"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-xl font-medium hover:bg-[var(--color-secondary)] transition-colors disabled:opacity-50"
          >
            <UploadCloud size={18} />
            {uploading ? 'Envoi...' : 'Uploader le PDF'}
          </button>
        </div>
      </div>

      {/* Liste des ressources */}
      <h3 className="font-semibold text-gray-700 mb-4">Documents existants</h3>
      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : ressources.length === 0 ? (
        <p className="text-gray-400">Aucune ressource pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {ressources.map((r) => (
            <div key={r.id} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4">
              <FileText size={24} className="text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{r.titre}</p>
                {r.description && <p className="text-sm text-gray-500 truncate">{r.description}</p>}
              </div>
              <a
                href={`${API_URL}${r.fichier_url}`}
                target="_blank"
                rel="noreferrer"
                className="text-gray-500 hover:text-[var(--color-primary)] p-2"
                title="Voir"
              >
                <Eye size={18} />
              </a>
              <button
                onClick={() => handleDelete(r)}
                className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                title="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
