import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { metierUrl } from "../../utils/slugify";
import { Search, X, Briefcase } from "lucide-react";
import Seo from "../../Components/Seo";
import { tw } from "../../theme";

const SkeletonMetier = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-pulse">
    {[...Array(12)].map((_, i) => (
      <div key={i} className={`${tw.cardColors} rounded-xl p-4 h-16`} />
    ))}
  </div>
);

const OffresParMetier = () => {
  const [domaines, setDomaines] = useState([]);
  const [secteursByCode, setSecteursByCode] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const nomenclature = await jobsService.getNomenclature();
        setDomaines(nomenclature.domaines || []);
        const map = {};
        (nomenclature.secteurs || []).forEach((s) => { map[s.code] = s.libelle; });
        setSecteursByCode(map);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_METIERS", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const domainesAffiches = domaines
    .filter((d) => d.libelle.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));

  return (
    <div className={`${tw.surfaceSubtle} min-h-screen`}>
      <Seo
        title="Offres d'emploi par métier"
        description="Parcourez les offres d'emploi en Algérie classées par métier — informatique, BTP, santé, commerce et bien plus, sur TafTech."
      />

      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className={`text-3xl font-extrabold ${tw.textOnDark} tracking-tight mb-1`}>
            Offres par <span className={tw.textPrimaryOnDark}>métier</span>
          </h1>
          <p className={`${tw.textPrimaryOnDark} text-base`}>
            Trouvez les opportunités correspondant précisément à votre métier.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="relative mb-6 max-w-sm">
          <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
          <input
            type="text"
            placeholder="Filtrer par métier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-11 pr-10 py-3 rounded-xl text-sm shadow-sm ${tw.inputColorsWhite}`}
          />
          {search && (
            <button onClick={() => setSearch("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`}>
              <X size={15} />
            </button>
          )}
        </div>

        {isLoading ? (
          <SkeletonMetier />
        ) : domainesAffiches.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase size={40} className={`mx-auto mb-3 ${tw.textSubtle}`} />
            <p className={`${tw.textMuted700} font-medium`}>Aucun métier trouvé pour "{search}"</p>
            <button onClick={() => setSearch("")} className={`mt-3 text-sm ${tw.textPrimary} font-semibold hover:underline`}>
              Réinitialiser
            </button>
          </div>
        ) : (
          <>
            <p className={`text-xs font-semibold ${tw.textMuted} uppercase tracking-wider mb-5`}>
              {domainesAffiches.length} métier{domainesAffiches.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pb-8">
              {domainesAffiches.map((domaine) => (
                <Link
                  key={domaine.code}
                  to={metierUrl(domaine.code, domaine.libelle)}
                  className={`group ${tw.cardColors} rounded-xl p-4 ${tw.borderPrimaryHover} hover:shadow-sm transition-all`}
                >
                  <p className={`text-sm font-bold leading-snug ${tw.textEmphasis800} ${tw.groupHoverTextPrimary} transition-colors`}>
                    {domaine.libelle}
                  </p>
                  {secteursByCode[domaine.secteur_code] && (
                    <p className={`text-xs ${tw.textMuted} mt-1`}>{secteursByCode[domaine.secteur_code]}</p>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
        <div className={`mt-8 pt-6 border-t ${tw.borderSubtle} flex flex-wrap gap-4 text-sm`}>
          <Link to="/secteurs" className={`${tw.textPrimary} font-semibold hover:underline`}>Parcourir par secteur →</Link>
          <Link to="/regions" className={`${tw.textPrimary} font-semibold hover:underline`}>Parcourir par région →</Link>
        </div>
      </div>
    </div>
  );
};

export default OffresParMetier;
