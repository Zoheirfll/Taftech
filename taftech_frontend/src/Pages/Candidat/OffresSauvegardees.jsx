import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter"; // 👇 Import télémétrie

const OffresSauvegardees = () => {
  const [favoris, setFavoris] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavoris = async () => {
    try {
      const response = await api.get("jobs/sauvegardes/");
      setFavoris(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement de vos offres sauvegardées.");
      // 🛑 Télémétrie ajoutée
      reportError("ECHEC_CHARGEMENT_FAVORIS", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFavoris();
  }, []);

  const handleRemove = async (id) => {
    // Sauvegarde de l'état actuel pour le rollback
    const previousFavoris = [...favoris];
    const updatedFavoris = favoris.filter((f) => f.id !== id);
    setFavoris(updatedFavoris);

    try {
      await api.delete(`jobs/sauvegardes/${id}/`);
      toast.success("Offre retirée des favoris.");
    } catch (error) {
      // 🛑 ROLLBACK : On remet l'ancienne liste en cas d'échec
      setFavoris(previousFavoris);
      reportError("ECHEC_SUPPRESSION_FAVORI", error);
      toast.error("Erreur lors de la suppression.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 min-h-[400px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
              Mes offres sauvegardées
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Dans cette rubrique sont stockées toutes les offres enregistrées.
            </p>
          </div>

          <select className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
            <option>Plus récentes</option>
            <option>Plus anciennes</option>
          </select>
        </div>

        {favoris.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-black text-gray-800">
              Aucune offre enregistrée
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm">
              Parcourez les offres d'emploi et cliquez sur l'icône de sauvegarde
              pour les retrouver facilement ici.
            </p>
            <Link
              to="/offres"
              className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md"
            >
              Explorer les offres
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {favoris.map((favori) => (
              <div
                key={favori.id}
                className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border border-gray-100 rounded-2xl hover:shadow-md hover:border-blue-100 transition-all group bg-white"
              >
                <div className="mb-4 md:mb-0">
                  <Link
                    to={`/jobs/${favori.offre_detail.id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    <h4 className="font-bold text-lg text-gray-900">
                      {favori.offre_detail.titre}
                    </h4>
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-black text-gray-800">
                      {favori.offre_detail.entreprise.nom_entreprise}
                    </span>{" "}
                    • {favori.offre_detail.wilaya}
                  </p>
                  <p className="text-xs text-gray-400 mt-3 font-medium">
                    Sauvegardée le{" "}
                    {new Date(favori.date_sauvegarde).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Link
                    to={`/jobs/${favori.offre_detail.id}`}
                    className="flex-1 md:flex-none text-center bg-blue-50 text-blue-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors"
                  >
                    Consulter
                  </Link>
                  <button
                    onClick={() => handleRemove(favori.id)}
                    className="p-2.5 text-blue-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Retirer des favoris"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OffresSauvegardees;
