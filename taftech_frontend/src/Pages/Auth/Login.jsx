import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";

const Login = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Connexion en cours...");
    try {
      await authService.login(credentials.username, credentials.password, "candidat");
      toast.success("Connexion réussie !", { id: toastId });
      navigate("/");
      window.location.reload();
    } catch (err) {
      toast.error("Email ou mot de passe incorrect.", { id: toastId });
      reportError("ECHEC_CONNEXION", err);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const toastId = toast.loading("Connexion Google...");
    try {
      await authService.googleLogin(credentialResponse.credential, "CANDIDAT");
      toast.success("Connexion réussie !", { id: toastId });
      navigate("/");
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.error || "Échec de la connexion Google.";
      toast.error(msg, { id: toastId });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm w-full max-w-md p-10 border-t-4 border-t-indigo-600">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Connexion
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Accédez à votre espace TafTech
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-2 block">
              Email
            </label>
            <input
              type="email"
              placeholder="votre@email.com"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors"
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
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors"
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm mt-2"
          >
            Se connecter
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

        <div className="mt-7 text-center space-y-3">
          <p className="text-sm text-slate-500">
            Pas encore de compte ?{" "}
            <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
          <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline block">
            Mot de passe oublié ?
          </Link>
          <p className="text-sm text-slate-500">
            Vous recrutez ?{" "}
            <Link to="/recruteurs/connexion" className="text-indigo-600 font-semibold hover:underline">
              Espace recruteur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
