import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { RefreshCw, TrendingUp, MapPin, Briefcase, Users } from "lucide-react";

const StatCard = ({ icon, label, value, colorClass }) => (
  <div
    className={`bg-white border rounded-xl p-6 flex items-center gap-4 ${colorClass}`}
  >
    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-current/10 flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-3xl font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  </div>
);

const formatSalaire = (montant) => {
  if (!montant) return "N/A";
  return new Intl.NumberFormat("fr-DZ").format(montant) + " DA";
};

const AdminStatistiques = () => {
  const [stats, setStats] = useState(null);
  const [marche, setMarche] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMarche, setLoadingMarche] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminStats();
      setStats(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des statistiques.");
      reportError("ECHEC_CHARGEMENT_STATS_ADMIN", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarche = async () => {
    setLoadingMarche(true);
    try {
      const data = await jobsService.getAdminMarche();
      setMarche(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des données marché.");
      reportError("ECHEC_CHARGEMENT_MARCHE_ADMIN", err);
    } finally {
      setLoadingMarche(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === "marche" && !marche) {
      fetchMarche();
    }
  }, [activeTab]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-700 mt-0.5">
            Contrôle global TafTech
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw size={18} className="text-slate-500" />
        </button>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: "overview", label: "Vue d'ensemble" },
          { key: "marche", label: "Données marché" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ONGLET VUE D'ENSEMBLE */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* ALERTES */}
          {(stats.offres_attente > 0 || stats.entreprises_attente > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.entreprises_attente > 0 && (
                <Link
                  to="/admin-taftech/entreprises"
                  className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:border-amber-400 transition-colors"
                >
                  <span className="text-xl">⚠️</span>
                  <p className="text-sm font-semibold text-amber-900">
                    {stats.entreprises_attente} entreprise(s) attendent
                    validation
                  </p>
                </Link>
              )}
              {stats.offres_attente > 0 && (
                <Link
                  to="/admin-taftech/offres"
                  className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl hover:border-red-400 transition-colors"
                >
                  <span className="text-xl">🚨</span>
                  <p className="text-sm font-semibold text-red-900">
                    {stats.offres_attente} offre(s) attendent modération
                  </p>
                </Link>
              )}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: "👥",
                label: "Candidats",
                value: stats.total_candidats,
                colorClass: "border-blue-100",
              },
              {
                icon: "👔",
                label: "Recruteurs",
                value: stats.total_recruteurs,
                colorClass: "border-violet-100",
              },
              {
                icon: "🎉",
                label: "Recrutements réussis",
                value: stats.total_recrutements,
                colorClass: "border-pink-100",
              },
              {
                icon: "🏢",
                label: "Entreprises",
                value: stats.total_entreprises,
                colorClass: "border-emerald-100",
              },
              {
                icon: "⏳",
                label: "Entreprises en attente",
                value: stats.entreprises_attente,
                colorClass: "border-amber-100",
              },
              {
                icon: "📊",
                label: "Offres publiées",
                value: stats.total_offres,
                colorClass: "border-indigo-100",
              },
              {
                icon: "📁",
                label: "Offres en attente",
                value: stats.offres_attente,
                colorClass: "border-red-100",
              },
            ].map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </div>
      )}

      {/* ONGLET DONNÉES MARCHÉ */}
      {activeTab === "marche" && (
        <div className="space-y-6">
          {loadingMarche ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : !marche ? null : (
            <>
              {/* MATCHING MOYEN */}
              {marche.matching_moyen && (
                <div className="bg-white border border-indigo-200 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Score matching moyen global
                    </p>
                    <p className="text-3xl font-bold text-indigo-600">
                      {marche.matching_moyen}%
                    </p>
                  </div>
                </div>
              )}

              {/* SALAIRES PAR SECTEUR */}
              {marche.salaires_par_secteur?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900">
                      Salaires par secteur
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Comparaison offres publiées vs attentes candidats
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                          <th className="px-5 py-3 text-left">Secteur</th>
                          <th className="px-5 py-3 text-right">Moy. offres</th>
                          <th className="px-5 py-3 text-right">
                            Moy. candidats
                          </th>
                          <th className="px-5 py-3 text-right">Écart</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {marche.salaires_par_secteur.map((s) => {
                          const ecart =
                            s.moy_offres && s.moy_candidats
                              ? s.moy_candidats - s.moy_offres
                              : null;
                          return (
                            <tr
                              key={s.secteur}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-5 py-3">
                                <p className="text-sm font-semibold text-slate-900">
                                  {s.secteur}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {s.nb_offres} offres · {s.nb_candidats}{" "}
                                  candidats
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <p className="text-sm font-semibold text-emerald-600">
                                  {formatSalaire(s.moy_offres)}
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <p className="text-sm font-semibold text-indigo-600">
                                  {formatSalaire(s.moy_candidats)}
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right">
                                {ecart !== null ? (
                                  <span
                                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                      ecart > 0
                                        ? "bg-red-50 text-red-600"
                                        : "bg-emerald-50 text-emerald-600"
                                    }`}
                                  >
                                    {ecart > 0 ? "+" : ""}
                                    {formatSalaire(ecart)}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-xs">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TOP WILAYAS */}
                {marche.top_wilayas?.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                      <MapPin size={16} className="text-indigo-600" />
                      <h2 className="text-sm font-bold text-slate-900">
                        Top wilayas
                      </h2>
                    </div>
                    <div className="p-4 space-y-3">
                      {marche.top_wilayas.map((w, i) => {
                        const max = marche.top_wilayas[0].nb_offres;
                        const pct = (w.nb_offres / max) * 100;
                        return (
                          <div key={w.wilaya}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-slate-700">
                                {i + 1}. {w.wilaya?.split(" - ")[1] || w.wilaya}
                              </span>
                              <span className="text-xs font-bold text-indigo-600">
                                {w.nb_offres} offres
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div
                                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TOP SECTEURS */}
                {marche.top_secteurs?.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                      <Briefcase size={16} className="text-indigo-600" />
                      <h2 className="text-sm font-bold text-slate-900">
                        Top secteurs
                      </h2>
                    </div>
                    <div className="p-4 space-y-3">
                      {marche.top_secteurs.map((s, i) => {
                        const max = marche.top_secteurs[0].nb_offres;
                        const pct = (s.nb_offres / max) * 100;
                        return (
                          <div key={s.specialite}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-slate-700">
                                {i + 1}. {s.specialite}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                  <Users size={10} /> {s.nb_candidats}
                                </span>
                                <span className="text-xs font-bold text-indigo-600">
                                  {s.nb_offres} offres
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminStatistiques;
