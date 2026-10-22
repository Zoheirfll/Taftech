// Signal « le profil du candidat vient d'être modifié » (photo…) : la barre de navigation garde sa
// propre copie de la photo et ne la rechargeait qu'au changement d'URL, donc restait périmée quand
// le profil était modifié dans une fenêtre ouverte sur la même page.
const NOM_EVENEMENT = "taftech:profil-mis-a-jour";

export const notifierProfilMisAJour = () => {
  window.dispatchEvent(new Event(NOM_EVENEMENT));
};

// Retourne la fonction de désabonnement (à renvoyer depuis un useEffect).
export const ecouterProfilMisAJour = (rappel) => {
  window.addEventListener(NOM_EVENEMENT, rappel);
  return () => window.removeEventListener(NOM_EVENEMENT, rappel);
};
