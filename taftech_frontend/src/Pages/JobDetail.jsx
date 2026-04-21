import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import { authService } from "../Services/authService"; // <-- NOUVEL IMPORT MAGIQUE

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postulerStatus, setPostulerStatus] = useState("");
  const [lettreMotivation, setLettreMotivation] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await jobsService.getJobById(id);
        setJob(data);
      } catch (err) {
        setError("Offre introuvable ou retirée.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handlePostuler = async () => {
    // NOUVELLE SÉCURITÉ : On vérifie via le service, pas avec le localStorage !
    if (
      !authService.isAuthenticated() ||
      authService.getUserRole() !== "CANDIDAT"
    ) {
      alert("Vous devez être connecté en tant que candidat pour postuler.");
      navigate("/login");
      return;
    }

    try {
      await jobsService.postuler(id, { lettre_motivation: lettreMotivation });
      setPostulerStatus("success");
    } catch (err) {
      setPostulerStatus("error", err);
    }
  };

  const handleReviewClick = () => {
    // MÊME CORRECTION ICI
    if (
      !authService.isAuthenticated() ||
      authService.getUserRole() !== "CANDIDAT"
    ) {
      alert("Vous devez être connecté en tant que candidat pour postuler.");
      navigate("/login");
      return;
    }
    navigate(`/jobs/${id}/postuler`);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold text-blue-600 animate-pulse">
          Chargement de l'annonce...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-2xl text-red-600 font-black mb-4">😕 {error}</div>
        <Link to="/" className="text-blue-600 font-bold hover:underline">
          Retourner à l'accueil
        </Link>
      </div>
    );

  if (!job) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 mt-6">
      <Link
        to="/"
        className="text-blue-600 font-bold hover:underline mb-6 inline-flex items-center gap-2 transition hover:-translate-x-1"
      >
        ← Retour aux offres
      </Link>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* EN-TÊTE DE L'OFFRE */}
        <div className="bg-blue-600 p-8 md:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
          <h1 className="text-3xl md:text-4xl font-black mb-4 relative z-10">
            {job.titre}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm font-bold mt-4 relative z-10">
            <span className="bg-white text-blue-800 px-4 py-1.5 rounded-full shadow-sm">
              🏢 {job.entreprise?.nom_entreprise || "Entreprise Anonyme"}
            </span>
            <span className="bg-blue-500 bg-opacity-50 px-4 py-1.5 rounded-full border border-blue-400">
              📍 {job.wilaya} {job.commune ? `- ${job.commune}` : ""}
            </span>
            <span className="bg-blue-500 bg-opacity-50 px-4 py-1.5 rounded-full border border-blue-400">
              📅 Publié le{" "}
              {new Date(job.date_publication).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-10">
          {/* ENCADRÉ DES CRITÈRES */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-6">
            {job.type_contrat && (
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Contrat
                </span>
                <span className="font-black text-gray-800">
                  {job.type_contrat}
                </span>
              </div>
            )}
            {job.experience_requise && (
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Expérience
                </span>
                <span className="font-black text-gray-800">
                  {job.experience_requise}
                </span>
              </div>
            )}
            {job.diplome && (
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Diplôme requis
                </span>
                <span className="font-black text-gray-800">{job.diplome}</span>
              </div>
            )}
            {job.specialite && (
              <div className="col-span-2 md:col-span-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Spécialité
                </span>
                <span className="font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md inline-block mt-1">
                  {job.specialite}
                </span>
              </div>
            )}
            {job.salaire_propose && (
              <div className="col-span-2 md:col-span-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Salaire
                </span>
                <span className="font-black text-green-600">
                  {job.salaire_propose}
                </span>
              </div>
            )}
          </div>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-600 rounded-full"></span>{" "}
              Description du poste
            </h2>
            <p className="text-gray-600 whitespace-pre-line leading-relaxed font-medium">
              {job.description || "Aucune description globale fournie."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>{" "}
              Missions principales
            </h2>
            <p className="text-gray-600 whitespace-pre-line leading-relaxed font-medium">
              {job.missions || "Aucune mission détaillée."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-purple-600 rounded-full"></span>{" "}
              Profil recherché
            </h2>
            <p className="text-gray-600 whitespace-pre-line leading-relaxed font-medium">
              {job.profil_recherche || "Aucun profil spécifique renseigné."}
            </p>
          </section>

          {/* ZONE DE POSTULATION */}
          <div className="mt-12 bg-gray-50 p-8 rounded-3xl text-center border-2 border-gray-100 shadow-sm relative overflow-hidden">
            {postulerStatus === "success" ? (
              <div className="animate-slideDown">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  ✅
                </div>
                <h3 className="font-black text-xl text-gray-900 mb-2">
                  Candidature envoyée !
                </h3>
                <p className="text-gray-500 font-medium">
                  Le recruteur a bien reçu votre profil.
                </p>
              </div>
            ) : postulerStatus === "error" ? (
              <div>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  ⚠️
                </div>
                <h3 className="font-black text-xl text-gray-900 mb-2">
                  Oups...
                </h3>
                <p className="text-gray-500 font-medium mb-6">
                  Vous avez déjà postulé à cette offre, ou une erreur est
                  survenue.
                </p>
                <button
                  onClick={() => setPostulerStatus("")}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <h3 className="font-black text-2xl text-gray-900 mb-3">
                  Prêt(e) à relever le défi ?
                </h3>
                <p className="text-gray-500 font-medium mb-6">
                  Postulez directement avec votre profil TafTech. Les recruteurs
                  auront accès à votre CV et vos compétences.
                </p>

                <textarea
                  value={lettreMotivation}
                  onChange={(e) => setLettreMotivation(e.target.value)}
                  placeholder="Rédigez une courte lettre de motivation (Optionnelle)..."
                  className="w-full p-4 mb-6 bg-white border border-gray-200 rounded-2xl focus:border-blue-500 outline-none resize-none font-medium text-gray-700 shadow-sm"
                  rows="4"
                ></textarea>

                <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={handlePostuler}
                    className="bg-gray-900 hover:bg-black text-white font-black py-4 px-8 rounded-2xl transition duration-200 text-lg shadow-xl hover:-translate-y-1 hover:shadow-2xl active:scale-95 w-full md:w-auto"
                  >
                    Envoyer ma candidature
                  </button>
                  <button
                    onClick={handleReviewClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl transition duration-200 text-lg shadow-xl hover:-translate-y-1 hover:shadow-2xl active:scale-95 w-full md:w-auto flex items-center justify-center gap-2"
                  >
                    👁️ Vérifier mon profil complet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
