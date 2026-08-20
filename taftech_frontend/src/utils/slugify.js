// Génère un slug ASCII cosmétique depuis un titre — utilisé uniquement pour des URLs
// lisibles (SEO). Le lookup réel d'une offre se fait sur le `code_public` (ou l'ID
// numérique en fallback), toujours le dernier segment ; le reste du chemin est
// cosmétique côté backend (voir JobDetail.jsx qui fait `.split("-").pop()`).
const DIACRITICS_REGEX = new RegExp("[̀-ͯ]", "g");

export const slugify = (text) =>
  (text || "")
    .toString()
    .normalize("NFKD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// URL SEO imbriquée façon "/entreprises/{slug}/offres-d-emploi/{secteur}/{titre}-{code}".
// `offre` doit avoir titre/code_public/secteur_libelle, et entreprise.slug — sauf si
// `entrepriseSlugOverride` est fourni (cas des pages où l'offre n'embarque pas l'objet
// entreprise complet, ex. EntreprisePublic.jsx où l'entreprise est déjà connue par ailleurs).
export const jobUrl = (offre, entrepriseSlugOverride) => {
  const entrepriseSlug = entrepriseSlugOverride || offre.entreprise?.slug || "entreprise";
  const secteurSlug = slugify(offre.secteur_libelle) || "offres-d-emploi";
  const titreSlug = slugify(offre.titre);
  const code = offre.code_public || offre.id;
  const dernierSegment = titreSlug ? `${titreSlug}-${code}` : `${code}`;
  return `/entreprises/${entrepriseSlug}/offres-d-emploi/${secteurSlug}/${dernierSegment}`;
};

// Même principe pour secteurs/métiers/wilayas : le préfixe avant le premier "-" est la
// seule partie significative (code stable), le reste est cosmétique pour le SEO — voir
// SecteurDetail/MetierDetail/RegionDetail.jsx qui font `slug.split("-")[0]` au retour.
export const secteurUrl = (code, libelle) => {
  const slug = slugify(libelle);
  return slug ? `/secteurs/${code.toLowerCase()}-${slug}` : `/secteurs/${code.toLowerCase()}`;
};

export const metierUrl = (code, libelle) => {
  const slug = slugify(libelle);
  return slug ? `/metiers/${code.toLowerCase()}-${slug}` : `/metiers/${code.toLowerCase()}`;
};

// wilaya.value est au format "16 - Alger" (WILAYAS_CHOICES) — on ne garde que le code
// numérique en préfixe d'URL, le nom en slug cosmétique.
export const regionUrl = (wilayaValue) => {
  const [code, nom] = (wilayaValue || "").split(" - ");
  const slug = slugify(nom);
  return slug ? `/regions/${code}-${slug}` : `/regions/${code}`;
};
