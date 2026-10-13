// Fonctions pures de calcul du tableau de bord recruteur (stats, évolution, pipeline, funnel, sources, recommandés).
import { PIPELINE_STAGES, SEUIL_SCORE_RECOMMANDE } from "./constantes";

export const calculerStats = (offres) => {
  let total = 0, nouvelles = 0, pertinentes = 0, enTraitement = 0;
  offres.forEach((o) => {
    o.candidatures?.forEach((c) => {
      total++;
      if (c.statut === "RECUE") nouvelles++;
      if (c.statut === "EN_COURS" || c.statut === "PRESELECTION" || c.statut === "ENTRETIEN") enTraitement++;
      if (parseFloat(c.score_matching) >= 80) pertinentes++;
    });
  });
  return { total, nouvelles, pertinentes, enTraitement };
};

// shiftPeriodes=1 décale tout le bucket d'une période complète en arrière (comparaison)
export const buildEvolutionBuckets = (offresPourAnalyse, periode, shiftPeriodes = 0) => {
  const now = new Date();
  let buckets;
  if (periode === "7j" || periode === "30j") {
    const nbJours = periode === "7j" ? 7 : 30;
    const decalage = shiftPeriodes * nbJours;
    buckets = Array.from({ length: nbJours }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (nbJours - 1 - i) - decalage);
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), candidatures: 0, recrutements: 0 };
    });
    offresPourAnalyse.forEach((o) => o.candidatures?.forEach((c) => {
      if (!c.date_postulation) return;
      const key = c.date_postulation.slice(0, 10);
      const entry = buckets.find((b) => b.key === key);
      if (entry) {
        entry.candidatures++;
        if (c.statut === "RETENU") entry.recrutements++;
      }
    }));
  } else {
    const nbMois = periode === "1a" ? 12 : 6;
    const decalage = shiftPeriodes * nbMois;
    buckets = Array.from({ length: nbMois }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (nbMois - 1 - i) - decalage, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("fr-FR", { month: "short" }), candidatures: 0, recrutements: 0 };
    });
    offresPourAnalyse.forEach((o) => o.candidatures?.forEach((c) => {
      if (!c.date_postulation) return;
      const d = new Date(c.date_postulation);
      const entry = buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (entry) {
        entry.candidatures++;
        if (c.statut === "RETENU") entry.recrutements++;
      }
    }));
  }
  buckets.forEach((b) => {
    b.tauxConversion = b.candidatures > 0 ? Math.round((b.recrutements / b.candidatures) * 100) : 0;
  });
  return buckets;
};

// Répartition des candidatures par statut + total + max (pour les barres)
export const calculerPipeline = (offresPourAnalyse) => {
  const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.key, 0]));
  offresPourAnalyse.forEach((o) => o.candidatures?.forEach((c) => {
    if (counts[c.statut] !== undefined) counts[c.statut]++;
  }));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(counts));
  return { counts, total, max };
};

// Funnel 4 étapes (Candidatures reçues → Présélection → Entretiens → Recrutements)
export const calculerFunnel = (offresPourAnalyse) => {
  const candidatures = offresPourAnalyse.flatMap((o) => o.candidatures || []);
  const total = candidatures.length || 1;
  const presel = candidatures.filter((c) => ["PRESELECTION", "ENTRETIEN", "RETENU", "REFUSE"].includes(c.statut)).length;
  const entretien = candidatures.filter((c) => ["ENTRETIEN", "RETENU"].includes(c.statut)).length;
  const retenu = candidatures.filter((c) => c.statut === "RETENU").length;
  return [
    { label: "Candidatures reçues", count: candidatures.length, pct: 100, couleur: "#204883" },
    { label: "Présélection", count: presel, pct: Math.round((presel / total) * 100), couleur: "#2563eb" },
    { label: "Entretiens", count: entretien, pct: Math.round((entretien / total) * 100), couleur: "#ea580c" },
    { label: "Recrutements", count: retenu, pct: Math.round((retenu / total) * 100), couleur: "#059669" },
  ];
};

// Sources des candidatures (donut, période indépendante)
export const calculerSources = (offres, periodeSources) => {
  const joursParPeriode = { "7j": 7, "30j": 30, "6m": 180, "1a": 365 };
  const seuil = new Date();
  seuil.setDate(seuil.getDate() - (joursParPeriode[periodeSources] || 30));
  const candidatures = offres.flatMap((o) => o.candidatures || []).filter((c) => {
    if (!c.date_postulation) return false;
    return new Date(c.date_postulation) >= seuil;
  });
  const counts = { SITE: 0, CVTHEQUE: 0, AUTRE: 0 };
  candidatures.forEach((c) => {
    const src = c.source || "SITE";
    if (counts[src] !== undefined) counts[src]++;
    else counts.AUTRE++;
  });
  const total = candidatures.length || 1;
  return [
    { key: "SITE", label: "Site TafTech", count: counts.SITE, pct: Math.round((counts.SITE / total) * 100), couleur: "#204883" },
    { key: "CVTHEQUE", label: "CVthèque", count: counts.CVTHEQUE, pct: Math.round((counts.CVTHEQUE / total) * 100), couleur: "#3a8226" },
    { key: "AUTRE", label: "Autres", count: counts.AUTRE, pct: Math.round((counts.AUTRE / total) * 100), couleur: "#94a3b8" },
  ];
};

// Candidats recommandés : meilleurs scores (>= seuil) toutes offres actives confondues.
// Pas de filtre "masquer retenus/refusés" dans ce widget compact (contrairement à la page
// dédiée /candidats-recommandes). Une offre expirée est fermée par le cron quotidien
// `archiver_offres_expirees`; pas de fenêtre de récence sur la date de candidature (27/09/2026).
export const calculerCandidatsRecommandes = (offresPourAnalyse) => {
  const today = new Date().toISOString().slice(0, 10);
  const all = [];
  offresPourAnalyse.forEach((o) => {
    const offreActive = o.est_active !== false && !o.est_cloturee && (!o.date_expiration || o.date_expiration >= today);
    if (!offreActive) return;
    o.candidatures?.forEach((c) => {
      if (!c.est_rapide && c.candidat && c.score_matching !== null && c.score_matching !== undefined
        && parseFloat(c.score_matching) >= SEUIL_SCORE_RECOMMANDE) {
        all.push({ ...c, offreTitre: o.titre, offreId: o.id });
      }
    });
  });
  return all.sort((a, b) => parseFloat(b.score_matching) - parseFloat(a.score_matching));
};
