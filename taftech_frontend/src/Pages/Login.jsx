import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../utils/errorReporter"; // ✅ Import de la Télémétrie

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
      // Appelle le nouveau authService qui utilise les cookies
      await authService.login(credentials.username, credentials.password);

      toast.success("Connexion réussie !", { id: toastId });

      // On redirige vers la page d'accueil ou le dashboard
      navigate("/");

      // Crucial : On recharge pour que la Navbar détecte le 'userRole' mis dans le localStorage
      window.location.reload();
    } catch (err) {
      toast.error("Email ou mot de passe incorrect.", { id: toastId });
      // 🛑 Remplacement de console.error par reportError
      reportError("ECHEC_CONNEXION", err);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border-t-4 border-blue-600">
        <h2 className="text-3xl font-black text-gray-800 mb-2 text-center">
          Connexion
        </h2>
        <p className="text-gray-500 text-center mb-6 text-sm">
          Accédez à votre espace TafTech
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Adresse Email"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            onChange={(e) =>
              setCredentials({ ...credentials, username: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="Mot de passe"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            onChange={(e) =>
              setCredentials({ ...credentials, password: e.target.value })
            }
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition duration-300"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
