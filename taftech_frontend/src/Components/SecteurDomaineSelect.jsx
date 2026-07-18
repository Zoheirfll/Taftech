import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import { selectStyles } from "../theme";

/**
 * Sélecteur en cascade Secteur → Domaine → Sous-domaine (nomenclature ANEM).
 * La valeur exposée (`value`/`onChange`) est le code Domaine — c'est ce que
 * stockent OffreEmploi.specialite / ProfilCandidat.specialite / etc.
 * Le niveau Sous-domaine n'est affiché que si le domaine choisi en a.
 *
 * Props :
 *  - value: code Domaine actuel (ex: "L18") ou ""
 *  - onChange(domaineCode): appelé quand le domaine change
 *  - onSousDomaineChange(sousDomaineId): optionnel, si le consommateur veut
 *    affiner une recherche de métier avec le sous-domaine choisi
 *  - styles: styles react-select (défaut: selectStyles bleu candidat)
 *  - required
 */
export const SecteurDomaineSelect = ({
  value,
  onChange,
  onSousDomaineChange,
  styles = selectStyles,
  required = false,
}) => {
  const [nomenclature, setNomenclature] = useState(null);
  const [secteurCode, setSecteurCode] = useState("");
  const [sousDomaineId, setSousDomaineId] = useState("");

  useEffect(() => {
    jobsService
      .getNomenclature()
      .then(setNomenclature)
      .catch((err) => reportError("ECHEC_CHARGEMENT_NOMENCLATURE", err));
  }, []);

  // Si une valeur (code Domaine) est déjà fournie, en déduire le secteur parent
  useEffect(() => {
    if (!nomenclature || !value || secteurCode) return;
    const domaine = nomenclature.domaines.find((d) => d.code === value);
    if (domaine) setSecteurCode(domaine.secteur_code);
  }, [nomenclature, value, secteurCode]);

  const secteurOptions = useMemo(
    () => (nomenclature ? nomenclature.secteurs.map((s) => ({ value: s.code, label: s.libelle })) : []),
    [nomenclature],
  );

  const domaineOptions = useMemo(() => {
    if (!nomenclature || !secteurCode) return [];
    return nomenclature.domaines
      .filter((d) => d.secteur_code === secteurCode)
      .map((d) => ({ value: d.code, label: d.libelle }));
  }, [nomenclature, secteurCode]);

  const sousDomainesDuDomaine = useMemo(() => {
    if (!nomenclature || !value) return [];
    return nomenclature.sous_domaines.filter((sd) => sd.domaine_code === value);
  }, [nomenclature, value]);

  const secteurSelectionne = secteurOptions.find((o) => o.value === secteurCode) || null;
  const domaineSelectionne = domaineOptions.find((o) => o.value === value) || null;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Secteur {required && <span className="text-red-500">*</span>}
        </label>
        <Select
          options={secteurOptions}
          value={secteurSelectionne}
          onChange={(opt) => {
            setSecteurCode(opt?.value || "");
            setSousDomaineId("");
            onChange("");
            onSousDomaineChange?.("");
          }}
          placeholder="Sélectionnez..."
          isClearable
          styles={styles}
        />
      </div>

      {secteurCode && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Domaine {required && <span className="text-red-500">*</span>}
          </label>
          <Select
            options={domaineOptions}
            value={domaineSelectionne}
            onChange={(opt) => {
              onChange(opt?.value || "");
              setSousDomaineId("");
              onSousDomaineChange?.("");
            }}
            placeholder="Sélectionnez..."
            isClearable
            styles={styles}
          />
        </div>
      )}

      {value && sousDomainesDuDomaine.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Sous-domaine
          </label>
          <Select
            options={sousDomainesDuDomaine.map((sd) => ({ value: String(sd.id), label: sd.libelle }))}
            value={
              sousDomaineId
                ? { value: sousDomaineId, label: sousDomainesDuDomaine.find((sd) => String(sd.id) === sousDomaineId)?.libelle }
                : null
            }
            onChange={(opt) => {
              const id = opt?.value || "";
              setSousDomaineId(id);
              onSousDomaineChange?.(id);
            }}
            placeholder="Sélectionnez... (optionnel)"
            isClearable
            styles={styles}
          />
        </div>
      )}
    </div>
  );
};

export default SecteurDomaineSelect;
