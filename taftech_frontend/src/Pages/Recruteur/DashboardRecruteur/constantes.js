// Constantes et petit utilitaire de date du tableau de bord recruteur (emojis d'activité, étapes du pipeline, périodes).

export const ACTIVITE_EMOJIS = {
  CREER_OFFRE: "📢",
  MODIFIER_OFFRE: "✏️",
  CLOTURER_OFFRE: "🔒",
  STATUT_CANDIDATURE: "🔄",
  EVALUER_CANDIDATURE: "⭐",
  INVITER_MEMBRE: "👥",
  RETIRER_MEMBRE: "🚫",
  CHANGER_ROLE: "🛡️",
  AUTRE: "🔔",
};

export const PIPELINE_STAGES = [
  { key: "RECUE", label: "Reçue", color: "#d97706" },
  { key: "EN_COURS", label: "En cours", color: "#2563eb" },
  { key: "PRESELECTION", label: "Présélection", color: "#9333ea" },
  { key: "ENTRETIEN", label: "Entretien", color: "#ea580c" },
  { key: "RETENU", label: "Retenu(e)", color: "#059669" },
  { key: "REFUSE", label: "Refusé(e)", color: "#dc2626" },
];

export const PERIODES_EVOLUTION = [
  { key: "7j", label: "7 derniers jours" },
  { key: "30j", label: "30 derniers jours" },
  { key: "6m", label: "6 derniers mois" },
  { key: "1a", label: "12 derniers mois" },
];

// Même seuil que ActiviteProfil.SEUIL_SCORE_RECOMMANDE (backend) — un candidat n'est
// qualifié de "recommandé" qu'à partir de 80% de compatibilité.
export const SEUIL_SCORE_RECOMMANDE = 80;

export const formatTempsRelatif = (dateStr) => {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures}h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours}j`;
};
