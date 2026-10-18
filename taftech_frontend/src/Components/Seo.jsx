import { useEffect } from "react";

const SITE_NAME = "TafTech";
const DEFAULT_DESCRIPTION =
  "Plateforme de recrutement en ligne en Algérie. Trouvez un emploi ou recrutez les meilleurs profils grâce au matching intelligent.";
const DEFAULT_IMAGE = "/taftech-logo.png";
// Même id que le JSON-LD injecté côté serveur (jobs/seo_pages.py) : le client le remplace, il ne le duplique jamais.
export const ID_JSONLD = "seo-jsonld";

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

// Les robots de partage (Facebook, WhatsApp) ne résolvent pas un chemin relatif comme « /logo.png ».
const urlAbsolue = (url) => {
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
};

// Même convention que le sitemap : slash final unique, sans paramètres ni ancre.
export const urlCanonique = (pathname = window.location.pathname) => {
  const chemin = pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
  return `${window.location.origin}${chemin}`;
};

export const poserCanonical = (href) => {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

export const retirerCanonical = () => document.head.querySelector('link[rel="canonical"]')?.remove();

// `<` échappé en < : impossible de refermer la balise <script> depuis une valeur de la base.
const poserJsonLd = (donnees) => {
  let el = document.getElementById(ID_JSONLD);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = ID_JSONLD;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(donnees).replace(/</g, "\\u003c");
};

const retirerJsonLd = () => document.getElementById(ID_JSONLD)?.remove();

// Balises <title>/<meta description>/Open Graph/canonical/JSON-LD par page — sans librairie (SPA
// sans SSR, react-helmet-async exigerait un <HelmetProvider> ancêtre que les tests existants n'ont
// pas). Restaure les valeurs par défaut d'index.html au démontage pour ne pas polluer la
// page suivante si la navigation ne remonte pas ce composant.
// `canonical` : URL absolue de référence (défaut : URL courante sans paramètres) ; ignoré avec
// `noindex`, une page exclue de l'index n'a pas de canonical. `jsonLd` : objet schema.org.
const Seo = ({ title, description = DEFAULT_DESCRIPTION, image = DEFAULT_IMAGE, noindex = false, canonical, jsonLd }) => {
  const jsonLdTexte = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Recrutement en ligne en Algérie`;
    const cleanDescription = description ? description.slice(0, 300) : DEFAULT_DESCRIPTION;
    const previousTitle = document.title;
    const imageAbsolue = urlAbsolue(image);

    document.title = fullTitle;
    setMeta("name", "description", cleanDescription);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", cleanDescription);
    setMeta("property", "og:image", imageAbsolue);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", cleanDescription);
    if (noindex) {
      setMeta("name", "robots", "noindex, nofollow");
      retirerCanonical();
    } else {
      const urlPage = canonical || urlCanonique();
      poserCanonical(urlPage);
      setMeta("property", "og:url", urlPage);
      if (jsonLdTexte) poserJsonLd(JSON.parse(jsonLdTexte));
    }

    return () => {
      document.title = previousTitle;
      if (noindex) setMeta("name", "robots", "index, follow");
      retirerCanonical();
      document.head.querySelector('meta[property="og:url"]')?.remove();
      retirerJsonLd();
    };
  }, [title, description, image, noindex, canonical, jsonLdTexte]);

  return null;
};

export default Seo;
