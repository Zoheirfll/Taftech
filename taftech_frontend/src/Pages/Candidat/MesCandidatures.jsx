import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import {
  Calendar,
  Briefcase,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import { TooltipIcon } from "../../Components/Tooltip";
import { tw } from "../../theme";

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

const getScoreColor = (score) => {
  const num = parseFloat(score);
  if (num >= 80) return tw.scoreBadgeHigh;
  if (num >= 60) return tw.scoreBadgeMid;
  return tw.scoreBadgeLow;
};

const getMessageStatut = (statut) => {
  switch (statut) {
    case "RETENU":
      return "Félicitations ! Votre profil a été définitivement retenu pour ce poste.";
    case "REFUSE":
      return "Malheureusement, votre profil n'a pas été retenu. Ne vous découragez pas !";
    case "EN_COURS":
      return "Votre dossier est actuellement examiné par le recruteur.";
    case "ENTRETIEN":
      return "Bonne nouvelle ! Le recruteur souhaite vous rencontrer.";
    default:
      return "Votre candidature a été envoyée et attend d'être évaluée.";
  }
};
const CRITERES = [
  { key: "specialite", label: "Spécialité", max: 25 },
  { key: "diplome", label: "Diplôme", max: 20 },
  { key: "experience", label: "Expérience", max: 20 },
  { key: "competences", label: "Compétences", max: 15 },
  { key: "region", label: "Région", max: 20 },
];

const RadarChart = ({ details }) => {
  const cx = 110,
    cy = 110,
    R = 78;
  const n = CRITERES.length;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const gridPoints = (level) =>
    CRITERES.map((_, i) => {
      const a = angle(i);
      return `${cx + R * level * Math.cos(a)},${cy + R * level * Math.sin(a)}`;
    }).join(" ");
  const dataPoints = CRITERES.map((c, i) => {
    const norm = Math.min((details?.[c.key] ?? 0) / c.max, 1);
    const a = angle(i);
    return `${cx + R * norm * Math.cos(a)},${cy + R * norm * Math.sin(a)}`;
  }).join(" ");
  const labelPos = (i) => {
    const a = angle(i);
    return { x: cx + (R + 18) * Math.cos(a), y: cy + (R + 18) * Math.sin(a) };
  };
  const total = CRITERES.reduce((acc, c) => acc + (details?.[c.key] ?? 0), 0);
  const color = total >= 80 ? "#059669" : total >= 60 ? "#d97706" : "#dc2626";

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[200px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map((l) => (
        <polygon
          key={l}
          points={gridPoints(l)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="0.8"
        />
      ))}
      {CRITERES.map((_, i) => {
        const a = angle(i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + R * Math.cos(a)}
            y2={cy + R * Math.sin(a)}
            stroke="#cbd5e1"
            strokeWidth="0.8"
          />
        );
      })}
      <polygon
        points={dataPoints}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {CRITERES.map((c, i) => {
        const norm = Math.min((details?.[c.key] ?? 0) / c.max, 1);
        const a = angle(i);
        return (
          <circle
            key={i}
            cx={cx + R * norm * Math.cos(a)}
            cy={cy + R * norm * Math.sin(a)}
            r="3.5"
            fill={color}
          />
        );
      })}
      {CRITERES.map((c, i) => {
        const pos = labelPos(i);
        const pct = Math.round(((details?.[c.key] ?? 0) / c.max) * 100);
        return (
          <g key={i}>
            <text
              x={pos.x}
              y={pos.y - 4}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="600"
              fill="#475569"
            >
              {c.label}
            </text>
            <text
              x={pos.x}
              y={pos.y + 7}
              textAnchor="middle"
              fontSize="8"
              fill="#94a3b8"
            >
              {pct}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const AnalyseIA = ({ cand }) => {
  const DM = cand.details_matching;
  const scores = DM?.scores || DM;
  const points_forts = DM?.highlights?.points_forts || [];
  const ecarts = DM?.highlights?.ecarts || [];
  return (
    <div className={`mt-4 border-t ${tw.borderSubtle} pt-4`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} className={tw.iconPrimary500} />
        <span className={`text-sm font-semibold ${tw.textPrimaryStrong} uppercase tracking-wide`}>
          Analyse IA
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-6 items-center mb-4">
        <div className="w-full sm:w-1/2">
          <RadarChart details={scores} />
        </div>
        <div className="w-full sm:w-1/2 space-y-2.5">
          {CRITERES.map((c) => {
            const pct = Math.round(((scores?.[c.key] ?? 0) / c.max) * 100);
            const bar =
              pct >= 80
                ? tw.analyseBarHigh
                : pct >= 50
                  ? tw.analyseBarMid
                  : tw.analyseBarLow;
            return (
              <div key={c.key}>
                <div className="flex justify-between mb-1">
                  <span className={`text-sm font-medium ${tw.textMuted}`}>{c.label}</span>
                  <span className={`text-sm font-bold ${tw.textMuted700}`}>{pct}%</span>
                </div>
                <div className={`h-1.5 ${tw.surfaceSubtle} rounded-full overflow-hidden`}>
                  <div
                    className={`h-full rounded-full ${bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {points_forts.length > 0 && (
          <div className={`${tw.analyseCardSuccess} rounded-xl p-3`}>
            <p className={`text-xs font-bold ${tw.analyseTextSuccessStrong} uppercase mb-2 flex items-center gap-1`}>
              <CheckCircle size={11} /> Points forts
            </p>
            {points_forts.map((p) => (
              <div key={p} className="flex items-start gap-1.5 mb-1">
                <CheckCircle size={13} className={`${tw.analyseIconSuccess} mt-0.5 shrink-0`} />
                <span className={`text-sm ${tw.analyseTextSuccessBody}`}>{p}</span>
              </div>
            ))}
          </div>
        )}
        {ecarts.length > 0 && (
          <div className={`${tw.analyseCardWarning} rounded-xl p-3`}>
            <p className={`text-xs font-bold ${tw.analyseTextWarningStrong} uppercase mb-2 flex items-center gap-1`}>
              <AlertCircle size={11} /> Axes d'amélioration
            </p>
            {ecarts.map((e) => (
              <div key={e} className="flex items-start gap-1.5 mb-1">
                <AlertCircle size={13} className={`${tw.analyseIconWarning} mt-0.5 shrink-0`} />
                <span className={`text-sm ${tw.analyseTextWarningBody}`}>{e}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
const STATUT_LABELS = {
  RECUE: "Reçue",
  EN_COURS: "En cours",
  ENTRETIEN: "Entretien",
  RETENU: "Retenu(e)",
  REFUSE: "Refusé(e)",
};

const MesCandidatures = () => {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAnalyse, setOpenAnalyse] = useState({});
  const toggleAnalyse = (id) =>
    setOpenAnalyse((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {

    const fetchCandidatures = async () => {
      try {
        const data = await jobsService.getMesCandidatures();
        setCandidatures(data);
      } catch (error) {
        reportError("ECHEC_RECUPERATION_CANDIDATURES", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidatures();
  }, []);

  if (loading)
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className={`h-8 w-64 ${tw.surfaceSubtle} rounded-lg animate-pulse`} />
          <div className={`h-4 w-80 ${tw.surfaceSubtle} rounded animate-pulse`} />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`${tw.card} rounded-2xl p-6 animate-pulse`}>
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl ${tw.surfaceSubtle} shrink-0`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 w-1/3 ${tw.surfaceSubtle} rounded`} />
                  <div className={`h-3 w-1/4 ${tw.surfaceSubtle} rounded`} />
                  <div className={`h-3 w-1/5 ${tw.surfaceSubtle} rounded`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={tw.pageTitleGrand}>
          Suivi de mes candidatures
        </h1>
        <p className={`${tw.bodyTextGrand} mt-1`}>
          Suivez l'avancement de toutes vos candidatures.
        </p>
      </div>

      <InfoBanner storageKey="mes_candidatures" title="Comprendre les statuts">
        <span className="font-semibold">REÇUE</span> → le recruteur n'a pas encore consulté · <span className="font-semibold">EN COURS</span> → dossier en examen ·{" "}
        <span className="font-semibold">ENTRETIEN</span> → vous êtes invité(e) · <span className="font-semibold">RETENU(E)</span> → félicitations ! · <span className="font-semibold">REFUSÉ(E)</span> → ne vous découragez pas, postulez à d'autres offres.
      </InfoBanner>

      {candidatures.length === 0 ? (
        <div className={`${tw.surface} border border-dashed ${tw.borderBase} rounded-2xl p-14 text-center`}>
          <Briefcase size={40} className={`${tw.textSubtle} mx-auto mb-3`} />
          <p className={`text-base font-semibold ${tw.textStrong}`}>
            Aucune candidature pour l'instant
          </p>
          <p className={`text-sm ${tw.textMuted700} mt-1 mb-5`}>
            Parcourez les offres disponibles et postulez en quelques clics.
          </p>
          <Link
            to="/offres"
            className={`inline-flex items-center gap-2 px-5 py-2.5 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-sm font-semibold rounded-xl transition-colors`}
          >
            <Briefcase size={15} /> Voir les offres
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {candidatures.map((cand) => (
            <div
              key={cand.id}
              className={`${tw.card} rounded-2xl p-6 hover:shadow-sm transition-all`}
            >
              {/* EN-TÊTE */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-5">
                <div className="flex items-start gap-4">
                  {/* SCORE MATCHING */}
                  {cand.score_matching !== null && cand.score_matching !== undefined ? (
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm ${getScoreColor(cand.score_matching)}`}>
                        <span className="text-[10px] font-semibold uppercase opacity-80">Match</span>
                        <span className="text-base font-bold leading-tight">{Math.round(cand.score_matching)}%</span>
                      </div>
                      <span className="absolute -top-1 -right-1">
                        <TooltipIcon text="Score calculé sur 5 critères : spécialité (25pts), diplôme (20pts), expérience (20pts), région (20pts), compétences (15pts). 80%+ = excellent match." position="right" />
                      </span>
                    </div>
                  ) : (
                    <div className={`w-16 h-16 rounded-xl ${tw.surfaceSubtle} border ${tw.borderBase} flex items-center justify-center text-sm font-medium ${tw.textMuted} shrink-0`}>
                      N/A
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-base font-bold ${tw.textStrong}`}>
                        {cand.offre_titre}
                      </h2>
                      {cand.offre_est_cloturee && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${tw.badgeClosedSolid}`}>
                          <Lock size={10} /> Clôturée
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold ${tw.textPrimary} mt-0.5`}>
                      {cand.entreprise_nom}
                    </p>
                    <p className={`text-sm ${tw.textMuted} mt-1 flex items-center gap-1.5`}>
                      <Calendar size={13} />
                      Postulé le{" "}
                      {new Date(cand.date_postulation).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${getBadgeStyle(cand.statut)}`}>
                  {STATUT_LABELS[cand.statut] || cand.statut}
                </span>
              </div>

              {/* MESSAGE STATUT */}
              <div className={`${tw.surfaceMuted} px-4 py-3 rounded-xl border ${tw.borderSubtle}`}>
                <p className={`text-sm ${tw.textMuted}`}>
                  {getMessageStatut(cand.statut)}
                </p>
              </div>

              {/* ENTRETIEN */}
              {cand.statut === "ENTRETIEN" && cand.date_entretien && (
                <div className={`mt-3 p-4 rounded-lg ${tw.interviewCard}`}>
                  <h4 className={`text-xs font-semibold ${tw.interviewHeading} flex items-center gap-1.5 mb-2`}>
                    <Calendar size={13} /> Convocation à un entretien
                  </h4>
                  <p className={`text-sm font-bold ${tw.interviewDate}`}>
                    {new Date(cand.date_entretien).toLocaleString("fr-FR", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                  {cand.message_entretien && (
                    <div className={`mt-2 px-3 py-2 rounded-lg text-xs italic ${tw.interviewNote}`}>
                      "{cand.message_entretien}"
                    </div>
                  )}
                  <p className={`text-xs font-medium mt-2 ${tw.interviewFootnote}`}>
                    Ces détails vous ont été envoyés par email.
                  </p>
                </div>
              )}
              {cand.details_matching && cand.score_matching !== null && (
                <>
                  <button
                    onClick={() => toggleAnalyse(cand.id)}
                    className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${tw.toggleAnalyseButton}`}
                  >
                    <Sparkles size={13} />
                    {openAnalyse[cand.id]
                      ? "Masquer l'analyse IA"
                      : "Voir l'analyse IA détaillée"}
                    {openAnalyse[cand.id] ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                  {openAnalyse[cand.id] && <AnalyseIA cand={cand} />}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MesCandidatures;
