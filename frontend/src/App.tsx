import { Suspense, lazy, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom';

import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import DashboardLayout from './components/layout/DashboardLayout';

import {
  GuestRoute,
  PrivateRoute,
} from './components/common/RouteGuards';

import ScrollToTop from './components/common/ScrollToTop';

// @ts-ignore
import Chatbot from './components/Chatbot/Chatbot';

import { useAuthStore } from './store/authStore';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Doctors = lazy(() => import('./pages/Doctors'));
const DoctorProfile = lazy(() => import('./pages/DoctorProfile'));
const Clinics = lazy(() => import('./pages/Clinics'));
const ClinicProfile = lazy(() => import('./pages/ClinicProfile'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Resources = lazy(() => import('./pages/Resources'));
const PublicResources = lazy(() => import('./pages/PublicResources'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentFailure = lazy(() => import('./pages/PaymentFailure'));
const Checkout = lazy(() => import('./pages/Checkout'));

const spinner = (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
  </div>
);

function AppInner() {
  const { t } = useTranslation();

  const { user } = useAuthStore();

  const [isChatOpen, setIsChatOpen] = useState(false);

  const canUseChatbot =
    user?.role === 'patient';

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)] text-[var(--color-dark)]">
      <Navbar />

      <main className="flex-1 flex flex-col min-h-0">
        <Suspense fallback={spinner}>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />

            <Route
              path="/register"
              element={
                <GuestRoute>
                  <Register />
                </GuestRoute>
              }
            />

            <Route path="/about" element={<About />} />
            <Route path="/ressources" element={<PublicResources />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:id" element={<DoctorProfile />} />
            <Route path="/clinics" element={<Clinics />} />
            <Route path="/clinics/:id" element={<ClinicProfile />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            <Route path="/checkout" element={<Checkout />} />

            <Route
              path="/patient/dashboard/*"
              element={
                <PrivateRoute>
                  <DashboardLayout>
                    <PatientDashboard />
                  </DashboardLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/doctor/dashboard/*"
              element={
                <PrivateRoute>
                  <DashboardLayout>
                    <DoctorDashboard />
                  </DashboardLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/admin/dashboard/*"
              element={
                <PrivateRoute>
                  <DashboardLayout>
                    <AdminDashboard />
                  </DashboardLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/resources"
              element={
                <PrivateRoute>
                  <DashboardLayout>
                    <Resources />
                  </DashboardLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/ai"
              element={
                <PrivateRoute>
                  <DashboardLayout>
                    <AIAssistant />
                  </DashboardLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="*"
              element={
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                  <h1 className="text-4xl font-bold">404</h1>
                  <p>{t('errors.notFound')}</p>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>

      <Footer />

      <Toaster position="top-center" />

      {/* Floating Chatbot */}
      {canUseChatbot && (
        <>
          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className="fixed bottom-6 right-6 z-[9999] w-16 h-16 rounded-full bg-[var(--color-primary)] text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-all"
          >
            <MessageCircle size={28} />
          </button>

          <AnimatePresence>
            {isChatOpen && (
              <Chatbot
                patientId={user?.id}
                agentId={1}
                onClose={() => setIsChatOpen(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppInner />
    </BrowserRouter>
  );
}
