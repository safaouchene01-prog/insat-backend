import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Shield,
  Clock,
  Languages,
  Database,
  Star,
  MapPin,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Video,
} from "lucide-react";
import heroImg from "../assets/hero.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper: construit l'URL complète d'une photo (gère les chemins relatifs du backend)
const photoUrl = (url?: string | null) =>
  url ? (url.startsWith("http") ? url : `${API_URL}${url}`) : null;

export default function Home() {
  const { t } = useTranslation();
  const [featuredDoctors, setFeaturedDoctors] = useState<any[]>([]);
  const [featuredClinics, setFeaturedClinics] = useState<any[]>([]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/therapeutes/`)
      .then((r) => r.json())
      .then((data) =>
        setFeaturedDoctors(Array.isArray(data) ? data.slice(0, 3) : []),
      )
      .catch(() => setFeaturedDoctors([]));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/cliniques/`)
      .then((r) => r.json())
      .then((data) =>
        setFeaturedClinics(Array.isArray(data) ? data.slice(0, 3) : []),
      )
      .catch(() => setFeaturedClinics([]));
  }, []);

  const faqs = [
    { q: t('home.faq.q1'), a: t('home.faq.a1') },
    { q: t('home.faq.q2'), a: t('home.faq.a2') },
    { q: t('home.faq.q3'), a: t('home.faq.a3') },
    { q: t('home.faq.q4'), a: t('home.faq.a4') },
    { q: t('home.faq.q5'), a: t('home.faq.a5') },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Hero */}
      <section className="relative w-full bg-gradient-to-br from-cyan-50 to-white pt-24 pb-32 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-accent)] leading-tight mb-6">
                {t("home.hero.title1")}{" "}
                <span className="text-[var(--color-primary)]">
                  {t("home.hero.title2")}
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                {t("home.hero.desc")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/doctors"
                  className="inline-flex justify-center items-center px-8 py-4 border border-transparent text-lg font-medium rounded-2xl text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] shadow-lg shadow-cyan-200 transition-all transform hover:-translate-y-1"
                >
                  {t("home.hero.btn1")}
                </Link>
                <Link
                  to="/clinics"
                  className="inline-flex justify-center items-center px-8 py-4 border-2 border-[var(--color-primary)] text-lg font-medium rounded-2xl text-[var(--color-primary)] bg-transparent hover:bg-cyan-50 transition-all"
                >
                  {t("home.hero.btn2")}
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:block">
              {/* Hero Image */}
              <div className="aspect-[4/3] rounded-[2rem] bg-gradient-to-tr from-cyan-100 to-teal-50 overflow-hidden shadow-2xl relative">
                <img src={heroImg} alt="INSAT Digital Health Platform" className="absolute inset-0 w-full h-full object-cover" />
              </div>

              {/* Floating stats card */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex gap-6">
                <div>
                  <p className="text-3xl font-bold text-[var(--color-primary)]">
                    60+
                  </p>
                  <p className="text-sm text-gray-500 font-medium">
                    {t("home.stats.specialists")}
                  </p>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div>
                  <p className="text-3xl font-bold text-[var(--color-primary)]">
                    98%
                  </p>
                  <p className="text-sm text-gray-500 font-medium">
                    {t("home.stats.satisfaction")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-cyan-100/50 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-teal-50 rounded-full blur-3xl -z-10"></div>
      </section>

      {/* Featured Doctors */}
      <section className="py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-[var(--color-accent)] mb-4">
                {t("home.doctors.title")}
              </h2>

              <p className="text-gray-600">{t("home.doctors.subtitle")}</p>
            </div>
            <Link
              to="/doctors"
              className="hidden sm:inline-flex text-[var(--color-primary)] font-bold hover:text-[var(--color-secondary)]"
            >
              {t("home.doctors.viewAll")} &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredDoctors.length > 0
              ? featuredDoctors.map((doctor: any) => (
                  <div
                    key={doctor.idtherapeute}
                    className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {photoUrl(doctor.profile_picture_url || doctor.profile_picture) ? (
                          <img
                            src={photoUrl(doctor.profile_picture_url || doctor.profile_picture)!}
                            alt={`${doctor.nom} ${doctor.prenom}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-cyan-800">
                            {doctor.nom?.[0]}
                            {doctor.prenom?.[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[var(--color-dark)]">
                          Dr. {doctor.nom} {doctor.prenom}
                        </h3>
                        <span className="inline-block px-2 py-1 bg-cyan-50 text-[var(--color-primary)] text-xs font-semibold rounded-lg mt-1">
                          {doctor.specialite || "Spécialiste"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center text-sm text-gray-600">
                        <Star className="w-4 h-4 text-amber-400 mr-2" />
                        <span>{doctor.notemoyenne || "Nouveau"}</span>
                        {doctor.tarifseance && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="font-medium text-[var(--color-primary)]">
                              {doctor.tarifseance} DA
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{doctor.ville || "Algérie"}</span>
                      </div>
                    </div>
                    <Link
                      to={`/doctors/${doctor.idtherapeute}`}
                      className="block w-full text-center py-3 bg-cyan-50 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-white font-medium rounded-xl transition-colors"
                    >
                      Réserver
                    </Link>
                  </div>
                ))
              : Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm opacity-50"
                    >
                      <p className="text-center text-gray-500 py-8">
                        Spécialiste {i + 1} (Exemple)
                      </p>
                    </div>
                  ))}
          </div>
        </div>
      </section>

      {/* Featured Clinics */}
      <section className="py-24 bg-[var(--color-muted)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* HEADER */}
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-[var(--color-accent)] mb-4">
                {t("home.clinics.title")}
              </h2>

              <p className="text-gray-600">{t("home.clinics.subtitle")}</p>
            </div>

            <Link
              to="/clinics"
              className="hidden sm:inline-flex text-[var(--color-primary)] font-bold hover:text-[var(--color-secondary)]"
            >
              {t("home.clinics.viewAll")} &rarr;
            </Link>
          </div>

          {/* CLINICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredClinics.length > 0
              ? featuredClinics.map((clinic: any) => (
                  <div
                    key={clinic.idclinique}
                    className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* TOP */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* LOGO / INITIAL */}
                      <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {photoUrl(clinic.profile_picture_url || clinic.logoUrl) ? (
                          <img
                            src={photoUrl(clinic.profile_picture_url || clinic.logoUrl)!}
                            alt={clinic.nom}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-cyan-800">
                            {clinic.nom?.[0]}
                          </span>
                        )}
                      </div>

                      {/* INFO */}
                      <div>
                        <h3 className="text-lg font-bold text-[var(--color-dark)]">
                          {clinic.nom}
                        </h3>

                        <span className="inline-block px-2 py-1 bg-cyan-50 text-[var(--color-primary)] text-xs font-semibold rounded-lg mt-1">
                          Clinique partenaire
                        </span>
                      </div>
                    </div>

                    {/* DETAILS */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center text-sm text-gray-600">
                        <Star className="w-4 h-4 text-amber-400 mr-2" />
                        <span>{clinic.notemoyenne || "Nouveau"}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{clinic.ville || "Algérie"}</span>
                      </div>
                    </div>

                    {/* BUTTON */}
                    <Link
                      to={`/clinics/${clinic.idclinique}`}
                      className="block w-full text-center py-3 bg-cyan-50 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-white font-medium rounded-xl transition-colors"
                    >
                      Voir la clinique
                    </Link>
                  </div>
                ))
              : Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm opacity-50"
                    >
                      <p className="text-center text-gray-500 py-8">
                        Clinique {i + 1} (Exemple)
                      </p>
                    </div>
                  ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title + subtitle */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-accent)] mb-4">
              {t("home.why.title")}
            </h2>

            <p className="text-gray-600 text-lg">{t("home.why.subtitle")}</p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={
                <Languages className="w-8 h-8 text-[var(--color-primary)]" />
              }
              title={t("home.why.features.multilingual.title")}
              desc={t("home.why.features.multilingual.desc")}
            />

            <FeatureCard
              icon={<Clock className="w-8 h-8 text-[var(--color-primary)]" />}
              title={t("home.why.features.available.title")}
              desc={t("home.why.features.available.desc")}
            />

            <FeatureCard
              icon={
                <Database className="w-8 h-8 text-[var(--color-primary)]" />
              }
              title={t("home.why.features.cloud.title")}
              desc={t("home.why.features.cloud.desc")}
            />

            <FeatureCard
              icon={<Shield className="w-8 h-8 text-[var(--color-primary)]" />}
              title={t("home.why.features.security.title")}
              desc={t("home.why.features.security.desc")}
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-[var(--color-primary)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl font-bold mb-12 text-center">
            {t("home.testimonials.title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { text: t('home.testimonials.t1'), name: t('home.testimonials.t1_name') },
              { text: t('home.testimonials.t2'), name: t('home.testimonials.t2_name') },
              { text: t('home.testimonials.t3'), name: t('home.testimonials.t3_name') },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-[2rem] p-8 border border-white/20">
                <div className="flex text-amber-300 mb-4">{Array(5).fill(0).map((_, j) => <Star key={j} size={20} className="fill-current" />)}</div>
                <p className="text-lg leading-relaxed mb-6">"{item.text}"</p>
                <div className="font-bold">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER (INSAT STYLE - REVERSED) ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* subtle background decoration */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--color-primary)_1px,_transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="rounded-[2.5rem] p-10 md:p-16 text-center shadow-2xl bg-[var(--color-primary)] text-white">
            {/* eyebrow */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                {t("cta.eyebrow")}
              </div>
            </div>

            {/* title */}
            <h2 className="text-2xl md:text-4xl font-bold mt-4 mb-4">
              {t("cta.title")}
            </h2>

            {/* description */}
            <p className="text-white/70 text-sm md:text-base max-w-xl mx-auto mb-10">
              {t("cta.desc")}
            </p>

            {/* features */}
            <div className="flex flex-wrap justify-center gap-5 mb-8">
              {[
                { icon: ShieldCheck, text: t("cta.verifiedDoctors") },
                { icon: Clock, text: t("cta.instantBooking") },
                { icon: Video, text: t("cta.onlineConsult") },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 text-sm text-white/80"
                >
                  <Icon className="w-4 h-4 text-white" />
                  {text}
                </div>
              ))}
            </div>

            {/* buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/doctors"
                className="px-8 py-4 rounded-2xl bg-white text-[var(--color-primary)] font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2"
              >
                {t("cta.btn")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--insat-text-heading)] mb-4">{t('home.faq.title')}</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="card overflow-hidden">
                <button onClick={() => setActiveFaq(activeFaq === index ? null : index)} className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-[var(--insat-page-bg)] transition-colors">
                  <span className="font-bold text-[var(--insat-text-heading)]">{faq.q}</span>
                  {activeFaq === index ? <ChevronUp className="text-[var(--insat-blue)] flex-shrink-0" /> : <ChevronDown className="text-[var(--insat-text-hint)] flex-shrink-0" />}
                </button>
                {activeFaq === index && <div className="px-6 pb-6 pt-2 text-[var(--insat-text-body)] leading-relaxed bg-white">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-8 border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow group">
      <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-[var(--color-dark)] mb-3">
        {title}
      </h3>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}
