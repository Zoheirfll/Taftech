import React from "react";
import { tw } from "../theme";

/**
 * État d'un métier proposé par le candidat (« Je ne trouve pas mon métier ») :
 *  - en attente : il reste sélectionné mais ne compte pas dans le calcul de ses offres tant qu'il n'est pas validé ;
 *  - refusé : l'équipe ne l'a pas retenu (motif affiché), il ne compte pas non plus.
 * `propose` : { statut, motif_refus } renvoyé par l'API (`metier_propose`), ou { statut: "A_EXAMINER" } juste après l'envoi.
 */
export const MetierProposeBadge = ({ propose }) => {
  if (!propose) return null;
  if (propose.statut === "REFUSEE") {
    return (
      <span className={tw.badgeError}>
        Non retenu{propose.motif_refus ? ` : ${propose.motif_refus}` : ""} — ne compte pas dans votre score
      </span>
    );
  }
  return <span className={tw.badgeAccent}>En attente de validation — ne compte pas encore dans votre score</span>;
};

export default MetierProposeBadge;
