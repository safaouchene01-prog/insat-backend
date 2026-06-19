import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import Logo from "../components/common/Logo";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const loginSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z
    .string()
    .min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
});

type LoginForm = z.infer<typeof loginSchema>;

const DASHBOARD_MAP: Record<string, string> = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  clinic: "/doctor/dashboard",  // Clinics use doctor dashboard
  admin: "/admin/dashboard",
};

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset">(
    "email",
  );
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, motDePasse: data.password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Email ou mot de passe incorrect");
      }

      const user = await res.json();

      const basicUser = {
        id: String(user.id),
        email: user.email,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom ?? "",
        profile_picture: user.profile_picture_url ?? undefined,
        profile_picture_url: user.profile_picture_url ?? undefined,
      };

      setUser(basicUser);

      // L'admin n'a pas de profil en base : on redirige directement
      if (user.role === "admin") {
        toast.success(`Bienvenue ${user.nom} !`);
        navigate("/admin/dashboard");
        return;
      }

      try {
        const profileEndpoint =
          user.role === "clinic"
            ? `${API_URL}/cliniques/${user.id}`
            : user.role === "doctor"
            ? `${API_URL}/therapeutes/${user.id}`
            : `${API_URL}/patients/${user.id}`;

        const profileRes = await fetch(profileEndpoint);
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUser({
            ...basicUser,
            nom: profile.nom ?? basicUser.nom,
            prenom: profile.prenom ?? basicUser.prenom,
            email: profile.email ?? basicUser.email,
            profile_picture: profile.profile_picture_url ?? profile.profile_picture ?? basicUser.profile_picture,
            profile_picture_url: profile.profile_picture_url ?? profile.profile_picture ?? basicUser.profile_picture_url,
          });
        }
      } catch (profileError) {
        console.error("Failed to refresh profile after login", profileError);
      }

      toast.success(`Bienvenue ${user.prenom || user.nom} !`);
      navigate(DASHBOARD_MAP[user.role] ?? "/patient/dashboard");
    } catch (error: any) {
      toast.error(error.message || t("errors.serverError"));
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!forgotEmail) {
      toast.error(t("login.forgot.emailRequired"));
      return;
    }

    setOtpLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotEmail,
        }),
      });

      const data = await res.json();

      console.log(data);

      if (!res.ok) {
        toast.error(
          data.detail || data.message || t("login.forgot.serverError"),
        );
        return;
      }

      toast.success(data.message || t("login.forgot.send"));
      setForgotStep("otp");
    } catch (err) {
      console.error(err);
      toast.error(t("login.forgot.serverError"));
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");

    if (code.length !== 6) {
      toast.error(t("login.forgot.otpInvalid"));
      return;
    }

    const res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: forgotEmail,
        otp: code,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || t("login.forgot.otpInvalid"));
      return;
    }

    setResetToken(data.resetToken);
    toast.success(t("login.forgot.otpVerified"));
    setForgotStep("reset");
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--color-muted)]">
      {/* HEADER */}
      <div className="text-center mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 no-underline mb-4 mx-auto"
          aria-label="Home"
        >
          <Logo variant="auth" />
        </Link>
        <p className="text-[var(--insat-text-body)]">{t("login.title")}</p>
      </div>

      {/* CARD */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-[2rem] sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* EMAIL */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("login.email")}
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register("email")}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]`}
                  placeholder="vous@exemple.com"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  {t("login.password")}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-[var(--color-primary)] hover:underline bg-transparent border-none cursor-pointer"
                >
                  {t("login.forgotPassword")}
                </button>
              </div>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  {...register("password")}
                  className={`block w-full pl-10 pr-10 py-3 border ${
                    errors.password ? "border-red-300" : "border-gray-300"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white bg-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
            >
              {loading ? t("login.loading") : t("login.submit")}
            </button>
          </form>

          {/* DIVIDER */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="flex-1 border-t border-[var(--border-default)]" />
            <span className="px-4 text-xs text-[var(--text-secondary)] font-medium bg-white z-10">
              {t("login.noAccount")}
            </span>
            <div className="flex-1 border-t border-[var(--border-default)]" />
          </div>

          <Link
            to="/register"
            className="block w-full text-center py-3 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-muted)] text-sm font-medium"
          >
            {t("login.register")}
          </Link>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {forgotStep === "email"
                  ? t("login.forgot.resetTitle")
                  : t("login.forgot.otpTitle")}
              </h2>
              <button
                onClick={() => {
                  setShowForgot(false);
                  setForgotStep("email");
                  setForgotEmail("");
                  setOtp(["", "", "", "", "", ""]);
                  setResetToken("");
                  setNewPassword("");
                }}
              >
                ✕
              </button>
            </div>

            {forgotStep === "email" && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  {t("login.forgot.emailRequired")}
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full border p-3 rounded-xl mb-4"
                />
                <button
                  disabled={otpLoading}
                  className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl"
                  onClick={sendOtp}
                >
                  {otpLoading ? t("login.loading") : t("login.forgot.send")}
                </button>
              </>
            )}

            {forgotStep === "otp" && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  {t("login.forgot.otpDesc")}
                </p>
                <div className="flex gap-2 justify-center mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      value={digit}
                      maxLength={1}
                      className="w-12 h-12 text-center border rounded-lg text-lg"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!/^\d*$/.test(value)) return;
                        const newOtp = [...otp];
                        newOtp[index] = value;
                        setOtp(newOtp);
                        if (value && index < 5)
                          inputRefs.current[index + 1]?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp[index] && index > 0)
                          inputRefs.current[index - 1]?.focus();
                      }}
                    />
                  ))}
                </div>
                <button
                  disabled={otpLoading}
                  className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl"
                  onClick={verifyOtp}
                >
                  {t("login.forgot.verify")}
                </button>
                <button
                  className="w-full mt-3 text-sm text-green-600"
                  onClick={() => sendOtp()}
                >
                  {t("login.forgot.resend")}
                </button>
              </>
            )}

            {forgotStep === "reset" && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  {t("login.forgot.newPassword")}
                </p>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border p-3 rounded-xl mb-4"
                  placeholder="Nouveau mot de passe"
                />

                <button
                  className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl"
                  onClick={async () => {
                    if (!resetToken) {
                      toast.error("OTP non vérifié");
                      return;
                    }

                    if (newPassword.length < 6) {
                      toast.error(t("login.forgot.shortPassword"));
                      return;
                    }

                    const res = await fetch(
                      `${API_URL}/auth/reset-password-confirm`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: forgotEmail,
                          resetToken,
                          newPassword,
                        }),
                      },
                    );

                    if (!res.ok) {
                      toast.error(t("login.forgot.updateError"));
                      return;
                    }

                    toast.success(t("login.forgot.updateSuccess"));
                    setShowForgot(false);
                    setForgotStep("email");
                  }}
                >
                  {t("login.forgot.update")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
