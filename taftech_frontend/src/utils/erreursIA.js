// Code renvoyé par le serveur quand le fournisseur IA (Groq) a refusé l'appel faute de quota.
export const CODE_FOURNISSEUR_SATURE = "IA_FOURNISSEUR_SATURE";

// Vrai quand une réponse d'erreur IA doit désactiver le bouton de la fonction : quota de
// l'utilisateur atteint, abonnement insuffisant, budget épuisé. Une saturation TEMPORAIRE du
// fournisseur n'en fait pas partie : le message s'affiche, l'appel n'a rien coûté à l'utilisateur
// (remboursé côté serveur) et le bouton reste actif pour réessayer plus tard.
export const bloqueLaFonctionIA = (donnees) =>
  Boolean(donnees) &&
  donnees.code !== CODE_FOURNISSEUR_SATURE &&
  (donnees.quota_restant_jour !== undefined || Boolean(donnees.code));
