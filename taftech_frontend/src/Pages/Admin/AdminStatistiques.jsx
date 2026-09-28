import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MapPin,
  Briefcase,
  Users,
  GraduationCap,
  Building2,
  PartyPopper,
  Hourglass,
  BarChart3,
  FolderClock,
  Star,
  Newspaper,
  HelpCircle,
  Sparkles,
  Image as ImageIcon,
  Clock,
  LayoutDashboard,
  FileEdit,
} from "lucide-react";
import { tw } from "../../theme";
import { TooltipIcon } from "../../Components/Tooltip";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminErreurChargement, AdminVide } from "../../Components/AdminEtat";
import { apiErrMsg } from "../../utils/apiErrMsg";

// Carte KPI — cliquable (`to`) quand une page admin permet d'agir sur ce chiffre.
const StatCard = ({ icon: Icon, label, value, color, info, to }) => {
  const contenu = (
    <>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tw.kpiIconBg[color]} text-white shadow-sm`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold ${tw.textMuted} uppercase tracking-wider flex items-center gap-1`}>
          {label}
          {info && <TooltipIcon text={info} />}
        </p>
        <p className={`text-2xl font-extrabold ${tw.textStrong} mt-0.5 tabular-nums`}>{value ?? 0}</p>
      </div>
    </>
  );
  const classes = `${tw.surface} border ${tw.borderSubtle} rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`;
  return to ? (
    <Link to={to} className={`${classes} hover:border-indigo-300 ${tw.focusRing}`}>
      {contenu}
    </Link>
  ) : (
    <div className={classes}>{contenu}</div>
  );
};

// Largeur de barre en % — protège contre max=0 (NaN% sinon, barre invisible/cassée).
const pourcent = (valeur, max) => (max > 0 ? (valeur / max) * 100 : 0);

const formatSalaire = (montant) => {
  if (!montant) return "Non renseigné";
  return new Intl.NumberFormat("fr-DZ").format(montant) + " DA";
};

const formatDA = (montant) => new Intl.NumberFormat("fr-DZ").format(montant || 0) + " DA";

const AdminStatistiques = () => {
  const [stats, setStats] = useState(null);
  const [marche, setMarche] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMarche, setLoadingMarche] = useState(false);
  const [erreurMarche, setErreurMarche] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminStats();
      setStats(data);
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors du chargement des statistiques."));
      reportError("ECHEC_CHARGEMENT_STATS_ADMIN", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarche = async () => {
    setLoadingMarche(true);
    setErreurMarche(false);
    try {
      const data = await jobsService.getAdminMarche();
      setMarche(data);
    } catch (err) {
      setErreurMarche(true);
      toast.error(apiErrMsg(err, "Erreur lors du chargement des données marché."));
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

  const header = (
    <AdminPageHeader
      icon={LayoutDashboard}
      color="indigo"
      title="Tableau de bord"
      subtitle="Contrôle global de la plateforme TafTech"
      aideKey="dashboard"
      aide={[
        "Les bandeaux colorés en haut signalent ce qui attend une action de votre part (entreprises, offres, abonnements). Cliquez dessus pour y aller directement.",
        "Chaque carte chiffrée est cliquable et ouvre la page de gestion correspondante.",
        "L'onglet « Données marché » montre la tension candidats/offres par secteur et les régions les plus actives. Il est calculé à la demande.",
        "Le bouton « Rafraîchir » recharge les chiffres sans recharger la page.",
      ]}
      actions={
        <button
          onClick={() => {
            fetchStats();
            if (activeTab === "marche") fetchMarche();
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${tw.borderSubtle} bg-white text-xs font-semibold ${tw.textMuted700} hover:bg-slate-50 transition-colors ${tw.focusRing}`}
          title="Rafraîchir"
        >
          <RefreshCw size={14} className={loading || loadingMarche ? "animate-spin" : ""} /> Rafraîchir
        </button>
      }
    />
  );

  if (loading && !stats)
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center h-48">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.spinnerBorderPrimary}`}></div>
        </div>
      </div>
    );

  if (!stats)
    return (
      <div className="space-y-6">
        {header}
        <AdminErreurChargement message="Impossible de charger les statistiques." onRetry={fetchStats} />
      </div>
    );

  return (
    <div className="space-y-6">
      {header}

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
                to: "/admin-taftech/utilisateurs",
              },
              {
                icon: Briefcase,
                label: "Recruteurs",
                value: stats.total_recruteurs,
                color: "violet",
                to: "/admin-taftech/utilisateurs",
              },
              {
                icon: PartyPopper,
                label: "Recrutements réussis",
                value: stats.total_recrutements,
                color: "pink",
                info: "Nombre de candidatures dont le statut final est \"Retenu\".",
                to: "/admin-taftech/candidatures",
              },
              {
                icon: Building2,
                label: "Entreprises",
                value: stats.total_entreprises,
                color: "emerald",
                to: "/admin-taftech/entreprises",
              },
              {
                icon: Hourglass,
                label: "Entreprises en attente",
                value: stats.entreprises_attente,
                color: "amber",
                info: "Entreprises inscrites qui attendent une validation manuelle avant de pouvoir publier des offres.",
                to: "/admin-taftech/entreprises",
              },
              {
                icon: BarChart3,
                label: "Offres publiées",
                value: stats.total_offres,
                color: "indigo",
                info: "Offres actuellement visibles côté candidat (approuvées, actives, non clôturées).",
                to: "/admin-taftech/offres",
              },
              {
                icon: FolderClock,
                label: "Offres en attente",
                value: stats.offres_attente,
                color: "red",
                info: "Offres soumises par des recruteurs qui attendent une modération (approbation ou rejet).",
                to: "/admin-taftech/offres",
              },
            ].map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* PREMIUM */}
          {stats.premium_expirant_bientot > 0 && (
            <Link
              to="/admin-taftech/demandes-premium"
              className={`flex items-center gap-3 p-4 ${tw.bgWarningSoft} border ${tw.borderWarning} rounded-xl hover:border-amber-400 transition-colors`}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Clock size={17} />
              </div>
              <p className={`text-sm font-semibold ${tw.textWarning900}`}>
                {stats.premium_expirant_bientot} abonnement(s) expirent dans les 7 prochains jours
              </p>
            </Link>
          )}
          <div>
            <p className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wider mb-3`}>Abonnements recruteurs</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                icon={Star}
                label="Abonnements actifs"
                value={stats.premium_actifs}
                color="gold"
                to="/admin-taftech/abonnements-ia"
              />
              <StatCard
                icon={TrendingUp}
                label="Revenu estimé"
                value={formatDA(stats.revenu_premium_estime)}
                color="gold"
                info="Estimation basée sur le dernier palier tarifaire traité pour chaque entreprise actuellement abonnée — pas une comptabilité exacte (n'inclut pas les paiements Chargily sans demande d'activation correspondante)."
              />
              <StatCard
                icon={Hourglass}
                label="Demandes en attente"
                value={stats.demandes_premium_attente}
                color="amber"
                to="/admin-taftech/demandes-premium"
              />
            </div>
          </div>

          {/* CONTENU DU SITE (CMS) */}
          <div>
            <p className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wider mb-3`}>Contenu du site</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={Newspaper} label="Articles publiés" value={stats.nb_articles_publies} color="slate" to="/admin-taftech/articles" />
              <StatCard icon={FileEdit} label="Brouillons" value={stats.nb_articles_brouillons} color="slate" to="/admin-taftech/articles" />
              <StatCard icon={HelpCircle} label="Questions FAQ" value={stats.nb_faq_actives} color="slate" to="/admin-taftech/faq" />
              <StatCard icon={Sparkles} label="Compétences" value={stats.nb_competences_referentiel} color="slate" to="/admin-taftech/competences" />
              <StatCard icon={ImageIcon} label="Bannières actives" value={stats.nb_bannieres_actives} color="slate" to="/admin-taftech/bannieres" />
            </div>
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
          ) : erreurMarche || !marche ? (
            <AdminErreurChargement message="Impossible de charger les données marché." onRetry={fetchMarche} />
          ) : !marche.matching_moyen && !marche.tension_par_secteur?.length && !marche.top_wilayas?.length && !marche.top_secteurs?.length ? (
            <div className={tw.card}>
              <AdminVide
                icon={BarChart3}
                titre="Pas encore assez de données"
                texte="Les indicateurs marché apparaîtront dès que des offres auront été publiées et que des candidatures auront été reçues."
              />
            </div>
          ) : (
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
                      <TooltipIcon text="Moyenne du score de compatibilité IA (localisation, diplôme, spécialité de formation, expérience, compétences — seuls les critères demandés par l'offre comptent) calculé sur toutes les candidatures ayant un score." />
                    </p>
                    <p className={`text-3xl font-bold ${tw.textPrimary}`}>
                      {marche.matching_moyen}%
                    </p>
                  </div>
                </div>
              )}

              {/* TENSION MARCHÉ PAR SECTEUR */}
              {marche.tension_par_secteur?.length > 0 && (
                <div className={`${tw.card} overflow-hidden`}>
                  <div className={`px-5 py-4 border-b ${tw.borderSubtle}`}>
                    <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5`}>
                      Tension marché par secteur
                      <TooltipIcon text="Candidatures par offre publiée dans ce secteur — bas (proche de 0) signale un manque de candidats face aux postes ouverts (marché candidat, pénurie de profils), élevé signale beaucoup d'intérêt par poste (marché employeur)." />
                    </h2>
                    <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                      Offres publiées vs candidatures réellement reçues
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`${tw.surfaceMuted} text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                          <th className="px-5 py-3 text-left">Secteur</th>
                          <th className="px-5 py-3 text-right">Salaire moyen proposé</th>
                          <th className="px-5 py-3 text-right">Candidatures / offre</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${tw.divideBase}`}>
                        {marche.tension_par_secteur.map((s) => {
                          const tension = s.candidatures_par_offre;
                          const tendu = tension !== null && tension < 1;
                          return (
                            <tr key={s.secteur} className={tw.rowHover}>
                              <td className="px-5 py-3">
                                <p className={`text-sm font-semibold ${tw.textStrong}`}>
                                  {s.secteur}
                                </p>
                                <p className={`text-xs ${tw.textMuted}`}>
                                  {s.nb_offres} offre{s.nb_offres > 1 ? "s" : ""} · {s.nb_candidatures} candidature{s.nb_candidatures > 1 ? "s" : ""}
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <p className={`text-sm font-semibold ${tw.textSuccessIcon}`}>
                                  {formatSalaire(s.moy_salaire_offres)}
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right">
                                {tension !== null ? (
                                  <span
                                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                                      tendu
                                        ? `${tw.bgErrorSoft} ${tw.textError}`
                                        : `${tw.bgSuccessSoft} ${tw.textSuccessIcon}`
                                    }`}
                                  >
                                    {tendu ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                                    {tension}
                                  </span>
                                ) : (
                                  <span className={`${tw.textMuted} text-xs`}>—</span>
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
                        const pct = pourcent(w.nb_offres, marche.top_wilayas[0].nb_offres);
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
                        const pct = pourcent(s.nb_offres, marche.top_secteurs[0].nb_offres);
                        return (
                          <div key={s.metier_id}>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs font-medium ${tw.textMuted700}`}>
                                {i + 1}. {s.libelle}
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
