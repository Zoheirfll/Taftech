import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { profilService } from "../../Services/profilService";
import { reportError } from "../../utils/errorReporter";
import JobCard from "../../Components/JobCard";
import { TooltipIcon } from "../../Components/Tooltip";
import {
  Briefcase,
  ArrowRight,
  CheckCircle,
  UserCircle,
  FileText,
  Star,
  Bell,
  CalendarClock,
  FolderLock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Activity,
  Eye,
  TrendingUp,
} from "lucide-react";
import { tw } from "../../theme";

const CATEGORIES = [
  {
    key: "infos",
    label: "Informations personnelles",
    criteres: ["Numéro de téléphone", "Photo de profil", "Titre professionnel", "Wilaya / Commune"],
    test: (p) => [!!p.telephone, !!p.photo_profil, !!p.titre_professionnel, !!(p.wilaya && p.commune)],
  },
  {
    key: "experience",
    label: "Expérience professionnelle",
    criteres: ["Au moins une expérience renseignée"],
    test: (p) => [p.experiences_detail?.length > 0],
  },
  {
    key: "competences",
    label: "Compétences",
    criteres: ["Au moins une compétence renseignée"],
    test: (p) => [p.competences?.split(",").filter((t) => t.trim()).length > 0],
  },
  {
    key: "formation",
    label: "Formation",
    criteres: ["Diplôme", "Spécialité", "Au moins une formation"],
    test: (p) => [!!p.diplome, !!p.specialite, p.formations_detail?.length > 0],
  },
  {
    key: "langues",
    label: "Langues",
    criteres: ["Au moins une langue renseignée"],
    test: (p) => [p.langues?.split(",").filter((t) => t.trim()).length > 0],
  },
  {
    key: "cv",
    label: "CV",
    criteres: ["CV téléversé"],
    test: (p) => [!!p.cv_pdf],
  },
];

const STATUT_LABELS = {
  RECUE: "Reçue",
  EN_COURS: "En cours",
  ENTRETIEN: "Entretien",
  RETENU: "Retenu(e)",
  REFUSE: "Refusé(e)",
};

const getBadgeStyle = (statut) => {
  const styles = {
    RECUE: tw.scoreMid,
    EN_COURS: tw.statusBlueSoft,
    ENTRETIEN: tw.statusOrangeSoft,
    RETENU: tw.scoreHigh,
    REFUSE: tw.scoreLow,
  };
  return styles[statut] || tw.statusNeutralSoft;
};

const scoreCouleur = (score) => (score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-slate-500");

const ACTIVITE_LABELS = {
  CANDIDATURE_CONSULTEE: (a) => `Votre candidature à "${a.offre_titre}" a été consultée par ${a.entreprise}`,
  PROFIL_RECOMMANDE: (a) => `Votre profil a été recommandé à ${a.entreprise}`,
};

const CandidatDashboard = () => {
  const [profil, setProfil] = useState(null);
  const [candidatures, setCandidatures] = useState([]);
  const [offresRecommandees, setOffresRecommandees] = useState([]);
  const [scoreProfil, setScoreProfil] = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const results = await Promise.allSettled([
          profilService.getProfil(),
          jobsService.getMesCandidatures(),
          jobsService.getOffresRecommandees(),
          jobsService.getScoreProfil(),
          jobsService.getAlertes(),
          jobsService.getActiviteProfil(),
        ]);
        const [profilData, candidaturesData, offresData, scoreData, alertesData, activitesData] = results;
        if (profilData.status === "fulfilled") setProfil(profilData.value);
        if (candidaturesData.status === "fulfilled") setCandidatures(candidaturesData.value);
        if (offresData.status === "fulfilled") setOffresRecommandees(offresData.value);
        if (scoreData.status === "fulfilled") setScoreProfil(scoreData.value);
        if (alertesData.status === "fulfilled") setAlertes(alertesData.value);
        if (activitesData.status === "fulfilled") setActivites(activitesData.value);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_DASHBOARD_CANDIDAT", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const categoriesAvecPct = profil
    ? CATEGORIES.map((cat) => {
        const resultats = cat.test(profil);
        const pct = Math.round((resultats.filter(Boolean).length / resultats.length) * 100);
        return { ...cat, pct, resultats };
      })
    : [];
  const completionRounded = categoriesAvecPct.length
    ? Math.round(categoriesAvecPct.reduce((sum, c) => sum + c.pct, 0) / categoriesAvecPct.length)
    : 0;

  const funnel = [
    { label: "Envoyées", count: candidatures.length },
    { label: "Présélection", count: candidatures.filter((c) => c.statut === "RECUE").length },
    { label: "En cours", count: candidatures.filter((c) => c.statut === "EN_COURS").length },
    { label: "Entretien", count: candidatures.filter((c) => c.statut === "ENTRETIEN").length },
    { label: "Retenu", count: candidatures.filter((c) => c.statut === "RETENU").length },
    { label: "Refusé", count: candidatures.filter((c) => c.statut === "REFUSE").length },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.count));

  const nbNouvellesOffresAlertes = alertes.reduce((sum, a) => sum + (a.nb_nouvelles_offres || 0), 0);
  const dernieresCandidatures = candidatures.slice(0, 4);

  const scrollCarousel = (dir) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-0 py-8 space-y-6 animate-pulse">
        <div className={`h-24 ${tw.card}`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`h-64 ${tw.card}`} />
          <div className={`h-64 ${tw.card}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-0 py-2 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={tw.pageTitleGrand}>Tableau de bord</h1>
          <p className={`${tw.bodyTextGrand} mt-1`}>
            Un aperçu complet de votre profil et de vos opportunités.
          </p>
        </div>
        <Link
          to="/profil"
          className={`inline-flex items-center gap-1.5 px-4 py-2 ${tw.buttonSecondary} shrink-0 self-start sm:self-center`}
        >
          <FileText size={16} /> Publier mon CV
        </Link>
      </div>

      {/* COMPLÉTUDE DU PROFIL — jauge + sous-barres par catégorie */}
      <div className={`${tw.card} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <path
                  className="stroke-slate-100"
                  strokeWidth="3.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={completionRounded >= 80 ? "stroke-emerald-500" : completionRounded >= 40 ? "stroke-amber-500" : "stroke-indigo-500"}
                  strokeWidth="3.5"
                  strokeDasharray={`${completionRounded}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-extrabold ${tw.textStrong}`}>{completionRounded}%</span>
              </div>
            </div>
            <div>
              <h2 className={`text-base font-bold ${tw.textStrong}`}>Complétude du profil</h2>
              <p className={`text-sm ${tw.textMuted700}`}>
                {completionRounded === 100 ? "Votre profil est complet, bravo !" : "Complétez les catégories ci-dessous."}
              </p>
            </div>
          </div>
          <Link
            to="/profil"
            className={`sm:ml-auto inline-flex items-center gap-1.5 px-4 py-2 ${tw.buttonPrimary} shrink-0 self-start sm:self-center`}
          >
            <UserCircle size={16} /> Compléter mon profil
          </Link>
        </div>

        <div className={`mt-5 pt-5 border-t ${tw.borderSubtle} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
          {categoriesAvecPct.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${tw.textStrong}`}>{cat.label}</span>
                  <TooltipIcon text={cat.criteres.join(", ")} />
                </div>
                <span className={`text-xs font-bold ${tw.textMuted700}`}>{cat.pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${cat.pct >= 80 ? "bg-emerald-500" : cat.pct >= 40 ? "bg-amber-500" : "bg-indigo-500"}`}
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SCORE DE PROFIL */}
        <div className={`${tw.card} p-6`}>
          <h2 className={`text-base font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
            <TrendingUp size={18} className={tw.textPrimary} /> Score de profil
          </h2>
          {scoreProfil ? (
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <path
                    className="stroke-slate-100"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={scoreProfil.total >= 80 ? "stroke-emerald-500" : scoreProfil.total >= 50 ? "stroke-amber-500" : "stroke-indigo-500"}
                    strokeWidth="3.5"
                    strokeDasharray={`${scoreProfil.total}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-base font-extrabold ${tw.textStrong}`}>{scoreProfil.total}</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {Object.entries(scoreProfil.details).map(([key, d]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className={tw.textMuted700}>
                      {{
                        completude: "Complétude",
                        diplome: "Diplôme",
                        experience: "Expérience",
                        langues: "Langues",
                        pertinence_marche: "Pertinence marché",
                      }[key] || key}
                    </span>
                    <span className={`font-bold ${tw.textStrong}`}>{d.points}/{d.max}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className={`text-sm ${tw.textMuted} py-6 text-center`}>Score indisponible pour le moment.</p>
          )}
        </div>

        {/* SUIVI DES CANDIDATURES — funnel */}
        <div className={`${tw.card} p-6`}>
          <h2 className={`text-base font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
            <Activity size={18} className={tw.textPrimary} /> Suivi de mes candidatures
          </h2>
          {candidatures.length === 0 ? (
            <p className={`text-sm ${tw.textMuted} py-6 text-center`}>Vous n'avez encore postulé à aucune offre.</p>
          ) : (
            <div className="space-y-2.5">
              {funnel.map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold w-24 shrink-0 ${tw.textMuted700}`}>{f.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(f.count / funnelMax) * 100}%` }} />
                  </div>
                  <span className={`text-xs font-bold w-6 text-right ${tw.textStrong}`}>{f.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OFFRES RECOMMANDÉES — carousel horizontal avec badge % */}
        <div className={`${tw.card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-bold ${tw.textStrong} flex items-center gap-2`}>
              <Briefcase size={18} className={tw.textPrimary} /> Offres recommandées
            </h2>
            <div className="flex items-center gap-2">
              {offresRecommandees.length > 0 && (
                <>
                  <button onClick={() => scrollCarousel(-1)} className={`p-1 rounded-lg ${tw.buttonSecondary}`}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => scrollCarousel(1)} className={`p-1 rounded-lg ${tw.buttonSecondary}`}>
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
              <Link to="/offres" className={`text-xs font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
                Voir tout <ArrowRight size={12} />
              </Link>
            </div>
          </div>
          {offresRecommandees.length === 0 ? (
            <p className={`text-sm ${tw.textMuted} py-6 text-center`}>
              Complétez votre profil pour recevoir des recommandations personnalisées.
            </p>
          ) : (
            <div ref={carouselRef} className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
              {offresRecommandees.map((job) => (
                <div key={job.id} className="min-w-[280px] max-w-[280px] snap-start relative">
                  {job.matching_score != null && (
                    <span className={`absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white shadow ${scoreCouleur(job.matching_score)}`}>
                      {Math.round(job.matching_score)}%
                    </span>
                  )}
                  <JobCard job={job} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DERNIÈRES CANDIDATURES — avec logo entreprise */}
        <div className={`${tw.card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-bold ${tw.textStrong} flex items-center gap-2`}>
              <CheckCircle size={18} className={tw.textPrimary} /> Dernières candidatures
            </h2>
            <Link to="/mes-candidatures" className={`text-xs font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          {dernieresCandidatures.length === 0 ? (
            <p className={`text-sm ${tw.textMuted} py-6 text-center`}>
              Vous n'avez encore postulé à aucune offre.
            </p>
          ) : (
            <div className="space-y-3">
              {dernieresCandidatures.map((cand) => (
                <Link
                  key={cand.id}
                  to="/mes-candidatures"
                  className={`flex items-center gap-3 p-3 rounded-lg border ${tw.borderBase} hover:shadow-sm transition-all`}
                >
                  {cand.entreprise_logo_url ? (
                    <img src={cand.entreprise_logo_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" width={36} height={36} loading="lazy" />
                  ) : (
                    <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${tw.surfaceMuted}`}>
                      <Briefcase size={16} className={tw.iconMuted} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${tw.textStrong} truncate`}>{cand.offre_titre}</p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${getBadgeStyle(cand.statut)}`}>
                        {STATUT_LABELS[cand.statut] || cand.statut}
                      </span>
                    </div>
                    <p className={`text-xs ${tw.textMuted700} mt-0.5`}>{cand.entreprise_nom}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ALERTES D'EMPLOI */}
        <div className={`${tw.card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-bold ${tw.textStrong} flex items-center gap-2`}>
              <Bell size={18} className={tw.textPrimary} /> Alertes d'emploi
              {nbNouvellesOffresAlertes > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  {nbNouvellesOffresAlertes} nouvelle{nbNouvellesOffresAlertes > 1 ? "s" : ""}
                </span>
              )}
            </h2>
            <Link to="/alertes" className={`text-xs font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
              Gérer <ArrowRight size={12} />
            </Link>
          </div>
          {alertes.length === 0 ? (
            <p className={`text-sm ${tw.textMuted} py-6 text-center`}>Aucune alerte configurée.</p>
          ) : (
            <div className="space-y-2">
              {alertes.slice(0, 4).map((a) => (
                <div key={a.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${tw.surfaceMuted}`}>
                  <span className={`text-sm font-medium ${tw.textStrong} truncate`}>{a.mots_cles}</span>
                  {a.nb_nouvelles_offres > 0 && (
                    <span className="shrink-0 ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                      +{a.nb_nouvelles_offres}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACTIVITÉ RÉCENTE */}
        <div className={`${tw.card} p-6`}>
          <h2 className={`text-base font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
            <Eye size={18} className={tw.textPrimary} /> Activité récente
          </h2>
          {activites.length === 0 ? (
            <p className={`text-sm ${tw.textMuted} py-6 text-center`}>Aucune activité pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {activites.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tw.surfaceMuted}`}>
                    <Sparkles size={13} className={tw.textPrimary} />
                  </div>
                  <p className={`text-xs ${tw.textMuted700} leading-relaxed`}>
                    {(ACTIVITE_LABELS[a.type_activite] || (() => "Activité"))(a)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RACCOURCIS — Mes compétences / Mes documents / Prendre rendez-vous */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/mes-competences" className={`${tw.card} p-5 flex items-center gap-3 hover:shadow-sm transition-all`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tw.surfaceMuted}`}>
            <Star size={18} className={tw.textPrimary} />
          </div>
          <div>
            <p className={`text-sm font-bold ${tw.textStrong}`}>Mes compétences</p>
            <p className={`text-xs ${tw.textMuted700}`}>Déclarer mon niveau</p>
          </div>
        </Link>
        <Link to="/mes-documents" className={`${tw.card} p-5 flex items-center gap-3 hover:shadow-sm transition-all`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tw.surfaceMuted}`}>
            <FolderLock size={18} className={tw.textPrimary} />
          </div>
          <div>
            <p className={`text-sm font-bold ${tw.textStrong}`}>Mes documents</p>
            <p className={`text-xs ${tw.textMuted700}`}>Espace privé</p>
          </div>
        </Link>
        <Link to="/rendez-vous" className={`${tw.card} p-5 flex items-center gap-3 hover:shadow-sm transition-all`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tw.surfaceMuted}`}>
            <CalendarClock size={18} className={tw.textPrimary} />
          </div>
          <div>
            <p className={`text-sm font-bold ${tw.textStrong}`}>Prendre rendez-vous</p>
            <p className={`text-xs ${tw.textMuted700}`}>Avec un conseiller</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default CandidatDashboard;
