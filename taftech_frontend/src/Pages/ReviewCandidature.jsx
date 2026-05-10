import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../utils/errorReporter"; // ✅ Import de la télémétrie

const ReviewCandidature = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // --- NOUVEAUX ÉTATS POUR LA LETTRE DE MOTIVATION ---
  const [motivationMode, setMotivationMode] = useState("texte"); // "texte" ou "fichier"
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
        toast.error("Erreur de chargement du profil.", err);
        reportError("ECHEC_CHARGEMENT_REVIEW_CANDIDATURE", err); // ✅ Ajout télémétrie
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();

      if (motivationMode === "texte" && lettreTexte.trim() !== "") {
        formData.append("lettre_motivation", lettreTexte);
      } else if (motivationMode === "fichier" && lettreFile) {
        formData.append("lettre_motivation_file", lettreFile);
      }

      await jobsService.postuler(id, formData);
      toast.success("Candidature envoyée avec succès !");
      navigate("/mes-candidatures");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Erreur ou candidature déjà envoyée.",
      );
      reportError("ECHEC_SOUMISSION_CANDIDATURE", err); // ✅ Ajout télémétrie
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
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
      );
  };

  const renderTags = (data) => {
    if (!data)
      return <p className="text-gray-400 italic text-sm">Non renseigné</p>;
    const items = data.split(",").filter((item) => item.trim() !== "");
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200"
          >
            {item.trim()}
          </span>
        ))}
      </div>
    );
  };

  if (loading)
    return (
      <div className="text-center p-20 font-bold text-blue-600 animate-pulse">
        Chargement de votre profil...
      </div>
    );
  if (!job || !profil)
    return <div className="text-center p-20">Erreur de chargement.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 mb-24 font-sans">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-gray-900">
          Postuler pour : <span className="text-blue-600">{job.titre}</span>
        </h1>
        <p className="text-gray-500 font-bold mt-2">
          🏢 {job.entreprise?.nom_entreprise || "Entreprise Anonyme"}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 flex items-center gap-4 shadow-sm">
        <div className="text-3xl">👀</div>
        <div>
          <p className="font-black text-blue-900 text-lg">
            Vérification du dossier
          </p>
          <p className="text-blue-700 text-sm font-medium mt-1">
            C'est exactement ce que le recruteur va recevoir. Assure-toi que
            tout est à jour !
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden mb-8">
        <div className="p-8 border-b border-gray-50 bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-900">
            Ma Lettre de Motivation{" "}
            <span className="text-gray-400 font-medium text-sm ml-2">
              (Optionnel)
            </span>
          </h2>
        </div>

        <div className="p-8">
          <div className="flex gap-4 mb-6 bg-gray-100 p-2 rounded-2xl w-fit">
            <button
              onClick={() => setMotivationMode("texte")}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${motivationMode === "texte" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              📝 Saisir un texte
            </button>
            <button
              onClick={() => setMotivationMode("fichier")}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${motivationMode === "fichier" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              📁 Joindre un fichier
            </button>
          </div>

          {motivationMode === "texte" ? (
            <textarea
              rows="6"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              placeholder="Rédigez votre lettre de motivation ici..."
              value={lettreTexte}
              onChange={(e) => setLettreTexte(e.target.value)}
            ></textarea>
          ) : (
            <div className="border-2 border-dashed border-gray-200 p-8 rounded-[2rem] text-center hover:border-blue-400 transition-all bg-blue-50/20 group relative cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setLettreFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">
                📁
              </span>
              <p className="text-sm font-black text-gray-700 group-hover:text-blue-600 transition-colors">
                {lettreFile
                  ? lettreFile.name
                  : "Cliquez ou glissez votre Lettre (PDF/Word)"}
              </p>
              {lettreFile && (
                <p className="text-xs text-green-600 font-bold mt-2">
                  ✓ Fichier prêt à être envoyé
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center p-8 border-b border-gray-50 bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-900">
            Aperçu de mon profil
          </h2>
          <Link
            to="/profil"
            className="text-blue-600 bg-white shadow-sm border border-gray-200 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-50 transition"
          >
            ✏️ MODIFIER
          </Link>
        </div>

        <div className="p-8 space-y-10">
          <section className="flex flex-col md:flex-row items-center gap-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <div className="w-24 h-24 bg-white rounded-[1.5rem] flex items-center justify-center text-gray-400 text-3xl overflow-hidden shrink-0 shadow-md border-4 border-white">
              {profil.photo_profil ? (
                <img
                  src={getMediaUrl(profil.photo_profil)}
                  alt="Profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                "👤"
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <p className="font-black text-gray-900 text-2xl uppercase tracking-tight">
                {profil.first_name} {profil.last_name}
              </p>
              <p className="text-blue-600 font-black mb-2">
                {profil.titre_professionnel || "Aucun titre professionnel"}
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-gray-600 font-bold mb-3">
                <span>📧 {profil.email}</span>
                <span>📞 {profil.telephone || "Non renseigné"}</span>
              </div>

              {/* 👇 LE BLOC IA (WILAYA, COMMUNE, DIPLÔME, SPÉCIALITÉ) 👇 */}
              <div className="mt-2 space-y-1 mb-4 bg-white p-3 rounded-xl border border-gray-200 inline-block w-full">
                <p className="text-gray-700 font-bold text-sm flex items-center justify-center md:justify-start gap-2">
                  📍 {profil.wilaya || "Wilaya non renseignée"}{" "}
                  {profil.commune ? `- ${profil.commune}` : ""}
                </p>
                <p className="text-gray-700 font-bold text-sm flex items-center justify-center md:justify-start gap-2 mt-1">
                  🎓 {formatText(profil.diplome) || "Diplôme non renseigné"} |
                  🛠️{" "}
                  {formatText(profil.specialite) || "Spécialité non renseignée"}
                </p>
              </div>
              {/* 👆 FIN DU BLOC IA 👆 */}

              <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-3 border-t border-gray-200">
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${profil.service_militaire === "DEGAGE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}
                >
                  Militaire : {formatText(profil.service_militaire)}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${profil.permis_conduire ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}
                >
                  {profil.permis_conduire ? "✓ Permis" : "✕ Permis"}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${profil.passeport_valide ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}
                >
                  {profil.passeport_valide ? "✓ Passeport" : "✕ Passeport"}
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3">
              Préférences de recrutement
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-50">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Secteur
                </p>
                <p className="text-sm font-black text-gray-900">
                  {formatText(profil.secteur_souhaite)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Salaire
                </p>
                <p className="text-sm font-black text-blue-600">
                  {profil.salaire_souhaite || "À discuter"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Mobilité
                </p>
                <p className="text-sm font-black text-gray-900">
                  {formatText(profil.mobilite)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Statut
                </p>
                <p className="text-sm font-black text-gray-900">
                  {formatText(profil.situation_actuelle)}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3">
              Pièce jointe (CV)
            </h3>
            <div className="flex justify-between items-center bg-gray-50 border border-gray-100 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <span className="text-sm font-black text-gray-700">
                  {profil.cv_pdf
                    ? profil.cv_pdf.split("/").pop()
                    : "⚠️ Aucun CV PDF téléversé"}
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-4">
              Expériences professionnelles
            </h3>
            {profil.experiences_detail &&
            profil.experiences_detail.length > 0 ? (
              <div className="space-y-6">
                {profil.experiences_detail.map((exp) => (
                  <div
                    key={exp.id}
                    className="relative pl-6 border-l-2 border-blue-200"
                  >
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-4 border-blue-600 rounded-full"></div>
                    <h4 className="font-black text-gray-800">
                      {exp.titre_poste}
                    </h4>
                    <p className="text-blue-600 font-bold text-xs uppercase my-1">
                      {exp.entreprise}
                    </p>
                    <p className="text-gray-400 text-[10px] font-black bg-gray-50 inline-block px-2 py-1 rounded">
                      {exp.date_debut} — {exp.date_fin || "Aujourd'hui"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 font-medium italic">
                Aucune expérience renseignée.
              </p>
            )}
          </section>

          <section>
            <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-4">
              Formations
            </h3>
            {profil.formations_detail && profil.formations_detail.length > 0 ? (
              <div className="space-y-6">
                {profil.formations_detail.map((form) => (
                  <div
                    key={form.id}
                    className="relative pl-6 border-l-2 border-indigo-200"
                  >
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-4 border-indigo-600 rounded-full"></div>
                    <h4 className="font-black text-gray-800">{form.diplome}</h4>
                    <p className="text-indigo-600 font-bold text-xs my-1">
                      {form.etablissement}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 font-medium italic">
                Aucune formation renseignée.
              </p>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3">
                Compétences
              </h3>
              {renderTags(profil.competences)}
            </section>
            <section>
              <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3">
                Langues
              </h3>
              {renderTags(profil.langues)}
            </section>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 flex justify-between items-center px-6 md:px-20 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <Link
          to={`/jobs/${id}`}
          className="text-gray-500 font-black text-sm hover:text-gray-800 transition"
        >
          ANNULER
        </Link>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className={`font-black py-4 px-10 rounded-[1.5rem] transition-all shadow-xl ${
            submitting
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-1 shadow-blue-200"
          }`}
        >
          {submitting ? "ENVOI..." : "🚀 CONFIRMER & POSTULER"}
        </button>
      </div>
    </div>
  );
};

export default ReviewCandidature;
