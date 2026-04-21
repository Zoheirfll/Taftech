import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../Services/authService";
import { jobsService } from "../Services/jobsService"; // <-- Pour récupérer les listes
import toast from "react-hot-toast";
import Select from "react-select"; // <-- Pour les beaux menus déroulants

const RegisterRecruteur = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    telephone: "",
    nom_entreprise: "",
    secteur_activite: "",
    registre_commerce: "",
    wilaya_siege: "", // <-- AJOUT DE LA WILAYA
  });

  // On charge les listes officielles depuis Django au démarrage
  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setConstants(data);
      } catch (err) {
        (console.error("Erreur chargement des constantes"), err);
      }
    };
    fetchConstants();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Petite vérification avant envoi
    if (!formData.secteur_activite || !formData.wilaya_siege) {
      return toast.error("Veuillez sélectionner un secteur et une wilaya.");
    }

    setLoading(true);
    const toastId = toast.loading("Création de votre compte entreprise...");

    try {
      const usernameGenere =
        formData.email.split("@")[0] +
        "_pro_" +
        Math.floor(Math.random() * 999);
      const dataToSend = { ...formData, username: usernameGenere };

      const response = await authService.registerRecruteur(dataToSend);

      toast.success(
        response.message ||
          "Inscription réussie ! Votre compte est en attente de validation.",
        { id: toastId, duration: 5000 },
      );

      navigate("/login");
    } catch (err) {
      const serverError = err.response?.data;
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
    <div className="min-h-screen bg-gray-100 py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Colonne de gauche */}
        <div className="md:w-1/3 bg-gray-900 p-10 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-bl-full opacity-20"></div>
          <h2 className="text-3xl font-black mb-4 z-10">
            Espace
            <br />
            <span className="text-blue-500">Recruteur</span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed z-10">
            Rejoignez TafTech pour accéder aux meilleurs talents d'Algérie.
            Votre compte sera actif après vérification de vos documents légaux.
          </p>
          <div className="mt-10 space-y-4 z-10">
            <div className="flex items-center gap-3 text-xs text-gray-300 font-bold">
              <span className="w-6 h-6 flex items-center justify-center bg-blue-600/20 text-blue-500 rounded-full">
                ✓
              </span>{" "}
              Publication illimitée
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300 font-bold">
              <span className="w-6 h-6 flex items-center justify-center bg-blue-600/20 text-blue-500 rounded-full">
                ✓
              </span>{" "}
              Gestion des candidatures
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300 font-bold">
              <span className="w-6 h-6 flex items-center justify-center bg-blue-600/20 text-blue-500 rounded-full">
                ✓
              </span>{" "}
              Visibilité Premium
            </div>
          </div>
        </div>

        {/* Colonne de droite : Formulaire */}
        <div className="md:w-2/3 p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-2xl font-black text-gray-900 mb-6">
              Créer un compte entreprise
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Nom du responsable
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Email Pro
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="telephone"
                  required
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                name="nom_entreprise"
                required
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Secteur d'activité
                </label>
                <Select
                  options={constants.secteurs}
                  placeholder="Sélectionnez..."
                  onChange={(opt) =>
                    setFormData({ ...formData, secteur_activite: opt.value })
                  }
                  styles={{
                    control: (b) => ({
                      ...b,
                      borderRadius: "0.75rem",
                      padding: "0.15rem",
                      borderColor: "#e5e7eb",
                      backgroundColor: "#f9fafb",
                      fontSize: "0.875rem",
                      fontWeight: "bold",
                    }),
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Wilaya du siège
                </label>
                <Select
                  options={constants.wilayas}
                  placeholder="Sélectionnez..."
                  onChange={(opt) =>
                    setFormData({ ...formData, wilaya_siege: opt.value })
                  }
                  styles={{
                    control: (b) => ({
                      ...b,
                      borderRadius: "0.75rem",
                      padding: "0.15rem",
                      borderColor: "#e5e7eb",
                      backgroundColor: "#f9fafb",
                      fontSize: "0.875rem",
                      fontWeight: "bold",
                    }),
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Registre de Commerce
                </label>
                <input
                  type="text"
                  name="registre_commerce"
                  required
                  onChange={handleChange}
                  placeholder="Ex: 1234567A89"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  name="password"
                  minLength="8"
                  required
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 mt-4"
            >
              {loading ? "CRÉATION EN COURS..." : "S'INSCRIRE COMME EMPLOYEUR"}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500 font-medium">
            Déjà un compte ?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-black hover:underline"
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
