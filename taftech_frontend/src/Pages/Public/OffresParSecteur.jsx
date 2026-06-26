import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { ArrowRight } from "lucide-react";

const iconsMap = {
  IT: "💻", FINANCE: "💰", COMMERCIAL: "🤝", PRODUCTION: "⚙️",
  LOGISTIQUE: "📦", MARKETING: "📢", BTP: "🏗️", ADMIN: "📁",
  SANTE: "🏥", INGENIERIE: "🧪", RH: "👥", TOURISME: "🏨",
  MAINTENANCE: "🛠️", JURIDIQUE: "⚖️", AUTRE: "✨",
};

const SkeletonSecteur = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
    {[...Array(9)].map((_, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
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
    <div className="bg-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-linear-to-br from-indigo-700 to-indigo-500">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
            Offres par <span className="text-indigo-200">secteur</span>
          </h1>
          <p className="text-indigo-200 text-base">
            Explorez les opportunités selon votre expertise métier.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!isLoading && (
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
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
                  className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-5"
                >
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-indigo-50 transition-colors shrink-0">
                    {iconsMap[secteur.value] || "💼"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {secteur.label}
                    </h3>
                    <p className="text-xs text-slate-400 group-hover:text-indigo-500 font-medium mt-0.5 flex items-center gap-1 transition-colors">
                      {nb > 0 ? (
                        <><span className="font-bold text-indigo-600 group-hover:text-indigo-700">{nb}</span> offre{nb > 1 ? "s" : ""} active{nb > 1 ? "s" : ""}</>
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
