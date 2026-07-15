import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { tw } from "../../theme";

const AVANTAGES = [
  { title: "Matching IA", desc: "Score de compatibilité avec chaque offre" },
  { title: "Profil centralisé", desc: "CV, compétences et expériences au même endroit" },
  { title: "Alertes emploi", desc: "Soyez notifié des nouvelles opportunités" },
];

const Login = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Connexion en cours...");
    try {
      await authService.login(credentials.username, credentials.password, "candidat", rememberMe);
      toast.success("Connexion réussie !", { id: toastId });
      navigate(next || "/");
      window.location.reload();
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === "COMPTE_NON_VERIFIE") {
        toast.dismiss(toastId);
        localStorage.setItem("taftech_pending_verification", data.email);
        toast("Votre compte n'est pas encore vérifié. Terminez la vérification.", { icon: "📧" });
        navigate("/register");
        return;
      }
      toast.error("Email ou mot de passe incorrect.", { id: toastId });
      reportError("ECHEC_CONNEXION", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const toastId = toast.loading("Connexion Google...");
    try {
      await authService.googleLogin(credentialResponse.credential, "CANDIDAT", "login");
      toast.success("Connexion réussie !", { id: toastId });
      navigate(next || "/");
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.error || "Échec de la connexion Google.";
      toast.error(msg, { id: toastId });
    }
  };

  return (
    <div className={`min-h-screen ${tw.authPageBg} flex items-center justify-center p-4`}>
      <div className={`max-w-4xl w-full ${tw.authCardShell} overflow-hidden flex flex-col md:flex-row`}>

        {/* COLONNE GAUCHE */}
        <div className={`md:w-5/12 ${tw.bannerGradientPrimary} text-white p-10 flex flex-col justify-between`}>
          <div>
            <h2 className="text-2xl font-bold mb-3 leading-tight">
              Bon retour sur <span className={tw.textAmber400}>TAFTECH</span>
            </h2>
            <p className={`${tw.heroTextMuted} text-sm leading-relaxed mb-8`}>
              Retrouvez vos candidatures, alertes et opportunités au même endroit.
            </p>
            <div className="space-y-4">
              {AVANTAGES.map(({ title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  <CheckCircle2 size={18} className={`${tw.heroTextFaint} shrink-0`} />
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className={`${tw.textPrimaryOnDark} text-xs`}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className={`${tw.heroTextMuted} text-sm mt-8 pt-6 border-t ${tw.heroBorderDivider}`}>
            Pas encore de compte ?{" "}
            <Link to="/register" className={`${tw.textOnDark} font-semibold hover:underline`}>
              S'inscrire gratuitement
            </Link>
          </p>
        </div>

        {/* COLONNE DROITE */}
        <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
          <h3 className={`text-xl font-bold ${tw.textStrong} mb-1`}>Accédez à votre espace TAFTECH</h3>
          <p className={`${tw.bodyText} mb-6`}>
            Retrouvez vos candidatures, gérez votre profil et suivez vos opportunités professionnelles en toute simplicité.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`${tw.authLabel} mb-1.5`}>Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className={tw.authInput}
              />
            </div>
            <div>
              <label className={`${tw.authLabel} mb-1.5`}>Mot de passe</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className={`${tw.authInput} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${tw.authEyeToggle}`}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={`w-4 h-4 cursor-pointer rounded ${tw.textPrimary} ${tw.borderStrong}`}
                />
                <span className={`text-sm ${tw.textMuted}`}>Se souvenir de moi</span>
              </label>
              <Link to="/forgot-password" className={`text-xs ${tw.linkPrimary} hover:underline font-medium`}>
                Mot de passe oublié ?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${tw.bgPrimarySolidHover} ${tw.textOnDark} font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {loading && <span className={`w-4 h-4 ${tw.spinnerOnDark}`} />}
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${tw.borderBase}`} />
            </div>
            <div className="relative flex justify-center">
              <span className={`${tw.surface} px-3 text-xs ${tw.textMuted} font-medium`}>ou</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Échec de la connexion Google.")}
              text="signin_with"
              shape="rectangular"
              theme="outline"
              size="large"
              width="360"
            />
          </div>

          <p className={`${tw.bodyText} text-center mt-6`}>
            Vous n'avez pas encore de compte ?{" "}
            <Link to="/register" className={`${tw.linkPrimary} font-semibold hover:underline`}>
              S'inscrire
            </Link>
          </p>
          <p className={`${tw.bodyText} text-center mt-2`}>
            Vous recrutez ?{" "}
            <Link to="/recruteurs/connexion" target="_blank" rel="noopener noreferrer" className={`${tw.linkPrimary} font-semibold hover:underline`}>
              Espace recruteur →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
