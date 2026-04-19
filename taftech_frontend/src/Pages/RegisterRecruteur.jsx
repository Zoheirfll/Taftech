import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../Services/authService";
import toast from "react-hot-toast"; // <-- 1. IMPORT DU TOAST

const RegisterRecruteur = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    telephone: "",
    nom_entreprise: "",
    secteur_activite: "",
    registre_commerce: "",
  });
  // Plus besoin de l'état "error", le toast s'en occupe !
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // <-- 2. TOAST DE CHARGEMENT
    const toastId = toast.loading("Création de votre compte entreprise...");

    try {
      // Username pro généré à partir de l'email
      const usernameGenere =
        formData.email.split("@")[0] +
        "_pro_" +
        Math.floor(Math.random() * 999);

      const dataToSend = {
        ...formData,
        username: usernameGenere,
      };

      const response = await authService.registerRecruteur(dataToSend);

      // <-- 3. TOAST DE SUCCÈS (Remplace l'alert)
      toast.success(
        response.message ||
          "Inscription réussie ! Votre compte est en attente de validation.",
        { id: toastId, duration: 5000 },
      );

      navigate("/login");
    } catch (err) {
      // On affiche l'erreur spécifique (ex: email déjà pris ou RC déjà existant)
      const serverError = err.response?.data;

      // <-- 4. TOAST D'ERREUR
      toast.error(
        serverError?.email?.[0] ||
          serverError?.registre_commerce?.[0] ||
          "Une erreur est survenue lors de l'inscription.",
        { id: toastId },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Colonne de gauche : Design / Info */}
        <div className="md:w-1/3 bg-gray-900 p-8 text-white flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-4">Espace Recruteur</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Rejoignez TafTech pour accéder aux meilleurs talents. Votre compte
            sera actif après vérification de vos documents légaux.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-xs text-gray-300">
              <span className="p-2 bg-gray-800 rounded-full">✔️</span>{" "}
              Publication d'offres
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300">
              <span className="p-2 bg-gray-800 rounded-full">✔️</span> Gestion
              des candidatures
            </div>
          </div>
        </div>

        {/* Colonne de droite : Formulaire */}
        <div className="md:w-2/3 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Créer un compte entreprise
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Nom du responsable
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded focus:border-gray-900 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Prénom
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded focus:border-gray-900 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Email Pro
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded focus:border-gray-900 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="telephone"
                  required
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded focus:border-gray-900 outline-none transition"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-100" />

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                name="nom_entreprise"
                required
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded focus:border-gray-900 outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Secteur d'activité
                </label>
                <select
                  name="secteur_activite"
                  required
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded focus:border-gray-900 outline-none transition"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Informatique">
                    Informatique / Technologie
                  </option>
                  <option value="Energie">Énergie / Hydrocarbures</option>
                  <option value="Banque">Banque / Assurance</option>
                  <option value="Commerce">Commerce / Distribution</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Registre de Commerce (RC)
                </label>
                <input
                  type="text"
                  name="registre_commerce"
                  required
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded focus:border-gray-900 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">
                Mot de passe
              </label>
              <input
                type="password"
                name="password"
                minLength="8"
                required
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded focus:border-gray-900 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-lg shadow-lg transition duration-300 transform hover:-translate-y-1"
            >
              {loading ? "Traitement..." : "S'inscrire comme Employeur"}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Déjà un compte ?{" "}
            <Link
              to="/login"
              className="text-gray-900 font-bold hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterRecruteur;
