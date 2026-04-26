import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import Select from "react-select";
import toast from "react-hot-toast";
import api from "../api/axiosConfig"; // N'oublie pas cet import pour les appels API des favoris

const JobsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- NOUVEAU : State pour gérer les offres sauvegardées ---
  const [favoris, setFavoris] = useState([]);

  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
    experiences: [],
    contrats: [],
  });

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    wilaya: searchParams.get("wilaya") || "",
    commune: "",
    diplome: "",
    specialite: "",
    experience: "",
    contrat: "",
  });

  // 1. Initialisation : Charger les constantes ET les favoris de l'utilisateur
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [constantsData, favorisData] = await Promise.all([
          jobsService.getConstants(),
          // On tente de récupérer les favoris (si l'utilisateur n'est pas connecté, l'API renverra une erreur, ce n'est pas grave on la gère silencieusement)
          api.get("jobs/sauvegardes/").catch(() => ({ data: [] })),
        ]);

        setConstants(constantsData);
        setFavoris(favorisData.data);
      } catch (error) {
        console.error("Erreur d'initialisation", error);
      }
    };
    fetchData();
  }, []);

  // 2. Recherche des offres
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

      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.wilaya) params.append("wilaya", filters.wilaya);
      setSearchParams(params, { replace: true });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [filters, setSearchParams]);

  // --- NOUVEAU : Gérer le clic sur le bouton de sauvegarde ---
  const handleToggleFavori = async (offreId) => {
    // Vérifier si l'utilisateur est connecté (en regardant si on a réussi à charger des favoris, ou via ton authService si tu préfères)
    if (!localStorage.getItem("userRole")) {
      return toast.error("Veuillez vous connecter pour sauvegarder une offre.");
    }

    const isDejaSauvegarde = favoris.find((f) => f.offre === offreId);

    if (isDejaSauvegarde) {
      // 1. RETIRER DES FAVORIS
      // Optimistic UI : on le retire direct de l'affichage
      setFavoris(favoris.filter((f) => f.offre !== offreId));

      try {
        await api.delete(`jobs/sauvegardes/${isDejaSauvegarde.id}/`);
        toast.success("Offre retirée des favoris.");
      } catch (error) {
        // En cas d'erreur, on remet l'état précédent
        setFavoris([...favoris, isDejaSauvegarde]);
        (toast.error("Erreur lors de la suppression."), console.error(error));
      }
    } else {
      // 2. AJOUTER AUX FAVORIS
      try {
        const response = await api.post("jobs/sauvegardes/", {
          offre: offreId,
        });
        setFavoris([...favoris, response.data]);
        toast.success("Offre sauvegardée !");
      } catch (error) {
        (toast.error("Impossible de sauvegarder cette offre."),
          console.error(error));
      }
    }
  };

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
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row gap-6">
        {/* COLONNE GAUCHE : LES FILTRES (inchangée) */}
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
              {jobs.map((job) => {
                // --- ON DÉTERMINE SI L'OFFRE ACTUELLE EST DANS LES FAVORIS ---
                const isSaved = favoris.some((f) => f.offre === job.id);

                return (
                  <div
                    key={job.id}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="text-xl font-black text-blue-700 hover:underline"
                        >
                          {job.titre}
                        </Link>
                      </div>

                      <div className="text-sm font-bold text-gray-600 mb-4">
                        {job.entreprise?.nom_entreprise || "Entreprise anonyme"}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs font-bold">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg">
                          📍 {job.wilaya}{" "}
                          {job.commune ? `- ${job.commune}` : ""}
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

                    <div className="flex items-center md:items-start justify-end mt-4 md:mt-0 gap-3">
                      {/* --- LE FAMEUX BOUTON DE SAUVEGARDE --- */}
                      <button
                        onClick={() => handleToggleFavori(job.id)}
                        className={`p-3 rounded-xl transition-all border ${
                          isSaved
                            ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                            : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                        }`}
                        title={
                          isSaved
                            ? "Retirer des favoris"
                            : "Sauvegarder l'offre"
                        }
                      >
                        <svg
                          className="w-5 h-5"
                          fill={isSaved ? "currentColor" : "none"}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={isSaved ? "0" : "2"}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                          ></path>
                        </svg>
                      </button>

                      <Link
                        to={`/jobs/${job.id}`}
                        className="bg-blue-50 text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-600 hover:text-white transition"
                      >
                        Voir l'offre
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default JobsList;
