import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../utils/errorReporter";
import {
  ArrowLeft,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  Zap,
  Star,
  MapPin,
  GraduationCap,
  Briefcase,
  Mail,
  Phone,
  Download,
  Eye,
  Trash2,
  Calendar,
  User,
  TrendingUp,
} from "lucide-react";

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

const STATUTS_DOTS = {
  RECUE: "bg-amber-500",
  EN_COURS: "bg-blue-500",
  ENTRETIEN: "bg-orange-500",
  RETENU: "bg-emerald-500",
  REFUSE: "bg-red-500",
};

const RatingRow = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${
            value >= num
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
          }`}
        >
          {num}
        </button>
      ))}
    </div>
  </div>
);

const GestionOffre = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offre, setOffre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidature, setSelectedCandidature] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showTop5Only, setShowTop5Only] = useState(false);
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
  const handleStatusChange = (candId, newStatus) => {
    if (newStatus === "ENTRETIEN") {
      setModalEntretien({ isOpen: true, candId });
    } else {
      changerStatut(candId, newStatus);
    }
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

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  if (!offre) return null;

  let candidaturesTriees = [...offre.candidatures].sort(
    (a, b) => (b.score_matching || 0) - (a.score_matching || 0),
  );

  if (showTop5Only) {
    candidaturesTriees = candidaturesTriees
      .filter((c) => !c.est_rapide && c.score_matching !== null)
      .slice(0, 5);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* BREADCRUMB + HEADER */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Retour au tableau de bord
      </button>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 flex justify-between items-center">
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
            Publiée le{" "}
            {new Date(offre.date_publication).toLocaleDateString("fr-FR")} ·{" "}
            {offre.candidatures.length} candidature
            {offre.candidatures.length > 1 ? "s" : ""}
          </p>
        </div>
        {!offre.est_cloturee && (
          <button
            onClick={handleCloturer}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Lock size={14} />
            Clôturer l'offre
          </button>
        )}
      </div>

      {/* DÉTAILS DE L'OFFRE (ACCORDÉON) */}
      <div className="bg-white border border-slate-200 rounded-xl mb-6 overflow-hidden">
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
                  <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {offre.description}
                  </p>
                </div>
              )}
              {offre.missions && (
                <div>
                  <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                    Missions
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {offre.missions}
                  </p>
                </div>
              )}
              {offre.profil_recherche && (
                <div>
                  <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
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

      {/* SPLIT VIEW : LISTE CANDIDATS + DÉTAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* COLONNE GAUCHE : LISTE DES CANDIDATURES */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Header liste */}
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Candidatures ({offre.candidatures.length})
                </p>
                {showTop5Only && (
                  <p className="text-xs text-indigo-600 font-medium">
                    Shortlist IA · Top 5
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowTop5Only(!showTop5Only);
                  if (!showTop5Only) toast.success("Shortlist IA activée !");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  showTop5Only
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                }`}
              >
                <Sparkles size={12} />
                Top 5
              </button>
            </div>

            {/* Liste */}
            {candidaturesTriees.length === 0 ? (
              <div className="p-12 text-center">
                <User size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Aucun candidat</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {candidaturesTriees.map((cand) => {
                  const isSelected = selectedCandidature?.id === cand.id;
                  const scoreInfo = renderScore(cand.score_matching);
                  const candidatData = getCandidatData(cand);
                  const nomComplet = candidatData
                    ? `${candidatData.last_name} ${candidatData.first_name}`
                    : `${cand.nom_rapide} ${cand.prenom_rapide}`;
                  const titre = candidatData
                    ? candidatData.titre_professionnel || "Candidat TafTech"
                    : "Candidature rapide";

                  return (
                    <button
                      key={cand.id}
                      onClick={() => setSelectedCandidature(cand)}
                      className={`w-full text-left px-4 py-3.5 transition-colors ${
                        isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
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

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {nomComplet}
                            </p>
                            {/* Dot statut */}
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUTS_DOTS[cand.statut]}`}
                              title={STATUTS_LABELS[cand.statut]}
                            />
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {titre}
                          </p>
                          {scoreInfo && (
                            <span
                              className={`mt-1 inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${scoreInfo.style}`}
                            >
                              {scoreInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE : DÉTAIL CANDIDATURE */}
        <div className="lg:col-span-3">
          {selectedCandidature ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* En-tête candidat */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {getCandidatData(selectedCandidature)?.photo_profil ? (
                      <img
                        src={getMediaUrl(
                          getCandidatData(selectedCandidature).photo_profil,
                        )}
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
                      {getCandidatData(selectedCandidature)
                        ? `${getCandidatData(selectedCandidature).last_name} ${getCandidatData(selectedCandidature).first_name}`
                        : `${selectedCandidature.nom_rapide} ${selectedCandidature.prenom_rapide}`}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {getCandidatData(selectedCandidature)
                        ?.titre_professionnel ||
                        (selectedCandidature.est_rapide
                          ? "Candidature rapide"
                          : "Candidat TafTech")}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {getCandidatData(selectedCandidature)?.wilaya && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                          <MapPin size={11} />
                          {getCandidatData(selectedCandidature).wilaya}
                        </span>
                      )}
                      {getCandidatData(selectedCandidature)?.diplome && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                          <GraduationCap size={11} />
                          {getCandidatData(selectedCandidature).diplome}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Statut dropdown */}
                  <select
                    value={selectedCandidature.statut}
                    onChange={(e) =>
                      handleStatusChange(selectedCandidature.id, e.target.value)
                    }
                    className={`text-xs font-semibold px-3 py-2 rounded-lg border outline-none cursor-pointer ${STATUTS_STYLES[selectedCandidature.statut]}`}
                  >
                    {Object.entries(STATUTS_LABELS).map(([key, label]) => (
                      <option
                        key={key}
                        value={key}
                        className="bg-white text-slate-900"
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date entretien */}
                {selectedCandidature.statut === "ENTRETIEN" &&
                  selectedCandidature.date_entretien && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-100">
                      <Calendar size={14} className="text-orange-600" />
                      <p className="text-xs font-medium text-orange-700">
                        Entretien le{" "}
                        {new Date(
                          selectedCandidature.date_entretien,
                        ).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}

                {/* Bulletin si retenu */}
                {selectedCandidature.statut === "RETENU" && (
                  <div className="mt-3 flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-800">
                      Candidat retenu — Bulletin disponible
                    </p>
                    <button
                      onClick={() =>
                        handleDownloadBulletin(selectedCandidature.id)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Download size={12} />
                      Télécharger
                    </button>
                  </div>
                )}
              </div>

              {/* Onglets détail */}
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
                    className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeDetailTab === tab
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab === "profil" && "Profil"}
                    {tab === "ia" && "Analyse IA"}
                    {tab === "evaluation" && "Évaluation"}
                    {tab === "questionnaire" && "Questionnaire"}
                  </button>
                ))}
                <div className="ml-auto flex items-center px-4 gap-2">
                  {getCandidatData(selectedCandidature)?.cv_pdf && (
                    <a
                      href={getMediaUrl(
                        getCandidatData(selectedCandidature).cv_pdf,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <FileText size={12} />
                      CV PDF
                    </a>
                  )}
                  {selectedCandidature.cv_rapide_url && (
                    <a
                      href={selectedCandidature.cv_rapide_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <Zap size={12} />
                      CV Rapide
                    </a>
                  )}
                  {selectedCandidature.statut === "REFUSE" && (
                    <button
                      onClick={() =>
                        supprimerCandidature(selectedCandidature.id)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Contenu onglet PROFIL */}
              {activeDetailTab === "profil" && (
                <div className="p-6 space-y-6 overflow-y-auto max-h-[500px]">
                  {/* Coordonnées */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Coordonnées
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail size={14} className="text-slate-400" />
                        {getCandidatData(selectedCandidature)?.email ||
                          selectedCandidature.email_rapide}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Phone size={14} className="text-slate-400" />
                        {getCandidatData(selectedCandidature)?.telephone ||
                          selectedCandidature.telephone_rapide ||
                          "Non renseigné"}
                      </div>
                    </div>
                  </div>

                  {getCandidatData(selectedCandidature) ? (
                    <>
                      {/* Préférences */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                          Préférences
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            {
                              label: "Secteur",
                              value: formatText(
                                getCandidatData(selectedCandidature)
                                  .secteur_souhaite,
                              ),
                            },
                            {
                              label: "Prétentions",
                              value:
                                getCandidatData(selectedCandidature)
                                  .salaire_souhaite || "À discuter",
                            },
                            {
                              label: "Mobilité",
                              value: formatText(
                                getCandidatData(selectedCandidature).mobilite,
                              ),
                            },
                            {
                              label: "Situation",
                              value: formatText(
                                getCandidatData(selectedCandidature)
                                  .situation_actuelle,
                              ),
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

                      {/* Expériences */}
                      {getCandidatData(selectedCandidature)?.experiences
                        ?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Briefcase size={12} />
                            Expériences
                          </h4>
                          <div className="space-y-3">
                            {getCandidatData(
                              selectedCandidature,
                            )?.experiences.map((exp) => (
                              <div
                                key={exp.id}
                                className="pl-4 border-l-2 border-indigo-100"
                              >
                                <p className="text-sm font-semibold text-slate-900">
                                  {exp.titre_poste}
                                </p>
                                <p className="text-sm text-indigo-600">
                                  {exp.entreprise}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Calendar size={10} />
                                  {exp.date_debut} —{" "}
                                  {exp.date_fin || "Aujourd'hui"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Formations */}
                      {getCandidatData(selectedCandidature)?.formations
                        ?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <GraduationCap size={12} />
                            Formations
                          </h4>
                          <div className="space-y-3">
                            {getCandidatData(
                              selectedCandidature,
                            )?.formations.map((form) => (
                              <div
                                key={form.id}
                                className="pl-4 border-l-2 border-slate-200"
                              >
                                <p className="text-sm font-semibold text-slate-900">
                                  {form.diplome || "Diplôme non précisé"}
                                </p>
                                {form.description && (
                                  <p className="text-xs text-indigo-600 font-medium">
                                    {form.description}
                                  </p>
                                )}
                                <p className="text-sm text-slate-500">
                                  {form.etablissement}
                                </p>
                                {(form.date_debut || form.date_fin) && (
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {form.date_debut} —{" "}
                                    {form.date_fin || "En cours"}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Compétences */}
                      {getCandidatData(selectedCandidature).competences && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Compétences
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {getCandidatData(selectedCandidature)
                              .competences.split(",")
                              .filter(Boolean)
                              .map((c, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md"
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

              {/* Contenu onglet IA */}
              {activeDetailTab === "ia" && (
                <div className="p-6 overflow-y-auto max-h-[500px]">
                  {!getCandidatData(selectedCandidature) ? (
                    <div className="text-center py-8">
                      <TrendingUp
                        size={28}
                        className="text-slate-300 mx-auto mb-2"
                      />
                      <p className="text-sm text-slate-500">
                        Analyse IA indisponible pour les candidatures rapides.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Score global */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Score de matching IA
                          </p>
                          {renderScore(selectedCandidature.score_matching) ? (
                            <span
                              className={`inline-flex px-3 py-1 text-sm font-bold rounded-full border ${renderScore(selectedCandidature.score_matching).style}`}
                            >
                              {
                                renderScore(selectedCandidature.score_matching)
                                  .label
                              }
                            </span>
                          ) : (
                            <p className="text-sm text-slate-400 italic">
                              Non calculé
                            </p>
                          )}
                        </div>
                        <TrendingUp size={32} className="text-slate-300" />
                      </div>

                      {/* Jauges */}
                      {selectedCandidature.details_matching &&
                        (() => {
                          const DM = selectedCandidature.details_matching;
                          const scores = DM.scores || DM;
                          const explics = DM.explications || {};

                          return (
                            <div className="space-y-4">
                              {[
                                {
                                  key: "specialite",
                                  label: "Spécialité",
                                  max: 25,
                                },
                                { key: "diplome", label: "Diplôme", max: 20 },
                                {
                                  key: "experience",
                                  label: "Expérience",
                                  max: 20,
                                },
                                {
                                  key: "region",
                                  label: "Localisation",
                                  max: 20,
                                },
                                {
                                  key: "competences",
                                  label: "Compétences",
                                  max: 15,
                                },
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

                              {/* Highlights */}
                              {DM.highlights && (
                                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                                  <div>
                                    <p className="text-xs font-semibold text-emerald-700 mb-2">
                                      Points forts
                                    </p>
                                    {DM.highlights.points_forts?.length > 0 ? (
                                      <ul className="space-y-1.5">
                                        {DM.highlights.points_forts.map(
                                          (pf, i) => (
                                            <li
                                              key={i}
                                              className="text-xs text-slate-600 flex items-start gap-1.5"
                                            >
                                              <span className="text-emerald-500 mt-0.5">
                                                •
                                              </span>
                                              {pf}
                                            </li>
                                          ),
                                        )}
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
                    </div>
                  )}
                </div>
              )}

              {/* Contenu onglet ÉVALUATION */}
              {activeDetailTab === "evaluation" && (
                <div className="p-6 overflow-y-auto max-h-[500px]">
                  {selectedCandidature.note_globale ? (
                    <div className="text-center">
                      <p className="text-5xl font-bold text-indigo-600 tabular-nums mb-1">
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
                            note_technique:
                              selectedCandidature.note_technique || 0,
                            note_communication:
                              selectedCandidature.note_communication || 0,
                            note_motivation:
                              selectedCandidature.note_motivation || 0,
                            note_experience:
                              selectedCandidature.note_experience || 0,
                            commentaire_evaluation:
                              selectedCandidature.commentaire_evaluation || "",
                          });
                          setModalEval({
                            isOpen: true,
                            candidature: selectedCandidature,
                          });
                        }}
                        className="mt-4 text-xs font-medium text-indigo-600 hover:underline"
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
                        className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Évaluer ce candidat
                      </button>
                    </div>
                  )}
                </div>
              )}
              {activeDetailTab === "questionnaire" && offre.questionnaire && (
                <div className="p-6 overflow-y-auto max-h-[500px] space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-4 bg-indigo-600 rounded-full" />
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
                          {q.requis && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
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
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
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

      {/* MODALE ENTRETIEN */}
      {modalEntretien.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Programmer un entretien
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Un email d'invitation sera envoyé automatiquement.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={entretienForm.date}
                    onChange={(e) =>
                      setEntretienForm({
                        ...entretienForm,
                        date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Heure *
                  </label>
                  <input
                    type="time"
                    value={entretienForm.heure}
                    onChange={(e) =>
                      setEntretienForm({
                        ...entretienForm,
                        heure: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Message & lieu
                </label>
                <textarea
                  rows="3"
                  placeholder="Lien Google Meet, adresse..."
                  value={entretienForm.message}
                  onChange={(e) =>
                    setEntretienForm({
                      ...entretienForm,
                      message: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() =>
                    setModalEntretien({ isOpen: false, candId: null })
                  }
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={validerEntretien}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Envoyer l'invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ÉVALUATION */}
      {modalEval.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Évaluation post-entretien
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Notez le candidat sur 4 critères (total sur 20).
            </p>
            <div className="mb-6">
              <RatingRow
                label="Compétence technique"
                value={evalForm.note_technique}
                onChange={(v) =>
                  setEvalForm({ ...evalForm, note_technique: v })
                }
              />
              <RatingRow
                label="Communication"
                value={evalForm.note_communication}
                onChange={(v) =>
                  setEvalForm({ ...evalForm, note_communication: v })
                }
              />
              <RatingRow
                label="Motivation"
                value={evalForm.note_motivation}
                onChange={(v) =>
                  setEvalForm({ ...evalForm, note_motivation: v })
                }
              />
              <RatingRow
                label="Expérience pertinente"
                value={evalForm.note_experience}
                onChange={(v) =>
                  setEvalForm({ ...evalForm, note_experience: v })
                }
              />
            </div>
            <div className="mb-6">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Commentaire privé (optionnel)
              </label>
              <textarea
                rows="2"
                placeholder="Points forts, points faibles..."
                value={evalForm.commentaire_evaluation}
                onChange={(e) =>
                  setEvalForm({
                    ...evalForm,
                    commentaire_evaluation: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setModalEval({ isOpen: false, candidature: null })
                }
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={soumettreEvaluation}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionOffre;
