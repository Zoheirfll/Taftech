import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../utils/errorReporter"; // ✅ Télémétrie

const GestionOffre = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [offre, setOffre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidature, setSelectedCandidature] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);

  // Modale pour programmer un entretien
  const [modalEntretien, setModalEntretien] = useState({
    isOpen: false,
    candId: null,
  });
  const [entretienForm, setEntretienForm] = useState({
    date: "",
    heure: "",
    message: "",
  });

  // Modale pour l'évaluation (US 5)
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
        } else {
          toast.error("Offre introuvable.");
          navigate("/dashboard");
        }
      } catch (err) {
        toast.error("Erreur de chargement.");
        reportError("ECHEC_CHARGEMENT_OFFRE", err); // 🛑 Télémétrie
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchOffre();
  }, [id, navigate]);

  const changerStatut = async (
    candidatureId,
    nouveauStatut,
    extraData = null,
  ) => {
    try {
      const payload = { statut: nouveauStatut };
      let newDate = null;
      let newMsg = null;

      if (extraData) {
        newDate = `${extraData.date}T${extraData.heure}`;
        newMsg = extraData.message;
        payload.date_entretien = newDate;
        payload.message_entretien = newMsg;
      }

      await jobsService.updateStatutCandidature(candidatureId, payload);

      setOffre({
        ...offre,
        candidatures: offre.candidatures.map((c) => {
          if (c.id === candidatureId) {
            return {
              ...c,
              statut: nouveauStatut,
              ...(nouveauStatut === "ENTRETIEN" && newDate
                ? { date_entretien: newDate, message_entretien: newMsg }
                : {}),
            };
          }
          return c;
        }),
      });

      toast.success(
        nouveauStatut === "ENTRETIEN"
          ? "Entretien programmé et e-mail envoyé !"
          : `Statut mis à jour avec succès.`,
      );

      if (selectedCandidature && selectedCandidature.id === candidatureId) {
        setSelectedCandidature({
          ...selectedCandidature,
          statut: nouveauStatut,
          ...(nouveauStatut === "ENTRETIEN" && newDate
            ? { date_entretien: newDate, message_entretien: newMsg }
            : {}),
        });
      }
    } catch (err) {
      toast.error("Erreur lors de la mise à jour.");
      reportError("ECHEC_MISE_A_JOUR_STATUT", err); // 🛑 Télémétrie
    }
  };

  const handleStatusChange = (candId, newStatus) => {
    if (newStatus === "ENTRETIEN") {
      setModalEntretien({ isOpen: true, candId: candId });
    } else {
      changerStatut(candId, newStatus);
    }
  };

  const validerEntretien = () => {
    if (!entretienForm.date || !entretienForm.heure) {
      return toast.error("Veuillez sélectionner une date et une heure.");
    }
    const toastId = toast.loading("Envoi de l'invitation en cours...");
    changerStatut(modalEntretien.candId, "ENTRETIEN", entretienForm).then(
      () => {
        toast.dismiss(toastId);
        setModalEntretien({ isOpen: false, candId: null });
        setEntretienForm({ date: "", heure: "", message: "" });
      },
    );
  };

  const supprimerCandidature = async (candidatureId) => {
    if (
      !window.confirm(
        "Voulez-vous supprimer DÉFINITIVEMENT cette candidature ?",
      )
    )
      return;
    try {
      await jobsService.deleteCandidature(candidatureId);
      setOffre({
        ...offre,
        candidatures: offre.candidatures.filter((c) => c.id !== candidatureId),
      });
      toast.success("Candidature supprimée.");
      setSelectedCandidature(null);
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
      reportError("ECHEC_SUPPRESSION_CANDIDATURE", err); // 🛑 Télémétrie
    }
  };

  const handleCloturer = async () => {
    if (!window.confirm("Voulez-vous vraiment clôturer cette offre ?")) return;
    try {
      await jobsService.cloturerOffre(offre.id);
      setOffre({ ...offre, est_cloturee: true });
      toast.success("Offre clôturée et archivée !");
    } catch (err) {
      toast.error("Erreur lors de la clôture.");
      reportError("ECHEC_CLOTURE_OFFRE", err); // 🛑 Télémétrie
    }
  };

  const soumettreEvaluation = async () => {
    if (
      !evalForm.note_technique ||
      !evalForm.note_communication ||
      !evalForm.note_motivation ||
      !evalForm.note_experience
    ) {
      return toast.error("Veuillez remplir toutes les notes sur 5.");
    }
    const toastId = toast.loading("Enregistrement de l'évaluation...");
    try {
      const response = await jobsService.evaluerCandidature(
        modalEval.candidature.id,
        evalForm,
      );

      const updatedCandidature = response.candidature;
      setOffre({
        ...offre,
        candidatures: offre.candidatures.map((c) =>
          c.id === updatedCandidature.id ? updatedCandidature : c,
        ),
      });
      if (
        selectedCandidature &&
        selectedCandidature.id === updatedCandidature.id
      ) {
        setSelectedCandidature(updatedCandidature);
      }

      toast.success("Évaluation sauvegardée !");
      setModalEval({ isOpen: false, candidature: null });
    } catch (err) {
      toast.error("Erreur lors de l'évaluation.");
      reportError("ECHEC_EVALUATION_CANDIDAT", err); // 🛑 Télémétrie
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
      link.setAttribute(
        "download",
        `Bulletin_TafTech_Candidat_${candidatureId}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Bulletin généré avec succès !");
    } catch (err) {
      toast.error("Erreur lors de la génération du bulletin.");
      reportError("ECHEC_TELECHARGEMENT_BULLETIN", err); // 🛑 Télémétrie
    } finally {
      toast.dismiss(toastId);
    }
  };

  const STATUTS_LABELS = {
    RECUE: "🟡 Candidature reçue",
    EN_COURS: "🔵 En cours d’étude",
    ENTRETIEN: "🟠 Entretien programmé",
    RETENU: "🟢 Candidat retenu",
    REFUSE: "🔴 Candidat refusé",
  };

  const getBadgeStyle = (statut) => {
    const styles = {
      RECUE: "bg-yellow-50 text-yellow-700 border-yellow-200",
      EN_COURS: "bg-blue-50 text-blue-700 border-blue-200",
      ENTRETIEN: "bg-orange-50 text-orange-700 border-orange-200",
      RETENU: "bg-green-100 text-green-800 border-green-300",
      REFUSE: "bg-red-50 text-red-700 border-red-200",
    };
    return styles[statut] || "bg-gray-100 text-gray-800";
  };

  const renderScore = (score) => {
    if (score === null || score === undefined) {
      return <span className="text-gray-400 italic text-xs">Non calculé</span>;
    }
    const numScore = parseFloat(score);
    if (numScore >= 80)
      return (
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-black text-xs border border-green-200 inline-block">
          🟢 {numScore}% - Recommandé
        </span>
      );
    if (numScore >= 60)
      return (
        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg font-black text-xs border border-orange-200 inline-block">
          🟠 {numScore}% - Intéressant
        </span>
      );
    return (
      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-lg font-black text-xs border border-red-200 inline-block">
        🔴 {numScore}% - Non adapté
      </span>
    );
  };

  const renderDetailBar = (label, score, max) => {
    const percentage = (score / max) * 100;
    let color =
      percentage < 50
        ? "bg-red-500"
        : percentage < 100
          ? "bg-orange-400"
          : "bg-green-500";
    let icon = percentage < 50 ? "❌" : percentage < 100 ? "⚠️" : "✅";
    return (
      <div className="mb-3">
        <div className="flex justify-between text-[10px] uppercase font-black tracking-widest mb-1">
          <span className="text-gray-600">
            {icon} {label}
          </span>
          <span className="text-gray-900">
            {score}/{max}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`${color} h-1.5 rounded-full transition-all duration-1000`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

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
            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
          )
      : "Non spécifié";

  const renderTags = (data) => {
    if (!data)
      return (
        <span className="text-gray-400 italic text-xs">
          Aucun renseignement
        </span>
      );
    return data
      .split(",")
      .filter((i) => i)
      .map((item, idx) => (
        <span
          key={idx}
          className="bg-gray-100 text-gray-700 text-[10px] font-black uppercase px-2 py-1 rounded-md border border-gray-200 mr-2 mb-2 inline-block"
        >
          {item.trim()}
        </span>
      ));
  };

  const RatingRow = ({ label, value, onChange }) => (
    <div className="flex justify-between items-center mb-4 p-2 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`w-8 h-8 rounded-full font-black text-xs transition-all ${
              value >= num
                ? "bg-orange-500 text-white shadow-md scale-110"
                : "bg-white text-gray-400 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="text-center p-20 font-bold text-blue-600 animate-pulse">
        Chargement de l'offre...
      </div>
    );
  if (!offre) return null;

  const candidaturesTriees = [...offre.candidatures].sort(
    (a, b) => (b.score_matching || 0) - (a.score_matching || 0),
  );

  return (
    <div className="max-w-6xl mx-auto p-8 font-sans">
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-6 text-gray-400 hover:text-gray-900 font-bold text-sm flex items-center gap-2 transition"
      >
        ← Retour au Dashboard
      </button>

      {/* EN-TÊTE DE L'OFFRE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            {offre.titre}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400">
              Publiée le{" "}
              {new Date(offre.date_publication).toLocaleDateString("fr-FR")}
            </span>
            {offre.est_cloturee ? (
              <span className="bg-gray-800 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                Archivée
              </span>
            ) : (
              <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-green-200">
                Ouverte
              </span>
            )}
          </div>
        </div>
        {!offre.est_cloturee && (
          <button
            onClick={handleCloturer}
            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white font-black py-3 px-6 rounded-xl transition shadow-sm"
          >
            🔒 CLÔTURER L'OFFRE
          </button>
        )}
      </div>

      {/* BLOC : DÉTAILS DE L'OFFRE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
        <button
          onClick={() => setShowJobDetails(!showJobDetails)}
          className="w-full p-4 bg-gray-50 flex justify-between items-center text-left hover:bg-gray-100 transition-colors"
        >
          <span className="font-black text-gray-800 text-sm tracking-wide">
            {showJobDetails
              ? "▼ MASQUER LES DÉTAILS DE L'OFFRE"
              : "▶ VOIR LES DÉTAILS DE L'OFFRE"}
          </span>
          <span className="text-gray-400 font-bold text-xs flex items-center gap-2">
            <span className="bg-white px-2 py-1 rounded border border-gray-200">
              {formatText(offre.type_contrat)}
            </span>
            <span className="bg-white px-2 py-1 rounded border border-gray-200">
              {offre.wilaya}
            </span>
          </span>
        </button>

        {showJobDetails && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-gray-100">
            <div className="md:col-span-2 space-y-6">
              {!offre.description &&
              !offre.missions &&
              !offre.profil_recherche ? (
                <div className="flex items-center justify-center h-full bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 p-8">
                  <p className="text-gray-400 font-bold italic text-sm">
                    Aucun détail textuel n'a été renseigné.
                  </p>
                </div>
              ) : (
                <>
                  {offre.description && (
                    <div>
                      <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">
                        Description du poste
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {offre.description}
                      </p>
                    </div>
                  )}
                  {offre.missions && (
                    <div>
                      <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">
                        Missions
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {offre.missions}
                      </p>
                    </div>
                  )}
                  {offre.profil_recherche && (
                    <div>
                      <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">
                        Profil recherché
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {offre.profil_recherche}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 h-fit space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">
                Critères exigés
              </h3>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Localisation
                </p>
                <p className="text-sm font-black text-gray-900">
                  {offre.wilaya} {offre.commune ? `- ${offre.commune}` : ""}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Spécialité
                </p>
                <p className="text-sm font-black text-gray-900">
                  {formatText(offre.specialite)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Diplôme requis
                </p>
                <p className="text-sm font-black text-gray-900">
                  {formatText(offre.diplome) || "Non exigé"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Expérience
                </p>
                <p className="text-sm font-black text-gray-900">
                  {formatText(offre.experience_requise)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Salaire proposé
                </p>
                <p className="text-sm font-black text-blue-600">
                  {offre.salaire_propose || "À discuter"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LISTE DES CANDIDATURES */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-800">
            Candidatures reçues ({offre.candidatures.length})
          </h2>
          <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-lg border border-gray-200">
            🤖 Triées par l'Intelligence Artificielle
          </span>
        </div>

        {candidaturesTriees.length === 0 ? (
          <div className="p-16 text-center text-gray-400 font-medium italic">
            Aucun candidat pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="text-[10px] text-gray-400 uppercase tracking-widest border-b">
                  <th className="pb-4 text-left w-1/4">Candidat</th>
                  <th className="pb-4 text-center w-1/4">Matching IA</th>
                  <th className="pb-4 text-center w-1/6">Dossier</th>
                  <th className="pb-4 text-center w-1/4">Statut / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {candidaturesTriees.map((cand) => (
                  <tr key={cand.id} className="hover:bg-blue-50/30 transition">
                    <td className="py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 overflow-hidden shadow-sm">
                          {cand.candidat ? (
                            cand.candidat.photo_profil ? (
                              <img
                                src={getMediaUrl(cand.candidat.photo_profil)}
                                alt="Profil"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <>
                                {cand.candidat.first_name?.[0]}
                                {cand.candidat.last_name?.[0]}
                              </>
                            )
                          ) : (
                            <span title="Candidature Rapide">⚡</span>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm uppercase">
                            {cand.candidat
                              ? `${cand.candidat.last_name} ${cand.candidat.first_name}`
                              : `${cand.nom_rapide} ${cand.prenom_rapide}`}
                          </p>
                          <p className="text-xs text-blue-600 font-bold">
                            {cand.candidat
                              ? cand.candidat.titre_professionnel ||
                                "Candidat TafTech"
                              : "Candidature Rapide"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 align-middle text-center">
                      {cand.est_rapide ? (
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                          Sans analyse
                        </span>
                      ) : (
                        renderScore(cand.score_matching)
                      )}
                    </td>
                    <td className="py-4 align-middle text-center">
                      <button
                        onClick={() => setSelectedCandidature(cand)}
                        className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm"
                      >
                        👁️ Voir
                      </button>
                    </td>
                    <td className="py-4 align-middle text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={cand.statut}
                            onChange={(e) =>
                              handleStatusChange(cand.id, e.target.value)
                            }
                            className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none cursor-pointer transition-all ${getBadgeStyle(cand.statut)}`}
                          >
                            {Object.entries(STATUTS_LABELS).map(
                              ([key, label]) => (
                                <option
                                  key={key}
                                  value={key}
                                  className="bg-white text-gray-900 font-bold"
                                >
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          {cand.statut === "REFUSE" && (
                            <button
                              onClick={() => supprimerCandidature(cand.id)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 border border-gray-200 rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition shadow-sm"
                              title="Supprimer définitivement"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        {cand.statut === "ENTRETIEN" && cand.date_entretien && (
                          <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                            📅{" "}
                            {new Date(cand.date_entretien).toLocaleString(
                              "fr-FR",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        )}
                        {cand.note_globale && (
                          <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                            ⭐ {cand.note_globale}/20
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODALE DU PROFIL COMPLET --- */}
      {selectedCandidature && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-gray-900">
                  {selectedCandidature.est_rapide
                    ? "Dossier Rapide"
                    : "Dossier Complet TafTech"}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCandidature(null)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition font-bold shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLONNE GAUCHE (Infos Candidat) */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex flex-col md:flex-row items-center gap-6 bg-blue-50/30 p-6 rounded-2xl border border-blue-50">
                    <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-gray-400 text-3xl overflow-hidden shrink-0 shadow-sm border border-gray-100">
                      {selectedCandidature.candidat ? (
                        selectedCandidature.candidat.photo_profil ? (
                          <img
                            src={getMediaUrl(
                              selectedCandidature.candidat.photo_profil,
                            )}
                            alt="Profil"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          "👤"
                        )
                      ) : (
                        <span className="text-4xl">⚡</span>
                      )}
                    </div>
                    <div className="text-center md:text-left flex-1">
                      <h3 className="font-black text-gray-900 text-2xl uppercase tracking-tight">
                        {selectedCandidature.candidat
                          ? `${selectedCandidature.candidat.last_name} ${selectedCandidature.candidat.first_name}`
                          : `${selectedCandidature.nom_rapide} ${selectedCandidature.prenom_rapide}`}
                      </h3>
                      <p className="text-blue-600 font-bold mb-2">
                        {selectedCandidature.candidat
                          ? selectedCandidature.candidat.titre_professionnel ||
                            "Candidat TafTech"
                          : "Candidature Sans Compte"}
                      </p>
                      <div className="flex flex-wrap gap-4 justify-center md:justify-start text-xs text-gray-600 font-bold mt-2">
                        <span>
                          📧{" "}
                          {selectedCandidature.candidat
                            ? selectedCandidature.candidat.email
                            : selectedCandidature.email_rapide}
                        </span>
                        <span>
                          📞{" "}
                          {selectedCandidature.candidat
                            ? selectedCandidature.candidat.telephone ||
                              "Non renseigné"
                            : selectedCandidature.telephone_rapide}
                        </span>
                      </div>
                      {selectedCandidature.candidat && (
                        <>
                          <div className="mt-3 space-y-1 mb-2 bg-gray-50 p-3 rounded-xl inline-block w-full border border-gray-100">
                            <p className="text-gray-600 font-bold text-xs flex items-center justify-center md:justify-start gap-2">
                              📍{" "}
                              {selectedCandidature.candidat.wilaya ||
                                "Wilaya non renseignée"}{" "}
                              {selectedCandidature.candidat.commune
                                ? `- ${selectedCandidature.candidat.commune}`
                                : ""}
                            </p>
                            <p className="text-gray-600 font-bold text-xs flex items-center justify-center md:justify-start gap-2 mt-1">
                              🎓{" "}
                              {formatText(
                                selectedCandidature.candidat.diplome,
                              ) || "Diplôme non renseigné"}{" "}
                              | 🛠️{" "}
                              {formatText(
                                selectedCandidature.candidat.specialite,
                              ) || "Spécialité non renseignée"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedCandidature.candidat ? (
                    <>
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                          Préférences du candidat
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border border-gray-100 p-4 rounded-xl">
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                              Secteur
                            </p>
                            <p className="text-xs font-black text-gray-900">
                              {formatText(
                                selectedCandidature.candidat.secteur_souhaite,
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                              Prétentions
                            </p>
                            <p className="text-xs font-black text-blue-600">
                              {selectedCandidature.candidat.salaire_souhaite ||
                                "À discuter"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                              Mobilité
                            </p>
                            <p className="text-xs font-black text-gray-900">
                              {formatText(
                                selectedCandidature.candidat.mobilite,
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                              Dispo
                            </p>
                            <p className="text-xs font-black text-gray-900">
                              {formatText(
                                selectedCandidature.candidat.situation_actuelle,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
                            Expériences
                          </h4>
                          {selectedCandidature.candidat.experiences &&
                          selectedCandidature.candidat.experiences.length >
                            0 ? (
                            <div className="space-y-4">
                              {selectedCandidature.candidat.experiences.map(
                                (exp) => (
                                  <div
                                    key={exp.id}
                                    className="pl-4 border-l-2 border-blue-200"
                                  >
                                    <p className="font-black text-gray-800 text-sm">
                                      {exp.titre_poste}{" "}
                                      <span className="text-blue-600">
                                        @ {exp.entreprise}
                                      </span>
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1 bg-white inline-block">
                                      📅 {exp.date_debut} —{" "}
                                      {exp.date_fin || "Aujourd'hui"}
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <p className="text-xs italic text-gray-400">
                              Non renseigné
                            </p>
                          )}
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
                            Formations
                          </h4>
                          {selectedCandidature.candidat.formations &&
                          selectedCandidature.candidat.formations.length > 0 ? (
                            <div className="space-y-4">
                              {selectedCandidature.candidat.formations.map(
                                (form) => (
                                  <div
                                    key={form.id}
                                    className="pl-4 border-l-2 border-indigo-200"
                                  >
                                    <p className="font-black text-gray-800 text-sm">
                                      {form.diplome}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1 bg-white inline-block">
                                      🎓 {form.etablissement}
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <p className="text-xs italic text-gray-400">
                              Non renseigné
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="bg-white border border-gray-100 p-6 rounded-2xl">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                          Compétences
                        </h4>
                        {renderTags(selectedCandidature.candidat.competences)}
                      </div>
                    </>
                  ) : (
                    <div className="bg-orange-50 border border-orange-100 p-8 rounded-2xl text-center">
                      <p className="text-4xl mb-4">⚡</p>
                      <h4 className="text-lg font-black text-orange-900 mb-2">
                        Candidature Express
                      </h4>
                      <p className="text-sm font-medium text-orange-700">
                        Ce candidat a postulé rapidement sans créer de compte.
                        Consultez son CV PDF ci-contre.
                      </p>
                    </div>
                  )}
                </div>

                {/* COLONNE DROITE (Actions Recruteur) */}
                <div className="space-y-6">
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">
                      Décision Recrutement
                    </p>
                    <select
                      value={selectedCandidature.statut}
                      onChange={(e) =>
                        handleStatusChange(
                          selectedCandidature.id,
                          e.target.value,
                        )
                      }
                      className={`w-full text-sm font-black px-4 py-3 rounded-xl border outline-none cursor-pointer transition-all shadow-sm ${getBadgeStyle(selectedCandidature.statut)}`}
                    >
                      {Object.entries(STATUTS_LABELS).map(([key, label]) => (
                        <option
                          key={key}
                          value={key}
                          className="bg-white text-gray-900 font-bold"
                        >
                          {label}
                        </option>
                      ))}
                    </select>

                    {/* 👇 BOUTON BULLETIN QUI APPARAÎT SEULEMENT SI LE CANDIDAT EST RETENU 👇 */}
                    {selectedCandidature.statut === "RETENU" && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center shadow-sm animate-fadeIn">
                        <p className="text-[10px] font-black text-green-800 uppercase tracking-widest mb-3">
                          🎉 Candidat sélectionné !
                        </p>
                        <button
                          onClick={() =>
                            handleDownloadBulletin(selectedCandidature.id)
                          }
                          className="w-full bg-green-600 text-white font-black px-4 py-3 rounded-xl shadow hover:bg-green-700 transition flex items-center justify-center gap-2"
                        >
                          📥 Télécharger le Bulletin
                        </button>
                      </div>
                    )}

                    <div className="mt-4 space-y-2">
                      {selectedCandidature.candidat &&
                        selectedCandidature.candidat.cv_pdf && (
                          <a
                            href={getMediaUrl(
                              selectedCandidature.candidat.cv_pdf,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center w-full gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-xs hover:bg-blue-700 transition shadow-sm"
                          >
                            📄 OUVRIR LE CV PDF
                          </a>
                        )}
                      {selectedCandidature.cv_rapide_url && (
                        <a
                          href={selectedCandidature.cv_rapide_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center w-full gap-2 bg-orange-600 text-white px-4 py-3 rounded-xl font-black text-xs hover:bg-orange-700 transition shadow-sm"
                        >
                          ⚡ OUVRIR LE CV RAPIDE
                        </a>
                      )}
                      {selectedCandidature.lettre_motivation_file && (
                        <a
                          href={getMediaUrl(
                            selectedCandidature.lettre_motivation_file,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center w-full gap-2 bg-gray-900 text-white px-4 py-3 rounded-xl font-black text-xs hover:bg-black transition shadow-sm"
                        >
                          📁 OUVRIR LA LETTRE
                        </a>
                      )}
                    </div>
                  </div>

                  {/* ÉVALUATION POST-ENTRETIEN (US 5) */}
                  <div className="bg-white border-2 border-purple-100 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                        Évaluation Entretien
                      </p>
                      <span className="text-xl">📝</span>
                    </div>

                    {selectedCandidature.note_globale ? (
                      <div className="text-center">
                        <p className="text-5xl font-black text-purple-600 mb-2">
                          {selectedCandidature.note_globale}
                          <span className="text-xl text-purple-300">/20</span>
                        </p>
                        <p className="text-xs font-bold text-gray-500 italic">
                          "
                          {selectedCandidature.commentaire_evaluation ||
                            "Aucun commentaire"}
                          "
                        </p>
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
                                selectedCandidature.commentaire_evaluation ||
                                "",
                            });
                            setModalEval({
                              isOpen: true,
                              candidature: selectedCandidature,
                            });
                          }}
                          className="mt-4 text-xs font-bold text-purple-600 hover:underline"
                        >
                          Modifier la note
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-gray-500 font-medium mb-4">
                          Gardez une trace objective de votre entretien avec ce
                          candidat.
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
                          className="w-full bg-purple-50 text-purple-700 border border-purple-200 px-4 py-3 rounded-xl font-black text-xs uppercase hover:bg-purple-600 hover:text-white transition"
                        >
                          ⭐ Évaluer le candidat
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedCandidature.candidat && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest">
                          Analyse IA TafTech
                        </h4>
                        {renderScore(selectedCandidature.score_matching)}
                      </div>
                      {selectedCandidature.details_matching ? (
                        <div>
                          {renderDetailBar(
                            "Spécialité",
                            selectedCandidature.details_matching.specialite ||
                              0,
                            25,
                          )}
                          {renderDetailBar(
                            "Diplôme requis",
                            selectedCandidature.details_matching.diplome || 0,
                            20,
                          )}
                          {renderDetailBar(
                            "Années d'expérience",
                            selectedCandidature.details_matching.experience ||
                              0,
                            20,
                          )}
                          {renderDetailBar(
                            "Localisation",
                            selectedCandidature.details_matching.region || 0,
                            20,
                          )}
                          {renderDetailBar(
                            "Mots-clés",
                            selectedCandidature.details_matching.competences ||
                              0,
                            15,
                          )}
                        </div>
                      ) : (
                        <div className="text-center p-4 bg-white/50 rounded-xl">
                          <p className="text-xs font-bold text-gray-500">
                            Aucun détail d'analyse disponible.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE : PROGRAMMER UN ENTRETIEN --- */}
      {modalEntretien.isOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-slideUp">
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              Programmer un entretien
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Un e-mail d'invitation sera envoyé automatiquement.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
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
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
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
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                  Message & Lieu
                </label>
                <textarea
                  rows="3"
                  placeholder="Lien Google Meet..."
                  value={entretienForm.message}
                  onChange={(e) =>
                    setEntretienForm({
                      ...entretienForm,
                      message: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-600 resize-none text-sm font-medium"
                ></textarea>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() =>
                    setModalEntretien({ isOpen: false, candId: null })
                  }
                  className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={validerEntretien}
                  className="flex-1 py-4 bg-orange-500 text-white font-black rounded-xl shadow-lg hover:bg-orange-600 hover:-translate-y-1 transition"
                >
                  Inviter ✉️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : ÉVALUATION POST-ENTRETIEN (US 5) */}
      {modalEval.isOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-slideUp">
            <div className="text-center mb-6">
              <span className="text-4xl block mb-2">📝</span>
              <h3 className="text-2xl font-black text-gray-900">
                Évaluation Globale
              </h3>
              <p className="text-sm text-gray-500">
                Notez le candidat sur 4 critères essentiels. (Total sur 20)
              </p>
            </div>

            <div className="space-y-2 mb-6">
              <RatingRow
                label="Compétence Technique"
                value={evalForm.note_technique}
                onChange={(val) =>
                  setEvalForm({ ...evalForm, note_technique: val })
                }
              />
              <RatingRow
                label="Communication / Soft Skills"
                value={evalForm.note_communication}
                onChange={(val) =>
                  setEvalForm({ ...evalForm, note_communication: val })
                }
              />
              <RatingRow
                label="Motivation / Attitude"
                value={evalForm.note_motivation}
                onChange={(val) =>
                  setEvalForm({ ...evalForm, note_motivation: val })
                }
              />
              <RatingRow
                label="Expérience pertinente"
                value={evalForm.note_experience}
                onChange={(val) =>
                  setEvalForm({ ...evalForm, note_experience: val })
                }
              />
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                Commentaire privé (Optionnel)
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
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-600 resize-none text-sm font-medium"
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setModalEval({ isOpen: false, candidature: null })
                }
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={soumettreEvaluation}
                className="flex-1 py-4 bg-purple-600 text-white font-black rounded-xl shadow-lg hover:bg-purple-700 hover:-translate-y-1 transition"
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
