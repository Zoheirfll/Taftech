import { useEffect, useState } from "react";
import { jobsService } from "../Services/jobsService";
import { fusionnerSuggestions } from "./competencesSuggerees";

/**
 * Compétences suggérées pour les métiers `metierIds` (voir `idsMetiers`), hors ce que le candidat possède
 * déjà (`possedees`). Une requête par métier à la route publique de suggestions : aucune donnée du candidat
 * n'est envoyée, seulement des identifiants de métier du référentiel.
 */
export const useCompetencesSuggerees = (metierIds, possedees) => {
  const [reponses, setReponses] = useState([]);
  const cleIds = (metierIds || []).join(",");

  useEffect(() => {
    if (!cleIds) return undefined;
    let annule = false;
    Promise.all(cleIds.split(",").map((id) => jobsService.getMetierSuggestions(Number(id))))
      .then((resultats) => {
        if (!annule) setReponses(resultats);
      })
      .catch(() => {
        if (!annule) setReponses([]);
      });
    return () => {
      annule = true;
    };
  }, [cleIds]);

  // Dérivé au rendu : la liste suit les compétences ajoutées sans nouvelle requête.
  return fusionnerSuggestions(cleIds ? reponses : [], possedees);
};
