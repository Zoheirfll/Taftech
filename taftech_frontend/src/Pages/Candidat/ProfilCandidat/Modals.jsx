import React from "react";
import Select from "react-select";
import { selectStyles } from "../../../theme";
import { Pencil, X, Sparkles, ExternalLink } from "lucide-react";
import { tw } from "../../../theme";

export const Modals = ({
  // Styles
  inputClass,
  modalClass,
  modalInnerClass,
  btnPrimary,
  btnCancel,
  // Constants
  constants,
  // State modals
  showInfoForm,
  setShowInfoForm,
  showPrefForm,
  setShowPrefForm,
  showLinksForm,
  setShowLinksForm,
  showCVForm,
  setShowCVForm,
  showExpForm,
  setShowExpForm,
  showFormForm,
  setShowFormForm,
  showParserModal,
  setShowParserModal,
  // Forms state
  editInfo,
  setEditInfo,
  editPref,
  setEditPref,
  editLinks,
  setEditLinks,
  editCV,
  setEditCV,
  newExp,
  setNewExp,
  newForm,
  setNewForm,
  editingExpId,
  setEditingExpId,
  editingFormId,
  setEditingFormId,
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
  resetParser,
  parserMode,
  setParserMode,
  // Handlers
  handleUpdateGeneric,
  handleUpdateCV,
  handleUpdateLinks,
  handleTitreProChange,
  handleAddExperience,
  handleUpdateExperience,
  handleAddFormation,
  handleUpdateFormation,
  handleParserCVUpload,
  handleValiderParsing,
  getCommunesOptions,
}) => {
  const communesOptions = getCommunesOptions(editInfo.wilaya);

  return (
    <>
      {/* MODAL INFORMATIONS PERSONNELLES */}
      {showInfoForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              Informations personnelles
            </h3>
            <form
              onSubmit={(e) =>
                handleUpdateGeneric(e, editInfo, setShowInfoForm)
              }
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Prénom
                  </label>
                  <input
                    required
                    className={inputClass}
                    value={editInfo.first_name}
                    onChange={(e) =>
                      setEditInfo({ ...editInfo, first_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Nom
                  </label>
                  <input
                    required
                    className={inputClass}
                    value={editInfo.last_name}
                    onChange={(e) =>
                      setEditInfo({ ...editInfo, last_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Téléphone
                </label>
                <input
                  required
                  type="tel"
                  className={inputClass}
                  value={editInfo.telephone}
                  onChange={(e) =>
                    setEditInfo({ ...editInfo, telephone: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Wilaya
                  </label>
                  <Select
                    options={constants.wilayas}
                    value={
                      constants.wilayas.find(
                        (w) => w.value === editInfo.wilaya,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        wilaya: opt ? opt.value : "",
                        commune: "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Commune
                  </label>
                  <Select
                    options={communesOptions}
                    isDisabled={!editInfo.wilaya}
                    value={communesOptions.find((c) => c.value === editInfo.commune) || null}
                    placeholder={
                      editInfo.wilaya ? "Sélectionnez..." : "Wilaya d'abord"
                    }
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        commune: opt ? opt.value : "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Adresse
                </label>
                <input
                  className={inputClass}
                  value={editInfo.adresse || ""}
                  onChange={(e) =>
                    setEditInfo({ ...editInfo, adresse: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  NIN (Numéro d'Identification Nationale)
                </label>
                <p className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono ${tw.ninDisplayBox}`}>
                  {editInfo.nin || "Non renseigné"}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Diplôme
                  </label>
                  <Select
                    options={constants.diplomes}
                    value={
                      constants.diplomes.find(
                        (d) => d.value === editInfo.diplome,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        diplome: opt ? opt.value : "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Spécialité
                  </label>
                  <Select
                    options={constants.secteurs}
                    value={
                      constants.secteurs.find(
                        (s) => s.value === editInfo.specialite,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        specialite: opt ? opt.value : "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Situation militaire
                </label>
                <select
                  className={inputClass}
                  value={editInfo.service_militaire}
                  onChange={(e) =>
                    setEditInfo({
                      ...editInfo,
                      service_militaire: e.target.value,
                    })
                  }
                >
                  <option value="">Sélectionner...</option>
                  <option value="DEGAGE">Dégagé</option>
                  <option value="SURSITAIRE">Sursitaire</option>
                  <option value="INAPTE">Inapte</option>
                  <option value="INCORPORE">Incorporé</option>
                  <option value="NON_CONCERNE">Non concerné (Femme)</option>
                </select>
              </div>
              <div className="flex gap-6 py-2">
                {[
                  { label: "Permis de conduire", field: "permis_conduire" },
                  { label: "Passeport valide", field: "passeport_valide" },
                ].map(({ label, field }) => (
                  <label
                    key={field}
                    className={`flex items-center gap-2 cursor-pointer text-sm font-medium ${tw.textMuted700}`}
                  >
                    <input
                      type="checkbox"
                      className={`w-4 h-4 ${tw.accentPrimary}`}
                      checked={editInfo[field]}
                      onChange={(e) =>
                        setEditInfo({ ...editInfo, [field]: e.target.checked })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInfoForm(false)}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRÉFÉRENCES */}
      {showPrefForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              Préférences de recrutement
            </h3>
            <form
              onSubmit={(e) =>
                handleUpdateGeneric(e, editPref, setShowPrefForm)
              }
              className="space-y-4"
            >
              <div>
                <label className={tw.formLabel}>
                  Secteur souhaité
                </label>
                <Select
                  options={constants.secteurs}
                  value={
                    constants.secteurs.find(
                      (s) => s.value === editPref.secteur_souhaite,
                    ) || null
                  }
                  placeholder="Sélectionnez..."
                  onChange={(opt) =>
                    setEditPref({
                      ...editPref,
                      secteur_souhaite: opt ? opt.value : "",
                    })
                  }
                  styles={selectStyles}
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Salaire mensuel attendu
                </label>
                <input
                  placeholder="Ex: 80 000 DA"
                  className={inputClass}
                  value={editPref.salaire_souhaite}
                  onChange={(e) =>
                    setEditPref({
                      ...editPref,
                      salaire_souhaite: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Mobilité
                  </label>
                  <select
                    className={inputClass}
                    value={editPref.mobilite}
                    onChange={(e) =>
                      setEditPref({ ...editPref, mobilite: e.target.value })
                    }
                  >
                    <option value="">Sélectionnez...</option>
                    <option value="LOCALE">Locale</option>
                    <option value="REGIONALE">Régionale</option>
                    <option value="NATIONALE">Nationale</option>
                    <option value="INTERNATIONALE">Internationale</option>
                  </select>
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Statut actuel
                  </label>
                  <select
                    className={inputClass}
                    value={editPref.situation_actuelle}
                    onChange={(e) =>
                      setEditPref({
                        ...editPref,
                        situation_actuelle: e.target.value,
                      })
                    }
                  >
                    <option value="">Sélectionnez...</option>
                    <option value="EN_RECHERCHE">En recherche active</option>
                    <option value="A_L_ECOUTE">À l'écoute du marché</option>
                    <option value="EN_POSTE">En poste</option>
                    <option value="ETUDIANT">Étudiant</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrefForm(false)}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIENS */}
      {showLinksForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              Bio & Réseaux sociaux
            </h3>
            <form onSubmit={handleUpdateLinks} className="space-y-4">
              <div>
                <label className={tw.formLabel}>
                  Bio / Résumé de profil
                </label>
                <textarea
                  rows="3"
                  placeholder="Décrivez-vous en quelques phrases..."
                  className={inputClass + " resize-none"}
                  value={editLinks.bio}
                  onChange={(e) =>
                    setEditLinks({ ...editLinks, bio: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Lien LinkedIn
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/votre-profil"
                  className={inputClass}
                  value={editLinks.linkedin}
                  onChange={(e) =>
                    setEditLinks({ ...editLinks, linkedin: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Lien GitHub
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/votre-profil"
                  className={inputClass}
                  value={editLinks.github}
                  onChange={(e) =>
                    setEditLinks({ ...editLinks, github: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinksForm(false)}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CV */}
      {showCVForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              Mettre à jour mon CV
            </h3>
            <form onSubmit={handleUpdateCV} className="space-y-4">
              <div>
                <label className={tw.formLabel}>
                  Titre professionnel
                </label>
                <div className="relative">
                  <input
                    placeholder="Ex: Développeur Fullstack"
                    className={inputClass}
                    value={editCV.titre}
                    onChange={(e) => handleTitreProChange(e.target.value)}
                    onBlur={() =>
                      setTimeout(() => setShowTitreSuggestions(false), 200)
                    }
                  />
                  {showTitreSuggestions && titreSuggestions.length > 0 && (
                    <div className={`absolute top-full left-0 right-0 rounded-xl shadow-lg z-50 mt-1 overflow-hidden ${tw.autocompleteDropdown}`}>
                      <div className="max-h-48 overflow-y-auto">
                        {titreSuggestions.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onMouseDown={() => {
                              setEditCV({ ...editCV, titre: m.titre });
                              setShowTitreSuggestions(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 transition-colors ${tw.autocompleteItem}`}
                          >
                            <p className={`text-sm font-medium ${tw.autocompleteItemTitle}`}>
                              {m.titre}
                            </p>
                            <p className={`text-xs ${tw.autocompleteItemSubtitle}`}>
                              {m.secteur}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={`p-8 text-center relative cursor-pointer transition-colors group ${tw.dropzoneNeutral}`}>
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf"
                  onChange={(e) =>
                    setEditCV({ ...editCV, file: e.target.files[0] })
                  }
                />
                <p className={`text-sm font-medium transition-colors ${tw.dropzoneNeutralText}`}>
                  {editCV.file
                    ? editCV.file.name
                    : "Cliquez ou glissez un PDF ici"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCVForm(false)}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Téléverser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXPÉRIENCE */}
      {showExpForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              {editingExpId
                ? "Modifier l'expérience"
                : "Ajouter une expérience"}
            </h3>
            <form
              onSubmit={
                editingExpId ? handleUpdateExperience : handleAddExperience
              }
              className="space-y-4"
            >
              <div>
                <label className={tw.formLabel}>
                  Titre du poste *
                </label>
                <div className="relative">
                  <input
                    required
                    placeholder="Ex: Développeur Backend"
                    className={inputClass}
                    value={newExp.titre_poste}
                    onChange={(e) => handleExpTitreChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowExpTitreSuggestions(false), 150)}
                    autoComplete="off"
                  />
                  {showExpTitreSuggestions && expTitreSuggestions.length > 0 && (
                    <ul className={`absolute z-50 w-full rounded-lg shadow-lg max-h-52 overflow-y-auto mt-1 ${tw.autocompleteDropdown}`}>
                      {expTitreSuggestions.map((m) => (
                        <li
                          key={m.id}
                          className={`px-4 py-2 text-sm cursor-pointer ${tw.textMuted700} ${tw.bgPrimaryHover}`}
                          onMouseDown={() => {
                            setNewExp((prev) => ({ ...prev, titre_poste: m.titre }));
                            setShowExpTitreSuggestions(false);
                          }}
                        >
                          {m.titre}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Entreprise *
                </label>
                <input
                  required
                  placeholder="Nom de l'entreprise"
                  className={inputClass}
                  value={newExp.entreprise}
                  onChange={(e) =>
                    setNewExp({ ...newExp, entreprise: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Secteur du poste
                </label>
                <Select
                  options={constants.secteurs}
                  value={constants.secteurs?.find((s) => s.value === newExp.secteur) || null}
                  onChange={(opt) => setNewExp({ ...newExp, secteur: opt ? opt.value : "" })}
                  placeholder="Sélectionner un secteur..."
                  isClearable
                  styles={selectStyles}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Date de début *
                  </label>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={newExp.date_debut}
                    onChange={(e) =>
                      setNewExp({ ...newExp, date_debut: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Date de fin (optionnel)
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    value={newExp.date_fin}
                    onChange={(e) =>
                      setNewExp({ ...newExp, date_fin: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Missions, résultats..."
                  className={inputClass + " resize-none"}
                  value={newExp.description}
                  onChange={(e) =>
                    setNewExp({ ...newExp, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpForm(false);
                    setEditingExpId(null);
                    setShowExpTitreSuggestions(false);
                    setNewExp({
                      titre_poste: "",
                      entreprise: "",
                      secteur: "",
                      date_debut: "",
                      date_fin: "",
                      description: "",
                    });
                  }}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORMATION */}
      {showFormForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              {editingFormId
                ? "Modifier la formation"
                : "Ajouter une formation"}
            </h3>
            <form
              onSubmit={
                editingFormId ? handleUpdateFormation : handleAddFormation
              }
              className="space-y-4"
            >
              <div>
                <label className={tw.formLabel}>
                  Niveau de diplôme
                </label>
                <Select
                  options={constants.diplomes}
                  placeholder="Sélectionnez..."
                  value={
                    constants.diplomes.find(
                      (d) => d.label === newForm.diplome,
                    ) || null
                  }
                  onChange={(opt) =>
                    setNewForm({ ...newForm, diplome: opt ? opt.label : "" })
                  }
                  styles={selectStyles}
                  isClearable
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Spécialité / Domaine
                </label>
                <input
                  placeholder="Ex: Informatique, Génie Civil..."
                  className={inputClass}
                  value={newForm.description}
                  onChange={(e) =>
                    setNewForm({ ...newForm, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Établissement *
                </label>
                <input
                  required
                  placeholder="Université, École ou Institut"
                  className={inputClass}
                  value={newForm.etablissement}
                  onChange={(e) =>
                    setNewForm({ ...newForm, etablissement: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Début *
                  </label>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={newForm.date_debut}
                    onChange={(e) =>
                      setNewForm({ ...newForm, date_debut: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Fin (ou prévue)
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    value={newForm.date_fin}
                    onChange={(e) =>
                      setNewForm({ ...newForm, date_fin: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormForm(false);
                    setEditingFormId(null);
                    setNewForm({
                      diplome: "",
                      etablissement: "",
                      date_debut: "",
                      date_fin: "",
                      description: "",
                    });
                  }}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" className={btnPrimary}>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARSING CV */}
      {showParserModal && (
        <div className={modalClass}>
          <div className={`${tw.surface} rounded-2xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className={`text-lg font-bold ${tw.textStrong} flex items-center gap-2`}>
                  <Sparkles size={18} className={tw.textPrimary} /> Remplissage
                  automatique
                </h3>
                <p className={`text-xs ${tw.textMuted} mt-1`}>
                  Notre système extrait les informations de votre CV
                </p>
              </div>
              <button
                onClick={() => {
                  setShowParserModal(false);
                  resetParser();
                }}
                className={`p-1.5 rounded-lg transition-colors ${tw.modalCloseButton}`}
              >
                <X size={18} />
              </button>
            </div>
            {!parsedData ? (
              <div className="space-y-4">
                <div className={`rounded-xl p-10 text-center relative cursor-pointer transition-colors group ${tw.dropzonePrimary}`}>
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.docx,.doc"
                    onChange={handleParserCVUpload}
                    disabled={parserLoading}
                  />
                  {parserLoading ? (
                    <div>
                      <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${tw.borderPrimary} mx-auto mb-3`}></div>
                      <p className={`text-sm font-semibold ${tw.textPrimaryStrong}`}>
                        Analyse en cours...
                      </p>
                      <p className={`text-xs ${tw.textMuted} mt-1`}>
                        Cela peut prendre 30 à 60 secondes
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className={`text-sm font-semibold transition-colors ${tw.textMuted700} group-hover:text-indigo-600`}>
                        Cliquez ou glissez votre CV ici
                      </p>
                      <p className={`text-xs ${tw.textMuted} mt-1`}>
                        PDF, Word (.docx, .doc) — Max 5 Mo
                      </p>
                    </>
                  )}
                </div>
                <div className={`rounded-xl p-4 text-xs space-y-1 ${tw.parserInfoBox}`}>
                  <p className="font-semibold mb-1.5">Comment ça marche :</p>
                  <p>
                    • Le système lit votre CV et détecte vos infos
                    automatiquement
                  </p>
                  <p>
                    • Vous validez les données avant qu'elles soient
                    enregistrées
                  </p>
                  <p>• Vos données restent privées (Loi 18-07)</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-3 rounded-xl ${tw.parserSuccessBox}`}>
                  <p className={`text-sm font-semibold ${tw.parserSuccessText}`}>
                    ✅ Analyse terminée — vérifiez les données
                  </p>
                  {parsedData.parsing_method?.includes(":ai") ? (
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${tw.badgeAiCloud}`}>
                      🤖 IA Cloud
                    </span>
                  ) : (
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${tw.badgeRegex}`}>
                      📐 Regex
                    </span>
                  )}
                </div>
                {parsedData.photo && (
                  <div className={`flex items-center gap-4 p-4 rounded-xl ${tw.photoDetectedBox}`}>
                    <img
                      src={`data:image/${parsedData.photo.ext};base64,${parsedData.photo.data}`}
                      alt="Photo"
                      className={`w-16 h-16 rounded-xl object-cover border-2 ${tw.surface} shadow-sm`}
                    />
                    <div>
                      <p className={`text-xs font-semibold ${tw.photoDetectedTitle}`}>
                        Photo détectée
                      </p>
                      <p className={`text-xs ${tw.photoDetectedSubtitle} mt-0.5`}>
                        Sera ajoutée à votre profil
                      </p>
                    </div>
                  </div>
                )}
                {(parsedData.bio ||
                  parsedData.linkedin ||
                  parsedData.github) && (
                  <div className={`rounded-xl p-4 space-y-3 ${tw.parserSectionBox}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${tw.parserSectionLabel}`}>
                      Résumé & Réseaux Sociaux
                    </p>
                    {parsedData.bio && (
                      <div>
                        <p className={`text-[10px] font-semibold uppercase ${tw.parserSectionLabel}`}>
                          Bio
                        </p>
                        <p className={`text-sm font-medium italic mt-0.5 ${tw.parserBioText}`}>
                          "{parsedData.bio}"
                        </p>
                      </div>
                    )}
                    <div className="flex gap-4 pt-1">
                      {parsedData.linkedin && (
                        <div className={`flex items-center gap-1.5 text-xs font-semibold ${tw.detectedLinkedin}`}>
                          <ExternalLink size={14} /> LinkedIn détecté
                        </div>
                      )}
                      {parsedData.github && (
                        <div className={`flex items-center gap-1.5 text-xs font-semibold ${tw.detectedGithub}`}>
                          <ExternalLink size={14} /> GitHub détecté
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className={`rounded-xl p-4 space-y-3 ${tw.surfaceMuted}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${tw.parserSectionLabel}`}>
                    Informations détectées
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: "Nom complet", value: parsedData.nom_complet },
                      { label: "Email", value: parsedData.email },
                      { label: "Téléphone", value: parsedData.telephone },
                      {
                        label: "Titre professionnel",
                        value: parsedData.titre_professionnel,
                      },
                      { label: "Wilaya", value: parsedData.wilaya },
                      { label: "Diplôme", value: parsedData.diplome },
                      { label: "Spécialité", value: parsedData.specialite },
                      {
                        label: "Service militaire",
                        value: parsedData.service_militaire,
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className={`text-[10px] font-semibold uppercase ${tw.parserSectionLabel}`}>
                          {label}
                        </p>
                        <p className={`text-sm font-medium ${tw.detectedFieldValue}`}>
                          {value || (
                            <span className={`italic text-xs ${tw.detectedFieldEmpty}`}>
                              Non détecté
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className={`flex flex-wrap gap-2 pt-2 border-t ${tw.borderBase}`}>
                    {[
                      { label: "Permis", active: parsedData.permis_conduire },
                      {
                        label: "Passeport",
                        active: parsedData.passeport_valide,
                      },
                      {
                        label: "Véhiculé",
                        active: parsedData.vehicule_personnel,
                      },
                    ].map(({ label, active }) => (
                      <span
                        key={label}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${active ? tw.chipActiveGreen : tw.chipInactiveSlate}`}
                      >
                        {active ? "✓" : "✕"} {label}
                      </span>
                    ))}
                  </div>
                </div>
                {parsedData.experiences?.length > 0 && (
                  <div className={`rounded-xl p-4 ${tw.parserExpBox}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${tw.parserExpTitle}`}>
                      Expériences ({parsedData.experiences.length})
                    </p>
                    <div className="space-y-2">
                      {parsedData.experiences.map((exp, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg ${tw.parserExpItem}`}
                        >
                          <p className={`text-sm font-semibold ${tw.textStrong}`}>
                            {exp.titre_poste}
                          </p>
                          <p className={`text-xs ${tw.textPrimary}`}>
                            {exp.entreprise}
                          </p>
                          <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                            {exp.date_debut_raw} — {exp.date_fin_raw}
                            {exp.secteur && (
                              <span className={tw.textPrimary}>
                                {" "}· {constants.secteurs?.find((s) => s.value === exp.secteur)?.label || exp.secteur}
                              </span>
                            )}
                          </p>
                          {exp.description && (
                            <p className={`text-xs ${tw.textMuted} mt-1 line-clamp-2`}>
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {parsedData.formations?.length > 0 && (
                  <div className={`rounded-xl p-4 ${tw.parserFormBox}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${tw.parserFormTitle}`}>
                      Formations ({parsedData.formations.length})
                    </p>
                    <div className="space-y-2">
                      {parsedData.formations.map((f, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg ${tw.parserFormItem}`}
                        >
                          <p className={`text-sm font-semibold ${tw.textStrong}`}>
                            {f.diplome}
                          </p>
                          <p className={`text-xs ${tw.textMuted}`}>
                            {f.etablissement}
                          </p>
                          <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                            {f.date_debut_raw} — {f.date_fin_raw}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {parsedData.competences && (
                  <div className={`rounded-xl p-4 ${tw.parserExpBox}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${tw.parserExpTitle}`}>
                      Compétences
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedData.competences
                        .split(",")
                        .filter((c) => c.trim())
                        .map((c, i) => (
                          <span
                            key={i}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md ${tw.parserCompChip}`}
                          >
                            {c.trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                {parsedData.langues && (
                  <div className={`rounded-xl p-4 ${tw.parserLangueBox}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${tw.parserLangueTitle}`}>
                      Langues
                    </p>
                    <p className={`text-sm font-medium ${tw.textMuted700}`}>
                      {parsedData.langues}
                    </p>
                  </div>
                )}
                <div className={`rounded-xl p-3 space-y-2 ${tw.parserModeBox}`}>
                  <p className={`text-xs font-medium ${tw.parserModeText}`}>
                    Que faire avec ces informations ?
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="parserMode"
                      checked={parserMode === "remplacer"}
                      onChange={() => setParserMode("remplacer")}
                      className="mt-0.5"
                    />
                    <span className={`text-xs ${tw.parserModeText}`}>
                      <strong>Remplacer</strong> — écrase les données actuelles de
                      votre profil par celles de ce CV
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="parserMode"
                      checked={parserMode === "ajouter"}
                      onChange={() => setParserMode("ajouter")}
                      className="mt-0.5"
                    />
                    <span className={`text-xs ${tw.parserModeText}`}>
                      <strong>Ajouter</strong> — complète votre profil sans toucher
                      aux champs déjà remplis
                    </span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => resetParser()}
                    disabled={remplissageLoading}
                    className={btnCancel}
                  >
                    Recommencer
                  </button>
                  <button
                    onClick={handleValiderParsing}
                    disabled={remplissageLoading}
                    className={`${btnPrimary} disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                  >
                    {remplissageLoading && (
                      <span className={`h-4 w-4 ${tw.spinnerWhiteSolid}`}></span>
                    )}
                    {remplissageLoading ? "Remplissage en cours..." : "Valider et remplir"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
