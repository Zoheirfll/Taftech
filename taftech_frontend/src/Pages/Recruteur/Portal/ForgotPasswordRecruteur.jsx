import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../../utils/errorReporter";
import { Mail, ArrowLeft, CheckCircle, Send } from "lucide-react";

const ForgotPasswordRecruteur = () => {
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
      reportError("ECHEC_FORGOT_PASSWORD_RECRUTEUR", err);
      toast.error("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">

        {/* COLONNE GAUCHE */}
        <div className="md:w-5/12 bg-slate-900 p-10 text-white flex flex-col justify-center">
          <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-6">Espace Recruteur</p>
          <h2 className="text-xl font-extrabold leading-snug mb-3">
            Réinitialisez votre <span className="text-teal-400">mot de passe</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Entrez l'email associé à votre compte recruteur. Vous recevrez un code de réinitialisation valable 10 minutes.
          </p>
          <div className="space-y-3">
            {[
              "Code envoyé par email instantanément",
              "Valable 10 minutes",
              "Votre compte reste sécurisé",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle size={15} className="text-teal-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-slate-800">
            <Link
              to="/recruteurs/connexion"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
          {sent ? (
            <div className="text-center space-y-5 max-w-sm mx-auto w-full">
              <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-center mx-auto animate-bounce" style={{ animationDuration: "1.5s", animationIterationCount: 3 }}>
                <Mail size={32} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Email envoyé !</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Si l'email <span className="font-semibold text-slate-800">{email}</span> est associé à un compte recruteur, vous recevrez un code de réinitialisation.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 text-left">
                Vérifiez vos spams si vous ne trouvez pas l'email dans votre boîte de réception.
              </div>
              <Link
                to="/reset-password"
                state={{ email }}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 transition-colors"
              >
                Entrer mon code →
              </Link>
            </div>
          ) : (
            <div className="max-w-sm mx-auto w-full">
              <div className="mb-8">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                  <Mail size={22} className="text-teal-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Mot de passe oublié ?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Entrez votre email professionnel pour recevoir un code.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-2 block">
                    Email professionnel
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@entreprise.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-60 shadow-sm"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  {loading ? "Envoi en cours..." : "Envoyer le code"}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Vous vous souvenez de votre mot de passe ?{" "}
                <Link to="/recruteurs/connexion" className="text-teal-700 font-semibold hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordRecruteur;
