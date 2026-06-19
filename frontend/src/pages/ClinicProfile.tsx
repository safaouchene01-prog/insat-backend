import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Phone, Mail, ChevronLeft, Building2, Info } from 'lucide-react';
import ProfileImage from '../components/common/ProfileImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ClinicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/cliniques/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Clinique introuvable');
        return r.json();
      })
      .then(data => setClinic(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse bg-white rounded-3xl h-96 border border-gray-100" />
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Building2 size={48} className="text-gray-300" />
        <h1 className="text-2xl font-semibold text-slate-900">Clinique introuvable</h1>
        <Link to="/clinics" className="rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors">
          Voir toutes les cliniques
        </Link>
      </div>
    );
  }

  const imageUrl = clinic.profile_picture_url
    ? (clinic.profile_picture_url.startsWith('http')
      ? clinic.profile_picture_url
      : `${API_URL}${clinic.profile_picture_url}`)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => navigate('/clinics')}
        className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ChevronLeft size={20} />
        <span>Retour aux cliniques</span>
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-40 bg-gradient-to-br from-cyan-50 to-teal-100 relative">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={clinic.nom}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Info */}
        <div className="p-8">
          <div className="flex items-start gap-5 -mt-14 mb-4">
            <div className="ring-4 ring-white rounded-2xl overflow-hidden shadow-md flex-shrink-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={clinic.nom}
                  className="w-20 h-20 object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
                  <Building2 size={36} className="text-white" />
                </div>
              )}
            </div>
            <div className="mt-14">
              <h1 className="text-2xl font-bold text-[var(--color-accent)]">{clinic.nom}</h1>
              <span className="inline-block mt-1 text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-0.5 rounded-full">
                Clinique Partenaire
              </span>
            </div>
          </div>

          {/* Contact details */}
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {clinic.adresse && (
              <div className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">
                <MapPin size={16} className="text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                <span>{clinic.adresse}</span>
              </div>
            )}
            {clinic.telephone && (
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">
                <Phone size={16} className="text-[var(--color-primary)] flex-shrink-0" />
                <span>{clinic.telephone}</span>
              </div>
            )}
            {clinic.email && (
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">
                <Mail size={16} className="text-[var(--color-primary)] flex-shrink-0" />
                <span className="truncate">{clinic.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description Card */}
      {clinic.description && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-accent)] mb-4">
            <Info size={18} className="text-[var(--color-primary)]" />
            À propos de la clinique
          </h2>
          <p className="text-gray-600 leading-relaxed">{clinic.description}</p>
        </div>
      )}
    </div>
  );
}
