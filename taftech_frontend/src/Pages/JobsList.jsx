import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import Select from "react-select";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";
import communesAlgerie from "../data/communes.json";
import { reportError } from "../utils/errorReporter"; // ✅ Import de la Télémétrie

const JobsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [favoris, setFavoris] = useState([]);
  const [recommandations, setRecommandations] = useState([]);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isConnected = !!localStorage.getItem("userRole");
        const isCandidat = localStorage.getItem("userRole") === "CANDIDAT";

        const promises = [jobsService.getConstants()];

        if (isConnected) {
          promises.push(
            api.get("jobs/sauvegardes/").catch(() => ({ data: [] })),
          );
        } else {
          promises.push(Promise.resolve({ data: [] }));
        }

        if (isCandidat) {
          promises.push(jobsService.getOffresRecommandees().catch(() => []));
        } else {
          promises.push(Promise.resolve([]));
        }

        const [constantsData, favorisData, recommandationsData] =
          await Promise.all(promises);

        setConstants(constantsData);
        setFavoris(favorisData.data);
        setRecommandations(recommandationsData || []);
      } catch (error) {
        reportError("ECHEC_INITIALISATION_JOBS_LIST", error); // 🛑 Télémétrie
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const data = await jobsService.getAllJobs(filters, 1);
        setJobs(data.results || data);
      } catch (error) {
        reportError("ECHEC_RECUPERATION_OFFRES", error); // 🛑 Télémétrie
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

  const handleToggleFavori = async (offreId) => {
    if (!localStorage.getItem("userRole")) {
      return toast.error("Veuillez vous connecter pour sauvegarder une offre.");
    }

    const isDejaSauvegarde = favoris.find((f) => f.offre === offreId);

    if (isDejaSauvegarde) {
      setFavoris(favoris.filter((f) => f.offre !== offreId));
      try {
        await api.delete(`jobs/sauvegardes/${isDejaSauvegarde.id}/`);
        toast.success("Offre retirée des favoris.");
      } catch (error) {
        setFavoris([...favoris, isDejaSauvegarde]);
        toast.error("Erreur lors de la suppression.");
        reportError("ECHEC_SUPPRESSION_FAVORI", error); // 🛑 Télémétrie
      }
    } else {
      try {
        const response = await api.post("jobs/sauvegardes/", {
          offre: offreId,
        });
        setFavoris([...favoris, response.data]);
        toast.success("Offre sauvegardée !");
      } catch (error) {
        toast.error("Impossible de sauvegarder cette offre.");
        reportError("ECHEC_SAUVEGARDE_FAVORI", error); // 🛑 Télémétrie
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

  const getCommunesListOptions = (wilayaValue) => {
    if (!wilayaValue) return [];
    const wilayaCode = wilayaValue.split(" - ")[0];
    return communesAlgerie
      .filter((c) => c.wilaya_code === wilayaCode)
      .map((c) => ({
        value: c.commune_name_ascii,
        label: c.commune_name_ascii,
      }));
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
                  placeholder="Ex: Finance..."
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
                    onChange={(opt) => {
                      setFilters({
                        ...filters,
                        wilaya: opt ? opt.value : "",
                        commune: "",
                      });
                    }}
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
                  <Select
                    name="commune"
                    options={getCommunesListOptions(filters.wilaya)}
                    isDisabled={
                      !filters.wilaya ||
                      getCommunesListOptions(filters.wilaya).length === 0
                    }
                    value={
                      getCommunesListOptions(filters.wilaya).find(
                        (c) => c.value === filters.commune,
                      ) || null
                    }
                    onChange={handleSelectChange}
                    placeholder={
                      filters.wilaya ? "Toutes les communes" : "Wilaya d'abord"
                    }
                    isClearable
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* COLONNE DROITE : LES RÉSULTATS */}
        <main className="w-full md:w-2/3 lg:w-3/4">
          {recommandations.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                🔥 Recommandées pour vous
              </h2>
              <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
                {recommandations.map((rec) => (
                  <div
                    key={rec.id}
                    className="min-w-[300px] md:min-w-[350px] bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 shadow-sm snap-start flex flex-col justify-between shrink-0 hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-100 px-2 py-1 rounded-md">
                          {rec.matching_score >= 80
                            ? "⭐ Top Match"
                            : "🎯 Recommandé"}
                        </span>
                        <span className="text-xs font-black text-blue-800 bg-white px-2 py-1 rounded-full border border-blue-200">
                          {rec.matching_score}%
                        </span>
                      </div>
                      <Link
                        to={`/jobs/${rec.id}`}
                        className="text-lg font-black text-gray-900 hover:text-blue-700 hover:underline line-clamp-1"
                      >
                        {rec.titre}
                      </Link>
                      <p className="text-xs font-bold text-gray-500 mt-1 mb-4">
                        🏢{" "}
                        {rec.entreprise?.nom_entreprise || "Entreprise Anonyme"}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                        <span className="bg-white text-gray-600 px-2 py-1 rounded border border-gray-200">
                          📍 {rec.wilaya.split(" - ")[0]}
                        </span>
                        <span className="bg-white text-gray-600 px-2 py-1 rounded border border-gray-200">
                          💼 {rec.experience_requise}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/jobs/${rec.id}`}
                      className="mt-4 block text-center w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg transition-colors text-xs"
                    >
                      Voir l'offre
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        {job.entreprise ? (
                          <Link
                            to={`/entreprise/${job.entreprise.id}`}
                            className="hover:text-blue-600 hover:underline transition-colors"
                            title="Voir la page de cette entreprise"
                          >
                            🏢 {job.entreprise.nom_entreprise}
                          </Link>
                        ) : (
                          <span>🏢 Entreprise anonyme</span>
                        )}
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
                      <button
                        onClick={() => handleToggleFavori(job.id)}
                        className={`p-3 rounded-xl transition-all border ${isSaved ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100" : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"}`}
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
