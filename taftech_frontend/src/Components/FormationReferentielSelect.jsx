import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import { selectStyles } from "../theme";
import { grouperParFamille, aplatirGroupes, familleDuDiplome, typesPourNiveau, typeAutoriseParNiveau, niveauPourType } from "../utils/familleFormation";

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
  // Étape 1 de la cascade : niveau d'études (Scolarite) -> type de diplôme -> domaine -> filière
  // -> spécialité. Simple filtre d'aide à la saisie (non enregistré à part : il se déduit du type).
  const [niveauId, setNiveauId] = useState("");
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
  // Recherche directe d'une spécialité : libellés des diplômes possibles quand il y en a plusieurs
  // (le candidat choisit alors le sien) — vide quand le diplôme est déduit ou indéterminable.
  const [diplomesPossibles, setDiplomesPossibles] = useState([]);

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

  // Édition d'une formation existante : le niveau d'études se déduit du type de diplôme choisi.
  // Une seule fois : ensuite l'utilisateur garde la main (il peut effacer le niveau).
  const niveauDeduit = useRef(false);
  useEffect(() => {
    if (niveauDeduit.current || !nomenclature || !diplomeId) return;
    niveauDeduit.current = true;
    const niveau = niveauPourType(nomenclature.niveaux_etudes, nomenclature.types_diplomes, diplomeId);
    if (niveau) setNiveauId(String(niveau.id));
    // Formation déjà enregistrée comme « Autre diplôme » : on rouvre en mode « Autre », donc
    // avec le champ libre (jamais affiché tant que l'utilisateur n'a pas réellement choisi Autre).
    const typeAutre = nomenclature.types_diplomes.find((t) => t.code === "D-AUTRE");
    if (permettreAutre && typeAutre && String(typeAutre.id) === String(diplomeId)) {
      setDiplomeAutre(true);
      setDomaineAutre(true);
      setSpecialiteAutre(true);
    } else if (permettreAutre && !specialiteId && autreTexte.trim()) {
      // Vrai diplôme dont la spécialité a été saisie en « Autre » : on rouvre le champ avec ce texte
      // (sinon le formulaire d'édition l'affiche vide, comme si rien n'avait été renseigné).
      setDomaineAutre(true);
      setSpecialiteAutre(true);
    }
  }, [nomenclature, diplomeId, permettreAutre, specialiteId, autreTexte]);

  const niveauChoisi = useMemo(
    () => nomenclature?.niveaux_etudes?.find((n) => String(n.id) === String(niveauId)) || null,
    [nomenclature, niveauId],
  );
  const niveauOptions = useMemo(
    () => (nomenclature?.niveaux_etudes || []).map((n) => ({ value: n.id, label: n.libelle })),
    [nomenclature],
  );

  const diplomeAutreRef = useMemo(
    () => nomenclature?.types_diplomes.find((d) => d.code === "D-AUTRE") || null,
    [nomenclature],
  );

  // Point 8 : types de diplôme et domaines sont présentés par famille (enseignement supérieur /
  // formation professionnelle / thèmes TafTech), jamais mélangés dans une même liste.
  const typesDiplomesGroupes = useMemo(
    () =>
      nomenclature
        ? grouperParFamille(
            typesPourNiveau(nomenclature.types_diplomes.filter((d) => d.code !== "D-AUTRE"), niveauChoisi),
            nomenclature.familles,
            (d) => ({ value: d.id, label: d.libelle }),
          )
        : [],
    [nomenclature, niveauChoisi],
  );
  const typesDiplomesOptions = useMemo(() => aplatirGroupes(typesDiplomesGroupes), [typesDiplomesGroupes]);

  // Une fois le type de diplôme choisi, seuls les domaines de la même famille sont proposés
  // (un BTS ne se classe pas dans « Droit et sciences politiques », une Licence pas dans
  // « Bâtiment et travaux publics »). Le domaine déjà sélectionné reste toujours visible.
  const familleDiplome = useMemo(
    () => (nomenclature && !diplomeAutre ? familleDuDiplome(nomenclature.types_diplomes, diplomeId) : ""),
    [nomenclature, diplomeId, diplomeAutre],
  );
  const domaineGroupes = useMemo(() => {
    if (!nomenclature) return [];
    const domaines = nomenclature.domaines.filter(
      (d) => !familleDiplome || d.famille === familleDiplome || String(d.id) === String(domaineId),
    );
    return grouperParFamille(domaines, nomenclature.familles, (d) => ({ value: d.id, label: d.libelle }));
  }, [nomenclature, familleDiplome, domaineId]);
  const domaineOptions = useMemo(() => aplatirGroupes(domaineGroupes), [domaineGroupes]);

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

  // Le texte « Autre spécialité » correspond déjà à une entrée du référentiel (même libellé, sans accent
  // ni casse) : le serveur n'en fera pas une demande, on invite donc à la choisir dans la liste.
  const specialiteExistante = useMemo(() => {
    const cle = (texte) => (texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const saisie = cle(autreTexte);
    if (saisie.length < 3 || !nomenclature) return null;
    return nomenclature.specialites.find((s) => cle(s.libelle) === saisie) || null;
  }, [autreTexte, nomenclature]);

  // Recherche directe d'une spécialité (retour client 17/10/2026) : « Chimie » n'est pas rangée dans le
  // même domaine par toutes les universités, donc la retrouver en partant du domaine échoue. On
  // cherche dans TOUTES les spécialités (domaine affiché à côté) et le reste suit quand c'est possible.
  const specialiteDirecteOptions = useMemo(() => {
    if (!nomenclature) return [];
    const libelleDomaine = new Map(nomenclature.domaines.map((d) => [d.id, d.libelle]));
    return nomenclature.specialites
      .filter((s) => s.code !== "SP-AUTRE")
      .map((s) => ({
        value: s.id,
        label: `${s.libelle} — ${libelleDomaine.get(s.domaine_id) || ""}`.replace(/ — $/, ""),
        specialite: s,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [nomenclature]);

  const choisirSpecialiteDirecte = (opt) => {
    if (!opt) return;
    const spec = opt.specialite;
    setDomaineAutre(false);
    setSpecialiteAutre(false);
    setDomaineId(String(spec.domaine_id));
    setFiliereId(spec.filiere_id ? String(spec.filiere_id) : "");
    if (onChangeAutreTexte) onChangeAutreTexte("");
    onChangeSpecialite(spec.id, spec.libelle);

    // Diplômes attestés pour cette spécialité : un seul => choisi ; plusieurs => le candidat choisit ;
    // aucun => le diplôme reste libre. Un diplôme déjà choisi et compatible est conservé.
    const idsAttestes = [
      ...new Set(
        nomenclature.diplome_specialite
          .filter((c) => String(c.specialite_id) === String(spec.id))
          .map((c) => String(c.diplome_id)),
      ),
    ];
    const types = idsAttestes
      .map((id) => nomenclature.types_diplomes.find((t) => String(t.id) === id))
      .filter(Boolean);
    const diplomeActuel = diplomeAutre ? "" : String(diplomeId || "");
    const dejaCompatible = diplomeActuel && (types.length === 0 || idsAttestes.includes(diplomeActuel));
    let diplomeFinal = diplomeActuel;
    if (diplomeAutre) setDiplomeAutre(false);
    if (!dejaCompatible) {
      if (types.length === 1) {
        diplomeFinal = String(types[0].id);
        onChangeDiplome(types[0].id, types[0].libelle);
      } else {
        diplomeFinal = "";
        if (diplomeId || diplomeAutre) onChangeDiplome("");
      }
    }
    setDiplomesPossibles(types.length > 1 && !dejaCompatible ? types.map((t) => t.libelle) : []);
    // Le niveau d'études se déduit du diplôme (sinon il reste tel quel).
    if (diplomeFinal) {
      const niveau = niveauPourType(nomenclature.niveaux_etudes, nomenclature.types_diplomes, diplomeFinal);
      if (niveau) setNiveauId(String(niveau.id));
    }
  };

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
      {specialiteDirecteOptions.length > 0 && (
        <div>
          <label htmlFor="specialite-directe" className="block text-sm font-medium text-slate-700 mb-1.5">
            Rechercher directement votre spécialité
          </label>
          <Select
            inputId="specialite-directe"
            aria-label="Rechercher directement votre spécialité"
            options={specialiteDirecteOptions}
            value={null}
            onChange={choisirSpecialiteDirecte}
            styles={selectStyles}
            placeholder="Ex. Chimie, Informatique, Droit des affaires..."
            noOptionsMessage={() => "Aucune spécialité trouvée"}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Vous connaissez votre spécialité ? Cherchez-la ici, tous domaines confondus : le domaine, la
            filière et le diplôme se remplissent tout seuls quand c'est possible.
          </p>
          {diplomesPossibles.length > 0 && (
            <p className="mt-1.5 text-xs text-amber-700">
              Cette spécialité existe pour plusieurs diplômes ({diplomesPossibles.join(", ")}) : choisissez le
              vôtre ci-dessous.
            </p>
          )}
        </div>
      )}
      {niveauOptions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Niveau d'études</label>
          <Select
            options={niveauOptions}
            value={niveauOptions.find((o) => String(o.value) === String(niveauId)) || null}
            onChange={(opt) => {
              const niveau = opt ? nomenclature.niveaux_etudes.find((n) => n.id === opt.value) : null;
              setNiveauId(opt ? String(opt.value) : "");
              // Un diplôme qui n'appartient plus au niveau choisi est retiré, avec ce qui en dépend.
              const typeActuel = nomenclature.types_diplomes.find((t) => String(t.id) === String(diplomeId));
              if (niveau && typeActuel && !diplomeAutre && !typeAutoriseParNiveau(niveau, typeActuel)) {
                onChangeDiplome("");
                setDomaineId("");
                setFiliereId("");
                onChangeSpecialite("");
              }
            }}
            styles={selectStyles}
            placeholder="Tous niveaux..."
            isClearable
          />
          {niveauChoisi && niveauChoisi.familles.length === 0 && (
            <p className="mt-1.5 text-xs text-slate-500">
              Aucun diplôme à renseigner pour ce niveau. {niveauChoisi.usage}
            </p>
          )}
        </div>
      )}
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
              <span className="text-slate-700">Autre diplôme</span>
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
            {diplomeAutreTexte.trim().length > 0 && diplomeAutreTexte.trim().length < 3 && (
              <p className="text-xs text-amber-700">
                Au moins 3 caractères sont nécessaires pour que votre type de diplôme soit transmis à l'équipe ;
                écrivez-le en toutes lettres.
              </p>
            )}
            {!suggestion && !suggestionChargement && diplomeAutreTexte.trim().length >= 3 && (
              <p className="text-xs text-slate-500">
                Ce type de diplôme n'est pas dans la liste : il sera transmis à l'équipe pour validation.
                En attendant, il est enregistré tel quel et jamais compté comme incompatible.
              </p>
            )}
          </div>
        ) : (
          <Select
            options={typesDiplomesGroupes}
            value={typesDiplomesOptions.find((o) => String(o.value) === String(diplomeId)) || null}
            onChange={(opt) => {
              // Changer de famille (ex. Licence -> CAP) invalide le domaine déjà choisi.
              const nouvelleFamille = opt && nomenclature ? familleDuDiplome(nomenclature.types_diplomes, opt.value) : "";
              const domaineActuel = nomenclature?.domaines.find((d) => String(d.id) === String(domaineId));
              if (nouvelleFamille && domaineActuel && domaineActuel.famille !== nouvelleFamille) {
                setDomaineId("");
                setFiliereId("");
                onChangeSpecialite("");
              }
              setDiplomesPossibles([]);
              if (opt) onChangeDiplome(opt.value, opt.label);
              else onChangeDiplome("");
            }}
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
            <span className="text-slate-700">Autre domaine</span>
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
            options={domaineGroupes}
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
                <span className="text-slate-700">Autre spécialité</span>
                <button
                  type="button"
                  onClick={() => {
                    setSpecialiteAutre(false);
                    // Le texte « Autre spécialité » ne doit pas rester dans le formulaire (il créerait une demande d'ajout).
                    if (onChangeAutreTexte) onChangeAutreTexte("");
                  }}
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
                  suggérée automatiquement tant qu'il n'est pas résolu. Votre saisie est
                  enregistrée telle quelle, et l'équipe la validera avec votre type de diplôme.
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
              ) : autreTexte.trim().length > 0 && autreTexte.trim().length < 3 ? (
                <p className="text-xs text-amber-700">
                  Au moins 3 caractères sont nécessaires pour que votre spécialité soit transmise à l'équipe ;
                  écrivez-la en toutes lettres.
                </p>
              ) : specialiteExistante ? (
                <p className="text-xs text-amber-700">
                  « {specialiteExistante.libelle} » existe déjà dans la liste : cliquez sur « revenir à la liste »
                  puis choisissez-la dans le domaine concerné. Saisie ici, elle ne sera pas transmise à l'équipe.
                </p>
              ) : (
                !suggestionSpecChargement && autreTexte.trim().length >= 3 && (
                  <p className="text-xs text-slate-500">
                    Cette spécialité n'est pas dans la liste : elle sera transmise à l'équipe pour validation.
                    En attendant, elle est enregistrée telle quelle et jamais comptée comme incompatible.
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
