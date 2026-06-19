import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Image as ImageIcon,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ClinicRegistration({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [logo, setLogo] = useState<File | null>(null);
  const [animating, setAnimating] = useState(false);

  const clinicSchema = z
  .object({
    nom: z.string().min(2, "Nom requis"),
    email: z.string().min(1, "Email requis").email("Email invalide"),
    telephone: z.string().min(8, "Téléphone requis"),
    adresse: z.string().min(5, "Adresse requise"),
    ville: z.string().min(2, "Ville requise"),
    pays: z.string().min(2, "Pays requis"),
    website: z.string().optional(),
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t("register.passwordMismatch"),
    path: ["confirmPassword"],
  });

type ClinicForm = z.infer<typeof clinicSchema>;

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<ClinicForm>({
    resolver: zodResolver(clinicSchema),
    mode: "onTouched",
    defaultValues: { pays: "Algérie" },
  });

  const nextStep = async () => {
    const fields: (keyof ClinicForm)[] =
      currentStep === 1
        ? ["nom", "email", "telephone"]
        : currentStep === 2
          ? ["adresse", "ville", "pays", "password", "confirmPassword"]
          : [];
    const valid = await trigger(fields);
    if (!valid) {
      toast.error(t("register.fillAllFields"));
      return;
    }

    setAnimating(true);

    setTimeout(() => {
      setCurrentStep((p) => p + 1);
      setAnimating(false);
    }, 150);
  };

  const onSubmit = async (data: ClinicForm) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register/clinic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: data.nom,
          email: data.email,
          motDePasse: data.password,
          adresse: data.adresse,
          telephone: data.telephone,
          ville: data.ville,
          website: data.website,
          role: "clinic",
        }),
      });

      if (!res.ok) {
        const err = await res.json();

        const message =
          typeof err.detail === "string"
            ? err.detail
            : err.detail?.message || err.message || JSON.stringify(err.detail);

        throw new Error(message || t("register.creationError"));
      }

      toast.success(t("register.success"));
      navigate("/login");
    } catch (error: any) {
      console.log(error);

      if (typeof error.message === "string") {
        toast.error(error.message);
      } else {
        toast.error(t("errors.serverError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const watchedFields = watch(["nom", "email", "telephone"]);
  const [nom, email, telephone] = watchedFields;

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
            {t("register.clinic")}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between relative mb-8 px-16">
        <div className="absolute left-16 top-1/2 -translate-y-1/2 w-[calc(100%-8rem)] h-1 bg-gray-100 -z-10 rounded-full" />
        <div
          className="absolute left-16 top-1/2 -translate-y-1/2 h-1 bg-[var(--color-primary)] -z-10 rounded-full transition-all duration-300"
          style={{
            width: `${((currentStep - 1) / 1) * 100}%`,
            maxWidth: "calc(100% - 8rem)",
          }}
        />
        {[1, 2].map((i) => (
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
                <Building2 className="mr-2" size={20} /> {t("register.genInfo")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.clinicName")} *
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("register.clinicLogo")}
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-gray-50">
                    <ImageIcon className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">
                        {t("register.clickUpload")}
                      </span>
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => setLogo(e.target.files?.[0] || null)}
                    />
                  </label>
                  {logo && (
                    <p className="text-sm text-green-600 mt-2">
                      Logo : {logo.name}
                    </p>
                  )}
                </div>
                <div>
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
                    {t("register.website")}
                  </label>
                  <div className="mt-1 relative">
                    <Globe className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      {...register("website")}
                      placeholder="https://"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={nextStep}
              disabled={!nom || !telephone || !email}
              className={`w-full flex items-center justify-center py-4 rounded-xl font-bold text-white ${!nom || !email || !telephone ? "bg-gray-300 cursor-not-allowed opacity-60" : "bg-[var(--color-primary)] hover:bg-[var(--color-secondary)]"}`}
            >
              Étape suivante <ArrowRight className="ml-2" size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Localisation & Sécurité */}
        {currentStep === 2 && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-gray-50 p-6 rounded-2xl mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <MapPin className="mr-2" size={20} /> {t("register.location")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.address")} *
                  </label>
                  <div className="mt-1 relative">
                    <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      {...register("adresse")}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl"
                    />
                  </div>
                  {errors.adresse && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.adresse.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.city")} *
                  </label>
                  <input
                    {...register("ville")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.ville && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.ville.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("register.country")} *
                  </label>
                  <input
                    {...register("pays")}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  {errors.pays && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.pays.message}
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

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep((p) => p - 1)}
                className="w-1/3 flex items-center justify-center py-4 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300"
              >
                <ArrowLeft className="mr-2" size={20} /> {t("back")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 flex items-center justify-center py-4 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] disabled:opacity-50"
              >
                {loading ? t("register.creating") : t("register.createAccount")}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
