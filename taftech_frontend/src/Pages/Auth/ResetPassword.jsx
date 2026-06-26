import React, { useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const otpRefs = useRef([]);
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [form, setForm] = useState({ nouveau_mdp: "", confirmer_mdp: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const handleOtpChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nouveau_mdp !== form.confirmer_mdp) {
      return toast.error("Les mots de passe ne correspondent pas.");
    }
    if (form.nouveau_mdp.length < 8) {
      return toast.error("Le mot de passe doit contenir au moins 8 caractères.");
    }
    const code = otp.join("");
    if (code.length !== 6) {
      return toast.error("Veuillez saisir les 6 chiffres du code.");
    }
    setLoading(true);
    try {
      await authService.resetPassword(email, code, form.nouveau_mdp);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      reportError("ECHEC_RESET_PASSWORD", err);
      toast.error(err.response?.data?.error || "Code invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound size={26} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
          <p className="text-sm text-slate-500 mt-2">
            Entrez le code reçu par email et votre nouveau mot de passe.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto animate-bounce" />
              <h2 className="text-lg font-bold text-slate-900">Mot de passe réinitialisé !</h2>
              <p className="text-sm text-slate-500">
                Vous allez être redirigé vers la connexion dans quelques secondes...
              </p>
              <Link to="/login" className="block w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-center">
                Se connecter maintenant →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.dz"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 mb-2 block">Code de vérification *</label>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      ref={(el) => (otpRefs.current[index] = el)}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-12 text-center text-xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Nouveau mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={form.nouveau_mdp}
                    onChange={(e) => setForm({ ...form, nouveau_mdp: e.target.value })}
                    placeholder="Minimum 8 caractères"
                    className={inputClass + " pr-10"}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Confirmer le mot de passe *</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={form.confirmer_mdp}
                    onChange={(e) => setForm({ ...form, confirmer_mdp: e.target.value })}
                    placeholder="Répétez le mot de passe"
                    className={inputClass + " pr-10"}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
