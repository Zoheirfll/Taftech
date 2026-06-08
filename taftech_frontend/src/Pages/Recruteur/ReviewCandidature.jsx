import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
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

  const calculerCompletionProfil = () => {
    if (!profil) return 0;
    let points = 0;
    if (profil.telephone) points += 10;
    if (profil.photo_profil) points += 10;
    if (profil.cv_pdf) points += 10;
    if (profil.titre_professionnel) points += 10;
    if (profil.wilaya && profil.commune) points += 10;
    if (profil.diplome) points += 10;
    if (profil.specialite) points += 10;
    if (profil.experiences_detail?.length > 0) points += 10;
    if (profil.formations_detail?.length > 0) points += 10;
    if (profil.competences?.split(",").filter((t) => t).length > 0)
      points += 10;
    return points;
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

  const getMediaUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http") ? path : `http://127.0.0.1:8000${path}`;
  };

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
      return <p className="text-slate-400 italic text-xs">Non renseigné</p>;
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
      <div className="text-center p-12 text-slate-500">
        Erreur de chargement.
      </div>
    );

  const profileCompletion = calculerCompletionProfil();
  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 mb-24">
      {/* EN-TÊTE */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          Postuler pour : <span className="text-indigo-600">{job.titre}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {job.entreprise?.nom_entreprise || "Entreprise anonyme"}
        </p>
      </div>

      {/* AVERTISSEMENT COMPLETION */}
      {profileCompletion < 100 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Profil rempli à {profileCompletion}%
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Un profil incomplet diminue la précision du matching IA.
            </p>
          </div>
          <Link
            to="/profil"
            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors"
          >
            Compléter
          </Link>
        </div>
      )}

      {/* LETTRE DE MOTIVATION */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Lettre de motivation{" "}
            <span className="text-slate-400 font-normal">(optionnel)</span>
          </h2>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {["texte", "fichier"].map((mode) => (
              <button
                key={mode}
                onClick={() => setMotivationMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${motivationMode === mode ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
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
            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profil.photo_profil ? (
                <img
                  src={getMediaUrl(profil.photo_profil)}
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
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={11} />
                    {profil.wilaya}
                    {profil.commune ? ` · ${profil.commune}` : ""}
                  </span>
                )}
                {profil.diplome && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
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
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* PRÉFÉRENCES */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Préférences
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Secteur",
                  value: formatText(profil.secteur_souhaite),
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
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              CV joint
            </p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <FileText size={16} className="text-slate-400" />
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
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
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
                    <p className="text-xs text-indigo-600">{exp.entreprise}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
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
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
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
                    <p className="text-xs text-slate-500">
                      {form.etablissement}
                    </p>
                    {form.date_debut && (
                      <p className="text-xs text-slate-400 mt-0.5">
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
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Compétences
              </p>
              {renderTags(profil.competences)}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Langues
              </p>
              {renderTags(profil.langues)}
            </div>
          </div>
        </div>
      </div>

      {/* BARRE FIXE BAS */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center z-50 shadow-lg">
        <Link
          to={`/jobs/${id}`}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
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
