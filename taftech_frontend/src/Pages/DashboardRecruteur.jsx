import React, { useState, useEffect } from "react";
import { jobsService } from "../Services/jobsService";

const DashboardRecruteur = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await jobsService.getDashboard();
        setOffres(data);
      } catch (err) {
        console.error(err);
        setError(
          "Impossible de charger le tableau de bord. Avez-vous créé votre profil entreprise ?",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // NOUVELLE FONCTION : Changer le statut en temps réel
  const changerStatut = async (offreId, candidatureId, nouveauStatut) => {
    try {
      await jobsService.updateStatutCandidature(candidatureId, nouveauStatut);

      // On met à jour l'affichage immédiatement sans recharger la page
      setOffres(
        offres.map((offre) => {
          if (offre.id === offreId) {
            return {
              ...offre,
              candidatures: offre.candidatures.map((c) => {
                if (c.id === candidatureId)
                  return { ...c, statut: nouveauStatut };
                return c;
              }),
            };
          }
          return offre;
        }),
      );
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut.", err);
    }
  };

  // Fonction pour avoir des jolies couleurs selon le statut
  const getBadgeStyle = (statut) => {
    if (statut === "ACCEPTEE")
      return "bg-green-100 text-green-700 border-green-200";
    if (statut === "REFUSEE") return "bg-red-100 text-red-700 border-red-200";
    if (statut === "EXAMINEE")
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-blue-50 text-blue-600 border-blue-100"; // EN_ATTENTE
  };

  if (loading)
    return (
      <div className="text-center p-20 font-bold text-blue-600">
        Chargement de votre espace...
      </div>
    );
  if (error)
    return (
      <div className="text-center p-20 text-red-600 font-bold">{error}</div>
    );

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Mon Tableau de Bord Recruteur
        </h1>
        <p className="text-gray-500 mt-2">
          Gérez vos offres et recrutez les meilleurs talents.
        </p>
      </header>

      {offres.length === 0 ? (
        <div className="bg-white p-10 rounded-xl text-center text-gray-500 italic">
          Aucune offre publiée.
        </div>
      ) : (
        <div className="space-y-8">
          {offres.map((offre) => (
            <div
              key={offre.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center border-l-4 border-blue-600">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {offre.titre}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Publiée le{" "}
                    {new Date(offre.date_publication).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md mr-2">
                    {offre.candidatures.length}
                  </span>
                  Candidature(s)
                </h3>

                {offre.candidatures.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Aucun candidat pour le moment.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {offre.candidatures.map((candidature) => (
                      <li
                        key={candidature.id}
                        className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-gray-50 px-4 rounded transition"
                      >
                        <div className="mb-4 md:mb-0">
                          <p className="font-bold text-gray-800 text-lg">
                            {candidature.candidat.username}
                          </p>
                          <p className="text-sm text-gray-500">
                            {candidature.candidat.email}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded border ${getBadgeStyle(candidature.statut)}`}
                          >
                            {candidature.statut.replace("_", " ")}
                          </span>

                          {/* NOUVEAU : Les boutons d'action */}
                          {candidature.statut === "EN_ATTENTE" ||
                          candidature.statut === "EXAMINEE" ? (
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() =>
                                  changerStatut(
                                    offre.id,
                                    candidature.id,
                                    "ACCEPTEE",
                                  )
                                }
                                className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded font-bold transition shadow-sm"
                              >
                                ✅ Accepter
                              </button>
                              <button
                                onClick={() =>
                                  changerStatut(
                                    offre.id,
                                    candidature.id,
                                    "REFUSEE",
                                  )
                                }
                                className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded font-bold transition shadow-sm"
                              >
                                ❌ Refuser
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic mt-1">
                              Décision prise le{" "}
                              {new Date().toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardRecruteur;
