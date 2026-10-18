import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Mesure d'audience SANS COOKIE (Plausible ou Umami) : aucun identifiant n'est déposé sur
// l'appareil du visiteur, donc aucune bannière de consentement n'est requise. Inactif tant que les
// variables ne sont pas renseignées dans le `.env` du frontend :
//   VITE_ANALYTICS_PROVIDER=plausible | umami
//   VITE_ANALYTICS_ID=<domaine pour Plausible (taftech.dz) | identifiant du site pour Umami>
//   VITE_ANALYTICS_HOST=<adresse https:// de l'outil ; facultative pour Plausible hébergé>
// ⚠️ Si l'on passe un jour à un outil qui dépose des cookies (Google Analytics...), une bannière
// de consentement devient obligatoire (loi 18-07) : ne pas brancher un tel outil ici sans elle.
const ID_SCRIPT = "taftech-analytics";
const FOURNISSEURS = {
  plausible: { hote: "https://plausible.io", chemin: "/js/script.js", attribut: "data-domain" },
  umami: { hote: "", chemin: "/script.js", attribut: "data-website-id" },
};

export const configurationAnalytics = (env = import.meta.env) => {
  const fournisseur = FOURNISSEURS[env.VITE_ANALYTICS_PROVIDER];
  const identifiant = env.VITE_ANALYTICS_ID;
  const hote = String(env.VITE_ANALYTICS_HOST || fournisseur?.hote || "").replace(/\/+$/, "");
  // https obligatoire : on ne charge jamais un script en clair ni depuis une adresse mal formée.
  if (!fournisseur || !identifiant || !/^https:\/\/[^\s/]+/.test(hote)) return null;
  return { src: `${hote}${fournisseur.chemin}`, attribut: fournisseur.attribut, identifiant, fournisseur: env.VITE_ANALYTICS_PROVIDER };
};

const Analytics = () => {
  const { pathname } = useLocation();
  const dansAdmin = pathname.startsWith("/admin-taftech");

  useEffect(() => {
    if (dansAdmin || document.getElementById(ID_SCRIPT)) return;
    const config = configurationAnalytics();
    if (!config) return;
    const script = document.createElement("script");
    script.id = ID_SCRIPT;
    script.defer = true;
    script.src = config.src;
    script.setAttribute(config.attribut, config.identifiant);
    // Les pages d'administration ne doivent jamais être mesurées (même si le script est déjà
    // chargé depuis une page publique : la navigation reste dans la même application).
    if (config.fournisseur === "plausible") script.setAttribute("data-exclude", "/admin-taftech/**");
    if (config.fournisseur === "umami") script.setAttribute("data-do-not-track", "true");
    document.head.appendChild(script);
  }, [dansAdmin]);

  return null;
};

export default Analytics;
