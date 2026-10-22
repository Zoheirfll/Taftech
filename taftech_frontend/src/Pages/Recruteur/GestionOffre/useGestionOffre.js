import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jobsService } from "../../../Services/jobsService";
import { recruteurService } from "../../../Services/recruteurService";
import { reportError } from "../../../utils/errorReporter";
import { mediaUrl } from "../../../utils/mediaUrl";
import { confirmToast } from "../../../utils/confirmToast";
import { bloqueLaFonctionIA } from "../../../utils/erreursIA";
import { notifier } from "../../../utils/notifier";

export const useGestionOffre = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [offre, setOffre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [constants, setConstants] = useState({ secteurs: [], diplomes: [], experiences: [], contrats: [] });
  const [selectedCandidature, setSelectedCandidature] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showTop5Only, setShowTop5Only] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [triMode, setTriMode] = useState("score");
  const [isPremium, setIsPremium] = useState(false);
  // Résumé (Profil) et Analyse approfondie (onglet IA) sont fusionnés en une seule action —
  // les deux affichages lisent `analyseGroq`, un seul bouton/quota déclenche la génération
  // (jobs/views/ia.py::AnalyseGroqRecruteurAPIView ne fait qu'un seul appel Groq de toute façon).
  const [analyseGroq, setAnalyseGroq] = useState(null);
  const [loadingGroq, setLoadingGroq] = useState(false);
  const [quotaAnalyseRecruteur, setQuotaAnalyseRecruteur] = useState(null);
  const [documentsPartages, setDocumentsPartages] = useState([]);
  const [activeDetailTab, setActiveDetailTab] = useState("profil");
  const [modalEntretien, setModalEntretien] = useState({
    isOpen: false,
    candId: null,
  });
  const [entretienForm, setEntretienForm] = useState({
    date: "",
    heure: "",
    message: "",
  });
  const [modalEval, setModalEval] = useState({
    isOpen: false,
    candidature: null,
  });
  const [evalForm, setEvalForm] = useState({
    note_technique: 0,
    note_communication: 0,
    note_motivation: 0,
    note_experience: 0,
    commentaire_evaluation: "",
  });

  useEffect(() => {
    const fetchOffre = async () => {
      try {
        const [dashData, constData] = await Promise.all([
          jobsService.getDashboard(),
          jobsService.getConstants().catch(() => ({})),
        ]);
        if (constData) setConstants(constData);
        if (dashData.palier_actif) setIsPremium(true);
        jobsService.getQuotaIA("ANALYSE_RECRUTEUR").then(setQuotaAnalyseRecruteur).catch(() => {});
        const foundOffre = dashData.offres.find((o) => o.id === parseInt(id));
        if (foundOffre) {
          setOffre(foundOffre);
          if (foundOffre.candidatures?.length > 0) {
            const sorted = [...foundOffre.candidatures].sort(
              (a, b) => (b.score_matching || 0) - (a.score_matching || 0),
            );
            setSelectedCandidature(sorted[0]);
          }
        } else {
          notifier.erreur("Offre introuvable");
          navigate("/dashboard");
        }
      } catch (err) {
        notifier.echec("Chargement impossible", err);
        reportError("ECHEC_CHARGEMENT_OFFRE", err);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchOffre();
  }, [id, navigate]);

  useEffect(() => {
    // Persistance de l'analyse IA (backend, `Candidature.derniere_analyse_ia`) — au lieu de
    // repartir de zéro à chaque changement de candidature sélectionnée, on réhydrate l'état
    // local avec la dernière analyse déjà enregistrée. Le bouton associé (DetailCandidature)
    // passe alors sur "Régénérer" plutôt que "Générer"/"Analyser", jusqu'à ce que l'utilisateur
    // relance explicitement un appel — même principe que Suggestions carrière côté candidat.
    setAnalyseGroq(selectedCandidature?.derniere_analyse_ia || null);
    setLoadingGroq(false);
    setDocumentsPartages([]);
    const candidatId = selectedCandidature?.candidat?.id;
    if (!candidatId) return;
    jobsService
      .getDocumentsPartages(candidatId)
      .then(setDocumentsPartages)
      .catch((err) => reportError("ECHEC_DOCUMENTS_PARTAGES", err));
  }, [selectedCandidature?.id]);

  const getMediaUrl = mediaUrl;

  const formatText = (text) => {
    if (!text) return "Non spécifié";
    const allOptions = [
      ...(constants.secteurs || []),
      ...(constants.diplomes || []),
      ...(constants.experiences || []),
      ...(constants.contrats || []),
    ];
    const found = allOptions.find(o => o.value === text);
    if (found) return found.label;
    return text
      .replace(/_/g, " ")
      .replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
  };

  const getCandidatData = (cand) => {
    if (cand?.profil_snapshot) {
      return {
        ...cand.profil_snapshot,
        experiences: cand.profil_snapshot.experiences || [],
        formations: cand.profil_snapshot.formations || [],
        cv_pdf: cand.profil_snapshot.cv_pdf,
        photo_profil: cand.profil_snapshot.photo_profil,
      };
    }
    return cand?.candidat || null;
  };

  const renderScore = (score) => {
    if (score === null || score === undefined) return null;
    const num = parseFloat(score);
    if (num >= 80)
      return {
        label: `${num}% · Recommandé`,
        style: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    if (num >= 60)
      return {
        label: `${num}% · Intéressant`,
        style: "bg-amber-50 text-amber-700 border-amber-200",
      };
    return {
      label: `${num}% · Non adapté`,
      style: "bg-red-50 text-red-700 border-red-200",
    };
  };

  const changerStatut = async (
    candidatureId,
    nouveauStatut,
    extraData = null,
  ) => {
    try {
      const payload = { statut: nouveauStatut };
      let newDate = null,
        newMsg = null;
      if (extraData) {
        newDate = `${extraData.date}T${extraData.heure}`;
        newMsg = extraData.message;
        payload.date_entretien = newDate;
        payload.message_entretien = newMsg;
      }
      await jobsService.updateStatutCandidature(candidatureId, payload);
      const updated = offre.candidatures.map((c) => {
        if (c.id !== candidatureId) return c;
        return {
          ...c,
          statut: nouveauStatut,
          ...(nouveauStatut === "ENTRETIEN" && newDate
            ? { date_entretien: newDate, message_entretien: newMsg }
            : {}),
        };
      });
      setOffre({ ...offre, candidatures: updated });
      if (selectedCandidature?.id === candidatureId) {
        setSelectedCandidature({
          ...selectedCandidature,
          statut: nouveauStatut,
          ...(nouveauStatut === "ENTRETIEN" && newDate
            ? { date_entretien: newDate, message_entretien: newMsg }
            : {}),
        });
      }
      notifier.succes(
        nouveauStatut === "ENTRETIEN" ? "Entretien programmé" : "Statut mis à jour",
        nouveauStatut === "ENTRETIEN" ? "Un e-mail a été envoyé au candidat." : undefined,
      );
    } catch (err) {
      notifier.echec("Mise à jour impossible", err);
      reportError("ECHEC_MISE_A_JOUR_STATUT", err);
    }
  };

  const handleStatusChange = (candId, newStatus) => {
    if (newStatus === "ENTRETIEN") setModalEntretien({ isOpen: true, candId });
    else changerStatut(candId, newStatus);
  };

  const validerEntretien = () => {
    if (!entretienForm.date || !entretienForm.heure)
      return notifier.erreur("Date et heure requises", "Renseignez la date et l'heure de l'entretien.");
    const toastId = notifier.chargement("Envoi en cours");
    changerStatut(modalEntretien.candId, "ENTRETIEN", entretienForm).then(
      () => {
        notifier.fermer(toastId);
        setModalEntretien({ isOpen: false, candId: null });
        setEntretienForm({ date: "", heure: "", message: "" });
      },
    );
  };

  const supprimerCandidature = (candidatureId) => {
    confirmToast("Supprimer définitivement cette candidature ?", async () => {
      try {
        await jobsService.deleteCandidature(candidatureId);
        setOffre({
          ...offre,
          candidatures: offre.candidatures.filter((c) => c.id !== candidatureId),
        });
        if (selectedCandidature?.id === candidatureId)
          setSelectedCandidature(null);
        notifier.succes("Candidature supprimée");
      } catch (err) {
        notifier.echec("Suppression impossible", err);
        reportError("ECHEC_SUPPRESSION_CANDIDATURE", err);
      }
    });
  };

  const handleSetExpiration = async (date) => {
    try {
      const updated = await recruteurService.modifierOffre(offre.id, { date_expiration: date || null });
      setOffre({ ...offre, date_expiration: updated.offre?.date_expiration ?? date });
      notifier.succes(date ? `Expiration fixée au ${new Date(date).toLocaleDateString("fr-FR")}` : "Expiration supprimée");
    } catch (err) {
      notifier.echec("Mise à jour impossible", err);
      reportError("ECHEC_SET_EXPIRATION_OFFRE", err);
    }
  };

  const handleCloturer = () => {
    confirmToast("Voulez-vous clôturer cette offre ?", async () => {
      try {
        await jobsService.cloturerOffre(offre.id);
        setOffre({ ...offre, est_cloturee: true });
        notifier.succes("Offre clôturée");
      } catch (err) {
        notifier.echec("Clôture impossible", err);
        reportError("ECHEC_CLOTURE_OFFRE", err);
      }
    });
  };

  const handleExportExcel = async () => {
    try {
      await jobsService.exporterCandidaturesOffreExcel(
        offre.id,
        offre.titre?.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "offre",
      );
    } catch (err) {
      notifier.echec("Exportation impossible", err);
      reportError("ECHEC_EXPORT_EXCEL_OFFRE", err);
    }
  };

  const soumettreEvaluation = async () => {
    if (
      !evalForm.note_technique ||
      !evalForm.note_communication ||
      !evalForm.note_motivation ||
      !evalForm.note_experience
    ) {
      return notifier.erreur("Notes manquantes", "Renseignez toutes les notes avant d'enregistrer.");
    }
    const toastId = notifier.chargement("Enregistrement en cours");
    try {
      const response = await jobsService.evaluerCandidature(
        modalEval.candidature.id,
        evalForm,
      );
      const updated = response.candidature;
      setOffre({
        ...offre,
        candidatures: offre.candidatures.map((c) =>
          c.id === updated.id ? updated : c,
        ),
      });
      if (selectedCandidature?.id === updated.id)
        setSelectedCandidature(updated);
      notifier.succes("Évaluation enregistrée");
      setModalEval({ isOpen: false, candidature: null });
    } catch (err) {
      notifier.echec("Évaluation impossible", err);
      reportError("ECHEC_EVALUATION_CANDIDAT", err);
    } finally {
      notifier.fermer(toastId);
    }
  };

  const supprimerEvaluation = (candidatureId) => {
    confirmToast("Supprimer définitivement cette évaluation ?", async () => {
      try {
        const response = await recruteurService.supprimerEvaluation(candidatureId);
        const updated = response.candidature;
        setOffre({
          ...offre,
          candidatures: offre.candidatures.map((c) =>
            c.id === updated.id ? updated : c,
          ),
        });
        if (selectedCandidature?.id === updated.id)
          setSelectedCandidature(updated);
        notifier.succes("Évaluation supprimée");
      } catch (err) {
        notifier.echec("Suppression impossible", err);
        reportError("ECHEC_SUPPRIMER_EVALUATION", err);
      }
    });
  };

  const handleDownloadBulletin = async (candidatureId) => {
    const toastId = notifier.chargement("Génération du bulletin PDF en cours");
    try {
      const blob = await jobsService.telechargerBulletin(candidatureId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Bulletin_TAFTECH_${candidatureId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      notifier.succes("Bulletin généré");
    } catch (err) {
      notifier.echec("Génération impossible", err);
      reportError("ECHEC_TELECHARGEMENT_BULLETIN", err);
    } finally {
      notifier.fermer(toastId);
    }
  };

  // Persiste l'analyse (déjà sauvegardée côté backend sur la candidature) dans le state local
  // `offre.candidatures`/`selectedCandidature` — sans ça, revenir sur cette candidature après en
  // avoir sélectionné une autre perdrait le résultat tant que la page n'est pas rechargée.
  const patchAnalyseCandidature = (candidatureId, analyse) => {
    setOffre((prev) => prev && ({
      ...prev,
      candidatures: prev.candidatures.map((c) =>
        c.id === candidatureId ? { ...c, derniere_analyse_ia: analyse } : c,
      ),
    }));
    setSelectedCandidature((prev) =>
      prev?.id === candidatureId ? { ...prev, derniere_analyse_ia: analyse } : prev,
    );
  };

  const handleAnalyseGroq = async () => {
    setLoadingGroq(true);
    try {
      // « Relancer » (une analyse existe déjà) demande une nouvelle analyse : sans cela, le serveur
      // renvoie le résultat stocké quand le profil n'a pas changé et le bouton semblerait inactif.
      const data = await jobsService.getAnalyseGroqRecruteur(
        selectedCandidature.id,
        Boolean(analyseGroq),
      );
      setAnalyseGroq(data.analyse);
      patchAnalyseCandidature(selectedCandidature.id, data.analyse);
      if (data.quota_ia) setQuotaAnalyseRecruteur({ ...data.quota_ia, disponible: true });
    } catch (err) {
      notifier.echec("Service IA indisponible", err);
      reportError("ECHEC_ANALYSE_GROQ_RECRUTEUR", err);
      if (bloqueLaFonctionIA(err.response?.data)) {
        setQuotaAnalyseRecruteur({ ...err.response.data, disponible: false });
      }
    } finally {
      setLoadingGroq(false);
    }
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 2
          ? [...prev, id]
          : prev,
    );
  };

  const getCandidaturesTriees = () => {
    let list = [...offre.candidatures].sort((a, b) => {
      if (triMode === "score")
        return (b.score_matching || 0) - (a.score_matching || 0);
      return new Date(b.date_postulation) - new Date(a.date_postulation);
    });
    if (showTop5Only) {
      list = list
        .filter((c) => !c.est_rapide && c.score_matching !== null)
        .slice(0, 5);
    }
    return list;
  };

  return {
    // State
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
    analyseGroq,
    loadingGroq,
    quotaAnalyseRecruteur,
    documentsPartages,
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
    // Computed
    candidaturesTriees: offre ? getCandidaturesTriees() : [],
    // Helpers
    getMediaUrl,
    formatText,
    getCandidatData,
    renderScore,
    // Handlers
    handleStatusChange,
    validerEntretien,
    supprimerCandidature,
    handleCloturer,
    handleExportExcel,
    handleSetExpiration,
    soumettreEvaluation,
    supprimerEvaluation,
    handleDownloadBulletin,
    isPremium,
    handleAnalyseGroq,
    toggleCompare,
  };
};
