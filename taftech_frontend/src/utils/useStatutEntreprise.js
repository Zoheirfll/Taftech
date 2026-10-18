import { useCallback, useEffect, useState } from "react";
import { authService } from "../Services/authService";

export const STATUT_ENTREPRISE = {
  CHARGEMENT: "chargement",
  EN_ATTENTE: "en_attente",
  OK: "ok",
};

// Statut de validation de l'entreprise du recruteur connecté (`accounts/me/`).
// Seul le compte RECRUTEUR est concerné : un membre d'équipe (compte CANDIDAT) ou un
// admin est toujours « OK ». Ce hook ne sert qu'à l'affichage — le vrai blocage est côté
// serveur (CustomJWTAuthentication renvoie 403 ENTREPRISE_NON_VALIDEE sur toute route
// métier) : si `me/` échoue, on laisse l'affichage normal plutôt qu'un écran bloqué à tort.
export const useStatutEntreprise = () => {
  const concerne = authService.getUserRole() === "RECRUTEUR";
  const [statut, setStatut] = useState(concerne ? STATUT_ENTREPRISE.CHARGEMENT : STATUT_ENTREPRISE.OK);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const actualiser = useCallback(async () => {
    if (!concerne) return;
    try {
      const me = await authService.getMe();
      setNomEntreprise(me.nom_entreprise || "");
      setStatut(me.entreprise_approuvee === false ? STATUT_ENTREPRISE.EN_ATTENTE : STATUT_ENTREPRISE.OK);
    } catch {
      setStatut(STATUT_ENTREPRISE.OK);
    }
  }, [concerne]);

  useEffect(() => {
    actualiser();
  }, [actualiser]);

  return { statut, nomEntreprise, actualiser };
};
