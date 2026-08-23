import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { profilService } from "../../Services/profilService";
import { reportError } from "../../utils/errorReporter";
import { TooltipIcon } from "../../Components/Tooltip";
import { jobUrl } from "../../utils/slugify";
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
  MapPin,
  Banknote,
  AlertTriangle,
  Lightbulb,
  Search,
} from "lucide-react";
import { tw } from "../../theme";

const NIVEAU_PCT = { DEBUTANT: 25, INTERMEDIAIRE: 50, AVANCE: 75, CONFIRME: 100 };

const SCORE_DETAIL_LABELS = {
  completude: "Complétude du profil",
  diplome: "Diplôme",
  experience: "Expérience",
  langues: "Langues",
  pertinence_marche: "Pertinence marché",
};

const RecommendedJobCard = ({ job }) => (
  <Link
    to={jobUrl(job)}
    className={`block min-w-[220px] max-w-[220px] shrink-0 snap-start rounded-xl border ${tw.borderBase} ${tw.surface} p-3 hover:shadow-sm transition-all relative`}
  >
    {job.matching_score != null && (
      <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white shadow ${scoreCouleur(job.matching_score)}`}>
        {Math.round(job.matching_score)}%
      </span>
    )}
    <div className="flex items-center gap-2 mb-2">
      {job.entreprise?.logo_url ? (
        <img src={job.entreprise.logo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" width={32} height={32} loading="lazy" />
      ) : (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${tw.bgPrimarySoft} ${tw.textPrimaryStrong}`}>
          {(job.entreprise?.nom_entreprise || "?").charAt(0).toUpperCase()}
        </div>
      )}
      <p className={`text-[10px] font-semibold uppercase tracking-wide truncate ${tw.textMuted700}`}>
        {job.entreprise?.nom_entreprise}
      </p>
    </div>
    <p className={`text-sm font-bold ${tw.textStrong} line-clamp-2 mb-1.5`}>{job.titre}</p>
    <div className="flex items-center gap-1 text-xs mb-2">
      <MapPin size={11} className={tw.iconMuted} />
      <span className={tw.textMuted700}>{job.wilaya?.split(" - ")[1] || job.wilaya}</span>
    </div>
    <div className="flex flex-wrap gap-1 mb-2">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tw.badgeNeutral}`}>{job.type_contrat}</span>
      {job.matching_score != null && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">Compatible</span>
      )}
    </div>
    {job.salaire_propose && (
      <div className="flex items-center gap-1 text-xs">
        <Banknote size={11} className="text-emerald-600" />
        <span className="font-semibold text-emerald-700">{job.salaire_propose}</span>
      </div>
    )}
  </Link>
);

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
  const [competences, setCompetences] = useState([]);
  const [conseils, setConseils] = useState([]);
  const [conseilsErreur, setConseilsErreur] = useState(null);
  const [wilayas, setWilayas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchWilaya, setSearchWilaya] = useState("");
  const navigate = useNavigate();
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
          jobsService.getMesCompetencesDetail(),
          jobsService.getConseilsPersonnalises(),
          jobsService.getConstants(),
        ]);
        const [profilData, candidaturesData, offresData, scoreData, alertesData, activitesData, competencesData, conseilsData, constantsData] = results;
        if (profilData.status === "fulfilled") setProfil(profilData.value);
        if (candidaturesData.status === "fulfilled") setCandidatures(candidaturesData.value);
        if (offresData.status === "fulfilled") setOffresRecommandees(offresData.value);
        if (scoreData.status === "fulfilled") setScoreProfil(scoreData.value);
        if (alertesData.status === "fulfilled") setAlertes(alertesData.value);
        if (activitesData.status === "fulfilled") setActivites(activitesData.value);
        if (competencesData.status === "fulfilled") setCompetences(competencesData.value);
        if (constantsData.status === "fulfilled") setWilayas(constantsData.value.wilayas || []);
        if (conseilsData.status === "fulfilled") {
          setConseils(conseilsData.value.conseils || []);
        } else {
          setConseilsErreur(conseilsData.reason?.response?.data?.error || "Service IA temporairement indisponible.");
        }
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

  const scoreEntries = scoreProfil ? Object.entries(scoreProfil.details) : [];
  const scoreEntriesTriees = [...scoreEntries].sort((a, b) => (b[1].points / b[1].max) - (a[1].points / a[1].max));
  const pointsForts = scoreEntriesTriees.filter(([, d]) => d.points / d.max >= 0.7).slice(0, 3);
  const pointsAmeliorer = scoreEntriesTriees.filter(([, d]) => d.points / d.max < 0.7).slice(0, 3);

  const competencesADevelopper = [...competences]
    .filter((c) => c.niveau !== "CONFIRME")
    .sort((a, b) => (NIVEAU_PCT[a.niveau] || 0) - (NIVEAU_PCT[b.niveau] || 0))
    .slice(0, 4);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (searchWilaya) params.set("wilaya", searchWilaya);
    navigate(`/offres?${params.toString()}`);
  };

  const handleToggleToutesAlertes = async () => {
    const nouvelEtat = !alertes.every((a) => a.est_active);
    setAlertes((prev) => prev.map((a) => ({ ...a, est_active: nouvelEtat })));
    try {
      await Promise.all(alertes.map((a) => jobsService.toggleAlerte(a.id, nouvelEtat)));
    } catch (error) {
      reportError("ECHEC_TOGGLE_TOUTES_ALERTES", error);
      setAlertes((prev) => prev.map((a) => ({ ...a, est_active: !nouvelEtat })));
    }
  };

  const scrollCarousel = (dir) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-0 py-6 space-y-4 animate-pulse">
        <div className={`h-24 ${tw.card}`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`h-64 ${tw.card}`} />
          <div className={`h-64 ${tw.card}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-0 py-2">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2.5">
        <div>
          <h1 className={`text-xl font-bold ${tw.textStrong}`}>Tableau de bord</h1>
          <p className={`text-xs ${tw.textMuted700}`}>
            Un aperçu complet de votre profil et de vos opportunités.
          </p>
        </div>
        <Link
          to="/profil"
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm ${tw.buttonSecondary} shrink-0 self-start sm:self-center`}
        >
          <FileText size={13} /> Publier mon CV
        </Link>
      </div>

      {/* RECHERCHE RAPIDE */}
      <form
        onSubmit={handleSearchSubmit}
        className={`flex items-stretch rounded-lg border ${tw.borderBase} ${tw.surface} overflow-hidden mb-2.5`}
      >
        <div className="flex items-center flex-1 min-w-0 px-3">
          <Search size={15} className="shrink-0 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un emploi, une entreprise, un mot-clé..."
            className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-sm placeholder-slate-400 focus:outline-none"
          />
        </div>
        <select
          value={searchWilaya}
          onChange={(e) => setSearchWilaya(e.target.value)}
          className={`shrink-0 border-l ${tw.borderBase} ${tw.surfaceMuted} text-xs font-medium px-3 focus:outline-none max-w-[160px]`}
        >
          <option value="">Toutes les wilayas</option>
          {wilayas.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
        <button type="submit" className={`shrink-0 px-4 text-sm font-semibold ${tw.bgPrimarySolidHover} text-white`}>
          Rechercher
        </button>
      </form>

      {/* COMPLÉTUDE DU PROFIL — jauge + sous-barres par catégorie */}
      <div className={`${tw.card} p-5 mb-2.5`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <path
                  className="stroke-slate-100"
                  strokeWidth="4"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={completionRounded >= 80 ? "stroke-emerald-500" : completionRounded >= 40 ? "stroke-amber-500" : "stroke-indigo-500"}
                  strokeWidth="4"
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
              <h2 className={`text-sm font-bold ${tw.textStrong}`}>Complétude du profil</h2>
              <p className={`text-[10px] ${tw.textMuted700}`}>
                {completionRounded === 100 ? "Votre profil est complet, bravo !" : "Complétez les catégories ci-dessous."}
              </p>
            </div>
          </div>
          <Link
            to="/profil"
            className={`sm:ml-auto inline-flex items-center gap-1.5 px-4 py-2 text-sm ${tw.buttonPrimary} shrink-0 self-start sm:self-center`}
          >
            <UserCircle size={13} /> Compléter mon profil
          </Link>
        </div>

        <div className={`mt-3 pt-3 border-t ${tw.borderSubtle} grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2`}>
          {categoriesAvecPct.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold ${tw.textStrong}`}>{cat.label}</span>
                  <TooltipIcon text={cat.criteres.join(", ")} />
                </div>
                <span className={`text-[10px] font-bold ${tw.textMuted700}`}>{cat.pct}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${cat.pct >= 80 ? "bg-emerald-500" : cat.pct >= 40 ? "bg-amber-500" : "bg-indigo-500"}`}
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CORPS — colonne principale (2/3) + colonne latérale (1/3), comme un vrai dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 items-start">
        <div className="lg:col-span-2 space-y-2.5">
          {/* DERNIÈRES CANDIDATURES — avec logo entreprise */}
          <div className={`${tw.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5`}>
                <CheckCircle size={16} className={tw.textPrimary} /> Dernières candidatures
              </h2>
              <Link to="/mes-candidatures" className={`text-[10px] font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
                Voir tout <ArrowRight size={10} />
              </Link>
            </div>
            {dernieresCandidatures.length === 0 ? (
              <p className={`text-xs ${tw.textMuted} py-3 text-center`}>
                Vous n'avez encore postulé à aucune offre.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {dernieresCandidatures.slice(0, 3).map((cand) => (
                  <Link
                    key={cand.id}
                    to="/mes-candidatures"
                    className={`flex items-center gap-2 p-2 rounded-lg border ${tw.borderBase} hover:shadow-sm transition-all`}
                  >
                    {cand.entreprise_logo_url ? (
                      <img src={cand.entreprise_logo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" width={32} height={32} loading="lazy" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${tw.bgPrimarySoft} ${tw.textPrimaryStrong}`}>
                        {(cand.entreprise_nom || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold ${tw.textStrong} truncate`}>{cand.offre_titre}</p>
                      <p className={`text-[10px] ${tw.textMuted700} truncate`}>{cand.entreprise_nom}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getBadgeStyle(cand.statut)}`}>
                        {STATUT_LABELS[cand.statut] || cand.statut}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* OFFRES RECOMMANDÉES — carousel horizontal avec badge % */}
          <div className={`${tw.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5`}>
                <Briefcase size={16} className={tw.textPrimary} /> Offres recommandées
              </h2>
              <div className="flex items-center gap-1.5">
                {offresRecommandees.length > 0 && (
                  <>
                    <button onClick={() => scrollCarousel(-1)} className={`p-1 rounded-lg ${tw.buttonSecondary}`}>
                      <ChevronLeft size={12} />
                    </button>
                    <button onClick={() => scrollCarousel(1)} className={`p-1 rounded-lg ${tw.buttonSecondary}`}>
                      <ChevronRight size={12} />
                    </button>
                  </>
                )}
                <Link to="/offres" className={`text-[10px] font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
                  Voir tout <ArrowRight size={10} />
                </Link>
              </div>
            </div>
            {offresRecommandees.length === 0 ? (
              <p className={`text-xs ${tw.textMuted} py-3 text-center`}>
                Complétez votre profil pour recevoir des recommandations personnalisées.
              </p>
            ) : (
              <div ref={carouselRef} className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory">
                {offresRecommandees.map((job) => (
                  <RecommendedJobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>

          {/* ANALYSE DE MON CV — score composite, points forts / à améliorer */}
          <div className={`${tw.card} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5`}>
                <TrendingUp size={16} className={tw.textPrimary} /> Analyse de mon CV
              </h2>
              <Link to="/mes-competences" className={`text-[10px] font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
                Voir le détail <ArrowRight size={10} />
              </Link>
            </div>
            {scoreProfil ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <path
                        className="stroke-slate-100"
                        strokeWidth="4"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={scoreProfil.total >= 80 ? "stroke-emerald-500" : scoreProfil.total >= 50 ? "stroke-amber-500" : "stroke-indigo-500"}
                        strokeWidth="4"
                        strokeDasharray={`${scoreProfil.total}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-sm font-extrabold ${tw.textStrong}`}>{scoreProfil.total}</span>
                    </div>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${tw.textStrong}`}>
                      {scoreProfil.total >= 80 ? "Excellent profil !" : scoreProfil.total >= 50 ? "Bon profil !" : "Profil à renforcer"}
                    </p>
                    <p className={`text-[11px] ${tw.textMuted700}`}>
                      Votre profil est {scoreProfil.total >= 80 ? "très" : scoreProfil.total >= 50 ? "bien" : "peu"} compétitif face aux postes visés.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 text-emerald-700`}>Vos points forts</p>
                    <div className="space-y-1">
                      {pointsForts.map(([key]) => (
                        <div key={key} className="flex items-center gap-1.5 text-xs">
                          <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                          <span className={tw.textMuted700}>{SCORE_DETAIL_LABELS[key] || key}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 text-amber-700`}>À améliorer</p>
                    <div className="space-y-1">
                      {pointsAmeliorer.map(([key]) => (
                        <div key={key} className="flex items-center gap-1.5 text-xs">
                          <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                          <span className={tw.textMuted700}>{SCORE_DETAIL_LABELS[key] || key}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {competencesADevelopper.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${tw.borderSubtle}`}>
                    <p className={`text-[10px] ${tw.textMuted700} mb-1.5`}>Augmentez votre score en progressant sur ces compétences :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {competencesADevelopper.map((c) => (
                        <span key={c.id} className={`px-2 py-1 rounded-full text-[10px] font-semibold ${tw.badgeNeutral}`}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className={`text-xs ${tw.textMuted} py-3 text-center`}>Analyse indisponible pour le moment.</p>
            )}
          </div>

          {/* COMPÉTENCES À DÉVELOPPER */}
          <div className={`${tw.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5`}>
                <Star size={16} className={tw.textPrimary} /> Compétences à développer
              </h2>
              <Link to="/mes-competences" className={`text-[10px] font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
                Voir toutes mes compétences <ArrowRight size={10} />
              </Link>
            </div>
            {competences.length === 0 ? (
              <p className={`text-xs ${tw.textMuted} py-3 text-center`}>
                Aucune compétence renseignée. <Link to="/profil" className={`${tw.textPrimary} hover:underline`}>Complétez votre profil</Link>.
              </p>
            ) : competencesADevelopper.length === 0 ? (
              <p className={`text-xs ${tw.textMuted} py-3 text-center`}>Toutes vos compétences sont au niveau Confirmé, bravo !</p>
            ) : (
              <div className="space-y-2.5">
                {competencesADevelopper.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-semibold ${tw.textStrong}`}>{c.label}</span>
                      <span className={`text-[10px] font-bold ${tw.textMuted700}`}>{c.niveau_libelle} · {NIVEAU_PCT[c.niveau] || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${NIVEAU_PCT[c.niveau] || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CONSEILS PERSONNALISÉS PAR IA — générés à partir du profil, du score, des
              candidatures et des alertes réels du candidat (jobs/conseils-personnalises/) */}
          <div className={`${tw.card} p-5`}>
            <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5 mb-2`}>
              <Lightbulb size={16} className={tw.textPrimary} /> Conseils personnalisés
            </h2>
            {conseils.length === 0 ? (
              <p className={`text-xs ${tw.textMuted} py-3 text-center`}>
                {conseilsErreur || "Conseils indisponibles pour le moment."}
              </p>
            ) : (
              <div className="space-y-2">
                {conseils.map((texte, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${tw.bgPrimarySoft}`}>
                      <Lightbulb size={11} className={tw.textPrimaryStrong} />
                    </div>
                    <p className={`text-xs ${tw.textMuted700} leading-relaxed`}>{texte}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RACCOURCIS — Mes documents / Prendre rendez-vous */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link to="/mes-documents" className={`${tw.card} p-4 flex items-center gap-2 hover:shadow-sm transition-all`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tw.surfaceMuted}`}>
                <FolderLock size={16} className={tw.textPrimary} />
              </div>
              <div>
                <p className={`text-xs font-bold ${tw.textStrong}`}>Mes documents</p>
                <p className={`text-[10px] ${tw.textMuted700}`}>Espace privé</p>
              </div>
            </Link>
            <Link to="/rendez-vous" className={`${tw.card} p-4 flex items-center gap-2 hover:shadow-sm transition-all`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tw.surfaceMuted}`}>
                <CalendarClock size={16} className={tw.textPrimary} />
              </div>
              <div>
                <p className={`text-xs font-bold ${tw.textStrong}`}>Prendre rendez-vous</p>
                <p className={`text-[10px] ${tw.textMuted700}`}>Avec un conseiller</p>
              </div>
            </Link>
          </div>
        </div>

        {/* COLONNE LATÉRALE — Suivi candidatures / Alertes / Activité récente — sticky pour éviter
            un grand vide en bas quand la colonne principale est plus longue */}
        <div className="space-y-2.5 lg:sticky lg:top-20">
          {/* SUIVI DES CANDIDATURES — funnel */}
          <div className={`${tw.card} p-5`}>
            <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5 mb-2`}>
              <Activity size={16} className={tw.textPrimary} /> Suivi de mes candidatures
            </h2>
            {candidatures.length === 0 ? (
              <p className={`text-xs ${tw.textMuted} py-3 text-center`}>Vous n'avez encore postulé à aucune offre.</p>
            ) : (
              <div className="space-y-1.5">
                {funnel.map((f) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold w-16 shrink-0 ${tw.textMuted700}`}>{f.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(f.count / funnelMax) * 100}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold w-4 text-right ${tw.textStrong}`}>{f.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ALERTES D'EMPLOI */}
          <div className={`${tw.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5`}>
                <Bell size={16} className={tw.textPrimary} /> Alertes d'emploi
                {nbNouvellesOffresAlertes > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                    {nbNouvellesOffresAlertes}
                  </span>
                )}
              </h2>
              <Link to="/alertes" className={`text-[10px] font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
                Gérer <ArrowRight size={10} />
              </Link>
            </div>
            {alertes.length > 0 && (
              <label className={`flex items-center justify-between gap-2 mb-2 pb-2 border-b ${tw.borderSubtle} cursor-pointer`}>
                <span className={`text-xs font-medium ${tw.textMuted700}`}>Recevoir mes alertes par email</span>
                <button
                  type="button"
                  onClick={handleToggleToutesAlertes}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${alertes.every((a) => a.est_active) ? tw.toggleTrackOn : tw.toggleTrackOff}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full transition ${tw.toggleThumb} ${alertes.every((a) => a.est_active) ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </label>
            )}
            {alertes.length === 0 ? (
              <p className={`text-xs ${tw.textMuted} py-3 text-center`}>Aucune alerte configurée.</p>
            ) : (
              <div className="space-y-1.5">
                {alertes.map((a) => (
                  <div key={a.id} className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${tw.surfaceMuted}`}>
                    <div className="min-w-0">
                      <span className={`text-xs font-medium ${tw.textStrong} truncate block`}>{a.mots_cles}</span>
                      <span className={`text-[10px] ${tw.textMuted700}`}>
                        {a.wilaya ? (a.wilaya.split(" - ")[1] || a.wilaya) : "Toute l'Algérie"} · {a.frequence === "QUOTIDIENNE" ? "Quotidienne" : "Hebdomadaire"}
                      </span>
                    </div>
                    {a.nb_nouvelles_offres > 0 && (
                      <span className="shrink-0 ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        +{a.nb_nouvelles_offres}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIVITÉ RÉCENTE */}
          <div className={`${tw.card} p-5`}>
            <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5 mb-2`}>
              <Eye size={16} className={tw.textPrimary} /> Activité récente
            </h2>
            {activites.length === 0 ? (
              <p className={`text-xs ${tw.textMuted} py-3 text-center`}>Aucune activité pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {activites.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${tw.surfaceMuted}`}>
                      <Sparkles size={10} className={tw.textPrimary} />
                    </div>
                    <p className={`text-[10px] ${tw.textMuted700} leading-relaxed`}>
                      {(ACTIVITE_LABELS[a.type_activite] || (() => "Activité"))(a)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatDashboard;
