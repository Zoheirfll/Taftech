// Bandeau des crédits CVthèque et onglets "Explorez le vivier" / "Favoris" avec l'aide contextuelle.
import React from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import InfoBanner from "../../../Components/InfoBanner";
import { tw } from "../../../theme";

export const BandeauCredits = ({ creditsDisponibles }) => (
  <div className={`mb-6 flex flex-wrap items-center gap-3 ${tw.bgTealSoft} border ${tw.borderTeal200} rounded-xl px-4 py-2.5 w-fit`}>
    <span className={`text-sm font-bold ${tw.textTeal}`}>
      {creditsDisponibles.mensuel_restant == null ? "Crédits illimités" : `${creditsDisponibles.mensuel_restant} crédit${creditsDisponibles.mensuel_restant === 1 ? "" : "s"} ce mois-ci`}
    </span>
    {creditsDisponibles.achetes_restant > 0 && (
      <span className={`text-xs ${tw.textTeal600}`}>+ {creditsDisponibles.achetes_restant} acheté{creditsDisponibles.achetes_restant === 1 ? "" : "s"}</span>
    )}
    {creditsDisponibles.mensuel_restant === 0 && creditsDisponibles.achetes_restant === 0 && (
      <Link to="/recruteurs/abonnements" className={`text-xs font-bold underline ${tw.textTeal}`}>
        Acheter des crédits →
      </Link>
    )}
    <Link to="/comment-fonctionnent-credits" className={`text-xs underline ${tw.textTeal}`}>Comment ça marche ?</Link>
  </div>
);

export const OngletsCVTheque = ({ activeTab, setActiveTab, setCurrentPage }) => (
  <>
    {/* HEADER + ONGLETS fusionnés */}
    <div className={`flex items-end justify-between border-b ${tw.borderBase} mb-5`}>
      <div className="flex gap-1">
        <button
          onClick={() => { setActiveTab("tous"); setCurrentPage(1); }}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "tous"
              ? tw.segmentTabActiveTeal
              : tw.segmentTabInactive
          }`}
        >
          Explorez le vivier de CV
        </button>
        <button
          onClick={() => { setActiveTab("favoris"); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "favoris"
              ? tw.segmentTabActiveAmber
              : tw.segmentTabInactive
          }`}
        >
          <Star size={14} className={activeTab === "favoris" ? tw.fillAmber500 : ""} />
          Favoris
        </button>
      </div>
      <p className={`text-xs pb-3 hidden sm:block ${tw.textMuted}`}>
        Trouvez le profil idéal pour votre équipe
      </p>
    </div>

    <div className="mb-4">
      <InfoBanner storageKey="cvtheque" title="Comment utiliser la CVthèque ?" color="teal">
        Filtrez par wilaya, diplôme, spécialité ou expérience. Cliquez sur un profil pour voir le détail, télécharger le CV et lancer une analyse IA.
        Ajoutez des candidats à vos <strong>favoris ⭐</strong> pour les retrouver facilement dans l'onglet "Favoris".
        Utilisez <strong>"Comparer avec une offre"</strong> pour classer automatiquement les candidats par score de compatibilité avec une de vos offres.
        Débloquez un profil (1 crédit) pour accéder à ses coordonnées et à son CV pour votre équipe, tant que le candidat laisse son profil actif et visible : il peut à tout moment le masquer ou supprimer son compte, l'accès cesse alors.
        L'accès à la CVthèque implique votre engagement à traiter les données des candidats <strong>uniquement dans le cadre du recrutement</strong>, conformément à la loi n° 18-07.
      </InfoBanner>
    </div>
  </>
);
