import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl, candidatFichierUrl } from "../../utils/mediaUrl";
import DomaineLabel from "../../Components/DomaineLabel";
import {
  MapPin,
  GraduationCap,
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Rocket,
  ExternalLink,
} from "lucide-react";

const ReviewCandidature = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [motivationMode, setMotivationMode] = useState("texte");
  const [lettreTexte, setLettreTexte] = useState("");
  const [lettreFile, setLettreFile] = useState(null);

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
        toast.error("Erreur de chargement du profil.");
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
    { label: "Diplôme", test: (p) => !!p.diplome },
    { label: "Spécialité", test: (p) => !!p.specialite },
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

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (motivationMode === "texte" && lettreTexte.trim()) {
        formData.append("lettre_motivation", lettreTexte);
      } else if (motivationMode === "fichier" && lettreFile) {
        formData.append("lettre_motivation_file", lettreFile);
      }
      await jobsService.postuler(id, formData);
      toast.success("Candidature envoyée !");
      navigate("/mes-candidatures");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Erreur ou candidature déjà envoyée.",
      );
      reportError("ECHEC_SOUMISSION_CANDIDATURE", err);
      setSubmitting(false);
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
      {/* EN-TÊTE */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          Postuler pour : <span className="text-indigo-600">{job.titre}</span>
        </h1>
        <p className="text-sm text-slate-700 mt-1">
          {job.entreprise?.nom_entreprise || "Entreprise anonyme"}
        </p>
      </div>

      {/* COMPLÉTION DU PROFIL */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-900">
            Profil complété à {profileCompletion}%
          </p>
          {profileCompletion < 100 && (
            <Link
              to="/profil"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Compléter
            </Link>
          )}
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${profileCompletion === 100 ? "bg-emerald-500" : "bg-indigo-600"}`}
            style={{ width: `${profileCompletion}%` }}
          />
        </div>
        {champsManquants.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {champsManquants.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-800 text-xs font-medium rounded-md"
              >
                <AlertTriangle size={11} /> {label}
              </span>
            ))}
          </div>
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
                    {profil.wilaya}
                    {profil.commune ? ` · ${profil.commune}` : ""}
                  </span>
                )}
                {profil.adresse && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                    <MapPin size={11} />
                    {profil.adresse}
                  </span>
                )}
                {profil.diplome && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                    <GraduationCap size={11} />
                    {formatText(profil.diplome)}
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
                  label: "Secteur",
                  value: <DomaineLabel code={profil.secteur_souhaite} />,
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
          {/* EXPÉRIENCES */}
          {profil.experiences_detail?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                Expériences
              </p>
              <div className="space-y-3">
                {profil.experiences_detail.map((exp) => (
                  <div
                    key={exp.id}
                    className="pl-4 border-l-2 border-indigo-100"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {exp.titre_poste}
                    </p>
                    <p className="text-xs text-indigo-600">
                      {exp.entreprise}
                      {exp.secteur && <span className="text-slate-600 font-normal ml-1"><DomaineLabel code={exp.secteur} prefix="· " /></span>}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {exp.date_debut} — {exp.date_fin || "Aujourd'hui"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FORMATIONS */}
          {profil.formations_detail?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                Formations
              </p>
              <div className="space-y-3">
                {profil.formations_detail.map((form) => (
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
                    <p className="text-xs text-slate-700">
                      {form.etablissement}
                    </p>
                    {form.date_debut && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        {form.date_debut} — {form.date_fin || "En cours"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMPÉTENCES + LANGUES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Compétences
              </p>
              {renderTags(profil.competences)}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Langues
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
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Rocket size={16} />
          {submitting ? "Envoi en cours..." : "Confirmer & postuler"}
        </button>
      </div>
    </div>
  );
};

export default ReviewCandidature;
