import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { notifier } from "../../utils/notifier";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl, candidatFichierUrl } from "../../utils/mediaUrl";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { useModaleNIN, reponseNinRequis } from "../../Components/ModalNIN";
import {
  MapPin,
  GraduationCap,
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Rocket,
  ExternalLink,
  Calendar,
  Briefcase,
  Sparkles,
  BadgeCheck,
  Languages,
} from "lucide-react";
import { formatDatePrecise, formatAge } from "../../utils/cvDates";
import { nomWilaya } from "../../utils/wilaya";

const STATUT_FORMATION = {
  OBTENU: { label: "Obtenu", className: "bg-emerald-50 text-emerald-700" },
  EN_COURS: { label: "En cours", className: "bg-amber-50 text-amber-700" },
  INTERROMPU: { label: "Interrompu", className: "bg-slate-100 text-slate-600" },
};

const ReviewCandidature = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { demanderNIN, modaleNIN } = useModaleNIN();
  const [motivationMode, setMotivationMode] = useState("texte");
  const [lettreTexte, setLettreTexte] = useState("");
  const [lettreFile, setLettreFile] = useState(null);
  // S12 — réponses du candidat aux exigences impératives de l'offre (permis, habilitation...) :
  // exigenceId -> { statut, justificatif }. Statut par défaut INCONNU si non touché (jamais un
  // rejet automatique, cf. jobs/models.py::ReponseExigence).
  const [reponsesExigences, setReponsesExigences] = useState({});
  // Questionnaire de l'offre (job.questionnaire) — jusqu'ici uniquement collecté dans la modale
  // de JobDetail.jsx pour le bouton "Envoyer ma candidature" ; un candidat passant par "Vérifier
  // mon profil" (cette page) atterrissait sans jamais revoir ces questions, et sa candidature
  // partait sans aucune réponse ("Pas de réponse" côté recruteur, même s'il avait déjà répondu
  // dans la modale — perdu à la navigation). Rendu ici indépendamment pour que le flux fonctionne
  // quel que soit le chemin d'entrée.
  const [reponsesQuestionnaire, setReponsesQuestionnaire] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobData, profilData] = await Promise.all([
          jobsService.getJobById(id),
          jobsService.getProfilCandidat(),
        ]);
        setJob(jobData);
        setProfil(profilData);
      } catch (err) {
        notifier.echec("Chargement du profil impossible", err);
        reportError("ECHEC_CHARGEMENT_REVIEW_CANDIDATURE", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const CHAMPS_PROFIL = [
    { label: "Téléphone", test: (p) => !!p.telephone },
    { label: "Photo de profil", test: (p) => !!p.photo_profil },
    { label: "CV", test: (p) => !!p.cv_pdf },
    { label: "Titre professionnel", test: (p) => !!p.titre_professionnel },
    { label: "Wilaya / Commune", test: (p) => !!(p.wilaya && p.commune) },
    { label: "Diplôme", test: (p) => !!(p.diplome_ref_libelle || p.niveau_scolaire_ref_libelle || p.diplome) },
    { label: "Métier", test: (p) => !!p.metier },
    { label: "Expériences", test: (p) => p.experiences_detail?.length > 0 },
    { label: "Formations", test: (p) => p.formations_detail?.length > 0 },
    { label: "Compétences", test: (p) => p.competences?.split(",").filter((t) => t).length > 0 },
  ];

  const calculerCompletionProfil = () => {
    if (!profil) return 0;
    return CHAMPS_PROFIL.filter((c) => c.test(profil)).length * 10;
  };

  const getChampsManquants = () => {
    if (!profil) return [];
    return CHAMPS_PROFIL.filter((c) => !c.test(profil)).map((c) => c.label);
  };

  const validateQuestionnaire = () => {
    const questionsRequises = job?.questionnaire?.questions?.filter((q) => q.requis) || [];
    for (const q of questionsRequises) {
      const val = reponsesQuestionnaire[q.id];
      if (!val || val.toString().trim() === "") {
        notifier.erreur("Question obligatoire", `Répondez à la question « ${q.texte} ».`);
        return false;
      }
    }
    return true;
  };

  const handleReponseQuestionChange = (questionId, value) =>
    setReponsesQuestionnaire((prev) => ({ ...prev, [questionId]: value }));

  const handleReponseQuestionChoixMultiple = (questionId, value) => {
    setReponsesQuestionnaire((prev) => {
      const current = prev[questionId] ? prev[questionId].split(",").filter(Boolean) : [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: updated.join(",") };
    });
  };

  const handleConfirm = async () => {
    if (job?.questionnaire && !validateQuestionnaire()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (job?.questionnaire) {
        formData.append("reponses", JSON.stringify(reponsesQuestionnaire));
      }
      if (motivationMode === "texte" && lettreTexte.trim()) {
        formData.append("lettre_motivation", lettreTexte);
      } else if (motivationMode === "fichier" && lettreFile) {
        formData.append("lettre_motivation_file", lettreFile);
      }
      if (job?.exigences_imperatives?.length > 0) {
        const reponses = job.exigences_imperatives.map((e) => ({
          exigence_id: e.id,
          statut: reponsesExigences[e.id]?.statut || "INCONNU",
        }));
        formData.append("reponses_exigences", JSON.stringify(reponses));
        job.exigences_imperatives.forEach((e) => {
          const fichier = reponsesExigences[e.id]?.justificatif;
          if (fichier) formData.append(`justificatif_exigence_${e.id}`, fichier);
        });
      }
      await jobsService.postuler(id, formData);
      notifier.succes("Candidature envoyée");
      navigate("/mes-candidatures");
    } catch (err) {
      setSubmitting(false);
      // NIN exigé par l'ANEM : on le demande, puis la candidature repart toute seule.
      if (reponseNinRequis(err)) {
        demanderNIN(handleConfirm);
        return;
      }
      notifier.erreur("Candidature impossible", apiErrMsg(err, "Une erreur est survenue ou la candidature a déjà été envoyée."));
      reportError("ECHEC_SOUMISSION_CANDIDATURE", err);
    }
  };

  const getMediaUrl = mediaUrl;

  const formatText = (text) => {
    if (!text) return "Non spécifié";
    return text
      .replace(/_/g, " ")
      .replace(
        /\w\S*/g,
        (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase(),
      );
  };

  const renderTags = (data) => {
    if (!data)
      return <p className="text-slate-600 italic text-xs">Non renseigné</p>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {data
          .split(",")
          .filter((i) => i.trim())
          .map((item, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md"
            >
              {item.trim()}
            </span>
          ))}
      </div>
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  if (!job || !profil)
    return (
      <div className="text-center p-12 text-slate-700">
        Erreur de chargement.
      </div>
    );

  const profileCompletion = calculerCompletionProfil();
  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const champsManquants = getChampsManquants();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-28">
      {/* EN-TÊTE — bandeau dégradé, plus distinctif que le reste du site */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-indigo-600 to-violet-700 px-6 py-7 mb-5 shadow-lg shadow-indigo-200/50">
        <Sparkles size={90} className="absolute -right-4 -top-4 text-white/10 rotate-12" />
        <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-200">
          Dernière étape
        </p>
        <h1 className="text-xl font-bold text-white mt-1">
          {job.titre}
        </h1>
        <p className="text-sm text-indigo-100 mt-1">
          {job.entreprise?.nom_entreprise || "Entreprise anonyme"}
        </p>
      </div>

      {/* COMPLÉTION DU PROFIL — anneau de progression au lieu d'une simple barre */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex items-center gap-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 40 40" className="w-14 h-14 -rotate-90">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke={profileCompletion === 100 ? "#10b981" : "#4f46e5"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 * (1 - profileCompletion / 100)}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900">
            {profileCompletion}%
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Profil prêt pour cette candidature</p>
          {champsManquants.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {champsManquants.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-800 text-xs font-medium rounded-md"
                >
                  <AlertTriangle size={11} /> {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <BadgeCheck size={13} /> Rien ne manque, votre profil est complet.
            </p>
          )}
        </div>
        {profileCompletion < 100 && (
          <Link
            to="/profil"
            className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap"
          >
            Compléter
          </Link>
        )}
      </div>

      {/* LETTRE DE MOTIVATION */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Lettre de motivation{" "}
            <span className="text-slate-600 font-normal">(optionnel)</span>
          </h2>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {["texte", "fichier"].map((mode) => (
              <button
                key={mode}
                onClick={() => setMotivationMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${motivationMode === mode ? "bg-white text-indigo-600 shadow-sm" : "text-slate-700 hover:text-slate-800"}`}
              >
                {mode === "texte" ? "Texte" : "Fichier"}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {motivationMode === "texte" ? (
            <textarea
              rows="5"
              className={inputClass + " resize-none"}
              placeholder="Rédigez votre lettre de motivation..."
              value={lettreTexte}
              onChange={(e) => setLettreTexte(e.target.value)}
            />
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center relative cursor-pointer hover:border-indigo-400 transition-colors group">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setLettreFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileText size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
                {lettreFile
                  ? lettreFile.name
                  : "Cliquez ou glissez votre fichier (PDF/Word)"}
              </p>
              {lettreFile && (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  ✓ Fichier prêt
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EXIGENCES IMPÉRATIVES DE L'OFFRE (S12) */}
      {job?.exigences_imperatives?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Exigences de cette offre</h2>
            <p className="text-xs text-slate-600 mt-1">
              Déclarez si vous répondez à chaque exigence — le recruteur pourra vérifier ensuite, cela n'affecte pas votre score de compatibilité.
            </p>
          </div>
          <div className="p-5 space-y-4">
            {job.exigences_imperatives.map((e) => (
              <div key={e.id} className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-900">{e.label}</p>
                {e.description && <p className="text-xs text-slate-600 mt-0.5">{e.description}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { value: "SATISFAIT", label: "Oui, j'y réponds" },
                    { value: "NON_SATISFAIT", label: "Non" },
                    { value: "INCONNU", label: "Je ne sais pas" },
                  ].map((opt) => {
                    const actif = (reponsesExigences[e.id]?.statut || "INCONNU") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setReponsesExigences((prev) => ({ ...prev, [e.id]: { ...prev[e.id], statut: opt.value } }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${actif ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {e.justificatif_requis && reponsesExigences[e.id]?.statut === "SATISFAIT" && (
                  <div className="mt-3">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Justificatif (recommandé)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(ev) => setReponsesExigences((prev) => ({ ...prev, [e.id]: { ...prev[e.id], justificatif: ev.target.files[0] } }))}
                      className="text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUESTIONNAIRE DE L'OFFRE */}
      {job?.questionnaire?.questions?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              {job.questionnaire.titre || "Questionnaire de l'offre"}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Le recruteur souhaite obtenir ces informations avant votre candidature.
            </p>
          </div>
          <div className="p-5 space-y-4">
            {job.questionnaire.questions.map((q) => (
              <div key={q.id} className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-900 mb-2">
                  {q.texte}
                  {q.requis && <span className="text-red-500 ml-1">*</span>}
                </p>
                {q.type_question === "COURT" && (
                  <input className={inputClass} onChange={(e) => handleReponseQuestionChange(q.id, e.target.value)} />
                )}
                {q.type_question === "LONG" && (
                  <textarea rows="3" className={inputClass + " resize-none"} onChange={(e) => handleReponseQuestionChange(q.id, e.target.value)} />
                )}
                {q.type_question === "NUMERIQUE" && (
                  <input type="number" className={inputClass} onChange={(e) => handleReponseQuestionChange(q.id, e.target.value)} />
                )}
                {q.type_question === "CHOIX_UNIQUE" && (
                  <div className="space-y-2">
                    {q.choix.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={`q_${q.id}`} onChange={() => handleReponseQuestionChange(q.id, c.texte)} />
                        <span className="text-sm text-slate-700">{c.texte}</span>
                      </label>
                    ))}
                  </div>
                )}
                {q.type_question === "CHOIX_MULTIPLE" && (
                  <div className="space-y-2">
                    {q.choix.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" onChange={() => handleReponseQuestionChoixMultiple(q.id, c.texte)} />
                        <span className="text-sm text-slate-700">{c.texte}</span>
                      </label>
                    ))}
                  </div>
                )}
                {q.disqualifiant && (
                  <p className="text-[10px] text-red-500 mt-1">⚠️ Une mauvaise réponse peut disqualifier.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* APERÇU PROFIL */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-900">
            Aperçu de mon profil
          </h2>
          <Link
            to="/profil"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Modifier
          </Link>
        </div>
        <div className="p-5 space-y-6">
          {/* IDENTITÉ */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {profil.photo_profil ? (
                <img
                  src={candidatFichierUrl(profil.user_id, "photo")}
                  alt="Profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">
                {profil.first_name} {profil.last_name}
              </p>
              <p className="text-xs text-indigo-600 font-medium">
                {profil.titre_professionnel || "Aucun titre"}
              </p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {profil.wilaya && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                    <MapPin size={11} />
                    {nomWilaya(profil.wilaya)}
                    {profil.commune ? ` · ${profil.commune}` : ""}
                  </span>
                )}
                {profil.adresse && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                    <MapPin size={11} />
                    {profil.adresse}
                  </span>
                )}
                {formatAge(profil.date_naissance) && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                    <Calendar size={11} />
                    {formatAge(profil.date_naissance)}
                  </span>
                )}
                {(profil.diplome_ref_libelle || profil.niveau_scolaire_ref_libelle || profil.diplome) && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                    <GraduationCap size={11} />
                    {profil.diplome_ref_libelle || profil.niveau_scolaire_ref_libelle || formatText(profil.diplome)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  {
                    label: `Militaire : ${formatText(profil.service_militaire)}`,
                    active: profil.service_militaire === "DEGAGE",
                  },
                  {
                    label: profil.permis_conduire ? "✓ Permis" : "✕ Permis",
                    active: profil.permis_conduire,
                  },
                  {
                    label: profil.passeport_valide
                      ? "✓ Passeport"
                      : "✕ Passeport",
                    active: profil.passeport_valide,
                  },
                ].map(({ label, active }) => (
                  <span
                    key={label}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* PRÉFÉRENCES */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Préférences
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Métier souhaité",
                  value: profil.metier_souhaite_libelle || "Non renseigné",
                },
                {
                  label: "Salaire",
                  value: profil.salaire_souhaite || "À discuter",
                },
                { label: "Mobilité", value: formatText(profil.mobilite) },
                {
                  label: "Statut",
                  value: formatText(profil.situation_actuelle),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-slate-50 p-2.5 rounded-lg border border-slate-100"
                >
                  <p className="text-[10px] font-semibold text-slate-600 uppercase">
                    {label}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CV */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              CV joint
            </p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <FileText size={16} className="text-slate-600" />
              <span className="text-xs font-medium text-slate-700">
                {profil.cv_pdf
                  ? profil.cv_pdf.split("/").pop()
                  : "⚠️ Aucun CV téléversé"}
              </span>
            </div>
          </div>
          {/* BIO */}
          {profil.bio && (
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg italic mt-3">
              "{profil.bio}"
            </p>
          )}

          {/* LIENS */}
          {(profil.linkedin || profil.github) && (
            <div className="flex gap-2 mt-3">
              {profil.linkedin && (
                <a
                  href={profil.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <ExternalLink size={13} /> LinkedIn
                </a>
              )}
              {profil.github && (
                <a
                  href={profil.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <ExternalLink size={13} /> GitHub
                </a>
              )}
            </div>
          )}
          {/* EXPÉRIENCES — timeline avec puce icône */}
          {profil.experiences_detail?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                Expériences
              </p>
              <div className="space-y-4">
                {profil.experiences_detail.map((exp) => (
                  <div key={exp.id} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mt-0.5">
                      <Briefcase size={13} />
                    </div>
                    <div className="flex-1 min-w-0 pb-1 border-b border-slate-100 last:border-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {exp.titre_poste}
                      </p>
                      <p className="text-xs text-indigo-600">
                        {exp.entreprise}
                        {exp.metier_libelle && <span className="text-slate-600 font-normal ml-1">· {exp.metier_libelle}</span>}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {formatDatePrecise(exp.date_debut, exp.date_debut_precision)} — {exp.date_fin ? formatDatePrecise(exp.date_fin, exp.date_fin_precision) : "Aujourd'hui"}
                      </p>
                      {exp.description && (
                        <p className="text-xs text-slate-700 mt-1.5 leading-relaxed whitespace-pre-line">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FORMATIONS — type de diplôme + spécialité (référentiel v2) désormais visibles */}
          {profil.formations_detail?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                Formations
              </p>
              <div className="space-y-4">
                {profil.formations_detail.map((form) => {
                  const statutInfo = STATUT_FORMATION[form.statut];
                  return (
                    <div key={form.id} className="flex gap-3">
                      <div className="shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mt-0.5">
                        <GraduationCap size={13} />
                      </div>
                      <div className="flex-1 min-w-0 pb-1 border-b border-slate-100 last:border-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-900">
                            {form.diplome_ref_libelle || form.diplome || "Diplôme non précisé"}
                          </p>
                          {statutInfo && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statutInfo.className}`}>
                              {statutInfo.label}
                            </span>
                          )}
                        </div>
                        {form.specialite_ref_libelle && (
                          <p className="text-xs text-indigo-600 font-medium mt-0.5">
                            {form.specialite_ref_libelle}
                          </p>
                        )}
                        {form.description && (
                          <p className="text-xs text-slate-700 mt-0.5">
                            {form.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-700 mt-0.5">
                          {form.etablissement}
                        </p>
                        {(form.date_debut || form.date_fin || form.date_fin_prevue) && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            {form.date_debut ? `${formatDatePrecise(form.date_debut, form.date_debut_precision)} — ` : ""}{form.date_fin_prevue ? formatDatePrecise(form.date_fin_prevue) : form.date_fin ? formatDatePrecise(form.date_fin, form.date_fin_precision) : "En cours"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMPÉTENCES + LANGUES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Compétences
              </p>
              {profil.competences_detail?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profil.competences_detail.map((c) => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md flex items-center gap-1"
                    >
                      {c.label}
                      <span className="opacity-70 text-[10px]">{c.niveau_libelle}</span>
                    </span>
                  ))}
                </div>
              ) : (
                renderTags(profil.competences)
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Languages size={12} /> Langues
              </p>
              {renderTags(profil.langues)}
            </div>
          </div>
        </div>
      </div>

      {/* BARRE FIXE BAS */}
      <div className="sticky bottom-0 -mx-6 mt-6 bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center shadow-lg">
        <Link
          to={`/jobs/${id}`}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Annuler
        </Link>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Rocket size={16} />
          {submitting ? "Envoi en cours..." : "Confirmer & postuler"}
        </button>
      </div>
      {modaleNIN}
    </div>
  );
};

export default ReviewCandidature;
