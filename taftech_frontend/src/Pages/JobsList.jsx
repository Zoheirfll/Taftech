import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import Select from "react-select";

const JobsList = () => {
  // On récupère les paramètres tapés dans la page d'accueil !
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
    experiences: [],
    contrats: [],
  });

  // Initialisation des filtres à partir de l'URL
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    wilaya: searchParams.get("wilaya") || "",
    commune: "",
    diplome: "",
    specialite: "",
    experience: "",
    contrat: "",
  });

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setConstants(data);
      } catch (error) {
        console.error("Erreur de chargement des constantes", error);
      }
    };
    fetchConstants();
  }, []);

  // Déclenche la recherche à chaque modification des filtres
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const data = await jobsService.getAllJobs(filters, 1);
        setJobs(data.results || data);
      } catch (error) {
        console.error("Erreur lors de la récupération des offres:", error);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchJobs();

      // On met l'URL à jour proprement (Optionnel mais pro)
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.wilaya) params.append("wilaya", filters.wilaya);
      setSearchParams(params, { replace: true });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [filters, setSearchParams]);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (selectedOption, actionMeta) => {
    setFilters({
      ...filters,
      [actionMeta.name]: selectedOption ? selectedOption.value : "",
    });
  };

  const handleReset = () => {
    setFilters({
      search: "",
      wilaya: "",
      commune: "",
      diplome: "",
      specialite: "",
      experience: "",
      contrat: "",
    });
    setSearchParams({}); // Vide l'URL
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row gap-6">
        {/* COLONNE GAUCHE : LES FILTRES */}
        <aside className="w-full md:w-1/3 lg:w-1/4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 sticky top-4">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black text-gray-900">Filtrez par</h2>
              <button
                onClick={handleReset}
                className="text-sm font-bold text-gray-500 hover:text-blue-600 transition"
              >
                Réinitialiser
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Mots-clés / Métier
                </label>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleChange}
                  placeholder="Ex: Développeur..."
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Expérience demandée
                </label>
                <Select
                  name="experience"
                  options={constants.experiences}
                  onChange={handleSelectChange}
                  value={
                    constants.experiences.find(
                      (c) => c.value === filters.experience,
                    ) || null
                  }
                  placeholder="Toutes les expériences"
                  isClearable
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Type de contrat
                </label>
                <Select
                  name="contrat"
                  options={constants.contrats}
                  onChange={handleSelectChange}
                  value={
                    constants.contrats.find(
                      (c) => c.value === filters.contrat,
                    ) || null
                  }
                  placeholder="Tous les contrats"
                  isClearable
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Secteur d'activité
                </label>
                <Select
                  name="specialite"
                  options={constants.secteurs}
                  onChange={handleSelectChange}
                  value={
                    constants.secteurs.find(
                      (c) => c.value === filters.specialite,
                    ) || null
                  }
                  placeholder="Ex: Finance, Informatique..."
                  isClearable
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Diplôme attendu
                </label>
                <Select
                  name="diplome"
                  options={constants.diplomes}
                  onChange={handleSelectChange}
                  value={
                    constants.diplomes.find(
                      (c) => c.value === filters.diplome,
                    ) || null
                  }
                  placeholder="Ex: Master 2..."
                  isClearable
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 mt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Wilaya
                  </label>
                  <Select
                    name="wilaya"
                    options={constants.wilayas}
                    onChange={handleSelectChange}
                    value={
                      constants.wilayas.find(
                        (c) => c.value === filters.wilaya,
                      ) || null
                    }
                    placeholder="Ex: Alger"
                    isClearable
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Commune
                  </label>
                  <input
                    type="text"
                    name="commune"
                    value={filters.commune}
                    onChange={handleChange}
                    placeholder="Ex: Hydra"
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* COLONNE DROITE : LES RÉSULTATS */}
        <main className="w-full md:w-2/3 lg:w-3/4">
          <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
            <h1 className="font-bold text-gray-800">
              {jobs.length} Offres d'emploi trouvées
            </h1>
            <Link
              to="/"
              className="text-sm text-blue-600 font-bold hover:underline"
            >
              ← Retour à l'accueil
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <span className="text-blue-600 font-bold animate-pulse text-xl">
                Recherche en cours...
              </span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center shadow-sm">
              <h2 className="text-2xl font-black text-gray-800 mb-2">
                Aucune offre trouvée 😕
              </h2>
              <p className="text-gray-500 mb-6">
                Essayez de modifier vos filtres ou de réinitialiser la
                recherche.
              </p>
              <button
                onClick={handleReset}
                className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-black transition"
              >
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-4"
                >
                  <div>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-xl font-black text-blue-700 hover:underline mb-1 block"
                    >
                      {job.titre}
                    </Link>
                    <div className="text-sm font-bold text-gray-600 mb-4">
                      {job.entreprise?.nom_entreprise || "Entreprise anonyme"}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg">
                        📍 {job.wilaya} {job.commune ? `- ${job.commune}` : ""}
                      </span>
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                        💼 {job.experience_requise}
                      </span>
                      <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg">
                        📄 {job.type_contrat}
                      </span>
                      {job.specialite && (
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg">
                          🎯 {job.specialite}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center md:items-start justify-end mt-4 md:mt-0">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="bg-blue-50 text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-600 hover:text-white transition"
                    >
                      Voir l'offre
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default JobsList;
