import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { Bookmark, MapPin, Trash2 } from "lucide-react";

const OffresSauvegardees = () => {
  const [favoris, setFavoris] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavoris = async () => {
      try {
        const data = await jobsService.getOffresSauvegardees();
        setFavoris(data);
      } catch (error) {
        toast.error("Erreur lors du chargement.");
        reportError("ECHEC_CHARGEMENT_FAVORIS", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFavoris();
  }, []);

  const handleRemove = async (id) => {
    const previousFavoris = [...favoris];
    setFavoris(prev => prev.filter((f) => f.id !== id));
    try {
      await jobsService.supprimerSauvegarde(id);
      toast.success("Offre retirée des favoris.");
    } catch (error) {
      setFavoris(previousFavoris);
      reportError("ECHEC_SUPPRESSION_FAVORI", error);
      toast.error("Erreur lors de la suppression.");
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Offres sauvegardées
        </h1>
        <p className="text-base text-slate-700 mt-0.5">
          Retrouvez toutes les offres que vous avez enregistrées.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {favoris.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Bookmark size={24} className="text-slate-300" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Aucune offre sauvegardée
            </h3>
            <p className="text-xs text-slate-600 mb-4 max-w-xs">
              Parcourez les offres et cliquez sur l'icône de sauvegarde pour les
              retrouver ici.
            </p>
            <Link
              to="/offres"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Explorer les offres
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {favoris.map((favori) => (
              <div
                key={favori.id}
                className="flex flex-col md:flex-row justify-between items-start md:items-center px-5 py-4 hover:bg-slate-50 transition-colors gap-4"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/jobs/${favori.offre_detail.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    {favori.offre_detail.titre}
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-medium text-indigo-600">
                      {favori.offre_detail.entreprise?.nom_entreprise}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <MapPin size={11} />
                      {favori.offre_detail.wilaya?.split(" - ")[1] || favori.offre_detail.wilaya}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Sauvegardée le{" "}
                    {new Date(favori.date_sauvegarde).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/jobs/${favori.offre_detail.id}`}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Consulter
                  </Link>
                  <button
                    onClick={() => handleRemove(favori.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
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
