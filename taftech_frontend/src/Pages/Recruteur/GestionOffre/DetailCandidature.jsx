// Orchestrateur du détail d'une candidature : assemble l'en-tête, la barre d'onglets et l'onglet actif (voir ./detail/).
import React from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../../Services/jobsService";
import { tw } from "../../../theme";
import { apiErrMsg } from "../../../utils/apiErrMsg";
import { reportError } from "../../../utils/errorReporter";
import { EnteteCandidature } from "./detail/EnteteCandidature";
import { BarreOnglets } from "./detail/BarreOnglets";
import { OngletProfil } from "./detail/OngletProfil";
import { OngletAnalyseIA } from "./detail/OngletAnalyseIA";
import { OngletEvaluation } from "./detail/OngletEvaluation";
import { OngletQuestionnaire } from "./detail/OngletQuestionnaire";

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
  quotaAnalyseRecruteur,
  handleAnalyseGroq,
  setModalEval,
  setEvalForm,
  supprimerEvaluation,
  documentsPartages = [],
}) => {
  const candidatData = getCandidatData(selectedCandidature);
  const candidatUserId = selectedCandidature?.candidat?.id;
  // S12 — statuts d'exigences vérifiés localement (pas de refetch complet de la candidature
  // disponible depuis ce composant) ; surchargent l'affichage jusqu'au prochain vrai rechargement.
  const [exigenceOverrides, setExigenceOverrides] = React.useState({});

  const handleVerifierExigence = async (exigenceId, statut) => {
    try {
      await jobsService.mettreAJourReponseExigence(selectedCandidature.id, exigenceId, statut);
      setExigenceOverrides((prev) => ({ ...prev, [exigenceId]: statut }));
      toast.success("Exigence mise à jour.");
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la mise à jour de l'exigence."));
      reportError("ECHEC_VERIFICATION_EXIGENCE", err);
    }
  };

  return (
    <div className={`${tw.card} overflow-hidden`}>
      <EnteteCandidature
        selectedCandidature={selectedCandidature}
        candidatData={candidatData}
        candidatUserId={candidatUserId}
        formatText={formatText}
        handleStatusChange={handleStatusChange}
        handleDownloadBulletin={handleDownloadBulletin}
      />

      <BarreOnglets
        selectedCandidature={selectedCandidature}
        offre={offre}
        candidatData={candidatData}
        candidatUserId={candidatUserId}
        activeDetailTab={activeDetailTab}
        setActiveDetailTab={setActiveDetailTab}
        supprimerCandidature={supprimerCandidature}
        documentsPartages={documentsPartages}
      />

      {activeDetailTab === "profil" && (
        <OngletProfil
          selectedCandidature={selectedCandidature}
          candidatData={candidatData}
          formatText={formatText}
          isPremium={isPremium}
          analyseGroq={analyseGroq}
          setActiveDetailTab={setActiveDetailTab}
          exigenceOverrides={exigenceOverrides}
          handleVerifierExigence={handleVerifierExigence}
        />
      )}

      {activeDetailTab === "ia" && (
        <OngletAnalyseIA
          selectedCandidature={selectedCandidature}
          candidatData={candidatData}
          renderScore={renderScore}
          isPremium={isPremium}
          analyseGroq={analyseGroq}
          loadingGroq={loadingGroq}
          quotaAnalyseRecruteur={quotaAnalyseRecruteur}
          handleAnalyseGroq={handleAnalyseGroq}
        />
      )}

      {activeDetailTab === "evaluation" && (
        <OngletEvaluation
          selectedCandidature={selectedCandidature}
          setModalEval={setModalEval}
          setEvalForm={setEvalForm}
          supprimerEvaluation={supprimerEvaluation}
        />
      )}

      {activeDetailTab === "questionnaire" && offre.questionnaire && (
        <OngletQuestionnaire offre={offre} selectedCandidature={selectedCandidature} />
      )}
    </div>
  );
};
