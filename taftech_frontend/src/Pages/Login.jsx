import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../utils/errorReporter";

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Connexion en cours...");
    try {
      await authService.login(credentials.username, credentials.password);
      toast.success("Connexion réussie !", { id: toastId });
      navigate("/");
      window.location.reload();
    } catch (err) {
      toast.error("Email ou mot de passe incorrect.", { id: toastId });
      reportError("ECHEC_CONNEXION", err);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full max-w-sm p-8 border-t-2 border-t-indigo-600">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Connexion
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Accédez à votre espace TafTech
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              placeholder="votre@email.com"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors"
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors"
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-sm mt-2"
          >
            Se connecter
          </button>
        </form>
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Pas encore de compte ?{" "}
            <Link
              to="/register"
              className="text-indigo-600 font-semibold hover:underline"
            >
              S'inscrire
            </Link>
          </p>
          <Link
            to="/forgot-password"
            className="text-xs text-indigo-600 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
          <p className="text-xs text-slate-500">
            Vous recrutez ?{" "}
            <Link
              to="/register-entreprise"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Espace recruteur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
