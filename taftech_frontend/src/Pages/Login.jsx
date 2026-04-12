import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../Services/authService"; // Attention à la majuscule de Services selon ton dossier

const Login = () => {
  // On garde "username" dans le state car c'est ce que Django attend techniquement
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await authService.login(credentials.username, credentials.password);
      navigate("/");
      window.location.reload();
    } catch (err) {
      setError("Adresse email ou mot de passe incorrect.", err);
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

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" /* CHANGÉ ICI : Force le clavier email sur mobile */
            placeholder="Adresse Email" /* CHANGÉ ICI */
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
