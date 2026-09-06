import React, { useState, useRef, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Camera,
  Plus,
  Pencil,
  Trash2,
  X,
  Sparkles,
  ExternalLink,
  User,
  Phone,
  Mail,
  Check,
  Minus,
  Award,
  FileText,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Building2,
  Languages as LanguagesIcon,
  ChevronRight,
} from "lucide-react";
import { useProfilCandidat } from "./useProfilCandidat";
import RadialGauge from "../../../Components/RadialGauge";
import { Modals } from "./Modals";
import OnboardingWizard from "../Onboarding/OnboardingWizard";
import InfoBanner from "../../../Components/InfoBanner";
import ImageCropperModal from "../../../Components/ImageCropperModal";
import { TooltipIcon } from "../../../Components/Tooltip";
import DomaineLabel from "../../../Components/DomaineLabel";
import { confirmToast } from "../../../utils/confirmToast";
import { tw } from "../../../theme";
import { candidatFichierUrl } from "../../../utils/mediaUrl";

const INPUT_CLASS = `w-full px-4 py-3 rounded-xl text-base ${tw.inputColorsMuted}`;
const MODAL_CLASS = `${tw.modalOverlay} p-4`;
const MODAL_INNER_CLASS = `${tw.surface} rounded-2xl p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]`;
const BTN_PRIMARY = `flex-1 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-base font-bold rounded-xl transition-colors`;
const BTN_CANCEL = `flex-1 py-3 text-base font-semibold rounded-xl transition-colors ${tw.buttonCancelSoft}`;
const SECTION_CLASS = `${tw.card} rounded-2xl p-6`;
const SIDEBAR_SECTION_CLASS = `${tw.card} rounded-2xl p-5`;
const SECTION_TITLE = `text-lg font-bold ${tw.textStrong}`;
const SIDEBAR_TITLE = `text-sm font-bold uppercase tracking-wide ${tw.textStrong}`;
const EDIT_BTN = `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${tw.editButtonOutline}`;
const ICON_ACTION_BTN = `p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center`;

const NIVEAUX_COMPETENCE = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
  { value: "CONFIRME", label: "Confirmé" },
];

// Catégories cliquables de la checklist de complétion — chaque ligne indique
// son propre % et propose une action directe ("Ajouter..." si vide,
// "Compléter" si partiellement rempli), au lieu d'un simple % global figé.
const PROFILE_CATEGORIES = [
  {
    key: "infos",
    label: "Informations personnelles",
    action: "info",
    test: (p) => [!!p.telephone, !!p.photo_profil, !!p.titre_professionnel, !!(p.wilaya && p.commune), !!p.diplome, !!p.specialite],
    actionLabelZero: "Compléter",
  },
  {
    key: "cv",
    label: "CV",
    action: "cv-form",
    test: (p) => [!!p.cv_pdf],
    actionLabelZero: "Importer mon CV",
  },
  {
    key: "experience",
    label: "Expériences",
    action: "experiences",
    test: (p) => [p.experiences_detail?.length > 0],
    actionLabelZero: "Ajouter une expérience",
  },
  {
    key: "formation",
    label: "Formations",
    action: "formations",
    test: (p) => [p.formations_detail?.length > 0],
    actionLabelZero: "Ajouter une formation",
  },
  {
    key: "competences",
    label: "Compétences",
    action: "competences",
    test: (p) => [(p.competences_detail?.length > 0) || (p.competences?.split(",").filter((t) => t.trim()).length > 0)],
    actionLabelZero: "Ajouter une compétence",
  },
  {
    key: "langues",
    label: "Langues",
    action: "langues",
    test: (p) => [p.langues?.split(",").filter((t) => t.trim()).length > 0],
    actionLabelZero: "Ajouter une langue",
  },
];

const ProfilCandidat = () => {
  const [langName, setLangName] = useState("");
  const [langLevel, setLangLevel] = useState("Débutant");
  const hook = useProfilCandidat();
  const {
    loading,
    profil,
    competenceSuggestions,
    showCompetenceSuggestions,
    setShowCompetenceSuggestions,
    handleCompetenceInputChange,
    showExpForm,
    setShowExpForm,
    showFormForm,
    setShowFormForm,
    showCVForm,
    setShowCVForm,
    showInfoForm,
    setShowInfoForm,
    showPrefForm,
    setShowPrefForm,
    showLinksForm,
    setShowLinksForm,
    newExp,
    setNewExp,
    newForm,
    setNewForm,
    editingExpId,
    setEditingExpId,
    editingFormId,
    setEditingFormId,
    editInfo,
    setEditInfo,
    editPref,
    setEditPref,
    editCV,
    setEditCV,
    editLinks,
    setEditLinks,
    titreSuggestions,
    showTitreSuggestions,
    setShowTitreSuggestions,
    expTitreSuggestions,
    showExpTitreSuggestions,
    setShowExpTitreSuggestions,
    handleExpTitreChange,
    constants,
    fetchData,
    getPhotoUrl,
    formatText,
    formatDate,
    getCommunesOptions,
    handlePhotoChange,
    cropperPhoto,
    fermerCropperPhoto,
    uploaderPhotoRecadree,
    handleAddTag,
    handleRemoveTag,
    handleAjouterCompetence,
    handleSupprimerCompetence,
    handleChangerNiveauCompetence,
    handleAddLanguage,
    handleUpdateGeneric,
    handleUpdateCV,
    handleDeleteCV,
    handleUpdateLinks,
    handleTitreProChange,
    handleAddExperience,
    handleUpdateExperience,
    handleDeleteExp,
    handleEditExp,
    handleAddFormation,
    handleUpdateFormation,
    handleDeleteForm,
    handleEditFormation,
    handleQuickUploadCV,
  } = hook;
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  const cvQuickInputRef = useRef(null);
  const photoQuickInputRef = useRef(null);

  const categoriesAvecPct = useMemo(() => {
    if (!profil) return [];
    return PROFILE_CATEGORIES.map((cat) => {
      const resultats = cat.test(profil);
      const pct = Math.round((resultats.filter(Boolean).length / resultats.length) * 100);
      return { ...cat, pct };
    });
  }, [profil]);

  const completionPercent = categoriesAvecPct.length
    ? Math.round(categoriesAvecPct.reduce((sum, c) => sum + c.pct, 0) / categoriesAvecPct.length)
    : 0;

  // Statistiques dérivées — jamais de valeur inventée, uniquement calculées
  // depuis les données réelles déjà chargées (aucun nouvel appel réseau).
  const stats = useMemo(() => {
    const experiences = profil?.experiences_detail || [];
    const dates = experiences
      .map((e) => e.date_debut)
      .filter(Boolean)
      .map((d) => new Date(d))
      .filter((d) => !Number.isNaN(d.getTime()));
    let anneesExperience = null;
    if (dates.length > 0) {
      const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
      const now = new Date();
      let years = now.getFullYear() - earliest.getFullYear();
      if (now.getMonth() < earliest.getMonth()) years -= 1;
      anneesExperience = Math.max(years, 0);
    }
    const entreprises = new Set(
      experiences.map((e) => (e.entreprise || "").trim().toLowerCase()).filter(Boolean),
    );
    const nbFormations = profil?.formations_detail?.length || 0;
    const nbLangues = (profil?.langues || "").split(",").filter((l) => l).length;
    return { anneesExperience, nbEntreprises: entreprises.size, nbFormations, nbLangues };
  }, [profil]);

  // Raccourci direct pour chaque badge "manquant" — évite le détour habituel
  // "cliquer Modifier puis trouver le bon champ".
  const handleChampManquantClick = (action) => {
    switch (action) {
      case "cv":
        cvQuickInputRef.current?.click();
        break;
      case "photo":
        photoQuickInputRef.current?.click();
        break;
      case "cv-form":
        setShowCVForm(true);
        break;
      case "info":
        setShowInfoForm(true);
        break;
      case "experiences":
        setEditingExpId(null);
        setNewExp({ titre_poste: "", entreprise: "", date_debut: "", date_fin: "", description: "" });
        setShowExpForm(true);
        break;
      case "formations":
        setEditingFormId(null);
        setNewForm({ diplome: "", etablissement: "", date_debut: "", date_fin: "", description: "" });
        setShowFormForm(true);
        break;
      case "competences": {
        const el = document.getElementById("comp-input");
        el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        el?.focus?.();
        break;
      }
      case "langues": {
        const el = document.getElementById("lang-input");
        el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        el?.focus?.();
        break;
      }
      default:
        break;
    }
  };

  // Arrivée depuis "/profil?focus=<action>" (ex: rubrique cliquée sur le dashboard
  // /dashboard-candidat) — déclenche le même raccourci qu'un clic sur le badge
  // "manquant" équivalent, une fois le profil chargé, puis nettoie l'URL pour ne
  // pas retriggerer l'action sur un simple retour en arrière/rafraîchissement.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (!focus || loading) return;
    handleChampManquantClick(focus);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.borderPrimary}`}></div>
      </div>
    );

  return (
    <div className="space-y-6 pb-16">
      <h1 className={tw.pageTitleGrand}>
        Mon profil professionnel
      </h1>

      <InfoBanner storageKey="profil_candidat" title="Comment fonctionne votre profil ?">
        Votre profil est utilisé par l'algorithme de matching pour vous proposer aux recruteurs.
        Plus il est complet, plus vos chances d'apparaître dans les résultats sont élevées.
        Ajoutez vos expériences, formations, compétences et un CV PDF pour maximiser votre score.
      </InfoBanner>

      {/* Input caché — upload direct du CV depuis un badge de la checklist,
          sans passer par la modale "Modifier". */}
      <input
        ref={cvQuickInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.doc"
        onChange={handleQuickUploadCV}
      />

      {/* MISE EN PAGE 2 COLONNES : contenu principal (2/3) + colonne latérale
          synthèse (1/3, collante sur grand écran). L'ordre des éléments dans
          le code reste identique à l'ancien layout pleine largeur — seule la
          disposition visuelle change (CSS Grid), pour ne rien casser côté
          logique/tests qui dépendent de l'ordre d'apparition des boutons
          "Modifier"/"Ajouter". */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── COLONNE PRINCIPALE ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* CV */}
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <h2 className={SECTION_TITLE}>Mon CV</h2>
                <p className={`text-sm font-semibold ${tw.textPrimary} mt-1`}>
                  {profil.titre_professionnel || "Titre à définir"}
                </p>
                {profil.cv_pdf ? (
                  <div className={`flex items-center gap-2.5 mt-3 p-3 rounded-xl border min-w-0 ${tw.bgSuccessSoft} border-emerald-200`}>
                    <a
                      href={candidatFichierUrl(profil.user_id, "cv")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 min-w-0 flex-1 group"
                    >
                      <FileText size={18} className={`${tw.textSuccess} shrink-0`} />
                      <span className={`text-sm font-medium truncate flex-1 ${tw.textSuccess}`}>
                        {profil.cv_pdf.split("/").pop()}
                      </span>
                      <ExternalLink size={14} className={`${tw.textSuccess} shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`} />
                    </a>
                    <button
                      type="button"
                      onClick={() => confirmToast("Supprimer votre CV actuel ?", handleDeleteCV)}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                      aria-label="Supprimer le CV"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => cvQuickInputRef.current?.click()}
                    className={`w-full flex items-center gap-2.5 mt-3 p-3 rounded-xl border transition-colors cursor-pointer hover:brightness-95 ${tw.bgWarningSoft} border-amber-200`}
                  >
                    <AlertCircle size={18} className={`${tw.textWarning} shrink-0`} />
                    <span className={`text-sm font-medium ${tw.textWarning} text-left flex-1`}>
                      Aucun fichier joint — cliquez pour téléverser votre CV
                    </span>
                  </button>
                )}
              </div>
              <button onClick={() => setShowCVForm(true)} className={EDIT_BTN}>
                <Pencil size={12} /> Modifier
              </button>
            </div>
            <div className={`border-t ${tw.borderSubtle} pt-4 mt-4`}>
              <button
                onClick={() => setShowOnboardingModal(true)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl ${tw.bannerGradientPrimary} ${tw.textOnDark} shadow-md hover:shadow-lg transition-shadow group`}
              >
                <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Remplissage automatique par IA</p>
                  <p className="text-xs text-white/80 mt-0.5">
                    Analysez votre CV et remplissez votre profil en quelques secondes
                  </p>
                </div>
              </button>
            </div>
            {(profil.bio || profil.linkedin || profil.github) && (
              <div className={`mt-4 pt-4 border-t ${tw.borderSubtle} space-y-3`}>
                {profil.bio && (
                  <p className={`text-sm leading-relaxed p-3 rounded-lg italic ${tw.bioQuoteBox}`}>
                    "{profil.bio}"
                  </p>
                )}
                <div className="flex gap-2">
                  {profil.linkedin && (
                    <a
                      href={profil.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tw.linkedinPill}`}
                    >
                      <ExternalLink size={13} /> LinkedIn
                    </a>
                  )}
                  {profil.github && (
                    <a
                      href={profil.github}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tw.githubPill}`}
                    >
                      <ExternalLink size={13} /> GitHub
                    </a>
                  )}
                  <button
                    onClick={() => setShowLinksForm(true)}
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tw.editButtonOutline}`}
                  >
                    <Pencil size={12} /> Modifier
                  </button>
                </div>
              </div>
            )}
            {!profil.bio && !profil.linkedin && !profil.github && (
              <div className={`mt-3 pt-3 border-t ${tw.borderSubtle}`}>
                <button
                  onClick={() => setShowLinksForm(true)}
                  className={`flex items-center gap-1.5 text-xs font-medium ${tw.linkPrimaryUnderline}`}
                >
                  <Plus size={12} /> Ajouter bio / LinkedIn / GitHub
                </button>
              </div>
            )}
          </div>

          {/* INFORMATIONS PERSONNELLES */}
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-start mb-5">
              <h2 className={SECTION_TITLE}>Informations personnelles</h2>
              <button onClick={() => setShowInfoForm(true)} className={EDIT_BTN}>
                <Pencil size={12} /> Modifier
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-5">
              <div className="relative shrink-0">
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden ${tw.photoPlaceholder}`}>
                  {profil.photo_profil ? (
                    <img
                      src={candidatFichierUrl(profil.user_id, "photo")}
                      alt="Profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={30} className={tw.textMuted} />
                  )}
                </div>
                <label
                  className={`absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${tw.photoUploadButton}`}
                  aria-label="Changer la photo de profil"
                >
                  <Camera size={13} className={tw.textOnDark} />
                  <input
                    ref={photoQuickInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </label>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className={`text-xl font-extrabold ${tw.textStrong}`}>
                  {profil.first_name} {profil.last_name}
                </h3>
                <p className={`text-sm ${tw.textMuted} mt-0.5`}>
                  {profil.wilaya ? (profil.wilaya.split(" - ")[1] || profil.wilaya) : "Wilaya non renseignée"}
                  {profil.commune ? ` · ${profil.commune}` : ""}
                </p>
                <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                  {constants.diplomes.find(d => d.value === profil.diplome)?.label || formatText(profil.diplome)}
                  {profil.specialite && (
                    <>
                      {" · "}
                      <DomaineLabel code={profil.specialite} />
                    </>
                  )}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-2">
                  {profil.niveau_experience && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${tw.bgPrimarySoft} ${tw.textPrimaryStrong}`}>
                      <Award size={10} /> {formatText(profil.niveau_experience)}
                    </span>
                  )}
                  {stats.anneesExperience !== null && stats.anneesExperience > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700">
                      <Briefcase size={10} /> {stats.anneesExperience} an{stats.anneesExperience > 1 ? "s" : ""} d'expérience
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={`flex flex-wrap gap-2 py-3 border-t ${tw.borderSubtle} mb-4`}>
              {[
                {
                  label: profil.service_militaire
                    ? `Service militaire · ${formatText(profil.service_militaire)}`
                    : "Service militaire",
                  active: !!profil.service_militaire,
                },
                { label: "Permis de conduire", active: profil.permis_conduire },
                { label: "Passeport valide", active: profil.passeport_valide },
              ].map(({ label, active }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${active ? tw.toggleChipActive : tw.toggleChipInactive}`}
                >
                  {active ? <Check size={11} /> : <Minus size={11} />} {label}
                </span>
              ))}
            </div>
            <div className={`flex flex-wrap gap-4 text-sm ${tw.textMuted700}`}>
              <span className="flex items-center gap-1.5"><Phone size={13} className={tw.textMuted} /> {profil.telephone || "Non renseigné"}</span>
              <span className="flex items-center gap-1.5"><Mail size={13} className={tw.textMuted} /> {profil.email}</span>
            </div>
          </div>

          {/* PRÉFÉRENCES */}
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-start mb-4">
              <h2 className={SECTION_TITLE}>Préférences de recrutement</h2>
              <button onClick={() => setShowPrefForm(true)} className={EDIT_BTN}>
                <Pencil size={12} /> Modifier
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: "Secteur souhaité",
                  value: <DomaineLabel code={profil.secteur_souhaite} />,
                },
                {
                  label: "Salaire souhaité",
                  value: profil.salaire_souhaite || "À discuter",
                },
                { label: "Mobilité", value: formatText(profil.mobilite) },
                {
                  label: "Situation actuelle",
                  value: formatText(profil.situation_actuelle),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className={`p-3 rounded-lg ${tw.prefCardSoft}`}
                >
                  <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wide mb-1`}>
                    {label}
                  </p>
                  <p className={`text-sm font-semibold ${tw.textPrimary}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* EXPÉRIENCES */}
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={SECTION_TITLE}>Expériences professionnelles</h2>
              <button
                onClick={() => {
                  setEditingExpId(null);
                  setNewExp({
                    titre_poste: "",
                    entreprise: "",
                    date_debut: "",
                    date_fin: "",
                    description: "",
                  });
                  setShowExpForm(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${tw.addButtonSoft}`}
              >
                <Plus size={13} /> Ajouter
              </button>
            </div>
            <div className="space-y-5">
              {profil.experiences_detail?.length === 0 && (
                <div className={`text-center py-6 border border-dashed ${tw.borderBase} rounded-xl`}>
                  <p className={`text-sm ${tw.textMuted700} mb-2`}>Aucune expérience renseignée.</p>
                  <button
                    onClick={() => setShowExpForm(true)}
                    className={`text-xs font-semibold hover:underline flex items-center gap-1 mx-auto ${tw.textPrimary}`}
                  >
                    <Plus size={11} /> Ajouter une expérience
                  </button>
                </div>
              )}
              {profil.experiences_detail?.map((exp) => (
                <div
                  key={exp.id}
                  className={`relative group pl-5 border-l-2 ${tw.timelineBorderPrimary}`}
                >
                  <div className={`absolute -left-2 top-1 w-3.5 h-3.5 rounded-full ${tw.timelineDotPrimary}`} />
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-base font-semibold ${tw.textStrong}`}>
                        {exp.titre_poste}
                      </h4>
                      <p className={`text-xs ${tw.textPrimary} font-medium`}>
                        {exp.entreprise}
                        {exp.secteur && (
                          <span className={`ml-2 ${tw.textMuted} font-normal`}><DomaineLabel code={exp.secteur} prefix="· " /></span>
                        )}
                      </p>
                      <p className={`text-xs ${tw.textMuted} mt-1`}>
                        {formatDate(exp.date_debut)} —{" "}
                        {exp.date_fin ? formatDate(exp.date_fin) : "Aujourd'hui"}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditExp(exp)}
                        aria-label={`Modifier l'expérience ${exp.titre_poste}`}
                        className={`${ICON_ACTION_BTN} ${tw.hoverIconActionPrimary}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteExp(exp.id)}
                        aria-label={`Supprimer l'expérience ${exp.titre_poste}`}
                        className={`${ICON_ACTION_BTN} ${tw.deleteIconButton}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {exp.description && (
                    <p className={`text-xs ${tw.textMuted} mt-2 leading-relaxed whitespace-pre-line`}>
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* FORMATIONS */}
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={SECTION_TITLE}>Formations et diplômes</h2>
              <button
                onClick={() => {
                  setEditingFormId(null);
                  setNewForm({
                    diplome: "",
                    etablissement: "",
                    date_debut: "",
                    date_fin: "",
                    description: "",
                  });
                  setShowFormForm(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${tw.addButtonSoft}`}
              >
                <Plus size={13} /> Ajouter
              </button>
            </div>
            <div className="space-y-5">
              {profil.formations_detail?.length === 0 && (
                <div className={`text-center py-6 border border-dashed ${tw.borderBase} rounded-xl`}>
                  <p className={`text-sm ${tw.textMuted700} mb-2`}>Aucune formation renseignée.</p>
                  <button
                    onClick={() => setShowFormForm(true)}
                    className={`text-xs font-semibold hover:underline flex items-center gap-1 mx-auto ${tw.textPrimary}`}
                  >
                    <Plus size={11} /> Ajouter une formation
                  </button>
                </div>
              )}
              {profil.formations_detail?.map((f) => (
                <div
                  key={f.id}
                  className={`relative group pl-5 border-l-2 ${tw.timelineBorderNeutral}`}
                >
                  <div className={`absolute -left-2 top-1 w-3.5 h-3.5 rounded-full ${tw.timelineDotNeutral}`} />
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-base font-semibold ${tw.textStrong}`}>
                        {f.diplome || "Diplôme non précisé"}
                      </h4>
                      {f.description && (
                        <p className={`text-xs ${tw.textPrimary} font-medium`}>
                          {f.description}
                        </p>
                      )}
                      <p className={`text-xs ${tw.textMuted} font-medium`}>
                        {f.etablissement}
                      </p>
                      <p className={`text-xs ${tw.textMuted} mt-1`}>
                        {formatDate(f.date_debut)} —{" "}
                        {f.date_fin ? formatDate(f.date_fin) : "En cours"}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditFormation(f)}
                        aria-label={`Modifier la formation ${f.diplome || ""}`}
                        className={`${ICON_ACTION_BTN} ${tw.hoverIconActionPrimary}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteForm(f.id)}
                        aria-label={`Supprimer la formation ${f.diplome || ""}`}
                        className={`${ICON_ACTION_BTN} ${tw.deleteIconButton}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COLONNE LATÉRALE ───────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
          {/* JAUGE DE COMPLÉTION — anneau SVG + checklist par catégorie, chaque
              ligne est cliquable et propose une action directe adaptée à son
              propre état ("Ajouter une langue" si vide, "Compléter" si
              partiel, coché si terminé). */}
          <div className={SIDEBAR_SECTION_CLASS}>
            <div className="flex items-center justify-between mb-4">
              <p className={SIDEBAR_TITLE}>Profil complété</p>
              <TooltipIcon text="Moyenne de 6 catégories : informations personnelles, CV, expériences, formations, compétences et langues." position="left" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <RadialGauge
                value={completionPercent}
                size={80}
                strokeWidth={9}
                thresholdHigh={101}
                thresholdMid={101}
                colorLow="#204883"
                labelClassName={`text-xl font-extrabold ${tw.textStrong}`}
              />
              <p className={`text-xs leading-relaxed ${tw.textMuted700}`}>
                {completionPercent === 100
                  ? "Profil complet — vous maximisez vos chances !"
                  : "Cliquez sur une catégorie pour la compléter."}
              </p>
            </div>
            <div className="space-y-1 pt-3 border-t border-slate-100">
              {categoriesAvecPct.map((cat) => {
                const isComplete = cat.pct === 100;
                const actionLabel = cat.pct === 0 ? cat.actionLabelZero : "Compléter";
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleChampManquantClick(cat.action)}
                    disabled={isComplete}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                      isComplete ? "cursor-default" : "hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs font-semibold ${tw.textStrong}`}>{cat.label}</span>
                        <span className={`text-[10px] font-bold shrink-0 ${tw.textMuted700}`}>{cat.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cat.pct === 100 ? "bg-emerald-500" : cat.pct >= 50 ? "bg-amber-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${cat.pct}%` }}
                        />
                      </div>
                    </div>
                    {isComplete ? (
                      <Check size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 whitespace-nowrap">
                        {actionLabel} <ChevronRight size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STATISTIQUES — calculées depuis les données réelles du profil */}
          <div className={SIDEBAR_SECTION_CLASS}>
            <p className={`${SIDEBAR_TITLE} mb-3`}>En bref</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${tw.prefCardSoft}`}>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Briefcase size={15} />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tw.textStrong}`}>
                    {stats.anneesExperience ?? 0}
                  </p>
                  <p className={`text-[10px] ${tw.textMuted} truncate`}>Ans d'exp.</p>
                </div>
              </div>
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${tw.prefCardSoft}`}>
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Building2 size={15} />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tw.textStrong}`}>{stats.nbEntreprises}</p>
                  <p className={`text-[10px] ${tw.textMuted} truncate`}>Entreprises</p>
                </div>
              </div>
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${tw.prefCardSoft}`}>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <GraduationCap size={15} />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tw.textStrong}`}>{stats.nbFormations}</p>
                  <p className={`text-[10px] ${tw.textMuted} truncate`}>Formations</p>
                </div>
              </div>
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${tw.prefCardSoft}`}>
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <LanguagesIcon size={15} />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tw.textStrong}`}>{stats.nbLangues}</p>
                  <p className={`text-[10px] ${tw.textMuted} truncate`}>Langues</p>
                </div>
              </div>
            </div>
          </div>

          {/* COMPÉTENCES */}
          <div className={SIDEBAR_SECTION_CLASS}>
            <p className={`${SIDEBAR_TITLE} mb-3`}>Compétences</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(profil.competences_detail || []).map((c) => (
                <span
                  key={c.id}
                  className={`flex items-center gap-1 px-3 py-1.5 border text-xs font-medium rounded-lg shadow-sm max-w-full ${tw.skillTag}`}
                  title={c.label}
                >
                  <span className="truncate max-w-35">{c.label}</span>
                  <span className={`shrink-0 ${tw.textMuted}`}>—</span>
                  <select
                    value={c.niveau}
                    onChange={(e) => handleChangerNiveauCompetence(c.id, e.target.value)}
                    className="bg-transparent text-[10px] font-semibold cursor-pointer focus:outline-none shrink-0"
                    title="Niveau"
                  >
                    {NIVEAUX_COMPETENCE.map((n) => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSupprimerCompetence(c.id)}
                    aria-label={`Retirer la compétence ${c.label}`}
                    className={`transition-colors ml-0.5 shrink-0 ${tw.skillTagRemove}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              {(profil.competences_detail || []).length === 0 && (
                <p className={`text-xs ${tw.textMuted700}`}>Aucune compétence renseignée.</p>
              )}
            </div>
            <div className="relative">
              <input
                id="comp-input"
                onChange={(e) => handleCompetenceInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    handleAjouterCompetence(e.target.value);
                    e.target.value = "";
                    setShowCompetenceSuggestions(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowCompetenceSuggestions(false), 200)}
                placeholder="Tapez une compétence puis Entrée..."
                className={INPUT_CLASS}
              />
              {showCompetenceSuggestions && competenceSuggestions.length > 0 && (
                <div className={`absolute top-full left-0 right-0 rounded-xl shadow-lg z-50 mt-1 overflow-hidden ${tw.autocompleteDropdown}`}>
                  <div className="max-h-48 overflow-y-auto">
                    {competenceSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          handleAjouterCompetence(c.label);
                          const el = document.getElementById("comp-input");
                          if (el) el.value = "";
                          setShowCompetenceSuggestions(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 transition-colors text-sm font-medium ${tw.autocompleteItem} ${tw.autocompleteItemTitle}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LANGUES */}
          <div className={SIDEBAR_SECTION_CLASS}>
            <p className={`${SIDEBAR_TITLE} mb-3`}>Langues</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {profil.langues
                ?.split(",")
                .filter((l) => l)
                .map((l) => {
                  const [name, level] = l.split(":");
                  return (
                    <div
                      key={l}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${tw.langueChip}`}
                    >
                      <span className={`text-sm font-semibold ${tw.langueChipName}`}>
                        {name}
                      </span>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-semibold ${tw.langueChipLevel}`}>
                        {level}
                      </span>
                      <button
                        onClick={() => handleRemoveTag("langues", l)}
                        aria-label={`Retirer la langue ${name}`}
                        className={`transition-colors ${tw.langueChipRemove}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              {!profil.langues && (
                <p className={`text-xs ${tw.textMuted700}`}>Aucune langue renseignée.</p>
              )}
            </div>
            <div className="space-y-2">
              <input
                id="lang-input"
                placeholder="Langue (ex: Anglais)"
                className={INPUT_CLASS}
                value={langName}
                onChange={(e) => setLangName(e.target.value)}
              />
              <select
                className={INPUT_CLASS}
                value={langLevel}
                onChange={(e) => setLangLevel(e.target.value)}
              >
                <option>Débutant</option>
                <option>Intermédiaire</option>
                <option>Avancé</option>
                <option>Bilingue / Maternelle</option>
              </select>
              <button
                onClick={() => {
                  if (langName.trim()) {
                    handleAddLanguage(langName.trim(), langLevel);
                    setLangName("");
                  }
                }}
                className={`w-full px-5 py-2.5 text-sm font-semibold rounded-lg ${tw.bgPrimarySolidHover} text-white`}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <Modals
        inputClass={INPUT_CLASS}
        modalClass={MODAL_CLASS}
        modalInnerClass={MODAL_INNER_CLASS}
        btnPrimary={BTN_PRIMARY}
        btnCancel={BTN_CANCEL}
        constants={constants}
        profil={profil}
        showInfoForm={showInfoForm}
        setShowInfoForm={setShowInfoForm}
        showPrefForm={showPrefForm}
        setShowPrefForm={setShowPrefForm}
        showLinksForm={showLinksForm}
        setShowLinksForm={setShowLinksForm}
        showCVForm={showCVForm}
        setShowCVForm={setShowCVForm}
        showExpForm={showExpForm}
        setShowExpForm={setShowExpForm}
        showFormForm={showFormForm}
        setShowFormForm={setShowFormForm}
        editInfo={editInfo}
        setEditInfo={setEditInfo}
        editPref={editPref}
        setEditPref={setEditPref}
        editLinks={editLinks}
        setEditLinks={setEditLinks}
        editCV={editCV}
        setEditCV={setEditCV}
        newExp={newExp}
        setNewExp={setNewExp}
        newForm={newForm}
        setNewForm={setNewForm}
        editingExpId={editingExpId}
        setEditingExpId={setEditingExpId}
        editingFormId={editingFormId}
        setEditingFormId={setEditingFormId}
        titreSuggestions={titreSuggestions}
        showTitreSuggestions={showTitreSuggestions}
        setShowTitreSuggestions={setShowTitreSuggestions}
        expTitreSuggestions={expTitreSuggestions}
        showExpTitreSuggestions={showExpTitreSuggestions}
        setShowExpTitreSuggestions={setShowExpTitreSuggestions}
        handleExpTitreChange={handleExpTitreChange}
        handleUpdateGeneric={handleUpdateGeneric}
        handleUpdateCV={handleUpdateCV}
        handleUpdateLinks={handleUpdateLinks}
        handleTitreProChange={handleTitreProChange}
        handleAddExperience={handleAddExperience}
        handleUpdateExperience={handleUpdateExperience}
        handleAddFormation={handleAddFormation}
        handleUpdateFormation={handleUpdateFormation}
        getCommunesOptions={getCommunesOptions}
      />
      {showOnboardingModal && (
        <div className={tw.modalOverlayStrong}>
          <OnboardingWizard
            mode="modal"
            onClose={() => {
              setShowOnboardingModal(false);
              fetchData();
            }}
          />
        </div>
      )}
      {cropperPhoto && (
        <ImageCropperModal
          file={cropperPhoto}
          aspect={1}
          cropShape="round"
          onCancel={fermerCropperPhoto}
          onValidate={uploaderPhotoRecadree}
        />
      )}
    </div>
  );
};

export default ProfilCandidat;
