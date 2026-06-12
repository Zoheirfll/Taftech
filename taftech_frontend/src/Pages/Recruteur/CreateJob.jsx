import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import communesAlgerie from "../../data/communes.json";
import { reportError } from "../../utils/errorReporter"; // ✅ Import ajouté
import { selectStyles } from "../../theme";

const CreateJob = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [questionnaires, setQuestionnaires] = useState([]);
  const [metierSuggestions, setMetierSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    questionnaire: "",
  });

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setConstants(data);
        const qData = await jobsService.getQuestionnaires();
        setQuestionnaires(qData);
      } catch (error) {
        // 🛑 Remplacé console.error par reportError
        reportError("ECHEC_CHARGEMENT_CONSTANTES_JOB", error);
        toast.error("Erreur lors du chargement des listes déroulantes.");
      }
    };
    fetchConstants();
  }, []);
  const handleTitreChange = async (value) => {
    setFormData({ ...formData, titre: value });
    if (value.length >= 2) {
      try {
        const data = await jobsService.getMetiers(value);
        setMetierSuggestions(data.slice(0, 20));
        setShowSuggestions(true);
      } catch {
        setMetierSuggestions([]);
      }
    } else {
      setShowSuggestions(false);
    }
  };
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
    <div className="max-w-7xl mx-auto p-4 md:p-10 bg-slate-100 min-h-screen font-sans">
      <div className="mb-10 text-center space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Créer une <span className="text-indigo-600">Offre Ciblée</span>
        </h1>
        <p className="text-slate-500 text-base font-medium">
          Attirez les meilleurs talents d'Algérie avec des critères précis.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 pb-32 max-w-5xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>{" "}
                Informations du Poste
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-2 block">
                    Titre du poste *
                  </label>
                  <div className="relative">
                    <input
                      required
                      name="titre"
                      value={formData.titre}
                      onChange={(e) => handleTitreChange(e.target.value)}
                      onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 200)
                      }
                      className="w-full text-2xl font-black text-gray-800 bg-gray-50 p-5 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all"
                      placeholder="Ex: Ingénieur Fullstack Django/React"
                    />
                    {showSuggestions && metierSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 mt-1 overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                          {metierSuggestions.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onMouseDown={() => {
                                setFormData({ ...formData, titre: m.titre });
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0"
                            >
                              <p className="text-sm font-medium text-slate-900">
                                {m.titre}
                              </p>
                              <p className="text-xs text-slate-400">
                                {m.secteur}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-slate-500 mb-2 block">
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
                      styles={selectStyles}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 mb-2 block">
                      Salaire proposé
                    </label>
                    <input
                      name="salaire_propose"
                      value={formData.salaire_propose}
                      onChange={handleChange}
                      className="w-full p-5 bg-gray-50 rounded-lg font-bold border-2 border-transparent focus:border-indigo-500 outline-none"
                      placeholder="Ex: 80 000 DA / Négociable"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>{" "}
                Localisation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-2 block">
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
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-2 block">
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
                    styles={selectStyles}
                  />
                </div>
              </div>
            </div>
            <div className="lg:col-span-12">
              <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-3">
                  <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                  Questionnaire (Optionnel)
                </h3>
                <Select
                  name="questionnaire"
                  options={questionnaires.map((q) => ({
                    value: q.id,
                    label: `${q.titre} (${q.questions.length} questions)`,
                  }))}
                  onChange={(opt) =>
                    setFormData({
                      ...formData,
                      questionnaire: opt ? opt.value : "",
                    })
                  }
                  value={
                    questionnaires
                      .map((q) => ({
                        value: q.id,
                        label: `${q.titre} (${q.questions.length} questions)`,
                      }))
                      .find((o) => o.value === formData.questionnaire) || null
                  }
                  placeholder="Associer un questionnaire à cette offre..."
                  isClearable
                  styles={selectStyles}
                />
                <p className="text-xs text-slate-400 mt-2">
                  Les candidats devront répondre à ce questionnaire avant de
                  postuler.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white p-8 md:p-10 rounded-xl shadow-xl focus:border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black px-4 py-1 rounded-bl-xl tracking-widest uppercase">
                Ciblage Précis
              </div>
              <h3 className="text-[11px] font-semibold text-slate-900 tracking-widest mb-6">
                Profil Idéal
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-2 block">
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
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-2 block">
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
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-2 block">
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
                    styles={selectStyles}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 space-y-8">
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-[11px] font-semibold text-slate-900 tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-gray-800 rounded-full"></span>{" "}
                Détails de la mission
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-2 block">
                    Missions & Tâches
                  </label>
                  <textarea
                    name="missions"
                    value={formData.missions}
                    onChange={handleChange}
                    rows="6"
                    className="w-full p-6 bg-gray-50 rounded-xl font-medium text-gray-600 border-2 border-transparent focus:border-gray-800 outline-none leading-relaxed"
                    placeholder="Décrivez les responsabilités du poste..."
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-500 mb-2 block">
                    Profil Recherché (Exigences)
                  </label>
                  <textarea
                    name="profil_recherche"
                    value={formData.profil_recherche}
                    onChange={handleChange}
                    rows="6"
                    className="w-full p-6 bg-gray-50 rounded-xl font-medium text-gray-600 border-2 border-transparent focus:border-gray-800 outline-none leading-relaxed"
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
            className="bg-indigo-600 text-white font-bold px-10 py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-base"
          >
            {loading ? "Publication en cours..." : "🚀 Publier l'offre"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;
