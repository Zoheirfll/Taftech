import React from "react";
import Select from "react-select";
import { selectStyles } from "../../../theme";
import { SecteurDomaineSelect } from "../../../Components/SecteurDomaineSelect";
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
  profil,
  // Handlers
  handleUpdateGeneric,
  handleUpdateCV,
  handleUpdateLinks,
  handleTitreProChange,
  handleAddExperience,
  handleUpdateExperience,
  handleAddFormation,
  handleUpdateFormation,
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
              {editInfo.nin && (
                <div>
                  <label className={tw.formLabel}>
                    NIN (Numéro d'Identification Nationale)
                  </label>
                  <p className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono ${tw.ninDisplayBox}`}>
                    {editInfo.nin}
                  </p>
                </div>
              )}
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
                  <SecteurDomaineSelect
                    value={editInfo.specialite}
                    onChange={(domaineCode) =>
                      setEditInfo({ ...editInfo, specialite: domaineCode })
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
                <SecteurDomaineSelect
                  value={editPref.secteur_souhaite}
                  onChange={(domaineCode) =>
                    setEditPref({ ...editPref, secteur_souhaite: domaineCode })
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
                              {m.domaine_label}
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
                <SecteurDomaineSelect
                  value={newExp.secteur}
                  onChange={(domaineCode) => setNewExp({ ...newExp, secteur: domaineCode })}
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

    </>
  );
};
