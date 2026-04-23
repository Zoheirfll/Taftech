import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";

const DashboardRecruteur = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("ouvertes");
  const [entreprise, setEntreprise] = useState(null);
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [tempEntreprise, setTempEntreprise] = useState({});
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });

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
      toast.error("Erreur lors de la sauvegarde.");
      console.log(err);
    }
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

  // Séparation des offres
  const offresOuvertes = offres.filter((o) => o.est_cloturee !== true);
  const offresCloturees = offres.filter((o) => o.est_cloturee === true);

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

      <div className="flex border-b border-gray-200 mb-8 gap-4">
        <button
          onClick={() => {
            setActiveTab("ouvertes");
            setIsEditing(false);
          }}
          className={`py-4 px-4 font-bold text-sm uppercase tracking-widest border-b-4 transition-all ${activeTab === "ouvertes" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          Offres en cours ({offresOuvertes.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("cloturees");
            setIsEditing(false);
          }}
          className={`py-4 px-4 font-bold text-sm uppercase tracking-widest border-b-4 transition-all ${activeTab === "cloturees" ? "border-gray-800 text-gray-800" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          Archives ({offresCloturees.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("profil");
            setIsEditing(false);
          }}
          className={`py-4 px-4 font-bold text-sm uppercase tracking-widest border-b-4 transition-all ${activeTab === "profil" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          Profil Entreprise
        </button>
      </div>

      {/* --- ONGLET OFFRES --- */}
      {(activeTab === "ouvertes" || activeTab === "cloturees") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === "ouvertes" ? offresOuvertes : offresCloturees)
            .length === 0 ? (
            <div className="col-span-full bg-white p-16 rounded-3xl border-2 border-dashed border-gray-200 text-center">
              <p className="text-gray-400 font-medium">
                Aucune offre dans cette catégorie.
              </p>
            </div>
          ) : (
            (activeTab === "ouvertes" ? offresOuvertes : offresCloturees).map(
              (offre) => (
                <div
                  key={offre.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition"
                >
                  <div
                    className={`p-6 border-b flex flex-col gap-2 ${activeTab === "ouvertes" ? "border-l-8 border-blue-600" : "border-l-8 border-gray-400"}`}
                  >
                    <h2 className="text-xl font-black text-gray-800 line-clamp-1">
                      {offre.titre}
                    </h2>
                    <span className="text-xs font-bold text-gray-400">
                      Publiée le{" "}
                      {new Date(offre.date_publication).toLocaleDateString(
                        "fr-FR",
                      )}
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-center items-center bg-gray-50/50">
                    <div className="text-4xl font-black text-blue-600 mb-1">
                      {offre.candidatures?.length || 0}
                    </div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      Candidatures
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/dashboard/offres/${offre.id}`)}
                      className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition shadow-sm"
                    >
                      GÉRER LES CANDIDATS ➔
                    </button>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      )}

      {/* --- ONGLET PROFIL --- */}
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
    </div>
  );
};

export default DashboardRecruteur;
