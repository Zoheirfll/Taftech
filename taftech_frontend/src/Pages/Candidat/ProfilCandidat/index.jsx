import React from "react";
import {
  Camera,
  Plus,
  Pencil,
  Trash2,
  X,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useProfilCandidat } from "./useProfilCandidat";
import { Modals } from "./Modals";

const ProfilCandidat = () => {
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
    parserLoading,
    parsedData,
    setParsedData,
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

  const inputClass =
    "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  const modalClass =
    "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4";
  const modalInnerClass =
    "bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]";
  const btnPrimary =
    "flex-1 py-3 bg-indigo-600 text-white text-base font-bold rounded-xl hover:bg-indigo-700 transition-colors";
  const btnCancel =
    "flex-1 py-3 bg-slate-100 text-slate-600 text-base font-semibold rounded-xl hover:bg-slate-200 transition-colors";
  const sectionClass = "bg-white border border-slate-200 rounded-2xl p-6";
  const sectionTitle = "text-lg font-bold text-slate-900";
  const editBtn =
    "flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors";

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  return (
    <div className="space-y-6 pb-16">
      <h1 className="text-2xl font-extrabold text-slate-900">
        Mon profil professionnel
      </h1>

      {/* JAUGE COMPLETION */}
      <div className="bg-indigo-600 rounded-xl p-5 text-white">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold">Remplissage du profil</p>
          <span className="text-sm font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
            {completionPercent}%
          </span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all duration-1000"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="text-xs text-indigo-200 mt-2">
          {completionPercent === 100
            ? "Profil complet — vous maximisez vos chances !"
            : "Complétez vos informations pour améliorer le matching IA."}
        </p>
      </div>

      {/* CV */}
      <div className={sectionClass}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className={sectionTitle}>Mon CV</h2>
            <p className="text-sm font-semibold text-indigo-600 mt-1">
              {profil.titre_professionnel || "Titre à définir"}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {profil.cv_pdf
                ? profil.cv_pdf.split("/").pop()
                : "Aucun fichier joint"}
            </p>
          </div>
          <button onClick={() => setShowCVForm(true)} className={editBtn}>
            <Pencil size={12} /> Modifier
          </button>
        </div>
        <div className="border-t border-slate-100 pt-4 mt-4">
          <button
            onClick={() => setShowParserModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Sparkles size={16} /> Remplir automatiquement depuis mon CV
          </button>
          <p className="text-xs text-slate-600 mt-2 text-center">
            Notre IA analyse votre CV et remplit vos infos en quelques secondes.
          </p>
        </div>
        {(profil.bio || profil.linkedin || profil.github) && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {profil.bio && (
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg italic">
                "{profil.bio}"
              </p>
            )}
            <div className="flex gap-2">
              {profil.linkedin && (
                <a
                  href={profil.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <ExternalLink size={13} /> LinkedIn
                </a>
              )}
              {profil.github && (
                <a
                  href={profil.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <ExternalLink size={13} /> GitHub
                </a>
              )}
              <button
                onClick={() => setShowLinksForm(true)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Pencil size={12} /> Modifier
              </button>
            </div>
          </div>
        )}
        {!profil.bio && !profil.linkedin && !profil.github && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowLinksForm(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:underline"
            >
              <Plus size={12} /> Ajouter bio / LinkedIn / GitHub
            </button>
          </div>
        )}
      </div>

      {/* INFORMATIONS PERSONNELLES */}
      <div className={sectionClass}>
        <div className="flex justify-between items-start mb-5">
          <h2 className={sectionTitle}>Informations personnelles</h2>
          <button onClick={() => setShowInfoForm(true)} className={editBtn}>
            <Pencil size={12} /> Modifier
          </button>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
              {profil.photo_profil ? (
                <img
                  src={getPhotoUrl(profil.photo_profil)}
                  alt="Profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors border-2 border-white">
              <Camera size={12} className="text-white" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </label>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-slate-900">
              {profil.first_name} {profil.last_name}
            </h3>
            <p className="text-sm text-slate-600 mt-0.5">
              {profil.wilaya || "Wilaya non renseignée"}
              {profil.commune ? ` · ${profil.commune}` : ""}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {formatText(profil.diplome)} · {formatText(profil.specialite)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 py-3 border-t border-slate-100 mb-4">
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
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
            >
              {active ? "✓" : "✕"} {label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <span>📞 {profil.telephone || "Non renseigné"}</span>
          <span>✉️ {profil.email}</span>
        </div>
      </div>

      {/* PRÉFÉRENCES */}
      <div className={sectionClass}>
        <div className="flex justify-between items-start mb-4">
          <h2 className={sectionTitle}>Préférences de recrutement</h2>
          <button onClick={() => setShowPrefForm(true)} className={editBtn}>
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
              className="bg-slate-50 p-3 rounded-lg border border-slate-100"
            >
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
                {label}
              </p>
              <p className="text-sm font-semibold text-indigo-600">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* EXPÉRIENCES */}
      <div className={sectionClass}>
        <div className="flex justify-between items-center mb-5">
          <h2 className={sectionTitle}>Expériences professionnelles</h2>
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
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
        <div className="space-y-5">
          {profil.experiences_detail?.length === 0 && (
            <p className="text-sm text-slate-600 italic">
              Aucune expérience ajoutée.
            </p>
          )}
          {profil.experiences_detail?.map((exp) => (
            <div
              key={exp.id}
              className="relative group pl-5 border-l-2 border-indigo-100"
            >
              <div className="absolute -left-2 top-1 w-3.5 h-3.5 bg-white border-2 border-indigo-500 rounded-full" />
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    {exp.titre_poste}
                  </h4>
                  <p className="text-xs text-indigo-600 font-medium">
                    {exp.entreprise}
                    {exp.secteur && (
                      <span className="ml-2 text-slate-400 font-normal">· {exp.secteur}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {formatDate(exp.date_debut)} —{" "}
                    {exp.date_fin ? formatDate(exp.date_fin) : "Aujourd'hui"}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditExp(exp)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteExp(exp.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {exp.description && (
                <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                  {exp.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FORMATIONS */}
      <div className={sectionClass}>
        <div className="flex justify-between items-center mb-5">
          <h2 className={sectionTitle}>Formations et diplômes</h2>
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
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
        <div className="space-y-5">
          {profil.formations_detail?.length === 0 && (
            <p className="text-sm text-slate-600 italic">
              Aucune formation ajoutée.
            </p>
          )}
          {profil.formations_detail?.map((f) => (
            <div
              key={f.id}
              className="relative group pl-5 border-l-2 border-slate-200"
            >
              <div className="absolute -left-2 top-1 w-3.5 h-3.5 bg-white border-2 border-slate-400 rounded-full" />
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    {f.diplome || "Diplôme non précisé"}
                  </h4>
                  {f.description && (
                    <p className="text-xs text-indigo-600 font-medium">
                      {f.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 font-medium">
                    {f.etablissement}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {formatDate(f.date_debut)} —{" "}
                    {f.date_fin ? formatDate(f.date_fin) : "En cours"}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditFormation(f)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteForm(f.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
      <div className={sectionClass}>
        <h2 className={`${sectionTitle} mb-4`}>Compétences</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {profil.competences
            ?.split(",")
            .filter((t) => t)
            .map((tag, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-sm"
              >
                {tag.trim()}
                <button
                  onClick={() => handleRemoveTag("competences", tag)}
                  className="text-slate-300 hover:text-red-400 transition-colors ml-0.5"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
        </div>
        <input
          onKeyDown={(e) =>
            e.key === "Enter" &&
            (handleAddTag("competences", e.target.value), (e.target.value = ""))
          }
          placeholder="Tapez une compétence puis Entrée..."
          className={inputClass}
        />
      </div>

      {/* LANGUES */}
      <div className={sectionClass}>
        <h2 className={`${sectionTitle} mb-4`}>Langues</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {profil.langues
            ?.split(",")
            .filter((l) => l)
            .map((l, i) => {
              const [name, level] = l.split(":");
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg"
                >
                  <span className="text-sm font-semibold text-indigo-900">
                    {name}
                  </span>
                  <span className="text-[10px] uppercase px-2 py-0.5 bg-white text-indigo-600 rounded-md font-semibold border border-indigo-100">
                    {level}
                  </span>
                  <button
                    onClick={() => handleRemoveTag("langues", l)}
                    className="text-indigo-300 hover:text-red-400 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            id="langName"
            placeholder="Langue (ex: Anglais)"
            className={inputClass + " flex-1"}
          />
          <select id="langLevel" className={inputClass + " flex-1"}>
            <option>Débutant</option>
            <option>Intermédiaire</option>
            <option>Avancé</option>
            <option>Bilingue / Maternelle</option>
          </select>
          <button
            onClick={() => {
              const n = document.getElementById("langName").value;
              const v = document.getElementById("langLevel").value;
              if (n) {
                handleAddLanguage(n, v);
                document.getElementById("langName").value = "";
              }
            }}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors"
          >
            Ajouter
          </button>
        </div>
      </div>

      {/* MODALS */}
      <Modals
        inputClass={inputClass}
        modalClass={modalClass}
        modalInnerClass={modalInnerClass}
        btnPrimary={btnPrimary}
        btnCancel={btnCancel}
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
        parserLoading={parserLoading}
        parsedData={parsedData}
        setParsedData={setParsedData}
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
