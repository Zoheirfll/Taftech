import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import Select from "react-select";
import toast from "react-hot-toast";
import api from "../../api/axiosConfig";
import communesAlgerie from "../../data/communes.json";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl as getMediaUrl } from "../../utils/mediaUrl";
import { selectStyles, tw } from "../../theme";
import { SecteurDomaineSelect } from "../../Components/SecteurDomaineSelect";
import {
  MapPin, Briefcase, Bookmark, Sparkles, Search,
  X, Building2, Clock, ChevronLeft, ChevronRight, SlidersHorizontal,
} from "lucide-react";

const CONTRAT_LABELS = {
  CDI: "CDI", CDD: "CDD", FREELANCE: "Freelance",
  STAGE: "Stage", ALTERNANCE: "Alternance", INTERIM: "Intérim",
};

const tempsDepuis = (dateStr) => {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `il y a ${Math.floor(diff / 86400)}j`;
  return `il y a ${Math.floor(diff / 2592000)} mois`;
};

const LogoEntreprise = ({ url }) => {
  const [err, setErr] = React.useState(false);
  return (
    <div className={`w-12 h-12 rounded-xl border ${tw.borderBase} ${tw.surfaceMuted} flex items-center justify-center shrink-0 overflow-hidden`}>
      {url && !err ? (
        <img src={url} alt="" loading="lazy" width={48} height={48} className="w-full h-full object-contain p-1" onError={() => setErr(true)} />
      ) : (
        <Building2 size={22} className={tw.textMuted} />
      )}
    </div>
  );
};

const SkeletonJobCard = () => (
  <div className={`${tw.cardColors} rounded-2xl p-4 md:p-5 animate-pulse`}>
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 ${tw.surfaceSubtle} rounded-xl shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2 mb-2">
          <div className="space-y-1.5 flex-1">
            <div className={`h-4 ${tw.surfaceSubtle} rounded w-2/3`} />
            <div className={`h-3 ${tw.surfaceSubtle} rounded w-1/3`} />
            <div className={`h-3 ${tw.surfaceSubtle} rounded w-1/4`} />
          </div>
          <div className={`w-8 h-8 ${tw.surfaceSubtle} rounded-lg shrink-0`} />
        </div>
        <div className="flex gap-2 mt-3">
          <div className={`h-6 w-20 ${tw.surfaceSubtle} rounded-lg`} />
          <div className={`h-6 w-20 ${tw.surfaceSubtle} rounded-lg`} />
          <div className={`h-6 w-16 ${tw.surfaceSubtle} rounded-lg`} />
          <div className={`h-6 w-20 ${tw.surfaceSubtle} rounded-lg ml-auto`} />
        </div>
      </div>
    </div>
  </div>
);

const PAGE_SIZE = 10;

const JobsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favoris, setFavoris] = useState([]);
  const [recommandations, setRecommandations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [], diplomes: [], experiences: [], contrats: [] });
  const [nomenclature, setNomenclature] = useState({ domaines: [] });
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    wilaya: searchParams.get("wilaya") || "",
    commune: "", diplome: "", specialite: "", experience: "", contrat: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isConnected = !!localStorage.getItem("userRole");
        const isCandidat = localStorage.getItem("userRole") === "CANDIDAT";
        const [constantsData, nomenclatureData, favorisData, recommandationsData] = await Promise.all([
          jobsService.getConstants(),
          jobsService.getNomenclature().catch(() => ({ domaines: [] })),
          isConnected ? api.get("jobs/sauvegardes/").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          isCandidat ? jobsService.getOffresRecommandees().catch(() => []) : Promise.resolve([]),
        ]);
        setConstants(constantsData);
        setNomenclature(nomenclatureData);
        setFavoris(favorisData.data);
        setRecommandations(recommandationsData || []);
      } catch (error) {
        reportError("ECHEC_INITIALISATION_JOBS_LIST", error);
      }
    };
    fetchData();
  }, []);

  const fetchJobs = useCallback(async (page) => {
    setLoading(true);
    try {
      const data = await jobsService.getAllJobs(filters, page);
      setJobs(data.results || data);
      setTotalCount(data.count ?? (Array.isArray(data) ? data.length : 0));
    } catch (error) {
      reportError("ECHEC_RECUPERATION_OFFRES", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setCurrentPage(1);
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.wilaya) params.append("wilaya", filters.wilaya);
      setSearchParams(params, { replace: true });
    }, 400);
    return () => clearTimeout(delay);
  }, [filters, setSearchParams]);

  useEffect(() => {
    const delay = setTimeout(() => fetchJobs(currentPage), 400);
    return () => clearTimeout(delay);
  }, [filters, currentPage, fetchJobs]);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const expLabel = (val) => constants.experiences.find((e) => e.value === val)?.label || val;

  const handleToggleFavori = async (offreId) => {
    if (!localStorage.getItem("userRole")) return toast.error("Connectez-vous pour sauvegarder une offre.");
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
        const response = await api.post("jobs/sauvegardes/", { offre: offreId });
        setFavoris([...favoris, response.data]);
        toast.success("Offre sauvegardée !");
      } catch (error) {
        toast.error("Impossible de sauvegarder cette offre.");
        reportError("ECHEC_SAUVEGARDE_FAVORI", error);
      }
    }
  };

  const handleSelectChange = (selectedOption, actionMeta) => {
    setFilters({ ...filters, [actionMeta.name]: selectedOption ? selectedOption.value : "" });
  };

  const getCommunesListOptions = (wilayaValue) => {
    if (!wilayaValue) return [];
    const wilayaCode = wilayaValue.split(" - ")[0];
    return communesAlgerie
      .filter((c) => c.wilaya_code === wilayaCode)
      .map((c) => ({ value: c.commune_name_ascii, label: c.commune_name_ascii }));
  };

  const handleReset = () => {
    setFilters({ search: "", wilaya: "", commune: "", diplome: "", specialite: "", experience: "", contrat: "" });
    setSearchParams({});
    setCurrentPage(1);
  };

  const removeFilter = (key) => setFilters((prev) => ({ ...prev, [key]: "", ...(key === "wilaya" ? { commune: "" } : {}) }));

  const hasFilters = Object.values(filters).some(Boolean);

  // Chips des filtres actifs
  const activeChips = [
    filters.search && { key: "search", label: `"${filters.search}"` },
    filters.wilaya && { key: "wilaya", label: filters.wilaya.split(" - ")[1] || filters.wilaya },
    filters.commune && { key: "commune", label: filters.commune },
    filters.experience && { key: "experience", label: expLabel(filters.experience) },
    filters.contrat && { key: "contrat", label: CONTRAT_LABELS[filters.contrat] || filters.contrat },
    filters.specialite && { key: "specialite", label: nomenclature.domaines.find((d) => d.code === filters.specialite)?.libelle || filters.specialite },
    filters.diplome && { key: "diplome", label: constants.diplomes.find((d) => d.value === filters.diplome)?.label || filters.diplome },
  ].filter(Boolean);

  const filtersPanel = (
    <div className={`${tw.cardColors} rounded-2xl p-5 sticky top-20`}>
      <div className="flex justify-between items-center mb-5">
        <h2 className={`text-sm font-bold ${tw.textStrong}`}>Filtres</h2>
        {hasFilters && (
          <button onClick={handleReset} className={`flex items-center gap-1 text-xs font-medium ${tw.textMuted700} ${tw.hoverTextPrimary} transition-colors`}>
            <X size={12} /> Réinitialiser
          </button>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Mots-clés</label>
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Développeur, comptable..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-lg text-sm ${tw.inputColorsMuted}`}
            />
          </div>
        </div>
        {[
          { label: "Expérience", name: "experience", options: constants.experiences, placeholder: "Toutes" },
          { label: "Type de contrat", name: "contrat", options: constants.contrats, placeholder: "Tous" },
          { label: "Diplôme", name: "diplome", options: constants.diplomes, placeholder: "Tous" },
        ].map(({ label, name, options, placeholder }) => (
          <div key={name}>
            <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>{label}</label>
            <Select name={name} options={options} onChange={handleSelectChange} value={options.find((c) => c.value === filters[name]) || null} placeholder={placeholder} isClearable styles={selectStyles} />
          </div>
        ))}
        <div>
          <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Secteur / Domaine</label>
          <SecteurDomaineSelect
            value={filters.specialite}
            onChange={(domaineCode) => setFilters({ ...filters, specialite: domaineCode })}
            styles={selectStyles}
          />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Wilaya</label>
          <Select name="wilaya" options={constants.wilayas} onChange={(opt) => setFilters({ ...filters, wilaya: opt ? opt.value : "", commune: "" })} value={constants.wilayas.find((c) => c.value === filters.wilaya) || null} placeholder="Toutes" isClearable styles={selectStyles} />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Commune</label>
          <Select name="commune" options={getCommunesListOptions(filters.wilaya)} isDisabled={!filters.wilaya} value={getCommunesListOptions(filters.wilaya).find((c) => c.value === filters.commune) || null} onChange={handleSelectChange} placeholder={filters.wilaya ? "Toutes" : "Wilaya d'abord"} isClearable styles={selectStyles} />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${tw.surfaceMuted}`}>

      {/* HEADER */}
      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h1 className={`text-4xl font-extrabold ${tw.textOnDark} mb-2 tracking-tight`}>Offres d'emploi</h1>
          <p className={`${tw.textPrimaryOnDark} text-base`}>
            {totalCount > 0 ? `${totalCount} offre${totalCount > 1 ? "s" : ""} disponible${totalCount > 1 ? "s" : ""}` : "Trouvez votre prochain emploi en Algérie"}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* Bouton filtres mobile */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <p className={`text-sm ${tw.textMuted700}`}>
            <span className={`font-semibold ${tw.textStrong}`}>{totalCount}</span> offre{totalCount > 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters || hasFilters ? tw.toggleFilterActive : tw.toggleFilterInactive}`}
          >
            <SlidersHorizontal size={14} />
            Filtres
            {hasFilters && <span className={`w-1.5 h-1.5 rounded-full ${tw.bgAmber400}`} />}
          </button>
        </div>

        {/* Filtres mobile dépliables */}
        {showFilters && <div className="mb-4 md:hidden">{filtersPanel}</div>}

        <div className="flex flex-col md:flex-row gap-6">
          {/* FILTRES desktop */}
          <aside className="hidden md:block w-72 shrink-0">
            {filtersPanel}
          </aside>

          {/* RÉSULTATS */}
          <main className="flex-1 min-w-0">
            {/* RECOMMANDATIONS */}
            {recommandations.length > 0 && (
              <div className="mb-6">
                <h2 className={`text-sm font-bold ${tw.textStrong} mb-3 flex items-center gap-2`}>
                  <Sparkles size={15} className={tw.textAmber500} />
                  Recommandées pour vous
                </h2>
                <div className="flex overflow-x-auto gap-3 pb-3">
                  {recommandations.map((rec) => (
                    <div key={rec.id} className={`min-w-70 ${tw.surface} border ${tw.borderPrimary200} rounded-xl p-4 shrink-0 hover:shadow-sm transition-all`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-semibold rounded-full`}>
                          {rec.matching_score >= 80 ? "⭐ Top Match" : "Recommandé"}
                        </span>
                        <span className={`text-xs font-bold ${tw.textPrimary}`}>{rec.matching_score}%</span>
                      </div>
                      <Link to={`/jobs/${rec.id}`} className={`text-sm font-semibold ${tw.textStrong} ${tw.hoverTextPrimary} line-clamp-1 block mb-1`}>
                        {rec.titre}
                      </Link>
                      <p className={`text-xs ${tw.textMuted700} mb-3`}>{rec.entreprise?.nom_entreprise || "Entreprise anonyme"}</p>
                      <Link to={`/jobs/${rec.id}`} className={`block text-center py-1.5 ${tw.bgPrimarySolid} text-xs font-semibold rounded-lg transition-colors`}>
                        Voir l'offre
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMPTEUR + CHIPS FILTRES ACTIFS */}
            <div className="mb-4 space-y-3">
              <div className="hidden md:flex items-center justify-between">
                <p className={`text-sm ${tw.textMuted700}`}>
                  <span className={`font-semibold ${tw.textStrong}`}>{totalCount}</span>{" "}
                  offre{totalCount > 1 ? "s" : ""} trouvée{totalCount > 1 ? "s" : ""}
                  {totalPages > 1 && <span className={`ml-2 ${tw.textMuted}`}>— page {currentPage}/{totalPages}</span>}
                </p>
                {hasFilters && (
                  <button onClick={handleReset} className={`text-xs ${tw.textMuted} ${tw.hoverTextPrimary} transition-colors flex items-center gap-1`}>
                    <X size={11} /> Tout effacer
                  </button>
                )}
              </div>

              {/* Chips filtres actifs */}
              {activeChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeChips.map(({ key, label }) => (
                    <span key={key} className={`inline-flex items-center gap-1.5 px-3 py-1 ${tw.bgPrimarySoft} border ${tw.borderPrimary200} ${tw.textPrimaryStrong} text-xs font-semibold rounded-full`}>
                      {label}
                      <button onClick={() => removeFilter(key)} className={`${tw.hoverTextPrimary900} transition-colors`}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* LISTE */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <SkeletonJobCard key={i} />)}
              </div>
            ) : jobs.length === 0 ? (
              <div className={`${tw.surface} border border-dashed ${tw.borderBase} rounded-2xl p-12 text-center`}>
                <Search size={32} className={`${tw.textSubtle} mx-auto mb-3`} />
                <p className={`text-sm font-medium ${tw.textStrong} mb-1`}>Aucune offre trouvée</p>
                <p className={`text-xs ${tw.textMuted700} mb-4`}>Essayez de supprimer un filtre ou de rechercher un terme plus général.</p>
                <button onClick={handleReset} className={`px-4 py-2 ${tw.buttonDark} text-sm font-semibold rounded-lg`}>
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {jobs.map((job) => {
                    const isSaved = favoris.some((f) => f.offre === job.id);
                    const logoUrl = getMediaUrl(job.entreprise?.logo_url);
                    return (
                      <div key={job.id} className={`${tw.surface} ${tw.jobCardBorderHover} border rounded-2xl p-4 md:p-5 hover:shadow-md transition-all`}>
                        <div className="flex items-start gap-3 md:gap-4">
                          <LogoEntreprise url={logoUrl} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <Link to={`/jobs/${job.id}`} className={`text-base font-bold ${tw.textStrong} ${tw.hoverTextPrimary} transition-colors leading-snug`}>
                                  {job.titre}
                                </Link>
                                <div className="mt-0.5">
                                  {job.entreprise ? (
                                    <Link to={`/entreprise/${job.entreprise.slug}`} className={`text-sm ${tw.textPrimary} hover:underline font-semibold`}>
                                      {job.entreprise.nom_entreprise}
                                    </Link>
                                  ) : (
                                    <span className={`text-sm ${tw.textMuted700} font-medium`}>Entreprise anonyme</span>
                                  )}
                                </div>
                                {job.date_publication && (
                                  <p className={`text-xs ${tw.textMuted} mt-1 flex items-center gap-1`}>
                                    <Clock size={10} /> {tempsDepuis(job.date_publication)}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleToggleFavori(job.id)}
                                className={`p-2 rounded-lg border transition-colors shrink-0 ${isSaved ? tw.bookmarkActive : tw.bookmarkInactive}`}
                                title={isSaved ? "Retirer des favoris" : "Sauvegarder"}
                              >
                                <Bookmark size={15} className={isSaved ? tw.fillAmber500 : ""} />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.tagNeutralSolid} text-xs font-medium rounded-lg`}>
                                <MapPin size={11} />
                                {job.wilaya?.split(" - ")[1] || job.wilaya}
                                {job.commune ? ` · ${job.commune}` : ""}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.tagNeutralSolid} text-xs font-medium rounded-lg`}>
                                <Briefcase size={11} /> {expLabel(job.experience_requise)}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-semibold rounded-lg`}>
                                {CONTRAT_LABELS[job.type_contrat] || job.type_contrat}
                              </span>
                              {job.nombre_postes > 1 && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.bgSuccessSoft} ${tw.textSuccess} text-xs font-semibold rounded-lg`}>
                                  {job.nombre_postes} postes
                                </span>
                              )}
                              <Link to={`/jobs/${job.id}`} className={`ml-auto px-4 py-1.5 ${tw.bgPrimarySolid} text-xs font-semibold rounded-lg transition-colors`}>
                                Voir l'offre
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => goToPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg border ${tw.borderBase} text-sm font-medium ${tw.textMuted700} ${tw.rowHover} disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
                    >
                      <ChevronLeft size={15} /> Précédent
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) =>
                          p === "..." ? (
                            <span key={`sep-${idx}`} className={`px-2 ${tw.textMuted} text-sm`}>…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => goToPage(p)}
                              className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${p === currentPage ? tw.paginationActive : tw.paginationInactive}`}
                            >
                              {p}
                            </button>
                          )
                        )}
                    </div>
                    <button
                      onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg border ${tw.borderBase} text-sm font-medium ${tw.textMuted700} ${tw.rowHover} disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
                    >
                      Suivant <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default JobsList;
