import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import {
  Star, MapPin, Phone, GraduationCap, Languages, Award,
  Calendar, Clock, ChevronLeft, CheckCircle,
} from 'lucide-react';
import ProfileImage from '../components/common/ProfileImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Disponibilités réelles du thérapeute : { "2026-06-21": ["09:00", ...], ... }
  const [dispos, setDispos] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch(`${API_URL}/therapeutes/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Thérapeute introuvable');
        return r.json();
      })
      .then(data => setDoctor(data))
      .catch(() => setDoctor(null))
      .finally(() => setLoading(false));

    // Charger les disponibilités réelles
    fetch(`${API_URL}/disponibilites/doctor/${id}/disponibilites?available_only=true`)
      .then(r => r.json())
      .then(data => setDispos(data && typeof data === 'object' ? data : {}))
      .catch(() => setDispos({}));
  }, [id]);

  // Dates où le thérapeute a au moins un créneau disponible (triées)
  const availableDates = Object.keys(dispos).sort();
  // Heures disponibles pour la date choisie
  const availableTimes = selectedDate ? (dispos[selectedDate] || []) : [];

  const handleReserve = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour réserver.');
      navigate('/login');
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast.error('Veuillez choisir une date et une heure.');
      return;
    }

    const dateHeure = `${selectedDate}T${selectedTime}:00`;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/rendezvous/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateHeure,
          statut: 'PLANIFIE',
          idPatient: user.id,
          idTherapeute: doctor.idtherapeute,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la demande de rendez-vous');

      toast.success('Demande envoyée ! En attente de confirmation du thérapeute.');
      navigate('/patient/dashboard?tab=rdv');
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse bg-white rounded-3xl h-96 border border-gray-100" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Thérapeute introuvable</h1>
        <Link to="/doctors" className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white">
          Voir les praticiens
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => navigate('/doctors')}
        className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ChevronLeft size={20} />
        <span>Retour aux praticiens</span>
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Colonne gauche : infos du thérapeute ── */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-start gap-5 mb-6">
            <ProfileImage
              src={doctor.profile_picture_url}
              alt={`Dr. ${doctor.prenom} ${doctor.nom}`}
              size="lg"
              userType="therapist"
              className="flex-shrink-0"
            />
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-accent)]">
                Dr. {doctor.prenom} {doctor.nom}
              </h1>
              <p className="text-[var(--color-primary)] font-medium">
                {doctor.specialite || 'Psychothérapeute'}
              </p>
              {doctor.notemoyenne && (
                <div className="flex items-center mt-1">
                  <Star size={16} className="text-yellow-400 mr-1 fill-current" />
                  <span className="text-sm font-medium">{doctor.notemoyenne.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {doctor.biographie && (
            <p className="text-gray-600 mb-6 leading-relaxed">{doctor.biographie}</p>
          )}

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {doctor.localisation_cabinet && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={16} className="text-[var(--color-primary)]" />
                {doctor.localisation_cabinet}
              </div>
            )}
            {doctor.telephone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={16} className="text-[var(--color-primary)]" />
                {doctor.telephone}
              </div>
            )}
            {doctor.diplome && (
              <div className="flex items-center gap-2 text-gray-600">
                <GraduationCap size={16} className="text-[var(--color-primary)]" />
                {doctor.diplome}
              </div>
            )}
            {doctor.annees_experience && (
              <div className="flex items-center gap-2 text-gray-600">
                <Award size={16} className="text-[var(--color-primary)]" />
                {doctor.annees_experience} ans d'expérience
              </div>
            )}
            {doctor.langues && (
              <div className="flex items-center gap-2 text-gray-600">
                <Languages size={16} className="text-[var(--color-primary)]" />
                {doctor.langues}
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne droite : réservation ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 h-fit">
          <h2 className="text-lg font-semibold text-[var(--color-accent)] mb-4">
            Prendre rendez-vous
          </h2>

          {doctor.tarifseance && (
            <div className="mb-4 text-center bg-[var(--color-primary)]/10 rounded-xl py-3">
              <span className="text-2xl font-bold text-[var(--color-primary)]">
                {doctor.tarifseance} DZD
              </span>
              <span className="text-gray-500 text-sm"> / séance</span>
            </div>
          )}

          {/* Date — uniquement les dates où le thérapeute est disponible */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar size={14} className="inline mr-1" /> Date
          </label>
          {availableDates.length === 0 ? (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-3 mb-4">
              Ce thérapeute n'a pas encore publié de disponibilités.
            </p>
          ) : (
            <select
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 mb-4 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            >
              <option value="">— Choisir une date —</option>
              {availableDates.map((d) => {
                const dateObj = new Date(d);
                if (isNaN(dateObj.getTime())) return null;
                return (
                  <option key={d} value={d}>
                    {dateObj.toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </option>
                );
              })}
            </select>
          )}

          {/* Heure — uniquement les créneaux disponibles pour la date choisie */}
          {selectedDate && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={14} className="inline mr-1" /> Heure
              </label>
              {availableTimes.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">Aucun créneau pour cette date.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {availableTimes.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`text-sm py-2 rounded-lg border transition-colors ${
                        selectedTime === slot
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'border-gray-200 text-gray-600 hover:border-[var(--color-primary)]'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Mode de paiement (après confirmation) */}
          <p className="text-xs text-gray-500 mb-5 bg-gray-50 rounded-lg p-3">
            💡 Votre demande sera envoyée au thérapeute. Le paiement se fera
            une fois le rendez-vous confirmé.
          </p>

          <button
            onClick={handleReserve}
            disabled={submitting}
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold hover:bg-[#4070d4] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle size={18} />
            {submitting ? 'Envoi...' : 'Demander ce rendez-vous'}
          </button>
        </div>
      </div>
    </div>
  );
}
