import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import communesAlgerie from "../data/communes.json";
import { reportError } from "../utils/errorReporter"; // ✅ Import ajouté

const CreateJob = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
    experiences: [],
    contrats: [],
  });

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

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setConstants(data);
      } catch (error) {
        // 🛑 Remplacé console.error par reportError
        reportError("ECHEC_CHARGEMENT_CONSTANTES_JOB", error);
        toast.error("Erreur lors du chargement des listes déroulantes.");
      }
    };
    fetchConstants();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (selectedOption, actionMeta) => {
    setFormData({
      ...formData,
      [actionMeta.name]: selectedOption ? selectedOption.value : "",
    });
  };

  const getCommunesOptions = () => {
    if (!formData.wilaya) return [];
    const wilayaCode = formData.wilaya.split(" - ")[0];
    return communesAlgerie
      .filter((c) => c.wilaya_code === wilayaCode)
      .map((c) => ({
        value: c.commune_name_ascii,
        label: c.commune_name_ascii,
      }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.wilaya || !formData.specialite) {
      toast.error(
        "Veuillez sélectionner au moins une Wilaya et une Spécialité.",
      );
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Publication de l'offre en cours...");

    try {
      await jobsService.creerOffre(formData);
      toast.success(
        "🚀 Offre publiée avec succès ! Les candidats peuvent maintenant postuler.",
        { id: toastId },
      );

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      // 🛑 Remplacé console.log par reportError
      reportError("ECHEC_PUBLICATION_OFFRE", error);
      toast.error("Erreur lors de la publication. Vérifiez vos informations.", {
        id: toastId,
      });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 bg-gray-50 min-h-screen font-sans">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
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
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
                      Type de contrat
                    </label>
                    <Select
                      name="type_contrat"
                      options={constants.contrats}
                      onChange={handleSelectChange}
                      value={
                        constants.contrats.find(
                          (c) => c.value === formData.type_contrat,
                        ) || null
                      }
                      placeholder="Sélectionnez..."
                      className="font-bold text-gray-700"
                      styles={{
                        control: (base) => ({
                          ...base,
                          padding: "0.6rem",
                          borderRadius: "1rem",
                          backgroundColor: "#f9fafb",
                          borderColor: "transparent",
                        }),
                      }}
                    />
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

            <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>{" "}
                Localisation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
                    Wilaya *
                  </label>
                  <Select
                    name="wilaya"
                    options={constants.wilayas}
                    onChange={(opt) => {
                      setFormData({
                        ...formData,
                        wilaya: opt ? opt.value : "",
                        commune: "",
                      });
                    }}
                    value={
                      constants.wilayas.find(
                        (w) => w.value === formData.wilaya,
                      ) || null
                    }
                    placeholder="Sélectionner..."
                    isClearable
                    className="font-bold text-gray-700"
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: "0.6rem",
                        borderRadius: "1rem",
                        backgroundColor: "#f9fafb",
                        borderColor: "transparent",
                      }),
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
                    Commune (Optionnel)
                  </label>
                  <Select
                    name="commune"
                    options={getCommunesOptions()}
                    isDisabled={
                      !formData.wilaya || getCommunesOptions().length === 0
                    }
                    value={
                      getCommunesOptions().find(
                        (c) => c.value === formData.commune,
                      ) || null
                    }
                    onChange={handleSelectChange}
                    placeholder={
                      formData.wilaya ? "Sélectionnez..." : "Wilaya d'abord"
                    }
                    isClearable
                    className="font-bold text-gray-700"
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: "0.6rem",
                        borderRadius: "1rem",
                        backgroundColor: "#f9fafb",
                        borderColor: "transparent",
                      }),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border-4 border-blue-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-4 py-1 rounded-bl-xl tracking-widest uppercase">
                Ciblage Précis
              </div>
              <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest mb-6">
                Profil Idéal
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
                    Expérience requise
                  </label>
                  <Select
                    name="experience_requise"
                    options={constants.experiences}
                    onChange={handleSelectChange}
                    value={
                      constants.experiences.find(
                        (e) => e.value === formData.experience_requise,
                      ) || null
                    }
                    placeholder="Sélectionner..."
                    className="font-bold text-gray-700"
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: "0.4rem",
                        borderRadius: "1rem",
                        backgroundColor: "#f9fafb",
                        borderColor: "transparent",
                      }),
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
                    Diplôme attendu
                  </label>
                  <Select
                    name="diplome"
                    options={constants.diplomes}
                    onChange={handleSelectChange}
                    value={
                      constants.diplomes.find(
                        (d) => d.value === formData.diplome,
                      ) || null
                    }
                    placeholder="Sélectionner..."
                    isClearable
                    className="font-bold text-gray-700"
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: "0.4rem",
                        borderRadius: "1rem",
                        backgroundColor: "#f9fafb",
                        borderColor: "transparent",
                      }),
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
                    Spécialité (Secteur)
                  </label>
                  <Select
                    name="specialite"
                    options={constants.secteurs}
                    onChange={handleSelectChange}
                    value={
                      constants.secteurs.find(
                        (s) => s.value === formData.specialite,
                      ) || null
                    }
                    placeholder="Sélectionner..."
                    isClearable
                    className="font-bold text-gray-700"
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: "0.4rem",
                        borderRadius: "1rem",
                        backgroundColor: "#f9fafb",
                        borderColor: "transparent",
                      }),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

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
