import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../components/common/Logo";
import { useTranslation } from "react-i18next";
import { User, Briefcase, Building2, ArrowRight } from "lucide-react";
import PatientRegistration from "../components/auth/PatientRegistration";
import DoctorRegistration from "../components/auth/DoctorRegistration";
import ClinicRegistration from "../components/auth/ClinicRegistration";

export default function Register() {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<
    "patient" | "doctor" | "clinic" | ""
  >("");

  const handleRoleSelect = (role: "patient" | "doctor" | "clinic") => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedRole("");
  };

  const roles = [
    {
      id: "patient",
      icon: User,
      title: t("register.patient"),
      desc: t("register.patient_desc"),
      color: "#1D9E75",
    },
    {
      id: "doctor",
      icon: Briefcase,
      title: t("register.doctor"),
      desc: t("register.doctor_desc"),
      color: "#7F77DD",
    },
    {
      id: "clinic",
      icon: Building2,
      title: t("register.clinic"),
      desc: t("register.clinic_desc"),
      color: "#EF9F27",
    },
  ];

  // STEP 1 - ROLE SELECTION (same style as SignupPage)
  if (step === 1) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-page)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex mb-5" aria-label="Home">
              <Logo variant="auth" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
              {t("register.title")}
            </h1>
            <p className="text-[var(--text-secondary)]">
              {t("register.subtitle")}{" "}
              <Link
                to="/login"
                className="text-[var(--color-primary)] font-semibold no-underline hover:underline"
              >
                {t("register.loginLink")}
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {roles.map((r) => (
              <motion.button
                key={r.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleRoleSelect(r.id as any)}
                className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-default)] hover:border-[var(--color-primary)]
                            hover:shadow-lg transition-all duration-200"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${r.color}15` }}
                >
                  <r.icon className="w-6 h-6" style={{ color: r.color }} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {r.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {r.desc}
                  </p>
                </div>

                <ArrowRight
                  className="w-5 h-5 ml-auto md:hidden"
                  style={{ color: r.color }}
                />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // STEP 2 - FORM (same style container as SignupPage)
  return (
    <div className="min-h-[100dvh] bg-[var(--bg-page)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg flex flex-col min-h-[100dvh] md:min-h-0"
      >
        {/* ── Page header ── */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex mb-5" aria-label="Home">
            <Logo variant="auth" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
            {t("register.title")}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {t("register.subtitle")}{" "}
            <Link
              to="/login"
              className="text-[var(--color-primary)] font-semibold no-underline hover:underline"
            >
              {t("register.loginLink")}
            </Link>
          </p>
        </div>

        {/* Form Card */}
        <div className="flex-1 bg-[var(--bg-card)] md:rounded-2xl md:shadow-xl md:border md:border-[var(--border-default)] px-5 pt-6 pb-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {selectedRole === "patient" && (
                <PatientRegistration onBack={handleBack} />
              )}
              {selectedRole === "doctor" && (
                <DoctorRegistration onBack={handleBack} />
              )}
              {selectedRole === "clinic" && (
                <ClinicRegistration onBack={handleBack} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
