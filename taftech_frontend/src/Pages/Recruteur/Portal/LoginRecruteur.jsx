import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../../utils/errorReporter";

const LoginRecruteur = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Connexion en cours...");
    try {
      const data = await authService.login(credentials.username, credentials.password, "recruteur");
      // Accepter role=RECRUTEUR ou candidat membre d'une équipe
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
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm w-full max-w-md p-10 border-t-4 border-t-teal-700">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Connexion Recruteur
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Accédez à votre espace recruteur TafTech
          </p>
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
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-colors"
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-2 block">
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-colors"
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm mt-2"
          >
            Se connecter
          </button>
        </form>

        <div className="mt-7 text-center space-y-3">
          <p className="text-sm text-slate-500">
            Pas encore de compte ?{" "}
            <Link to="/recruteurs/inscription" className="text-teal-700 font-semibold hover:underline">
              Créer un compte recruteur
            </Link>
          </p>
          <Link to="/forgot-password" className="text-sm text-teal-700 hover:underline block">
            Mot de passe oublié ?
          </Link>
          <p className="text-sm text-slate-500">
            Vous êtes candidat ?{" "}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
              Espace candidats
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginRecruteur;
