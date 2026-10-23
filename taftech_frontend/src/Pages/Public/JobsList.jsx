import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import Select from "react-select";
import { notifier } from "../../utils/notifier";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl as getMediaUrl } from "../../utils/mediaUrl";
import { selectStyles, tw } from "../../theme";
import { grouperParFamille } from "../../utils/familleFormation";
import Seo from "../../Components/Seo";
import { jobUrl } from "../../utils/slugify";
import { CONTRAT_LABELS, contratsTexte, lieuxTexte } from "../../utils/lieuxContrats";
import { libellesDiplomesCompacts } from "../../utils/groupesDiplomes";
import { joindre } from "../../utils/listeFrancaise";
import {
  MapPin, Briefcase, Bookmark, Sparkles, Search, GraduationCap,
  X, Building2, Clock, ChevronLeft, ChevronRight, SlidersHorizontal,
} from "lucide-react";

// Niveau d'étude de la carte : diplômes regroupés par niveau (« Master / Ingéniorat (Bac +5) »), deux au plus puis
// « N autres », pour ne pas alourdir la carte (la page de l'offre garde le détail complet).
const diplomesTexte = (job) => joindre(libellesDiplomesCompacts(job.diplomes_requis_detail || []), "ou");

// Années d'expérience que le score attend (`experience_annees`) : « environ 3 ans », jamais une fourchette inventée.
const anneesTexte = (annees) => (annees > 0 ? ` (environ ${annees} an${annees > 1 ? "s" : ""})` : "");

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
  const [typesDiplomes, setTypesDiplomes] = useState([]);
  const [famillesFormation, setFamillesFormation] = useState([]);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    wilaya: searchParams.get("wilaya") || "",
    commune: "", diplome_id: "", secteur_id: "", experience: "", contrat: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isConnected = !!localStorage.getItem("userRole");
        const isCandidat = localStorage.getItem("userRole") === "CANDIDAT";
        const [constantsData, nomenclatureData, nomenclatureFormationData, favorisData, recommandationsData] = await Promise.all([
          jobsService.getConstants(),
          jobsService.getNomenclature().catch(() => ({ domaines: [] })),
          jobsService.getNomenclatureFormation().catch(() => ({ types_diplomes: [] })),
          isConnected ? api.get("jobs/sauvegardes/").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          isCandidat ? jobsService.getOffresRecommandees().catch(() => []) : Promise.resolve([]),
        ]);
        setConstants(constantsData);
        setNomenclature(nomenclatureData);
        setTypesDiplomes(
          (nomenclatureFormationData.types_diplomes || []).map((d) => ({ value: String(d.id), label: d.libelle, famille: d.famille })),
        );
        setFamillesFormation(nomenclatureFormationData.familles || []);
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
    if (!localStorage.getItem("userRole")) return notifier.erreur("Connexion requise", "Connectez-vous pour sauvegarder une offre.");
    const isDejaSauvegarde = favoris.find((f) => f.offre === offreId);
    if (isDejaSauvegarde) {
      setFavoris(favoris.filter((f) => f.offre !== offreId));
      try {
        await api.delete(`jobs/sauvegardes/${isDejaSauvegarde.id}/`);
        notifier.succes("Offre retirée des favoris");
      } catch (error) {
        setFavoris([...favoris, isDejaSauvegarde]);
        notifier.echec("Suppression impossible", error);
        reportError("ECHEC_SUPPRESSION_FAVORI", error);
      }
    } else {
      try {
        const response = await api.post("jobs/sauvegardes/", { offre: offreId });
        setFavoris([...favoris, response.data]);
        notifier.succes("Offre sauvegardée");
      } catch (error) {
        notifier.echec("Sauvegarde impossible", error);
        reportError("ECHEC_SAUVEGARDE_FAVORI", error);
      }
    }
  };

  const handleSelectChange = (selectedOption, actionMeta) => {
    setFilters({ ...filters, [actionMeta.name]: selectedOption ? selectedOption.value : "" });
  };

  const handleReset = () => {
    setFilters({ search: "", wilaya: "", commune: "", diplome_id: "", secteur_id: "", experience: "", contrat: "" });
    setSearchParams({});
    setCurrentPage(1);
  };

  const removeFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: "", ...(key === "wilaya" ? { commune: "" } : {}) }));
  };

  const hasFilters = Object.values(filters).some(Boolean);

  const secteursOptions = (nomenclature.secteurs || []).map((s) => ({ value: String(s.id), label: s.libelle }));

  // Chips des filtres actifs
  const activeChips = [
    filters.search && { key: "search", label: `"${filters.search}"` },
    filters.wilaya && { key: "wilaya", label: filters.wilaya.split(" - ")[1] || filters.wilaya },
    filters.secteur_id && { key: "secteur_id", label: secteursOptions.find((s) => s.value === filters.secteur_id)?.label || filters.secteur_id },
    filters.experience && { key: "experience", label: expLabel(filters.experience) },
    filters.contrat && { key: "contrat", label: CONTRAT_LABELS[filters.contrat] || filters.contrat },
    filters.diplome_id && { key: "diplome_id", label: typesDiplomes.find((d) => d.value === filters.diplome_id)?.label || filters.diplome_id },
  ].filter(Boolean);

  const filtersPanel = (
    <div className={`${tw.cardColors} rounded-2xl p-5 sticky top-20`}>
      <div className="flex justify-between items-center mb-5">
        <h2 className={`flex items-center gap-2 text-base font-bold ${tw.textStrong}`}>
          Filtres
          {activeChips.length > 0 && (
            <span className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold ${tw.bgPrimarySolid} flex items-center justify-center`}>
              {activeChips.length}
            </span>
          )}
        </h2>
        {hasFilters && (
          <button onClick={handleReset} className={`flex items-center gap-1 text-xs font-semibold ${tw.textPrimary} ${tw.hoverTextPrimary} transition-colors`}>
            <X size={12} /> Réinitialiser
          </button>
        )}
      </div>
      <div className="space-y-4">
        {[
          { label: "Secteur d'activité", name: "secteur_id", options: secteursOptions, placeholder: "Tous" },
          { label: "Expérience", name: "experience", options: constants.experiences, placeholder: "Toutes" },
          { label: "Type de contrat", name: "contrat", options: constants.contrats, placeholder: "Tous" },
          { label: "Diplôme", name: "diplome_id", options: typesDiplomes, placeholder: "Tous",
            groupes: grouperParFamille(typesDiplomes, famillesFormation, (o) => o) },
        ].map(({ label, name, options, placeholder, groupes }) => (
          <div key={name}>
            <label className={`text-sm font-semibold ${tw.textStrong} mb-1.5 block`}>{label}</label>
            <Select name={name} options={groupes || options} onChange={handleSelectChange} value={options.find((c) => c.value === filters[name]) || null} placeholder={placeholder} isClearable styles={selectStyles} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${tw.surfaceMuted}`}>
      <Seo
        title="Offres d'emploi en Algérie"
        description={`Parcourez ${totalCount > 0 ? `${totalCount} offres d'emploi` : "les offres d'emploi"} en Algérie sur TafTech — tous secteurs, toutes wilayas.`}
      />

      {/* HEADER */}
      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-24">
          <h1 className={`text-4xl font-extrabold ${tw.textOnDark} mb-2 tracking-tight`}>Offres d'emploi</h1>
          <p className={`${tw.textPrimaryOnDark} text-base`}>
            {totalCount > 0 ? `${totalCount} offre${totalCount > 1 ? "s" : ""} disponible${totalCount > 1 ? "s" : ""}` : "Trouvez votre prochain emploi en Algérie"}
          </p>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-10 relative z-10">
          {/* RECHERCHE : mêmes filtres que le panneau, appliqués en direct */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className={`${tw.surface} border ${tw.borderBase} rounded-2xl shadow-lg p-2 flex flex-col md:flex-row md:items-center gap-2 md:gap-0`}
          >
            <div className={`flex-1 flex items-center gap-3 px-3 py-2 border-b md:border-b-0 md:border-r ${tw.borderPrimarySoft}`}>
              <span className={`w-10 h-10 rounded-full ${tw.bgPrimarySoft} ${tw.textPrimary} flex items-center justify-center shrink-0`}>
                <Search size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <label htmlFor="offres-recherche" className={`text-xs font-semibold ${tw.textPrimaryStrong} block`}>Poste ou compétence</label>
                <input
                  id="offres-recherche"
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Métier, compétence, entreprise..."
                  className={`w-full bg-transparent outline-none text-sm font-medium ${tw.textStrong} ${tw.placeholderMuted}`}
                />
              </div>
            </div>
            <div className="flex-1 flex items-center gap-3 px-3 py-2">
              <span className={`w-10 h-10 rounded-full ${tw.bgPrimarySoft} ${tw.textPrimary} flex items-center justify-center shrink-0`}>
                <MapPin size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <label className={`text-xs font-semibold ${tw.textPrimaryStrong} block`}>Wilaya</label>
                <Select
                  name="wilaya"
                  options={constants.wilayas}
                  onChange={(opt) => setFilters({ ...filters, wilaya: opt ? opt.value : "", commune: "" })}
                  value={constants.wilayas.find((c) => c.value === filters.wilaya) || null}
                  placeholder="Toutes les wilayas"
                  isClearable
                  styles={{
                    control: (base) => ({ ...base, border: 0, boxShadow: "none", backgroundColor: "transparent", minHeight: "24px", cursor: "pointer" }),
                    valueContainer: (base) => ({ ...base, padding: 0 }),
                    singleValue: (base) => ({ ...base, color: "inherit" }),
                    input: (base) => ({ ...base, color: "inherit" }),
                    placeholder: (base) => ({ ...base, color: "inherit", opacity: 0.75 }),
                    dropdownIndicator: (base) => ({ ...base, color: "inherit" }),
                    clearIndicator: (base) => ({ ...base, color: "inherit" }),
                    indicatorSeparator: (base) => ({ ...base, opacity: 0.2 }),                    menu: (base) => ({ ...base, zIndex: 9999, borderRadius: "0.5rem", marginTop: "8px" }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>
            <button
              type="submit"
              className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold ${tw.bgPrimarySolid} ${tw.focusRing} transition-colors md:ml-2`}
            >
              <Search size={16} /> Rechercher
            </button>
          </form>
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
                      <Link to={jobUrl(rec)} className={`text-sm font-semibold ${tw.textStrong} ${tw.hoverTextPrimary} line-clamp-1 block mb-1`}>
                        {rec.titre}
                      </Link>
                      <p className={`text-xs ${tw.textMuted700} mb-3`}>{rec.entreprise?.nom_entreprise || "Entreprise anonyme"}</p>
                      <Link to={jobUrl(rec)} className={`block text-center py-1.5 ${tw.bgPrimarySolid} text-xs font-semibold rounded-lg transition-colors`}>
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
                                <Link to={jobUrl(job)} className={`text-base font-bold ${tw.textStrong} ${tw.hoverTextPrimary} transition-colors leading-snug`}>
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
                                {lieuxTexte(job)}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.tagNeutralSolid} text-xs font-medium rounded-lg`}>
                                <Briefcase size={11} /> {expLabel(job.experience_requise)}{anneesTexte(job.experience_annees)}
                              </span>
                              {diplomesTexte(job) && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.tagNeutralSolid} text-xs font-medium rounded-lg`}>
                                  <GraduationCap size={11} /> {diplomesTexte(job)}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-semibold rounded-lg`}>
                                {contratsTexte(job)}
                              </span>
                              {job.nombre_postes > 0 && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.bgSuccessSoft} ${tw.textSuccess} text-xs font-semibold rounded-lg`}>
                                  {job.nombre_postes} poste{job.nombre_postes > 1 ? "s" : ""} ouvert{job.nombre_postes > 1 ? "s" : ""}
                                </span>
                              )}
                              <Link to={jobUrl(job)} className={`ml-auto px-4 py-1.5 ${tw.bgPrimarySolid} text-xs font-semibold rounded-lg transition-colors`}>
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
