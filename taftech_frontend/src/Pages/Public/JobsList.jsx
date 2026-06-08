import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import Select from "react-select";
import toast from "react-hot-toast";
import api from "../../api/axiosConfig";
import communesAlgerie from "../../data/communes.json";
import { reportError } from "../../utils/errorReporter";
import { selectStyles } from "../../theme";
import {
  MapPin,
  Briefcase,
  Banknote,
  Bookmark,
  Sparkles,
  Search,
  X,
} from "lucide-react";

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
        promises.push(
          isConnected
            ? api.get("jobs/sauvegardes/").catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        );
        promises.push(
          isCandidat
            ? jobsService.getOffresRecommandees().catch(() => [])
            : Promise.resolve([]),
        );
        const [constantsData, favorisData, recommandationsData] =
          await Promise.all(promises);
        setConstants(constantsData);
        setFavoris(favorisData.data);
        setRecommandations(recommandationsData || []);
      } catch (error) {
        reportError("ECHEC_INITIALISATION_JOBS_LIST", error);
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
        reportError("ECHEC_RECUPERATION_OFFRES", error);
      } finally {
        setLoading(false);
      }
    };
    const delay = setTimeout(() => {
      fetchJobs();
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.wilaya) params.append("wilaya", filters.wilaya);
      setSearchParams(params, { replace: true });
    }, 500);
    return () => clearTimeout(delay);
  }, [filters, setSearchParams]);

  const handleToggleFavori = async (offreId) => {
    if (!localStorage.getItem("userRole")) {
      return toast.error("Connectez-vous pour sauvegarder une offre.");
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
        reportError("ECHEC_SUPPRESSION_FAVORI", error);
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
        reportError("ECHEC_SAUVEGARDE_FAVORI", error);
      }
    }
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

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row gap-6">
        {/* FILTRES */}
        <aside className="w-full md:w-72 flex-shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-20">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-bold text-slate-900">Filtres</h2>
              {hasFilters && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <X size={12} /> Réinitialiser
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Mots-clés
                </label>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    name="search"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    placeholder="Développeur, comptable..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              {[
                {
                  label: "Expérience",
                  name: "experience",
                  options: constants.experiences,
                  placeholder: "Toutes",
                },
                {
                  label: "Type de contrat",
                  name: "contrat",
                  options: constants.contrats,
                  placeholder: "Tous",
                },
                {
                  label: "Secteur",
                  name: "specialite",
                  options: constants.secteurs,
                  placeholder: "Tous",
                },
                {
                  label: "Diplôme",
                  name: "diplome",
                  options: constants.diplomes,
                  placeholder: "Tous",
                },
              ].map(({ label, name, options, placeholder }) => (
                <div key={name}>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    {label}
                  </label>
                  <Select
                    name={name}
                    options={options}
                    onChange={handleSelectChange}
                    value={
                      options.find((c) => c.value === filters[name]) || null
                    }
                    placeholder={placeholder}
                    isClearable
                    styles={selectStyles}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Wilaya
                </label>
                <Select
                  name="wilaya"
                  options={constants.wilayas}
                  onChange={(opt) =>
                    setFilters({
                      ...filters,
                      wilaya: opt ? opt.value : "",
                      commune: "",
                    })
                  }
                  value={
                    constants.wilayas.find((c) => c.value === filters.wilaya) ||
                    null
                  }
                  placeholder="Toutes"
                  isClearable
                  styles={selectStyles}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Commune
                </label>
                <Select
                  name="commune"
                  options={getCommunesListOptions(filters.wilaya)}
                  isDisabled={!filters.wilaya}
                  value={
                    getCommunesListOptions(filters.wilaya).find(
                      (c) => c.value === filters.commune,
                    ) || null
                  }
                  onChange={handleSelectChange}
                  placeholder={filters.wilaya ? "Toutes" : "Wilaya d'abord"}
                  isClearable
                  styles={selectStyles}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* RÉSULTATS */}
        <main className="flex-1 min-w-0">
          {/* RECOMMANDATIONS */}
          {recommandations.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles size={15} className="text-amber-500" />
                Recommandées pour vous
              </h2>
              <div className="flex overflow-x-auto gap-3 pb-3">
                {recommandations.map((rec) => (
                  <div
                    key={rec.id}
                    className="min-w-[280px] bg-white border border-indigo-200 rounded-xl p-4 flex-shrink-0 hover:shadow-sm transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-full">
                        {rec.matching_score >= 80
                          ? "⭐ Top Match"
                          : "Recommandé"}
                      </span>
                      <span className="text-xs font-bold text-indigo-600">
                        {rec.matching_score}%
                      </span>
                    </div>
                    <Link
                      to={`/jobs/${rec.id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-indigo-600 line-clamp-1 block mb-1"
                    >
                      {rec.titre}
                    </Link>
                    <p className="text-xs text-slate-500 mb-3">
                      {rec.entreprise?.nom_entreprise || "Entreprise anonyme"}
                    </p>
                    <Link
                      to={`/jobs/${rec.id}`}
                      className="block text-center py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Voir l'offre
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMPTEUR */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">
                {jobs.length}
              </span>{" "}
              offre{jobs.length > 1 ? "s" : ""} trouvée
              {jobs.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* LISTE */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
              <Search size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-1">
                Aucune offre trouvée
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Essayez de modifier vos filtres.
              </p>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isSaved = favoris.some((f) => f.offre === job.id);
                return (
                  <div
                    key={job.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-1">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                          >
                            {job.titre}
                          </Link>
                        </div>
                        {job.entreprise ? (
                          <Link
                            to={`/entreprise/${job.entreprise.id}`}
                            className="text-xs text-indigo-600 hover:underline font-medium"
                          >
                            {job.entreprise.nom_entreprise}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Entreprise anonyme
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                            <MapPin size={10} />
                            {job.wilaya?.split(" - ")[1] || job.wilaya}
                            {job.commune ? ` · ${job.commune}` : ""}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                            <Briefcase size={10} />
                            {job.experience_requise}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-md">
                            {job.type_contrat}
                          </span>
                          {job.salaire_propose && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-md">
                              <Banknote size={10} />
                              {job.salaire_propose}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleFavori(job.id)}
                          className={`p-2 rounded-lg border transition-colors ${
                            isSaved
                              ? "bg-amber-50 border-amber-200 text-amber-500"
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                          }`}
                          title={
                            isSaved ? "Retirer des favoris" : "Sauvegarder"
                          }
                        >
                          <Bookmark
                            size={15}
                            className={isSaved ? "fill-amber-500" : ""}
                          />
                        </button>
                        <Link
                          to={`/jobs/${job.id}`}
                          className="px-3 py-2 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                        >
                          Voir l'offre
                        </Link>
                      </div>
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
