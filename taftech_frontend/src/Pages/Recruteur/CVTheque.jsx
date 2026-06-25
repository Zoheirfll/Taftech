import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import InfoBanner from "../../Components/InfoBanner";
import { jobsService } from "../../Services/jobsService";
import Select from "react-select";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl as getMediaUrl } from "../../utils/mediaUrl";
import { selectStyles } from "../../theme";
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
  Zap,
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
  const [isPremium, setIsPremium] = useState(false);

  // Matching IA par offre
  const [offreId, setOffreId] = useState("");
  const [offresActives, setOffresActives] = useState([]);

  useEffect(() => {
    const loadInit = async () => {
      try {
        const [data, dash] = await Promise.all([
          jobsService.getConstants(),
          jobsService.getDashboard(),
        ]);
        setConstants(data);
        const offres = (dash.offres || []).filter(o => o.est_active && !o.est_cloturee && o.statut_moderation === 'APPROUVEE');
        setOffresActives(offres.map(o => ({ value: String(o.id), label: o.titre })));
      } catch (err) {
        toast.error("Erreur de chargement des filtres.");
        reportError("ECHEC_CHARGEMENT_FILTRES_CVTHEQUE", err);
      }
    };
    loadInit();
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
        ...(offreId ? { offre_id: offreId } : {}),
      };
      const data = await jobsService.searchCVtheque(filtres, currentPage);
      setCandidats(data.results || []);
      setTotalCandidats(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / 10));
      if (data.is_premium !== undefined) setIsPremium(data.is_premium);

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
    offreId,
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
    setOffreId("");
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
      {/* BANNIÈRE PREMIUM */}
      {!isPremium && (
        <div className="mb-6 bg-linear-to-br from-teal-700 to-teal-900 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="text-white font-bold text-sm">Accès limité — Coordonnées masquées</p>
              <p className="text-teal-200 text-xs mt-0.5">Passez en Premium pour accéder aux emails, téléphones et réseaux sociaux des candidats.</p>
            </div>
          </div>
          <Link to="/recruteurs/premium" className="shrink-0 px-4 py-2 bg-white text-teal-700 text-sm font-bold rounded-xl hover:bg-teal-50 transition-colors">
            Passer Premium →
          </Link>
        </div>
      )}
      {isPremium && (
        <div className="mb-6 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 w-fit">
          <span className="text-teal-700 text-sm font-bold">⭐ Compte Premium actif</span>
          <span className="text-teal-600 text-xs">— Accès complet aux coordonnées</span>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Explorez le vivier de CV
        </h1>
        <p className="text-sm text-slate-700 mt-1">
          Recherchez parmi nos talents et trouvez le profil idéal pour votre équipe.
        </p>
      </div>

      <div className="mb-4">
        <InfoBanner storageKey="cvtheque" title="Comment utiliser la CVthèque ?" color="teal">
          Filtrez par wilaya, diplôme, spécialité ou expérience. Cliquez sur un profil pour voir le détail, télécharger le CV et lancer une analyse IA.
          Ajoutez des candidats à vos <strong>favoris ⭐</strong> pour les retrouver facilement dans l'onglet "Favoris".
          Utilisez <strong>"Comparer avec une offre"</strong> pour classer automatiquement les candidats par score de compatibilité avec une de vos offres.
          Les coordonnées (email, téléphone) sont visibles uniquement avec un compte Premium.
        </InfoBanner>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => { setActiveTab("tous"); setCurrentPage(1); }}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "tous"
              ? "border-teal-700 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          CVthèque
        </button>
        <button
          onClick={() => { setActiveTab("favoris"); setCurrentPage(1); }}
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
          className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <SlidersHorizontal size={16} />
          Filtres
          {filtresActifs > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-teal-700 text-white text-xs font-semibold rounded-full">
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
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {!offreId && (
          <Select
            options={OPTIONS_TRI}
            value={OPTIONS_TRI.find((o) => o.value === tri)}
            onChange={(val) => setTri(val.value)}
            styles={selectStyles}
            isSearchable={false}
            className="md:w-56"
          />
        )}

        <Select
          options={[{ value: "", label: "Comparer avec une offre…" }, ...offresActives]}
          value={offresActives.find(o => o.value === offreId) || { value: "", label: "Comparer avec une offre…" }}
          onChange={(val) => { setOffreId(val?.value || ""); setCurrentPage(1); }}
          styles={selectStyles}
          isSearchable={false}
          className="md:w-64"
          placeholder="Comparer avec une offre…"
        />
      </div>

      {offreId && (
        <div className="mb-4 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
          <Zap size={15} className="text-teal-700 shrink-0" />
          <span className="text-sm font-semibold text-teal-800">
            Classement par compatibilité activé —{" "}
            <span className="font-normal text-teal-700">
              {offresActives.find(o => o.value === offreId)?.label}
            </span>
          </span>
          <button onClick={() => setOffreId("")} className="ml-auto text-teal-500 hover:text-teal-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* PANNEAU FILTRES */}
      {showFiltres && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
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
            <span className="text-xs font-medium text-slate-600 mr-2">
              Filtres rapides :
            </span>
            <button
              onClick={() => setAvecPhoto(!avecPhoto)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                avecPhoto
                  ? "bg-teal-50 border-blue-300 text-teal-800"
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
                  ? "bg-teal-50 border-blue-300 text-teal-800"
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
                  ? "bg-teal-50 border-blue-300 text-teal-800"
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
                className="ml-auto text-xs font-medium text-slate-500 hover:text-teal-700 transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {/* COMPTEUR */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-700">
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700 mx-auto"></div>
              <p className="text-xs text-slate-600 mt-3">Chargement...</p>
            </div>
          ) : candidats.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              {activeTab === "favoris" ? (
                <>
                  <Star size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900">
                    Aucun favori pour l'instant
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Cliquez sur l'étoile d'un profil pour l'ajouter ici
                  </p>
                </>
              ) : (
                <>
                  <User size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900">
                    Aucun profil trouvé
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
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
                      ? "border-teal-500 ring-2 ring-teal-100 shadow-sm"
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
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
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
                        <div className="flex items-center gap-1 shrink-0">
                          {offreId && 'score_offre' in candidat && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              candidat.score_offre >= 70 ? "bg-emerald-50 text-emerald-700" :
                              candidat.score_offre >= 40 ? "bg-amber-50 text-amber-700" :
                              "bg-slate-100 text-slate-500"
                            }`}>
                              <Zap size={9} />
                              {candidat.score_offre}%
                            </span>
                          )}
                          {recent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full">
                              <Sparkles size={10} />
                              Nouveau
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {statutActivite && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${statutActivite.dot}`}
                            title={statutActivite.label}
                          />
                        )}
                        <p className="text-xs text-slate-600 truncate">
                          {candidat.last_name} {candidat.first_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
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
              <span className="text-xs text-slate-600">
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
            <div className="relative bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* OVERLAY PREMIUM */}
              {!isPremium && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
                  <div className="text-center px-8 max-w-sm">
                    <div className="w-16 h-16 bg-teal-50 border-2 border-teal-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">🔒</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Accès Premium requis</h3>
                    <p className="text-sm text-slate-700 mb-6 leading-relaxed">
                      Passez en compte Premium pour accéder aux profils complets, coordonnées, CV et réseaux sociaux des candidats.
                    </p>
                    <Link
                      to="/recruteurs/premium"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-800 transition-colors shadow-sm"
                    >
                      ⭐ Passer Premium
                    </Link>
                  </div>
                </div>
              )}
              {/* En-tête détail */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
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
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Coordonnées</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span className="text-slate-700 truncate">{selectedCandidat.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span className="text-slate-700">{selectedCandidat.telephone || "Non renseigné"}</span>
                  </div>
                </div>
              </div>

              {/* Expériences */}
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">
                  Expériences professionnelles
                </h3>
                {selectedCandidat.experiences_detail?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidat.experiences_detail.map((exp) => (
                      <div
                        key={exp.id}
                        className="pl-4 border-l-2 border-teal-100"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {exp.titre_poste}
                        </p>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {exp.entreprise}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
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
                  <p className="text-sm text-slate-600 italic">
                    Aucune expérience renseignée
                  </p>
                )}
              </div>

              {/* Formations */}
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">
                  Formations
                </h3>
                {selectedCandidat.formations_detail?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidat.formations_detail.map((form) => (
                      <div
                        key={form.id}
                        className="pl-4 border-l-2 border-teal-100"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {form.diplome || "Diplôme non précisé"}
                        </p>
                        {form.description && (
                          <p className="text-xs text-teal-700 font-medium">
                            {form.description}
                          </p>
                        )}
                        <p className="text-sm text-slate-600 mt-0.5">
                          {form.etablissement}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
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
                  <p className="text-sm text-slate-600 italic">
                    Aucune formation renseignée
                  </p>
                )}
              </div>

              {/* Compétences & Langues */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
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
                            className="px-2.5 py-1 bg-teal-50 text-teal-800 text-xs rounded-md"
                          >
                            {c.trim()}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 italic">
                      Non renseignées
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
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
                                <span className="text-slate-600">
                                  · {level.trim()}
                                </span>
                              )}
                            </span>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 italic">
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
              <p className="text-xs text-slate-600 mt-1">
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
