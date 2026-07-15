import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { MapPin, Search, X } from "lucide-react";
import { tw } from "../../theme";

const SkeletonRegion = () => (
  <div className={`${tw.cardColors} rounded-2xl p-6 shadow-sm animate-pulse`}>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 ${tw.surfaceSubtle} rounded-full shrink-0`} />
            <div className={`h-4 ${tw.surfaceSubtle} rounded w-24`} />
          </div>
          <div className={`h-5 w-7 ${tw.surfaceSubtle} rounded-full`} />
        </div>
      ))}
    </div>
  </div>
);

const OffresParRegion = () => {
  const [wilayas, setWilayas] = useState([]);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, geo] = await Promise.all([
          jobsService.getConstants(),
          jobsService.getStatsGeo(),
        ]);
        setWilayas(data.wilayas);
        setCounts(geo.wilayas || {});
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_WILAYAS", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const wilayas_affichees = wilayas
    .map((w) => ({ ...w, nom: w.label?.split(" - ")[1] || w.label }))
    .filter((w) => w.nom.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`${tw.surfaceSubtle} min-h-screen`}>
      {/* Header */}
      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className={`text-3xl font-extrabold ${tw.textOnDark} tracking-tight mb-1`}>
            Offres par <span className={tw.textPrimaryOnDark}>région</span>
          </h1>
          <p className={`${tw.textPrimaryOnDark} text-base`}>
            Sélectionnez votre région pour voir les postes disponibles près de chez vous.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Barre de recherche */}
        <div className="relative mb-6 max-w-sm">
          <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
          <input
            type="text"
            placeholder="Filtrer par région..."
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
          <SkeletonRegion />
        ) : (
          <div className={`${tw.cardColors} rounded-2xl p-6 shadow-sm`}>
            {wilayas_affichees.length === 0 ? (
              <div className="text-center py-16">
                <MapPin size={40} className={`mx-auto mb-3 ${tw.textSubtle}`} />
                <p className={`${tw.textMuted700} font-medium`}>Aucune région trouvée pour "{search}"</p>
                <button onClick={() => setSearch("")} className={`mt-3 text-sm ${tw.textPrimary} font-semibold hover:underline`}>
                  Réinitialiser
                </button>
              </div>
            ) : (
              <>
                <p className={`text-xs font-semibold ${tw.textMuted} uppercase tracking-wider mb-4`}>
                  {wilayas_affichees.length} région{wilayas_affichees.length > 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                  {wilayas_affichees.map((wilaya, index) => {
                    const nb = counts[wilaya.value] || 0;
                    return (
                      <Link
                        key={index}
                        to={`/offres?wilaya=${encodeURIComponent(wilaya.value)}`}
                        className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors group ${tw.regionLinkHover}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <MapPin size={14} className={`${tw.textMuted700} ${tw.groupHoverTextPrimary500} shrink-0`} />
                          <span className={`text-sm font-medium ${tw.groupHoverTextPrimaryStrong}`}>{wilaya.nom}</span>
                        </span>
                        {nb > 0 && (
                          <span className={`text-[11px] font-bold ${tw.textPrimary} ${tw.bgPrimarySoft} ${tw.groupHoverBgPrimary100} px-2 py-0.5 rounded-full shrink-0`}>
                            {nb}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OffresParRegion;
