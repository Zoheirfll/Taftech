import { jobUrl } from "./slugify";

// Valeurs autorisées par Google pour `employmentType` (même table que jobs/seo_pages.py).
const TYPES_EMPLOI = {
  CDI: "FULL_TIME",
  CDD: "TEMPORARY",
  INTERIM: "TEMPORARY",
  FREELANCE: "CONTRACTOR",
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
  const region = (job.wilaya || "").split(" - ")[1] || job.wilaya || "";
  const adresse = { "@type": "PostalAddress", addressCountry: "DZ" };
  if (job.commune || region) adresse.addressLocality = job.commune || region;
  if (region) adresse.addressRegion = region;

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
    jobLocation: { "@type": "Place", address: adresse },
  };
  if (entreprise.logo_url) donnees.hiringOrganization.logo = entreprise.logo_url;
  if (job.date_expiration) donnees.validThrough = jourIso(job.date_expiration);
  if (TYPES_EMPLOI[job.type_contrat]) donnees.employmentType = TYPES_EMPLOI[job.type_contrat];
  return donnees;
};
