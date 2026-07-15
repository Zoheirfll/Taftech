import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { Mail, ArrowLeft } from "lucide-react";
import { tw } from "../../theme";

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

  return (
    <div className={`min-h-screen ${tw.authPageBg} flex items-center justify-center px-4`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`w-14 h-14 ${tw.bgPrimarySoft} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            <Mail size={26} className={tw.textPrimary} />
          </div>
          <h1 className={tw.pageTitlePetit}>
            Mot de passe oublié
          </h1>
          <p className={`${tw.bodyText} mt-2`}>
            Entrez votre email pour recevoir un code de réinitialisation.
          </p>
        </div>

        <div className={`${tw.authCardShell} p-8`}>
          {sent ? (
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 ${tw.bgSuccessSoft} rounded-full flex items-center justify-center mx-auto`}>
                <Mail size={28} className={tw.textSuccessIcon} />
              </div>
              <h2 className={`text-lg font-bold ${tw.textStrong}`}>
                Email envoyé !
              </h2>
              <p className={tw.bodyText}>
                Si cet email existe, vous recevrez un code de réinitialisation.
              </p>
              <Link
                to="/reset-password"
                state={{ email }}
                className={`block w-full py-2.5 ${tw.bgPrimarySolidHover} ${tw.textOnDark} text-sm font-semibold rounded-xl transition-colors text-center mt-4`}
              >
                Entrer mon code →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`${tw.authLabel} mb-1.5`}>
                  Adresse email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.dz"
                  className={tw.authInput}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 ${tw.bgPrimarySolidHover} ${tw.textOnDark} text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {loading && <span className={`w-4 h-4 ${tw.spinnerOnDark}`} />}
                {loading ? "Envoi en cours..." : "Envoyer le code"}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link
            to="/login"
            className={`inline-flex items-center gap-1 text-sm ${tw.linkMutedHover}`}
          >
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
