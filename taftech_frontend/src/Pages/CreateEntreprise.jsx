import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { entrepriseService } from "../Services/entrepriseService";

const CreateEntreprise = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nom_entreprise: "",
    secteur_activite: "",
    registre_commerce: "",
    wilaya_siege: "",
    description: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    try {
      // CORRECTION ICI : On utilise le bon nom de fonction !
      await entrepriseService.creerEntreprise(formData);

      setStatus({
        type: "success",
        message: "Entreprise enregistrée ! Vous êtes maintenant Recruteur.",
      });

      // On le renvoie vers le dashboard recruteur
      setTimeout(() => {
        navigate("/"); // Pense à changer ça vers ton dashboard si besoin !
      }, 2000);
    } catch (error) {
      // SÉCURITÉ : On affiche la vraie erreur dans la console F12
      console.error("VRAIE ERREUR :", error);

      setStatus({
        type: "error",
        message:
          error.response?.data?.error ||
          error.response?.data?.registre_commerce?.[0] || // Si le RC existe déjà
          "Erreur lors de la création de l'entreprise.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md border-t-4 border-blue-600">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Enregistrer mon Entreprise
        </h2>

        {status.message && (
          <div
            className={`p-4 rounded-md mb-6 font-medium ${status.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, nom_entreprise: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secteur d'activité *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Informatique, Énergie..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, secteur_activite: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registre de Commerce (RC) *
              </label>
              <input
                type="text"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registre_commerce: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wilaya du siège *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Oran, Alger..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, wilaya_siege: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description de l'entreprise
            </label>
            <textarea
              rows="4"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200"
          >
            Créer mon profil Recruteur
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEntreprise;
