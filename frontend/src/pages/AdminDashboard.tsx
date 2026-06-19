import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminResources from './AdminResources';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type User = { id: number; nom: string; prenom: string; email: string; role: string };
type Stats = {
  totalUsers: number; patients: number; therapeutes: number; cliniques: number;
  rendezvous: number; rdvConfirmes: number; rdvEnAttente: number;
};

const ROLE_LABEL: Record<string, string> = {
  patient: 'Patient', doctor: 'Thérapeute', clinic: 'Clinique',
};
const ROLE_COLOR: Record<string, string> = {
  patient: 'bg-blue-100 text-blue-700',
  doctor: 'bg-green-100 text-green-700',
  clinic: 'bg-purple-100 text-purple-700',
};

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'stats';
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Charger les stats
  useEffect(() => {
    fetch(`${API_URL}/admin/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  // Charger les utilisateurs quand on ouvre l'onglet
  useEffect(() => {
    if (activeTab === 'users') {
      setLoading(true);
      fetch(`${API_URL}/admin/users`)
        .then(r => r.json())
        .then(d => setUsers(Array.isArray(d) ? d : []))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  const handleDelete = async (u: User) => {
    if (!confirm(`Supprimer ${u.prenom} ${u.nom} (${ROLE_LABEL[u.role]}) ?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${u.role}/${u.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Échec de la suppression');
      setUsers(prev => prev.filter(x => !(x.id === u.id && x.role === u.role)));
      toast.success('Utilisateur supprimé');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${u.prenom} ${u.nom}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-[var(--color-accent)] mb-8">Administration INSAT</h1>

      <div>
        {/* Contenu */}
        <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 p-8 min-h-[500px]">

          {/* ── Onglet Statistiques ── */}
          {activeTab === 'stats' && (
            <div>
              <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6">Statistiques globales</h2>
              {!stats ? (
                <p className="text-gray-400">Chargement...</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard label="Utilisateurs totaux" value={stats.totalUsers} color="text-cyan-600" />
                  <StatCard label="Patients" value={stats.patients} color="text-blue-600" />
                  <StatCard label="Thérapeutes" value={stats.therapeutes} color="text-green-600" />
                  <StatCard label="Cliniques" value={stats.cliniques} color="text-purple-600" />
                  <StatCard label="Rendez-vous totaux" value={stats.rendezvous} color="text-gray-700" />
                  <StatCard label="RDV confirmés" value={stats.rdvConfirmes} color="text-green-600" />
                  <StatCard label="RDV en attente" value={stats.rdvEnAttente} color="text-amber-600" />
                </div>
              )}
            </div>
          )}

          {/* ── Onglet Utilisateurs ── */}
          {activeTab === 'users' && (
            <div>
              <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6">Gestion des utilisateurs</h2>

              {/* Filtres */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher par nom ou email..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 outline-none"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="patient">Patients</option>
                  <option value="doctor">Thérapeutes</option>
                  <option value="clinic">Cliniques</option>
                </select>
              </div>

              {loading ? (
                <p className="text-gray-400">Chargement...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="py-3 px-2">Nom</th>
                        <th className="py-3 px-2">Email</th>
                        <th className="py-3 px-2">Rôle</th>
                        <th className="py-3 px-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={`${u.role}-${u.id}`} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium text-gray-800">{u.prenom} {u.nom}</td>
                          <td className="py-3 px-2 text-gray-600">{u.email}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${ROLE_COLOR[u.role]}`}>
                              {ROLE_LABEL[u.role]}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => handleDelete(u)}
                              className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={4} className="py-8 text-center text-gray-400">Aucun utilisateur.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Onglet Cliniques ── */}
          {activeTab === 'clinics' && <ClinicsTab />}

          {/* ── Onglet Ressources PDF ── */}
          {activeTab === 'resources' && <AdminResources />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function ClinicsTab() {
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/admin/clinics`)
      .then(r => r.json())
      .then(d => setClinics(Array.isArray(d) ? d : []))
      .catch(() => setClinics([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6">Cliniques partenaires</h2>
      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : clinics.length === 0 ? (
        <p className="text-gray-400">Aucune clinique enregistrée.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {clinics.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <p className="font-semibold text-gray-800">{c.nom}</p>
              <p className="text-sm text-gray-500">{c.email}</p>
              {c.adresse && <p className="text-sm text-gray-500">{c.adresse}</p>}
              {c.telephone && <p className="text-sm text-gray-500">{c.telephone}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
