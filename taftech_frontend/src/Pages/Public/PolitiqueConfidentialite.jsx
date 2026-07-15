import React from "react";
import {
  Info, BookOpen, UserCog, Database, Cookie, Clock, ShieldCheck,
  Mail, Phone, MapPin, CheckCircle2,
} from "lucide-react";
import { tw } from "../../theme";

const SECTIONS = [
  { id: "definitions", label: "1. Définitions" },
  { id: "responsable", label: "2. Responsable du traitement" },
  { id: "donnees", label: "3. Catégories de données collectées" },
  { id: "cookies", label: "4. Utilisation des cookies" },
  { id: "duree", label: "5. Durée de conservation" },
  { id: "droits", label: "6. Vos droits" },
];

const DEFINITIONS = [
  { term: "Données personnelles", def: "Toute information se rapportant à une personne physique identifiée ou identifiable." },
  { term: "Candidat", def: "Utilisateur inscrit sur TafTech qui postule à des offres d'emploi." },
  { term: "Recruteur", def: "Utilisateur représentant une entreprise qui publie des offres et consulte des profils." },
  { term: "Traitement", def: "Toute opération portant sur des données personnelles (collecte, stockage, utilisation...)." },
];

const DONNEES_IDENTIFICATION = ["Nom, prénom", "Adresse e-mail", "Numéro de téléphone", "Date de naissance", "NIN (numéro d'identification nationale)", "Adresse, wilaya, commune", "Photo de profil"];
const DONNEES_PRO = ["Titre professionnel", "CV (PDF)", "Compétences et langues", "Expériences professionnelles", "Formations et diplômes", "Lettre de motivation", "Secteur et spécialité souhaités"];
const DONNEES_TECHNIQUES = ["Adresse IP", "Cookies d'authentification (session)", "Journal des erreurs techniques", "Historique de connexion"];

const PolitiqueConfidentialite = () => {
  return (
    <div className={`${tw.surfaceSubtle} min-h-screen`}>
      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h1 className={`text-3xl font-extrabold ${tw.textOnDark} tracking-tight mb-1`}>
            Politique de <span className={tw.textPrimaryOnDark}>confidentialité</span>
          </h1>
          <p className={`${tw.textPrimaryOnDark} text-base`}>
            TafTech — Protection de vos données personnelles
          </p>
          <p className={`${tw.textPrimaryOnDark} text-xs mt-2 opacity-80`}>
            Dernière mise à jour : 15 juillet 2026
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        {/* SOMMAIRE */}
        <aside className="w-full md:w-56 shrink-0">
          <div className={`${tw.cardColors} rounded-2xl p-4 sticky top-20`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${tw.textMuted}`}>Sommaire</p>
            <ul className="space-y-2">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={`text-sm ${tw.textMuted700} hover:${tw.textPrimary} transition-colors`}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* CONTENU */}
        <div className="flex-1 min-w-0 space-y-8">
          <div className={`${tw.cardColors} rounded-2xl p-5 flex items-start gap-3`}>
            <Info size={18} className={`${tw.textPrimary} shrink-0 mt-0.5`} />
            <p className={`text-sm ${tw.bodyText}`}>
              Chez TafTech, nous accordons une grande importance à la protection de vos données personnelles.
              Cette politique décrit quelles données nous collectons, pourquoi, et comment vous pouvez exercer vos droits,
              conformément à la loi algérienne n° 18-07 relative à la protection des données à caractère personnel.
            </p>
          </div>

          <section id="definitions">
            <h2 className={`${tw.sectionTitle} flex items-center gap-2 mb-4`}>
              <BookOpen size={18} className={tw.textPrimary} /> 1. Définitions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEFINITIONS.map((d) => (
                <div key={d.term} className={`${tw.cardColors} rounded-xl p-4`}>
                  <p className={`text-sm font-bold ${tw.textStrong} mb-1`}>{d.term}</p>
                  <p className={`text-xs ${tw.textMuted700}`}>{d.def}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="responsable">
            <h2 className={`${tw.sectionTitle} flex items-center gap-2 mb-4`}>
              <UserCog size={18} className={tw.textPrimary} /> 2. Responsable du traitement
            </h2>
            <div className={`${tw.cardColors} rounded-xl p-5`}>
              <p className={`text-sm font-bold ${tw.textStrong} mb-3`}>TafTech</p>
              <div className="space-y-2 text-sm">
                <p className={`flex items-center gap-2 ${tw.textMuted700}`}><MapPin size={14} className="shrink-0" /> Oran, Algérie</p>
                <p className={`flex items-center gap-2 ${tw.textMuted700}`}><Mail size={14} className="shrink-0" /> taftech963@gmail.com</p>
                <p className={`flex items-center gap-2 ${tw.textMuted700}`}><Phone size={14} className="shrink-0" /> 0770 123 440</p>
              </div>
            </div>
          </section>

          <section id="donnees">
            <h2 className={`${tw.sectionTitle} flex items-center gap-2 mb-4`}>
              <Database size={18} className={tw.textPrimary} /> 3. Catégories de données collectées
            </h2>
            <div className="space-y-3">
              {[
                { title: "Données d'identification", items: DONNEES_IDENTIFICATION },
                { title: "Données professionnelles", items: DONNEES_PRO },
                { title: "Données techniques", items: DONNEES_TECHNIQUES },
              ].map((cat) => (
                <div key={cat.title} className={`${tw.cardColors} rounded-xl p-4`}>
                  <p className={`text-sm font-bold ${tw.textStrong} mb-3`}>{cat.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map((item) => (
                      <span key={item} className={`px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs rounded-md`}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="cookies">
            <h2 className={`${tw.sectionTitle} flex items-center gap-2 mb-4`}>
              <Cookie size={18} className={tw.textPrimary} /> 4. Utilisation des cookies
            </h2>
            <div className={`${tw.cardColors} rounded-xl p-4`}>
              <p className={`text-sm font-bold ${tw.textStrong} mb-1`}>Cookies techniques (essentiels)</p>
              <p className={`text-xs ${tw.textMuted700}`}>
                TafTech utilise uniquement des cookies techniques nécessaires au fonctionnement du site :
                maintien de votre session de connexion et sécurité de l'authentification. Nous n'utilisons pas de
                cookies publicitaires ou de traçage tiers.
              </p>
            </div>
          </section>

          <section id="duree">
            <h2 className={`${tw.sectionTitle} flex items-center gap-2 mb-4`}>
              <Clock size={18} className={tw.textPrimary} /> 5. Durée de conservation des données
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`${tw.cardColors} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-extrabold ${tw.textPrimary}`}>5 ans</p>
                <p className={`text-sm font-semibold ${tw.textStrong} mt-1`}>Candidats</p>
                <p className={`text-xs ${tw.textMuted700} mt-1`}>Suppression automatique après 5 ans d'inactivité du compte.</p>
              </div>
              <div className={`${tw.cardColors} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-extrabold ${tw.textPrimary}`}>10 ans</p>
                <p className={`text-sm font-semibold ${tw.textStrong} mt-1`}>Recruteurs / Entreprises</p>
                <p className={`text-xs ${tw.textMuted700} mt-1`}>Suppression automatique après 10 ans d'inactivité du compte.</p>
              </div>
            </div>
          </section>

          <section id="droits">
            <h2 className={`${tw.sectionTitle} flex items-center gap-2 mb-4`}>
              <ShieldCheck size={18} className={tw.textPrimary} /> 6. Vos droits
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {[
                "Droit d'accès à vos données",
                "Droit de rectification",
                "Droit à l'effacement",
                "Droit à la limitation du traitement",
                "Droit à la portabilité",
                "Droit d'opposition",
              ].map((droit) => (
                <div key={droit} className={`${tw.cardColors} rounded-xl p-3 flex items-center gap-2`}>
                  <CheckCircle2 size={15} className={`${tw.textPrimary} shrink-0`} />
                  <span className={`text-sm ${tw.textStrong}`}>{droit}</span>
                </div>
              ))}
            </div>
            <div className={`${tw.bgPrimarySolidHover} text-white rounded-2xl p-6 text-center`}>
              <p className="font-bold text-lg mb-1">Pour exercer vos droits</p>
              <p className="text-sm opacity-90 mb-4">Contactez-nous par e-mail ou téléphone.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="mailto:taftech963@gmail.com" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors">
                  <Mail size={15} /> Nous contacter par e-mail
                </a>
                <a href="tel:+213770123440" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-400 transition-colors">
                  <Phone size={15} /> Nous appeler
                </a>
              </div>
            </div>
          </section>

          <p className={`text-xs text-center ${tw.textMuted} pt-4`}>
            Conforme à la loi algérienne n° 18-07 relative à la protection des données à caractère personnel.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PolitiqueConfidentialite;
