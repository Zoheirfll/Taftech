import React from "react";
import { Clock } from "lucide-react";
import Tooltip from "./Tooltip";
import { tw } from "../theme";

// Formate le temps restant avant renouvellement du quota ("2h15", "3 j", "bientôt").
const formatDuree = (isoDate) => {
  if (!isoDate) return null;
  const diffMs = new Date(isoDate).getTime() - Date.now();
  if (diffMs <= 0) return "bientôt";
  const heures = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  if (heures >= 24) return `${Math.floor(heures / 24)} j`;
  if (heures > 0) return `${heures}h${String(minutes).padStart(2, "0")}`;
  return `${minutes} min`;
};

/**
 * Badge compact + tooltip affichant le quota IA restant (jour/mois) pour une fonctionnalité —
 * toujours lu depuis la vraie réponse backend (`jobsService.getQuotaIA(fonction)`), jamais un
 * chiffre en dur côté frontend. `quota` = objet renvoyé par `GET jobs/ia/quota/<fonction>/`
 * (ou par la réponse `quota_ia` d'un appel IA réussi) : `{ quota_restant_jour, quota_restant_mois,
 * renouvellement_jour, renouvellement_mois, disponible }`.
 */
const QuotaIABadge = ({ quota, className = "" }) => {
  if (!quota) return null;
  const { quota_restant_jour, quota_restant_mois, renouvellement_jour, renouvellement_mois, disponible } = quota;
  const epuise = quota_restant_jour === 0 || disponible === false;

  let texte;
  let detail;
  if (epuise) {
    const renouv = renouvellement_jour || quota.renouvellement_le;
    texte = "Quota atteint";
    detail = renouv ? `Renouvellement dans ${formatDuree(renouv)}.` : "Réessayez plus tard.";
  } else if (quota_restant_jour != null) {
    texte = `${quota_restant_jour} restante${quota_restant_jour > 1 ? "s" : ""} aujourd'hui`;
    detail = `Renouvellement dans ${formatDuree(renouvellement_jour)}.`;
    if (quota_restant_mois != null) {
      detail += ` ${quota_restant_mois} restante${quota_restant_mois > 1 ? "s" : ""} ce mois-ci (renouvellement dans ${formatDuree(renouvellement_mois)}).`;
    }
  } else {
    texte = "Illimité";
    detail = "Aucune limite d'usage sur cette fonctionnalité pour votre compte.";
  }

  return (
    <Tooltip text={detail} position="top">
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${epuise ? "text-amber-600" : tw.textMuted700} ${className}`}>
        <Clock size={11} /> {texte}
      </span>
    </Tooltip>
  );
};

export default QuotaIABadge;
