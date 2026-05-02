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
      RECUE: "bg-yellow-50 text-yellow-700 border-yellow-200",
      EN_COURS: "bg-blue-50 text-blue-700 border-blue-200",
      ENTRETIEN: "bg-orange-50 text-orange-700 border-orange-200",
      RETENU: "bg-green-100 text-green-800 border-green-300",
      REFUSE: "bg-red-50 text-red-700 border-red-200",
    };
    return styles[statut] || "bg-gray-100 text-gray-800";
  };

  const getMessageStatut = (statut) => {
    switch (statut) {
      case "RETENU":
        return "Félicitations ! Votre profil a été définitivement retenu pour ce poste.";
      case "REFUSE":
        return "Malheureusement, votre profil n'a pas été retenu pour cette offre. Ne vous découragez pas !";
      case "EN_COURS":
        return "Votre dossier a passé le premier filtre et est actuellement examiné par le recruteur.";
      case "ENTRETIEN":
        return "Bonne nouvelle ! Le recruteur souhaite vous rencontrer.";
      default:
        return "Votre candidature a été envoyée avec succès et attend d'être évaluée par l'entreprise.";
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center font-bold text-blue-600 animate-pulse">
        Chargement de vos candidatures...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-black text-gray-900 mb-8">
        Suivi de mes candidatures
      </h1>

      {candidatures.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl shadow-sm text-center border border-gray-200">
          <p className="text-gray-500 font-medium">
            Vous n'avez postulé à aucune offre pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {candidatures.map((cand) => (
            <div
              key={cand.id}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                <div>
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    {cand.offre_titre}
                    {cand.offre_est_cloturee && (
                      <span className="bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase">
                        🔒 Clôturée
                      </span>
                    )}
                  </h2>
                  <p className="text-blue-600 font-bold mt-1">
                    🏢 {cand.entreprise_nom}
                  </p>
                  <p className="text-xs font-bold text-gray-400 mt-2">
                    Postulé le{" "}
                    {new Date(cand.date_postulation).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>

                {/* BADGE DE STATUT */}
                <span
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${getBadgeStyle(cand.statut)}`}
                >
                  {cand.statut.replace("_", " ")}
                </span>
              </div>

              {/* MESSAGE DE SUIVI GÉNÉRAL */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-sm font-medium text-gray-700">
                  {getMessageStatut(cand.statut)}
                </p>
              </div>

              {/* 👇 LA "BOÎTE DE RÉCEPTION" (APPARAÎT SEULEMENT SI ENTRETIEN) 👇 */}
              {cand.statut === "ENTRETIEN" && cand.date_entretien && (
                <div className="mt-4 p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl shadow-sm">
                  <h4 className="text-sm font-black text-orange-900 flex items-center gap-2 mb-4 uppercase tracking-widest">
                    📅 Convocation à un entretien
                  </h4>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-orange-900">
                      L'entreprise vous a donné rendez-vous le : <br />
                      <strong className="text-lg font-black text-orange-700 bg-white px-3 py-1 rounded-lg inline-block mt-2 border border-orange-100">
                        {new Date(cand.date_entretien).toLocaleString("fr-FR", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </strong>
                    </p>

                    {cand.message_entretien && (
                      <div className="mt-4 p-4 bg-white/80 rounded-xl border border-orange-100 text-sm font-medium italic text-gray-700">
                        "{cand.message_entretien}"
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-orange-200/50 flex items-center gap-2">
                    <span className="text-xl">✉️</span>
                    <p className="text-xs text-orange-800 font-bold">
                      Ces détails vous ont également été envoyés sur votre
                      adresse e-mail.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MesCandidatures;
