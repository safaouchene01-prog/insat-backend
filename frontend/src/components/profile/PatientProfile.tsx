import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Camera, Save, User, Phone, Mail, Calendar, MapPin, HeartPulse, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PatientProfile() {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  // In MVP: form state is local; on submit it would call supabase update
  const [form, setForm] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    email: user?.email || '',
    telephone: '',
    dateNaissance: '',
    sexe: 'Homme',
    ville: '',
    nin: '',
    contactUrgenceNom: '',
    contactUrgenceTel: '',
    conditionsExistantes: '',
    medicaments: '',
    suiviPsy: false,
    troublesSommeil: false,
    niveauStress: 5,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800)); // Mock save
    toast.success('Profil mis à jour avec succès !');
    setSaving(false);
  };

  const SECTIONS = [
    { id: 'personal',   icon: User,        label: 'Informations Personnelles' },
    { id: 'emergency',  icon: AlertCircle, label: 'Identité & Urgence' },
    { id: 'medical',    icon: HeartPulse,  label: 'Profil Médical' },
    { id: 'security',   icon: Lock,        label: 'Sécurité' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {user?.nom?.[0]}{user?.prenom?.[0]}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center shadow hover:bg-gray-50">
            <Camera size={14} className="text-gray-600" />
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">{user?.prenom} {user?.nom}</h1>
          <p className="text-gray-500">{user?.email}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-cyan-100 text-cyan-800 text-xs font-bold rounded-full">Patient</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Section Nav */}
        <div className="md:w-56 flex-shrink-0">
          <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col gap-1">
            {SECTIONS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${activeSection === id ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {activeSection === 'personal' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[var(--color-dark)] mb-6">Informations Personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nom" name="nom" value={form.nom} onChange={handleChange} icon={<User size={16}/>} />
                <Field label="Prénom" name="prenom" value={form.prenom} onChange={handleChange} icon={<User size={16}/>} />
                <Field label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} icon={<Phone size={16}/>} />
                <Field label="Email" name="email" value={form.email} onChange={handleChange} icon={<Mail size={16}/>} type="email" />
                <Field label="Date de naissance" name="dateNaissance" value={form.dateNaissance} onChange={handleChange} icon={<Calendar size={16}/>} type="date" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                  <select name="sexe" value={form.sexe} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm">
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <Field label="Ville" name="ville" value={form.ville} onChange={handleChange} icon={<MapPin size={16}/>} />
              </div>
            </div>
          )}

          {activeSection === 'emergency' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[var(--color-dark)] mb-6">Identité & Contact d'Urgence</h2>
              <Field label="Numéro d'Identification Nationale (NIN)" name="nin" value={form.nin} onChange={handleChange} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nom du contact d'urgence" name="contactUrgenceNom" value={form.contactUrgenceNom} onChange={handleChange} icon={<User size={16}/>} />
                <Field label="Téléphone du contact d'urgence" name="contactUrgenceTel" value={form.contactUrgenceTel} onChange={handleChange} icon={<Phone size={16}/>} />
              </div>
            </div>
          )}

          {activeSection === 'medical' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[var(--color-dark)] mb-6">Profil Médical</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions psychologiques existantes</label>
                <textarea name="conditionsExistantes" value={form.conditionsExistantes} onChange={handleChange} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm" placeholder="Ex: Anxiété, Dépression. Si aucune, écrivez 'Aucune'" />
              </div>
              <Field label="Médicaments en cours" name="medicaments" value={form.medicaments} onChange={handleChange} />
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="suiviPsy" checked={form.suiviPsy} onChange={handleChange} className="w-5 h-5 rounded accent-[var(--color-primary)]" />
                  <span className="text-sm text-gray-700 font-medium">Avez-vous déjà eu un suivi psychiatrique ?</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="troublesSommeil" checked={form.troublesSommeil} onChange={handleChange} className="w-5 h-5 rounded accent-[var(--color-primary)]" />
                  <span className="text-sm text-gray-700 font-medium">Souffrez-vous de problèmes de sommeil ?</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau de stress (1-10) : <span className="font-bold text-[var(--color-primary)]">{form.niveauStress}</span></label>
                <input type="range" name="niveauStress" min="1" max="10" value={form.niveauStress} onChange={handleChange} className="w-full accent-[var(--color-primary)]" />
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[var(--color-dark)] mb-6">Changer le mot de passe</h2>
              <Field label="Mot de passe actuel" name="currentPassword" value={form.currentPassword} onChange={handleChange} type="password" icon={<Lock size={16}/>} />
              <Field label="Nouveau mot de passe" name="newPassword" value={form.newPassword} onChange={handleChange} type="password" icon={<Lock size={16}/>} />
              <Field label="Confirmer le nouveau mot de passe" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password" icon={<Lock size={16}/>} />
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-8 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-secondary)] disabled:opacity-60 transition-all">
              <Save size={18} />
              {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, icon, type = 'text' }: any) {
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
