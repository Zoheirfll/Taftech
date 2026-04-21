import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";

const DashboardRecruteur = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("offres");
  const [entreprise, setEntreprise] = useState(null);
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [tempEntreprise, setTempEntreprise] = useState({});
  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
    experiences: [],
    contrats: [],
  });

  const [selectedCandidature, setSelectedCandidature] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashData, constData] = await Promise.all([
          jobsService.getDashboard(),
          jobsService.getConstants(),
        ]);
        setConstants(constData);
        setEntreprise(dashData.entreprise);
        setOffres(dashData.offres);
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
        nom_entreprise: _n,
        registre_commerce: _r,
        ...dataToSend
      } = tempEntreprise;
      await jobsService.updateProfilEntreprise(dataToSend);
      setEntreprise({ ...entreprise, ...dataToSend });
      setIsEditing(false);
      toast.success("Profil mis à jour !");
    } catch (err) {
      (toast.error("Erreur lors de la sauvegarde."), console.log(err));
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
      toast.success("Statut de la candidature modifié.");

      if (selectedCandidature && selectedCandidature.id === candidatureId) {
        setSelectedCandidature({
          ...selectedCandidature,
          statut: nouveauStatut,
        });
      }
    } catch (err) {
      (toast.error("Erreur de mise à jour du statut."), console.log(err));
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
      return (
        <span className="text-gray-400 italic text-xs">
          Aucun renseignement
        </span>
      );
    return data
      .split(",")
      .filter((i) => i)
      .map((item, idx) => (
        <span
          key={idx}
          className="bg-gray-100 text-gray-700 text-[10px] font-black uppercase px-2 py-1 rounded-md border border-gray-200 mr-2 mb-2 inline-block"
        >
          {item.trim()}
        </span>
      ));
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
    <div className="max-w-6xl mx-auto p-8 font-sans">
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
            className={`py-4 px-8 font-bold text-sm uppercase tracking-widest border-b-4 transition-all ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
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
                        <th className="pb-4 text-center w-1/3">
                          Dossier Complet
                        </th>
                        <th className="pb-4 text-center">Statut</th>
                        <th className="pb-4 text-right">Décision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {offre.candidatures.map((cand) => (
                        <tr
                          key={cand.id}
                          className="hover:bg-blue-50/30 transition"
                        >
                          <td className="py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 overflow-hidden shadow-sm">
                                {cand.candidat.photo_profil ? (
                                  <img
                                    src={getMediaUrl(
                                      cand.candidat.photo_profil,
                                    )}
                                    alt="Profil"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <>
                                    {cand.candidat.first_name?.[0]}
                                    {cand.candidat.last_name?.[0]}
                                  </>
                                )}
                              </div>
                              <div>
                                <p className="font-black text-gray-900 text-sm uppercase">
                                  {cand.candidat.last_name}{" "}
                                  {cand.candidat.first_name}
                                </p>
                                <p className="text-xs text-blue-600 font-bold">
                                  {cand.candidat.titre_professionnel ||
                                    "Candidat"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 align-middle text-center">
                            <button
                              onClick={() =>
                                setSelectedCandidature({
                                  ...cand,
                                  offreId: offre.id,
                                })
                              }
                              className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm"
                            >
                              👁️ Voir le profil
                            </button>
                          </td>
                          <td className="py-4 align-middle text-center">
                            <span
                              className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase ${getBadgeStyle(cand.statut)}`}
                            >
                              {cand.statut.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-4 text-right align-middle">
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
                      {entreprise.secteur_activite || "Non renseigné"}
                    </p>
                  ) : (
                    <Select
                      name="secteur_activite"
                      options={constants.secteurs}
                      value={
                        constants.secteurs.find(
                          (s) => s.value === tempEntreprise.secteur_activite,
                        ) || null
                      }
                      onChange={(selected) =>
                        setTempEntreprise({
                          ...tempEntreprise,
                          secteur_activite: selected ? selected.value : "",
                        })
                      }
                      placeholder="Sélectionner..."
                      className="font-bold text-gray-700"
                      styles={{
                        control: (base) => ({
                          ...base,
                          padding: "0.4rem",
                          borderRadius: "0.75rem",
                          backgroundColor: "#f9fafb",
                          borderColor: "#e5e7eb",
                        }),
                      }}
                    />
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
                    <Select
                      name="wilaya_siege"
                      options={constants.wilayas}
                      value={
                        constants.wilayas.find(
                          (w) => w.value === tempEntreprise.wilaya_siege,
                        ) || null
                      }
                      onChange={(selected) =>
                        setTempEntreprise({
                          ...tempEntreprise,
                          wilaya_siege: selected ? selected.value : "",
                        })
                      }
                      placeholder="Sélectionner..."
                      className="font-bold text-gray-700"
                      styles={{
                        control: (base) => ({
                          ...base,
                          padding: "0.4rem",
                          borderRadius: "0.75rem",
                          backgroundColor: "#f9fafb",
                          borderColor: "#e5e7eb",
                        }),
                      }}
                    />
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase mb-2 block">
                    Description de l'établissement
                  </label>
                  {!isEditing ? (
                    <div className="p-6 bg-gray-50 rounded-2xl text-gray-600 font-medium italic border border-gray-100 leading-relaxed">
                      {entreprise.description ||
                        "Aucune présentation rédigée pour le moment."}
                    </div>
                  ) : (
                    <textarea
                      rows="5"
                      className="w-full p-6 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      placeholder="Décrivez l'entreprise..."
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

      {/* --- MODAL RECRUTEUR : PROFIL DU CANDIDAT --- */}
      {selectedCandidature && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-gray-900">
                Dossier de candidature
              </h2>
              <button
                onClick={() => setSelectedCandidature(null)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition font-bold shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-8 bg-white">
              {/* EN-TÊTE DU PROFIL */}
              <div className="flex flex-col md:flex-row items-center gap-6 bg-blue-50/30 p-6 rounded-2xl border border-blue-50">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-gray-400 text-3xl overflow-hidden shrink-0 shadow-sm border border-gray-100">
                  {selectedCandidature.candidat.photo_profil ? (
                    <img
                      src={getMediaUrl(
                        selectedCandidature.candidat.photo_profil,
                      )}
                      alt="Profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "👤"
                  )}
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="font-black text-gray-900 text-2xl uppercase tracking-tight">
                    {selectedCandidature.candidat.last_name}{" "}
                    {selectedCandidature.candidat.first_name}
                  </h3>
                  <p className="text-blue-600 font-bold mb-2">
                    {selectedCandidature.candidat.titre_professionnel ||
                      "Candidat"}
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start text-xs text-gray-600 font-bold mt-2">
                    <span>📧 {selectedCandidature.candidat.email}</span>
                    <span>
                      📞{" "}
                      {selectedCandidature.candidat.telephone ||
                        "Non renseigné"}
                    </span>
                  </div>

                  {/* ADMIN ET PREFS DANS L'ENTÊTE */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded">
                      🛡️{" "}
                      {formatText(
                        selectedCandidature.candidat.service_militaire,
                      )}
                    </span>
                    <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded">
                      🚗{" "}
                      {selectedCandidature.candidat.permis_conduire
                        ? "Permis B"
                        : "Sans permis"}
                    </span>
                    <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded">
                      ✈️{" "}
                      {selectedCandidature.candidat.passeport_valide
                        ? "Passeport OK"
                        : "Pas de passeport"}
                    </span>
                  </div>
                </div>

                {/* BOUTONS D'ACTION */}
                {selectedCandidature.statut === "EN_ATTENTE" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() =>
                        changerStatut(
                          selectedCandidature.offreId,
                          selectedCandidature.id,
                          "ACCEPTEE",
                        )
                      }
                      className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 font-black shadow-lg shadow-green-100 transition"
                    >
                      ACCEPTER
                    </button>
                    <button
                      onClick={() =>
                        changerStatut(
                          selectedCandidature.offreId,
                          selectedCandidature.id,
                          "REFUSEE",
                        )
                      }
                      className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 font-black shadow-lg shadow-red-100 transition"
                    >
                      REFUSER
                    </button>
                  </div>
                )}
                {selectedCandidature.statut !== "EN_ATTENTE" && (
                  <span
                    className={`text-xs font-black px-4 py-2 rounded-full border ${getBadgeStyle(selectedCandidature.statut)}`}
                  >
                    STATUT : {selectedCandidature.statut.replace("_", " ")}
                  </span>
                )}
              </div>

              {/* PRÉFÉRENCES DE RECRUTEMENT */}
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Préférences du candidat
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border border-gray-100 p-4 rounded-xl">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Secteur
                    </p>
                    <p className="text-xs font-black text-gray-900">
                      {formatText(
                        selectedCandidature.candidat.secteur_souhaite,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Prétentions
                    </p>
                    <p className="text-xs font-black text-blue-600">
                      {selectedCandidature.candidat.salaire_souhaite ||
                        "À discuter"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Mobilité
                    </p>
                    <p className="text-xs font-black text-gray-900">
                      {formatText(selectedCandidature.candidat.mobilite)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Disponibilité
                    </p>
                    <p className="text-xs font-black text-gray-900">
                      {formatText(
                        selectedCandidature.candidat.situation_actuelle,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* LETTRE ET CV */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    CV au format PDF
                  </h4>
                  {selectedCandidature.candidat.cv_pdf ? (
                    <a
                      href={getMediaUrl(selectedCandidature.candidat.cv_pdf)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition shadow-lg"
                    >
                      📄 OUVRIR LE CV
                    </a>
                  ) : (
                    <p className="text-sm font-bold text-gray-400">
                      Aucun CV joint
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Lettre de motivation
                  </h4>
                  <p className="text-xs text-gray-600 font-medium whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto pr-2">
                    {selectedCandidature.lettre_motivation ||
                      "Aucune lettre fournie."}
                  </p>
                </div>
              </div>

              {/* EXPÉRIENCES */}
              <div>
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
                  Expériences Professionnelles
                </h4>
                {selectedCandidature.candidat.experiences &&
                selectedCandidature.candidat.experiences.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidature.candidat.experiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="pl-4 border-l-2 border-blue-200"
                      >
                        <p className="font-black text-gray-800 text-sm">
                          {exp.titre_poste}{" "}
                          <span className="text-blue-600">
                            @ {exp.entreprise}
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 mb-2 bg-white inline-block">
                          📅 {exp.date_debut} — {exp.date_fin || "Aujourd'hui"}
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-gray-400">Non renseigné</p>
                )}
              </div>

              {/* FORMATIONS */}
              <div>
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
                  Formations
                </h4>
                {selectedCandidature.candidat.formations &&
                selectedCandidature.candidat.formations.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidature.candidat.formations.map((form) => (
                      <div
                        key={form.id}
                        className="pl-4 border-l-2 border-indigo-200"
                      >
                        <p className="font-black text-gray-800 text-sm">
                          {form.diplome}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 bg-white inline-block">
                          🎓 {form.etablissement} | 📅 {form.date_debut} —{" "}
                          {form.date_fin}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-gray-400">Non renseigné</p>
                )}
              </div>

              {/* TAGS (Compétences & Langues) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Compétences
                  </h4>
                  {renderTags(selectedCandidature.candidat.competences)}
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Langues
                  </h4>
                  {renderTags(selectedCandidature.candidat.langues)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardRecruteur;
