import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Save, User, Phone, Mail, MapPin, GraduationCap, Briefcase, Lock, UploadCloud } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ProfileImageUpload from '../common/ProfileImageUpload';
import { useUserProfile } from '../../hooks/useUserProfile';

export default function DoctorProfile() {
  const { user } = useAuthStore();
  const { updateProfilePicture } = useUserProfile();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  const [form, setForm] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    email: user?.email || '',
    telephone: '',
    sexe: 'Homme',
    diplome: '',
    specialite: '',
    anneesExperience: '',
    numeroLicence: '',
    certifications: '',
    langues: '',
    typeConsultation: 'Hybride',
    tarifConsultation: '',
    localisationCabinet: '',
    biographie: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success('Profil mis à jour avec succès !');
    setSaving(false);
  };

  const SECTIONS = [
    { id: 'personal',  icon: User,          label: 'Informations Générales' },
    { id: 'academic',  icon: GraduationCap, label: 'Parcours Académique' },
    { id: 'work',      icon: Briefcase,     label: 'Travail & Consultations' },
    { id: 'documents', icon: UploadCloud,   label: 'Documents' },
    { id: 'security',  icon: Lock,          label: 'Sécurité' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
        <div className="relative">
          <ProfileImageUpload
            currentImage={user?.profile_picture_url}
            userType="therapist"
            userId={Number(user?.id)}
            size="xl"
            showUploadButton={false}
            onUploadComplete={(url) => {
              updateProfilePicture(url);
              toast.success('Photo de profil mise à jour !');
            }}
            onDeleteComplete={() => {
              updateProfilePicture('');
              toast.success('Photo de profil supprimée.');
            }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">Dr. {user?.prenom} {user?.nom}</h1>
          <p className="text-gray-500">{user?.email}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Médecin</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Section Nav */}
        <div className="md:w-56 flex-shrink-0">
          <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col gap-1">
            {SECTIONS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${activeSection === id ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Form */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {activeSection === 'personal' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[var(--color-dark)] mb-6">Informations Générales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nom" name="nom" value={form.nom} onChange={handleChange} icon={<User size={16}/>} />
                <Field label="Prénom" name="prenom" value={form.prenom} onChange={handleChange} icon={<User size={16}/>} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                  <select name="sexe" value={form.sexe} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm">
                    <option>Homme</option><option>Femme</option><option>Autre</option>
                  </select>
                </div>
                <Field label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} icon={<Phone size={16}/>} />
                <Field label="Email" name="email" value={form.email} onChange={handleChange} icon={<Mail size={16}/>} type="email" />
              </div>
            </div>
          )}

          {activeSection === 'academic' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[var(--color-dark)] mb-6">Parcours Académique</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Diplôme Universitaire" name="diplome" value={form.diplome} onChange={handleChange} icon={<GraduationCap size={16}/>} />
                <Field label="Spécialisation" name="specialite" value={form.specialite} onChange={handleChange} />
                <Field label="Années d'expérience" name="anneesExperience" value={form.anneesExperience} onChange={handleChange} type="number" />
                <Field label="Numéro d'agrément" name="numeroLicence" value={form.numeroLicence} onChange={handleChange} />
                <div className="md:col-span-2">
                  <Field label="Certifications additionnelles" name="certifications" value={form.certifications} onChange={handleChange} />
                </div>
                <div className="md:col-span-2">
                  <Field label="Langues parlées" name="langues" value={form.langues} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'work' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[var(--color-dark)] mb-6">Travail & Consultations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de consultation</label>
                  <select name="typeConsultation" value={form.typeConsultation} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm">
                    <option value="En ligne">En ligne</option>
                    <option value="En cabinet">En cabinet</option>
                    <option value="Hybride">Hybride</option>
                  </select>
                </div>
                <Field label="Tarif moyen (DA)" name="tarifConsultation" value={form.tarifConsultation} onChange={handleChange} type="number" />
                <div className="md:col-span-2">
                  <Field label="Localisation du cabinet" name="localisationCabinet" value={form.localisationCabinet} onChange={handleChange} icon={<MapPin size={16}/>} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biographie / Présentation</label>
                  <textarea name="biographie" value={form.biographie} onChange={handleChange} rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="Présentez-vous aux patients..." />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'documents' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-[var(--color-dark)] mb-6">Documents de Vérification</h2>
              {[
                { label: 'Diplôme Universitaire', status: 'validated' },
                { label: 'Agrément / Licence', status: 'pending' },
                { label: 'Pièce d\'identité', status: 'missing' },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50">
                  <div>
                    <p className="font-medium text-sm text-gray-800">{label}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                      status === 'validated' ? 'bg-green-100 text-green-700' :
                      status === 'pending'   ? 'bg-amber-100 text-amber-700' :
                                              'bg-red-100 text-red-700'
                    }`}>
                      {status === 'validated' ? '✓ Validé' : status === 'pending' ? '⏳ En attente' : '✗ Manquant'}
                    </span>
                  </div>
                  <label className="cursor-pointer px-4 py-2 text-sm font-medium text-[var(--color-primary)] bg-white border border-[var(--color-primary)] rounded-xl hover:bg-cyan-50 transition-colors">
                    {status === 'missing' ? 'Uploader' : 'Remplacer'}
                    <input type="file" className="hidden" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[var(--color-dark)] mb-6">Changer le mot de passe</h2>
              <Field label="Mot de passe actuel" name="currentPassword" value={form.currentPassword} onChange={handleChange} type="password" icon={<Lock size={16}/>} />
              <Field label="Nouveau mot de passe" name="newPassword" value={form.newPassword} onChange={handleChange} type="password" icon={<Lock size={16}/>} />
              <Field label="Confirmer" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password" icon={<Lock size={16}/>} />
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
