import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  ChevronDown,
  Globe,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { toast } from "react-hot-toast";
import logoUrl from "../../assets/logo-insat.png";
import NotificationPanel from "../common/NotificationPanel";
import Logo from "../common/Logo";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout, role } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const LANG_LABELS: Record<string, string> = { ar: "AR", fr: "FR", en: "EN" };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLangDropdownOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(e.target as Node)
      ) {
        setLangDropdownOpen(false);
      }
    };
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Déconnexion réussie");
    navigate("/");
    setDropdownOpen(false);
  };

  const getDashboardLink = () => {
    if (role === "admin") return "/admin/dashboard";
    if (role === "doctor" || role === "clinic") return "/doctor/dashboard";
    return "/patient/dashboard";
  };

  const initials = user
    ? `${user.nom?.[0] ?? ""}${user.prenom?.[0] ?? ""}`.toUpperCase() || "?"
    : "";

  return (
    <nav className="border-b border-[var(--color-border)] bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center pr-3 py-2" aria-label="Home" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Logo variant="nav" isScrolled={isScrolled} />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-[var(--color-dark)] hover:text-[var(--color-primary)] transition-colors"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {t("nav.home")}
            </Link>
            <Link
              to="/doctors"
              className="text-[var(--color-dark)] hover:text-[var(--color-primary)] transition-colors"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {t("nav.doctors")}
            </Link>
            <Link
              to="/clinics"
              className="text-[var(--color-dark)] hover:text-[var(--color-primary)] transition-colors"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {t("nav.clinics")}
            </Link>
            <Link
              to="/ressources"
              className="text-[var(--color-dark)] hover:text-[var(--color-primary)] transition-colors"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {t("nav.resources", "Ressources")}
            </Link>
            <Link
              to="/about"
              className="text-[var(--color-dark)] hover:text-[var(--color-primary)] transition-colors"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {t("nav.about")}
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setLangDropdownOpen((prev) => !prev)}
                title="Change language"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--insat-border)] text-sm font-bold text-[var(--insat-text-body)] hover:text-[var(--insat-blue)] hover:border-[var(--insat-blue)] hover:bg-[var(--insat-blue-tint)] transition-all uppercase"
              >
                <Globe size={14} />
                {LANG_LABELS[i18n.language] ?? "AR"}
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                  <button
                    onClick={() => changeLanguage("ar")}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${i18n.language === "ar" ? "text-[var(--insat-blue)] font-bold bg-blue-50/50" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    العربية
                  </button>
                  <button
                    onClick={() => changeLanguage("fr")}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${i18n.language === "fr" ? "text-[var(--insat-blue)] font-bold bg-blue-50/50" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    Français
                  </button>
                  <button
                    onClick={() => changeLanguage("en")}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${i18n.language === "en" ? "text-[var(--insat-blue)] font-bold bg-blue-50/50" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    English
                  </button>
                </div>
              )}
            </div>

            {isLoggedIn && user ? (
              <div className="flex items-center gap-3 relative overflow-visible" ref={dropdownRef}>
                <NotificationPanel />
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  {user.profile_picture ? (
                    <img src={user.profile_picture.startsWith('http') ? user.profile_picture : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${user.profile_picture}`} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold">
                      {initials}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user.prenom || user.nom}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-sm font-bold text-gray-800">
                        {user.nom} {user.prenom}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 uppercase">
                        {role}
                      </span>
                    </div>
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User size={16} className="text-[var(--color-primary)]" />
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full"
                    >
                      <LogOut size={16} />
                      {t("nav.out")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-[var(--color-primary)] bg-cyan-50 hover:bg-cyan-100 transition-colors"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] shadow-sm transition-colors"
                >
                  {t("nav.register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
