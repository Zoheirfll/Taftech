import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import { selectStyles } from "../theme";

const inputClass =
  "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

/**
 * Cascade Type de diplôme → Domaine → Filière (facultative) → Spécialité, référentiel v2
 * client (FORMULAIRE/REGLES_FORMATION F01-F03) — les couples diplôme+spécialité déjà
 * attestés (DIPLOME_SPECIALITE) sont mis en avant dans la liste des spécialités dès qu'un
 * type de diplôme est choisi, sans jamais bloquer les autres (couverture non exhaustive, F02).
 *
 * "Autre, préciser" (F02) — un bouton à chaque niveau bascule ce niveau en mode "Autre"
 * (le select est remplacé par un badge + un champ texte "Précisez"), et **cascade vers le
 * bas** : choisir "Autre" au Type de diplôme bascule automatiquement Domaine et Spécialité
 * en mode "Autre" aussi (si le type de diplôme n'est pas identifiable, le reste ne l'est pas
 * non plus) ; choisir "Autre" au Domaine bascule la Spécialité. Chaque niveau reste
 * indépendamment réversible ("↩ revenir à la liste").
 *  - Type de diplôme : en mode Autre, la vraie entrée référentiel "Autre diplôme à préciser"
 *    (code `D-AUTRE`) est utilisée comme FK — jamais de FK nulle sans raison, F02 : préférer
 *    un référentiel réel même générique à une absence de donnée.
 *  - Domaine : purement un filtre local, jamais persisté séparément — en mode Autre, débloque
 *    la liste complète des spécialités (plus de filtre par domaine), pas de texte à capturer.
 *  - Spécialité : `specialite_ref` est vidé en mode Autre (aucune FK hors référentiel) ; le
 *    texte tapé alimente le champ libre déjà existant du formulaire parent.
 *  - Limite connue acceptée : au chargement d'une formation déjà enregistrée, impossible de
 *    distinguer "jamais renseigné" de "Autre choisi puis quitté" — le composant réaffiche la
 *    liste normale par défaut.
 *
 * Props :
 *  - diplomeId / specialiteId : valeurs actuelles (id numérique ou "")
 *  - onChangeDiplome(id, label) / onChangeSpecialite(id, label) — `label` (libellé propre,
 *    sans le ★) n'est fourni que lors d'un vrai choix dans le référentiel (jamais en mode
 *    Autre, ni au clear) : permet au parent de recopier automatiquement l'intitulé choisi
 *    dans son propre champ texte, pour ne jamais avoir un intitulé vide sur un choix réel.
 *  - autreTexte / onChangeAutreTexte(texte) : texte libre affiché/modifié quand "Autre,
 *    préciser" est actif pour la Spécialité — le parent le relie en général au champ
 *    description déjà présent dans son formulaire ("Spécialité / Domaine").
 *  - diplomeAutreTexte / onChangeDiplomeAutreTexte(texte) : idem pour le Type de diplôme —
 *    le parent le relie en général à son champ "intitulé" principal.
 *  - required
 *  - permettreAutre (défaut true) : mettre à `false` quand le contexte appelant a besoin
 *    d'une vraie FK spécialité (ex: couple diplôme+spécialité accepté sur une offre,
 *    `OffreDiplomeAccepte`) — un "Autre, préciser" texte libre n'y a pas de sens.
 */
export const FormationReferentielSelect = ({
  diplomeId,
  specialiteId,
  onChangeDiplome,
  onChangeSpecialite,
  autreTexte = "",
  onChangeAutreTexte,
  diplomeAutreTexte = "",
  onChangeDiplomeAutreTexte,
  onConfirmerSuggestion,
  required = false,
  permettreAutre = true,
}) => {
  const [nomenclature, setNomenclature] = useState(null);
  const [domaineId, setDomaineId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [diplomeAutre, setDiplomeAutre] = useState(false);
  const [domaineAutre, setDomaineAutre] = useState(false);
  const [specialiteAutre, setSpecialiteAutre] = useState(false);
  // Flux "Autre, préciser" (retour client 26/09/2026) : une suggestion référentiel est
  // proposée pour confirmation dès que le candidat tape son intitulé — jamais enregistrée
  // automatiquement (l'IA ne doit jamais inventer une équivalence sans validation humaine).
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionIgnoree, setSuggestionIgnoree] = useState(false);
  const [suggestionChargement, setSuggestionChargement] = useState(false);
  // Même mécanisme, dédié au champ Spécialité tapé indépendamment (Type de diplôme déjà
  // connu/confirmé) — restreint aux couples DiplomeSpecialite de ce diplôme précis
  // ("informatique" seul ne permet jamais de deviner BTS/Licence/Master, consigne client).
  const [suggestionSpec, setSuggestionSpec] = useState(null);
  const [suggestionSpecIgnoree, setSuggestionSpecIgnoree] = useState(false);
  const [suggestionSpecChargement, setSuggestionSpecChargement] = useState(false);

  useEffect(() => {
    jobsService
      .getNomenclatureFormation()
      .then(setNomenclature)
      .catch((err) => reportError("ECHEC_CHARGEMENT_NOMENCLATURE_FORMATION", err));
  }, []);

  // Suggestion référentiel pour l'intitulé libre tapé en mode "Autre" (Type de diplôme) —
  // debounce 600ms, jamais tant que le candidat n'a pas ignoré une précédente suggestion
  // sur le même texte (évite de la faire réapparaître en boucle après un "Non, garder mon
  // texte tel quel").
  useEffect(() => {
    setSuggestion(null);
    setSuggestionIgnoree(false);
    setSuggestionChargement(false);
    if (!diplomeAutre || !diplomeAutreTexte || diplomeAutreTexte.trim().length < 3) return;
    setSuggestionChargement(true);
    const t = setTimeout(() => {
      jobsService
        .suggererDiplome(diplomeAutreTexte)
        .then((res) => {
          if (res?.trouve) setSuggestion(res);
        })
        .catch((err) => reportError("ECHEC_SUGGESTION_DIPLOME", err))
        .finally(() => setSuggestionChargement(false));
    }, 600);
    return () => clearTimeout(t);
  }, [diplomeAutreTexte, diplomeAutre]);

  const confirmerSuggestion = () => {
    if (!suggestion) return;
    // Passe par `onConfirmerSuggestion` (jamais `onChangeDiplome`/`onChangeSpecialite`) : ces
    // deux derniers recopient le libellé choisi dans le texte libre du parent lors d'un vrai
    // choix référentiel — ici on veut l'inverse, conserver le texte original du candidat
    // (F02/consigne client) tout en posant la correspondance référentiel confirmée.
    if (onConfirmerSuggestion) {
      onConfirmerSuggestion(
        suggestion.diplome_ref, suggestion.diplome_ref_libelle,
        suggestion.specialite_ref, suggestion.specialite_ref_libelle,
      );
    }
    setDiplomeAutre(false);
    setDomaineAutre(false);
    setSpecialiteAutre(false);
    setSuggestion(null);
  };

  // Suggestion dédiée au champ Spécialité — seulement quand un vrai Type de diplôme est
  // déjà connu (diplomeId, pas en mode Autre) : "informatique" seul ne suffit jamais à
  // deviner BTS/Licence/Master, la spécialité doit être cherchée DANS ce diplôme précis.
  useEffect(() => {
    setSuggestionSpec(null);
    setSuggestionSpecIgnoree(false);
    setSuggestionSpecChargement(false);
    if (diplomeAutre || !diplomeId || !specialiteAutre || !autreTexte || autreTexte.trim().length < 3) return;
    setSuggestionSpecChargement(true);
    const t = setTimeout(() => {
      jobsService
        .suggererDiplome(autreTexte, diplomeId)
        .then((res) => {
          if (res?.trouve) setSuggestionSpec(res);
        })
        .catch((err) => reportError("ECHEC_SUGGESTION_SPECIALITE", err))
        .finally(() => setSuggestionSpecChargement(false));
    }, 600);
    return () => clearTimeout(t);
  }, [autreTexte, specialiteAutre, diplomeAutre, diplomeId]);

  const confirmerSuggestionSpec = () => {
    if (!suggestionSpec) return;
    if (onConfirmerSuggestion) {
      onConfirmerSuggestion(null, null, suggestionSpec.specialite_ref, suggestionSpec.specialite_ref_libelle);
    }
    setDomaineAutre(false);
    setSpecialiteAutre(false);
    setSuggestionSpec(null);
  };

  const ignorerSuggestionSpec = () => {
    setSuggestionSpec(null);
    setSuggestionSpecIgnoree(true);
  };

  const ignorerSuggestion = () => {
    setSuggestion(null);
    setSuggestionIgnoree(true);
  };

  // Si une spécialité est déjà connue (édition), en déduire domaine/filière parents.
  useEffect(() => {
    if (!nomenclature || !specialiteId || domaineId) return;
    const spec = nomenclature.specialites.find((s) => String(s.id) === String(specialiteId));
    if (spec) {
      setDomaineId(String(spec.domaine_id));
      if (spec.filiere_id) setFiliereId(String(spec.filiere_id));
    }
  }, [nomenclature, specialiteId, domaineId]);

  const diplomeAutreRef = useMemo(
    () => nomenclature?.types_diplomes.find((d) => d.code === "D-AUTRE") || null,
    [nomenclature],
  );

  const typesDiplomesOptions = useMemo(
    () =>
      nomenclature
        ? nomenclature.types_diplomes.filter((d) => d.code !== "D-AUTRE").map((d) => ({ value: d.id, label: d.libelle }))
        : [],
    [nomenclature],
  );

  const domaineOptions = useMemo(
    () => (nomenclature ? nomenclature.domaines.map((d) => ({ value: d.id, label: d.libelle })) : []),
    [nomenclature],
  );

  const filiereOptions = useMemo(() => {
    if (!nomenclature || !domaineId || domaineAutre) return [];
    return nomenclature.filieres
      .filter((f) => String(f.domaine_id) === String(domaineId))
      .map((f) => ({ value: f.id, label: f.libelle }));
  }, [nomenclature, domaineId, domaineAutre]);

  const couplesAttestesIds = useMemo(() => {
    if (!nomenclature || !diplomeId) return new Set();
    return new Set(
      nomenclature.diplome_specialite
        .filter((c) => String(c.diplome_id) === String(diplomeId))
        .map((c) => String(c.specialite_id)),
    );
  }, [nomenclature, diplomeId]);

  const specialiteOptions = useMemo(() => {
    if (!nomenclature) return [];
    if (!domaineAutre && !domaineId) return [];
    const specialitesSansAutre = nomenclature.specialites.filter((s) => s.code !== "SP-AUTRE");
    let liste = domaineAutre
      ? specialitesSansAutre
      : specialitesSansAutre.filter((s) => String(s.domaine_id) === String(domaineId));
    if (!domaineAutre && filiereId) liste = liste.filter((s) => String(s.filiere_id) === String(filiereId));
    // Couples attestés avec le diplôme choisi en premier (F02 : mis en avant, jamais exclusif).
    liste = [...liste].sort((a, b) => {
      const aAttestee = couplesAttestesIds.has(String(a.id)) ? 0 : 1;
      const bAttestee = couplesAttestesIds.has(String(b.id)) ? 0 : 1;
      return aAttestee - bAttestee || a.libelle.localeCompare(b.libelle);
    });
    return liste.map((s) => ({
      value: s.id,
      label: couplesAttestesIds.has(String(s.id)) ? `${s.libelle} ★` : s.libelle,
      rawLabel: s.libelle,
    }));
  }, [nomenclature, domaineId, domaineAutre, filiereId, couplesAttestesIds]);

  const activerDomaineAutre = () => {
    setDomaineAutre(true);
    setDomaineId("");
    setFiliereId("");
    onChangeSpecialite("");
    if (onChangeAutreTexte) onChangeAutreTexte("");
  };

  const activerSpecialiteAutre = () => {
    setSpecialiteAutre(true);
    onChangeSpecialite("");
    if (onChangeAutreTexte) onChangeAutreTexte("");
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-slate-700">
            Type de diplôme {required && <span className="text-red-500">*</span>}
          </label>
          {permettreAutre && !diplomeAutre && (
            <button
              type="button"
              onClick={() => {
                setDiplomeAutre(true);
                onChangeDiplome(diplomeAutreRef ? diplomeAutreRef.id : "");
                if (onChangeDiplomeAutreTexte) onChangeDiplomeAutreTexte("");
                // Cascade : type inconnu => domaine et spécialité ne le sont pas plus.
                activerDomaineAutre();
                activerSpecialiteAutre();
              }}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Autre, préciser
            </button>
          )}
        </div>
        {diplomeAutre ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
              <span className="text-slate-700">Autre (type de diplôme hors référentiel)</span>
              <button
                type="button"
                onClick={() => {
                  setDiplomeAutre(false);
                  onChangeDiplome("");
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
              >
                ↩ revenir à la liste
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={diplomeAutreTexte}
              onChange={(e) => onChangeDiplomeAutreTexte && onChangeDiplomeAutreTexte(e.target.value)}
              placeholder="Précisez le diplôme..."
              className={inputClass}
            />
            {suggestion && !suggestionIgnoree && (
              <div className="flex flex-col gap-2 px-4 py-3 bg-teal-50 border border-teal-200 rounded-lg text-sm">
                <p className="text-teal-800">
                  Nous pensons que vous voulez dire :{" "}
                  <strong>{suggestion.diplome_ref_libelle}</strong>
                  {suggestion.specialite_ref_libelle && <> — <strong>{suggestion.specialite_ref_libelle}</strong></>}
                </p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={confirmerSuggestion} className="text-xs font-semibold text-teal-700 hover:underline">
                    ✓ Confirmer
                  </button>
                  <button type="button" onClick={ignorerSuggestion} className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline">
                    Non, garder mon texte tel quel
                  </button>
                </div>
              </div>
            )}
            {!suggestion && !suggestionChargement && diplomeAutreTexte.trim().length >= 3 && (
              <p className="text-xs text-slate-500">
                Aucune correspondance sûre trouvée — votre diplôme sera enregistré tel quel et
                marqué "à vérifier" (il ne sera jamais compté comme incompatible entre-temps).
              </p>
            )}
          </div>
        ) : (
          <Select
            options={typesDiplomesOptions}
            value={typesDiplomesOptions.find((o) => String(o.value) === String(diplomeId)) || null}
            onChange={(opt) => (opt ? onChangeDiplome(opt.value, opt.label) : onChangeDiplome(""))}
            styles={selectStyles}
            placeholder="Sélectionner un type de diplôme..."
            isClearable
          />
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-slate-700">Domaine de formation</label>
          {permettreAutre && !domaineAutre && (
            <button type="button" onClick={activerDomaineAutre} className="text-xs font-medium text-indigo-600 hover:underline">
              Autre, préciser
            </button>
          )}
        </div>
        {domaineAutre ? (
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
            <span className="text-slate-700">Autre (domaine hors référentiel)</span>
            <button
              type="button"
              onClick={() => {
                setDomaineAutre(false);
                onChangeSpecialite("");
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
            >
              ↩ revenir à la liste
            </button>
          </div>
        ) : (
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
        )}
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
      {(domaineAutre || domaineId) && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Spécialité <span className="text-xs text-slate-500">(★ = couple attesté avec le diplôme choisi)</span>
            </label>
            {permettreAutre && !specialiteAutre && (
              <button type="button" onClick={activerSpecialiteAutre} className="text-xs font-medium text-indigo-600 hover:underline">
                Autre, préciser
              </button>
            )}
          </div>
          {specialiteAutre ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <span className="text-slate-700">Autre (spécialité hors référentiel)</span>
                <button
                  type="button"
                  onClick={() => setSpecialiteAutre(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
                >
                  ↩ revenir à la liste
                </button>
              </div>
              <input
                type="text"
                autoFocus
                value={autreTexte}
                onChange={(e) => onChangeAutreTexte && onChangeAutreTexte(e.target.value)}
                placeholder="Précisez la spécialité..."
                className={inputClass}
              />
              {diplomeAutre ? (
                <p className="text-xs text-slate-500">
                  Le type de diplôme n'est pas encore reconnu — la spécialité ne peut pas être
                  suggérée automatiquement tant qu'il n'est pas résolu. Votre saisie sera
                  conservée telle quelle et vérifiée manuellement.
                </p>
              ) : suggestionSpec && !suggestionSpecIgnoree ? (
                <div className="flex flex-col gap-2 px-4 py-3 bg-teal-50 border border-teal-200 rounded-lg text-sm">
                  <p className="text-teal-800">
                    Nous pensons que vous voulez dire : <strong>{suggestionSpec.specialite_ref_libelle}</strong>
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={confirmerSuggestionSpec} className="text-xs font-semibold text-teal-700 hover:underline">
                      ✓ Confirmer
                    </button>
                    <button type="button" onClick={ignorerSuggestionSpec} className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline">
                      Non, garder mon texte tel quel
                    </button>
                  </div>
                </div>
              ) : (
                !suggestionSpecChargement && autreTexte.trim().length >= 3 && (
                  <p className="text-xs text-slate-500">
                    Aucune correspondance sûre trouvée pour ce diplôme précis — votre spécialité
                    sera enregistrée telle quelle, sans jamais être comptée comme incompatible.
                  </p>
                )
              )}
            </div>
          ) : (
            <Select
              options={specialiteOptions}
              value={specialiteOptions.find((o) => String(o.value) === String(specialiteId)) || null}
              onChange={(opt) => (opt ? onChangeSpecialite(opt.value, opt.rawLabel) : onChangeSpecialite(""))}
              styles={selectStyles}
              placeholder="Sélectionner une spécialité..."
              isClearable
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FormationReferentielSelect;
