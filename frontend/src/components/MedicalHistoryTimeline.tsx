import { useState, useEffect } from 'react';
import { FileText, Clock, User, Stethoscope } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Props {
  patientId: number | string;
  authorType?: 'doctor' | 'patient';
  authorId?: number | string;
  authorName?: string;
}

interface DMEEntry {
  id: number;
  updated_by: string;
  updated_at: string;
  diagnostic?: string;
  compte_rendu?: string;
  allergies?: string;
  medicaments_en_cours?: string;
  antecedents_medicaux?: string;
}

export default function MedicalHistoryTimeline({ patientId }: Props) {
  const [dme, setDme] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    fetch(`${API_URL}/dme/${patientId}`)
      .then(r => r.json())
      .then(data => setDme(data))
      .catch(() => setDme(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 animate-pulse">
        Chargement du dossier médical...
      </div>
    );
  }

  if (!dme) {
    return (
      <div className="p-6 text-center text-gray-400">
        <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
        <p>Aucun dossier médical disponible.</p>
      </div>
    );
  }

  const sections = [
    { label: 'Allergies', value: dme.allergies, icon: <Stethoscope size={14} /> },
    { label: 'Médicaments en cours', value: dme.medicaments_en_cours, icon: <FileText size={14} /> },
    { label: 'Antécédents médicaux', value: dme.antecedents_medicaux, icon: <Clock size={14} /> },
    { label: 'Antécédents psychologiques', value: dme.antecedents_psychologiques, icon: <User size={14} /> },
    { label: 'Diagnostic (thérapeute)', value: dme.diagnostic, icon: <Stethoscope size={14} /> },
    { label: 'Compte-rendu', value: dme.compte_rendu, icon: <FileText size={14} /> },
  ].filter(s => s.value);

  return (
    <div className="space-y-4">
      {/* Patient info summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Nom', dme.nom],
          ['Prénom', dme.prenom],
          ['Groupe sanguin', dme.groupe_sanguin],
          ['Médecin traitant', dme.medecin_traitant],
        ].filter(([, v]) => v).map(([label, value]) => (
          <div key={label as string} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Medical sections timeline */}
      {sections.length > 0 ? (
        <div className="relative pl-5 border-l-2 border-cyan-100 space-y-4">
          {sections.map(({ label, value, icon }) => (
            <div key={label} className="relative">
              <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center">
                {icon}
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          Aucune information médicale enregistrée pour ce patient.
        </div>
      )}

      {dme.updated_at && (
        <p className="text-xs text-gray-300 text-right">
          Dernière mise à jour : {new Date(dme.updated_at).toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  );
}
