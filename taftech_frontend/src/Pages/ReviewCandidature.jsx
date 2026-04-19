import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast"; // <-- IMPORT

const ReviewCandidature = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
        toast.error("Erreur de chargement du profil.", err); // <-- TOAST ERROR
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await jobsService.postuler(id, {});
      toast.success("Candidature envoyée avec succès !"); // <-- TOAST SUCCESS
      navigate("/mes-candidatures");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erreur ou candidature déjà envoyée.",
      ); // <-- TOAST ERROR
      setSubmitting(false);
    }
  };

  const getCvUrl = (cvPath) => {
    if (!cvPath) return "#";
    return cvPath.startsWith("http")
      ? cvPath
      : `http://127.0.0.1:8000${cvPath}`;
  };

  const renderBadges = (data) => {
    if (!data)
      return <p className="text-gray-400 italic text-sm">Non renseigné</p>;
    const items = Array.isArray(data)
      ? data
      : data.split(",").filter((item) => item.trim() !== "");
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border border-gray-200"
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
    <div className="max-w-3xl mx-auto p-4 md:p-8 mb-20">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-gray-900">
          {job.titre} chez{" "}
          {job.entreprise?.nom_entreprise || "cette entreprise"}
        </h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-center md:text-left">
        <p className="font-bold text-blue-800 text-sm">
          Vérifie ton profil avant de postuler
        </p>
        <p className="text-blue-600 text-xs mt-1">
          Assure-toi que toutes les informations sont correctes et à jour.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">
            Aperçu de mon profil
          </h2>
        </div>

        <div className="p-6 space-y-8">
          {/* SECTION 1 : MON CV */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-800">Mon CV</h3>
              <Link
                to="/profil"
                className="text-blue-600 bg-blue-50 p-2 rounded-full hover:bg-blue-100 transition"
                title="Modifier mon profil"
              >
                ✏️
              </Link>
            </div>
            <p className="text-blue-600 font-bold text-sm mb-2">
              {profil.titre_professionnel || "Candidat"}
            </p>
            <p className="text-xs text-gray-500 font-bold mb-2">Pièce jointe</p>
            <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xl">📄</span>
                <span className="text-sm font-bold text-gray-700">
                  {profil.cv_pdf
                    ? profil.cv_pdf.split("/").pop()
                    : "Aucun CV uploadé"}
                </span>
              </div>
              {profil.cv_pdf && (
                <div className="flex gap-2">
                  <a
                    href={getCvUrl(profil.cv_pdf)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition text-sm font-bold bg-blue-50 px-3 py-1 rounded"
                  >
                    👁️ Voir
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 2 : INFOS PERSONNELLES */}
          <section className="border-t border-gray-100 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-800">
                Informations personnelles
              </h3>
              <Link
                to="/profil"
                className="text-blue-600 bg-blue-50 p-2 rounded-full hover:bg-blue-100 transition"
              >
                ✏️
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-2xl overflow-hidden shrink-0">
                👤
              </div>
              <div>
                <p className="font-black text-gray-900">
                  {profil.last_name || "Nom"} {profil.first_name || "Prénom"}
                </p>
                <p className="text-sm text-gray-600 font-medium">
                  {profil.email}
                </p>
                <p className="text-sm text-gray-600 font-medium">
                  📞 {profil.telephone || "Téléphone non renseigné"}
                </p>
                {profil.nin && (
                  <p className="text-xs text-gray-400 mt-1">
                    NIN : {profil.nin}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 3 : EXPÉRIENCES */}
          <section className="border-t border-gray-100 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-800">Mes expériences</h3>
              <Link
                to="/profil"
                className="text-blue-600 font-black bg-blue-50 p-2 rounded-full hover:bg-blue-100 transition"
              >
                ✏️
              </Link>
            </div>
            <div>
              {profil.experiences ? (
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {profil.experiences}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Aucune expérience renseignée sur votre profil.
                </p>
              )}
            </div>
          </section>

          {/* SECTION 4 : FORMATIONS */}
          <section className="border-t border-gray-100 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-800">Mes formations</h3>
              <Link
                to="/profil"
                className="text-blue-600 font-black bg-blue-50 p-2 rounded-full hover:bg-blue-100 transition"
              >
                ✏️
              </Link>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="font-bold text-sm text-gray-900">
                {profil.diplome || "Diplôme non spécifié"}
              </p>
              {profil.specialite && (
                <p className="text-sm text-gray-600 mt-1">
                  🎓 Spécialité : {profil.specialite}
                </p>
              )}
            </div>
          </section>

          {/* SECTION 5 : COMPÉTENCES */}
          <section className="border-t border-gray-100 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-800">Mes compétences</h3>
              <Link
                to="/profil"
                className="text-blue-600 font-black bg-blue-50 p-2 rounded-full hover:bg-blue-100 transition"
              >
                ✏️
              </Link>
            </div>
            {renderBadges(profil.competences)}
          </section>

          {/* SECTION 6 : LANGUES */}
          <section className="border-t border-gray-100 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-800">Mes langues</h3>
              <Link
                to="/profil"
                className="text-blue-600 font-black bg-blue-50 p-2 rounded-full hover:bg-blue-100 transition"
              >
                ✏️
              </Link>
            </div>
            {renderBadges(profil.langues)}
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 flex justify-between items-center px-4 md:px-20 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link
          to={`/jobs/${id}`}
          className="text-blue-600 font-bold text-sm hover:underline"
        >
          Retour à l'annonce
        </Link>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className={`font-black py-3 px-8 rounded-full transition-all shadow-md ${
            submitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {submitting ? "Envoi en cours..." : "Confirmer ma candidature"}
        </button>
      </div>
    </div>
  );
};

export default ReviewCandidature;
