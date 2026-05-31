import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import { authService } from "../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../utils/errorReporter";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Banknote,
  TrendingUp,
  FileText,
  Zap,
  CheckCircle,
  XCircle,
} from "lucide-react";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postulerStatus, setPostulerStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lettreMotivation, setLettreMotivation] = useState("");
  const [postulationMode, setPostulationMode] = useState(null);
  const [fastForm, setFastForm] = useState({
    nom_rapide: "",
    prenom_rapide: "",
    email_rapide: "",
    telephone_rapide: "",
    cv_rapide: null,
    lettre_motivation: "",
  });
  const [matchingScore, setMatchingScore] = useState(null);
  const [reponses, setReponses] = useState({});
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);

  useEffect(() => {
    const fetchJobAndRecommendation = async () => {
      try {
        const data = await jobsService.getJobById(id);
        setJob(data);
        if (
          authService.isAuthenticated() &&
          authService.getUserRole() === "CANDIDAT"
        ) {
          try {
            const recommandations = await jobsService.getOffresRecommandees();
            const matchingJob = recommandations.find(
              (r) => r.id === parseInt(id),
            );
            if (matchingJob) setMatchingScore(matchingJob.matching_score);
          } catch (recErr) {
            reportError("ERREUR_SILENCIEUSE_RECOMMANDATION", recErr);
          }
        }
      } catch (err) {
        setError("Offre introuvable ou retirée.");
        reportError("ECHEC_CHARGEMENT_JOB_DETAIL", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobAndRecommendation();
  }, [id]);

  const handlePostulerTafTech = async () => {
    if (isSubmitting) return;
    if (
      !authService.isAuthenticated() ||
      authService.getUserRole() !== "CANDIDAT"
    ) {
      toast.error("Vous devez être connecté en tant que candidat.");
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      await jobsService.postuler(id, {
        lettre_motivation: lettreMotivation,
        reponses: JSON.stringify(reponses),
      });
      setPostulerStatus("success");
    } catch (err) {
      setPostulerStatus("error");
      toast.error(
        err.response?.data?.error || "Erreur lors de la postulation.",
      );
      reportError("ECHEC_POSTULER_TAFTECH", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewClick = () => {
    if (
      !authService.isAuthenticated() ||
      authService.getUserRole() !== "CANDIDAT"
    ) {
      toast.error("Connectez-vous pour voir votre profil.");
      navigate("/login");
      return;
    }
    navigate(`/jobs/${id}/postuler`);
  };

  const handleFastFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "cv_rapide") {
      setFastForm({ ...fastForm, cv_rapide: files[0] });
    } else {
      setFastForm({ ...fastForm, [name]: value });
    }
  };

  const handlePostulerRapide = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!fastForm.cv_rapide) {
      toast.error("Veuillez joindre votre CV en format PDF ou Word.");
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading("Envoi de votre candidature...");
    const formData = new FormData();
    Object.keys(fastForm).forEach((key) => {
      if (fastForm[key] !== null && fastForm[key] !== "")
        formData.append(key, fastForm[key]);
    });
    try {
      await jobsService.postulerRapide(id, formData);
      setPostulerStatus("success");
      toast.success("Candidature envoyée !", { id: toastId });
    } catch (err) {
      setPostulerStatus("error");
      toast.error(err.response?.data?.error || "Erreur lors de l'envoi.", {
        id: toastId,
      });
      reportError("ECHEC_POSTULER_RAPIDE", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMatchingColor = (score) => {
    if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-700 font-medium">{error}</p>
        <Link
          to="/offres"
          className="text-sm text-indigo-600 font-semibold hover:underline"
        >
          Retourner aux offres
        </Link>
      </div>
    );

  if (!job) return null;

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  const handleReponseChange = (questionId, value) => {
    setReponses({ ...reponses, [questionId]: value });
  };

  const handleReponseChoixMultiple = (questionId, value) => {
    const current = reponses[questionId]
      ? reponses[questionId].split(",").filter(Boolean)
      : [];
    const exists = current.includes(value);
    const updated = exists
      ? current.filter((v) => v !== value)
      : [...current, value];
    setReponses({ ...reponses, [questionId]: updated.join(",") });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link
        to="/offres"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux offres
      </Link>

      {/* EN-TÊTE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <div className="bg-indigo-600 px-8 py-8">
          <h1 className="text-2xl font-bold text-white mb-4 tracking-tight">
            {job.titre}
          </h1>
          <div className="flex flex-wrap gap-2">
            {job.entreprise ? (
              <Link
                to={`/entreprise/${job.entreprise.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-full transition-colors"
              >
                {job.entreprise.nom_entreprise}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-xs font-medium rounded-full">
                Entreprise anonyme
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-xs font-medium rounded-full">
              <MapPin size={12} />
              {job.wilaya}
              {job.commune ? ` · ${job.commune}` : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-xs font-medium rounded-full">
              <Calendar size={12} />
              {new Date(job.date_publication).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>

        {/* CRITÈRES */}
        <div className="p-6 border-b border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {job.type_contrat && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Contrat
                </p>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Briefcase size={13} className="text-slate-400" />
                  {job.type_contrat}
                </p>
              </div>
            )}
            {job.experience_requise && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Expérience
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {job.experience_requise}
                </p>
              </div>
            )}
            {job.diplome && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Diplôme
                </p>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-slate-400" />
                  {job.diplome}
                </p>
              </div>
            )}
            {job.specialite && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Spécialité
                </p>
                <p className="text-sm font-semibold text-indigo-600">
                  {job.specialite}
                </p>
              </div>
            )}
            {job.salaire_propose && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Salaire
                </p>
                <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                  <Banknote size={13} />
                  {job.salaire_propose}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MATCHING SCORE */}
        {matchingScore !== null && (
          <div
            className={`mx-6 mt-4 px-4 py-3 border rounded-lg flex items-center gap-3 ${getMatchingColor(matchingScore)}`}
          >
            <TrendingUp size={16} />
            <p className="text-sm font-medium">
              Notre IA estime que votre profil correspond à{" "}
              <strong>{matchingScore}%</strong> aux exigences de ce poste.
            </p>
          </div>
        )}

        {/* CONTENU */}
        <div className="p-6 space-y-6">
          {job.description && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-4 bg-indigo-600 rounded-full" />
                Description du poste
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </div>
          )}
          {job.missions && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-4 bg-amber-500 rounded-full" />
                Missions principales
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {job.missions}
              </p>
            </div>
          )}
          {job.profil_recherche && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-4 bg-emerald-500 rounded-full" />
                Profil recherché
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {job.profil_recherche}
              </p>
            </div>
          )}
        </div>

        {/* ZONE POSTULATION */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          {postulerStatus === "success" ? (
            <div className="text-center py-4">
              <CheckCircle
                size={36}
                className="text-emerald-600 mx-auto mb-3"
              />
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Candidature envoyée !
              </h3>
              <p className="text-sm text-slate-500">
                Le recruteur a bien reçu votre profil. Bonne chance !
              </p>
            </div>
          ) : postulerStatus === "error" ? (
            <div className="text-center py-4">
              <XCircle size={36} className="text-red-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Oups...
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Vous avez déjà postulé ou une erreur est survenue.
              </p>
              <button
                onClick={() => {
                  setPostulerStatus("");
                  setPostulationMode(null);
                }}
                className="text-sm text-indigo-600 font-semibold hover:underline"
              >
                Réessayer
              </button>
            </div>
          ) : !postulationMode ? (
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-4 text-center">
                Prêt à postuler ?
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (job.questionnaire) {
                      setShowQuestionnaireModal(true);
                    } else {
                      setPostulationMode("taftech");
                    }
                  }}
                  className="w-full flex flex-col items-center py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm"
                >
                  <span className="text-sm font-semibold">
                    Postuler avec mon profil TafTech
                  </span>
                  <span className="text-xs text-indigo-200 mt-0.5">
                    {job.questionnaire
                      ? `Questionnaire requis · ${job.questionnaire.questions?.length || 0} questions`
                      : "Recommandé — analysé par notre IA"}
                  </span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium">OU</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <button
                  onClick={() => setPostulationMode("rapide")}
                  className="w-full flex flex-col items-center py-4 px-6 bg-slate-900 hover:bg-black text-white rounded-xl transition-colors"
                >
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Zap size={15} className="text-amber-400" />
                    Postulation rapide (sans compte)
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Envoyez juste votre CV en quelques secondes
                  </span>
                </button>
              </div>
            </div>
          ) : postulationMode === "questionnaire" ? (
            <div>
              <button
                onClick={() => setPostulationMode(null)}
                className="text-sm text-slate-500 hover:text-slate-900 font-medium mb-4 flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Retour
              </button>
              <div className="mb-4">
                <p className="text-sm font-bold text-slate-900 mb-1">
                  {job.questionnaire.titre}
                </p>
                <p className="text-xs text-slate-500">
                  {job.questionnaire.questions?.length} question(s)
                </p>
              </div>
              <div className="space-y-4 mb-5">
                {job.questionnaire.questions?.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white border border-slate-200 rounded-lg p-4"
                  >
                    <p className="text-sm font-medium text-slate-800 mb-2">
                      {q.texte}
                      {q.requis && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {q.type_question === "COURT" && (
                      <input
                        className={inputClass}
                        onChange={(e) =>
                          handleReponseChange(q.id, e.target.value)
                        }
                      />
                    )}
                    {q.type_question === "LONG" && (
                      <textarea
                        rows="3"
                        className={inputClass + " resize-none"}
                        onChange={(e) =>
                          handleReponseChange(q.id, e.target.value)
                        }
                      />
                    )}
                    {q.type_question === "NUMERIQUE" && (
                      <input
                        type="number"
                        className={inputClass}
                        onChange={(e) =>
                          handleReponseChange(q.id, e.target.value)
                        }
                      />
                    )}
                    {q.type_question === "CHOIX_UNIQUE" && (
                      <div className="space-y-2">
                        {q.choix.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              className="accent-indigo-600"
                              onChange={() =>
                                handleReponseChange(q.id, c.texte)
                              }
                            />
                            <span className="text-sm text-slate-700">
                              {c.texte}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type_question === "CHOIX_MULTIPLE" && (
                      <div className="space-y-2">
                        {q.choix.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="accent-indigo-600"
                              onChange={() =>
                                handleReponseChoixMultiple(q.id, c.texte)
                              }
                            />
                            <span className="text-sm text-slate-700">
                              {c.texte}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.disqualifiant && (
                      <p className="text-[10px] text-red-500 mt-1">
                        ⚠️ Une mauvaise réponse peut disqualifier.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const questionsRequises =
                    job.questionnaire.questions?.filter((q) => q.requis) || [];
                  for (const q of questionsRequises) {
                    if (
                      !reponses[q.id] ||
                      reponses[q.id].toString().trim() === ""
                    ) {
                      toast.error(`La question "${q.texte}" est obligatoire.`);
                      return;
                    }
                  }
                  setPostulationMode("taftech");
                }}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Suivant →
              </button>
            </div>
          ) : postulationMode === "taftech" ? (
            <div>
              <button
                onClick={() => setPostulationMode(null)}
                className="text-sm text-slate-500 hover:text-slate-900 font-medium mb-4 flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Changer d'option
              </button>

              <textarea
                value={lettreMotivation}
                onChange={(e) => setLettreMotivation(e.target.value)}
                placeholder="Lettre de motivation (optionnelle)..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none mb-4"
                rows="4"
              />
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={handlePostulerTafTech}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Envoi en cours..."
                    : "Envoyer ma candidature"}
                </button>
                <button
                  onClick={handleReviewClick}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-white border border-indigo-200 text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={15} />
                  Vérifier mon profil
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" />
                  Postulation rapide
                </h4>
                <button
                  onClick={() => setPostulationMode(null)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handlePostulerRapide} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">
                      Nom *
                    </label>
                    <input
                      type="text"
                      name="nom_rapide"
                      required
                      onChange={handleFastFormChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      name="prenom_rapide"
                      required
                      onChange={handleFastFormChange}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email_rapide"
                      required
                      onChange={handleFastFormChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      name="telephone_rapide"
                      required
                      onChange={handleFastFormChange}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">
                    CV (PDF, DOC) *
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center relative cursor-pointer hover:border-indigo-400 transition-colors">
                    <input
                      type="file"
                      name="cv_rapide"
                      accept=".pdf,.doc,.docx"
                      required
                      onChange={handleFastFormChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileText
                      size={24}
                      className="text-slate-300 mx-auto mb-2"
                    />
                    <p className="text-sm font-medium text-slate-600">
                      {fastForm.cv_rapide
                        ? fastForm.cv_rapide.name
                        : "Cliquez ou glissez votre CV"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">
                    Lettre de motivation (optionnelle)
                  </label>
                  <textarea
                    name="lettre_motivation"
                    onChange={handleFastFormChange}
                    rows="3"
                    className={inputClass + " resize-none"}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Envoi en cours..."
                    : "Envoyer ma candidature rapide"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      {showQuestionnaireModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {job.questionnaire.titre}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {job.questionnaire.questions?.length} question(s)
                </p>
              </div>
              <button
                onClick={() => setShowQuestionnaireModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {job.questionnaire.questions?.map((q) => (
                <div
                  key={q.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                >
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    {q.texte}
                    {q.requis && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  {q.type_question === "COURT" && (
                    <input
                      className={inputClass}
                      onChange={(e) =>
                        handleReponseChange(q.id, e.target.value)
                      }
                    />
                  )}
                  {q.type_question === "LONG" && (
                    <textarea
                      rows="3"
                      className={inputClass + " resize-none"}
                      onChange={(e) =>
                        handleReponseChange(q.id, e.target.value)
                      }
                    />
                  )}
                  {q.type_question === "NUMERIQUE" && (
                    <input
                      type="number"
                      className={inputClass}
                      onChange={(e) =>
                        handleReponseChange(q.id, e.target.value)
                      }
                    />
                  )}
                  {q.type_question === "CHOIX_UNIQUE" && (
                    <div className="space-y-2">
                      {q.choix.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            className="accent-indigo-600"
                            onChange={() => handleReponseChange(q.id, c.texte)}
                          />
                          <span className="text-sm text-slate-700">
                            {c.texte}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type_question === "CHOIX_MULTIPLE" && (
                    <div className="space-y-2">
                      {q.choix.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="accent-indigo-600"
                            onChange={() =>
                              handleReponseChoixMultiple(q.id, c.texte)
                            }
                          />
                          <span className="text-sm text-slate-700">
                            {c.texte}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {q.disqualifiant && (
                    <p className="text-[10px] text-red-500 mt-1">
                      ⚠️ Une mauvaise réponse peut disqualifier.
                    </p>
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowQuestionnaireModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const questionsRequises =
                      job.questionnaire.questions?.filter((q) => q.requis) ||
                      [];
                    for (const q of questionsRequises) {
                      if (
                        !reponses[q.id] ||
                        reponses[q.id].toString().trim() === ""
                      ) {
                        toast.error(
                          `La question "${q.texte}" est obligatoire.`,
                        );
                        return;
                      }
                    }
                    setShowQuestionnaireModal(false);
                    setPostulationMode("taftech");
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Suivant →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default JobDetail;
