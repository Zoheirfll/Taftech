// Page "Mon profil professionnel" (orchestrateur) : charge le hook, calcule complétion/stats et assemble les sections.
import { useState, useRef, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useProfilCandidat } from "./useProfilCandidat";
import { Modals } from "./Modals";
import OnboardingWizard from "../Onboarding/OnboardingWizard";
import InfoBanner from "../../../Components/InfoBanner";
import ImageCropperModal from "../../../Components/ImageCropperModal";
import { tw } from "../../../theme";
import {
  INPUT_CLASS, MODAL_CLASS, MODAL_INNER_CLASS, BTN_PRIMARY, BTN_CANCEL, PROFILE_CATEGORIES,
} from "./profilUi";
import SectionCV from "./SectionCV";
import SectionInfosPerso from "./SectionInfosPerso";
import SectionPreferences from "./SectionPreferences";
import SectionExperiences from "./SectionExperiences";
import SectionFormations from "./SectionFormations";
import SidebarCompletion from "./SidebarCompletion";
import SidebarStats from "./SidebarStats";
import SidebarCompetences from "./SidebarCompetences";
import SidebarLangues from "./SidebarLangues";

const ProfilCandidat = () => {
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
    typesDiplomes,
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
          <SectionCV
            profil={profil}
            cvQuickInputRef={cvQuickInputRef}
            setShowCVForm={setShowCVForm}
            setShowOnboardingModal={setShowOnboardingModal}
            setShowLinksForm={setShowLinksForm}
            handleDeleteCV={handleDeleteCV}
          />
          <SectionInfosPerso
            profil={profil}
            constants={constants}
            stats={stats}
            formatText={formatText}
            photoQuickInputRef={photoQuickInputRef}
            handlePhotoChange={handlePhotoChange}
            setShowInfoForm={setShowInfoForm}
          />
          <SectionPreferences profil={profil} formatText={formatText} setShowPrefForm={setShowPrefForm} />
          <SectionExperiences
            profil={profil}
            formatDate={formatDate}
            setEditingExpId={setEditingExpId}
            setNewExp={setNewExp}
            setShowExpForm={setShowExpForm}
            handleEditExp={handleEditExp}
            handleDeleteExp={handleDeleteExp}
          />
          <SectionFormations
            profil={profil}
            formatText={formatText}
            formatDate={formatDate}
            setEditingFormId={setEditingFormId}
            setNewForm={setNewForm}
            setShowFormForm={setShowFormForm}
            handleEditFormation={handleEditFormation}
            handleDeleteForm={handleDeleteForm}
          />
        </div>

        {/* ── COLONNE LATÉRALE ───────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
          <SidebarCompletion
            completionPercent={completionPercent}
            categoriesAvecPct={categoriesAvecPct}
            handleChampManquantClick={handleChampManquantClick}
          />
          <SidebarStats stats={stats} />
          <SidebarCompetences
            profil={profil}
            competenceSuggestions={competenceSuggestions}
            showCompetenceSuggestions={showCompetenceSuggestions}
            setShowCompetenceSuggestions={setShowCompetenceSuggestions}
            handleCompetenceInputChange={handleCompetenceInputChange}
            handleAjouterCompetence={handleAjouterCompetence}
            handleSupprimerCompetence={handleSupprimerCompetence}
            handleChangerNiveauCompetence={handleChangerNiveauCompetence}
          />
          <SidebarLangues profil={profil} handleRemoveTag={handleRemoveTag} handleAddLanguage={handleAddLanguage} />
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
        typesDiplomes={typesDiplomes}
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
