import { useEffect, useRef } from "react";
import { adminService } from "../Services/adminService";

const DELAI_RECHERCHE_MS = 350;
const MIN_CARACTERES = 2;

/**
 * `loadOptions` d'un <AsyncSelect> de métiers côté admin : recherche différée par libellé ou appellation (même
 * source que l'Explorateur du référentiel). Option : `{ value: id du métier, label: « Métier (domaine) » }`.
 */
export const useChercherMetiers = () => {
  const minuteur = useRef(null);
  useEffect(() => () => clearTimeout(minuteur.current), []);

  return (terme) => new Promise((resolve) => {
    clearTimeout(minuteur.current);
    if (terme.trim().length < MIN_CARACTERES) {
      resolve([]);
      return;
    }
    minuteur.current = setTimeout(() => {
      adminService.getExplorateurRecherche(terme.trim())
        .then((r) => resolve((r?.resultats || []).map((m) => ({
          value: m.id,
          label: m.groupe && m.groupe !== "—" ? `${m.libelle} (${m.groupe})` : m.libelle,
        }))))
        .catch(() => resolve([]));
    }, DELAI_RECHERCHE_MS);
  });
};
