import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { poserCanonical, retirerCanonical, urlCanonique } from "./Seo";

// Pages publiques sans <Seo> : elles reçoivent leur canonical ici (les autres pages publiques le
// posent via <Seo>, les pages privées n'en ont pas).
const PAGES_PUBLIQUES_SANS_SEO = ["/entreprises", "/qui-sommes-nous", "/contact", "/recruteurs"];

// Titre d'onglet par défaut pour les pages qui n'utilisent pas <Seo> (pages privées,
// auth, portail recruteur). Placé AVANT <Routes> : les <Seo> des pages publiques
// s'exécutent après et gardent la priorité.
const TITRES = [
  ["/entreprises", "Entreprises"],
  ["/qui-sommes-nous", "Qui sommes-nous"],
  ["/contact", "Contactez-nous"],
  ["/merci", "Merci"],
  ["/login", "Connexion"],
  ["/register", "Inscription candidat"],
  ["/recruteurs/connexion", "Connexion recruteur"],
  ["/recruteurs/inscription", "Inscription recruteur"],
  ["/recruteurs/abonnements", "Abonnements & tarifs"],
  ["/recruteurs", "Espace recruteur"],
  ["/dashboard-candidat", "Tableau de bord"],
  ["/profil", "Mon profil"],
  ["/mes-candidatures", "Mes candidatures"],
  ["/mes-competences", "Mes compétences"],
  ["/mes-documents", "Mes documents"],
  ["/offres-sauvegardees", "Offres sauvegardées"],
  ["/inbox", "Boîte de réception"],
  ["/alertes", "Alertes d'emploi"],
  ["/suggestions-carriere", "Suggestions carrière"],
  ["/rendez-vous", "Prendre rendez-vous"],
  ["/comprendre-mes-scores", "Comprendre mes scores"],
  ["/confidentialite-recruteurs", "Confidentialité"],
  ["/parametres/candidat", "Paramètres"],
  ["/dashboard/offres", "Gestion de l'offre"],
  ["/dashboard", "Tableau de bord recruteur"],
  ["/creer-offre", "Publier une offre"],
  ["/cvtheque", "CVthèque"],
  ["/candidatures-spontanees", "Candidatures spontanées"],
  ["/notifications", "Notifications"],
  ["/questionnaires", "Questionnaires"],
  ["/parametres", "Paramètres entreprise"],
  ["/mon-equipe", "Mon équipe"],
  ["/offres-emploi", "Offres d'emploi"],
  ["/candidatures", "Candidatures"],
  ["/recrutements", "Recrutements"],
  ["/candidats-recommandes", "Candidats recommandés"],
  ["/statistiques", "Statistiques"],
  ["/evaluations", "Évaluations"],
  ["/entretiens", "Entretiens"],
  ["/facturation", "Facturation"],
  ["/comment-fonctionne-matching", "Comprendre le matching"],
  ["/comment-fonctionnent-credits", "Comprendre les crédits"],
  ["/admin-taftech", "Administration"],
];

const RouteTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const trouve = TITRES.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
    document.title = trouve ? `${trouve[1]} | TafTech` : "TafTech — Recrutement en ligne en Algérie";
    if (PAGES_PUBLIQUES_SANS_SEO.includes(pathname.replace(/\/+$/, ""))) poserCanonical(urlCanonique(pathname));
    else retirerCanonical();
  }, [pathname]);
  return null;
};

export default RouteTitle;
