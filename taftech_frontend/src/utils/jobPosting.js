import { jobUrl } from "./slugify";
import { lieuxDeLOffre, typesContratDeLOffre } from "./lieuxContrats";

// Valeurs autorisées par Google pour `employmentType` (même table que jobs/seo_pages.py).
const TYPES_EMPLOI = {
  CDI: "FULL_TIME",
  CDD: "TEMPORARY",
  INTERIM: "TEMPORARY",
  FREELANCE: "CONTRACTOR",
  MISSION: "CONTRACTOR",
  STAGE: "INTERN",
  ALTERNANCE: "INTERN",
};

const echapperHtml = (texte) =>
  String(texte).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const paragraphes = (...textes) =>
  textes
    .filter((t) => t && String(t).trim())
    .map((t) => `<p>${echapperHtml(t).replace(/\n/g, "<br>")}</p>`)
    .join("");

const jourIso = (valeur) => String(valeur || "").slice(0, 10);

// Une offre clôturée, désactivée ou expirée ne doit plus apparaître comme offre d'emploi dans Google :
// pas de JobPosting, et la page passe en noindex (voir Seo.jsx).
export const offreIndexable = (job, aujourdhui = jourIso(new Date().toISOString())) => {
  const expiree = Boolean(job.date_expiration) && jourIso(job.date_expiration) < aujourdhui;
  return job.est_active !== false && !job.est_cloturee && !expiree;
};

export const urlCanoniqueOffre = (job, origin = window.location.origin) => `${origin}${jobUrl(job)}/`;

// https://developers.google.com/search/docs/appearance/structured-data/job-posting
// `baseSalary` volontairement absent : le salaire est un texte libre dont on ne peut pas déduire
// l'unité sans risquer d'afficher un montant faux.
export const construireJobPosting = (job, origin = window.location.origin) => {
  const entreprise = job.entreprise || {};
  // Plusieurs lieux de travail : un `Place` par lieu (principal d'abord) ; un seul lieu = un objet, comme avant.
  const lieux = lieuxDeLOffre(job).map((lieu) => {
    const region = lieu.wilaya.split(" - ")[1] || lieu.wilaya;
    return {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressCountry: "DZ", addressLocality: lieu.commune || region, addressRegion: region },
    };
  });
  const lieuParDefaut = { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "DZ" } };

  const donnees = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.titre,
    description: paragraphes(job.description, job.missions, job.profil_recherche) || paragraphes(job.titre),
    datePosted: jourIso(job.date_publication),
    identifier: { "@type": "PropertyValue", name: "TafTech", value: job.code_public },
    url: urlCanoniqueOffre(job, origin),
    directApply: true,
    totalJobOpenings: job.nombre_postes || 1,
    hiringOrganization: {
      "@type": "Organization",
      name: entreprise.nom_entreprise,
      sameAs: `${origin}/entreprise/${entreprise.slug}/`,
    },
    jobLocation: lieux.length === 0 ? lieuParDefaut : lieux.length === 1 ? lieux[0] : lieux,
  };
  if (entreprise.logo_url) donnees.hiringOrganization.logo = entreprise.logo_url;
  if (job.date_expiration) donnees.validThrough = jourIso(job.date_expiration);
  // « CDD ou Stage » : tous les types reconnus, sans doublon ; un seul type = une chaîne, comme avant.
  const typesEmploi = [...new Set(typesContratDeLOffre(job).map((code) => TYPES_EMPLOI[code]).filter(Boolean))];
  if (typesEmploi.length > 0) donnees.employmentType = typesEmploi.length === 1 ? typesEmploi[0] : typesEmploi;
  return donnees;
};
