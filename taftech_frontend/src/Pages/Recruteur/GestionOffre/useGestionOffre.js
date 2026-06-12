import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jobsService } from "../../../Services/jobsService";
import { reportError } from "../../../utils/errorReporter";
import toast from "react-hot-toast";

export const useGestionOffre = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [offre, setOffre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidature, setSelectedCandidature] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showTop5Only, setShowTop5Only] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [triMode, setTriMode] = useState("score");
  const [isPremium, setIsPremium] = useState(false);
  const [analyseGroq, setAnalyseGroq] = useState(null);
  const [loadingGroq, setLoadingGroq] = useState(false);
  const [resumeIA, setResumeIA] = useState(null);
  const [loadingResume, setLoadingResume] = useState(false);
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
        const dashData = await jobsService.getDashboard();
        if (dashData.est_premium) setIsPremium(true);
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
          toast.error("Offre introuvable.");
          navigate("/dashboard");
        }
      } catch (err) {
        toast.error("Erreur de chargement.");
        reportError("ECHEC_CHARGEMENT_OFFRE", err);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchOffre();
  }, [id, navigate]);

  useEffect(() => {
    setAnalyseGroq(null);
    setLoadingGroq(false);
    setResumeIA(null);
    setLoadingResume(false);
  }, [selectedCandidature?.id]);

  const getMediaUrl = (path) =>
    path
      ? path.startsWith("http")
        ? path
        : `http://127.0.0.1:8000${path}`
      : null;

  const formatText = (text) =>
    text
      ? text
          .replace(/_/g, " ")
          .replace(
            /\w\S*/g,
            (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase(),
          )
      : "Non spécifié";

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
      toast.success(
        nouveauStatut === "ENTRETIEN"
          ? "Entretien programmé et email envoyé !"
          : "Statut mis à jour.",
      );
    } catch (err) {
      toast.error("Erreur lors de la mise à jour.");
      reportError("ECHEC_MISE_A_JOUR_STATUT", err);
    }
  };

  const handleStatusChange = (candId, newStatus) => {
    if (newStatus === "ENTRETIEN") setModalEntretien({ isOpen: true, candId });
    else changerStatut(candId, newStatus);
  };

  const validerEntretien = () => {
    if (!entretienForm.date || !entretienForm.heure)
      return toast.error("Date et heure requises.");
    const toastId = toast.loading("Envoi en cours...");
    changerStatut(modalEntretien.candId, "ENTRETIEN", entretienForm).then(
      () => {
        toast.dismiss(toastId);
        setModalEntretien({ isOpen: false, candId: null });
        setEntretienForm({ date: "", heure: "", message: "" });
      },
    );
  };

  const supprimerCandidature = async (candidatureId) => {
    if (!window.confirm("Supprimer définitivement cette candidature ?")) return;
    try {
      await jobsService.deleteCandidature(candidatureId);
      setOffre({
        ...offre,
        candidatures: offre.candidatures.filter((c) => c.id !== candidatureId),
      });
      if (selectedCandidature?.id === candidatureId)
        setSelectedCandidature(null);
      toast.success("Candidature supprimée.");
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
      reportError("ECHEC_SUPPRESSION_CANDIDATURE", err);
    }
  };

  const handleCloturer = async () => {
    if (!window.confirm("Voulez-vous clôturer cette offre ?")) return;
    try {
      await jobsService.cloturerOffre(offre.id);
      setOffre({ ...offre, est_cloturee: true });
      toast.success("Offre clôturée !");
    } catch (err) {
      toast.error("Erreur lors de la clôture.");
      reportError("ECHEC_CLOTURE_OFFRE", err);
    }
  };

  const soumettreEvaluation = async () => {
    if (
      !evalForm.note_technique ||
      !evalForm.note_communication ||
      !evalForm.note_motivation ||
      !evalForm.note_experience
    ) {
      return toast.error("Veuillez remplir toutes les notes.");
    }
    const toastId = toast.loading("Enregistrement...");
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
      toast.success("Évaluation sauvegardée !");
      setModalEval({ isOpen: false, candidature: null });
    } catch (err) {
      toast.error("Erreur lors de l'évaluation.");
      reportError("ECHEC_EVALUATION_CANDIDAT", err);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleDownloadBulletin = async (candidatureId) => {
    const toastId = toast.loading("Génération du bulletin PDF...");
    try {
      const blob = await jobsService.telechargerBulletin(candidatureId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Bulletin_TafTech_${candidatureId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Bulletin généré !");
    } catch (err) {
      toast.error("Erreur lors de la génération.");
      reportError("ECHEC_TELECHARGEMENT_BULLETIN", err);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleAnalyseGroq = async () => {
    setLoadingGroq(true);
    setAnalyseGroq(null);
    try {
      const data = await jobsService.getAnalyseGroqRecruteur(
        selectedCandidature.id,
      );
      setAnalyseGroq(data.analyse);
    } catch (err) {
      toast.error("Service IA indisponible.");
      reportError("ECHEC_ANALYSE_GROQ_RECRUTEUR", err);
    } finally {
      setLoadingGroq(false);
    }
  };

  const handleResumeIA = async () => {
    setLoadingResume(true);
    try {
      const data = await jobsService.getAnalyseGroqRecruteur(
        selectedCandidature.id,
      );
      setResumeIA(data.analyse);
    } catch {
      toast.error("Service IA indisponible.");
    } finally {
      setLoadingResume(false);
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
    soumettreEvaluation,
    handleDownloadBulletin,
    isPremium,
    handleAnalyseGroq,
    handleResumeIA,
    toggleCompare,
  };
};
