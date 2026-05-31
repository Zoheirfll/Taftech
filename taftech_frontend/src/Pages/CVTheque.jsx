import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../Services/jobsService";
import Select from "react-select";
import toast from "react-hot-toast";
import { reportError } from "../utils/errorReporter";
import { selectStyles } from "../theme";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  GraduationCap,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  CheckCircle2,
  Star,
  Circle,
} from "lucide-react";

const OPTIONS_EXPERIENCE = [
  { value: "0.5", label: "6 mois et +" },
  { value: "1", label: "1 an et +" },
  { value: "2", label: "2 ans et +" },
  { value: "3", label: "3 ans et +" },
  { value: "5", label: "5 ans et +" },
  { value: "10", label: "10 ans et +" },
];

const OPTIONS_TRI = [
  { value: "recents", label: "Plus récents" },
  { value: "nom_asc", label: "Nom (A-Z)" },
  { value: "experience_desc", label: "Plus expérimentés" },
];

// Style de react-select sobre et pro

const CVTheque = () => {
  const [candidats, setCandidats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
  });

  // Filtres
  const [search, setSearch] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [diplome, setDiplome] = useState("");
  const [experience, setExperience] = useState("");
  const [avecPhoto, setAvecPhoto] = useState(false);
  const [avecCV, setAvecCV] = useState(false);
  const [inscritRecent, setInscritRecent] = useState(false);
  const [tri, setTri] = useState("recents");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCandidats, setTotalCandidats] = useState(0);

  // UI
  const [selectedCandidat, setSelectedCandidat] = useState(null);
  const [showFiltres, setShowFiltres] = useState(true);
  const [activeTab, setActiveTab] = useState("tous"); // "tous" ou "favoris"

  useEffect(() => {
    const loadConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setConstants(data);
      } catch (err) {
        toast.error("Erreur de chargement des filtres.");
        reportError("ECHEC_CHARGEMENT_FILTRES_CVTHEQUE", err);
      }
    };
    loadConstants();
  }, []);

  const chargerCandidats = useCallback(async () => {
    setLoading(true);
    try {
      const filtres = {
        search,
        wilaya,
        specialite,
        diplome,
        experience,
        avec_photo: avecPhoto,
        avec_cv: avecCV,
        inscrit_recent: inscritRecent,
        favoris: activeTab === "favoris",
        tri,
      };
      const data = await jobsService.searchCVtheque(filtres, currentPage);
      setCandidats(data.results || []);
      setTotalCandidats(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / 10));

      // Auto-sélection du premier candidat sur desktop
      if (data.results && data.results.length > 0) {
        setSelectedCandidat(data.results[0]);
      } else {
        setSelectedCandidat(null);
      }
    } catch (error) {
      if (error.error) toast.error(error.error);
      reportError("ECHEC_RECHERCHE_CVTHEQUE", error);
      setCandidats([]);
    } finally {
      setLoading(false);
    }
  }, [
    search,
    wilaya,
    specialite,
    diplome,
    experience,
    avecPhoto,
    avecCV,
    inscritRecent,
    tri,
    activeTab,
    currentPage,
  ]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      chargerCandidats();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [chargerCandidats]);

  const handleReset = () => {
    setSearch("");
    setWilaya("");
    setSpecialite("");
    setDiplome("");
    setExperience("");
    setAvecPhoto(false);
    setAvecCV(false);
    setInscritRecent(false);
    setTri("recents");
    setCurrentPage(1);
  };
  const handleToggleFavori = async (candidat, e) => {
    e.stopPropagation(); // Empêche le clic d'ouvrir le détail

    if (!candidat.user_id) {
      toast.error("Impossible de modifier les favoris.");
      return;
    }

    try {
      const result = await jobsService.toggleFavoriCV(candidat.user_id);

      // Mise à jour locale : on toggle is_favori dans la liste
      setCandidats((prev) =>
        prev.map((c) =>
          c.user_id === candidat.user_id
            ? { ...c, is_favori: result.is_favori }
            : c,
        ),
      );

      // Mise à jour du candidat sélectionné si c'est lui
      if (selectedCandidat?.user_id === candidat.user_id) {
        setSelectedCandidat({
          ...selectedCandidat,
          is_favori: result.is_favori,
        });
      }

      if (result.is_favori) {
        toast.success("Ajouté aux favoris", {
          icon: "⭐",
        });
      } else {
        toast.success("Retiré des favoris");
      }
    } catch (err) {
      toast.error("Erreur lors de la mise à jour des favoris.");
      reportError("ECHEC_TOGGLE_FAVORI_CV", err);
    }
  };

  const getMediaUrl = (path) =>
    path
      ? path.startsWith("http")
        ? path
        : `http://127.0.0.1:8000${path}`
      : null;

  const isRecent = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const diff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 30;
  };
  const getStatutActivite = (lastLogin) => {
    if (!lastLogin) return null;
    const date = new Date(lastLogin);
    const heures = (Date.now() - date.getTime()) / (1000 * 60 * 60);

    if (heures < 24) {
      return {
        label: "Actif aujourd'hui",
        color: "bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      };
    }
    if (heures < 24 * 7) {
      return {
        label: "Actif cette semaine",
        color: "bg-blue-50 text-blue-700",
        dot: "bg-blue-500",
      };
    }
    if (heures < 24 * 30) {
      return {
        label: "Actif ce mois",
        color: "bg-slate-100 text-slate-600",
        dot: "bg-slate-400",
      };
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
    });
  };

  const filtresActifs = [
    wilaya,
    specialite,
    diplome,
    experience,
    avecPhoto,
    avecCV,
    inscritRecent,
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Explorez le vivier de CV
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Recherchez parmi nos talents et trouvez le profil idéal pour votre
          équipe.
        </p>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("tous");
            setCurrentPage(1);
          }}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "tous"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          CVthèque
        </button>
        <button
          onClick={() => {
            setActiveTab("favoris");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "favoris"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Star
            size={14}
            className={activeTab === "favoris" ? "fill-amber-500" : ""}
          />
          Favoris
        </button>
      </div>

      {/* BARRE DE RECHERCHE + BOUTON FILTRES */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <button
          onClick={() => setShowFiltres(!showFiltres)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal size={16} />
          Filtres
          {filtresActifs > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-xs font-semibold rounded-full">
              {filtresActifs}
            </span>
          )}
        </button>

        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Mots clés, métier, poste..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <Select
          options={OPTIONS_TRI}
          value={OPTIONS_TRI.find((o) => o.value === tri)}
          onChange={(val) => setTri(val.value)}
          styles={selectStyles}
          isSearchable={false}
          className="md:w-56"
        />
      </div>

      {/* PANNEAU FILTRES */}
      {showFiltres && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Select
              options={constants.wilayas}
              placeholder="Wilaya"
              isClearable
              value={constants.wilayas.find((w) => w.value === wilaya) || null}
              onChange={(val) => {
                setWilaya(val ? val.value : "");
                setCurrentPage(1);
              }}
              styles={selectStyles}
            />
            <Select
              options={constants.secteurs}
              placeholder="Spécialité"
              isClearable
              value={
                constants.secteurs.find((s) => s.value === specialite) || null
              }
              onChange={(val) => {
                setSpecialite(val ? val.value : "");
                setCurrentPage(1);
              }}
              styles={selectStyles}
            />
            <Select
              options={constants.diplomes}
              placeholder="Diplôme"
              isClearable
              value={
                constants.diplomes.find((d) => d.value === diplome) || null
              }
              onChange={(val) => {
                setDiplome(val ? val.value : "");
                setCurrentPage(1);
              }}
              styles={selectStyles}
            />
            <Select
              options={OPTIONS_EXPERIENCE}
              placeholder="Expérience minimum"
              isClearable
              value={
                OPTIONS_EXPERIENCE.find((e) => e.value === experience) || null
              }
              onChange={(val) => {
                setExperience(val ? val.value : "");
                setCurrentPage(1);
              }}
              styles={selectStyles}
            />
          </div>

          {/* Filtres rapides en checkboxes */}
          <div className="flex flex-wrap gap-2 items-center pt-3 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500 mr-2">
              Filtres rapides :
            </span>
            <button
              onClick={() => setAvecPhoto(!avecPhoto)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                avecPhoto
                  ? "bg-indigo-50 border-blue-300 text-indigo-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {avecPhoto && <CheckCircle2 size={14} />}
              Avec photo
            </button>
            <button
              onClick={() => setAvecCV(!avecCV)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                avecCV
                  ? "bg-indigo-50 border-blue-300 text-indigo-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {avecCV && <CheckCircle2 size={14} />}
              Avec CV téléchargé
            </button>
            <button
              onClick={() => setInscritRecent(!inscritRecent)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                inscritRecent
                  ? "bg-indigo-50 border-blue-300 text-indigo-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {inscritRecent && <CheckCircle2 size={14} />}
              <Sparkles size={12} />
              Inscrits récemment
            </button>

            {filtresActifs > 0 && (
              <button
                onClick={handleReset}
                className="ml-auto text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {/* COMPTEUR */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading ? (
            "Recherche en cours..."
          ) : (
            <>
              <span className="font-semibold text-slate-900">
                {totalCandidats}
              </span>{" "}
              {totalCandidats > 1 ? "profils trouvés" : "profil trouvé"}
            </>
          )}
        </p>
      </div>

      {/* SPLIT-VIEW : LISTE À GAUCHE + DÉTAIL À DROITE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNE GAUCHE : LISTE */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-xs text-slate-500 mt-3">Chargement...</p>
            </div>
          ) : candidats.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              {activeTab === "favoris" ? (
                <>
                  <Star size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900">
                    Aucun favori pour l'instant
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Cliquez sur l'étoile d'un profil pour l'ajouter ici
                  </p>
                </>
              ) : (
                <>
                  <User size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900">
                    Aucun profil trouvé
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Essayez d'élargir vos critères
                  </p>
                </>
              )}
            </div>
          ) : (
            candidats.map((candidat) => {
              const isSelected = selectedCandidat?.email === candidat.email;
              const recent = isRecent(candidat.date_joined);
              const statutActivite = getStatutActivite(candidat.last_login);
              return (
                <div
                  key={candidat.email}
                  onClick={() => setSelectedCandidat(candidat)}
                  className={`relative cursor-pointer w-full text-left bg-white border rounded-xl p-4 transition-all ${
                    isSelected
                      ? "border-indigo-500 ring-2 ring-indigo-100 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* ÉTOILE FAVORI */}
                  <button
                    onClick={(e) => handleToggleFavori(candidat, e)}
                    className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-slate-100 transition-colors group/star"
                    title={
                      candidat.is_favori
                        ? "Retirer des favoris"
                        : "Ajouter aux favoris"
                    }
                  >
                    <Star
                      size={16}
                      className={
                        candidat.is_favori
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 group-hover/star:text-slate-500"
                      }
                    />
                  </button>

                  <div className="flex gap-3 pr-8">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {candidat.photo_profil ? (
                        <img
                          src={getMediaUrl(candidat.photo_profil)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {candidat.titre_professionnel || "Profil candidat"}
                        </h3>
                        {recent && (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full">
                            <Sparkles size={10} />
                            Nouveau
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {statutActivite && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statutActivite.dot}`}
                            title={statutActivite.label}
                          />
                        )}
                        <p className="text-xs text-slate-600 truncate">
                          {candidat.last_name} {candidat.first_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        {candidat.wilaya && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            {candidat.wilaya.split(" - ")[1] || candidat.wilaya}
                          </span>
                        )}
                        {candidat.diplome && (
                          <span className="flex items-center gap-1">
                            <GraduationCap size={11} />
                            {candidat.diplome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Précédent
              </button>
              <span className="text-xs text-slate-500">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* COLONNE DROITE : DÉTAIL */}
        <div className="lg:col-span-2">
          {selectedCandidat ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* En-tête détail */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedCandidat.photo_profil ? (
                      <img
                        src={getMediaUrl(selectedCandidat.photo_profil)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={32} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          {selectedCandidat.titre_professionnel ||
                            "Profil candidat"}
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                          {selectedCandidat.last_name}{" "}
                          {selectedCandidat.first_name}
                        </p>
                      </div>
                      {/* BOUTON FAVORI */}
                      <button
                        onClick={(e) => handleToggleFavori(selectedCandidat, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                      >
                        <Star
                          size={14}
                          className={
                            selectedCandidat.is_favori
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-400"
                          }
                        />
                        {selectedCandidat.is_favori ? "En favori" : "Favori"}
                      </button>
                    </div>

                    {/* BADGE ACTIVITÉ */}
                    {getStatutActivite(selectedCandidat.last_login) && (
                      <div className="mt-2">
                        {(() => {
                          const statut = getStatutActivite(
                            selectedCandidat.last_login,
                          );
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statut.color}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statut.dot}`}
                              />
                              {statut.label}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedCandidat.wilaya && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">
                          <MapPin size={12} />
                          {selectedCandidat.wilaya}
                          {selectedCandidat.commune &&
                            ` · ${selectedCandidat.commune}`}
                        </span>
                      )}
                      {selectedCandidat.diplome && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">
                          <GraduationCap size={12} />
                          {selectedCandidat.diplome}
                        </span>
                      )}
                      {selectedCandidat.specialite && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">
                          <Briefcase size={12} />
                          {selectedCandidat.specialite}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coordonnées */}
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Coordonnées
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="text-slate-700 truncate">
                      {selectedCandidat.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="text-slate-700">
                      {selectedCandidat.telephone || "Non renseigné"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expériences */}
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  Expériences professionnelles
                </h3>
                {selectedCandidat.experiences_detail?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidat.experiences_detail.map((exp) => (
                      <div
                        key={exp.id}
                        className="pl-4 border-l-2 border-indigo-100"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {exp.titre_poste}
                        </p>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {exp.entreprise}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(exp.date_debut)} —{" "}
                          {exp.date_fin
                            ? formatDate(exp.date_fin)
                            : "Aujourd'hui"}
                        </p>
                        {exp.description && (
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    Aucune expérience renseignée
                  </p>
                )}
              </div>

              {/* Formations */}
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  Formations
                </h3>
                {selectedCandidat.formations_detail?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidat.formations_detail.map((form) => (
                      <div
                        key={form.id}
                        className="pl-4 border-l-2 border-indigo-100"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {form.diplome || "Diplôme non précisé"}
                        </p>
                        {form.description && (
                          <p className="text-xs text-indigo-600 font-medium">
                            {form.description}
                          </p>
                        )}
                        <p className="text-sm text-slate-600 mt-0.5">
                          {form.etablissement}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(form.date_debut)} —{" "}
                          {form.date_fin
                            ? formatDate(form.date_fin)
                            : "En cours"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    Aucune formation renseignée
                  </p>
                )}
              </div>

              {/* Compétences & Langues */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Compétences
                  </h3>
                  {selectedCandidat.competences ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidat.competences
                        .split(",")
                        .filter((c) => c.trim())
                        .map((c, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md"
                          >
                            {c.trim()}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Non renseignées
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Langues
                  </h3>
                  {selectedCandidat.langues ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidat.langues
                        .split(",")
                        .filter((l) => l.trim())
                        .map((l, i) => {
                          const [name, level] = l.split(":");
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md"
                            >
                              {name?.trim()}
                              {level && (
                                <span className="text-slate-500">
                                  · {level.trim()}
                                </span>
                              )}
                            </span>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Non renseignées
                    </p>
                  )}
                </div>
              </div>

              {/* CV PDF */}
              {selectedCandidat.cv_pdf && (
                <div className="px-6 pb-6">
                  <a
                    href={getMediaUrl(selectedCandidat.cv_pdf)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <FileText size={16} />
                    Télécharger le CV complet
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <User size={40} className="text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-900">
                Sélectionnez un profil
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Cliquez sur un candidat à gauche pour voir son profil détaillé
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CVTheque;
