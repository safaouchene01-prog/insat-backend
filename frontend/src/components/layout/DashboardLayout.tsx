import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

import { toast } from 'react-hot-toast';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, CalendarDays, FileText, Activity, Clock,
  Users, Settings, LogOut, ChevronRight,
  Building2, Bot, User, GraduationCap, Briefcase, UploadCloud, Lock,
  BarChart2
} from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PATIENT_NAV = [
  { icon: LayoutDashboard, label: 'Tableau de bord', href: '/patient/dashboard' },
  { icon: Calendar,        label: 'Mes Rendez-vous',  href: '/patient/dashboard?tab=rdv' },
  { icon: FileText,        label: 'Mon Dossier DME',  href: '/patient/dashboard?tab=dme' },
  { icon: Clock,           label: 'Historique',        href: '/patient/dashboard?tab=history' },
  { icon: Activity,        label: 'Questionnaires',    href: '/patient/dashboard?tab=quiz' },
  { icon: UploadCloud,     label: 'Ressources',        href: '/resources' },
  { icon: Settings,        label: 'Mon Profil',        href: '/patient/dashboard?tab=profile' },
];

const DOCTOR_NAV = [
  { icon: LayoutDashboard, label: 'Tableau de bord',   href: '/doctor/dashboard' },
  { icon: Calendar,        label: 'Rendez-vous',        href: '/doctor/dashboard?tab=rdv' },
  { icon: Users,           label: 'Mes Patients',       href: '/doctor/dashboard?tab=patients' },
  { icon: CalendarDays,    label: 'Mes disponibilités', href: '/doctor/dashboard?tab=dispos' },
  { icon: Bot,             label: 'Assistant IA',       href: '/ai' },
  { icon: Settings,        label: 'Mon Profil',         href: '/doctor/dashboard?tab=profile' },
];

const CLINIC_NAV = [
  { icon: User,         label: 'Général',     href: '/doctor/dashboard?tab=profile&section=personal' },
  { icon: GraduationCap, label: 'Académique', href: '/doctor/dashboard?tab=profile&section=academic' },
  { icon: Briefcase,    label: 'Travail',     href: '/doctor/dashboard?tab=profile&section=work' },
  { icon: UploadCloud,  label: 'Documents',   href: '/doctor/dashboard?tab=profile&section=documents' },
  { icon: Lock,         label: 'Sécurité',    href: '/doctor/dashboard?tab=profile&section=security' },
];

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Tableau de bord', href: '/admin/dashboard' },
  { icon: BarChart2,       label: 'Statistiques',     href: '/admin/dashboard?tab=stats' },
  { icon: Users,           label: 'Utilisateurs',     href: '/admin/dashboard?tab=users' },
  { icon: Building2,       label: 'Cliniques',        href: '/admin/dashboard?tab=clinics' },
  { icon: FileText,        label: 'Ressources PDF',   href: '/admin/dashboard?tab=resources' },
];

export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems =
    role === 'admin' ? ADMIN_NAV :
    role === 'doctor' || role === 'clinic' ? (role === 'clinic' ? CLINIC_NAV : DOCTOR_NAV)
    : PATIENT_NAV;

  const roleLabel =
    role === 'patient' ? 'Patient' :
    role === 'doctor'  ? 'Psychothérapeute' :
    role === 'clinic'  ? 'Clinique' :
    role === 'admin'   ? 'Administrateur' : '';

  const roleColor =
    role === 'patient' ? 'from-cyan-500 to-teal-600' :
    role === 'doctor'  ? 'from-emerald-500 to-teal-600' :
    role === 'admin'   ? 'from-slate-700 to-slate-900' :
                         'from-orange-500 to-amber-600';

  const handleLogout = async () => {
    logout();
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const initials = user
    ? `${user.nom?.[0] ?? ''}${user.prenom?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';

  return (
    <div className="flex flex-1 bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col bg-white border-r border-gray-100 shadow-sm
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64' : 'w-[72px]'}
          flex-shrink-0 relative z-30
        `}
        style={{ animation: 'slideInLeft 0.4s ease-out' }}
      >
       <div className="flex items-center justify-between px-3 pt-3">
   <button
    onClick={() => setSidebarOpen(!sidebarOpen)}
    className="p-2 rounded-lg hover:bg-gray-100 transition"
  >
    <div className="flex flex-col gap-[3px]">
      <span className="w-5 h-[2px] bg-gray-700"></span>
      <span className="w-5 h-[2px] bg-gray-700"></span>
      <span className="w-5 h-[2px] bg-gray-700"></span>
    </div>
  </button>
</div>

        {/* User card */}
        <div className={`mx-3 my-4 rounded-2xl bg-gradient-to-br ${roleColor} p-4 text-white overflow-hidden flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture.startsWith('http') ? user.profile_picture : `${API_URL}${user.profile_picture}`}
                  alt={initials}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="font-bold truncate text-sm">{user?.prenom} {user?.nom}</p>
                <p className="text-white/70 text-xs">{roleLabel}</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {navItems.map(({ icon: Icon, label, href }) => {
            const [hrefPath, hrefQuery] = href.split('?');
            const hrefParams = hrefQuery ? new URLSearchParams(hrefQuery) : null;
            const hrefTab = hrefParams ? hrefParams.get('tab') : null;
            const hrefSection = hrefParams ? hrefParams.get('section') : null;
            const currentParams = new URLSearchParams(location.search);
            const currentTab = currentParams.get('tab');
            const currentSection = currentParams.get('section');

            const isActive = hrefSection
              ? location.pathname === hrefPath && currentTab === hrefTab && currentSection === hrefSection
              : hrefTab
              ? location.pathname === hrefPath && currentTab === hrefTab && !currentSection
              : location.pathname === hrefPath && !currentTab;
            return (
              <Link
                key={href}
                to={href}
                title={!sidebarOpen ? label : undefined}
                className={`
                  sidebar-nav-item group relative
                  flex items-center gap-3 px-3 py-2.5 rounded-xl
                  ${isActive ? 'active' : ''}
                  ${!sidebarOpen ? 'justify-center !px-0' : ''}
                `}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {sidebarOpen && isActive && (
                  <ChevronRight size={14} className="ml-auto opacity-60" />
                )}
                {/* Tooltip when collapsed */}
                {!sidebarOpen && (
                  <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className={`px-3 pb-4 border-t border-gray-100 pt-3 ${!sidebarOpen ? 'flex justify-center' : ''}`}>
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Se déconnecter' : undefined}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl w-full
              text-red-500 hover:bg-red-50 transition-colors text-sm font-medium
              ${!sidebarOpen ? 'justify-center' : ''}
            `}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {sidebarOpen && <span>Se déconnecter</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">


        {/* Page content with fade-in */}
        <main className="flex-1 overflow-y-auto">
  {children || <Outlet />}
</main>
      </div>

      {/* Keyframe animations (injected via style tag) */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideInDown {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
