import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { notifier } from "../../utils/notifier";
import { reportError } from "../../utils/errorReporter";
import { Search, X, HelpCircle, FileText } from "lucide-react";
import { tw } from "../../theme";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { TooltipIcon } from "../../Components/Tooltip";
import SortableTh from "../../Components/SortableTh";
import { mediaUrl } from "../../utils/mediaUrl";
import { criteresNonDemandes } from "../../utils/criteresMatching";
import AdminPageHeader from "../../Components/AdminPageHeader";
import BoutonExportExcel from "../../Components/BoutonExportExcel";
import { AdminVide } from "../../Components/AdminEtat";
import AdminPagination from "../../Components/AdminPagination";
import { ADMIN_PAGE_SIZE } from "../../Services/adminService";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const STATUT_LABELS = {
  RECUE: "Reçue",
  EN_COURS: "En cours",
  PRESELECTION: "Présélection",
  ENTRETIEN: "Entretien",
  RETENU: "Retenu(e)",
  REFUSE: "Refusé(e)",
};

const EXIGENCE_LABELS = { SATISFAIT: "Satisfait", NON_SATISFAIT: "Non satisfait", INCONNU: "À vérifier" };

const CRITERES_SCORE = [
  { key: "specialite", label: "Spécialité", max: 25 },
  { key: "diplome", label: "Diplôme", max: 20 },
  { key: "experience", label: "Expérience", max: 20 },
  { key: "region", label: "Localisation & mobilité", max: 20 },
  { key: "competences", label: "Compétences", max: 15 },
];
const CRITERES_LABELS = Object.fromEntries(CRITERES_SCORE.map((c) => [c.key, c.label]));

const getBadgeStyle = (statut) => {
  const styles = {
    RECUE: `${tw.bgWarningSoft} ${tw.textWarning} ${tw.borderWarning}`,
    EN_COURS: `${tw.bgBlueSoft} ${tw.textBlue} ${tw.borderBlue}`,
    PRESELECTION: `${tw.bgPurpleSoft} ${tw.textPurple} ${tw.borderPurple}`,
    ENTRETIEN: `${tw.bgOrangeSoft} ${tw.textOrange} ${tw.borderOrange}`,
    RETENU: `${tw.bgSuccessSoft} ${tw.textSuccess} ${tw.borderSuccess}`,
    REFUSE: `${tw.bgErrorSoft} ${tw.textError} ${tw.borderError}`,
  };
  return styles[statut] || `${tw.badgeNeutral}`;
};

const AdminCandidatures = () => {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statutFiltre, setStatutFiltre] = useState("");
  const [ordering, setOrdering] = useState("-date_postulation");
  const [selectedCand, setSelectedCand] = useState(null);

  const fetchCandidatures = async (currentPage = 1, search = "", statut = statutFiltre, order = ordering) => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminCandidatures(currentPage, search, statut, order);
      setCandidatures(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / ADMIN_PAGE_SIZE) || 1);
    } catch (err) {
      notifier.echec("Chargement impossible", err);
      reportError("ECHEC_CHARGEMENT_CANDIDATURES_ADMIN", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatures(page, searchTerm, statutFiltre, ordering);
  }, [page, statutFiltre, ordering]); // eslint-disable-line

  const handleSort = (field) => {
    setOrdering((prev) => (prev === field ? `-${field}` : prev === `-${field}` ? field : `-${field}`));
    setPage(1);
  };

  const fermerFiche = React.useCallback(() => setSelectedCand(null), []);
  useEchapPourFermer(!!selectedCand, fermerFiche);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCandidatures(1, searchTerm, statutFiltre);
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={FileText}
        color="amber"
        title="Candidatures globales"
        subtitle="Vue d'ensemble de tous les recrutements de la plateforme."
        aideKey="candidatures"
        aide={[
          "Lecture seule : le statut d'une candidature est géré par le recruteur, pas par l'administration.",
          "Cliquez sur une ligne (ou Entrée au clavier) pour voir le détail : explication du score IA, réponses au questionnaire, exigences, lettre/CV et évaluation d'entretien.",
          "« ⚡ Rapide » = candidature sans compte TafTech (pas de score IA possible, pas de profil).",
          "La recherche porte sur le nom du candidat, le titre de l'offre et l'entreprise ; validez avec Entrée ou « Chercher ».",
        ]}
        actions={
          <BoutonExportExcel
            ressource="candidatures"
            params={{ search: searchTerm, statut: statutFiltre, ordering }}
            nomFichier="candidatures_taftech"
          />
        }
      />

      <div className={`${tw.card} p-4`}>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`}
            />
            <input
              type="text"
              placeholder="Candidat, offre, entreprise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Rechercher une candidature"
              className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`}
            />
          </div>
          <select
            value={statutFiltre}
            onChange={(e) => { setStatutFiltre(e.target.value); setPage(1); }}
            aria-label="Filtrer par statut"
            className={`${tw.inputColorsMuted} rounded-lg text-sm px-3 py-2.5`}
          >
            <option value="">Tous statuts</option>
            <option value="RECUE">Reçue</option>
            <option value="EN_COURS">En cours</option>
            <option value="PRESELECTION">Présélection</option>
            <option value="ENTRETIEN">Entretien</option>
            <option value="RETENU">Retenu</option>
            <option value="REFUSE">Refusé</option>
          </select>
          <button
            type="submit"
            className={`px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}
          >
            Chercher
          </button>
        </form>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className={`${tw.surfaceMuted} border-b ${tw.borderSubtle} text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <SortableTh field="date_postulation" label="Date & ID" ordering={ordering} onSort={handleSort} className="px-4 py-3" />
                <th className="px-4 py-3 text-left">Candidat</th>
                <th className="px-4 py-3 text-left">Offre & Entreprise</th>
                <SortableTh
                  field="score_matching"
                  label={<span className="inline-flex items-center gap-1">Score IA <TooltipIcon text="Score de compatibilité calculé automatiquement (localisation, diplôme, spécialité de formation, expérience, compétences — seuls les critères demandés par l'offre comptent). Absent pour les candidatures rapides (sans profil)." /></span>}
                  ordering={ordering}
                  onSort={handleSort}
                  className="px-4 py-3"
                  align="center"
                />
                <th className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    Note entretien <TooltipIcon text="Note /20 donnée par le recruteur après entretien (moyenne de 4 critères : technique, communication, motivation, expérience)." />
                  </span>
                </th>
                <th className="px-4 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={6} />
              ) : candidatures.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <AdminVide
                      icon={FileText}
                      titre="Aucune candidature trouvée."
                      texte={searchTerm || statutFiltre ? "Modifiez la recherche ou le filtre de statut." : undefined}
                    />
                  </td>
                </tr>
              ) : (
                candidatures.map((cand) => (
                  <tr
                    key={cand.id}
                    onClick={() => setSelectedCand(cand)}
                    onKeyDown={(e) => { if (e.key === "Enter") setSelectedCand(cand); }}
                    tabIndex={0}
                    aria-label={`Voir le détail de la candidature #${cand.id}`}
                    className={`${tw.rowHover} cursor-pointer ${tw.focusRing}`}
                  >
                    <td className="px-4 py-3">
                      <p className={`text-xs font-semibold ${tw.textStrong}`}>
                        {new Date(cand.date_postulation).toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                      <p className={`text-[10px] ${tw.textMuted}`}>#{cand.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-semibold ${tw.textStrong}`}>
                        {cand.candidat
                          ? `${cand.candidat.last_name} ${cand.candidat.first_name}`
                          : `${cand.nom_rapide} ${cand.prenom_rapide}`}
                      </p>
                      <p className={`text-xs ${tw.textPrimary} font-medium`}>
                        {cand.est_rapide ? "⚡ Rapide" : "Compte TAFTECH"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {cand.offre_id ? (
                        <Link
                          to={`/jobs/${cand.offre_id}`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className={`text-sm font-semibold ${tw.textStrong} hover:underline truncate max-w-[200px] block`}
                        >
                          {cand.offre_titre}
                        </Link>
                      ) : (
                        <p className={`text-sm font-semibold ${tw.textStrong} truncate max-w-[200px]`}>
                          {cand.offre_titre}
                        </p>
                      )}
                      {cand.entreprise_slug ? (
                        <Link
                          to={`/entreprise/${cand.entreprise_slug}`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs ${tw.textPrimary} hover:underline`}
                        >
                          {cand.entreprise_nom}
                        </Link>
                      ) : (
                        <p className={`text-xs ${tw.textMuted700}`}>
                          {cand.entreprise_nom}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cand.est_rapide || cand.score_matching == null ? (
                        <span className={`text-xs ${tw.textMuted}`}>—</span>
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            parseFloat(cand.score_matching) >= 70 ? tw.scoreHigh : parseFloat(cand.score_matching) >= 40 ? tw.scoreMid : tw.scoreLow
                          }`}
                        >
                          {cand.score_matching}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cand.note_globale ? (
                        <span className={`px-2.5 py-1 ${tw.bgVioletSoft} ${tw.textViolet} border ${tw.borderViolet} text-xs font-semibold rounded-full`}>
                          ⭐ {cand.note_globale}/20
                        </span>
                      ) : (
                        <span className={`text-xs ${tw.textMuted} italic`}>
                          Non évalué
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${getBadgeStyle(cand.statut)}`}
                      >
                        {STATUT_LABELS[cand.statut] || cand.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} onChange={setPage} disabled={loading} />
      </div>

      {selectedCand && (
        <div className={tw.modalOverlay + " p-4"} onClick={fermerFiche}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Détail de la candidature"
            className={`${tw.surface} rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex justify-between items-start mb-5 pb-4 border-b ${tw.borderSubtle}`}>
              <div>
                <h2 className={`text-lg font-bold ${tw.textStrong}`}>
                  {selectedCand.candidat
                    ? `${selectedCand.candidat.last_name} ${selectedCand.candidat.first_name}`
                    : `${selectedCand.nom_rapide} ${selectedCand.prenom_rapide}`}
                </h2>
                <p className={`text-sm ${tw.textPrimary} mt-0.5`}>
                  {selectedCand.est_rapide ? selectedCand.email_rapide : selectedCand.candidat?.email}
                  {(selectedCand.est_rapide ? selectedCand.telephone_rapide : selectedCand.candidat?.telephone) &&
                    ` · ${selectedCand.est_rapide ? selectedCand.telephone_rapide : selectedCand.candidat.telephone}`}
                </p>
                <p className={`text-xs ${tw.textMuted700} mt-1`}>
                  Candidature à <strong>{selectedCand.offre_titre}</strong> — {selectedCand.entreprise_nom}
                  {" · "}
                  {new Date(selectedCand.date_postulation).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <button onClick={fermerFiche} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}>
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${getBadgeStyle(selectedCand.statut)}`}>
                {STATUT_LABELS[selectedCand.statut] || selectedCand.statut}
              </span>
              {selectedCand.note_globale && (
                <span className={`px-2.5 py-1 ${tw.bgVioletSoft} ${tw.textViolet} border ${tw.borderViolet} text-xs font-semibold rounded-full`}>
                  ⭐ {selectedCand.note_globale}/20
                </span>
              )}
              {!selectedCand.est_rapide && selectedCand.score_matching != null && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tw.badgeNeutral}`}>
                  Score IA : {selectedCand.score_matching}%
                </span>
              )}
            </div>

            {/* POURQUOI CE SCORE */}
            {selectedCand.details_matching &&
              (() => {
                const DM = selectedCand.details_matching;
                const scores = DM.scores || DM;
                const explics = DM.explications || {};
                return (
                  <div className={`${tw.card} p-4 mb-4 space-y-3`}>
                    <div className="flex items-center gap-2">
                      <HelpCircle size={14} className={tw.textTeal} />
                      <span className={`text-xs font-bold ${tw.textStrong} uppercase tracking-wide`}>Pourquoi ce score ?</span>
                    </div>
                    {typeof DM.completude === "number" && DM.completude < 1 && (
                      <p className={`text-xs ${tw.textMuted700}`}>
                        Score calculé sur des informations incomplètes ({Math.round(DM.completude * 100)}% des critères
                        évalués — {(DM.criteres_manquants || []).map((c) => CRITERES_LABELS[c] || c).join(", ")} non renseigné(s).
                      </p>
                    )}
                    {CRITERES_SCORE.map(({ key, label, max }) => {
                      const nonDemande = criteresNonDemandes(DM, CRITERES_SCORE.map((c) => c.key)).includes(key);
                      const val = scores[key] || 0;
                      const pct = Math.min(100, (val / max) * 100);
                      return (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs font-semibold ${tw.textMuted700}`}>{label}</span>
                            <span className={`text-xs font-bold ${tw.textStrong}`}>{nonDemande ? "Non demandé" : `${val}/${max}`}</span>
                          </div>
                          {!nonDemande && (
                            <div className={`w-full ${tw.progressTrack}`}>
                              <div
                                className={pct >= 100 ? tw.progressBarSuccess : pct >= 50 ? tw.progressBarWarning : tw.progressBarDanger}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                          {explics[key] && <p className={`text-xs ${tw.textMuted700} mt-1`}>{explics[key]}</p>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            {/* QUESTIONNAIRE */}
            {selectedCand.offre_questionnaire && selectedCand.reponses?.length > 0 && (
              <div className={`${tw.card} p-4 mb-4`}>
                <p className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wide mb-3`}>
                  Questionnaire — {selectedCand.offre_questionnaire.titre}
                </p>
                <div className="space-y-2">
                  {selectedCand.offre_questionnaire.questions?.map((q) => {
                    const reponse = selectedCand.reponses.find((r) => r.question === q.id);
                    return (
                      <div key={q.id} className={`${tw.surfaceMuted} border ${tw.borderBase} rounded-lg p-3`}>
                        <p className={`text-xs font-semibold ${tw.textSlate800}`}>{q.texte}</p>
                        <p className={`text-sm ${tw.textMuted700} mt-1`}>{reponse?.reponse || "—"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* EXIGENCES IMPÉRATIVES */}
            {selectedCand.reponses_exigences?.length > 0 && (
              <div className={`${tw.card} p-4 mb-4`}>
                <p className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wide mb-3`}>Exigences impératives</p>
                <div className="space-y-1.5">
                  {selectedCand.reponses_exigences.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className={tw.textSlate800}>{r.exigence_label}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          r.statut === "SATISFAIT" ? tw.bgSuccessSoft + " " + tw.textSuccess
                          : r.statut === "NON_SATISFAIT" ? tw.bgErrorSoft + " " + tw.textError
                          : tw.badgeNeutral
                        }`}
                      >
                        {EXIGENCE_LABELS[r.statut] || r.statut}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LETTRE / CV */}
            {(selectedCand.lettre_motivation || selectedCand.lettre_motivation_file || selectedCand.cv_rapide_url) && (
              <div className={`${tw.card} p-4 mb-4`}>
                <p className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wide mb-2`}>Lettre de motivation / CV</p>
                {selectedCand.lettre_motivation && (
                  <p className={`text-sm ${tw.textMuted700} whitespace-pre-line mb-2`}>{selectedCand.lettre_motivation}</p>
                )}
                <div className="flex gap-3">
                  {selectedCand.lettre_motivation_file && (
                    <a href={mediaUrl(selectedCand.lettre_motivation_file)} target="_blank" rel="noopener noreferrer" className={`text-xs ${tw.textPrimary} hover:underline font-medium`}>
                      📎 Fichier joint
                    </a>
                  )}
                  {selectedCand.cv_rapide_url && (
                    <a href={mediaUrl(selectedCand.cv_rapide_url)} target="_blank" rel="noopener noreferrer" className={`text-xs ${tw.textPrimary} hover:underline font-medium`}>
                      📄 CV
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ÉVALUATION */}
            {selectedCand.note_globale && (
              <div className={`${tw.card} p-4`}>
                <p className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wide mb-3`}>Évaluation d'entretien</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "Technique", val: selectedCand.note_technique },
                    { label: "Communication", val: selectedCand.note_communication },
                    { label: "Motivation", val: selectedCand.note_motivation },
                    { label: "Expérience", val: selectedCand.note_experience },
                  ].map(({ label, val }) => (
                    <div key={label} className={`${tw.surfaceMuted} p-2 rounded-lg text-center border ${tw.borderSubtle}`}>
                      <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase`}>{label}</p>
                      <p className={`text-sm font-bold ${tw.textStrong} mt-0.5`}>{val ?? "—"}/5</p>
                    </div>
                  ))}
                </div>
                {selectedCand.commentaire_evaluation && (
                  <p className={`text-sm ${tw.textMuted700} whitespace-pre-line`}>{selectedCand.commentaire_evaluation}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCandidatures;
