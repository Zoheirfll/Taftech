import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
            <Link to="/register-entreprise" className="text-indigo-600 font-semibold hover:underline">
              Espace recruteur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
