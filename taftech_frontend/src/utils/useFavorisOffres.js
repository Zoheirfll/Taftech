import { useState, useEffect } from "react";
import api from "../api/axiosConfig";
import { notifier } from "./notifier";
import { reportError } from "./errorReporter";

// Offres sauvegardées du compte connecté, partagées par toutes les listes d'offres (même ligne, même
// comportement). `chargerAuMontage` : la page qui charge déjà ses favoris elle-même (JobsList, dans son
// Promise.all) le laisse à false et alimente `setFavoris`.
export const useFavorisOffres = ({ chargerAuMontage = false } = {}) => {
  const [favoris, setFavoris] = useState([]);

  useEffect(() => {
    if (!chargerAuMontage || !localStorage.getItem("userRole")) return;
    api.get("jobs/sauvegardes/").then((r) => setFavoris(r.data)).catch(() => {});
  }, [chargerAuMontage]);

  const basculerFavori = async (offreId) => {
    if (!localStorage.getItem("userRole")) return notifier.erreur("Connexion requise", "Connectez-vous pour sauvegarder une offre.");
    const isDejaSauvegarde = favoris.find((f) => f.offre === offreId);
    if (isDejaSauvegarde) {
      setFavoris(favoris.filter((f) => f.offre !== offreId));
      try {
        await api.delete(`jobs/sauvegardes/${isDejaSauvegarde.id}/`);
        notifier.succes("Offre retirée des favoris");
      } catch (error) {
        setFavoris([...favoris, isDejaSauvegarde]);
        notifier.echec("Suppression impossible", error);
        reportError("ECHEC_SUPPRESSION_FAVORI", error);
      }
    } else {
      try {
        const response = await api.post("jobs/sauvegardes/", { offre: offreId });
        setFavoris([...favoris, response.data]);
        notifier.succes("Offre sauvegardée");
      } catch (error) {
        notifier.echec("Sauvegarde impossible", error);
        reportError("ECHEC_SAUVEGARDE_FAVORI", error);
      }
    }
  };

  const estSauvegardee = (offreId) => favoris.some((f) => f.offre === offreId);

  return { favoris, setFavoris, basculerFavori, estSauvegardee };
};
