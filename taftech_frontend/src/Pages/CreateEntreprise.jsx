import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { entrepriseService } from "../Services/entrepriseService";
import { jobsService } from "../Services/jobsService";
import Select from "react-select";
import communesAlgerie from "../data/communes.json";
import { reportError } from "../utils/errorReporter"; // 👇 Import télémétrie

const CreateEntreprise = () => {
  const navigate = useNavigate();

  const [wilayasList, setWilayasList] = useState([]);
  const [formData, setFormData] = useState({
    nom_entreprise: "",
    secteur_activite: "",
    registre_commerce: "",
    wilaya_siege: "",
    commune_siege: "",
    description: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    const fetchWilayas = async () => {
      try {
        const data = await jobsService.getConstants();
        setWilayasList(data.wilayas);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_WILAYAS_CREATE_ENT", error);
      }
    };
    fetchWilayas();
  }, []);

  const getCommunesOptions = () => {
    if (!formData.wilaya_siege) return [];
    const wilayaCode = formData.wilaya_siege.split(" - ")[0];
    return communesAlgerie
      .filter((c) => c.wilaya_code === wilayaCode)
      .map((c) => ({
        value: c.commune_name_ascii,
        label: c.commune_name_ascii,
      }));
  };

  const handleSelectChange = (selectedOption, actionMeta) => {
    setFormData({
      ...formData,
      [actionMeta.name]: selectedOption ? selectedOption.value : "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    try {
      await entrepriseService.creerEntreprise(formData);

      setStatus({
        type: "success",
        message: "Entreprise enregistrée ! Vous êtes maintenant Recruteur.",
      });

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      // 🛑 Télémétrie et extraction fine de l'erreur
      reportError("ECHEC_CREATION_ENTREPRISE", error);

      const serverError =
        error.response?.data?.error ||
        error.response?.data?.registre_commerce?.[0] ||
        "Erreur lors de la création de l'entreprise.";

      setStatus({
        type: "error",
        message: serverError,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md border-t-4 border-blue-600">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Enregistrer mon Entreprise
        </h2>

        {status.message && (
          <div
            role="alert"
            className={`p-4 rounded-md mb-6 font-medium ${status.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, nom_entreprise: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secteur d'activité *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Informatique, Énergie..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, secteur_activite: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wilaya du siège *
              </label>
              <Select
                name="wilaya_siege"
                options={wilayasList}
                aria-label="wilaya-select"
                onChange={(opt) => {
                  setFormData({
                    ...formData,
                    wilaya_siege: opt ? opt.value : "",
                    commune_siege: "",
                  });
                }}
                value={
                  wilayasList.find((w) => w.value === formData.wilaya_siege) ||
                  null
                }
                placeholder="Sélectionner..."
                isClearable
                className="font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commune du siège (Optionnel)
              </label>
              <Select
                name="commune_siege"
                aria-label="commune-select"
                options={getCommunesOptions()}
                isDisabled={
                  !formData.wilaya_siege || getCommunesOptions().length === 0
                }
                value={
                  getCommunesOptions().find(
                    (c) => c.value === formData.commune_siege,
                  ) || null
                }
                onChange={handleSelectChange}
                placeholder={
                  formData.wilaya_siege ? "Sélectionnez..." : "Wilaya d'abord"
                }
                isClearable
                className="font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registre de Commerce (RC) *
            </label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, registre_commerce: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description de l'entreprise
            </label>
            <textarea
              rows="4"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200"
          >
            Créer mon profil Recruteur
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEntreprise;
