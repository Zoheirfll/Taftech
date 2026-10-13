// Ligne du bas du tableau de bord : recherche CVthèque, génération d'offre par IA et aide.
import { Link } from "react-router-dom";
import { LifeBuoy, Mail } from "lucide-react";
import { tw } from "../../../theme";

export const BlocsActionsBas = ({
  recherches,
  rechercheMotsCles,
  setRechercheMotsCles,
  handleRechercheCVTheque,
  handleAppliquerRecherche,
  titreIA,
  setTitreIA,
  palierActif,
  handleGenererOffreIA,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
    <div className={`${tw.cardColors} rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-bold ${tw.textStrong}`}>Recherche avancée dans la CVthèque</h2>
        {recherches.length > 0 && (
          <div className="relative group">
            <button type="button" className={`text-xs font-semibold ${tw.textTeal}`}>Recherche enregistrée</button>
            <div className={`absolute right-0 top-full mt-1 hidden group-hover:block group-focus-within:block ${tw.surface} border ${tw.borderBase} rounded-xl shadow-lg z-30 overflow-hidden min-w-[180px]`}>
              {recherches.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleAppliquerRecherche(r)}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  {r.nom}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <input
        type="text"
        value={rechercheMotsCles}
        onChange={(e) => setRechercheMotsCles(e.target.value)}
        placeholder="Mots-clés (compétence, métier...)"
        className={`w-full px-3 py-2 rounded-lg text-sm mb-3 ${tw.inputColorsWhite}`}
      />
      <button
        type="button"
        onClick={handleRechercheCVTheque}
        className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${tw.bgTealSolid}`}
      >
        Rechercher
      </button>
    </div>

    <div className={`${tw.cardColors} rounded-2xl p-5`}>
      <h2 className={`text-sm font-bold ${tw.textStrong} mb-1`}>Générez vos offres avec l'IA</h2>
      <p className={`text-xs mb-3 ${tw.textMuted}`}>Créez une offre complète en quelques secondes.</p>
      <input
        type="text"
        value={titreIA}
        onChange={(e) => setTitreIA(e.target.value)}
        disabled={!palierActif}
        className={`w-full px-3 py-2 rounded-lg text-sm mb-3 ${tw.inputColorsWhite} disabled:opacity-50`}
      />
      <button
        type="button"
        onClick={handleGenererOffreIA}
        disabled={!palierActif}
        className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${tw.bgTealSolid} disabled:opacity-50 disabled:cursor-not-allowed`}
        title={!palierActif ? "Nécessite un abonnement actif" : ""}
      >
        Générer avec l'IA
      </button>
    </div>

    <div className={`${tw.cardColors} rounded-2xl p-5`}>
      <h2 className={`text-sm font-bold ${tw.textStrong} mb-3 flex items-center gap-2`}>
        <LifeBuoy size={15} className={tw.textTeal} /> Besoin d'aide ?
      </h2>
      <div className="space-y-2.5">
        <Link to="/contact?portail=recruteur" className={`flex items-center gap-2 text-xs font-medium ${tw.textMuted700} hover:${tw.textTeal}`}>
          <LifeBuoy size={13} className={tw.textTeal} /> Centre d'aide
        </Link>
        <a href="https://wa.me/213770123440" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs font-medium ${tw.textMuted700} hover:${tw.textTeal}`}>
          <Mail size={13} className={tw.textTeal} /> Contacter un conseiller
        </a>
      </div>
    </div>
  </div>
);
