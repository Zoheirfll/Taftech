// Section "Informations du poste" : intitulé (avec suggestions métier), type de contrat, postes, salaire.
import Select from "react-select";
import { Briefcase } from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import { MetierAutocomplete } from "../../../Components/MetierAutocomplete";
import { Section, Field, inputClass } from "./formUi";

const SectionInfosPoste = ({ job }) => {
  const {
    formData, setFormData, errors, setErrors, constants, metierSuggestions, showSuggestions, setShowSuggestions,
    handleTitreChange, handleChange, handleSelectChange,
  } = job;
  const errClass = (key) => (errors[key] ? ` ${tw.inputErrorRing}` : "");

  return (
    <Section icon={Briefcase} title="Informations du poste">
      <div className="space-y-4">
        {/* Titre + métier fusionnés : choisir une suggestion résout titre ET métier en un
            seul geste (référentiel v2). Une saisie 100% libre reste possible mais exige
            alors de rattacher manuellement un métier ci-dessous (obligatoire pour le 25%
            du score de matching, REGLES_MATCHING S06/S07). */}
        <div id="field-titre">
          <Field label="Intitulé du poste" required>
            <div className="relative">
              <input
                name="titre"
                value={formData.titre}
                onChange={(e) => { handleTitreChange(e.target.value); if (errors.titre) setErrors(p => ({ ...p, titre: "" })); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className={inputClass + " font-semibold" + errClass("titre")}
              />
              {showSuggestions && metierSuggestions.length > 0 && (
                <div className={`absolute top-full left-0 right-0 ${tw.surface} border ${tw.borderBase} rounded-xl shadow-lg z-50 mt-1 overflow-hidden`}>
                  <div className="max-h-52 overflow-y-auto">
                    {metierSuggestions.map((m) => (
                      <button
                        key={m.metier_id}
                        type="button"
                        onMouseDown={() => {
                          setFormData((p) => ({ ...p, titre: m.appellation_libelle, metier: m.metier_id, metier_libelle: m.metier_libelle }));
                          setShowSuggestions(false);
                          if (errors.metier) setErrors((p) => ({ ...p, metier: "" }));
                        }}
                        className={`w-full text-left px-4 py-2.5 transition-colors border-b ${tw.borderSubtle} last:border-0 ${tw.bgTealHover}`}
                      >
                        <p className={`text-sm font-medium ${tw.textStrong}`}>{m.appellation_libelle}</p>
                        <p className={`text-xs ${tw.textMuted700}`}>{m.metier_libelle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {errors.titre && <p className={`text-xs mt-1 ${tw.textErrorMuted}`}>{errors.titre}</p>}

            {formData.metier ? (
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tw.badgeAccent || "bg-teal-50 text-teal-700"}`}>
                  Métier de référence : {formData.metier_libelle}
                </span>
                <button
                  type="button"
                  className={`text-xs underline ${tw.textMuted700}`}
                  onClick={() => setFormData((p) => ({ ...p, metier: "", metier_libelle: "" }))}
                >
                  Modifier
                </button>
              </div>
            ) : (
              <div id="field-metier" className="mt-2">
                <p className={`text-xs mb-1 ${tw.textWarning || "text-amber-700"}`}>
                  Rattachez ce poste à un métier de référence — obligatoire pour le matching (25% du score).
                </p>
                <MetierAutocomplete
                  proposable
                  value=""
                  onSelect={(item) => {
                    setFormData((p) => ({ ...p, metier: item.metier_id, metier_libelle: item.metier_libelle }));
                    if (errors.metier) setErrors((p) => ({ ...p, metier: "" }));
                  }}
                  placeholder="Rechercher le métier le plus proche du poste..."
                />
                {errors.metier && <p className={`text-xs mt-1 ${tw.textErrorMuted}`}>{errors.metier}</p>}
              </div>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Type de contrat">
            <Select
              name="type_contrat"
              options={constants.contrats}
              onChange={handleSelectChange}
              value={constants.contrats.find((c) => c.value === formData.type_contrat) || null}
              placeholder="Sélectionner..."
              styles={selectStylesTeal}
            />
          </Field>
          <Field label="Nombre de postes">
            <input
              type="number"
              min="1"
              name="nombre_postes"
              value={formData.nombre_postes}
              onChange={(e) => setFormData({ ...formData, nombre_postes: e.target.value ? parseInt(e.target.value, 10) : 1 })}
              className={inputClass}
            />
          </Field>
          <Field label="Salaire proposé">
            <input
              name="salaire_propose"
              value={formData.salaire_propose}
              onChange={handleChange}
              className={inputClass}
            />
          </Field>
        </div>
      </div>
    </Section>
  );
};

export default SectionInfosPoste;
