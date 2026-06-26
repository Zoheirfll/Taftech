import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { MapPin, Search, X } from "lucide-react";

const SkeletonRegion = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-slate-100 rounded-full shrink-0" />
            <div className="h-4 bg-slate-100 rounded w-24" />
          </div>
          <div className="h-5 w-7 bg-slate-100 rounded-full" />
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
    <div className="bg-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-linear-to-br from-indigo-700 to-indigo-500">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
            Offres par <span className="text-indigo-200">wilaya</span>
          </h1>
          <p className="text-indigo-200 text-base">
            Sélectionnez votre wilaya pour voir les postes disponibles près de chez vous.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Barre de recherche */}
        <div className="relative mb-6 max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer par wilaya..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          )}
        </div>

        {isLoading ? (
          <SkeletonRegion />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            {wilayas_affichees.length === 0 ? (
              <div className="text-center py-16">
                <MapPin size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">Aucune wilaya trouvée pour "{search}"</p>
                <button onClick={() => setSearch("")} className="mt-3 text-sm text-indigo-600 font-semibold hover:underline">
                  Réinitialiser
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  {wilayas_affichees.length} wilaya{wilayas_affichees.length > 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                  {wilayas_affichees.map((wilaya, index) => {
                    const nb = counts[wilaya.value] || 0;
                    return (
                      <Link
                        key={index}
                        to={`/offres?wilaya=${encodeURIComponent(wilaya.value)}`}
                        className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-indigo-50 text-slate-700 transition-colors group"
                      >
                        <span className="flex items-center gap-2.5">
                          <MapPin size={14} className="text-slate-400 group-hover:text-indigo-500 shrink-0" />
                          <span className="text-sm font-medium group-hover:text-indigo-700">{wilaya.nom}</span>
                        </span>
                        {nb > 0 && (
                          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100 px-2 py-0.5 rounded-full shrink-0">
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
