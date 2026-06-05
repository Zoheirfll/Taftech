import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../utils/errorReporter";
import { Mail, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Veuillez entrer votre email.");
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      reportError("ECHEC_FORGOT_PASSWORD", err);
      toast.error("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Mot de passe oublié
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Entrez votre email pour recevoir un code de réinitialisation.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <Mail size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Email envoyé !
              </h2>
              <p className="text-sm text-slate-500">
                Si cet email existe, vous recevrez un code de réinitialisation.
              </p>
              <Link
                to="/reset-password"
                state={{ email }}
                className="block w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-center mt-4"
              >
                Entrer mon code →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Adresse email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.dz"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Envoi en cours..." : "Envoyer le code"}
              </button>
            </form>
          )}
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

export default ForgotPassword;
