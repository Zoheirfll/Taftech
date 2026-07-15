import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { ArrowRight } from "lucide-react";
import { tw } from "../../theme";

const iconsMap = {
  IT: "💻", FINANCE: "💰", COMMERCIAL: "🤝", PRODUCTION: "⚙️",
  LOGISTIQUE: "📦", MARKETING: "📢", BTP: "🏗️", ADMIN: "📁",
  SANTE: "🏥", INGENIERIE: "🧪", RH: "👥", TOURISME: "🏨",
  MAINTENANCE: "🛠️", JURIDIQUE: "⚖️", AUTRE: "✨",
};

const SkeletonSecteur = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
    {[...Array(9)].map((_, i) => (
      <div key={i} className={`${tw.cardColors} rounded-2xl p-6 flex items-center gap-5`}>
        <div className={`w-14 h-14 ${tw.surfaceSubtle} rounded-2xl shrink-0`} />
        <div className="space-y-2 flex-1">
          <div className={`h-4 ${tw.surfaceSubtle} rounded w-3/4`} />
          <div className={`h-3 ${tw.surfaceSubtle} rounded w-1/2`} />
        </div>
      </div>
    ))}
  </div>
);

const OffresParSecteur = () => {
  const [secteurs, setSecteurs] = useState([]);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, geo] = await Promise.all([
          jobsService.getConstants(),
          jobsService.getStatsGeo(),
        ]);
        setSecteurs(data.secteurs);
        setCounts(geo.secteurs || {});
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_SECTEURS", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className={`${tw.surfaceSubtle} min-h-screen`}>
      {/* Header */}
      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className={`text-3xl font-extrabold ${tw.textOnDark} tracking-tight mb-1`}>
            Offres par <span className={tw.textPrimaryOnDark}>secteur</span>
          </h1>
          <p className={`${tw.textPrimaryOnDark} text-base`}>
            Explorez les opportunités selon votre expertise métier.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!isLoading && (
          <p className={`text-xs font-semibold ${tw.textMuted} uppercase tracking-wider mb-5`}>
            {secteurs.length} secteur{secteurs.length > 1 ? "s" : ""}
          </p>
        )}
        {isLoading ? (
          <SkeletonSecteur />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-8">
            {secteurs.map((secteur, index) => {
              const nb = counts[secteur.value] || 0;
              return (
                <Link
                  key={index}
                  to={`/offres?specialite=${encodeURIComponent(secteur.value)}`}
                  className={`group ${tw.cardColors} rounded-2xl p-6 ${tw.borderPrimaryHover} hover:shadow-md transition-all flex items-center gap-5`}
                >
                  <div className={`w-14 h-14 ${tw.surfaceMuted} rounded-2xl flex items-center justify-center text-3xl ${tw.groupHoverBgPrimarySoft} transition-colors shrink-0`}>
                    {iconsMap[secteur.value] || "💼"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base font-bold ${tw.textEmphasis800} ${tw.groupHoverTextPrimary} transition-colors`}>
                      {secteur.label}
                    </h3>
                    <p className={`text-xs ${tw.textMuted} ${tw.groupHoverTextPrimary500} font-medium mt-0.5 flex items-center gap-1 transition-colors`}>
                      {nb > 0 ? (
                        <><span className={`font-bold ${tw.textPrimary} ${tw.groupHoverTextPrimaryStrong}`}>{nb}</span> offre{nb > 1 ? "s" : ""} active{nb > 1 ? "s" : ""}</>
                      ) : (
                        <>Voir les offres <ArrowRight size={11} /></>
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OffresParSecteur;
