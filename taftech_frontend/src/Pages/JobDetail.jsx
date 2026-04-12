import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { jobsService } from "../Services/jobsService";

const JobDetail = () => {
  const { id } = useParams(); // Récupère l'ID depuis l'URL (ex: /offre/3)
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postulerStatus, setPostulerStatus] = useState(""); // Pour le bouton Postuler

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
    try {
      await jobsService.postuler(id);
      setPostulerStatus("Candidature envoyée avec succès ! ✅");
    } catch (err) {
      setPostulerStatus("Erreur ou candidature déjà envoyée.", err);
    }
  };

  if (loading)
    return (
      <div className="text-center p-20 font-bold text-blue-600">
        Chargement de l'annonce...
      </div>
    );
  if (error)
    return (
      <div className="text-center p-20 text-red-600 font-bold">{error}</div>
    );
  if (!job) return null;

  return (
    <div className="max-w-4xl mx-auto p-8 mt-6">
      <Link to="/" className="text-blue-600 hover:underline mb-6 inline-block">
        ← Retour aux offres
      </Link>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* En-tête de l'offre */}
        <div className="bg-blue-600 p-8 text-white">
          <h1 className="text-3xl font-extrabold mb-2">{job.titre}</h1>
          <div className="flex flex-wrap gap-4 text-sm font-medium mt-4">
            <span className="bg-blue-700 px-3 py-1 rounded-full">
              📍 {job.wilaya || "Algérie"}
            </span>
            <span className="bg-blue-700 px-3 py-1 rounded-full">
              🏢 {job.entreprise_nom || "Entreprise Anonyme"}
            </span>
            <span className="bg-blue-700 px-3 py-1 rounded-full">
              📅 Publié le{" "}
              {new Date(job.date_publication).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>

        {/* Corps de l'offre */}
        <div className="p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3 border-b pb-2">
              Description du poste
            </h2>
            <p className="text-gray-600 whitespace-pre-line leading-relaxed">
              {job.description || "Aucune description fournie."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3 border-b pb-2">
              Missions
            </h2>
            <p className="text-gray-600 whitespace-pre-line leading-relaxed">
              {job.missions || "Aucune mission détaillée."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3 border-b pb-2">
              Profil recherché
            </h2>
            <p className="text-gray-600 whitespace-pre-line leading-relaxed">
              {job.profil_recherche || "Aucun profil spécifique renseigné."}
            </p>
          </section>

          {/* Zone de postulation */}
          <div className="mt-10 bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
            {postulerStatus ? (
              <p className="font-bold text-lg text-green-700">
                {postulerStatus}
              </p>
            ) : (
              <>
                <h3 className="font-bold text-gray-800 mb-4">
                  Intéressé(e) par cette opportunité ?
                </h3>
                <button
                  onClick={handlePostuler}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-10 rounded-lg transition duration-200 text-lg shadow-md"
                >
                  Postuler maintenant
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
