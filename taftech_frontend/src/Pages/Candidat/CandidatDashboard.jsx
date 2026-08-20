import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { profilService } from "../../Services/profilService";
import { reportError } from "../../utils/errorReporter";
import JobCard from "../../Components/JobCard";
import {
  Sparkles,
  Briefcase,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  UserCircle,
  FileText,
  TrendingUp,
  Star,
  AlertTriangle,
  GraduationCap,
  RefreshCw,
} from "lucide-react";
import { tw } from "../../theme";

const SECTION_KEYS = ["MÉTIERS POSSIBLES", "POINTS FORTS", "COMPÉTENCES MANQUANTES", "FORMATIONS RECOMMANDÉES", "ÉVOLUTION PROFESSIONNELLE"];
const SECTION_ALTERNATION = SECTION_KEYS.join("|");

const SECTIONS_CONFIG = [
  { key: "MÉTIERS POSSIBLES", icon: Briefcase, color: "indigo" },
  { key: "POINTS FORTS", icon: Star, color: "emerald" },
  { key: "COMPÉTENCES MANQUANTES", icon: AlertTriangle, color: "amber" },
  { key: "FORMATIONS RECOMMANDÉES", icon: GraduationCap, color: "blue" },
  { key: "ÉVOLUTION PROFESSIONNELLE", icon: TrendingUp, color: "rose" },
].map(({ key, icon, color }) => ({
  key,
  icon,
  color,
  regex: new RegExp(`(?:#{1,3})\\s*${key}\\s*(?:#{0,3})\\s*([\\s\\S]*?)(?=(?:#{1,3})\\s*(?:${SECTION_ALTERNATION})|$)`, "i"),
}));

const parseAnalyse = (text) => {
  if (!text) return null;
  const parsedSections = SECTIONS_CONFIG
    .map(({ key, icon, color, regex }) => {
      const match = text.match(regex);
      return { label: key, content: match ? match[1].trim() : "", icon, color };
    })
    .filter((s) => s.content);
  if (parsedSections.length === 0)
    return [{ label: "ANALYSE PERSONNALISÉE", content: text.replace(/#/g, "").trim(), icon: Sparkles, color: "indigo" }];
  return parsedSections;
};

const CHAMPS_PROFIL = [
  { label: "Numéro de téléphone", test: (p) => !!p.telephone },
  { label: "Photo de profil", test: (p) => !!p.photo_profil },
  { label: "CV", test: (p) => !!p.cv_pdf },
  { label: "Titre professionnel", test: (p) => !!p.titre_professionnel },
  { label: "Wilaya / Commune", test: (p) => !!(p.wilaya && p.commune) },
  { label: "Diplôme", test: (p) => !!p.diplome },
  { label: "Spécialité", test: (p) => !!p.specialite },
  { label: "Expériences", test: (p) => p.experiences_detail?.length > 0 },
  { label: "Formations", test: (p) => p.formations_detail?.length > 0 },
  { label: "Compétences", test: (p) => p.competences?.split(",").filter((t) => t).length > 0 },
  { label: "Langues", test: (p) => p.langues?.split(",").filter((t) => t).length > 0 },
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

const CandidatDashboard = () => {
  const [profil, setProfil] = useState(null);
  const [candidatures, setCandidatures] = useState([]);
  const [offresRecommandees, setOffresRecommandees] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyseCv, setAnalyseCv] = useState(null);
  const [analyseCvLoading, setAnalyseCvLoading] = useState(false);
  const [analyseCvDemandee, setAnalyseCvDemandee] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [profilData, candidaturesData, offresData, suggestionsData] = await Promise.allSettled([
          profilService.getProfil(),
          jobsService.getMesCandidatures(),
          jobsService.getOffresRecommandees(),
          jobsService.getSuggestionsCarriere(),
        ]);
        if (profilData.status === "fulfilled") setProfil(profilData.value);
        if (candidaturesData.status === "fulfilled") setCandidatures(candidaturesData.value);
        if (offresData.status === "fulfilled") setOffresRecommandees(offresData.value);
        if (suggestionsData.status === "fulfilled") setSuggestions(suggestionsData.value);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_DASHBOARD_CANDIDAT", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const completionPercent = profil
    ? CHAMPS_PROFIL.filter((c) => c.test(profil)).length * (100 / CHAMPS_PROFIL.length)
    : 0;
  const completionRounded = Math.round(completionPercent);

  const champsManquants = profil
    ? CHAMPS_PROFIL.filter((c) => !c.test(profil)).map((c) => c.label)
    : [];

  const dernieresCandidatures = candidatures.slice(0, 3);
  const offresTop = offresRecommandees.slice(0, 3);
  const metiersTop = (suggestions?.metiers || []).slice(0, 4);
  const parsedAnalyseCv = parseAnalyse(analyseCv);

  const handleAnalyseCv = async () => {
    setAnalyseCvLoading(true);
    setAnalyseCvDemandee(true);
    setAnalyseCv(null);
    try {
      const data = await jobsService.getAnalyseCarriere();
      setAnalyseCv(data.analyse);
    } catch (err) {
      reportError("ECHEC_GET_ANALYSE_CV_DASHBOARD", err);
      setAnalyseCv("Service IA temporairement indisponible. Réessayez plus tard.");
    } finally {
      setAnalyseCvLoading(false);
    }
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
      <div>
        <h1 className={tw.pageTitleGrand}>Tableau de bord</h1>
        <p className={`${tw.bodyTextGrand} mt-1`}>
          Un aperçu complet de votre profil et de vos opportunités.
        </p>
      </div>

      {/* COMPLÉTUDE DU PROFIL */}
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
                {champsManquants.length === 0
                  ? "Votre profil est complet, bravo !"
                  : `${champsManquants.length} élément${champsManquants.length > 1 ? "s" : ""} à compléter.`}
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

        {champsManquants.length > 0 && (
          <div className={`mt-5 pt-5 border-t ${tw.borderSubtle} flex flex-wrap gap-2`}>
            {champsManquants.map((label) => (
              <Link
                key={label}
                to="/profil"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${tw.badgeNeutral} text-xs font-medium hover:opacity-80 transition-opacity`}
              >
                <AlertCircle size={12} /> {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OFFRES RECOMMANDÉES */}
        <div className={`${tw.card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-bold ${tw.textStrong} flex items-center gap-2`}>
              <Briefcase size={18} className={tw.textPrimary} /> Offres recommandées
            </h2>
            <Link to="/offres" className={`text-xs font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          {offresTop.length === 0 ? (
            <p className={`text-sm ${tw.textMuted} py-6 text-center`}>
              Complétez votre profil pour recevoir des recommandations personnalisées.
            </p>
          ) : (
            <div className="space-y-3">
              {offresTop.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>

        {/* DERNIÈRES CANDIDATURES */}
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
                  className={`block p-3 rounded-lg border ${tw.borderBase} hover:shadow-sm transition-all`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${tw.textStrong} truncate`}>{cand.offre_titre}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${getBadgeStyle(cand.statut)}`}>
                      {STATUT_LABELS[cand.statut] || cand.statut}
                    </span>
                  </div>
                  <p className={`text-xs ${tw.textMuted700} mt-0.5`}>{cand.entreprise_nom}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECOMMANDATIONS IA */}
      <div className={`${tw.card} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-base font-bold ${tw.textStrong} flex items-center gap-2`}>
            <Sparkles size={18} className={tw.textPrimary} /> Recommandations de l'IA
          </h2>
          <Link to="/suggestions-carriere" className={`text-xs font-semibold ${tw.textPrimary} hover:underline flex items-center gap-0.5`}>
            Analyse complète <ArrowRight size={12} />
          </Link>
        </div>
        {metiersTop.length === 0 ? (
          <p className={`text-sm ${tw.textMuted} py-6 text-center`}>
            Complétez votre profil pour obtenir des suggestions de métiers personnalisées.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metiersTop.map((metier) => (
              <div key={metier.id} className={`p-3 rounded-lg ${tw.surfaceMuted} border ${tw.borderBase}`}>
                <p className={`text-sm font-semibold ${tw.textStrong}`}>{metier.titre}</p>
                <p className={`text-xs ${tw.textMuted700} mt-0.5`}>{metier.domaine_label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ANALYSE IA DU CV */}
      <div className={`${tw.card} p-6`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className={`text-base font-bold ${tw.textStrong} flex items-center gap-2`}>
            <FileText size={18} className={tw.textPrimary} /> Analyse IA du CV
          </h2>
          <button
            onClick={handleAnalyseCv}
            disabled={analyseCvLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${tw.buttonSecondary} text-xs font-semibold disabled:opacity-50`}
          >
            <RefreshCw size={13} className={analyseCvLoading ? "animate-spin" : ""} />
            {analyseCvDemandee ? "Relancer l'analyse" : "Lancer l'analyse"}
          </button>
        </div>

        {!analyseCvDemandee && (
          <p className={`text-sm ${tw.textMuted} py-6 text-center`}>
            Obtenez une analyse IA de votre CV : évolution de carrière possible, compétences à acquérir et conseils personnalisés.
          </p>
        )}

        {analyseCvLoading && (
          <div className="flex items-center justify-center py-10">
            <RefreshCw size={20} className={`animate-spin ${tw.textPrimary}`} />
          </div>
        )}

        {!analyseCvLoading && parsedAnalyseCv && (
          <div className="space-y-3">
            {parsedAnalyseCv.map(({ label, content, icon: Icon, color }) => (
              <div key={label} className={`p-4 rounded-xl border ${tw.analyseSectionColors[color].card}`}>
                <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-2 ${tw.analyseSectionColors[color].header}`}>
                  <Icon size={14} className={tw.analyseSectionColors[color].icon} /> {label}
                </div>
                <p className={`text-sm ${tw.textMuted700} leading-relaxed whitespace-pre-line`}>{content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatDashboard;
