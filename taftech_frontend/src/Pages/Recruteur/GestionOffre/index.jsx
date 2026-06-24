import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  User,
  Zap,
  Eye,
} from "lucide-react";
import { useGestionOffre } from "./useGestionOffre";
import { DetailCandidature } from "./DetailCandidature";
import { Modals } from "./Modals";
import { authService } from "../../../Services/authService";
import toast from "react-hot-toast";

const STATUTS_DOTS = {
  RECUE: "bg-amber-500",
  EN_COURS: "bg-blue-500",
  ENTRETIEN: "bg-orange-500",
  RETENU: "bg-emerald-500",
  REFUSE: "bg-red-500",
};

const GestionOffre = () => {
  const navigate = useNavigate();
  const hook = useGestionOffre();
  const {
    offre,
    loading,
    selectedCandidature,
    setSelectedCandidature,
    showJobDetails,
    setShowJobDetails,
    showTop5Only,
    setShowTop5Only,
    compareIds,
    setCompareIds,
    showCompare,
    setShowCompare,
    triMode,
    setTriMode,
    isPremium,
    analyseGroq,
    loadingGroq,
    resumeIA,
    setResumeIA,
    loadingResume,
    activeDetailTab,
    setActiveDetailTab,
    modalEntretien,
    setModalEntretien,
    entretienForm,
    setEntretienForm,
    modalEval,
    setModalEval,
    evalForm,
    setEvalForm,
    candidaturesTriees,
    getMediaUrl,
    formatText,
    getCandidatData,
    renderScore,
    handleStatusChange,
    validerEntretien,
    supprimerCandidature,
    handleCloturer,
    handleSetExpiration,
    soumettreEvaluation,
    handleDownloadBulletin,
    handleAnalyseGroq,
    handleResumeIA,
    toggleCompare,
  } = hook;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
      </div>
    );

  if (!offre) return null;

  return (
    <div className="bg-slate-100 min-h-screen">
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* BREADCRUMB */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Retour au tableau de bord
      </button>

      {/* HEADER OFFRE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-900">{offre.titre}</h1>
            {offre.est_cloturee ? (
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                Archivée
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                Ouverte
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Publiée le {new Date(offre.date_publication).toLocaleDateString("fr-FR")} · {offre.candidatures.length} candidature{offre.candidatures.length > 1 ? "s" : ""}
          </p>
          {!offre.est_cloturee && (
            <div className="flex items-center gap-2 mt-1">
              {offre.date_expiration && (() => {
                const jours = Math.max(0, Math.ceil((new Date(offre.date_expiration) - new Date()) / 86400000));
                return (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${jours <= 7 ? "bg-red-50 text-red-600" : jours <= 30 ? "bg-amber-50 text-amber-700" : jours <= 60 ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600"}`}>
                    ⏱ {jours === 0 ? "Expire aujourd'hui" : `Expire dans ${jours}j`}
                  </span>
                );
              })()}
              <input
                type="date"
                value={offre.date_expiration || ""}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => handleSetExpiration(e.target.value || null)}
                className="text-xs px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 focus:outline-none focus:border-teal-500"
                title="Définir la date d'expiration"
              />
              {offre.date_expiration && (
                <button onClick={() => handleSetExpiration(null)} className="text-xs text-slate-400 hover:text-red-500 transition-colors" title="Supprimer l'expiration">✕</button>
              )}
            </div>
          )}
        </div>
        {!offre.est_cloturee && authService.peutFaire("UTILISATEUR") && (
          <button
            onClick={handleCloturer}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Lock size={14} /> Clôturer l'offre
          </button>
        )}
      </div>

      {/* DÉTAILS OFFRE ACCORDÉON */}
      <div className="bg-white border border-slate-200 rounded-2xl mb-6 overflow-hidden">
        <button
          onClick={() => setShowJobDetails(!showJobDetails)}
          className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-slate-50 transition-colors"
        >
          <span className="text-sm font-semibold text-slate-700">
            Détails de l'offre
          </span>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
              {formatText(offre.type_contrat)}
            </span>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
              {offre.wilaya}
            </span>
            {showJobDetails ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </div>
        </button>
        {showJobDetails && (
          <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              {offre.description && (
                <div>
                  <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {offre.description}
                  </p>
                </div>
              )}
              {offre.missions && (
                <div>
                  <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">
                    Missions
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {offre.missions}
                  </p>
                </div>
              )}
              {offre.profil_recherche && (
                <div>
                  <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">
                    Profil recherché
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {offre.profil_recherche}
                  </p>
                </div>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 h-fit space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
                Critères
              </h4>
              {[
                {
                  label: "Localisation",
                  value: `${offre.wilaya}${offre.commune ? ` · ${offre.commune}` : ""}`,
                },
                { label: "Spécialité", value: formatText(offre.specialite) },
                {
                  label: "Diplôme requis",
                  value: formatText(offre.diplome) || "Non exigé",
                },
                {
                  label: "Expérience",
                  value: formatText(offre.experience_requise),
                },
                {
                  label: "Salaire",
                  value: offre.salaire_propose || "À discuter",
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SPLIT VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LISTE CANDIDATS */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Candidatures ({offre.candidatures.length})
                </p>
                {showTop5Only && (
                  <p className="text-xs text-teal-700 font-medium">
                    Shortlist IA · Top 5
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setTriMode(triMode === "score" ? "date" : "score")
                  }
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  {triMode === "score" ? (
                    <>
                      <Sparkles size={11} /> Score
                    </>
                  ) : (
                    <>
                      <Calendar size={11} /> Date
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowTop5Only(!showTop5Only);
                    if (!showTop5Only) toast?.success("Shortlist IA activée !");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${showTop5Only ? "bg-teal-700 text-white border-teal-700" : "bg-white text-teal-700 border-teal-200 hover:bg-teal-50"}`}
                >
                  <Sparkles size={12} /> Top 5
                </button>
                {compareIds.length === 2 && (
                  <button
                    onClick={() => setShowCompare(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors"
                  >
                    Comparer
                  </button>
                )}
              </div>
            </div>

            {candidaturesTriees.length === 0 ? (
              <div className="p-12 text-center">
                <User size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Aucun candidat</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {candidaturesTriees.map((cand) => {
                  const isSelected = selectedCandidature?.id === cand.id;
                  const candidatData = getCandidatData(cand);
                  const nomComplet = candidatData
                    ? `${candidatData.last_name} ${candidatData.first_name}`
                    : `${cand.nom_rapide} ${cand.prenom_rapide}`;
                  const titre = candidatData
                    ? candidatData.titre_professionnel || "Candidat TafTech"
                    : "Candidature rapide";
                  return (
                    <div key={cand.id}>
                      <button
                        onClick={() => setSelectedCandidature(cand)}
                        className={`w-full text-left px-4 py-3.5 transition-colors ${isSelected ? "bg-teal-50" : "hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {cand.candidat?.photo_profil ? (
                              <img
                                src={getMediaUrl(cand.candidat.photo_profil)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : cand.est_rapide ? (
                              <Zap size={14} className="text-amber-500" />
                            ) : (
                              <User size={14} className="text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {nomComplet}
                              </p>
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUTS_DOTS[cand.statut]}`}
                              />
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {titre}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(
                                cand.date_postulation,
                              ).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            {cand.score_matching !== null &&
                              cand.score_matching !== undefined && (
                                <div className="mt-1.5">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span
                                      className={`text-[10px] font-bold ${parseFloat(cand.score_matching) >= 80 ? "text-emerald-600" : parseFloat(cand.score_matching) >= 60 ? "text-amber-600" : "text-red-500"}`}
                                    >
                                      {parseFloat(cand.score_matching)}%
                                    </span>
                                    <span className="text-[9px] text-slate-400">
                                      {parseFloat(cand.score_matching) >= 80
                                        ? "Recommandé"
                                        : parseFloat(cand.score_matching) >= 60
                                          ? "Intéressant"
                                          : "Non adapté"}
                                    </span>
                                  </div>
                                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${parseFloat(cand.score_matching) >= 80 ? "bg-emerald-500" : parseFloat(cand.score_matching) >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                      style={{
                                        width: `${parseFloat(cand.score_matching)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </button>
                      <div className="px-4 pb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompare(cand.id);
                          }}
                          className={`w-full py-1 text-[10px] font-semibold rounded-md transition-colors ${compareIds.includes(cand.id) ? "bg-teal-100 text-teal-800" : "bg-slate-50 text-slate-400 hover:text-teal-700"}`}
                        >
                          {compareIds.includes(cand.id)
                            ? "✓ Sélectionné"
                            : "Comparer"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* DÉTAIL CANDIDATURE */}
        <div className="lg:col-span-3">
          {selectedCandidature ? (
            <DetailCandidature
              selectedCandidature={selectedCandidature}
              offre={offre}
              activeDetailTab={activeDetailTab}
              setActiveDetailTab={setActiveDetailTab}
              getCandidatData={getCandidatData}
              getMediaUrl={getMediaUrl}
              formatText={formatText}
              renderScore={renderScore}
              handleStatusChange={handleStatusChange}
              handleDownloadBulletin={handleDownloadBulletin}
              supprimerCandidature={supprimerCandidature}
              isPremium={isPremium}
              analyseGroq={analyseGroq}
              loadingGroq={loadingGroq}
              handleAnalyseGroq={handleAnalyseGroq}
              resumeIA={resumeIA}
              setResumeIA={setResumeIA}
              loadingResume={loadingResume}
              handleResumeIA={handleResumeIA}
              setModalEval={setModalEval}
              setEvalForm={setEvalForm}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Eye size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">
                Sélectionnez un candidat
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Cliquez sur un profil à gauche pour voir son dossier
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <Modals
        offre={offre}
        getCandidatData={getCandidatData}
        modalEntretien={modalEntretien}
        setModalEntretien={setModalEntretien}
        entretienForm={entretienForm}
        setEntretienForm={setEntretienForm}
        validerEntretien={validerEntretien}
        modalEval={modalEval}
        setModalEval={setModalEval}
        evalForm={evalForm}
        setEvalForm={setEvalForm}
        soumettreEvaluation={soumettreEvaluation}
        showCompare={showCompare}
        setShowCompare={setShowCompare}
        compareIds={compareIds}
        setCompareIds={setCompareIds}
      />
    </div>
    </div>
  );
};

export default GestionOffre;
