import React, { useState } from "react";
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
} from "lucide-react";
import { useProfilCandidat } from "./useProfilCandidat";
import { Modals } from "./Modals";
import InfoBanner from "../../../Components/InfoBanner";
import { TooltipIcon } from "../../../Components/Tooltip";
import { tw } from "../../../theme";

const INPUT_CLASS = `w-full px-4 py-3 rounded-xl text-base ${tw.inputColorsMuted}`;
const MODAL_CLASS = `${tw.modalOverlay} p-4`;
const MODAL_INNER_CLASS = `${tw.surface} rounded-2xl p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]`;
const BTN_PRIMARY = `flex-1 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-base font-bold rounded-xl transition-colors`;
const BTN_CANCEL = `flex-1 py-3 text-base font-semibold rounded-xl transition-colors ${tw.buttonCancelSoft}`;
const SECTION_CLASS = `${tw.card} rounded-2xl p-6`;
const SECTION_TITLE = `text-lg font-bold ${tw.textStrong}`;
const EDIT_BTN = `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${tw.editButtonOutline}`;

const ProfilCandidat = () => {
  const [langName, setLangName] = useState("");
  const [langLevel, setLangLevel] = useState("Débutant");
  const hook = useProfilCandidat();
  const {
    loading,
    profil,
    completionPercent,
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
    showParserModal,
    setShowParserModal,
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
    parserLoading,
    remplissageLoading,
    parsedData,
    setParsedData,
    parserMode,
    setParserMode,
    constants,
    getPhotoUrl,
    formatText,
    formatDate,
    getCommunesOptions,
    handlePhotoChange,
    handleAddTag,
    handleRemoveTag,
    handleAddLanguage,
    handleUpdateGeneric,
    handleUpdateCV,
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
    handleParserCVUpload,
    handleValiderParsing,
  } = hook;

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

      {/* JAUGE COMPLETION */}
      <div className={`rounded-xl p-5 ${tw.profileGaugeCard}`}>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold flex items-center gap-1">
            Remplissage du profil
            <TooltipIcon text="Score calculé sur 10 critères : photo, CV, bio, titre, compétences, langues, expériences, formations, wilaya et préférences." position="right" />
          </p>
          <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${tw.profileGaugeBadge}`}>
            {completionPercent}%
          </span>
        </div>
        <div className={`w-full rounded-full h-2 ${tw.profileGaugeTrack}`}>
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${tw.profileGaugeBar}`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className={`text-xs mt-2 ${tw.profileGaugeFootnote}`}>
          {completionPercent === 100
            ? "Profil complet — vous maximisez vos chances !"
            : "Complétez vos informations pour améliorer le matching IA."}
        </p>
      </div>

      {/* CV */}
      <div className={SECTION_CLASS}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className={SECTION_TITLE}>Mon CV</h2>
            <p className={`text-sm font-semibold ${tw.textPrimary} mt-1`}>
              {profil.titre_professionnel || "Titre à définir"}
            </p>
            <p className={`text-xs ${tw.textMuted} mt-1`}>
              {profil.cv_pdf
                ? profil.cv_pdf.split("/").pop()
                : "Aucun fichier joint"}
            </p>
          </div>
          <button onClick={() => setShowCVForm(true)} className={EDIT_BTN}>
            <Pencil size={12} /> Modifier
          </button>
        </div>
        <div className={`border-t ${tw.borderSubtle} pt-4 mt-4`}>
          <button
            onClick={() => setShowParserModal(true)}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-sm font-semibold rounded-lg transition-colors shadow-sm`}
          >
            <Sparkles size={16} /> Remplir automatiquement depuis mon CV
          </button>
          <p className={`text-xs ${tw.textMuted} mt-2 text-center`}>
            Notre IA analyse votre CV et remplit vos infos en quelques secondes.
          </p>
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
            <div className={`w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden ${tw.photoPlaceholder}`}>
              {profil.photo_profil ? (
                <img
                  src={getPhotoUrl(profil.photo_profil)}
                  alt="Profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={28} className={tw.textMuted} />
              )}
            </div>
            <label className={`absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${tw.photoUploadButton}`}>
              <Camera size={12} className={tw.textOnDark} />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </label>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className={`text-lg font-bold ${tw.textStrong}`}>
              {profil.first_name} {profil.last_name}
            </h3>
            <p className={`text-sm ${tw.textMuted} mt-0.5`}>
              {profil.wilaya ? (profil.wilaya.split(" - ")[1] || profil.wilaya) : "Wilaya non renseignée"}
              {profil.commune ? ` · ${profil.commune}` : ""}
            </p>
            <p className={`text-xs ${tw.textMuted} mt-0.5`}>
              {constants.diplomes.find(d => d.value === profil.diplome)?.label || formatText(profil.diplome)}
              {" · "}
              {constants.secteurs.find(s => s.value === profil.specialite)?.label || formatText(profil.specialite)}
            </p>
            {profil.niveau_experience && (
              <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-xs font-semibold rounded-full ${tw.bgPrimarySoft} ${tw.textPrimaryStrong}`}>
                <Award size={10} /> {formatText(profil.niveau_experience)}
              </span>
            )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              label: "Secteur souhaité",
              value: formatText(profil.secteur_souhaite),
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
                      <span className={`ml-2 ${tw.textMuted} font-normal`}>· {exp.secteur}</span>
                    )}
                  </p>
                  <p className={`text-xs ${tw.textMuted} mt-1`}>
                    {formatDate(exp.date_debut)} —{" "}
                    {exp.date_fin ? formatDate(exp.date_fin) : "Aujourd'hui"}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditExp(exp)}
                    className={`p-1.5 rounded-lg transition-colors ${tw.hoverIconActionPrimary}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteExp(exp.id)}
                    className={`p-1.5 rounded-lg transition-colors ${tw.deleteIconButton}`}
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
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditFormation(f)}
                    className={`p-1.5 rounded-lg transition-colors ${tw.hoverIconActionPrimary}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteForm(f.id)}
                    className={`p-1.5 rounded-lg transition-colors ${tw.deleteIconButton}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPÉTENCES */}
      <div className={SECTION_CLASS}>
        <h2 className={`${SECTION_TITLE} mb-4`}>Compétences</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {profil.competences
            ?.split(",")
            .filter((t) => t)
            .map((tag) => (
              <span
                key={tag.trim()}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded-lg shadow-sm ${tw.skillTag}`}
              >
                {tag.trim()}
                <button
                  onClick={() => handleRemoveTag("competences", tag)}
                  className={`transition-colors ml-0.5 ${tw.skillTagRemove}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
        </div>
        <div className="flex gap-2">
          <input
            id="comp-input"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                handleAddTag("competences", e.target.value);
                e.target.value = "";
              }
            }}
            placeholder="Tapez une compétence puis Entrée..."
            className={INPUT_CLASS + " flex-1"}
          />
          <button
            onClick={() => {
              const el = document.getElementById("comp-input");
              if (el?.value.trim()) { handleAddTag("competences", el.value); el.value = ""; }
            }}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg ${tw.buttonDark}`}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* LANGUES */}
      <div className={SECTION_CLASS}>
        <h2 className={`${SECTION_TITLE} mb-4`}>Langues</h2>
        <div className="flex flex-wrap gap-2 mb-4">
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
                    className={`transition-colors ${tw.langueChipRemove}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            placeholder="Langue (ex: Anglais)"
            className={INPUT_CLASS + " flex-1"}
            value={langName}
            onChange={(e) => setLangName(e.target.value)}
          />
          <select
            className={INPUT_CLASS + " flex-1"}
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
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg ${tw.buttonDark}`}
          >
            Ajouter
          </button>
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
        showParserModal={showParserModal}
        setShowParserModal={setShowParserModal}
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
        parserLoading={parserLoading}
        remplissageLoading={remplissageLoading}
        parsedData={parsedData}
        setParsedData={setParsedData}
        parserMode={parserMode}
        setParserMode={setParserMode}
        handleUpdateGeneric={handleUpdateGeneric}
        handleUpdateCV={handleUpdateCV}
        handleUpdateLinks={handleUpdateLinks}
        handleTitreProChange={handleTitreProChange}
        handleAddExperience={handleAddExperience}
        handleUpdateExperience={handleUpdateExperience}
        handleAddFormation={handleAddFormation}
        handleUpdateFormation={handleUpdateFormation}
        handleParserCVUpload={handleParserCVUpload}
        handleValiderParsing={handleValiderParsing}
        getCommunesOptions={getCommunesOptions}
      />
    </div>
  );
};

export default ProfilCandidat;
