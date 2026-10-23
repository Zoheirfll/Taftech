// Section "Localisation" : wilaya (obligatoire) et commune (optionnelle).
import Select from "react-select";
import { MapPin } from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import { Section, Field } from "./formUi";
import LieuxSupplementaires from "./LieuxSupplementaires";

const SectionLocalisation = ({ job }) => {
  const { constants, formData, setFormData, errors, setErrors, getCommunesOptions, handleSelectChange } = job;
  return (
    <Section icon={MapPin} title="Localisation">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fix 3 : validation wilaya */}
        <div id="field-wilaya">
          <Field label="Wilaya" required>
            <Select
              name="wilaya"
              options={constants.wilayas}
              onChange={(opt) => { setFormData({ ...formData, wilaya: opt ? opt.value : "", commune: "" }); if (errors.wilaya) setErrors(p => ({ ...p, wilaya: "" })); }}
              value={constants.wilayas.find((w) => w.value === formData.wilaya) || null}
              placeholder="Sélectionner..."
              isClearable
              styles={{
                ...selectStylesTeal,
                control: (base, state) => ({
                  ...(selectStylesTeal.control ? selectStylesTeal.control(base, state) : base),
                  ...(errors.wilaya ? { borderColor: "#f87171", boxShadow: "0 0 0 2px #fee2e2" } : {}),
                }),
              }}
            />
            {errors.wilaya && <p className={`text-xs mt-1 ${tw.textErrorMuted}`}>{errors.wilaya}</p>}
          </Field>
        </div>
        <Field label="Commune (optionnel)">
          <Select
            name="commune"
            options={getCommunesOptions()}
            isDisabled={!formData.wilaya || getCommunesOptions().length === 0}
            value={getCommunesOptions().find((c) => c.value === formData.commune) || null}
            onChange={handleSelectChange}
            placeholder={formData.wilaya ? "Sélectionner..." : "Wilaya d'abord"}
            isClearable
            styles={selectStylesTeal}
          />
        </Field>
      </div>
      <LieuxSupplementaires
        wilayas={constants.wilayas}
        principal={{ wilaya: formData.wilaya, commune: formData.commune }}
        lieux={formData.lieux_supplementaires || []}
        onChange={(lieux) => setFormData({ ...formData, lieux_supplementaires: lieux })}
      />
    </Section>
  );
};

export default SectionLocalisation;
