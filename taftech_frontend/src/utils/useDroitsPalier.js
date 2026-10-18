import { useEffect, useState } from "react";
import { jobsService } from "../Services/jobsService";

// Droits du palier actif de l'entreprise (`mon-abonnement/`) : acces_cvtheque, acces_equipe,
// acces_ia_recommandes, peut_publier_offre…. Renvoie {} tant qu'ils sont inconnus (ou si la
// lecture échoue) : un cadenas ne s'affiche que quand un droit vaut explicitement `false`, donc
// aucun lien ne clignote. Sert à l'affichage seulement — le serveur reste le garde.
// `actif` : à passer à false pour un visiteur ou un recruteur dont l'entreprise n'est pas validée
// (rien n'est alors lu : l'appel serait refusé).
export const useDroitsPalier = (actif = true) => {
  const [droits, setDroits] = useState({});

  useEffect(() => {
    if (!actif) return undefined;
    let encours = true;
    jobsService
      .getMonAbonnement()
      .then((d) => encours && setDroits(d || {}))
      .catch(() => {}); // déjà journalisé par getMonAbonnement
    return () => {
      encours = false;
    };
  }, [actif]);

  return droits;
};

// Vrai quand l'entrée de menu exige un droit que le palier ne donne pas.
export const estVerrouille = (droits, droitRequis) => !!droitRequis && droits[droitRequis] === false;
