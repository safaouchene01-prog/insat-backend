import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  UploadCloud,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DoctorRegistration({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [degreeFile, setDegreeFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const { t } = useTranslation();

  const doctorSchema = z
  .object({
    nom: z.string().min(2, "Nom requis"),
    prenom: z.string().min(2, "Prénom requis"),
    sexe: z.enum(["Homme", "Femme", "Autre"]).optional(),
    email: z.string().email("Email invalide"),
    telephone: z.string().min(8, "Téléphone requis"),
    diplome: z.string().min(2, "Diplôme requis"),
    specialite: z.string().min(2, "Spécialité requise"),
    anneesExperience: z.number().min(0, "Expérience requise"),
    numeroLicence: z.string().min(2, "Numéro d'agrément requis"),
    certifications: z.string().optional(),
    langues: z.string().min(2, "Langues requises"),
    typeConsultation: z.enum(["En ligne", "En cabinet", "Hybride"]),
    tarifConsultation: z.number().min(0, "Tarif requis"),
    localisationCabinet: z.string().min(2, "Localisation requise"),
    biographie: z.string().min(10, "Biographie courte requise"),
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type DoctorForm = z.infer<typeof doctorSchema>;

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<DoctorForm>({
    resolver: zodResolver(doctorSchema),
    mode: "onTouched",
    defaultValues: {
      sexe: undefined,
      typeConsultation: "Hybride",
      anneesExperience: 0,
      tarifConsultation: 3000,
    },
  });

  const watchedFields = watch([
    "nom",
    "prenom",
    "telephone",
    "email",
    "password",
    "confirmPassword",
    "diplome",
    "specialite",
    "anneesExperience",
    "numeroLicence",
    "langues",
  ]);
  const [
    nom,
    prenom,
    telephone,
    email,
    password,
    confirmPassword,
    diplome,
    specialite,
    anneesExperience,
    numeroLicence,
    langues,
  ] = watchedFields;

  const nextStep = async () => {
    let fields: (keyof DoctorForm)[] = [];
    if (currentStep === 1)
      fields = [
        "nom",
        "prenom",
        "telephone",
        "email",
        "password",
        "confirmPassword",
      ];
    if (currentStep === 2)
      fields = [
        "diplome",
        "specialite",
        "anneesExperience",
        "numeroLicence",
        "langues",
      ];
    const valid = await trigger(fields);

    if (!valid) {
      toast.error(t("register.fillAllFields"));
      return;
    }
    setCurrentStep((p) => p + 1);
  };

  const onSubmit = async (data: DoctorForm) => {
    if (!degreeFile || !licenseFile || !idFile) {
      toast.error(t("register.uploadDocs"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register/doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          motDePasse: data.password,
          specialite: data.specialite,
          numeroLicence: data.numeroLicence,
          tarifSeance: data.tarifConsultation,
          // Additional profile fields
          sexe: data.sexe,
          telephone: data.telephone,
          diplome: data.diplome,
          anneesExperience: data.anneesExperience,
          certifications: data.certifications,
          langues: data.langues,
          typeConsultation: data.typeConsultation,
          localisationCabinet: data.localisationCabinet,
          biographie: data.biographie,
          role: "doctor",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || t("register.creationError"));
      }

      toast.success(
        t("register.successMessageDocComplete") || "Compte thérapeute créé avec succès ! Votre profil complet a été sauvegardé.",
      );
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-gray-500 hover:text-[var(--color-primary)]"
        >
          &larr; {t("register.changeRole")}
        </button>
        <div className="ml-auto">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 uppercase">
            {t("register.doctor")}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between relative mb-8 px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--color-primary)] -z-10 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
        />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${currentStep > i ? "bg-[var(--color-primary)] text-white" : currentStep === i ? "bg-[var(--color-primary)] text-white ring-4 ring-cyan-100" : "bg-gray-200 text-gray-400"}`}
          >
            {currentStep > i ? <Check size={20} /> : i}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ÉTAPE 1 — Infos générales */}
        {currentStep === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-gray-50 p-6 rounded-2xl mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <Briefcase className="mr-2" size={20} /> {t("register.genInfo")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.nom")} *
                  </label>
                  <input
                    {...register("nom")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.nom && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.nom.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.prenom")} *
                  </label>
                  <input
                    {...register("prenom")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.prenom && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.prenom.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.sex")}
                  </label>
                  <select
                    {...register("sexe")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  >
                    <option value="">{t("register.unspecified")}</option>
                    <option value="Homme">{t("register.male")}</option>
                    <option value="Femme">{t("register.female")}</option>
                    <option value="Autre">{t("register.other")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.phone")} *
                  </label>
                  <div className="mt-1 relative">
                    <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      {...register("telephone")}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl"
                    />
                  </div>
                  {errors.telephone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.telephone.message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.officialEmail")} *
                  </label>
                  <div className="mt-1 relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      {...register("email")}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      ⚠ {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("register.photo")}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-[var(--color-primary)] hover:file:bg-cyan-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.password")} *
                  </label>
                  <input
                    type="password"
                    {...register("password")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.confirmPw")} *
                  </label>
                  <input
                    type="password"
                    {...register("confirmPassword")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={nextStep}
              disabled={
                !nom ||
                !prenom ||
                !telephone ||
                !email ||
                !password ||
                !confirmPassword ||
                password !== confirmPassword
              }
              className="w-full flex items-center justify-center py-4 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
            >
              {t("register.nextStep")} <ArrowRight className="ml-2" size={20} />
            </button>
          </div>
        )}

        {/* ÉTAPE 2 — Parcours Académique */}
        {currentStep === 2 && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-gray-50 p-6 rounded-2xl mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <GraduationCap className="mr-2" size={20} /> {t("register.academic")} *
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.degree")} *
                  </label>
                  <input
                    {...register("diplome")}
                    placeholder={t("register.degreePh")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.diplome && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.diplome.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.specialty")} *
                  </label>
                  <select
                    {...register("specialite")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                  >
                    <option value="">{t("register.specialtyPh")}</option>
                    <option value="psychologue"> {t("register.specialtyOption1")} </option>
                    <option value="psychiatre">{t("register.specialtyOption2")}</option>
                    <option value="orthophoniste">{t("register.specialtyOption3")}</option>
                    <option value="pedopsychiatre"> {t("register.specialtyOption4")} </option>
                    <option value="addictologue">{t("register.specialtyOption5")}</option>
                  </select>
                  {errors.specialite && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.specialite.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.experience")} *
                  </label>
                  <input
                    type="number"
                    {...register("anneesExperience", { valueAsNumber: true })}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.anneesExperience && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.anneesExperience.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.license")} *
                  </label>
                  <input
                    {...register("numeroLicence")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.numeroLicence && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.numeroLicence.message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.certifications")}
                  </label>
                  <input
                    {...register("certifications")}
                    placeholder="TCC, EMDR..."
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.languages")}
                  </label>
                  <input
                    {...register("langues")}
                    placeholder="Arabe, Français, Anglais..."
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.langues && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.langues.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep((p) => p - 1)}
                className="w-1/3 flex items-center justify-center py-4 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300"
              >
                <ArrowLeft className="mr-2" size={20} /> {t("register.back")}
              </button>
              <button
                type="button"
                onClick={nextStep}
                disabled={
                  !diplome ||
                  !specialite ||
                  !anneesExperience ||
                  !numeroLicence ||
                  !langues
                }
                className="w-2/3 flex items-center justify-center py-4 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
              >
                {t("register.nextStep")} <ArrowRight className="ml-2" size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 — Travail & Documents */}
        {currentStep === 3 && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-gray-50 p-6 rounded-2xl mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <MapPin className="mr-2" size={20} /> {t("register.workConsultations")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.consultType")} *
                  </label>
                  <select
                    {...register("typeConsultation")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  >
                    <option value="En ligne">{t("register.onlineOnly")}</option>
                    <option value="En cabinet">{t("register.officeOnly")}</option>
                    <option value="Hybride">{t("register.hybrid")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.price")} *
                  </label>
                  <input
                    type="number"
                    {...register("tarifConsultation", { valueAsNumber: true })}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.tarifConsultation && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.tarifConsultation.message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.location")} *
                  </label>
                  <input
                    {...register("localisationCabinet")}
                    placeholder="Ex: Clinique Al Chifa, Alger"
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.localisationCabinet && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.localisationCabinet.message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.bio")} *
                  </label>
                  <textarea
                    {...register("biographie")}
                    rows={4}
                    placeholder="Présentez-vous aux patients..."
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.biographie && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.biographie.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <UploadCloud className="mr-2" size={20} /> {t("register.docs")}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {t("register.docsDesc")}
              </p>
              <div className="space-y-4">
                {[
                  { label: "Diplôme (PDF/Image) *", setter: setDegreeFile },
                  {
                    label: "Agrément / Licence professionnelle *",
                    setter: setLicenseFile,
                  },
                  {
                    label: "Pièce d'identité (CNI / Passeport) *",
                    setter: setIdFile,
                  },
                ].map(({ label, setter }) => (
                  <div key={label}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {label}
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setter(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white file:text-gray-700 hover:file:bg-gray-100"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep((p) => p - 1)}
                className="w-1/3 flex items-center justify-center py-4 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300"
              >
                <ArrowLeft className="mr-2" size={20} /> {t("register.back")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 flex items-center justify-center py-4 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] disabled:opacity-50"
              >
                {loading ? t("register.creating") : t("register.submitApplication")}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
