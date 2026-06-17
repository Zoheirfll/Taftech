import React from "react";
import {
  FileText,
  Zap,
  Star,
  MapPin,
  GraduationCap,
  Briefcase,
  Mail,
  Phone,
  Download,
  Trash2,
  Calendar,
  User,
  TrendingUp,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { authService } from "../../../Services/authService";

const CRITERES_RADAR = [
  { key: "specialite", label: "Spécialité", max: 25 },
  { key: "diplome", label: "Diplôme", max: 20 },
  { key: "experience", label: "Expérience", max: 20 },
  { key: "competences", label: "Compétences", max: 15 },
  { key: "region", label: "Région", max: 20 },
];

const RadarChartRecruteur = ({ scores }) => {
  const cx = 90,
    cy = 90,
    R = 62;
  const n = CRITERES_RADAR.length;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const gridPoints = (level) =>
    CRITERES_RADAR.map((_, i) => {
      const a = angle(i);
      return `${cx + R * level * Math.cos(a)},${cy + R * level * Math.sin(a)}`;
    }).join(" ");
  const dataPoints = CRITERES_RADAR.map((c, i) => {
    const norm = Math.min((scores?.[c.key] ?? 0) / c.max, 1);
    const a = angle(i);
    return `${cx + R * norm * Math.cos(a)},${cy + R * norm * Math.sin(a)}`;
  }).join(" ");
  const total = CRITERES_RADAR.reduce(
    (acc, c) => acc + (scores?.[c.key] ?? 0),
    0,
  );
  const color = total >= 80 ? "#059669" : total >= 60 ? "#d97706" : "#dc2626";
  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[160px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map((l, i) => (
        <polygon
          key={i}
          points={gridPoints(l)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="0.8"
        />
      ))}
      {CRITERES_RADAR.map((_, i) => {
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
      {CRITERES_RADAR.map((c, i) => {
        const norm = Math.min((scores?.[c.key] ?? 0) / c.max, 1);
        const a = angle(i);
        return (
          <circle
            key={i}
            cx={cx + R * norm * Math.cos(a)}
            cy={cy + R * norm * Math.sin(a)}
            r="3"
            fill={color}
          />
        );
      })}
      {CRITERES_RADAR.map((c, i) => {
        const pos = {
          x: cx + (R + 16) * Math.cos(angle(i)),
          y: cy + (R + 16) * Math.sin(angle(i)),
        };
        return (
          <text
            key={i}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="600"
            fill="#475569"
          >
            {c.label}
          </text>
        );
      })}
    </svg>
  );
};

const STATUTS_LABELS = {
  RECUE: "Candidature reçue",
  EN_COURS: "En cours d'étude",
  ENTRETIEN: "Entretien programmé",
  RETENU: "Candidat retenu",
  REFUSE: "Candidat refusé",
};
const STATUTS_STYLES = {
  RECUE: "bg-amber-50 text-amber-700 border-amber-200",
  EN_COURS: "bg-blue-50 text-blue-700 border-blue-200",
  ENTRETIEN: "bg-orange-50 text-orange-700 border-orange-200",
  RETENU: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REFUSE: "bg-red-50 text-red-700 border-red-200",
};

export const DetailCandidature = ({
  selectedCandidature,
  offre,
  activeDetailTab,
  setActiveDetailTab,
  getCandidatData,
  getMediaUrl,
  formatText,
  renderScore,
  handleStatusChange,
  handleDownloadBulletin,
  supprimerCandidature,
  isPremium,
  analyseGroq,
  loadingGroq,
  handleAnalyseGroq,
  resumeIA,
  setResumeIA,
  loadingResume,
  handleResumeIA,
  setModalEval,
  setEvalForm,
}) => {
  const candidatData = getCandidatData(selectedCandidature);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* EN-TÊTE */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {candidatData?.photo_profil ? (
              <img
                src={getMediaUrl(candidatData.photo_profil)}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : selectedCandidature.est_rapide ? (
              <Zap size={24} className="text-amber-500" />
            ) : (
              <User size={24} className="text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              {candidatData
                ? `${candidatData.last_name} ${candidatData.first_name}`
                : `${selectedCandidature.nom_rapide} ${selectedCandidature.prenom_rapide}`}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {candidatData?.titre_professionnel ||
                (selectedCandidature.est_rapide
                  ? "Candidature rapide"
                  : "Candidat TafTech")}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {candidatData?.wilaya && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                  <MapPin size={11} />
                  {candidatData.wilaya}
                </span>
              )}
              {candidatData?.diplome && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                  <GraduationCap size={11} />
                  {candidatData.diplome}
                </span>
              )}
            </div>
          </div>
          <select
            value={selectedCandidature.statut}
            onChange={(e) =>
              handleStatusChange(selectedCandidature.id, e.target.value)
            }
            disabled={!authService.peutFaire("UTILISATEUR")}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border outline-none ${authService.peutFaire("UTILISATEUR") ? "cursor-pointer" : "cursor-default opacity-70"} ${STATUTS_STYLES[selectedCandidature.statut]}`}
          >
            {Object.entries(STATUTS_LABELS).map(([key, label]) => (
              <option key={key} value={key} className="bg-white text-slate-900">
                {label}
              </option>
            ))}
          </select>
        </div>

        {selectedCandidature.statut === "ENTRETIEN" &&
          selectedCandidature.date_entretien && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-100">
              <Calendar size={14} className="text-orange-600" />
              <p className="text-xs font-medium text-orange-700">
                Entretien le{" "}
                {new Date(selectedCandidature.date_entretien).toLocaleString(
                  "fr-FR",
                  {
                    day: "2-digit",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </p>
            </div>
          )}

        {selectedCandidature.statut === "RETENU" && (
          <div className="mt-3 flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-800">
              Candidat retenu — Bulletin disponible
            </p>
            <button
              onClick={() => handleDownloadBulletin(selectedCandidature.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Download size={12} /> Télécharger
            </button>
          </div>
        )}
      </div>

      {/* ONGLETS */}
      <div className="flex border-b border-slate-100">
        {[
          "profil",
          "ia",
          "evaluation",
          ...(offre.questionnaire ? ["questionnaire"] : []),
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveDetailTab(tab)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${activeDetailTab === tab ? "border-teal-700 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            {tab === "profil" && "Profil"}
            {tab === "ia" && "Analyse IA"}
            {tab === "evaluation" && "Évaluation"}
            {tab === "questionnaire" && "Questionnaire"}
          </button>
        ))}
        <div className="ml-auto flex items-center px-4 gap-2">
          {candidatData?.cv_pdf && (
            <a
              href={
                candidatData.cv_pdf.startsWith("http")
                  ? candidatData.cv_pdf
                  : `http://127.0.0.1:8000${candidatData.cv_pdf.startsWith("/") ? "" : "/"}${candidatData.cv_pdf}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-800 text-xs font-medium rounded-lg hover:bg-teal-100 transition-colors"
            >
              <FileText size={12} /> CV PDF
            </a>
          )}
          {selectedCandidature.cv_rapide_url && (
            <a
              href={selectedCandidature.cv_rapide_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Zap size={12} /> CV Rapide
            </a>
          )}
          {selectedCandidature.statut === "REFUSE" && authService.peutFaire("UTILISATEUR") && (
            <button
              onClick={() => supprimerCandidature(selectedCandidature.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ONGLET PROFIL */}
      {activeDetailTab === "profil" && (
        <div className="p-6 space-y-6 overflow-y-auto max-h-[500px]">
          {/* Résumé IA */}
          {candidatData && (
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-teal-700" />
                  <span className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
                    Résumé IA
                  </span>
                </div>
                {!loadingResume && !resumeIA && (
                  isPremium ? (
                    <button
                      onClick={handleResumeIA}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors"
                    >
                      <Sparkles size={11} /> Générer
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">🔒 Premium</span>
                  )
                )}
                {resumeIA && (
                  <button
                    onClick={() => setResumeIA(null)}
                    className="text-xs text-teal-400 hover:underline"
                  >
                    Effacer
                  </button>
                )}
              </div>
              {loadingResume ? (
                <div className="flex items-center gap-2 text-teal-700">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-teal-700"></div>
                  <span className="text-xs animate-pulse">
                    Analyse en cours...
                  </span>
                </div>
              ) : resumeIA ? (
                <p className="text-xs text-slate-700 leading-relaxed">
                  {resumeIA
                    .replace(/#{1,3}[A-ZÀ-Ÿ\s]+#{1,3}/g, "")
                    .replace(/\n{2,}/g, " ")
                    .trim()}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Cliquez sur "Générer" pour obtenir un résumé IA.
                </p>
              )}
            </div>
          )}

          {/* Coordonnées */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Coordonnées
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Mail size={14} className="text-slate-400" />
                {candidatData?.email || selectedCandidature.email_rapide}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Phone size={14} className="text-slate-400" />
                {candidatData?.telephone ||
                  selectedCandidature.telephone_rapide ||
                  "Non renseigné"}
              </div>
            </div>
          </div>

          {candidatData?.bio && (
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg italic">
              "{candidatData.bio}"
            </p>
          )}
          {(candidatData?.linkedin || candidatData?.github) && (
            <div className="flex gap-2">
              {candidatData?.linkedin && (
                <a
                  href={candidatData.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-800 text-xs font-semibold rounded-lg hover:bg-teal-100 transition-colors"
                >
                  <ExternalLink size={13} /> LinkedIn
                </a>
              )}
              {candidatData?.github && (
                <a
                  href={candidatData.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <ExternalLink size={13} /> GitHub
                </a>
              )}
            </div>
          )}

          {candidatData ? (
            <>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Préférences
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Secteur",
                      value: formatText(candidatData.secteur_souhaite),
                    },
                    {
                      label: "Prétentions",
                      value: candidatData.salaire_souhaite || "À discuter",
                    },
                    {
                      label: "Mobilité",
                      value: formatText(candidatData.mobilite),
                    },
                    {
                      label: "Situation",
                      value: formatText(candidatData.situation_actuelle),
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="bg-slate-50 p-3 rounded-lg border border-slate-100"
                    >
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        {label}
                      </p>
                      <p className="text-xs font-semibold text-slate-800">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {candidatData.experiences?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Briefcase size={12} /> Expériences
                  </h4>
                  <div className="space-y-3">
                    {candidatData.experiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="pl-4 border-l-2 border-teal-100"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {exp.titre_poste}
                        </p>
                        <p className="text-sm text-teal-700">
                          {exp.entreprise}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar size={10} />
                          {exp.date_debut} — {exp.date_fin || "Aujourd'hui"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidatData.formations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <GraduationCap size={12} /> Formations
                  </h4>
                  <div className="space-y-3">
                    {candidatData.formations.map((form) => (
                      <div
                        key={form.id}
                        className="pl-4 border-l-2 border-slate-200"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {form.diplome || "Diplôme non précisé"}
                        </p>
                        {form.description && (
                          <p className="text-xs text-teal-700 font-medium">
                            {form.description}
                          </p>
                        )}
                        <p className="text-sm text-slate-500">
                          {form.etablissement}
                        </p>
                        {(form.date_debut || form.date_fin) && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {form.date_debut} — {form.date_fin || "En cours"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidatData.competences && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Compétences
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {candidatData.competences
                      .split(",")
                      .filter(Boolean)
                      .map((c, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-teal-50 text-teal-800 text-xs rounded-md"
                        >
                          {c.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 bg-amber-50 rounded-xl border border-amber-100">
              <Zap size={28} className="text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-amber-900">
                Candidature rapide
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Pas de profil TafTech — consultez le CV joint.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ONGLET IA */}
      {activeDetailTab === "ia" && (
        <div className="p-6 overflow-y-auto max-h-[500px]">
          {!candidatData ? (
            <div className="text-center py-8">
              <TrendingUp size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                Analyse IA indisponible pour les candidatures rapides.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                {selectedCandidature.details_matching?.scores && (
                  <div className="flex justify-center py-2">
                    <RadarChartRecruteur
                      scores={selectedCandidature.details_matching.scores}
                    />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Score de matching IA
                  </p>
                  {renderScore(selectedCandidature.score_matching) ? (
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-bold rounded-full border ${renderScore(selectedCandidature.score_matching).style}`}
                    >
                      {renderScore(selectedCandidature.score_matching).label}
                    </span>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Non calculé</p>
                  )}
                </div>
                <TrendingUp size={32} className="text-slate-300" />
              </div>

              {selectedCandidature.details_matching &&
                (() => {
                  const DM = selectedCandidature.details_matching;
                  const scores = DM.scores || DM;
                  const explics = DM.explications || {};
                  return (
                    <div className="space-y-4">
                      {[
                        { key: "specialite", label: "Spécialité", max: 25 },
                        { key: "diplome", label: "Diplôme", max: 20 },
                        { key: "experience", label: "Expérience", max: 20 },
                        { key: "region", label: "Localisation", max: 20 },
                        { key: "competences", label: "Compétences", max: 15 },
                      ].map(({ key, label, max }) => {
                        const val = scores[key] || 0;
                        const pct = (val / max) * 100;
                        const color =
                          pct >= 100
                            ? "bg-emerald-500"
                            : pct >= 50
                              ? "bg-amber-400"
                              : "bg-red-400";
                        return (
                          <div key={key}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-xs font-semibold text-slate-700">
                                {label}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {val}/{max}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div
                                className={`${color} h-1.5 rounded-full transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {explics[key] && (
                              <p className="text-xs text-slate-500 mt-1">
                                {explics[key]}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {DM.highlights && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                          <div>
                            <p className="text-xs font-semibold text-emerald-700 mb-2">
                              Points forts
                            </p>
                            {DM.highlights.points_forts?.length > 0 ? (
                              <ul className="space-y-1.5">
                                {DM.highlights.points_forts.map((pf, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-slate-600 flex items-start gap-1.5"
                                  >
                                    <span className="text-emerald-500 mt-0.5">
                                      •
                                    </span>
                                    {pf}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                Aucun.
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-red-600 mb-2">
                              Écarts détectés
                            </p>
                            {DM.highlights.ecarts?.length > 0 ? (
                              <ul className="space-y-1.5">
                                {DM.highlights.ecarts.map((ec, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-slate-600 flex items-start gap-1.5"
                                  >
                                    <span className="text-red-400 mt-0.5">
                                      •
                                    </span>
                                    {ec}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                Aucun.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Analyse approfondie IA
                  </p>
                  {!loadingGroq && (
                    isPremium ? (
                      <button
                        onClick={handleAnalyseGroq}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors"
                      >
                        <Sparkles size={12} />{" "}
                        {analyseGroq ? "Relancer" : "Analyser avec l'IA"}
                      </button>
                    ) : (
                      <a
                        href="mailto:taftech963@gmail.com?subject=Demande Premium TafTech"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg cursor-not-allowed"
                        title="Fonctionnalité Premium"
                      >
                        🔒 Premium
                      </a>
                    )
                  )}
                </div>
                {loadingGroq ? (
                  <div className="flex items-center gap-2 py-4 text-teal-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-700"></div>
                    <p className="text-xs font-medium animate-pulse">
                      Analyse en cours...
                    </p>
                  </div>
                ) : analyseGroq ? (
                  <div className="space-y-3">
                    {[
                      { id: "VERDICT", label: "Verdict", color: "indigo" },
                      {
                        id: "POINTS FORTS",
                        label: "Points forts",
                        color: "emerald",
                      },
                      {
                        id: "RECOMMANDATION",
                        label: "Recommandation",
                        color: "amber",
                      },
                    ].map(({ id, label, color }) => {
                      const regex = new RegExp(
                        `#{1,3}${id}#{1,3}\\s*([\\s\\S]*?)(?=#{1,3}|$)`,
                        "i",
                      );
                      const match = analyseGroq.match(regex);
                      const content = match ? match[1].trim() : "";
                      if (!content) return null;
                      const colorMap = {
                        indigo:
                          "bg-teal-50 border-teal-100 text-teal-800",
                        emerald:
                          "bg-emerald-50 border-emerald-100 text-emerald-700",
                        amber: "bg-amber-50 border-amber-100 text-amber-700",
                      };
                      return (
                        <div
                          key={id}
                          className={`border rounded-xl p-3 ${colorMap[color].split(" ").slice(0, 2).join(" ")}`}
                        >
                          <p
                            className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${colorMap[color].split(" ")[2]}`}
                          >
                            {label}
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Cliquez sur "Analyser avec l'IA" pour obtenir une analyse
                    approfondie.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ONGLET ÉVALUATION */}
      {activeDetailTab === "evaluation" && (
        <div className="p-6 overflow-y-auto max-h-[500px]">
          {selectedCandidature.note_globale ? (
            <div className="text-center">
              <p className="text-5xl font-bold text-teal-700 tabular-nums mb-1">
                {selectedCandidature.note_globale}
                <span className="text-xl text-slate-400">/20</span>
              </p>
              {selectedCandidature.commentaire_evaluation && (
                <p className="text-sm text-slate-500 italic mt-2">
                  "{selectedCandidature.commentaire_evaluation}"
                </p>
              )}
              <button
                onClick={() => {
                  setEvalForm({
                    note_technique: selectedCandidature.note_technique || 0,
                    note_communication:
                      selectedCandidature.note_communication || 0,
                    note_motivation: selectedCandidature.note_motivation || 0,
                    note_experience: selectedCandidature.note_experience || 0,
                    commentaire_evaluation:
                      selectedCandidature.commentaire_evaluation || "",
                  });
                  setModalEval({
                    isOpen: true,
                    candidature: selectedCandidature,
                  });
                }}
                className="mt-4 text-xs font-medium text-teal-700 hover:underline"
              >
                Modifier la note
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Star size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-1">
                Aucune évaluation
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Notez ce candidat après l'entretien.
              </p>
              {authService.peutFaire("UTILISATEUR") && (
                <button
                  onClick={() => {
                    setEvalForm({
                      note_technique: 0,
                      note_communication: 0,
                      note_motivation: 0,
                      note_experience: 0,
                      commentaire_evaluation: "",
                    });
                    setModalEval({
                      isOpen: true,
                      candidature: selectedCandidature,
                    });
                  }}
                  className="px-4 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors"
                >
                  Évaluer ce candidat
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ONGLET QUESTIONNAIRE */}
      {activeDetailTab === "questionnaire" && offre.questionnaire && (
        <div className="p-6 overflow-y-auto max-h-[500px] space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-4 bg-teal-700 rounded-full" />
            <p className="text-sm font-semibold text-slate-900">
              {offre.questionnaire.titre}
            </p>
          </div>
          {offre.questionnaire.questions?.map((q) => {
            const reponse = selectedCandidature?.reponses?.find(
              (r) => r.question === q.id,
            );
            return (
              <div
                key={q.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {q.texte}
                  {q.requis && <span className="text-red-500 ml-1">*</span>}
                  {q.disqualifiant && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] rounded">
                      Disqualifiant
                    </span>
                  )}
                </p>
                {reponse ? (
                  <p className="text-sm text-slate-800 font-medium">
                    {reponse.reponse || "—"}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    Pas de réponse
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
