import React, { useState } from "react";
import { jobsService } from "../Services/jobsService";
import { authService } from "../Services/authService";
import { Link } from "react-router-dom";
import { reportError } from "../utils/errorReporter"; // Import de la télémétrie

const JobCard = ({ job }) => {
  const isLogged = authService.isAuthenticated();
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handlePostuler = async () => {
    try {
      const data = await jobsService.postuler(job.id);
      setStatusMessage("✅ " + data.message);
      setIsError(false);
    } catch (error) {
      // 1. Gestion de la télémétrie (Crash serveur ou réseau)
      if (!error.response || error.response.status >= 500) {
        reportError(`CRASH_POSTULATION_OFFRE_ID_${job.id}`, error);
      }

      // 2. Affichage du message d'erreur (Métier ou technique)
      setStatusMessage(
        "❌ " +
          (error.response?.data?.error || "Erreur lors de la candidature."),
      );
      setIsError(true);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 border-l-4 border-blue-600">
      <div className="flex justify-between items-start">
        <div>
          <Link to={`/offre/${job.id}`}>
            <h3 className="text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors">
              {job.titre}
            </h3>
          </Link>
          <p className="text-blue-600 font-semibold uppercase text-sm mt-1">
            {job.entreprise.nom_entreprise}
          </p>
        </div>
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
          {job.type_contrat}
        </span>
      </div>

      <div className="mt-4 flex items-center text-gray-500 text-sm space-x-4">
        <span>📍 {job.wilaya}</span>
        <span>💼 {job.experience_requise}</span>
        {job.salaire_propose && (
          <span className="font-medium text-green-600">
            💰 {job.salaire_propose}
          </span>
        )}
      </div>

      <hr className="my-4 border-gray-100" />

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400 italic">
          Publiée le{" "}
          {new Date(job.date_publication).toLocaleDateString("fr-FR")}
        </span>

        <div className="flex flex-col items-end">
          {statusMessage && (
            <span
              className={`text-sm font-bold mb-2 ${
                isError ? "text-red-500" : "text-green-500"
              }`}
            >
              {statusMessage}
            </span>
          )}

          <div className="flex items-center gap-4">
            <Link
              to={`/offre/${job.id}`}
              className="text-blue-600 font-bold hover:underline text-sm"
            >
              Voir les détails
            </Link>

            {isLogged ? (
              <button
                onClick={handlePostuler}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
              >
                Postuler
              </button>
            ) : (
              <span className="text-sm text-gray-500 italic border px-3 py-1 rounded">
                Connectez-vous pour postuler
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
