import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../../utils/errorReporter";
import { Eye, EyeOff, CheckCircle, LogIn } from "lucide-react";

const AVANTAGES = [
  "Publiez vos offres gratuitement",
  "Score IA sur chaque candidat",
  "CVthèque avec matching intelligent",
  "Gestion d'équipe multi-rôles",
];

const LoginRecruteur = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Connexion en cours...");
    try {
      const data = await authService.login(credentials.username, credentials.password, "recruteur");
      if (data.role !== "RECRUTEUR" && !data.est_membre_equipe) {
        toast.error("Ce compte n'est pas un compte recruteur.", { id: toastId });
        authService.logout("/recruteurs/connexion");
        return;
      }
      toast.success("Connexion réussie !", { id: toastId });
      navigate("/dashboard");
      window.location.reload();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === "COMPTE_NON_VERIFIE") {
        toast.dismiss(toastId);
        localStorage.setItem("taftech_pending_verification_recruteur", errData.email);
        toast("Votre compte n'est pas encore vérifié. Terminez la vérification.", { icon: "📧" });
        navigate("/recruteurs/inscription");
        return;
      }
      if (errData?.code === "PREMIUM_EXPIRE") {
        toast.error(errData.detail, { id: toastId, duration: 6000 });
      } else {
        toast.error("Email ou mot de passe incorrect.", { id: toastId });
        reportError("ECHEC_CONNEXION_RECRUTEUR", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">

        {/* COLONNE GAUCHE */}
        <div className="md:w-5/12 bg-slate-900 p-10 text-white flex flex-col justify-center">
          <div className="mb-8">
            <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-3">Espace Recruteur</p>
            <h2 className="text-2xl font-extrabold leading-snug mb-3">
              Trouvez les meilleurs talents <span className="text-teal-400">d'Algérie</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Matching par intelligence artificielle, CVthèque complète et gestion d'équipe — tout en un.
            </p>
          </div>
          <div className="space-y-3">
            {AVANTAGES.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle size={15} className="text-teal-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-slate-800 text-xs text-slate-500">
            Vous êtes candidat ?{" "}
            <Link to="/login" className="text-indigo-400 font-semibold hover:underline">
              Espace candidats →
            </Link>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900">Connexion Recruteur</h3>
            <p className="text-sm text-slate-500 mt-1">Accédez à votre espace employeur TafTech</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">
                Email professionnel
              </label>
              <input
                type="email"
                placeholder="votre@entreprise.com"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-600">Mot de passe</label>
                <Link to="/recruteurs/mot-de-passe-oublie" className="text-xs text-teal-700 hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-2.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-60 mt-1"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ?{" "}
            <Link to="/recruteurs/inscription" className="text-teal-700 font-semibold hover:underline">
              Créer un compte recruteur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginRecruteur;
