import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";

const CreateJob = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    titre: "",
    wilaya: "",
    missions: "",
    profil_recherche: "",
    type_contrat: "CDI", // Valeur par défaut
    experience_requise: "DEBUTANT", // Valeur par défaut
    salaire_propose: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    try {
      await jobsService.creerOffre(formData);
      setStatus({ type: "success", message: "Offre publiée avec succès !" });

      // Redirection vers l'accueil après 2 secondes pour voir l'offre
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.response?.data?.error || "Erreur lors de la publication.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-md border-t-4 border-blue-600">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Publier une Offre d'Emploi
        </h2>

        {status.message && (
          <div
            className={`p-4 rounded-md mb-6 font-medium ${status.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre du poste *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Développeur React"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, titre: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu de travail (Wilaya) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Alger, Oran..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, wilaya: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de Contrat
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                onChange={(e) =>
                  setFormData({ ...formData, type_contrat: e.target.value })
                }
              >
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="ANEM">Contrat ANEM (CTA / DAIP)</option>
                <option value="STAGE">Stage / PFE</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expérience Requise
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    experience_requise: e.target.value,
                  })
                }
              >
                <option value="DEBUTANT">Débutant (0 - 1 an)</option>
                <option value="JUNIOR">Junior (1 - 3 ans)</option>
                <option value="CONFIRME">Confirmé (3 - 5 ans)</option>
                <option value="SENIOR">Senior (5 ans et plus)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Missions du poste *
            </label>
            <textarea
              rows="4"
              required
              placeholder="Décrivez les tâches que le candidat devra accomplir..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, missions: e.target.value })
              }
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profil recherché *
            </label>
            <textarea
              rows="4"
              required
              placeholder="Diplômes, compétences techniques, savoir-être..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, profil_recherche: e.target.value })
              }
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salaire proposé (Optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: 80 000 DA Net, À négocier..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, salaire_propose: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200"
          >
            Publier l'offre
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateJob;
