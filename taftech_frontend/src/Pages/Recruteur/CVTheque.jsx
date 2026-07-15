import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import InfoBanner from "../../Components/InfoBanner";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import Select from "react-select";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl as getMediaUrl } from "../../utils/mediaUrl";
import { selectStylesTeal, tw } from "../../theme";
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
  Zap,
  Copy,
  ExternalLink,
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
  const [showFiltres, setShowFiltres] = useState(false);
  const [activeTab, setActiveTab] = useState("tous"); // "tous" ou "favoris"
  const [isPremium, setIsPremium] = useState(false);
  const [consentGiven, setConsentGiven] = useState(null); // null = chargement, false = à demander, true = ok
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  // Matching IA par offre
  const [offreId, setOffreId] = useState("");
  const [offresActives, setOffresActives] = useState([]);
  const [showMatchingPanel, setShowMatchingPanel] = useState(false);

  // Accordéon détail
  const [openSections, setOpenSections] = useState({ competences: true, langues: true });
  const toggleSection = (key) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  // Ref pour scroll mobile vers détail
  const detailRef = React.useRef(null);
  const handleSelectCandidat = (candidat) => {
    setSelectedCandidat(candidat);
    setTimeout(() => {
      if (window.innerWidth < 1024 && detailRef.current) {
        detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  useEffect(() => {
    const checkConsent = async () => {
      try {
        const me = await authService.getMe();
        setConsentGiven(!!me.consentement_cvtheque);
      } catch (err) {
        reportError("ECHEC_CHECK_CONSENTEMENT_CVTHEQUE", err);
        setConsentGiven(false);
      }
    };
    checkConsent();
  }, []);

  const handleAccepterConsentement = async () => {
    setConsentLoading(true);
    try {
      await authService.accepterConsentementCVTheque();
      setConsentGiven(true);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du consentement.");
    } finally {
      setConsentLoading(false);
    }
  };

  useEffect(() => {
    if (!consentGiven) return;
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
  }, [consentGiven]);

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
    if (!consentGiven) return;
    const delayDebounce = setTimeout(() => {
      chargerCandidats();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [chargerCandidats, consentGiven]);

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
        color: `${tw.bgSuccessSoft} ${tw.textSuccess}`,
        dot: tw.dotEmerald500,
      };
    }
    if (heures < 24 * 7) {
      return {
        label: "Actif cette semaine",
        color: `${tw.bgBlueSoft} ${tw.textBlue}`,
        dot: tw.dotBlue500,
      };
    }
    if (heures < 24 * 30) {
      return {
        label: "Actif ce mois",
        color: `${tw.surfaceSubtle} ${tw.textMuted}`,
        dot: tw.dotSlate400,
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

  if (consentGiven === null) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`${tw.cardColors} rounded-xl p-5 animate-pulse space-y-3`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${tw.surfaceSubtle}`} />
              <div className="flex-1 space-y-1.5">
                <div className={`h-3.5 w-2/3 ${tw.surfaceSubtle} rounded`} />
                <div className={`h-3 w-1/2 ${tw.surfaceSubtle} rounded`} />
              </div>
            </div>
            <div className={`h-3 w-full ${tw.surfaceSubtle} rounded`} />
            <div className={`h-3 w-3/4 ${tw.surfaceSubtle} rounded`} />
          </div>
        ))}
      </div>
    );
  }

  if (consentGiven === false) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className={`${tw.cardColors} rounded-2xl shadow-sm p-8`}>
          <h2 className={`text-xl font-bold mb-2 ${tw.textStrong}`}>Avant d'accéder à la CVthèque</h2>
          <p className={`text-sm mb-6 ${tw.bodyText}`}>
            La CVthèque vous donne accès aux données personnelles de candidats. Merci de confirmer votre engagement avant de continuer.
          </p>
          <div className={`${tw.surfaceMuted} border ${tw.borderBase} rounded-xl p-4 mb-6`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className={`mt-0.5 w-4 h-4 cursor-pointer rounded ${tw.checkboxTeal}`}
              />
              <span className={`text-sm leading-relaxed ${tw.bodyText}`}>
                Je m'engage à traiter les données personnelles des candidats consultées dans la CVthèque
                uniquement dans le cadre du recrutement, et à ne pas les utiliser à d'autres fins,
                conformément à la loi n° 18-07 relative à la protection des données à caractère personnel.
              </span>
            </label>
          </div>
          <button
            disabled={!consentChecked || consentLoading}
            onClick={handleAccepterConsentement}
            className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tw.bgTealSolid}`}
          >
            {consentLoading ? "Enregistrement..." : "J'accepte et je continue"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* BANNIÈRE PREMIUM */}
      {!isPremium && (
        <div className={`mb-6 ${tw.bannerGradientTeal} rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className={`font-bold text-sm ${tw.textOnDark}`}>Accès limité — Coordonnées masquées</p>
              <p className={`text-xs mt-0.5 ${tw.textTeal200}`}>Passez en Premium pour accéder aux emails, téléphones et réseaux sociaux des candidats.</p>
            </div>
          </div>
          <Link to="/recruteurs/premium" className={`shrink-0 px-4 py-2 text-sm font-bold rounded-xl transition-colors ${tw.linkOnTealGradient}`}>
            Passer Premium →
          </Link>
        </div>
      )}
      {isPremium && (
        <div className={`mb-6 flex items-center gap-2 ${tw.bgTealSoft} border ${tw.borderTeal200} rounded-xl px-4 py-2.5 w-fit`}>
          <span className={`text-sm font-bold ${tw.textTeal}`}>⭐ Compte Premium actif</span>
          <span className={`text-xs ${tw.textTeal600}`}>— Accès complet aux coordonnées</span>
        </div>
      )}

      {/* HEADER + ONGLETS fusionnés */}
      <div className={`flex items-end justify-between border-b ${tw.borderBase} mb-5`}>
        <div className="flex gap-1">
          <button
            onClick={() => { setActiveTab("tous"); setCurrentPage(1); }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "tous"
                ? tw.segmentTabActiveTeal
                : tw.segmentTabInactive
            }`}
          >
            Explorez le vivier de CV
          </button>
          <button
            onClick={() => { setActiveTab("favoris"); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "favoris"
                ? tw.segmentTabActiveAmber
                : tw.segmentTabInactive
            }`}
          >
            <Star size={14} className={activeTab === "favoris" ? tw.fillAmber500 : ""} />
            Favoris
          </button>
        </div>
        <p className={`text-xs pb-3 hidden sm:block ${tw.textMuted}`}>
          Trouvez le profil idéal pour votre équipe
        </p>
      </div>

      <div className="mb-4">
        <InfoBanner storageKey="cvtheque" title="Comment utiliser la CVthèque ?" color="teal">
          Filtrez par wilaya, diplôme, spécialité ou expérience. Cliquez sur un profil pour voir le détail, télécharger le CV et lancer une analyse IA.
          Ajoutez des candidats à vos <strong>favoris ⭐</strong> pour les retrouver facilement dans l'onglet "Favoris".
          Utilisez <strong>"Comparer avec une offre"</strong> pour classer automatiquement les candidats par score de compatibilité avec une de vos offres.
          Les coordonnées (email, téléphone) sont visibles uniquement avec un compte Premium.
          L'accès à la CVthèque implique votre engagement à traiter les données des candidats <strong>uniquement dans le cadre du recrutement</strong>, conformément à la loi n° 18-07.
        </InfoBanner>
      </div>

      {/* BARRE DE RECHERCHE + BOUTON FILTRES */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <button
          onClick={() => setShowFiltres(!showFiltres)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors border ${tw.buttonFilterOutline}`}
        >
          <SlidersHorizontal size={16} />
          Filtres
          {filtresActifs > 0 && (
            <span className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full ${tw.bgTeal} ${tw.textOnDark}`}>
              {filtresActifs}
            </span>
          )}
        </button>

        <div className="flex-1 relative">
          <Search
            size={18}
            className={`absolute left-4 top-1/2 -translate-y-1/2 ${tw.textMuted}`}
          />
          <input
            type="text"
            placeholder="Mots clés, métier, poste..."
            className={`w-full pl-11 pr-4 py-2.5 rounded-xl text-sm ${tw.inputColorsWhiteTeal}`}
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
            styles={selectStylesTeal}
            isSearchable={false}
            className="md:w-48"
          />
        )}

        <div className="relative shrink-0">
          <button
            onClick={() => setShowMatchingPanel(p => !p)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              offreId
                ? tw.chipTealActive
                : tw.chipTealInactive
            }`}
          >
            <Zap size={15} />
            {offreId ? "Matching actif" : "Matching IA"}
            {offreId
              ? <button onClick={(e) => { e.stopPropagation(); setOffreId(""); setShowMatchingPanel(false); }} className="ml-1 opacity-70 hover:opacity-100"><X size={13} /></button>
              : <ChevronRight size={13} className={`transition-transform ${showMatchingPanel ? "rotate-90" : ""}`} />
            }
          </button>

          {showMatchingPanel && (
            <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-xl z-30 p-4 ${tw.cardColors}`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={15} className={tw.textTeal} />
                <p className={`text-sm font-bold ${tw.textTeal800}`}>Matching IA</p>
                <button onClick={() => setShowMatchingPanel(false)} className={`ml-auto ${tw.textMuted}`}><X size={14} /></button>
              </div>
              <p className={`text-xs mb-3 ${tw.bodyText}`}>Choisissez une offre pour trier les candidats par compatibilité automatique.</p>
              <Select
                options={[{ value: "", label: "Choisir une offre…" }, ...offresActives]}
                value={offresActives.find(o => o.value === offreId) || null}
                onChange={(val) => { setOffreId(val?.value || ""); setCurrentPage(1); if (val?.value) setShowMatchingPanel(false); }}
                styles={selectStylesTeal}
                placeholder="Choisir une offre…"
                menuPosition="fixed"
              />
              {offreId && (
                <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${tw.textTeal}`}>
                  <CheckCircle2 size={13} className={tw.textTeal600} />
                  Actif : {offresActives.find(o => o.value === offreId)?.label}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {offreId && (
        <div className={`mb-4 flex items-center gap-2 ${tw.bgTealSoft} border ${tw.borderTeal200} rounded-xl px-4 py-2`}>
          <Zap size={14} className={`${tw.textTeal} shrink-0`} />
          <span className={`text-sm font-semibold ${tw.textTeal800}`}>Matching actif — <span className={`font-normal ${tw.textTeal}`}>{offresActives.find(o => o.value === offreId)?.label}</span></span>
          <button onClick={() => setOffreId("")} className={`ml-auto ${tw.closeLinkTeal}`}><X size={14} /></button>
        </div>
      )}

      {/* PANNEAU FILTRES */}
      {showFiltres && (
        <div className={`${tw.cardColors} rounded-2xl p-5 mb-6`}>
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
              styles={selectStylesTeal}
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
              styles={selectStylesTeal}
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
              styles={selectStylesTeal}
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
              styles={selectStylesTeal}
            />
          </div>

          {/* Filtres rapides en checkboxes */}
          <div className={`flex flex-wrap gap-2 items-center pt-3 border-t ${tw.borderSubtle}`}>
            <span className={`text-xs font-medium mr-2 ${tw.textMuted}`}>
              Filtres rapides :
            </span>
            <button
              onClick={() => setAvecPhoto(!avecPhoto)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                avecPhoto
                  ? tw.chipTealActiveAlt
                  : tw.chipNeutralInactive
              }`}
            >
              {avecPhoto && <CheckCircle2 size={14} />}
              Avec photo
            </button>
            <button
              onClick={() => setAvecCV(!avecCV)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                avecCV
                  ? tw.chipTealActiveAlt
                  : tw.chipNeutralInactive
              }`}
            >
              {avecCV && <CheckCircle2 size={14} />}
              Avec CV téléchargé
            </button>
            <button
              onClick={() => setInscritRecent(!inscritRecent)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                inscritRecent
                  ? tw.chipTealActiveAlt
                  : tw.chipNeutralInactive
              }`}
            >
              {inscritRecent && <CheckCircle2 size={14} />}
              <Sparkles size={12} />
              Inscrits récemment
            </button>

            {filtresActifs > 0 && (
              <button
                onClick={handleReset}
                className={`ml-auto text-xs font-medium transition-colors ${tw.textMuted700HoverTeal}`}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {/* SPLIT-VIEW : LISTE À GAUCHE + DÉTAIL À DROITE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLONNE GAUCHE : LISTE */}
        <div className="lg:col-span-5 space-y-3">
          {/* Compteur intégré en haut de liste */}
          <div className="flex items-center justify-between px-1">
            <p className={`text-xs ${tw.bodyText}`}>
              {loading ? "Recherche…" : <><span className={`font-semibold ${tw.bodyText}`}>{totalCandidats}</span> {totalCandidats > 1 ? "profils" : "profil"}</>}
            </p>
            {!offreId && !loading && (
              <p className={`text-xs ${tw.textMuted}`}>Tri : {OPTIONS_TRI.find(o => o.value === tri)?.label}</p>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`${tw.cardColors} rounded-xl p-4 animate-pulse`}>
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-lg shrink-0 ${tw.bgSlate200}`} />
                    <div className="flex-1 space-y-2">
                      <div className={`h-3 rounded w-3/4 ${tw.bgSlate200}`} />
                      <div className={`h-2.5 rounded w-1/2 ${tw.surfaceSubtle}`} />
                      <div className="flex gap-1.5 mt-1">
                        <div className={`h-2 rounded w-16 ${tw.surfaceSubtle}`} />
                        <div className={`h-2 rounded w-20 ${tw.surfaceSubtle}`} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : candidats.length === 0 ? (
            <div className={`${tw.cardColors} rounded-xl p-8 text-center`}>
              {activeTab === "favoris" ? (
                <>
                  <Star size={32} className={`${tw.textSubtle} mx-auto mb-3`} />
                  <p className={`text-sm font-medium ${tw.textStrong}`}>
                    Aucun favori pour l'instant
                  </p>
                  <p className={`text-xs mt-1 ${tw.textMuted}`}>
                    Cliquez sur l'étoile d'un profil pour l'ajouter ici
                  </p>
                </>
              ) : (
                <>
                  <User size={32} className={`${tw.textSubtle} mx-auto mb-3`} />
                  <p className={`text-sm font-medium ${tw.textStrong}`}>
                    Aucun profil trouvé
                  </p>
                  <p className={`text-xs mt-1 mb-4 ${tw.textMuted}`}>
                    Essayez d'élargir vos critères
                  </p>
                  {filtresActifs > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setWilaya("");
                        setSpecialite("");
                        setDiplome("");
                        setExperience("");
                        setAvecPhoto(false);
                        setAvecCV(false);
                        setInscritRecent(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg ${tw.buttonSecondary}`}
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
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
                  onClick={() => handleSelectCandidat(candidat)}
                  className={`relative cursor-pointer w-full text-left ${tw.surface} border rounded-xl overflow-hidden transition-all ${
                    isSelected
                      ? tw.borderTealSelected
                      : tw.borderNeutralHover
                  }`}
                >
                  {/* Barre score IA à gauche */}
                  {offreId && 'score_offre' in candidat && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      candidat.score_offre >= 70 ? tw.scoreBarHigh :
                      candidat.score_offre >= 40 ? tw.scoreFillWarning : tw.scoreBarLowNeutral
                    }`} />
                  )}

                  <div className={`p-4 ${offreId && 'score_offre' in candidat ? "pl-5" : ""}`}>
                    <div className="flex gap-3 pr-7">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${tw.surfaceSubtle}`}>
                        {candidat.photo_profil ? (
                          <img src={getMediaUrl(candidat.photo_profil)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} className={tw.textMuted} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Ligne 1 : titre + badges */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              {statutActivite && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statutActivite.dot}`} title={statutActivite.label} />}
                              <h3 className={`text-sm font-semibold truncate ${tw.textStrong}`}>{candidat.titre_professionnel || "Profil candidat"}</h3>
                            </div>
                            <p className={`text-xs truncate ${tw.textMuted700}`}>{candidat.last_name} {candidat.first_name}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            {offreId && 'score_offre' in candidat && (
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold rounded-md border ${
                                candidat.score_offre >= 70 ? tw.scoreHigh :
                                candidat.score_offre >= 40 ? tw.scoreMid :
                                tw.badgeNeutral
                              }`}><Zap size={9} />{candidat.score_offre}%</span>
                            )}
                            {recent && <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${tw.bgWarningSoft} ${tw.textWarning}`}><Sparkles size={9} />Nouveau</span>}
                          </div>
                        </div>

                        {/* Ligne 2 : wilaya + diplôme + expérience */}
                        <div className={`flex flex-wrap items-center gap-2 mt-1.5 text-xs ${tw.textMuted700}`}>
                          {candidat.wilaya && <span className="flex items-center gap-0.5"><MapPin size={10} />{candidat.wilaya.split(" - ")[1] || candidat.wilaya}</span>}
                          {candidat.adresse && <span className="flex items-center gap-0.5"><MapPin size={10} />{candidat.adresse}</span>}
                          {candidat.diplome && <span className="flex items-center gap-0.5"><GraduationCap size={10} />{constants.diplomes.find(d => d.value === candidat.diplome)?.label || candidat.diplome}</span>}
                          {candidat.niveau_experience && <span className="flex items-center gap-0.5"><Briefcase size={10} />{candidat.niveau_experience}</span>}
                        </div>

                        {/* Ligne 3 : top 3 compétences */}
                        {candidat.competences && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {candidat.competences.split(",").filter(c => c.trim()).slice(0, 3).map((c, i) => (
                              <span key={i} className={`px-1.5 py-0.5 text-[10px] rounded ${tw.tagSlateSoft}`}>{c.trim()}</span>
                            ))}
                            {candidat.competences.split(",").filter(c => c.trim()).length > 3 && (
                              <span className={`px-1.5 py-0.5 text-[10px] rounded ${tw.surfaceMuted} ${tw.textMuted}`}>+{candidat.competences.split(",").filter(c => c.trim()).length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bouton "Voir le profil" visible uniquement sur mobile */}
                  {isSelected && (
                    <div className="px-4 pb-3 lg:hidden">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tw.textTeal}`}>
                        <CheckCircle2 size={12} /> Profil sélectionné — voir ci-dessous
                      </span>
                    </div>
                  )}

                  {/* ÉTOILE FAVORI */}
                  <button
                    onClick={(e) => handleToggleFavori(candidat, e)}
                    className={`absolute top-3 right-3 p-1 rounded-md transition-colors group/star ${tw.hoverSurfaceSubtle}`}
                  >
                    <Star size={14} className={candidat.is_favori ? tw.starFavoriActive : tw.starFavoriInactiveGroupHover} />
                  </button>
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
                className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed ${tw.textMutedHoverStrong}`}
              >
                <ChevronLeft size={16} />
                Précédent
              </button>
              <span className={`text-xs ${tw.textMuted}`}>
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed ${tw.textMutedHoverStrong}`}
              >
                Suivant
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* COLONNE DROITE : DÉTAIL */}
        <div className="lg:col-span-7" ref={detailRef}>
          {selectedCandidat ? (
            <div className={`relative ${tw.cardColors} rounded-xl overflow-hidden`}>
              {/* OVERLAY PREMIUM */}
              {!isPremium && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
                  <div className="text-center px-8 max-w-sm">
                    <div className={`w-16 h-16 ${tw.bgTealSoft} border-2 ${tw.borderTeal200} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                      <span className="text-3xl">🔒</span>
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${tw.textStrong}`}>Accès Premium requis</h3>
                    <p className={`text-sm mb-6 leading-relaxed ${tw.bodyText}`}>
                      Passez en compte Premium pour accéder aux profils complets, coordonnées, CV et réseaux sociaux des candidats.
                    </p>
                    <Link
                      to="/recruteurs/premium"
                      className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-colors shadow-sm ${tw.bgTealSolid}`}
                    >
                      ⭐ Passer Premium
                    </Link>
                  </div>
                </div>
              )}
              {/* En-tête détail */}
              <div className={`p-6 border-b ${tw.borderSubtle}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${tw.surfaceSubtle}`}>
                    {selectedCandidat.photo_profil ? (
                      <img
                        src={getMediaUrl(selectedCandidat.photo_profil)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={32} className={tw.textMuted} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className={`text-xl font-bold ${tw.textStrong}`}>
                          {selectedCandidat.titre_professionnel ||
                            "Profil candidat"}
                        </h2>
                        <p className={`text-sm mt-1 ${tw.textMuted}`}>
                          {selectedCandidat.last_name}{" "}
                          {selectedCandidat.first_name}
                        </p>
                      </div>
                      {/* BOUTON FAVORI */}
                      <button
                        onClick={(e) => handleToggleFavori(selectedCandidat, e)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border ${tw.borderBase} rounded-lg text-xs font-medium transition-colors ${tw.hoverSurfaceMuted}`}
                      >
                        <Star
                          size={14}
                          className={
                            selectedCandidat.is_favori
                              ? tw.starFavoriActive
                              : tw.textMuted
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
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${tw.tagSlateSoft700}`}>
                          <MapPin size={12} />
                          {selectedCandidat.wilaya}
                          {selectedCandidat.commune &&
                            ` · ${selectedCandidat.commune}`}
                        </span>
                      )}
                      {selectedCandidat.diplome && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${tw.tagSlateSoft700}`}>
                          <GraduationCap size={12} />
                          {selectedCandidat.diplome}
                        </span>
                      )}
                      {selectedCandidat.specialite && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${tw.tagSlateSoft700}`}>
                          <Briefcase size={12} />
                          {selectedCandidat.specialite}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coordonnées */}
              <div className={`p-6 border-b ${tw.borderSubtle}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${tw.textMuted}`}>Coordonnées</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidat.email && (
                    <a
                      href={`mailto:${selectedCandidat.email}`}
                      className={`inline-flex items-center gap-2 px-3 py-2 border ${tw.borderTeal200} text-sm font-semibold rounded-lg transition-colors ${tw.pillTeal}`}
                    >
                      <Mail size={14} /> {selectedCandidat.email}
                    </a>
                  )}
                  {selectedCandidat.telephone && (
                    <a
                      href={`tel:${selectedCandidat.telephone}`}
                      className={`inline-flex items-center gap-2 px-3 py-2 border ${tw.borderBase} text-sm font-semibold rounded-lg transition-colors ${tw.pillSlate}`}
                    >
                      <Phone size={14} /> {selectedCandidat.telephone}
                    </a>
                  )}
                  {selectedCandidat.email && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(selectedCandidat.email); toast.success("Email copié !"); }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-xs font-medium rounded-lg transition-colors ${tw.surface} ${tw.textMuted700} ${tw.hoverSurfaceMuted}`}
                      title="Copier l'email"
                    >
                      <Copy size={13} /> Copier
                    </button>
                  )}
                  {selectedCandidat.linkedin && (
                    <a
                      href={selectedCandidat.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${tw.linkedinChip}`}
                    >
                      <ExternalLink size={13} /> LinkedIn
                    </a>
                  )}
                  {!selectedCandidat.email && !selectedCandidat.telephone && (
                    <p className={`text-sm italic ${tw.textMuted}`}>Coordonnées non disponibles</p>
                  )}
                </div>
              </div>

              {/* Expériences */}
              <div className={`p-6 border-b ${tw.borderSubtle}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${tw.textMuted}`}>
                  Expériences professionnelles
                </h3>
                {selectedCandidat.experiences_detail?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidat.experiences_detail.map((exp) => (
                      <div
                        key={exp.id}
                        className={`pl-4 border-l-2 ${tw.borderTeal100}`}
                      >
                        <p className={`text-sm font-semibold ${tw.textStrong}`}>
                          {exp.titre_poste}
                        </p>
                        <p className={`text-sm mt-0.5 ${tw.textMuted}`}>
                          {exp.entreprise}
                          {exp.secteur && (
                            <span className={`font-normal ${tw.textMuted}`}>
                              {" "}· {constants.secteurs?.find((s) => s.value === exp.secteur)?.label || exp.secteur}
                            </span>
                          )}
                        </p>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${tw.textMuted}`}>
                          <Calendar size={11} />
                          {formatDate(exp.date_debut)} —{" "}
                          {exp.date_fin
                            ? formatDate(exp.date_fin)
                            : "Aujourd'hui"}
                        </p>
                        {exp.description && (
                          <p className={`text-xs mt-2 leading-relaxed whitespace-pre-line ${tw.textMuted}`}>
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm italic ${tw.textMuted}`}>
                    Aucune expérience renseignée
                  </p>
                )}
              </div>

              {/* Formations */}
              <div className={`p-6 border-b ${tw.borderSubtle}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${tw.textMuted}`}>
                  Formations
                </h3>
                {selectedCandidat.formations_detail?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidat.formations_detail.map((form) => (
                      <div
                        key={form.id}
                        className={`pl-4 border-l-2 ${tw.borderTeal100}`}
                      >
                        <p className={`text-sm font-semibold ${tw.textStrong}`}>
                          {form.diplome || "Diplôme non précisé"}
                        </p>
                        {form.description && (
                          <p className={`text-xs font-medium ${tw.textTeal}`}>
                            {form.description}
                          </p>
                        )}
                        <p className={`text-sm mt-0.5 ${tw.textMuted}`}>
                          {form.etablissement}
                        </p>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${tw.textMuted}`}>
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
                  <p className={`text-sm italic ${tw.textMuted}`}>
                    Aucune formation renseignée
                  </p>
                )}
              </div>

              {/* Bio */}
              {selectedCandidat.bio && (
                <div className={`px-6 py-4 border-b ${tw.borderSubtle} ${tw.surfaceMutedLight}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${tw.textMuted700}`}>À propos</p>
                  <p className={`text-sm leading-relaxed ${tw.bodyText}`}>{selectedCandidat.bio}</p>
                </div>
              )}

              {/* Compétences — accordéon */}
              <div className={`border-b ${tw.borderSubtle}`}>
                <button
                  onClick={() => toggleSection("competences")}
                  className={`w-full flex items-center justify-between px-6 py-3 transition-colors ${tw.hoverSurfaceMuted}`}
                >
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${tw.textMuted}`}>Compétences</h3>
                  <ChevronRight size={14} className={`${tw.textMuted} transition-transform ${openSections.competences ? "rotate-90" : ""}`} />
                </button>
                {openSections.competences && (
                  <div className="px-6 pb-4">
                    {selectedCandidat.competences ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidat.competences.split(",").filter(c => c.trim()).map((c, i) => (
                          <span key={i} className={`px-2.5 py-1 text-xs rounded-md ${tw.chipTealSoft}`}>{c.trim()}</span>
                        ))}
                      </div>
                    ) : <p className={`text-sm italic ${tw.textMuted}`}>Non renseignées</p>}
                  </div>
                )}
              </div>

              {/* Langues — accordéon */}
              <div className={`border-b ${tw.borderSubtle}`}>
                <button
                  onClick={() => toggleSection("langues")}
                  className={`w-full flex items-center justify-between px-6 py-3 transition-colors ${tw.hoverSurfaceMuted}`}
                >
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${tw.textMuted}`}>Langues</h3>
                  <ChevronRight size={14} className={`${tw.textMuted} transition-transform ${openSections.langues ? "rotate-90" : ""}`} />
                </button>
                {openSections.langues && (
                  <div className="px-6 pb-4">
                    {selectedCandidat.langues ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidat.langues.split(",").filter(l => l.trim()).map((l, i) => {
                          const [name, level] = l.split(":");
                          return (
                            <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md ${tw.tagSlateSoft700}`}>
                              {name?.trim()}{level && <span className={tw.textMuted700}>· {level.trim()}</span>}
                            </span>
                          );
                        })}
                      </div>
                    ) : <p className={`text-sm italic ${tw.textMuted}`}>Non renseignées</p>}
                  </div>
                )}
              </div>

              {/* CV PDF */}
              {selectedCandidat.cv_pdf && (
                <div className="px-6 pb-6">
                  <a
                    href={getMediaUrl(selectedCandidat.cv_pdf)}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${tw.buttonDark}`}
                  >
                    <FileText size={16} />
                    Télécharger le CV complet
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className={`${tw.cardColors} rounded-xl p-12 text-center`}>
              <User size={40} className={`${tw.textSubtle} mx-auto mb-4`} />
              <p className={`text-sm font-medium ${tw.textStrong}`}>
                Sélectionnez un profil
              </p>
              <p className={`text-xs mt-1 ${tw.textMuted}`}>
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
