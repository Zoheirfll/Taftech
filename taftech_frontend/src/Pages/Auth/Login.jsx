import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Connexion en cours...");
    try {
      await authService.login(credentials.username, credentials.password, "candidat", rememberMe);
      toast.success("Connexion réussie !", { id: toastId });
      navigate("/");
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
      navigate("/");
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.error || "Échec de la connexion Google.";
      toast.error(msg, { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">

        {/* COLONNE GAUCHE */}
        <div className="md:w-5/12 bg-linear-to-br from-indigo-700 to-indigo-500 p-10 text-white flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-3 leading-tight">
              Bon retour sur <span className="text-indigo-200">TAFTECH</span>
            </h2>
            <p className="text-indigo-100 text-sm leading-relaxed mb-8">
              Retrouvez vos candidatures, alertes et opportunités au même endroit.
            </p>
            <div className="space-y-4">
              {AVANTAGES.map(({ title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-indigo-300 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-indigo-200">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-indigo-100 mt-8 pt-6 border-t border-indigo-500/50">
            Pas encore de compte ?{" "}
            <Link to="/register" className="text-white font-semibold hover:underline">
              S'inscrire gratuitement
            </Link>
          </p>
        </div>

        {/* COLONNE DROITE */}
        <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
          <h3 className="text-xl font-bold text-slate-900 mb-1">Accédez à votre espace TAFTECH</h3>
          <p className="text-sm text-slate-500 mb-6">
            Retrouvez vos candidatures, gérez votre profil et suivez vos opportunités professionnelles en toute simplicité.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                  className="w-4 h-4 cursor-pointer rounded text-indigo-600 border-slate-300"
                />
                <span className="text-sm text-slate-600">Se souvenir de moi</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline font-medium">
                Mot de passe oublié ?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400 font-medium">ou</span>
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

          <p className="text-sm text-slate-500 text-center mt-6">
            Vous n'avez pas encore de compte ?{" "}
            <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
          <p className="text-sm text-slate-500 text-center mt-2">
            Vous recrutez ?{" "}
            <Link to="/recruteurs/connexion" className="text-indigo-600 font-semibold hover:underline">
              Espace recruteur →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
