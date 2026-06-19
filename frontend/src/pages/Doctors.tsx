import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Star, MapPin, Award, Search, SlidersHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DoctorCardSkeleton } from '../components/common/SkeletonCard';
import ProfileImage from '../components/common/ProfileImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Doctors() {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableIds, setAvailableIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'available' | 'unavailable'>('all');
  const [filterSpecialty, setFilterSpecialty] = useState('');

  useEffect(() => {
    // Fetch doctors & availability in parallel
    Promise.all([
      fetch(`${API_URL}/therapeutes/`).then(r => r.json()),
      fetch(`${API_URL}/disponibilites/available-doctors`).then(r => r.json()),
    ])
      .then(([doctorsData, availableData]) => {
        setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
        setAvailableIds(new Set(Array.isArray(availableData) ? availableData : []));
      })
      .catch(() => {
        setDoctors([]);
        setAvailableIds(new Set());
      })
      .finally(() => setLoading(false));
  }, []);

  // Unique specialties for filter dropdown
  const specialties = [...new Set(doctors.map(d => d.specialite).filter(Boolean))];

  const filtered = doctors.filter(d => {
    const name = `${d.prenom} ${d.nom}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || (d.specialite || '').toLowerCase().includes(search.toLowerCase()) || (d.localisation_cabinet || '').toLowerCase().includes(search.toLowerCase());
    const isAvailable = availableIds.has(d.idtherapeute);
    const matchAvail = filterAvailable === 'all' || (filterAvailable === 'available' && isAvailable) || (filterAvailable === 'unavailable' && !isAvailable);
    const matchSpec = !filterSpecialty || d.specialite === filterSpecialty;
    return matchSearch && matchAvail && matchSpec;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold rounded-full uppercase tracking-widest mb-3">
                Nos praticiens
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                {t('doctors.title')}
              </h1>
              <p className="text-gray-500 max-w-xl">
                {t('doctors.subtitle')}
              </p>
            </div>
            {/* Stats */}
            <div className="flex gap-6 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--color-primary)]">{doctors.length}</p>
                <p className="text-xs text-gray-500">Praticiens</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{availableIds.size}</p>
                <p className="text-xs text-gray-500">Disponibles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-400">{doctors.length - availableIds.size}</p>
                <p className="text-xs text-gray-500">Indisponibles</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un praticien, spécialité, lieu..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all text-sm"
              />
            </div>

            {/* Specialty Filter */}
            <div className="relative">
              <SlidersHorizontal size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterSpecialty}
                onChange={e => setFilterSpecialty(e.target.value)}
                className="pl-9 pr-8 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] text-sm text-gray-600 appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="">Toutes les spécialités</option>
                {specialties.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Availability Filter */}
            <div className="flex rounded-2xl border border-gray-200 overflow-hidden bg-white shrink-0">
              {(['all', 'available', 'unavailable'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterAvailable(f)}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-r border-gray-200 last:border-0 ${
                    filterAvailable === f
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? 'Tous' : f === 'available' ? '🟢 Disponibles' : '🔴 Indisponibles'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => <DoctorCardSkeleton key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {filtered.length} praticien{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((doctor: any) => {
                const isAvailable = availableIds.has(doctor.idtherapeute);
                return (
                  <div
                    key={doctor.idtherapeute}
                    className={`group relative bg-white rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
                      isAvailable
                        ? 'border-gray-100 hover:border-green-200'
                        : 'border-gray-100 hover:border-gray-200 opacity-90'
                    }`}
                  >
                    {/* Availability ribbon */}
                    <div className={`absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                      isAvailable
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-red-50 text-red-500 border border-red-200'
                    }`}>
                      {isAvailable ? (
                        <><CheckCircle size={11} /> Disponible</>
                      ) : (
                        <><XCircle size={11} /> Indisponible</>
                      )}
                    </div>

                    {/* Card top accent line */}
                    <div className={`h-1 w-full ${isAvailable ? 'bg-gradient-to-r from-[var(--color-primary)] to-green-400' : 'bg-gradient-to-r from-gray-200 to-gray-300'}`} />

                    <div className="p-6">
                      {/* Doctor header */}
                      <div className="flex items-start gap-4 mb-5">
                        <div className="relative flex-shrink-0">
                          <ProfileImage
                            src={doctor.profile_picture_url}
                            alt={`Dr. ${doctor.prenom} ${doctor.nom}`}
                            size="lg"
                            userType="therapist"
                          />
                          {/* Online dot */}
                          <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isAvailable ? 'bg-green-400' : 'bg-gray-300'}`} />
                        </div>

                        <div className="flex-1 min-w-0 pr-16">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">
                            Dr. {doctor.prenom} {doctor.nom}
                          </h3>
                          <p className="text-[var(--color-primary)] text-sm font-medium mb-1">
                            {doctor.specialite || 'Psychothérapeute'}
                          </p>
                          {doctor.localisation_cabinet && (
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <MapPin size={11} />
                              <span className="truncate">{doctor.localisation_cabinet}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 mb-4">
                        {doctor.notemoyenne && (
                          <div className="flex items-center gap-1 bg-yellow-50 px-2.5 py-1 rounded-lg">
                            <Star size={13} className="text-yellow-500 fill-current" />
                            <span className="text-xs font-bold text-yellow-700">{doctor.notemoyenne.toFixed(1)}</span>
                          </div>
                        )}
                        {doctor.annees_experience && (
                          <div className="flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg">
                            <Award size={13} className="text-blue-500" />
                            <span className="text-xs font-medium text-blue-700">{doctor.annees_experience} ans</span>
                          </div>
                        )}
                        {isAvailable && (
                          <div className="flex items-center gap-1 bg-green-50 px-2.5 py-1 rounded-lg">
                            <Clock size={13} className="text-green-500" />
                            <span className="text-xs font-medium text-green-700">Créneaux libres</span>
                          </div>
                        )}
                      </div>

                      {/* Bio */}
                      {doctor.biographie && (
                        <p className="text-gray-500 text-sm line-clamp-2 mb-5 leading-relaxed">
                          {doctor.biographie}
                        </p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        {doctor.tarifseance ? (
                          <div>
                            <span className="text-xl font-bold text-[var(--color-primary)]">
                              {doctor.tarifseance}
                            </span>
                            <span className="text-gray-400 text-xs ml-1">DZD/séance</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Tarif non renseigné</span>
                        )}

                        <Link
                          to={`/doctors/${doctor.idtherapeute}`}
                          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            isAvailable
                              ? 'bg-[var(--color-primary)] text-white hover:bg-[#4070d4] shadow-sm hover:shadow-md'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          Voir le profil
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucun praticien trouvé</h3>
            <p className="text-gray-400 text-sm">Essayez de modifier vos filtres de recherche.</p>
            <button
              onClick={() => { setSearch(''); setFilterAvailable('all'); setFilterSpecialty(''); }}
              className="mt-4 text-[var(--color-primary)] text-sm font-medium hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </div>
  );
}