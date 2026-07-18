import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import DomaineLabel from "../../Components/DomaineLabel";
import {
  RefreshCw,
  TrendingUp,
  MapPin,
  Briefcase,
  Users,
  GraduationCap,
  Building2,
  PartyPopper,
  Hourglass,
  BarChart3,
  FolderClock,
} from "lucide-react";
import { tw } from "../../theme";
import { TooltipIcon } from "../../Components/Tooltip";

const StatCard = ({ icon: Icon, label, value, color, info }) => (
  <div
    className={`${tw.surface} border ${tw.borderSubtle} rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tw.kpiIconBg[color]} text-white shadow-sm`}>
      <Icon size={20} />
    </div>
    <div>
      <p className={`text-[11px] font-semibold ${tw.textMuted} uppercase tracking-wider flex items-center gap-1`}>
        {label}
        {info && <TooltipIcon text={info} />}
      </p>
      <p className={`text-2xl font-extrabold ${tw.textStrong} mt-0.5 tabular-nums`}>{value}</p>
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
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.spinnerBorderPrimary}`}></div>
      </div>
    );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={tw.pageTitle}>Tableau de bord</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Contrôle global TAFTECH
          </p>
        </div>
        <button
          onClick={fetchStats}
          className={`p-2 ${tw.hoverSurfaceSubtle} rounded-lg transition-colors`}
          title="Rafraîchir"
        >
          <RefreshCw size={18} className={tw.textMuted700} />
        </button>
      </div>

      {/* ONGLETS */}
      <div className={`flex gap-1 border-b ${tw.borderBase}`}>
        {[
          { key: "overview", label: "Vue d'ensemble" },
          { key: "marche", label: "Données marché" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === key
                ? `${tw.borderPrimary} ${tw.textPrimary}`
                : `border-transparent ${tw.textMuted700} hover:text-slate-900`
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
                  className={`flex items-center gap-3 p-4 ${tw.bgWarningSoft} border ${tw.borderWarning} rounded-xl hover:border-amber-400 transition-colors`}
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Hourglass size={17} />
                  </div>
                  <p className={`text-sm font-semibold ${tw.textWarning900}`}>
                    {stats.entreprises_attente} entreprise(s) attendent
                    validation
                  </p>
                </Link>
              )}
              {stats.offres_attente > 0 && (
                <Link
                  to="/admin-taftech/offres"
                  className={`flex items-center gap-3 p-4 ${tw.bgErrorSoft} border ${tw.borderError} rounded-xl hover:border-red-400 transition-colors`}
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0">
                    <FolderClock size={17} />
                  </div>
                  <p className={`text-sm font-semibold ${tw.textError900}`}>
                    {stats.offres_attente} offre(s) attendent modération
                  </p>
                </Link>
              )}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: GraduationCap,
                label: "Candidats",
                value: stats.total_candidats,
                color: "blue",
              },
              {
                icon: Briefcase,
                label: "Recruteurs",
                value: stats.total_recruteurs,
                color: "violet",
              },
              {
                icon: PartyPopper,
                label: "Recrutements réussis",
                value: stats.total_recrutements,
                color: "pink",
                info: "Nombre de candidatures dont le statut final est \"Retenu\".",
              },
              {
                icon: Building2,
                label: "Entreprises",
                value: stats.total_entreprises,
                color: "emerald",
              },
              {
                icon: Hourglass,
                label: "Entreprises en attente",
                value: stats.entreprises_attente,
                color: "amber",
                info: "Entreprises inscrites qui attendent une validation manuelle avant de pouvoir publier des offres.",
              },
              {
                icon: BarChart3,
                label: "Offres publiées",
                value: stats.total_offres,
                color: "indigo",
                info: "Offres actuellement visibles côté candidat (approuvées, actives, non clôturées).",
              },
              {
                icon: FolderClock,
                label: "Offres en attente",
                value: stats.offres_attente,
                color: "red",
                info: "Offres soumises par des recruteurs qui attendent une modération (approbation ou rejet).",
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
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.spinnerBorderPrimary}`}></div>
            </div>
          ) : !marche ? null : (
            <>
              {/* MATCHING MOYEN */}
              {marche.matching_moyen && (
                <div className={`${tw.surface} border ${tw.borderPrimary200} rounded-xl p-5 flex items-center gap-4`}>
                  <div className={`w-14 h-14 ${tw.bgPrimarySoft} rounded-xl flex items-center justify-center shrink-0`}>
                    <TrendingUp size={24} className={tw.textPrimary} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${tw.textMuted} uppercase tracking-wider flex items-center gap-1`}>
                      Score matching moyen global
                      <TooltipIcon text="Moyenne du score de compatibilité IA (spécialité, diplôme, expérience, région, compétences) calculé sur toutes les candidatures ayant un score." />
                    </p>
                    <p className={`text-3xl font-bold ${tw.textPrimary}`}>
                      {marche.matching_moyen}%
                    </p>
                  </div>
                </div>
              )}

              {/* SALAIRES PAR SECTEUR */}
              {marche.salaires_par_secteur?.length > 0 && (
                <div className={`${tw.card} overflow-hidden`}>
                  <div className={`px-5 py-4 border-b ${tw.borderSubtle}`}>
                    <h2 className={`text-sm font-bold ${tw.textStrong}`}>
                      Salaires par secteur
                    </h2>
                    <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                      Comparaison offres publiées vs attentes candidats
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`${tw.surfaceMuted} text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                          <th className="px-5 py-3 text-left">Secteur</th>
                          <th className="px-5 py-3 text-right">Moy. offres</th>
                          <th className="px-5 py-3 text-right">
                            Moy. candidats
                          </th>
                          <th className="px-5 py-3 text-right">Écart</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${tw.divideBase}`}>
                        {marche.salaires_par_secteur.map((s) => {
                          const ecart =
                            s.moy_offres && s.moy_candidats
                              ? s.moy_candidats - s.moy_offres
                              : null;
                          return (
                            <tr
                              key={s.secteur}
                              className={tw.rowHover}
                            >
                              <td className="px-5 py-3">
                                <p className={`text-sm font-semibold ${tw.textStrong}`}>
                                  {s.secteur}
                                </p>
                                <p className={`text-xs ${tw.textMuted}`}>
                                  {s.nb_offres} offres · {s.nb_candidats}{" "}
                                  candidats
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <p className={`text-sm font-semibold ${tw.textSuccessIcon}`}>
                                  {formatSalaire(s.moy_offres)}
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <p className={`text-sm font-semibold ${tw.textPrimary}`}>
                                  {formatSalaire(s.moy_candidats)}
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right">
                                {ecart !== null ? (
                                  <span
                                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                      ecart > 0
                                        ? `${tw.bgErrorSoft} ${tw.textError}`
                                        : `${tw.bgSuccessSoft} ${tw.textSuccessIcon}`
                                    }`}
                                  >
                                    {ecart > 0 ? "+" : ""}
                                    {formatSalaire(ecart)}
                                  </span>
                                ) : (
                                  <span className={`${tw.textMuted} text-xs`}>
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
                  <div className={`${tw.card} overflow-hidden`}>
                    <div className={`px-5 py-4 border-b ${tw.borderSubtle} flex items-center gap-2`}>
                      <MapPin size={16} className={tw.textPrimary} />
                      <h2 className={`text-sm font-bold ${tw.textStrong}`}>
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
                              <span className={`text-xs font-medium ${tw.textMuted700}`}>
                                {i + 1}. {w.wilaya?.split(" - ")[1] || w.wilaya}
                              </span>
                              <span className={`text-xs font-bold ${tw.textPrimary}`}>
                                {w.nb_offres} offres
                              </span>
                            </div>
                            <div className={tw.progressTrack}>
                              <div
                                className={tw.progressBarPrimary}
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
                  <div className={`${tw.card} overflow-hidden`}>
                    <div className={`px-5 py-4 border-b ${tw.borderSubtle} flex items-center gap-2`}>
                      <Briefcase size={16} className={tw.textPrimary} />
                      <h2 className={`text-sm font-bold ${tw.textStrong}`}>
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
                              <span className={`text-xs font-medium ${tw.textMuted700}`}>
                                {i + 1}. <DomaineLabel code={s.specialite} />
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${tw.textMuted} flex items-center gap-1`}>
                                  <Users size={10} /> {s.nb_candidats}
                                </span>
                                <span className={`text-xs font-bold ${tw.textPrimary}`}>
                                  {s.nb_offres} offres
                                </span>
                              </div>
                            </div>
                            <div className={tw.progressTrack}>
                              <div
                                className={tw.progressBarSuccess}
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
