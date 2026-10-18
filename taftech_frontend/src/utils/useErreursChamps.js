import { useCallback, useState } from "react";
import { extraireErreursChamps } from "./fieldErrors";

// Erreurs « sous chaque champ » d'un formulaire, avec un seul modèle pour tous les formulaires :
//   const { erreurs, exiger, depuisReponse, effacer, attributs } = useErreursChamps();
//   - exiger(valeurs, { nom: "Le nom est obligatoire." })  → remplit les erreurs, renvoie true s'il en reste
//   - depuisReponse(err)                                   → lit les erreurs de validation du serveur (DRF)
//   - effacer("nom")                                       → à appeler quand l'utilisateur corrige le champ
//   - attributs("nom")                                     → à étaler sur le champ (bordure rouge + lecteur d'écran)
//   et sous le champ : <FieldError id="err-nom" message={erreurs.nom} />
export const useErreursChamps = () => {
  const [erreurs, setErreurs] = useState({});

  const exiger = useCallback((valeurs, regles) => {
    const trouvees = {};
    Object.entries(regles).forEach(([champ, message]) => {
      if (!String(valeurs[champ] ?? "").trim()) trouvees[champ] = message;
    });
    setErreurs(trouvees);
    return Object.keys(trouvees).length > 0;
  }, []);

  const definir = useCallback((nouvelles) => setErreurs(nouvelles || {}), []);

  const depuisReponse = useCallback((err, champsConnus) => {
    const lues = extraireErreursChamps(err, champsConnus);
    setErreurs(lues);
    return Object.keys(lues).length > 0;
  }, []);

  const effacer = useCallback((champ) => {
    setErreurs((courantes) => (courantes[champ] ? { ...courantes, [champ]: undefined } : courantes));
  }, []);

  const attributs = (champ) => ({
    "aria-invalid": !!erreurs[champ],
    "aria-describedby": erreurs[champ] ? `err-${champ}` : undefined,
  });

  return { erreurs, exiger, definir, depuisReponse, effacer, attributs };
};
