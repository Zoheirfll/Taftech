import React from "react";
import EntrepriseEnAttente from "./EntrepriseEnAttente";
import { STATUT_ENTREPRISE, useStatutEntreprise } from "../../utils/useStatutEntreprise";

// Enveloppe l'espace recruteur : tant que l'entreprise n'est pas validée par TafTech, rien de
// l'espace (menu, pages, appels de données) n'est monté — uniquement l'écran d'attente.
// Pendant la lecture du statut on ne monte pas non plus les enfants, sinon leurs appels
// partiraient et seraient refusés (403) pour un recruteur en attente.
const EntrepriseValideeGuard = ({ children }) => {
  const { statut, nomEntreprise, actualiser } = useStatutEntreprise();

  if (statut === STATUT_ENTREPRISE.CHARGEMENT) return <div className="min-h-[70vh]" aria-busy="true" />;
  if (statut === STATUT_ENTREPRISE.EN_ATTENTE) {
    return <EntrepriseEnAttente nomEntreprise={nomEntreprise} actualiser={actualiser} />;
  }
  return children;
};

export default EntrepriseValideeGuard;
