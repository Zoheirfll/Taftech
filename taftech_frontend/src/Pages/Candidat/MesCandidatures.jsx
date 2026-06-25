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

const getBadgeStyle = (statut) => {
  const styles = {
    RECUE: "bg-amber-50 text-amber-700 border-amber-200",
    EN_COURS: "bg-blue-50 text-blue-700 border-blue-200",
    ENTRETIEN: "bg-orange-50 text-orange-700 border-orange-200",
    RETENU: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REFUSE: "bg-red-50 text-red-700 border-red-200",
  };
  return styles[statut] || "bg-slate-100 text-slate-700";
};

const getScoreColor = (score) => {
  const num = parseFloat(score);
  if (num >= 80) return "bg-emerald-500 text-white";
  if (num >= 60) return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
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
      {[0.25, 0.5, 0.75, 1].map((l, i) => (
        <polygon
          key={i}
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
  const details = cand.details_matching?.scores;
  const points_forts = details?.highlights?.points_forts || [];
  const ecarts = details?.highlights?.ecarts || [];
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} className="text-indigo-500" />
        <span className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">
          Analyse IA
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-6 items-center mb-4">
        <div className="w-full sm:w-1/2">
          <RadarChart details={details} />
        </div>
        <div className="w-full sm:w-1/2 space-y-2.5">
          {CRITERES.map((c) => {
            const pct = Math.round(((details?.[c.key] ?? 0) / c.max) * 100);
            const bar =
              pct >= 80
                ? "bg-emerald-500"
                : pct >= 50
                  ? "bg-amber-500"
                  : "bg-red-400";
            return (
              <div key={c.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-slate-600">{c.label}</span>
                  <span className="text-sm font-bold text-slate-700">{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <p className="text-xs font-bold text-emerald-700 uppercase mb-2">
              ✓ Points forts
            </p>
            {points_forts.map((p, i) => (
              <div key={i} className="flex items-start gap-1.5 mb-1">
                <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-emerald-800">{p}</span>
              </div>
            ))}
          </div>
        )}
        {ecarts.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-700 uppercase mb-2">
              ⚠ Axes d'amélioration
            </p>
            {ecarts.map((e, i) => (
              <div key={i} className="flex items-start gap-1.5 mb-1">
                <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="text-sm text-amber-800">{e}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
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

  const formatText = (text) => {
    if (!text) return "Non spécifié";
    return text
      .replace(/_/g, " ")
      .replace(
        /\w\S*/g,
        (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase(),
      );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Suivi de mes candidatures
        </h1>
        <p className="text-base text-slate-700 mt-1">
          Suivez l'avancement de toutes vos candidatures.
        </p>
      </div>

      <InfoBanner storageKey="mes_candidatures" title="Comprendre les statuts">
        <span className="font-semibold">REÇUE</span> → le recruteur n'a pas encore consulté · <span className="font-semibold">EN COURS</span> → dossier en examen ·{" "}
        <span className="font-semibold">ENTRETIEN</span> → vous êtes invité(e) · <span className="font-semibold">RETENU(E)</span> → félicitations ! · <span className="font-semibold">REFUSÉ(E)</span> → ne vous découragez pas, postulez à d'autres offres.
      </InfoBanner>

      {candidatures.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-14 text-center">
          <Briefcase size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-900">
            Aucune candidature pour l'instant
          </p>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Parcourez les offres disponibles et postulez en quelques clics.
          </p>
          <Link
            to="/offres"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Briefcase size={15} /> Voir les offres
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {candidatures.map((cand) => (
            <div
              key={cand.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-sm transition-all"
            >
              {/* EN-TÊTE */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-5">
                <div className="flex items-start gap-4">
                  {/* SCORE MATCHING */}
                  {cand.score_matching !== null && cand.score_matching !== undefined ? (
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm ${getScoreColor(cand.score_matching)}`}>
                        <span className="text-[10px] font-semibold uppercase opacity-80">Match</span>
                        <span className="text-base font-bold leading-tight">{parseInt(cand.score_matching)}%</span>
                      </div>
                      <span className="absolute -top-1 -right-1">
                        <TooltipIcon text="Score calculé sur 5 critères : spécialité (25pts), diplôme (20pts), expérience (20pts), région (20pts), compétences (15pts). 80%+ = excellent match." position="right" />
                      </span>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
                      N/A
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900">
                        {cand.offre_titre}
                      </h2>
                      {cand.offre_est_cloturee && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-white text-xs font-medium rounded-full">
                          <Lock size={10} /> Clôturée
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-indigo-600 mt-0.5">
                      {cand.entreprise_nom}
                    </p>
                    <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                      <Calendar size={13} />
                      Postulé le{" "}
                      {new Date(cand.date_postulation).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${getBadgeStyle(cand.statut)}`}>
                  {formatText(cand.statut)}
                </span>
              </div>

              {/* MESSAGE STATUT */}
              <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                <p className="text-sm text-slate-600">
                  {getMessageStatut(cand.statut)}
                </p>
              </div>

              {/* ENTRETIEN */}
              {cand.statut === "ENTRETIEN" && cand.date_entretien && (
                <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="text-xs font-semibold text-orange-900 flex items-center gap-1.5 mb-2">
                    <Calendar size={13} /> Convocation à un entretien
                  </h4>
                  <p className="text-sm font-bold text-orange-800">
                    {new Date(cand.date_entretien).toLocaleString("fr-FR", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                  {cand.message_entretien && (
                    <div className="mt-2 px-3 py-2 bg-white/80 rounded-lg border border-orange-100 text-xs italic text-slate-700">
                      "{cand.message_entretien}"
                    </div>
                  )}
                  <p className="text-xs text-orange-700 font-medium mt-2">
                    Ces détails vous ont été envoyés par email.
                  </p>
                </div>
              )}
              {cand.details_matching && cand.score_matching !== null && (
                <>
                  <button
                    onClick={() => toggleAnalyse(cand.id)}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-sm font-semibold transition-colors"
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
