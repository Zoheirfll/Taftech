import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import {
  Search, X, Laptop, Wallet, Handshake, Cog, Package, Megaphone,
  HardHat, FolderKanban, HeartPulse, FlaskConical, Users, Palmtree,
  Wrench, Scale, Layers, Briefcase,
} from "lucide-react";
import { tw } from "../../theme";

const iconsMap = {
  IT: Laptop, FINANCE: Wallet, COMMERCIAL: Handshake, PRODUCTION: Cog,
  LOGISTIQUE: Package, MARKETING: Megaphone, BTP: HardHat, ADMIN: FolderKanban,
  SANTE: HeartPulse, INGENIERIE: FlaskConical, RH: Users, TOURISME: Palmtree,
  MAINTENANCE: Wrench, JURIDIQUE: Scale, AUTRE: Layers,
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
  const [search, setSearch] = useState("");

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
        {/* Barre de recherche */}
        <div className="relative mb-6 max-w-sm">
          <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
          <input
            type="text"
            placeholder="Filtrer par secteur..."
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
          <SkeletonSecteur />
        ) : (
          <>
            {(() => {
              const secteursAffiches = secteurs.filter((s) => s.label.toLowerCase().includes(search.toLowerCase()));
              if (secteursAffiches.length === 0) {
                return (
                  <div className="text-center py-16">
                    <Briefcase size={40} className={`mx-auto mb-3 ${tw.textSubtle}`} />
                    <p className={`${tw.textMuted700} font-medium`}>Aucun secteur trouvé pour "{search}"</p>
                    <button onClick={() => setSearch("")} className={`mt-3 text-sm ${tw.textPrimary} font-semibold hover:underline`}>
                      Réinitialiser
                    </button>
                  </div>
                );
              }
              return (
                <>
                  <p className={`text-xs font-semibold ${tw.textMuted} uppercase tracking-wider mb-5`}>
                    {secteursAffiches.length} secteur{secteursAffiches.length > 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-8">
                    {secteursAffiches.map((secteur, index) => {
                      const nb = counts[secteur.value] || 0;
                      const SecteurIcon = iconsMap[secteur.value] || Briefcase;
                      return (
                        <Link
                          key={index}
                          to={`/offres?specialite=${encodeURIComponent(secteur.value)}`}
                          className={`group ${tw.cardColors} rounded-2xl p-6 ${tw.borderPrimaryHover} hover:shadow-md transition-all flex items-center gap-5`}
                        >
                          <div className={`w-14 h-14 ${tw.surfaceMuted} rounded-2xl flex items-center justify-center ${tw.groupHoverBgPrimarySoft} transition-colors shrink-0`}>
                            <SecteurIcon size={24} className={`${tw.textMuted700} ${tw.groupHoverTextPrimary} transition-colors`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-bold leading-snug ${tw.textEmphasis800} ${tw.groupHoverTextPrimary} transition-colors`}>
                              {secteur.label}
                            </h3>
                            {nb > 0 && (
                              <span className={`inline-block mt-1.5 text-[11px] font-bold ${tw.textPrimary} ${tw.bgPrimarySoft} ${tw.groupHoverBgPrimary100} px-2 py-0.5 rounded-full`}>
                                {nb}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default OffresParSecteur;
