import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, FileText, Activity, Clock, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import DMEForm from '../components/DMEForm';
import { Camera, Save, User, Phone, Mail, Calendar as CalendarIcon, MapPin, HeartPulse, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SymptomeChatbot from '../components/diagnostic/SymptomeChatbot';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function PatientDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'dashboard';
  const { user } = useAuthStore();

  const [rendezvous, setRendezvous] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [therapistsCache, setTherapistsCache] = useState<Record<number, any>>({});
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingRdv, setLoadingRdv] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchDashboardData = () => {
    if ((tab === 'rdv' || tab === 'dashboard') && user?.id) {
      setLoadingRdv(true);
      fetch(`${API_URL}/rendezvous/patient/${user.id}`)
        .then(r => r.json())
        .then(data => setRendezvous(Array.isArray(data) ? data : []))
        .catch(() => setRendezvous([]))
        .finally(() => setLoadingRdv(false));
    }
    if (tab === 'history' && user?.id) {
      fetch(`${API_URL}/sessions/?idPatient=${user.id}`)
        .then(r => r.json())
        .then(data => setSessions(Array.isArray(data) ? data : []))
        .catch(() => setSessions([]));
    }

    // Fetch payments to determine whether an RDV has already been paid
    fetch(`${API_URL}/paiements`) // returns all paiements
      .then(r => r.json())
      .then(data => setPaiements(Array.isArray(data) ? data : []))
      .catch(() => setPaiements([]));
  };

  useEffect(() => {
    fetchDashboardData();

    const handleFocus = () => {
      fetchDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [tab, user?.id]);

  const getTherapist = async (id: number) => {
    if (!id) return null;
    if (therapistsCache[id]) return therapistsCache[id];
    try {
      const res = await fetch(`${API_URL}/therapeutes/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      setTherapistsCache(prev => ({ ...prev, [id]: data }));
      return data;
    } catch {
      return null;
    }
  };

  const handlePay = async (rdv: any) => {
    if (!user?.id) {
      toast.error('Vous devez être connecté pour payer');
      return;
    }

    let montant = 0;
    try {
      const ther = await getTherapist(rdv.idtherapeute || rdv.idTherapeute || rdv.idTherapeute);
      montant = ther?.tarifseance || ther?.tarifSeance || ther?.tarif || 0;
    } catch {
      montant = 0;
    }

    if (!montant || montant <= 0) {
      // Fallback: ask user to confirm zero amount
      const proceed = confirm('Le tarif du thérapeute est introuvable. Continuer avec 0 DZD ?');
      if (!proceed) return;
    }

    const bookingPayload = {
      existingRdvId: rdv.idrendezvous || rdv.idRendezVous,
      doctorId: rdv.idtherapeute || rdv.idTherapeute || rdv.idTherapeute,
      doctorName: `Dr. ${rdv.therapeute_prenom || ''} ${rdv.therapeute_nom || ''}`.trim() || 'Consultation',
      dateHeure: rdv.dateheure || rdv.dateHeure,
      displayDate: new Date(rdv.dateheure || rdv.dateHeure).toLocaleDateString('fr-FR'),
      displaySlot: new Date(rdv.dateheure || rdv.dateHeure).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}),
      serviceName: 'Consultation',
      price: montant,
      paymentMethod: 'en_ligne'
    };

    navigate('/checkout', { state: { bookingPayload } });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto w-full">

      {tab === 'dashboard' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6 flex items-center gap-2">
            <Activity className="text-[var(--color-primary)]" size={22} /> Bonjour {user?.prenom || ''} 👋
          </h2>

          {/* Cartes résumé */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-[var(--color-primary)] flex items-center justify-center mb-3">
                <Calendar size={20} />
              </div>
              <p className="text-sm text-gray-500">Rendez-vous à venir</p>
              <p className="text-2xl font-bold text-[var(--color-dark)]">
                {rendezvous.filter((r: any) => r.statut === 'CONFIRME' || r.statut === 'PLANIFIE').length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
                <Clock size={20} />
              </div>
              <p className="text-sm text-gray-500">Confirmés</p>
              <p className="text-2xl font-bold text-[var(--color-dark)]">
                {rendezvous.filter((r: any) => r.statut === 'CONFIRME').length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <AlertCircle size={20} />
              </div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-[var(--color-dark)]">
                {rendezvous.filter((r: any) => r.statut === 'PLANIFIE').length}
              </p>
            </div>
          </div>

          {/* Prochain rendez-vous */}
          <h3 className="text-base font-bold text-[var(--color-dark)] mb-3">Votre prochain rendez-vous</h3>
          {loadingRdv ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">Chargement...</div>
          ) : rendezvous.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">
                  {new Date(rendezvous[0].dateheure).toLocaleString('fr-FR', {
                    weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                <p className="text-sm text-gray-500">
                  {rendezvous[0].therapeute_prenom ? `Dr. ${rendezvous[0].therapeute_prenom} ${rendezvous[0].therapeute_nom}` : 'Consultation'}
                </p>
              </div>
              <a href="/patient/dashboard?tab=rdv" className="text-sm text-[var(--color-primary)] font-medium hover:underline">
                Voir tout →
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Calendar className="w-14 h-14 text-cyan-200 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Vous n'avez aucun rendez-vous planifié.</p>
              <a href="/doctors" className="inline-flex items-center px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-secondary)] transition-colors">
                Trouver un psychothérapeute
              </a>
            </div>
          )}
        </div>
      )}

      {tab === 'rdv' && (() => {
        const isPaid = (rdv: any) => paiements.some((p: any) => (
          (p.idrendezvous == rdv.idrendezvous) || (p.idRendezVous == rdv.idrendezvous) || (p.id_rendezvous == rdv.idrendezvous)
        ) && String(p.statut || '').toLowerCase().replace('é', 'e') === 'valide');

        const now = new Date();

        const filteredRdv = rendezvous
          .filter((r: any) => {
            const matchDate = filterDate ? r.dateheure && String(r.dateheure).startsWith(filterDate) : true;
            
            let matchStatus = true;
            if (filterStatus !== 'ALL') {
              if (filterStatus === 'PAYE') {
                matchStatus = isPaid(r);
              } else {
                matchStatus = r.statut === filterStatus;
              }
            }

            return matchDate && matchStatus;
          })
          .sort((a: any, b: any) => {
            const dateA = new Date(a.dateheure);
            const dateB = new Date(b.dateheure);
            const aFuture = dateA >= now;
            const bFuture = dateB >= now;

            // Both upcoming: sort ascending (soonest first)
            if (aFuture && bFuture) return dateA.getTime() - dateB.getTime();
            // Both past: sort descending (most recent first)
            if (!aFuture && !bFuture) return dateB.getTime() - dateA.getTime();
            // Upcoming before past
            return aFuture ? -1 : 1;
          });

        return (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-[var(--color-dark)] flex items-center gap-2">
                <Calendar className="text-[var(--color-primary)]" size={22} /> Prochains rendez-vous
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Statut :</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="PAYE">Payés</option>
                    <option value="PLANIFIE">En attente</option>
                    <option value="CONFIRME">Confirmés</option>
                    <option value="ANNULE">Annulés</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Date :</span>
                  <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                  />
                </div>
                
                {(filterDate || filterStatus !== 'ALL') && (
                  <button 
                    onClick={() => { setFilterDate(''); setFilterStatus('ALL'); }} 
                    className="text-sm text-red-500 hover:text-red-700 font-medium whitespace-nowrap ml-1"
                  >
                    Effacer filtres
                  </button>
                )}
              </div>
            </div>
            {loadingRdv ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">Chargement...</div>
            ) : filteredRdv.length > 0 ? (
              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
                {filteredRdv.map((rdv: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {new Date(rdv.dateheure).toLocaleString('fr-FR', {
                        weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {rdv.therapeute_prenom ? `Dr. ${rdv.therapeute_prenom} ${rdv.therapeute_nom}` : 'Consultation'}
                      {rdv.therapeute_specialite ? ` · ${rdv.therapeute_specialite}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      rdv.statut === 'CONFIRME' ? 'bg-green-100 text-green-700' :
                      rdv.statut === 'ANNULE'   ? 'bg-red-100 text-red-700' :
                      rdv.statut === 'TERMINE'  ? 'bg-gray-100 text-gray-500' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {rdv.statut === 'PLANIFIE'  ? 'En attente' :
                       rdv.statut === 'CONFIRME'  ? 'Confirmé' :
                       rdv.statut === 'ANNULE'    ? 'Annulé' :
                       rdv.statut === 'TERMINE'   ? 'Terminé' :
                       rdv.statut || 'En attente'}
                    </span>

                    {rdv.statut !== 'ANNULE' && (
                      isPaid(rdv) ? (
                        <span className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200">
                          Payé
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePay(rdv)}
                          className="inline-flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90"
                        >
                          Payer
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Calendar className="w-14 h-14 text-cyan-200 mx-auto mb-4" />
              {(filterDate || filterStatus !== 'ALL') && <p className="text-gray-500 mb-4">Aucun rendez-vous ne correspond à ces critères.</p>}
              {!filterDate && filterStatus === 'ALL' && (
                <>
                  <p className="text-gray-500 mb-4">Vous n'avez aucun rendez-vous planifié.</p>
                  <a href="/doctors" className="inline-flex items-center px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-secondary)] transition-colors">
                    Trouver un psychothérapeute
                  </a>
                </>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {tab === 'dme' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6 flex items-center gap-2">
            <FileText className="text-[var(--color-primary)]" size={22} /> Dossier Médical Électronique
          </h2>
          <DMEForm
            patientId={user!.id}
            role="patient"
            uploaderName={`${user?.prenom || ''} ${user?.nom || ''}`.trim()}
          />
        </div>
      )}

      {tab === 'history' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6 flex items-center gap-2">
            <Clock className="text-[var(--color-primary)]" size={22} /> Historique des consultations
          </h2>
          {sessions.length > 0 ? (
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
              {sessions.map((s: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="font-semibold text-gray-800">{s.dateSeance || s.date}</p>
                  <p className="text-sm text-gray-500">{s.notes || 'Consultation'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Clock className="w-14 h-14 text-cyan-200 mx-auto mb-4" />
              <p className="text-gray-500">Aucune consultation passée enregistrée.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'quiz' && <SymptomeChatbot />}

      {tab === 'profile' && <PatientProfileInline />}
    </div>
  );
}

function PatientProfileInline() {
  const { user, setUser, role } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('personal');

  const [form, setForm] = useState({
    nom: user?.nom || '', prenom: user?.prenom || '', email: user?.email || '',
    telephone: '', dateNaissance: '', sexe: 'Homme', ville: '', nin: '',
    contactUrgenceNom: '', contactUrgenceTel: '',
    conditionsExistantes: '', medicaments: '',
    suiviPsy: false, troublesSommeil: false, niveauStress: 5,
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  // Fetch patient data from backend on mount
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`${API_URL}/patients/${user.id}/profile`)
      .then(r => r.json())
      .then(data => {
        setForm(prev => ({
          ...prev,
          nom: data.nom || prev.nom,
          prenom: data.prenom || prev.prenom,
          email: data.email || prev.email,
          telephone: data.telephone || '',
          dateNaissance: data.datenaissance
            ? String(data.datenaissance).substring(0, 10)
            : prev.dateNaissance,
          sexe: data.sexe || 'Homme',
          ville: data.ville || '',
          contactUrgenceNom: data.contact_urgence_nom || '',
          contactUrgenceTel: data.contact_urgence_tel || '',
          conditionsExistantes: data.conditions_existantes || '',
          suiviPsy: data.suivi_psy || false,
          troublesSommeil: data.troubles_sommeil || false,
          niveauStress: data.niveau_stress || 5,
          nin: data.numerosecuritesociale || '',
        }));
      })
      .catch(err => console.error('Failed to load patient data:', err))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La taille du fichier ne peut pas dépasser 5MB');
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const endpoint = role === "patient"
      ? `/patients/${user?.id}/profile-picture`
      : `/cliniques/${user?.id}/profile-picture`;

    try {
      const res = await fetch(
        `${API_URL}${endpoint}`,
        { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      const newUrl = data.profile_picture_url || data.image_url;
      setUser({ ...user!, profile_picture: newUrl });
      toast.success('Photo mise à jour !');
    } catch {
      toast.error("Erreur lors de l'upload");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare complete profile data
      const profileData: any = {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        sexe: form.sexe,
        ville: form.ville,
        contactUrgenceNom: form.contactUrgenceNom,
        contactUrgenceTel: form.contactUrgenceTel,
        conditionsExistantes: form.conditionsExistantes,
        suiviPsy: form.suiviPsy,
        troublesSommeil: form.troublesSommeil,
        niveauStress: form.niveauStress,
      };

      // Only include date if it's filled
      if (form.dateNaissance) {
        profileData.dateNaissance = form.dateNaissance;
      }

      // Only include NIN if it's filled
      if (form.nin) {
        profileData.numeroSecuriteSociale = form.nin;
      }

      // Handle password change if the user filled the new password field
      if (form.newPassword || form.confirmPassword) {
        if (form.newPassword.length < 6) {
          toast.error('Le nouveau mot de passe doit faire au moins 6 caractères');
          setSaving(false);
          return;
        }
        if (form.newPassword !== form.confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas');
          setSaving(false);
          return;
        }
        profileData.motDePasse = form.newPassword;
      }

      const res = await fetch(`${API_URL}/patients/${user?.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erreur lors de la mise à jour');
      }
      
      // Update user store with basic info
      setUser({ 
        ...user!, 
        nom: form.nom, 
        prenom: form.prenom, 
        email: form.email 
      });

      // Clear password fields after successful save
      setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      
      toast.success('Profil mis à jour avec succès !');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const SECTIONS = [
    { id: 'personal', icon: User, label: 'Personnel' },
    { id: 'emergency', icon: AlertCircle, label: 'Urgence' },
    { id: 'medical', icon: HeartPulse, label: 'Médical' },
    { id: 'security', icon: Lock, label: 'Sécurité' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6 flex items-center gap-2">
        <Settings className="text-[var(--color-primary)]" size={22} /> Mon Profil
      </h2>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 animate-pulse">
          Chargement des données du profil...
        </div>
      ) : (
      <>
      <div className="flex items-center gap-5 mb-6 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <label className="relative group cursor-pointer block w-24 h-24 rounded-full border-[3px] border-white shadow-[0_2px_12px_rgba(28,46,74,0.12)] overflow-hidden flex-shrink-0">
          {user?.profile_picture ? (
            <img src={user.profile_picture.startsWith('http') ? user.profile_picture : `${API_URL}${user.profile_picture}`} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#E8F4FD] text-[#4A90D9] font-[Poppins] font-semibold text-[28px] flex items-center justify-center">
              {user?.nom?.[0]}{user?.prenom?.[0]}
            </div>
          )}
          <div className="absolute inset-0 bg-[#1C2E4A]/55 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={24} className="text-white mb-1" />
            <span className="font-[Poppins] font-medium text-[11px] text-white">Changer</span>
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
        </label>
        <div>
          <p className="text-lg font-bold text-[var(--color-dark)]">{user?.prenom} {user?.nom}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-100 text-cyan-800 text-xs font-bold rounded-full">Patient</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-44 flex-shrink-0">
          <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col gap-1">
            {SECTIONS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setSection(id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${section === id ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {section === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Nom *" name="nom" value={form.nom} onChange={handleChange} icon={<User size={15} />} />
              <F label="Prénom *" name="prenom" value={form.prenom} onChange={handleChange} icon={<User size={15} />} />
              <F label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} icon={<Phone size={15} />} />
              <F label="Email *" name="email" value={form.email} onChange={handleChange} icon={<Mail size={15} />} type="email" />
              <F label="Date de naissance" name="dateNaissance" value={form.dateNaissance} onChange={handleChange} icon={<CalendarIcon size={15} />} type="date" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                <select name="sexe" value={form.sexe} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm">
                  <option>Homme</option><option>Femme</option><option>Autre</option>
                </select>
              </div>
              <F label="Ville" name="ville" value={form.ville} onChange={handleChange} icon={<MapPin size={15} />} />
            </div>
          )}

          {section === 'emergency' && (
            <div className="space-y-4">
              <F label="NIN (Numéro d'Identification Nationale)" name="nin" value={form.nin} onChange={handleChange} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="Nom du contact d'urgence" name="contactUrgenceNom" value={form.contactUrgenceNom} onChange={handleChange} icon={<User size={15} />} />
                <F label="Téléphone du contact d'urgence" name="contactUrgenceTel" value={form.contactUrgenceTel} onChange={handleChange} icon={<Phone size={15} />} />
              </div>
            </div>
          )}

          {section === 'medical' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions existantes</label>
                <textarea name="conditionsExistantes" value={form.conditionsExistantes} onChange={handleChange} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="Ex: Anxiété. Si aucune, écrivez 'Aucune'" />
              </div>
              <F label="Médicaments en cours" name="medicaments" value={form.medicaments} onChange={handleChange} />
              {[['suiviPsy', 'Suivi psychiatrique passé'], ['troublesSommeil', 'Troubles du sommeil']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name={k} checked={(form as any)[k]} onChange={handleChange} className="w-5 h-5 rounded accent-[var(--color-primary)]" />
                  <span className="text-sm font-medium text-gray-700">{l}</span>
                </label>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau de stress : <span className="font-bold text-[var(--color-primary)]">{form.niveauStress}</span></label>
                <input type="range" name="niveauStress" min="1" max="10" value={form.niveauStress} onChange={handleChange} className="w-full accent-[var(--color-primary)]" />
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-4">
              <F label="Mot de passe actuel" name="currentPassword" value={form.currentPassword} onChange={handleChange} type="password" icon={<Lock size={15} />} />
              <F label="Nouveau mot de passe" name="newPassword" value={form.newPassword} onChange={handleChange} type="password" icon={<Lock size={15} />} />
              <F label="Confirmer" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password" icon={<Lock size={15} />} />
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-8 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-secondary)] disabled:opacity-60 transition-all">
              <Save size={16} /> {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function F({ label, name, value, onChange, icon, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-3.5 text-gray-400">{icon}</span>}
        <input type={type} name={name} value={value} onChange={onChange} className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm`} />
      </div>
    </div>
  );
}

function PatientMedicalRecord() {
  const { user } = useAuthStore();
  const [medicalData, setMedicalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`${API_URL}/patients/${user.id}/profile`)
      .then(r => r.json())
      .then(data => setMedicalData(data))
      .catch(err => console.error('Failed to load medical data:', err))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 animate-pulse">
        Chargement du dossier médical...
      </div>
    );
  }

  const medicalInfo = [
    { 
      label: 'Conditions psychologiques', 
      value: medicalData?.conditions_existantes || 'Non renseigné',
      isEmpty: !medicalData?.conditions_existantes 
    },
    { 
      label: 'Suivi psychiatrique passé', 
      value: medicalData?.suivi_psy ? 'Oui' : 'Non',
      isEmpty: false
    },
    { 
      label: 'Troubles du sommeil', 
      value: medicalData?.troubles_sommeil ? 'Oui' : 'Non',
      isEmpty: false
    },
    { 
      label: 'Niveau de stress', 
      value: medicalData?.niveau_stress ? `${medicalData.niveau_stress} / 10` : 'Non évalué',
      isEmpty: !medicalData?.niveau_stress
    },
    { 
      label: 'Contact d\'urgence', 
      value: medicalData?.contact_urgence_nom 
        ? `${medicalData.contact_urgence_nom}${medicalData.contact_urgence_tel ? ` (${medicalData.contact_urgence_tel})` : ''}`
        : 'Non renseigné',
      isEmpty: !medicalData?.contact_urgence_nom
    },
    { 
      label: 'Date de naissance', 
      value: medicalData?.datenaissance 
        ? new Date(medicalData.datenaissance).toLocaleDateString('fr-FR')
        : 'Non renseigné',
      isEmpty: !medicalData?.datenaissance
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {medicalInfo.map(({ label, value, isEmpty }) => (
          <div key={label} className={`rounded-xl p-4 ${isEmpty ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`font-semibold ${isEmpty ? 'text-amber-700' : 'text-gray-800'}`}>{value}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800 mb-1">Informations enregistrées lors de l'inscription</p>
            <p className="text-xs text-blue-600">
              Ces données ont été sauvegardées automatiquement lors de votre inscription. 
              Vous pouvez les modifier à tout moment dans la section profil.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <a href="/patient/dashboard?tab=profile" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:bg-[var(--color-secondary)] transition-colors">
          <Settings size={16} />
          Mettre à jour mon profil médical
        </a>
      </div>
    </div>
  );
}
