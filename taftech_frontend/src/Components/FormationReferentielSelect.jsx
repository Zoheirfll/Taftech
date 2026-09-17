import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import { selectStyles } from "../theme";

/**
 * Cascade Type de diplôme → Domaine → Filière (facultative) → Spécialité, référentiel v2
 * client (FORMULAIRE/REGLES_FORMATION F01-F03) — les couples diplôme+spécialité déjà
 * attestés (DIPLOME_SPECIALITE) sont mis en avant dans la liste des spécialités dès qu'un
 * type de diplôme est choisi, sans jamais bloquer les autres (couverture non exhaustive,
 * F02 : "Autre, préciser" reste toujours possible via le champ texte libre existant du
 * formulaire — ce composant n'expose que la partie structurée diplome_ref/specialite_ref).
 *
 * Props :
 *  - diplomeId / specialiteId : valeurs actuelles (id numérique ou "")
 *  - onChangeDiplome(id) / onChangeSpecialite(id)
 *  - required
 */
export const FormationReferentielSelect = ({
  diplomeId,
  specialiteId,
  onChangeDiplome,
  onChangeSpecialite,
  required = false,
}) => {
  const [nomenclature, setNomenclature] = useState(null);
  const [domaineId, setDomaineId] = useState("");
  const [filiereId, setFiliereId] = useState("");

  useEffect(() => {
    jobsService
      .getNomenclatureFormation()
      .then(setNomenclature)
      .catch((err) => reportError("ECHEC_CHARGEMENT_NOMENCLATURE_FORMATION", err));
  }, []);

  // Si une spécialité est déjà connue (édition), en déduire domaine/filière parents.
  useEffect(() => {
    if (!nomenclature || !specialiteId || domaineId) return;
    const spec = nomenclature.specialites.find((s) => String(s.id) === String(specialiteId));
    if (spec) {
      setDomaineId(String(spec.domaine_id));
      if (spec.filiere_id) setFiliereId(String(spec.filiere_id));
    }
  }, [nomenclature, specialiteId, domaineId]);

  const typesDiplomesOptions = useMemo(
    () => (nomenclature ? nomenclature.types_diplomes.map((d) => ({ value: d.id, label: d.libelle })) : []),
    [nomenclature],
  );

  const domaineOptions = useMemo(
    () => (nomenclature ? nomenclature.domaines.map((d) => ({ value: d.id, label: d.libelle })) : []),
    [nomenclature],
  );

  const filiereOptions = useMemo(() => {
    if (!nomenclature || !domaineId) return [];
    return nomenclature.filieres
      .filter((f) => String(f.domaine_id) === String(domaineId))
      .map((f) => ({ value: f.id, label: f.libelle }));
  }, [nomenclature, domaineId]);

  const couplesAttestesIds = useMemo(() => {
    if (!nomenclature || !diplomeId) return new Set();
    return new Set(
      nomenclature.diplome_specialite
        .filter((c) => String(c.diplome_id) === String(diplomeId))
        .map((c) => String(c.specialite_id)),
    );
  }, [nomenclature, diplomeId]);

  const specialiteOptions = useMemo(() => {
    if (!nomenclature || !domaineId) return [];
    let liste = nomenclature.specialites.filter((s) => String(s.domaine_id) === String(domaineId));
    if (filiereId) liste = liste.filter((s) => String(s.filiere_id) === String(filiereId));
    // Couples attestés avec le diplôme choisi en premier (F02 : mis en avant, jamais exclusif).
    liste = [...liste].sort((a, b) => {
      const aAttestee = couplesAttestesIds.has(String(a.id)) ? 0 : 1;
      const bAttestee = couplesAttestesIds.has(String(b.id)) ? 0 : 1;
      return aAttestee - bAttestee || a.libelle.localeCompare(b.libelle);
    });
    return liste.map((s) => ({
      value: s.id,
      label: couplesAttestesIds.has(String(s.id)) ? `${s.libelle} ★` : s.libelle,
    }));
  }, [nomenclature, domaineId, filiereId, couplesAttestesIds]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Type de diplôme {required && <span className="text-red-500">*</span>}
        </label>
        <Select
          options={typesDiplomesOptions}
          value={typesDiplomesOptions.find((o) => String(o.value) === String(diplomeId)) || null}
          onChange={(opt) => onChangeDiplome(opt?.value || "")}
          styles={selectStyles}
          placeholder="Sélectionner un type de diplôme..."
          isClearable
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Domaine de formation</label>
        <Select
          options={domaineOptions}
          value={domaineOptions.find((o) => String(o.value) === String(domaineId)) || null}
          onChange={(opt) => {
            setDomaineId(opt?.value ? String(opt.value) : "");
            setFiliereId("");
            onChangeSpecialite("");
          }}
          styles={selectStyles}
          placeholder="Sélectionner un domaine..."
          isClearable
        />
      </div>
      {filiereOptions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Filière (si disponible)</label>
          <Select
            options={filiereOptions}
            value={filiereOptions.find((o) => String(o.value) === String(filiereId)) || null}
            onChange={(opt) => {
              setFiliereId(opt?.value ? String(opt.value) : "");
              onChangeSpecialite("");
            }}
            styles={selectStyles}
            placeholder="Sélectionner une filière..."
            isClearable
          />
        </div>
      )}
      {domaineId && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Spécialité <span className="text-xs text-slate-500">(★ = couple attesté avec le diplôme choisi)</span>
          </label>
          <Select
            options={specialiteOptions}
            value={specialiteOptions.find((o) => String(o.value) === String(specialiteId)) || null}
            onChange={(opt) => onChangeSpecialite(opt?.value || "")}
            styles={selectStyles}
            placeholder="Sélectionner une spécialité (ou laisser vide si absente)..."
            isClearable
          />
        </div>
      )}
    </div>
  );
};

export default FormationReferentielSelect;
