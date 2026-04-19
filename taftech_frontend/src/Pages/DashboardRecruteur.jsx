import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast"; // <-- IMPORT

const DashboardRecruteur = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("offres");
  const [entreprise, setEntreprise] = useState(null);
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [tempEntreprise, setTempEntreprise] = useState({});

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await jobsService.getDashboard();
        setEntreprise(data.entreprise);
        setOffres(data.offres);
      } catch (err) {
        if (
          err.response &&
          (err.response.status === 404 || err.response.status === 403)
        ) {
          navigate("/creer-entreprise");
        } else {
          setError("Impossible de charger les données du dashboard.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [navigate]);

  const handleEditClick = () => {
    setTempEntreprise({ ...entreprise });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      const {
        nom_entreprise: _nom,
        registre_commerce: _rc,
        ...dataToSend
      } = tempEntreprise;
      await jobsService.updateProfilEntreprise(dataToSend);
      setEntreprise({ ...entreprise, ...dataToSend });
      setIsEditing(false);
      toast.success("Profil mis à jour !"); // <-- TOAST SUCCESS
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde.", err); // <-- TOAST ERROR
    }
  };

  const changerStatut = async (offreId, candidatureId, nouveauStatut) => {
    try {
      await jobsService.updateStatutCandidature(candidatureId, nouveauStatut);
      setOffres(
        offres.map((offre) => {
          if (offre.id === offreId) {
            return {
              ...offre,
              candidatures: offre.candidatures.map((c) =>
                c.id === candidatureId ? { ...c, statut: nouveauStatut } : c,
              ),
            };
          }
          return offre;
        }),
      );
      toast.success("Statut de la candidature modifié."); // <-- TOAST SUCCESS
    } catch (err) {
      toast.error("Erreur de mise à jour du statut.", err); // <-- TOAST ERROR
    }
  };

  const getBadgeStyle = (statut) => {
    const styles = {
      ACCEPTEE: "bg-green-100 text-green-700 border-green-200",
      REFUSEE: "bg-red-100 text-red-700 border-red-200",
      EN_ATTENTE: "bg-blue-50 text-blue-600 border-blue-100",
    };
    return styles[statut] || styles.EN_ATTENTE;
  };

  const getCvUrl = (cvPath) => {
    if (!cvPath) return "#";
    return cvPath.startsWith("http")
      ? cvPath
      : `http://127.0.0.1:8000${cvPath}`;
  };

  if (loading)
    return (
      <div className="text-center p-20 font-bold text-blue-600 animate-pulse">
        Chargement de votre espace...
      </div>
    );

  if (error)
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-red-50 text-red-700 rounded-xl text-center font-bold">
        {error}
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-gray-900">
            Espace {entreprise?.nom_entreprise}
          </h1>
          <div className="mt-2">
            {entreprise?.est_approuvee ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-black rounded-full border border-green-200">
                ✓ COMPTE VÉRIFIÉ
              </span>
            ) : (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-black rounded-full border border-yellow-200">
                ⏳ EN ATTENTE DE VALIDATION
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate("/creer-offre")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-blue-100 transition-all hover:scale-105"
        >
          + PUBLIER UNE OFFRE
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-8">
        {["offres", "profil"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setIsEditing(false);
            }}
            className={`py-4 px-8 font-bold text-sm uppercase tracking-widest border-b-4 transition-all ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab === "offres"
              ? `Mes Annonces (${offres.length})`
              : "Profil Entreprise"}
          </button>
        ))}
      </div>

      {activeTab === "offres" && (
        <div className="space-y-6">
          {offres.length === 0 ? (
            <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-gray-200 text-center">
              <p className="text-gray-400 font-medium">
                Vous n'avez publié aucune offre pour le moment.
              </p>
            </div>
          ) : (
            offres.map((offre) => (
              <div
                key={offre.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center border-l-8 border-blue-600">
                  <h2 className="text-xl font-black text-gray-800">
                    {offre.titre}
                  </h2>
                  <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-lg shadow-sm">
                    {new Date(offre.date_publication).toLocaleDateString(
                      "fr-FR",
                    )}
                  </span>
                </div>
                <div className="p-6 overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="text-[10px] text-gray-400 uppercase tracking-widest border-b">
                        <th className="pb-4 text-left w-1/3">Candidat</th>
                        <th className="pb-4 text-left w-1/3">
                          Dossier & Lettre
                        </th>
                        <th className="pb-4 text-left">Statut</th>
                        <th className="pb-4 text-right">Décision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {offre.candidatures.map((cand) => (
                        <tr
                          key={cand.id}
                          className="hover:bg-blue-50/30 transition"
                        >
                          <td className="py-4 align-top">
                            <p className="font-black text-gray-900 text-sm uppercase">
                              {cand.candidat.last_name || "Nom inconnu"}{" "}
                              {cand.candidat.first_name || ""}
                            </p>
                            <div className="mt-1 space-y-1">
                              <p className="text-xs text-gray-500 font-medium">
                                📞 {cand.candidat.telephone || "Non renseigné"}
                              </p>
                              <p className="text-xs text-gray-500 font-medium">
                                ✉️ {cand.candidat.email}
                              </p>
                              {cand.candidat.diplome && (
                                <p className="text-xs text-purple-700 bg-purple-50 inline-block px-2 py-0.5 rounded border border-purple-100 mt-1 font-bold">
                                  🎓 {cand.candidat.diplome}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 align-top">
                            {cand.candidat.cv_pdf ? (
                              <a
                                href={getCvUrl(cand.candidat.cv_pdf)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition"
                              >
                                📄 TÉLÉCHARGER LE CV
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 italic">
                                Aucun CV fourni
                              </span>
                            )}
                            {cand.lettre_motivation && (
                              <details className="mt-3 group">
                                <summary className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline list-none flex items-center gap-1">
                                  <span>Voir la lettre de motivation</span>
                                  <span className="transition group-open:rotate-180">
                                    ▼
                                  </span>
                                </summary>
                                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 max-w-sm whitespace-pre-line leading-relaxed">
                                  {cand.lettre_motivation}
                                </div>
                              </details>
                            )}
                          </td>
                          <td className="py-4 align-top pt-5">
                            <span
                              className={`text-[10px] font-black px-3 py-1 rounded-full border ${getBadgeStyle(cand.statut)}`}
                            >
                              {cand.statut.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-4 text-right align-top pt-4">
                            {cand.statut === "EN_ATTENTE" && (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() =>
                                    changerStatut(offre.id, cand.id, "ACCEPTEE")
                                  }
                                  className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 shadow-sm transition"
                                  title="Accepter"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() =>
                                    changerStatut(offre.id, cand.id, "REFUSEE")
                                  }
                                  className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-sm transition"
                                  title="Refuser"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "profil" && entreprise && (
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 animate-fadeIn">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Configuration du Compte
            </h2>
            {!isEditing ? (
              <button
                onClick={handleEditClick}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition"
              >
                MODIFIER MON PROFIL
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  ANNULER
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition"
                >
                  SAUVEGARDER
                </button>
              </div>
            )}
          </div>

          <div className="space-y-12">
            <section>
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-6 bg-blue-50 inline-block px-3 py-1 rounded-md">
                Identité du Responsable
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { label: "Nom", name: "last_name", type: "text" },
                  { label: "Prénom", name: "first_name", type: "text" },
                  {
                    label: "Email Professionnel",
                    name: "email",
                    type: "email",
                  },
                  {
                    label: "Téléphone de contact",
                    name: "telephone",
                    type: "tel",
                  },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="text-[11px] font-black text-gray-400 uppercase mb-2 block">
                      {field.label}
                    </label>
                    {!isEditing ? (
                      <p className="text-lg font-bold text-gray-800 border-b-2 border-gray-50 pb-2">
                        {entreprise[field.name] || "--"}
                      </p>
                    ) : (
                      <input
                        type={field.type}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        value={tempEntreprise[field.name] || ""}
                        onChange={(e) =>
                          setTempEntreprise({
                            ...tempEntreprise,
                            [field.name]: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="pt-8 border-t border-gray-100">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-6 bg-blue-50 inline-block px-3 py-1 rounded-md">
                Informations de l'Entreprise
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[11px] font-black text-gray-400 uppercase mb-2 block">
                    Dénomination Sociale (Verrouillé)
                  </label>
                  <p className="text-lg font-black text-gray-300 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 cursor-not-allowed">
                    {entreprise.nom_entreprise}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-400 uppercase mb-2 block">
                    Registre de Commerce (Vérifié)
                  </label>
                  <p className="text-lg font-mono font-black text-gray-300 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 cursor-not-allowed">
                    {entreprise.registre_commerce}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-400 uppercase mb-2 block">
                    Secteur d'activité
                  </label>
                  {!isEditing ? (
                    <p className="text-lg font-bold text-gray-800 border-b-2 border-gray-50 pb-2">
                      {entreprise.secteur_activite}
                    </p>
                  ) : (
                    <select
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      value={tempEntreprise.secteur_activite}
                      onChange={(e) =>
                        setTempEntreprise({
                          ...tempEntreprise,
                          secteur_activite: e.target.value,
                        })
                      }
                    >
                      <option value="Informatique">Informatique</option>
                      <option value="Industrie">Industrie</option>
                      <option value="Santé">Santé</option>
                      <option value="BTP">BTP / Construction</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-400 uppercase mb-2 block">
                    Wilaya du siège
                  </label>
                  {!isEditing ? (
                    <p className="text-lg font-bold text-gray-800 border-b-2 border-gray-50 pb-2">
                      {entreprise.wilaya_siege || "Non renseigné"}
                    </p>
                  ) : (
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      value={tempEntreprise.wilaya_siege || ""}
                      onChange={(e) =>
                        setTempEntreprise({
                          ...tempEntreprise,
                          wilaya_siege: e.target.value,
                        })
                      }
                    />
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase mb-2 block">
                    Description de votre établissement
                  </label>
                  {!isEditing ? (
                    <div className="p-6 bg-gray-50 rounded-2xl text-gray-600 font-medium italic border border-gray-100 leading-relaxed">
                      {entreprise.description ||
                        "Aucune présentation rédigée pour le moment. Cliquez sur modifier pour enrichir votre profil."}
                    </div>
                  ) : (
                    <textarea
                      rows="5"
                      className="w-full p-6 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      placeholder="Décrivez l'activité, les valeurs et les opportunités de votre entreprise..."
                      value={tempEntreprise.description || ""}
                      onChange={(e) =>
                        setTempEntreprise({
                          ...tempEntreprise,
                          description: e.target.value,
                        })
                      }
                    />
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardRecruteur;
