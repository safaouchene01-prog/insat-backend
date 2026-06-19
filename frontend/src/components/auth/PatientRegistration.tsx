import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Mail,
  Phone,
  HeartPulse,
  AlertCircle,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function PatientRegistration({
  onBack,
}: {
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const patientSchema = z
  .object({
    nom: z.string().min(2, "Nom requis"),
    prenom: z.string().min(2, "Prénom requis"),
    email: z.string().email("Email invalide"),
    telephone: z.string().min(8, "Téléphone requis"),
    dateNaissance: z.string().min(1, "Date requise"),
    sexe: z.enum(["Homme", "Femme", "Autre"]).optional(),
    contactUrgenceNom: z.string().optional(),
    contactUrgenceTel: z.string().optional(),
    conditionsExistantes: z
      .string()
      .min(1, 'Veuillez préciser ou mettre "Aucune"'),
    suiviPsy: z.boolean(),
    troublesSommeil: z.boolean(),
    niveauStress: z.number().min(1).max(10),
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t("register.passwordsDontMatch"),
    path: ["confirmPassword"],
  });

  type PatientForm = z.infer<typeof patientSchema>;

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    mode: "onTouched",
    defaultValues: { suiviPsy: false, troublesSommeil: false, niveauStress: 5 },
  });

  const watchedFields = watch([
    "niveauStress",
    "password",
    "confirmPassword",
    "nom",
    "prenom",
    "telephone",
    "email",
  ]);
  const [
    niveauStress,
    password,
    confirmPassword,
    nom,
    prenom,
    telephone,
    email,
  ] = watchedFields;

  const nextStep = async () => {
    let fields: (keyof PatientForm)[] = [];
    if (currentStep === 1)
      fields = [
        "nom",
        "prenom",
        "dateNaissance",
        "telephone",
        "email",
        "password",
        "confirmPassword",
      ];
    if (currentStep === 2) fields = ["contactUrgenceNom", "contactUrgenceTel"];
    const valid = await trigger(fields);

    if (!valid) {
      toast.error(t("register.fillAllFields"));
      return;
    }
    setCurrentStep((p) => p + 1);
  };

  const onSubmit = async (data: PatientForm) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register/patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          motDePasse: data.password,
          dateNaissance: data.dateNaissance,
          // Additional profile fields
          telephone: data.telephone,
          sexe: data.sexe,
          contactUrgenceNom: data.contactUrgenceNom,
          contactUrgenceTel: data.contactUrgenceTel,
          conditionsExistantes: data.conditionsExistantes,
          suiviPsy: data.suiviPsy,
          troublesSommeil: data.troublesSommeil,
          niveauStress: data.niveauStress,
          role: "patient",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || t("register.creationError"));
      }

      toast.success(t("register.successPatientComplete"));
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
            {t("register.patient")}
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
        {/* ÉTAPE 1 */}
        {currentStep === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-gray-50 p-6 rounded-2xl mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <User className="mr-2" size={20} /> {t("register.personalInfo")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.nom")} *
                  </label>
                  <input
                    {...register("nom")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[var(--color-primary)]"
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
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[var(--color-primary)]"
                  />
                  {errors.prenom && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.prenom.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.dob")} *
                  </label>
                  <input
                    type="date"
                    {...register("dateNaissance", { required: true })}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[var(--color-primary)]"
                  />
                  {errors.dateNaissance && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.dateNaissance.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.sex")}
                  </label>
                  <select
                    {...register("sexe")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[var(--color-primary)]"
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
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  {errors.telephone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.telephone.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.email")} *
                  </label>
                  <div className="mt-1 relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      {...register("email")}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      ⚠ {errors.email.message}
                    </p>
                  )}
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
              className="w-full flex items-center justify-center py-4 rounded-xl text-base font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
            >
              {t("register.nextStep")} <ArrowRight className="ml-2" size={20} />
            </button>
          </div>
        )}

        {/* ÉTAPE 2 */}
        {currentStep === 2 && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-gray-50 p-6 rounded-2xl mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <AlertCircle className="mr-2" size={20} /> {t("register.urgentContact")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.urgentContactName")}
                  </label>
                  <input
                    {...register("contactUrgenceNom")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.urgentContactPhone")}
                  </label>
                  <input
                    {...register("contactUrgenceTel")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[var(--color-primary)]"
                  />
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
                className="w-2/3 flex items-center justify-center py-4 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
              >
                {t("register.nextStep")} <ArrowRight className="ml-2" size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 */}
        {currentStep === 3 && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-gray-50 p-6 rounded-2xl mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <HeartPulse className="mr-2" size={20} /> {t("register.medicalProfile")}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.conditions")} *
                  </label>
                  <textarea
                    {...register("conditionsExistantes")}
                    rows={2}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[var(--color-primary)]"
                    placeholder="Ex: Anxiété. Si aucune, écrivez 'Aucune'"
                  />
                  {errors.conditionsExistantes && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.conditionsExistantes.message}
                    </p>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("suiviPsy")}
                    className="rounded w-5 h-5 cursor-pointer accent-[var(--color-primary)]"
                  />
                  {t("register.psyConsult")}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("troublesSommeil")}
                    className="rounded w-5 h-5 cursor-pointer accent-[var(--color-primary)]"
                  />
                  {t("register.sleepIssues")}
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("register.stressLevel")}:
                    <span className="font-bold text-[var(--color-primary)]">
                      {niveauStress}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    {...register("niveauStress", { valueAsNumber: true })}
                    className="w-full accent-[var(--color-primary)]"
                  />
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
                type="submit"
                disabled={loading}
                className="w-2/3 flex items-center justify-center py-4 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] disabled:opacity-50"
              >
                {loading ? t("register.creating") : t("register.submitBtn")}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
