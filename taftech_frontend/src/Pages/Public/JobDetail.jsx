import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl as getMediaUrl } from "../../utils/mediaUrl";
import { TooltipIcon } from "../../Components/Tooltip";
import {
  ArrowLeft, MapPin, Calendar, Briefcase, GraduationCap,
  Banknote, TrendingUp, FileText, Zap, CheckCircle, XCircle,
  Building2, ChevronDown,
} from "lucide-react";

const EXPERIENCE_LABELS = {
  DEBUTANT: "Débutant",
  JEUNE_DIPLOME: "Jeune diplômé",
  CONFIRME: "Confirmé / Expérimenté",
  SENIOR: "Senior",
  EXPERT: "Expert",
};

const DIPLOME_LABELS = {
  SANS_DIPLOME: "Sans diplôme",
  BEM: "BEM (Brevet)",
  BAC: "Baccalauréat",
  BAC_PLUS_2: "Bac +2",
  LICENCE: "Licence (Bac +3)",
  MASTER_1: "Master 1 (Bac +4)",
  MASTER_2: "Master 2 (Bac +5)",
  INGENIEUR: "Ingénieur",
  DOCTORAT: "Doctorat",
};

const CONTRAT_LABELS = {
  CDI: "CDI", CDD: "CDD", FREELANCE: "Freelance",
  STAGE: "Stage", ALTERNANCE: "Alternance", INTERIM: "Intérim",
};

const formatSalaire = (val) => {
  if (!val) return null;
  return Number(val).toLocaleString("fr-DZ") + " DA";
};

// Transforme les lignes commençant par "- " en liste <ul><li>
const renderTexte = (texte) => {
  if (!texte) return null;
  const lines = texte.split("\n");
  const result = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      result.push(
        <ul key={`ul-${result.length}`} className="space-y-1.5 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      listItems.push(trimmed.replace(/^[-•]\s+/, ""));
    } else {
      flushList();
      if (trimmed) {
        result.push(<p key={i} className="text-sm text-slate-700 leading-relaxed">{trimmed}</p>);
      }
    }
  });
  flushList();
  return <div className="space-y-2">{result}</div>;
};

const LogoEntreprise = ({ url, nom, size = 16, iconSize = 28 }) => {
  const [err, setErr] = useState(false);
  const sizeClass = `w-${size} h-${size}`;
  return (
    <div className={`${sizeClass} rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm`}>
      {url && !err ? (
        <img src={url} alt={nom} className="w-full h-full object-contain p-1" onError={() => setErr(true)} />
      ) : (
        <Building2 size={iconSize} className="text-slate-300" />
      )}
    </div>
  );
};

const SkeletonJobDetail = () => (
  <div className="bg-slate-50 min-h-screen animate-pulse">
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-slate-100 rounded-xl shrink-0" />
        <div className="space-y-2">
          <div className="h-5 w-40 bg-slate-100 rounded" />
          <div className="h-3 w-56 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <div className="h-4 w-28 bg-slate-100 rounded mb-5" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="h-7 w-2/3 bg-slate-100 rounded mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}
            </div>
            <div className="h-3 w-40 bg-slate-100 rounded mt-4" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="h-4 w-40 bg-slate-100 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-5/6 bg-slate-100 rounded" />
              <div className="h-3 w-4/5 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="h-12 bg-slate-100 rounded-xl" />
            <div className="h-3 w-16 bg-slate-100 rounded mx-auto" />
            <div className="h-12 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postulerStatus, setPostulerStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lettreMotivation, setLettreMotivation] = useState("");
  const [postulationMode, setPostulationMode] = useState(null);
  const [fastForm, setFastForm] = useState({
    nom_rapide: "", prenom_rapide: "", email_rapide: "",
    telephone_rapide: "", cv_rapide: null, lettre_motivation: "",
  });
  const [matchingScore, setMatchingScore] = useState(null);
  const [reponses, setReponses] = useState({});
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);

  useEffect(() => {
    const fetchJobAndRecommendation = async () => {
      try {
        const data = await jobsService.getJobById(id);
        setJob(data);
        if (authService.isAuthenticated() && authService.getUserRole() === "CANDIDAT") {
          try {
            const recommandations = await jobsService.getOffresRecommandees();
            const matchingJob = recommandations.find((r) => r.id === parseInt(id));
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
    if (!authService.isAuthenticated() || authService.getUserRole() !== "CANDIDAT") {
      toast.error("Vous devez être connecté en tant que candidat.");
      navigate("/login");
      return;
    }
    setIsSubmitting(true);
    try {
      await jobsService.postuler(id, { lettre_motivation: lettreMotivation, reponses: JSON.stringify(reponses) });
      setPostulerStatus("success");
    } catch (err) {
      setPostulerStatus("error");
      toast.error(err.response?.data?.error || "Erreur lors de la postulation.");
      reportError("ECHEC_POSTULER_TAFTECH", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewClick = () => {
    if (!authService.isAuthenticated() || authService.getUserRole() !== "CANDIDAT") {
      toast.error("Connectez-vous pour voir votre profil.");
      navigate("/login");
      return;
    }
    navigate(`/jobs/${id}/postuler`);
  };

  const handleFastFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "cv_rapide") setFastForm({ ...fastForm, cv_rapide: files[0] });
    else setFastForm({ ...fastForm, [name]: value });
  };

  const handlePostulerRapide = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!fastForm.cv_rapide) { toast.error("Veuillez joindre votre CV en format PDF ou Word."); return; }
    setIsSubmitting(true);
    const toastId = toast.loading("Envoi de votre candidature...");
    const formData = new FormData();
    Object.keys(fastForm).forEach((key) => {
      if (fastForm[key] !== null && fastForm[key] !== "") formData.append(key, fastForm[key]);
    });
    try {
      await jobsService.postulerRapide(id, formData);
      setPostulerStatus("success");
      toast.success("Candidature envoyée !", { id: toastId });
    } catch (err) {
      setPostulerStatus("error");
      toast.error(err.response?.data?.error || "Erreur lors de l'envoi.", { id: toastId });
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

  const handleReponseChange = (questionId, value) => setReponses({ ...reponses, [questionId]: value });

  const handleReponseChoixMultiple = (questionId, value) => {
    const current = reponses[questionId] ? reponses[questionId].split(",").filter(Boolean) : [];
    const exists = current.includes(value);
    const updated = exists ? current.filter((v) => v !== value) : [...current, value];
    setReponses({ ...reponses, [questionId]: updated.join(",") });
  };

  const validateQuestionnaire = () => {
    const questionsRequises = job.questionnaire?.questions?.filter((q) => q.requis) || [];
    for (const q of questionsRequises) {
      if (!reponses[q.id] || reponses[q.id].toString().trim() === "") {
        toast.error(`La question "${q.texte}" est obligatoire.`);
        return false;
      }
    }
    return true;
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const QuestionnaireForm = ({ onNext }) => (
    <div className="space-y-4">
      {job.questionnaire?.questions?.map((q) => (
        <div key={q.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-800 mb-2">
            {q.texte}{q.requis && <span className="text-red-500 ml-1">*</span>}
          </p>
          {q.type_question === "COURT" && <input className={inputClass} onChange={(e) => handleReponseChange(q.id, e.target.value)} />}
          {q.type_question === "LONG" && <textarea rows="3" className={inputClass + " resize-none"} onChange={(e) => handleReponseChange(q.id, e.target.value)} />}
          {q.type_question === "NUMERIQUE" && <input type="number" className={inputClass} onChange={(e) => handleReponseChange(q.id, e.target.value)} />}
          {q.type_question === "CHOIX_UNIQUE" && (
            <div className="space-y-2">
              {q.choix.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name={`q_${q.id}`} className="accent-indigo-600" onChange={() => handleReponseChange(q.id, c.texte)} />
                  <span className="text-sm text-slate-700">{c.texte}</span>
                </label>
              ))}
            </div>
          )}
          {q.type_question === "CHOIX_MULTIPLE" && (
            <div className="space-y-2">
              {q.choix.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-indigo-600" onChange={() => handleReponseChoixMultiple(q.id, c.texte)} />
                  <span className="text-sm text-slate-700">{c.texte}</span>
                </label>
              ))}
            </div>
          )}
          {q.disqualifiant && <p className="text-[10px] text-red-500 mt-1">⚠️ Une mauvaise réponse peut disqualifier.</p>}
        </div>
      ))}
      <button onClick={onNext} className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
        Suivant →
      </button>
    </div>
  );

  const PostulationPanel = () => (
    <div ref={panelRef} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">Postuler à cette offre</h3>
        {matchingScore !== null && (
          <div className={`mt-3 px-3 py-2 border rounded-lg flex items-center gap-2 ${getMatchingColor(matchingScore)}`}>
            <TrendingUp size={14} />
            <p className="text-xs font-medium flex items-center gap-1">
              Votre profil correspond à <strong>{matchingScore}%</strong>
              <TooltipIcon text="Score calculé sur 5 critères : spécialité (25pts), diplôme (20pts), expérience (20pts), région (20pts), compétences (15pts)." position="left" />
            </p>
          </div>
        )}
      </div>

      <div className="p-5">
        {postulerStatus === "success" ? (
          <div className="text-center py-4">
            <CheckCircle size={36} className="text-emerald-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Candidature envoyée !</h3>
            <p className="text-sm text-slate-500">Le recruteur a bien reçu votre profil. Bonne chance !</p>
          </div>
        ) : postulerStatus === "error" ? (
          <div className="text-center py-4">
            <XCircle size={36} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Oups...</h3>
            <p className="text-sm text-slate-500 mb-4">Vous avez déjà postulé ou une erreur est survenue.</p>
            <button onClick={() => { setPostulerStatus(""); setPostulationMode(null); }} className="text-sm text-indigo-600 font-semibold hover:underline">
              Réessayer
            </button>
          </div>
        ) : !postulationMode ? (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4 text-center">Prêt à postuler ?</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { if (job.questionnaire) setShowQuestionnaireModal(true); else setPostulationMode("taftech"); }}
                className="w-full flex flex-col items-center py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm"
              >
                <span className="text-sm font-semibold">Postuler avec mon profil TAFTECH</span>
                <span className="text-xs text-indigo-200 mt-0.5">
                  {job.questionnaire ? `Questionnaire requis · ${job.questionnaire.questions?.length || 0} questions` : "Recommandé — analysé par notre IA"}
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
                  <Zap size={15} className="text-amber-400" /> Postulation rapide (sans compte)
                </span>
                <span className="text-xs text-slate-400 mt-0.5">Envoyez juste votre CV en quelques secondes</span>
              </button>
            </div>
          </div>
        ) : postulationMode === "taftech" ? (
          <div>
            <button onClick={() => setPostulationMode(null)} className="text-sm text-slate-500 hover:text-slate-900 font-medium mb-4 flex items-center gap-1">
              <ArrowLeft size={14} /> Changer d'option
            </button>
            <textarea
              value={lettreMotivation}
              onChange={(e) => setLettreMotivation(e.target.value)}
              placeholder="Lettre de motivation (optionnelle)..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none mb-4"
              rows="4"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handlePostulerTafTech}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isSubmitting ? "Envoi en cours..." : "Envoyer ma candidature"}
              </button>
              <button
                onClick={handleReviewClick}
                className="w-full py-2.5 bg-white border border-indigo-200 text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={15} /> Vérifier mon profil
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap size={16} className="text-amber-500" /> Postulation rapide
              </h4>
              <button onClick={() => setPostulationMode(null)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <XCircle size={16} />
              </button>
            </div>
            <form onSubmit={handlePostulerRapide} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Nom *</label>
                  <input type="text" name="nom_rapide" required onChange={handleFastFormChange} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Prénom *</label>
                  <input type="text" name="prenom_rapide" required onChange={handleFastFormChange} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Email *</label>
                  <input type="email" name="email_rapide" required onChange={handleFastFormChange} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Téléphone *</label>
                  <input type="tel" name="telephone_rapide" required onChange={handleFastFormChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">CV (PDF, DOC) *</label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center relative cursor-pointer hover:border-indigo-400 transition-colors">
                  <input type="file" name="cv_rapide" accept=".pdf,.doc,.docx" required onChange={handleFastFormChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <FileText size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">{fastForm.cv_rapide ? fastForm.cv_rapide.name : "Cliquez ou glissez votre CV"}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Lettre de motivation (optionnelle)</label>
                <textarea name="lettre_motivation" onChange={handleFastFormChange} rows="3" className={inputClass + " resize-none"} />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isSubmitting ? "Envoi en cours..." : "Envoyer ma candidature rapide"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) return <SkeletonJobDetail />;

  if (error) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <p className="text-slate-700 font-medium">{error}</p>
      <Link to="/offres" className="text-sm text-indigo-600 font-semibold hover:underline">Retourner aux offres</Link>
    </div>
  );

  if (!job) return null;

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* BANDEAU ENTREPRISE */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-4 py-5">
            <LogoEntreprise url={getMediaUrl(job.entreprise?.logo_url)} nom={job.entreprise?.nom_entreprise} size={16} iconSize={28} />
            <div>
              <Link to={`/entreprise/${job.entreprise?.slug}`} className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                {job.entreprise?.nom_entreprise}
              </Link>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                {job.entreprise?.secteur && <span className="text-sm text-slate-500 flex items-center gap-1"><Briefcase size={13} />{job.entreprise.secteur}</span>}
                {job.wilaya && <span className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={13} />{job.wilaya?.split(" - ")[1] || job.wilaya}{job.commune ? `, ${job.commune}` : ""}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <Link to="/offres" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-5 transition-colors">
          <ArrowLeft size={15} /> Retour aux offres
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* COLONNE GAUCHE */}
          <div className="lg:col-span-2 space-y-5">

            {/* TITRE + INFOS CLÉS */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h1 className="text-2xl font-extrabold text-slate-900 leading-tight mb-4">{job.titre}</h1>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                {job.wilaya && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Lieu de travail</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1"><MapPin size={12} className="text-indigo-500" />{job.wilaya?.split(" - ")[1] || job.wilaya}{job.commune ? `, ${job.commune}` : ""}</p>
                  </div>
                )}
                {job.type_contrat && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Type de contrat</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1"><Briefcase size={12} className="text-indigo-500" />{CONTRAT_LABELS[job.type_contrat] || job.type_contrat}</p>
                  </div>
                )}
                {job.experience_requise && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Expérience</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1"><TrendingUp size={12} className="text-indigo-500" />{EXPERIENCE_LABELS[job.experience_requise] || job.experience_requise}</p>
                  </div>
                )}
                {job.diplome && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Diplôme</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1"><GraduationCap size={12} className="text-indigo-500" />{DIPLOME_LABELS[job.diplome] || job.diplome}</p>
                  </div>
                )}
                {job.specialite && (
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">Spécialité</p>
                    <p className="text-sm font-semibold text-indigo-700">{job.specialite}</p>
                  </div>
                )}
                {job.salaire_propose && (
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1">Salaire</p>
                    <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1"><Banknote size={12} />{formatSalaire(job.salaire_propose)}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar size={12} />
                  Publié le {new Date(job.date_publication).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                {job.jours_restants !== null && job.jours_restants !== undefined && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${job.jours_restants <= 7 ? "bg-red-50 text-red-600" : job.jours_restants <= 30 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {job.jours_restants === 0 ? "Expire aujourd'hui" : `Expire dans ${job.jours_restants} jour${job.jours_restants > 1 ? "s" : ""}`}
                  </span>
                )}
              </div>
            </div>

            {/* SECTIONS CONTENU */}
            {job.description && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-extrabold text-slate-900 mb-4 pb-3 border-b border-slate-100">Description du poste</h2>
                {renderTexte(job.description)}
              </div>
            )}
            {job.missions && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-extrabold text-slate-900 mb-4 pb-3 border-b border-slate-100">Missions & Tâches</h2>
                {renderTexte(job.missions)}
              </div>
            )}
            {job.profil_recherche && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-extrabold text-slate-900 mb-4 pb-3 border-b border-slate-100">Profil recherché</h2>
                {renderTexte(job.profil_recherche)}
              </div>
            )}

            {job.questionnaire && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-amber-500 text-lg shrink-0">📋</span>
                <div>
                  <p className="text-sm font-bold text-amber-900">Questionnaire requis</p>
                  <p className="text-xs text-amber-700 mt-0.5">{job.questionnaire.titre} · {job.questionnaire.questions?.length || 0} question(s) à remplir avant de postuler</p>
                </div>
              </div>
            )}
          </div>

          {/* COLONNE DROITE */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <PostulationPanel />

              {/* LIEN ENTREPRISE simplifié — sans doublon logo/nom */}
              {job.entreprise && (
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">À propos de l'entreprise</p>
                  <p className="text-sm font-semibold text-slate-900 mb-0.5">{job.entreprise.nom_entreprise}</p>
                  {job.entreprise.secteur && <p className="text-xs text-slate-500 mb-3">{job.entreprise.secteur}</p>}
                  <Link
                    to={`/entreprise/${job.entreprise.slug}`}
                    className="block w-full text-center py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    Voir la page entreprise →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOUTON FLOTTANT MOBILE */}
      {postulerStatus !== "success" && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-40 shadow-lg">
          <button
            onClick={() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Postuler à cette offre <ChevronDown size={16} />
          </button>
        </div>
      )}

      {/* MODAL QUESTIONNAIRE */}
      {showQuestionnaireModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">{job.questionnaire.titre}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{job.questionnaire.questions?.length} question(s)</p>
              </div>
              <button onClick={() => setShowQuestionnaireModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <QuestionnaireForm onNext={() => {
                if (!validateQuestionnaire()) return;
                setShowQuestionnaireModal(false);
                setPostulationMode("taftech");
              }} />
              <button onClick={() => setShowQuestionnaireModal(false)} className="w-full py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;
