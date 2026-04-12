import React, { useEffect, useState } from "react";
import { jobsService } from "../Services/jobsService";

const MesCandidatures = () => {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidatures = async () => {
      try {
        const data = await jobsService.getMesCandidatures();
        setCandidatures(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des candidatures", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidatures();
  }, []);

  const getBadgeStyle = (statut) => {
    const styles = {
      ACCEPTEE: "bg-green-100 text-green-800 font-bold border-green-200",
      REFUSEE: "bg-red-100 text-red-800 font-bold border-red-200",
      EXAMINEE: "bg-yellow-100 text-yellow-800 font-bold border-yellow-200",
      EN_ATTENTE: "bg-gray-100 text-gray-600 font-bold border-gray-200",
    };
    return styles[statut] || styles.EN_ATTENTE;
  };

  const getMessageStatut = (statut) => {
    switch (statut) {
      case "ACCEPTEE":
        return "Félicitations ! Votre profil a été retenu. L'entreprise vous contactera bientôt.";
      case "REFUSEE":
        return "Malheureusement, votre profil n'a pas été retenu pour cette offre.";
      case "EXAMINEE":
        return "Votre CV est en cours de lecture par le recruteur.";
      default:
        return "Votre candidature a été envoyée avec succès et attend d'être lue.";
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center font-bold text-blue-600">
        Chargement de vos candidatures...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
        Mes Candidatures
      </h1>

      {candidatures.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-200">
          <p className="text-gray-500">
            Vous n'avez postulé à aucune offre pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {candidatures.map((cand) => (
            <div
              key={cand.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {cand.offre_titre}
                  </h2>
                  <p className="text-blue-600 font-semibold">
                    {cand.entreprise_nom}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Postulé le{" "}
                    {new Date(cand.date_postulation).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>
                <span
                  className={`px-4 py-1.5 rounded-full text-xs border ${getBadgeStyle(cand.statut)}`}
                >
                  {cand.statut.replace("_", " ")}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-700">
                  {getMessageStatut(cand.statut)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MesCandidatures;
