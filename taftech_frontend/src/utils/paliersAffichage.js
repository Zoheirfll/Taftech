// Source unique de l'affichage des caractéristiques d'un palier (admin + page Abonnements
// recruteur) : tout est calculé à partir des champs du modèle Palier, rien n'est codé en dur
// par palier. Convention : champ vide (null) = illimité, 0 = fonctionnalité bloquée.

export const formaterQuotaIA = (jour, mois) => {
  if (jour === 0 || mois === 0) return { inclus: false, texte: "Non inclus" };
  if (jour == null && mois == null) return { inclus: true, texte: "Illimité" };
  const parts = [];
  if (jour != null) parts.push(`${jour}/jour`);
  if (mois != null) parts.push(`${mois}/mois`);
  return { inclus: true, texte: parts.join(" · ") };
};

const nombreOuIllimite = (v) => (v != null ? String(v) : "Illimité");

// type "booleen" : coche ou tiret ; "valeur" : texte/nombre affiché tel quel.
export const CARACTERISTIQUES_PALIER = [
  {
    id: "limite_offres", label: "Offres d'emploi actives", type: "valeur",
    valeur: (p) => nombreOuIllimite(p.limite_offres),
    ligneCarte: (p) => (p.limite_offres != null ? `${p.limite_offres} offres d'emploi actives` : "Offres d'emploi illimitées"),
  },
  {
    id: "credits_mois", label: "Crédits CVthèque / mois", type: "valeur",
    valeur: (p) => nombreOuIllimite(p.credits_mois),
    ligneCarte: (p) => (p.credits_mois != null ? `${p.credits_mois} crédits CVthèque/mois` : "Crédits CVthèque illimités"),
  },
  {
    id: "acces_coordonnees", label: "« Inviter à postuler » depuis la CVthèque", type: "booleen",
    valeur: (p) => !!p.acces_coordonnees,
    ligneCarte: () => "Inviter à postuler depuis la CVthèque",
  },
  {
    id: "acces_ia_recommandes", label: "Candidats recommandés (IA)", type: "booleen",
    valeur: (p) => !!p.acces_ia_recommandes,
    ligneCarte: () => "Candidats recommandés (IA)",
  },
  {
    id: "acces_ia_avancee", label: "Recherche avancée & statistiques IA", type: "booleen",
    valeur: (p) => !!p.acces_ia_avancee,
    ligneCarte: () => "Recherche & statistiques avancées (IA)",
  },
  {
    id: "acces_equipe", label: "Gestion d'équipe multi-utilisateurs", type: "booleen",
    valeur: (p) => !!p.acces_equipe,
    ligneCarte: () => "Gestion d'équipe multi-utilisateurs",
  },
  {
    id: "quota_generation_offre", label: "Génération d'offre par IA", type: "valeur",
    valeur: (p) => formaterQuotaIA(p.quota_generation_offre_jour, p.quota_generation_offre_mois).texte,
    inclus: (p) => formaterQuotaIA(p.quota_generation_offre_jour, p.quota_generation_offre_mois).inclus,
    ligneCarte: (p) => `Génération d'offre par IA : ${formaterQuotaIA(p.quota_generation_offre_jour, p.quota_generation_offre_mois).texte}`,
  },
  {
    id: "quota_analyse_recruteur", label: "Analyse IA des candidatures", type: "valeur",
    valeur: (p) => formaterQuotaIA(p.quota_analyse_recruteur_jour, p.quota_analyse_recruteur_mois).texte,
    inclus: (p) => formaterQuotaIA(p.quota_analyse_recruteur_jour, p.quota_analyse_recruteur_mois).inclus,
    ligneCarte: (p) => `Analyse IA des candidatures : ${formaterQuotaIA(p.quota_analyse_recruteur_jour, p.quota_analyse_recruteur_mois).texte}`,
  },
  {
    id: "support_label", label: "Niveau de support", type: "valeur",
    valeur: (p) => p.support_label || "—",
    inclus: (p) => !!p.support_label,
    ligneCarte: (p) => `Support ${String(p.support_label).toLowerCase()}`,
  },
];

const estInclus = (c, p) => {
  if (c.inclus) return c.inclus(p);
  if (c.type === "booleen") return !!c.valeur(p);
  return true;
};

// Lignes à puce d'une carte de palier : uniquement ce qui est réellement inclus.
export const lignesCartePalier = (p) =>
  CARACTERISTIQUES_PALIER.filter((c) => estInclus(c, p)).map((c) => ({ id: c.id, texte: c.ligneCarte(p) }));

// Cellule de tableau comparatif : ✓ / — pour un booléen, sinon la valeur.
export const valeurTableau = (c, p) => {
  const v = c.valeur(p);
  return c.type === "booleen" ? (v ? "✓" : "—") : v;
};

// Pourcentage de remise annuelle calculé (badge « -X% »), null si non applicable.
export const remiseAnnuellePct = (p) => {
  if (!p.remise_annuelle_active || !p.prix_mensuel_da || !p.prix_annuel_da) return null;
  const pct = Math.round((1 - p.prix_annuel_da / (p.prix_mensuel_da * 12)) * 100);
  return pct > 0 ? pct : null;
};
