import { useSearchParams } from 'react-router-dom';
import {
  Calendar, Users, FileBarChart, Settings, Camera, Save, User, Phone,
  Mail, MapPin, GraduationCap, Briefcase, Lock, UploadCloud, Check, X,
  TrendingUp, Clock, AlertCircle, UserPlus, Activity, BarChart2, Building2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import DiagnosticPatient from '../components/diagnostic/DiagnosticPatient';
import MedicalHistoryTimeline from '../components/MedicalHistoryTimeline';
import DMEForm from '../components/DMEForm';
import DiagnosticsRecus from '../components/diagnostic/DiagnosticsRecus';
import GestionDisponibilites from '../components/diagnostic/GestionDisponibilites';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper: build full photo URL (handles relative paths from backend)
const photoUrl = (url?: string | null) =>
  url ? (url.startsWith('http') ? url : `${API_URL}${url}`) : null;

export default function DoctorDashboard() {
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab = rawTab || 'dashboard';
  // Tableau de bord = no tab param (stats only)
  const isDashboard = !rawTab || rawTab === 'dashboard';
  // Rendez-vous tab
  const isRdv = rawTab === 'rdv' || rawTab === 'agenda'; // keep 'agenda' as legacy alias
  const { user } = useAuthStore();

  const [patients, setPatients] = useState<any[]>([]);
  const [timelinePatient, setTimelinePatient] = useState<any | null>(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    pendingAppointments: 0,
    newPatients: 0,
    weeklyActivity: 0,
    weeklyBreakdown: [
      { day: 'Mon', count: 0 },
      { day: 'Tue', count: 0 },
      { day: 'Wed', count: 0 },
      { day: 'Thu', count: 0 },
      { day: 'Fri', count: 0 },
      { day: 'Sat', count: 0 },
    ],
  });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // RDV list for agenda / request management
  const [rdvList, setRdvList] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [rdvLoading, setRdvLoading] = useState(false);
  const [updatingRdv, setUpdatingRdv] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchRdvList = () => {
    if (!user?.id) return;
    setRdvLoading(true);
    fetch(`${API_URL}/rendezvous/therapeute/${user.id}`)
      .then(r => r.json())
      .then(data => setRdvList(Array.isArray(data) ? data : []))
      .catch(() => setRdvList([]))
      .finally(() => setRdvLoading(false));

    fetch(`${API_URL}/paiements`)
      .then(r => r.json())
      .then(data => setPaiements(Array.isArray(data) ? data : []))
      .catch(() => setPaiements([]));
  };

  const handleRdvStatut = async (idRdv: number, statut: string) => {
    setUpdatingRdv(idRdv);
    try {
      const res = await fetch(
        `${API_URL}/rendezvous/${idRdv}/statut?statut=${statut}`,
        { method: 'PATCH' },
      );
      if (!res.ok) throw new Error('Erreur');
      toast.success(statut === 'CONFIRME' ? 'Rendez-vous confirmé' : 'Rendez-vous annulé');
      fetchRdvList();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingRdv(null);
    }
  };

  // Stats + upcoming appointments (always) with real-time polling
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const [statsRes, apptRes] = await Promise.all([
          fetch(`${API_URL}/api/doctor/${user.id}/stats`),
          fetch(`${API_URL}/api/doctor/${user.id}/upcoming-appointments`),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (apptRes.ok) setAppointments(await apptRes.json());
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();

    // Poll every 30 seconds for live updates
    const interval = setInterval(load, 30_000);

    // Also refresh on window focus (user returns to tab)
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id]);

  // Tab-specific data
  useEffect(() => {
    if (tab === 'patients') {
      // Use secure doctor-specific patients endpoint
      fetch(`${API_URL}/patients/doctor/${user?.id}`)
        .then(r => r.json())
        .then(data => setPatients(Array.isArray(data) ? data : []))
        .catch(() => setPatients([]));
    }
    if (isRdv) {
      fetchRdvList();
    }
 
  }, [tab, user?.id]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto w-full">
      <style>{`
        .stat-card {
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(28, 46, 74, 0.08);
          border: 0.5px solid rgba(0, 0, 0, 0.08);
          padding: 20px;
          transition: transform 0.20s ease, box-shadow 0.20s ease;
          cursor: default;
        }
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 24px rgba(74, 144, 217, 0.15);
        }
        .skeleton {
          background: linear-gradient(90deg, #EEF2F7 25%, #DCE6F0 50%, #EEF2F7 75%);
          background-size: 400% 100%;
          animation: shimmer 1.4s ease infinite;
          border-radius: 8px;
          height: 32px;
          width: 80px;
        }
        @keyframes shimmer {
          0%   { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* ══════════════════════════════════════════
          AGENDA / DASHBOARD TAB
      ══════════════════════════════════════════ */}
      {isDashboard && (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="w-10 h-10 rounded-xl bg-[#E8F4FD] text-[#4A90D9] flex items-center justify-center mb-3">
                <Users size={20} strokeWidth={1.5} />
              </div>
              <p className="font-[Poppins] text-[13px] text-[#718096] mb-1">Total patients</p>
              <div className="font-[Poppins] font-semibold text-[28px] text-[#1C2E4A] mb-2">
                {isLoading ? <div className="skeleton" /> : stats.totalPatients}
              </div>
              <div className="flex items-center gap-1 font-[Poppins] text-[12px] text-[#23A06B]">
                <TrendingUp size={14} /> <span>+8 ce mois</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 rounded-xl bg-[#FFF5E6] text-[#F9A826] flex items-center justify-center mb-3">
                <Clock size={20} strokeWidth={1.5} />
              </div>
              <p className="font-[Poppins] text-[13px] text-[#718096] mb-1">RDV en attente</p>
              <div className="font-[Poppins] font-semibold text-[28px] text-[#1C2E4A] mb-2">
                {isLoading ? <div className="skeleton" /> : stats.pendingAppointments}
              </div>
              <div className="flex items-center gap-1 font-[Poppins] text-[12px] text-[#C8861A]">
                <AlertCircle size={14} /> <span>À traiter</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 rounded-xl bg-[#E8FAF2] text-[#38C98A] flex items-center justify-center mb-3">
                <UserPlus size={20} strokeWidth={1.5} />
              </div>
              <p className="font-[Poppins] text-[13px] text-[#718096] mb-1">Nouveaux patients</p>
              <div className="font-[Poppins] font-semibold text-[28px] text-[#1C2E4A] mb-2">
                {isLoading ? <div className="skeleton" /> : stats.newPatients}
              </div>
              <div className="flex items-center gap-1 font-[Poppins] text-[12px] text-[#23A06B]">
                <TrendingUp size={14} /> <span>30 derniers jours</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 rounded-xl bg-[#F0EEFF] text-[#6B5CE7] flex items-center justify-center mb-3">
                <Activity size={20} strokeWidth={1.5} />
              </div>
              <p className="font-[Poppins] text-[13px] text-[#718096] mb-1">Activité patients</p>
              <div className="font-[Poppins] font-semibold text-[28px] text-[#1C2E4A] mb-2">
                {isLoading ? <div className="skeleton" /> : stats.weeklyActivity}
              </div>
              <div className="flex items-center gap-1 font-[Poppins] text-[12px] text-[#6B5CE7]">
                <BarChart2 size={14} /> <span>Cette semaine</span>
              </div>
            </div>
          </div>

          {/* ── Widgets row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upcoming appointments */}
            <div className="stat-card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-[Poppins] font-semibold text-[15px] text-[#1C2E4A]">
                  Prochains rendez-vous
                </h3>
              </div>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="skeleton rounded-full w-9 h-9 flex-shrink-0" />
                      <div className="skeleton w-32 h-4" />
                    </div>
                  ))}
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-0">
                  {appointments.map((appt: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EEF2F7] flex items-center justify-center font-[Poppins] font-semibold text-[12px] text-[#4A5568]">
                          {appt.initials}
                        </div>
                        <div>
                          <div className="font-[Poppins] font-semibold text-[14px] text-[#1C2E4A] leading-tight">
                            {appt.name}
                          </div>
                          <div className="font-[Poppins] text-[12px] text-[#718096]">{appt.time}</div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full font-[Poppins] font-medium text-[12px] ${
                        appt.status === 'PLANIFIE'
                          ? 'bg-[#E8FAF2] text-[#1A8055]'
                          : 'bg-[#F1F5F9] text-[#718096]'
                      }`}>
                        {appt.status === 'PLANIFIE' ? 'Planifié' : 'Terminé'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#718096] font-[Poppins] text-[13px]">
                  Aucun prochain rendez-vous.
                </p>
              )}
            </div>

            {/* Weekly activity */}
            <div className="stat-card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-[Poppins] font-semibold text-[15px] text-[#1C2E4A]">
                  Activité de la semaine
                </h3>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="skeleton w-full h-2 rounded-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.weeklyBreakdown?.map((item: any, i: number) => {
                    const maxCount = Math.max(
                      ...stats.weeklyBreakdown.map((d: any) => d.count),
                      1,
                    );
                    const widthPercent = (item.count / maxCount) * 100;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="font-[Poppins] text-[13px] text-[#718096] w-9">
                          {item.day}
                        </div>
                        <div className="flex-1 h-2 bg-[rgba(0,0,0,0.06)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#38C98A] rounded-full"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                        <div className="font-[Poppins] font-medium text-[13px] text-[#1C2E4A] w-6 text-right">
                          {item.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RDV quick preview (last 4 upcoming only) ── */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[Poppins] font-semibold text-[16px] text-[#1C2E4A] flex items-center gap-2">
                <Calendar size={18} className="text-[var(--color-primary)]" />
                Prochaines demandes
              </h3>
              <a
                href="/doctor/dashboard?tab=rdv"
                className="text-xs text-[var(--color-primary)] font-medium hover:underline"
              >
                Voir tout →
              </a>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="stat-card animate-pulse flex gap-4 items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="stat-card text-center py-8">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="font-[Poppins] text-[13px] text-[#718096]">
                  Aucun rendez-vous à venir.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt: any, i: number) => (
                  <div key={i} className="stat-card flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                      {appt.initials || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-[Poppins] font-semibold text-[14px] text-[#1C2E4A] truncate">
                        {appt.name}
                      </p>
                      <p className="font-[Poppins] text-[12px] text-[#718096]">{appt.time}</p>
                    </div>
                    <span className={`flex-shrink-0 px-3 py-1 rounded-full font-[Poppins] font-medium text-[12px] ${
                      appt.status === 'PLANIFIE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {appt.status === 'PLANIFIE' ? 'En attente' : 'Confirmé'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          PATIENTS TAB
      ══════════════════════════════════════════ */}
      {tab === 'patients' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6 flex items-center gap-2">
            <Users className="text-[var(--color-primary)]" size={22} /> Mes Patients
          </h2>
          {patients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((p: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-4">
                    {photoUrl(p.profile_picture_url) ? (
                      <img
                        src={photoUrl(p.profile_picture_url)!}
                        alt={`${p.prenom} ${p.nom}`}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-lg flex-shrink-0">
                        {p.nom?.[0]}{p.prenom?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">{p.prenom} {p.nom}</p>
                      <p className="text-sm text-gray-500">{p.email}</p>
                    </div>
                  </div>
                  <DiagnosticPatient patientId={p.idpatient || p.idPatient || p.id} />
                  <button
                    onClick={() => setTimelinePatient(p)}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-semibold hover:bg-cyan-50 transition"
                  >
                    <FileBarChart size={16} /> Dossier médical
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Users className="w-14 h-14 text-emerald-200 mx-auto mb-4" />
              <p className="text-gray-500">Votre liste de patients apparaîtra ici.</p>
            </div>
          )}

          {/* Medical history modal */}
          {timelinePatient && (
            <div
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              onClick={() => setTimelinePatient(null)}
            >
              <div
                className="bg-gray-50 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FileBarChart className="text-[var(--color-primary)]" size={20} />
                    Dossier médical — {timelinePatient.prenom} {timelinePatient.nom}
                  </h3>
                  <button onClick={() => setTimelinePatient(null)} className="text-gray-400 hover:text-gray-700">
                    <X size={22} />
                  </button>
                </div>
                <MedicalHistoryTimeline
                  patientId={timelinePatient.idpatient || timelinePatient.idPatient || timelinePatient.id}
                  authorType="doctor"
                  authorId={user?.id}
                  authorName={`Dr. ${user?.prenom || ''} ${user?.nom || ''}`.trim()}
                />
                <div className="mt-6">
                  <DMEForm
                    patientId={timelinePatient.idpatient || timelinePatient.idPatient || timelinePatient.id}
                    role="doctor"
                    uploaderName={`Dr. ${user?.prenom || ''} ${user?.nom || ''}`.trim()}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          RDV TAB - APPOINTMENTS MANAGEMENT  
      ══════════════════════════════════════════ */}
      {isRdv && (() => {
        const isPaid = (rdv: any) => paiements.some((p: any) => (
          (p.idrendezvous == rdv.idrendezvous) || (p.idRendezVous == rdv.idrendezvous) || (p.id_rendezvous == rdv.idrendezvous)
        ) && String(p.statut || '').toLowerCase().replace('é', 'e') === 'valide');

        const now = new Date();

        const filteredRdvList = rdvList
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

            // Both upcoming: soonest first
            if (aFuture && bFuture) return dateA.getTime() - dateB.getTime();
            // Both past: most recent first
            if (!aFuture && !bFuture) return dateB.getTime() - dateA.getTime();
            // Upcoming before past
            return aFuture ? -1 : 1;
          });

        return (
        <div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-[var(--color-dark)] flex items-center gap-2">
              <Calendar className="text-[var(--color-primary)]" size={22} /> 
              Gestion des Rendez-vous
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

          {rdvLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Chargement des rendez-vous...</p>
            </div>
          ) : filteredRdvList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Calendar className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              {(filterDate || filterStatus !== 'ALL') ? (
                <p className="text-gray-500">Aucun rendez-vous ne correspond à ces critères.</p>
              ) : (
                <p className="text-gray-500">Aucune demande de rendez-vous pour le moment.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
              {filteredRdvList.map((rdv: any) => (
                <div key={rdv.idrendezvous} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    {/* Patient Info */}
                    <div className="flex items-center gap-4 flex-1">
                      {photoUrl(rdv.patient_photo_url) ? (
                        <img
                          src={photoUrl(rdv.patient_photo_url)!}
                          alt={`${rdv.patient_prenom} ${rdv.patient_nom}`}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-lg flex-shrink-0">
                          {rdv.patient_prenom?.[0]}{rdv.patient_nom?.[0]}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {rdv.patient_prenom} {rdv.patient_nom}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <Clock size={14} />
                          {new Date(rdv.dateheure).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {rdv.patient_telephone && (
                          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <Phone size={14} />
                            {rdv.patient_telephone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2">
                        {paiements.some((p: any) => (
                          (p.idrendezvous == rdv.idrendezvous) || (p.idRendezVous == rdv.idrendezvous) || (p.id_rendezvous == rdv.idrendezvous)
                        ) && String(p.statut || '').toLowerCase().replace('é', 'e') === 'valide') && (
                          <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Payé
                          </span>
                        )}
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          rdv.statut === 'PLANIFIE' 
                            ? 'bg-amber-100 text-amber-700'
                            : rdv.statut === 'CONFIRME'
                            ? 'bg-green-100 text-green-700'
                            : rdv.statut === 'ANNULE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {rdv.statut === 'PLANIFIE' ? '⏳ En attente' :
                           rdv.statut === 'CONFIRME' ? '✓ Confirmé' :
                           rdv.statut === 'ANNULE' ? '✗ Annulé' :
                           rdv.statut}
                        </span>
                      </div>

                      {rdv.statut === 'PLANIFIE' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRdvStatut(rdv.idrendezvous, 'CONFIRME')}
                            disabled={updatingRdv === rdv.idrendezvous}
                            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            <Check size={16} />
                            Confirmer
                          </button>
                          <button
                            onClick={() => handleRdvStatut(rdv.idrendezvous, 'ANNULE')}
                            disabled={updatingRdv === rdv.idrendezvous}
                            className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            <X size={16} />
                            Annuler
                          </button>
                        </div>
                      )}

                      {updatingRdv === rdv.idrendezvous && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-[var(--color-primary)] rounded-full animate-spin" />
                          Mise à jour...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

      {/* ══════════════════════════════════════════
          OTHER TABS
      ══════════════════════════════════════════ */}
      {tab === 'diagnostics' && <DiagnosticsRecus />}

      {tab === 'dispos' && <GestionDisponibilites />}

      {tab === 'exercises' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6 flex items-center gap-2">
            <FileBarChart className="text-[var(--color-primary)]" size={22} /> Exercices & Ressources
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <FileBarChart className="w-14 h-14 text-emerald-200 mx-auto mb-4" />
            <p className="text-gray-500">Aucun exercice assigné pour l'instant.</p>
          </div>
        </div>
      )}

      {tab === 'profile' && <DoctorProfileInline />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Doctor profile inline component
// ══════════════════════════════════════════════════════════════════════════════

function DoctorProfileInline() {
  const { user, setUser, role } = useAuthStore();
  const [profileParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState(profileParams.get('section') || 'personal');

  // Sync the active section when the URL ?section= changes (e.g. sidebar clicks)
  useEffect(() => {
    const s = profileParams.get('section');
    if (s) setSection(s);
  }, [profileParams]);

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
    adresse: '',
    localisation: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    // Clinics load from a different endpoint with clinic-specific fields
    if (role === 'clinic') {
      fetch(`${API_URL}/cliniques/${user.id}`)
        .then(r => r.json())
        .then(data => {
          console.log('Loaded clinic data:', data);
          setForm(prev => ({
            ...prev,
            nom: data.nom || prev.nom,
            email: data.email || prev.email,
            telephone: data.telephone || '',
            adresse: data.adresse || '',
          }));
        })
        .catch(err => {
          console.error('Failed to load clinic data:', err);
          toast.error('Erreur lors du chargement du profil');
        })
        .finally(() => setLoading(false));
      return;
    }

    const endpoint = `${API_URL}/therapeutes/${user.id}/profile`;
    
    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        console.log('Loaded profile data:', data); // Debug log
        setForm(prev => ({
          ...prev,
          nom: data.nom || prev.nom,
          prenom: data.prenom || prev.prenom,
          email: data.email || prev.email,
          telephone: data.telephone || '',
          sexe: data.sexe || 'Homme',
          diplome: data.diplome || '',
          specialite: data.specialite || prev.specialite,
          anneesExperience: data.annees_experience ? String(data.annees_experience) : '',
          numeroLicence: data.numerolicence || data.numeroLicence || prev.numeroLicence,
          certifications: data.certifications || '',
          langues: data.langues || '',
          typeConsultation: data.type_consultation || 'Hybride',
          tarifConsultation: data.tarifseance != null ? String(data.tarifseance) : 
                           data.tarifSeance != null ? String(data.tarifSeance) : '',
          localisationCabinet: data.localisation_cabinet || '',
          biographie: data.biographie || '',
        }));
      })
      .catch(err => {
        console.error('Failed to load profile data:', err);
        toast.error('Erreur lors du chargement du profil');
      })
      .finally(() => setLoading(false));
  }, [user?.id, role]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La taille du fichier ne peut pas dépasser 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    const endpoint =
      role === 'clinic'
        ? `/cliniques/${user?.id}/profile-picture`
        : role === 'doctor'
        ? `/therapeutes/${user?.id}/profile-picture`
        : `/patients/${user?.id}/profile-picture`;
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      const newUrl = data.profile_picture_url || data.image_url;
      setUser({ ...user!, profile_picture: newUrl });
      toast.success('Photo mise à jour !');
    } catch {
      toast.error("Erreur lors de l'upload");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Clinics have their own fields and endpoint
      if (role === 'clinic') {
        const clinicData: any = {
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          adresse: form.adresse,
        };

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
          clinicData.motDePasse = form.newPassword;
        }

        const res = await fetch(`${API_URL}/cliniques/${user?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clinicData),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Erreur lors de la mise à jour');
        }
        setUser({ ...user!, nom: form.nom, email: form.email });
        setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        toast.success('Profil mis à jour avec succès !');
        setSaving(false);
        return;
      }

      // Prepare profile data: always send the basic fields
      const profileData: any = {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        sexe: form.sexe,
        typeConsultation: form.typeConsultation,
      };

      // Only include optional/enum fields when they are actually filled.
      // (Sending "" to an enum column like specialite_enum causes a DB error.)
      if (form.diplome) profileData.diplome = form.diplome;
      if (form.specialite) profileData.specialite = form.specialite;
      if (form.anneesExperience) profileData.anneesExperience = parseInt(form.anneesExperience);
      if (form.numeroLicence) profileData.numeroLicence = form.numeroLicence;
      if (form.certifications) profileData.certifications = form.certifications;
      if (form.langues) profileData.langues = form.langues;
      if (form.localisationCabinet) profileData.localisationCabinet = form.localisationCabinet;
      if (form.biographie) profileData.biographie = form.biographie;

      // Only include tariff if it's filled
      if (form.tarifConsultation) {
        profileData.tarifSeance = parseFloat(form.tarifConsultation);
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

      const res = await fetch(`${API_URL}/therapeutes/${user?.id}`, {
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
    { id: 'personal',  icon: User,        label: 'Général'     },
    { id: 'academic',  icon: GraduationCap, label: 'Académique' },
    { id: 'work',      icon: Briefcase,   label: 'Travail'     },
    { id: 'documents', icon: UploadCloud, label: 'Documents'   },
    { id: 'security',  icon: Lock,        label: 'Sécurité'    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-dark)] mb-6 flex items-center gap-2">
        <Settings className="text-[var(--color-primary)]" size={22} /> Mon Profil Psychothérapeute
      </h2>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 animate-pulse">
          Chargement des données du profil...
        </div>
      ) : (
        <>
          {/* Avatar / name card */}
          <div className="flex items-center gap-5 mb-6 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <label className="relative group cursor-pointer block w-24 h-24 rounded-full border-[3px] border-white shadow-[0_2px_12px_rgba(28,46,74,0.12)] overflow-hidden flex-shrink-0">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture.startsWith('http') ? user.profile_picture : `${API_URL}${user.profile_picture}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.nom?.[0]}{role !== 'clinic' ? (user?.prenom?.[0] ?? '') : ''}
                </div>
              )}
              <div className="absolute inset-0 bg-[#1C2E4A]/55 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white mb-1" />
                <span className="font-[Poppins] font-medium text-[11px] text-white">Changer</span>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </label>
            <div>
              <p className="text-lg font-bold text-[var(--color-dark)]">
                {role === 'doctor' ? 'Dr. ' : ''}{user?.prenom} {user?.nom}
              </p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                {role === 'clinic' ? 'Clinique' : 'Psychothérapeute'}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Section nav (hidden for clinics — they navigate via the left sidebar) */}
            {role !== 'clinic' && (
            <div className="md:w-44 flex-shrink-0">
              <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col gap-1">
                {SECTIONS.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setSection(id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
                      section === id
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </nav>
            </div>
            )}

            {/* Section content */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {section === 'personal' && role === 'clinic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <F label="Nom de la clinique" name="nom" value={form.nom} onChange={handleChange} icon={<Building2 size={15} />} />
                  </div>
                  <F label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} icon={<Phone size={15} />} />
                  <F label="Email" name="email" value={form.email} onChange={handleChange} icon={<Mail size={15} />} type="email" />
                  <div className="md:col-span-2">
                    <F label="Adresse" name="adresse" value={form.adresse} onChange={handleChange} icon={<MapPin size={15} />} />
                  </div>
                </div>
              )}

              {section === 'personal' && role !== 'clinic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <F label="Nom"      name="nom"       value={form.nom}       onChange={handleChange} icon={<User size={15} />} />
                  <F label="Prénom"   name="prenom"    value={form.prenom}    onChange={handleChange} icon={<User size={15} />} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                    <select
                      name="sexe"
                      value={form.sexe}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    >
                      <option>Homme</option>
                      <option>Femme</option>
                      <option>Autre</option>
                    </select>
                  </div>
                  <F label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} icon={<Phone size={15} />} />
                  <div className="md:col-span-2">
                    <F label="Email" name="email" value={form.email} onChange={handleChange} icon={<Mail size={15} />} type="email" />
                  </div>
                </div>
              )}

              {section === 'academic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <F label="Diplôme"            name="diplome"          value={form.diplome}          onChange={handleChange} icon={<GraduationCap size={15} />} />
                  <F label="Spécialisation"     name="specialite"       value={form.specialite}       onChange={handleChange} />
                  <F label="Années d'expérience" name="anneesExperience" value={form.anneesExperience} onChange={handleChange} type="number" />
                  <F label="Numéro d'agrément"  name="numeroLicence"    value={form.numeroLicence}    onChange={handleChange} />
                  <div className="md:col-span-2">
                    <F label="Certifications" name="certifications" value={form.certifications} onChange={handleChange} />
                  </div>
                  <div className="md:col-span-2">
                    <F label="Langues parlées" name="langues" value={form.langues} onChange={handleChange} />
                  </div>
                </div>
              )}

              {section === 'work' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de consultation
                    </label>
                    <select
                      name="typeConsultation"
                      value={form.typeConsultation}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    >
                      <option>En ligne</option>
                      <option>En cabinet</option>
                      <option>Hybride</option>
                    </select>
                  </div>
                  <F label="Tarif (DA)" name="tarifConsultation" value={form.tarifConsultation} onChange={handleChange} type="number" />
                  <div className="md:col-span-2">
                    <F label="Localisation" name="localisationCabinet" value={form.localisationCabinet} onChange={handleChange} icon={<MapPin size={15} />} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Biographie</label>
                    <textarea
                      name="biographie"
                      value={form.biographie}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    />
                  </div>
                </div>
              )}

              {section === 'documents' && (
                <div className="space-y-4">
                  {([
                    ['Diplôme Universitaire', 'validated'],
                    ["Agrément / Licence", 'pending'],
                    ["Pièce d'identité", 'missing'],
                  ] as [string, string][]).map(([label, status]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-800">{label}</p>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                            status === 'validated'
                              ? 'bg-green-100 text-green-700'
                              : status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {status === 'validated'
                            ? '✓ Validé'
                            : status === 'pending'
                            ? '⏳ En attente'
                            : '✗ Manquant'}
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

              {section === 'security' && (
                <div className="space-y-4">
                  <F label="Mot de passe actuel"  name="currentPassword" value={form.currentPassword} onChange={handleChange} type="password" icon={<Lock size={15} />} />
                  <F label="Nouveau mot de passe" name="newPassword"      value={form.newPassword}      onChange={handleChange} type="password" icon={<Lock size={15} />} />
                  <F label="Confirmer"             name="confirmPassword"  value={form.confirmPassword}  onChange={handleChange} type="password" icon={<Lock size={15} />} />
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-secondary)] disabled:opacity-60 transition-all"
                >
                  <Save size={16} />
                  {saving ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Generic input field helper ────────────────────────────────────────────────
function F({
  label,
  name,
  value,
  onChange,
  icon,
  type = 'text',
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-3.5 text-gray-400">{icon}</span>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm`}
        />
      </div>
    </div>
  );
}
