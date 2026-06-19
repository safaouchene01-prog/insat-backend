import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const DASHBOARD_MAP: Record<string, string> = {
  patient: '/patient/dashboard',
  doctor:  '/doctor/dashboard',
  clinic:  '/doctor/dashboard',  // Clinics use doctor dashboard
  admin: '/admin/dashboard',
};

/** Redirects logged-in users away from guest-only pages (home, login, register) */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role } = useAuthStore();
  if (isLoggedIn) {
    const dest = DASHBOARD_MAP[role ?? 'patient'] ?? '/patient/dashboard';
    return <Navigate to={dest} replace />;
  }
  return <>{children}</>;
}

/** Redirects logged-out users to /login */
export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
