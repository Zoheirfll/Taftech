import React from "react";
import { AlertTriangle } from "lucide-react";
import { tw } from "../../theme";

const ARTICLES = [
  {
    id: "art1",
    title: "Article 1 : Présentation de la plateforme",
    body: "TafTech est une plateforme de recrutement en ligne mettant en relation des candidats et des entreprises en Algérie, via un système de matching assisté par intelligence artificielle.",
  },
  {
    id: "art2",
    title: "Article 2 : Objet des CGU",
    body: "Les présentes Conditions Générales d'Utilisation ont pour objet de définir les modalités d'accès et d'utilisation de la plateforme TafTech par les candidats et les recruteurs.",
  },
  {
    id: "art3",
    title: "Article 3 : Services proposés",
    body: "Pour les candidats : création de profil, recherche d'offres, candidature en ligne, alertes emploi, suggestions de carrière. Pour les recruteurs : publication d'offres, gestion des candidatures, accès à la CVthèque (fonctionnalités Premium).",
  },
  {
    id: "art4",
    title: "Article 4 : Acceptation et mises à jour",
    body: "L'inscription sur TafTech implique l'acceptation pleine et entière des présentes CGU. Ces conditions peuvent être mises à jour ; les utilisateurs seront informés de toute modification substantielle.",
  },
  {
    id: "art5",
    title: "Article 5 : Comptes et responsabilités des utilisateurs",
    body: "Chaque utilisateur est responsable de l'exactitude des informations fournies et de la confidentialité de ses identifiants de connexion. Toute utilisation frauduleuse doit être signalée immédiatement.",
  },
  {
    id: "art6",
    title: "Article 6 : Propriété intellectuelle",
    body: "La marque TafTech, son logo et l'ensemble des éléments graphiques et techniques de la plateforme sont protégés. Les contenus publiés par les utilisateurs (CV, offres) restent leur propriété.",
  },
  {
    id: "art7",
    title: "Article 7 : Protection des données",
    body: "Le traitement des données personnelles est décrit en détail dans notre Politique de confidentialité, conforme à la loi algérienne n° 18-07.",
  },
  {
    id: "art8",
    title: "Article 8 : Responsabilités",
    body: "TafTech agit en tant qu'intermédiaire technique et ne garantit pas l'issue d'un recrutement. La véracité des offres publiées relève de la responsabilité des entreprises recruteuses.",
  },
  {
    id: "art9",
    title: "Article 9 : Résiliation des comptes",
    body: "Tout utilisateur peut demander la suppression de son compte à tout moment via les paramètres de son profil ou en contactant notre support.",
  },
  {
    id: "art10",
    title: "Article 10 : Contact",
    body: "Pour toute question relative aux présentes CGU, contactez-nous via la page Contact ou à l'adresse taftech963@gmail.com.",
  },
  {
    id: "art11",
    title: "Article 11 : Droit applicable",
    body: "Les présentes CGU sont soumises au droit algérien. Tout litige relève de la compétence des juridictions algériennes.",
  },
];

const CGU = () => {
  return (
    <div className={`${tw.surfaceSubtle} min-h-screen`}>
      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h1 className={`text-3xl font-extrabold ${tw.textOnDark} tracking-tight mb-1`}>
            Conditions <span className={tw.textPrimaryOnDark}>Générales d'Utilisation</span>
          </h1>
          <p className={`${tw.textPrimaryOnDark} text-xs mt-2 opacity-80`}>
            Version de travail — 15 juillet 2026
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className={`${tw.bgWarningSoft} border ${tw.borderWarning} rounded-xl p-4 flex items-start gap-3`}>
          <AlertTriangle size={18} className={`${tw.textWarning} shrink-0 mt-0.5`} />
          <p className={`text-sm ${tw.textWarning}`}>
            Version provisoire en attente de finalisation juridique complète (raison sociale, immatriculation).
            Le contenu ci-dessous reflète le fonctionnement actuel de TafTech et sera mis à jour dès que ces informations seront disponibles.
          </p>
        </div>

        <div className={`${tw.cardColors} rounded-2xl p-5`}>
          <p className={`text-sm font-bold ${tw.textStrong} mb-3`}>Sommaire</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {ARTICLES.map((a) => (
              <a key={a.id} href={`#${a.id}`} className={`text-sm ${tw.textPrimary} hover:underline`}>
                {a.title}
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {ARTICLES.map((a) => (
            <section key={a.id} id={a.id} className={`${tw.cardColors} rounded-2xl p-5`}>
              <h2 className={`text-base font-bold ${tw.textStrong} mb-2 border-l-2 ${tw.borderPrimary} pl-3`}>
                {a.title}
              </h2>
              <p className={`text-sm ${tw.textMuted700} leading-relaxed`}>{a.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CGU;
