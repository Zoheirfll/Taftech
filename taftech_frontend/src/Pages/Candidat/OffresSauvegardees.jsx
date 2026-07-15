import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { Bookmark, MapPin, Trash2 } from "lucide-react";
import { tw } from "../../theme";

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
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.borderPrimary}`}></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={tw.pageTitleGrand}>
          Offres sauvegardées
        </h1>
        <p className={`${tw.bodyTextGrand} mt-0.5`}>
          Retrouvez toutes les offres que vous avez enregistrées.
        </p>
      </div>

      <div className={`${tw.card} rounded-2xl overflow-hidden`}>
        {favoris.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className={`w-14 h-14 ${tw.surfaceMuted} rounded-full flex items-center justify-center mb-4`}>
              <Bookmark size={24} className={tw.textSubtle} />
            </div>
            <h3 className={`text-sm font-semibold ${tw.textStrong} mb-1`}>
              Aucune offre sauvegardée
            </h3>
            <p className={`text-xs ${tw.textMuted} mb-4 max-w-xs`}>
              Parcourez les offres et cliquez sur l'icône de sauvegarde pour les
              retrouver ici.
            </p>
            <Link
              to="/offres"
              className={`px-4 py-2 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-sm font-semibold rounded-lg transition-colors`}
            >
              Explorer les offres
            </Link>
          </div>
        ) : (
          <div className={`divide-y ${tw.divideBase}`}>
            {favoris.map((favori) => (
              <div
                key={favori.id}
                className={`flex flex-col md:flex-row justify-between items-start md:items-center px-5 py-4 ${tw.hoverSurfaceMuted} transition-colors gap-4`}
              >
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/jobs/${favori.offre_detail.id}`}
                    className={`text-sm font-semibold ${tw.textStrong} ${tw.hoverTextPrimary} transition-colors`}
                  >
                    {favori.offre_detail.titre}
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-medium ${tw.textPrimary}`}>
                      {favori.offre_detail.entreprise?.nom_entreprise}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${tw.textMuted}`}>
                      <MapPin size={11} />
                      {favori.offre_detail.wilaya?.split(" - ")[1] || favori.offre_detail.wilaya}
                    </span>
                  </div>
                  <p className={`text-xs ${tw.textMuted} mt-1`}>
                    Sauvegardée le{" "}
                    {new Date(favori.date_sauvegarde).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/jobs/${favori.offre_detail.id}`}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tw.pillLinkPrimarySoft}`}
                  >
                    Consulter
                  </Link>
                  <button
                    onClick={() => handleRemove(favori.id)}
                    className={`p-1.5 rounded-lg transition-colors ${tw.deleteIconButton}`}
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
