import { useEffect } from "react";

const SITE_NAME = "TafTech";
const DEFAULT_DESCRIPTION =
  "Plateforme de recrutement en ligne en Algérie. Trouvez un emploi ou recrutez les meilleurs profils grâce au matching intelligent.";
const DEFAULT_IMAGE = "/taftech-favicon-original.ico";

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

// Balises <title>/<meta description>/Open Graph par page — sans librairie (SPA sans SSR,
// react-helmet-async exigerait un <HelmetProvider> ancêtre que les tests existants n'ont
// pas). Restaure les valeurs par défaut d'index.html au démontage pour ne pas polluer la
// page suivante si la navigation ne remonte pas ce composant.
const Seo = ({ title, description = DEFAULT_DESCRIPTION, image = DEFAULT_IMAGE, noindex = false }) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Recrutement en ligne en Algérie`;
    const cleanDescription = description ? description.slice(0, 300) : DEFAULT_DESCRIPTION;
    const previousTitle = document.title;

    document.title = fullTitle;
    setMeta("name", "description", cleanDescription);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", cleanDescription);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", cleanDescription);
    if (noindex) setMeta("name", "robots", "noindex, nofollow");

    return () => {
      document.title = previousTitle;
      if (noindex) setMeta("name", "robots", "index, follow");
    };
  }, [title, description, image, noindex]);

  return null;
};

export default Seo;
