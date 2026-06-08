import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: location.state?.email || "",
    code: "",
    nouveau_mdp: "",
    confirmer_mdp: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nouveau_mdp !== form.confirmer_mdp) {
      return toast.error("Les mots de passe ne correspondent pas.");
    }
    if (form.nouveau_mdp.length < 8) {
      return toast.error(
        "Le mot de passe doit contenir au moins 8 caractères.",
      );
    }
    setLoading(true);
    try {
      await authService.resetPassword(form.email, form.code, form.nouveau_mdp);
      toast.success("Mot de passe réinitialisé avec succès !");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      reportError("ECHEC_RESET_PASSWORD", err);
      toast.error(err.response?.data?.error || "Code invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <KeyRound size={24} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Nouveau mot de passe
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Entrez le code reçu par email et votre nouveau mot de passe.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Email *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="votre@email.dz"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Code de vérification *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="123456"
                className={
                  inputClass + " tracking-widest text-center text-lg font-bold"
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Nouveau mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={form.nouveau_mdp}
                  onChange={(e) =>
                    setForm({ ...form, nouveau_mdp: e.target.value })
                  }
                  placeholder="Minimum 8 caractères"
                  className={inputClass + " pr-10"}
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
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Confirmer le mot de passe *
              </label>
              <input
                type="password"
                required
                value={form.confirmer_mdp}
                onChange={(e) =>
                  setForm({ ...form, confirmer_mdp: e.target.value })
                }
                placeholder="Répétez le mot de passe"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading
                ? "Réinitialisation..."
                : "Réinitialiser le mot de passe"}
            </button>
          </form>
        </div>

        <div className="text-center mt-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
