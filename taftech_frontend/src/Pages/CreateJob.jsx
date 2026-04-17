import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// Assure-toi d'avoir un service pour gérer les requêtes des offres
import { jobsService } from "../Services/jobsService";

const CreateJob = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  // L'état qui correspond exactement à ton OffreEmploiCreateDTO (US 2.1)
  const [formData, setFormData] = useState({
    titre: "",
    type_contrat: "CDI",
    salaire_propose: "",
    wilaya: "",
    commune: "",
    diplome: "",
    specialite: "",
    experience_requise: "DEBUTANT",
    missions: "",
    profil_recherche: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "info", message: "Publication de l'offre en cours..." });

    try {
      await jobsService.creerOffre(formData);
      setStatus({
        type: "success",
        message:
          "🚀 Offre publiée avec succès ! Les candidats peuvent maintenant postuler.",
      });

      // Redirection vers le dashboard après 2 secondes
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      setStatus({
        type: "error",
        message: "Erreur lors de la publication. Vérifiez vos informations.",
        error,
      });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 bg-gray-50 min-h-screen font-sans">
      {/* EN-TÊTE */}
      <div className="mb-10 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase">
          Créer une{" "}
          <span className="text-blue-600 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Offre Ciblée
          </span>
        </h1>
        <p className="text-gray-500 font-medium tracking-wide">
          Attirez les meilleurs talents d'Algérie avec des critères précis.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 pb-32 max-w-5xl mx-auto"
      >
        {status.message && (
          <div
            className={`p-6 rounded-3xl font-black shadow-2xl flex items-center gap-4 animate-slideDown ${status.type === "success" ? "bg-green-500 text-white" : status.type === "error" ? "bg-red-500 text-white" : "bg-blue-600 text-white animate-pulse"}`}
          >
            <span>{status.type === "success" ? "✅" : "ℹ️"}</span>{" "}
            {status.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLONNE GAUCHE (Infos Principales & Localisation) */}
          <div className="lg:col-span-7 space-y-8">
            {/* SECTION 1 : POSTE */}
            <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>{" "}
                Informations du Poste
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Titre du poste *
                  </label>
                  <input
                    required
                    name="titre"
                    value={formData.titre}
                    onChange={handleChange}
                    className="w-full text-2xl font-black text-gray-800 bg-gray-50 p-5 rounded-3xl border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none transition-all"
                    placeholder="Ex: Ingénieur Fullstack Django/React"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                      Type de contrat
                    </label>
                    <select
                      name="type_contrat"
                      value={formData.type_contrat}
                      onChange={handleChange}
                      className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-600 outline-none appearance-none cursor-pointer"
                    >
                      <option value="CDI">CDI</option>
                      <option value="CDD">CDD</option>
                      <option value="ANEM">Contrat ANEM (CTA / DAIP)</option>
                      <option value="STAGE">Stage / PFE</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                      Salaire proposé
                    </label>
                    <input
                      name="salaire_propose"
                      value={formData.salaire_propose}
                      onChange={handleChange}
                      className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-600 outline-none"
                      placeholder="Ex: 80 000 DA / Négociable"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 : LOCALISATION */}
            <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>{" "}
                Localisation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Wilaya *
                  </label>
                  <input
                    required
                    name="wilaya"
                    value={formData.wilaya}
                    onChange={handleChange}
                    className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none"
                    placeholder="Ex: Alger, Oran..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Commune
                  </label>
                  <input
                    name="commune"
                    value={formData.commune}
                    onChange={handleChange}
                    className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none"
                    placeholder="Ex: Hydra, Arzew..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE (Ciblage & Description) */}
          <div className="lg:col-span-5 space-y-8">
            {/* SECTION 3 : CRITÈRES DE CIBLAGE (Le cœur de l'US 2.1) */}
            <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border-4 border-blue-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-4 py-1 rounded-bl-xl tracking-widest uppercase">
                Ciblage Précis
              </div>
              <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest mb-6">
                Profil Idéal
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Expérience requise
                  </label>
                  <select
                    name="experience_requise"
                    value={formData.experience_requise}
                    onChange={handleChange}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-600 outline-none appearance-none cursor-pointer"
                  >
                    <option value="DEBUTANT">Débutant (0 - 1 an)</option>
                    <option value="JUNIOR">Junior (1 - 3 ans)</option>
                    <option value="CONFIRME">Confirmé (3 - 5 ans)</option>
                    <option value="SENIOR">Senior (5 ans et plus)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Diplôme attendu
                  </label>
                  <input
                    name="diplome"
                    value={formData.diplome}
                    onChange={handleChange}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-600 outline-none"
                    placeholder="Ex: Master 2, Licence..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Spécialité
                  </label>
                  <input
                    name="specialite"
                    value={formData.specialite}
                    onChange={handleChange}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-600 outline-none"
                    placeholder="Ex: Informatique, Finance..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DESCRIPTION LONGUE (Prend toute la largeur en bas) */}
          <div className="lg:col-span-12 space-y-8">
            <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-gray-800 rounded-full"></span>{" "}
                Détails de la mission
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Missions & Tâches
                  </label>
                  <textarea
                    name="missions"
                    value={formData.missions}
                    onChange={handleChange}
                    rows="6"
                    className="w-full p-6 bg-gray-50 rounded-[2rem] font-medium text-gray-600 border-2 border-transparent focus:border-gray-800 outline-none leading-relaxed"
                    placeholder="Décrivez les responsabilités du poste..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Profil Recherché (Exigences)
                  </label>
                  <textarea
                    name="profil_recherche"
                    value={formData.profil_recherche}
                    onChange={handleChange}
                    rows="6"
                    className="w-full p-6 bg-gray-50 rounded-[2rem] font-medium text-gray-600 border-2 border-transparent focus:border-gray-800 outline-none leading-relaxed"
                    placeholder="Compétences techniques, savoir-être..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOUTON FLOTTANT */}
        <div className="fixed bottom-10 right-10 z-[100]">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white font-black px-12 py-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:-translate-y-2 transition-all border-4 border-white active:scale-95 disabled:opacity-50 disabled:transform-none"
          >
            {loading ? "PUBLICATION..." : "🚀 PUBLIER L'OFFRE"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;
