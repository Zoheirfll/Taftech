// Fenêtre unique de décision d'une demande d'ajout au référentiel : Rattacher, Accepter ou Refuser.
// Identique pour les types de diplôme et les spécialités (puis les métiers et les compétences).
import React, { useCallback, useEffect, useState } from "react";
import Select from "react-select";
import { notifier } from "../../../utils/notifier";
import { X } from "lucide-react";
import { adminService } from "../../../Services/adminService";
import { apiErrMsg } from "../../../utils/apiErrMsg";
import { selectStylesTeal, tw } from "../../../theme";
import useEchapPourFermer from "../../../utils/useEchapPourFermer";
import { useSubmitLock } from "../../../utils/useSubmitLock";
import { MOTIFS_RAPIDES, MOTIF_MAX, MOTIF_MIN, TYPES_DEMANDE } from "./demandesAjoutUi";

const MODES = [
  { code: "RATTACHER", transition: "RATTACHEE", libelle: "Rattacher" },
  { code: "ACCEPTER", transition: "ACCEPTEE", libelle: "Accepter" },
  { code: "REFUSER", transition: "REFUSEE", libelle: "Refuser" },
];
const DELAI_RECHERCHE_MS = 350;

const DecisionDemandeModal = ({ demande, modeInitial = "RATTACHER", onClose, onDecidee }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const modesPossibles = MODES.filter((m) => demande.transitions_possibles?.includes(m.transition));
  const [mode, setMode] = useState(modesPossibles.some((m) => m.code === modeInitial) ? modeInitial : modesPossibles[0]?.code);
  const [erreur, setErreur] = useState("");

  // Rattacher
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState([]);
  const [entree, setEntree] = useState(null);
  // Accepter
  const [libelle, setLibelle] = useState(demande.libelle);
  const [parents, setParents] = useState(null);
  const [parent, setParent] = useState(null);
  const [filiere, setFiliere] = useState(null);
  const [diplomes, setDiplomes] = useState([]);
  // Refuser
  const [motif, setMotif] = useState("");

  const vocabulaire = TYPES_DEMANDE[demande.type] || TYPES_DEMANDE.DIPLOME;
  const fermer = useCallback(() => onClose?.(), [onClose]);
  useEchapPourFermer(true, fermer);

  useEffect(() => {
    if (mode !== "ACCEPTER" || parents || demande.type === "COMPETENCE") return;
    adminService.getDemandesParents(demande.type).then(setParents).catch(() => setErreur("Impossible de charger les choix."));
  }, [mode, parents, demande.type]);

  useEffect(() => {
    if (mode !== "RATTACHER" || recherche.trim().length < 2) {
      setResultats([]);
      return undefined;
    }
    const minuteur = setTimeout(() => {
      adminService.getDemandeProches(demande.id, recherche.trim()).then((r) => setResultats(r.proches || [])).catch(() => setResultats([]));
    }, DELAI_RECHERCHE_MS);
    return () => clearTimeout(minuteur);
  }, [mode, recherche, demande.id]);

  const choisirMode = (code) => {
    setMode(code);
    setErreur("");
  };

  const estSpecialite = demande.type === "SPECIALITE";
  const optionsParentParType = {
    SPECIALITE: () => (parents?.domaines || []).map((d) => ({ value: d.id, label: d.famille ? `${d.libelle} (${d.famille})` : d.libelle, filieres: d.filieres })),
    METIER: () => (parents?.groupes || []).map((g) => ({ value: g.id, label: g.parent_libelle ? `${g.parent_libelle} › ${g.libelle}` : g.libelle })),
    DIPLOME: () => (parents?.systemes || []).map((s) => ({ value: s.valeur, label: s.famille ? `${s.libelle} (${s.famille})` : s.libelle })),
  };
  const optionsParent = (optionsParentParType[demande.type] || optionsParentParType.DIPLOME)();
  const optionsFiliere = (parent?.filieres || []).map((f) => ({ value: f.id, label: f.libelle }));
  const optionsDiplomes = (parents?.diplomes || []).map((d) => ({ value: d.id, label: d.libelle }));

  const pret = {
    RATTACHER: !!entree,
    ACCEPTER: libelle.trim().length >= 3 && (demande.type === "COMPETENCE" || !!parent),
    REFUSER: motif.trim().length >= MOTIF_MIN,
  }[mode];

  const decider = async () => {
    setErreur("");
    try {
      let resultat;
      if (mode === "RATTACHER") {
        resultat = await adminService.rattacherDemande(demande.id, entree.id);
        notifier.succes("Demande rattachée", `« ${demande.libelle} » rattachée à « ${entree.libelle} ».`);
      } else if (mode === "ACCEPTER") {
        resultat = await adminService.accepterDemande(demande.id, {
          libelle: libelle.trim(),
          parent: parent?.value ?? null,
          filiere_id: filiere?.value || null,
          diplomes_ids: diplomes.map((d) => d.value),
        });
        notifier.succes("Demande acceptée", `« ${libelle.trim()} » ajoutée au référentiel.`);
      } else {
        resultat = await adminService.refuserDemande(demande.id, motif.trim());
        notifier.succes("Demande refusée");
      }
      onDecidee?.(resultat);
      fermer();
    } catch (err) {
      setErreur(apiErrMsg(err, "Décision impossible."));
    }
  };

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;
  const libelleBouton = { RATTACHER: "Rattacher", ACCEPTER: "Ajouter au référentiel", REFUSER: "Refuser" }[mode];

  return (
    <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermer()}>
      <div role="dialog" aria-modal="true" aria-label="Décision sur la demande" className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-base font-bold ${tw.textStrong}`}>« {demande.libelle} »</h3>
          <button type="button" onClick={fermer} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg ${tw.focusRing}`}><X size={18} /></button>
        </div>
        {demande.contexte && <p className={`text-xs ${tw.textMuted} mb-3`}>{demande.contexte}</p>}

        <div className="flex gap-1 mb-4" role="tablist" aria-label="Décision">
          {modesPossibles.map((m) => (
            <button
              key={m.code}
              type="button"
              role="tab"
              aria-selected={mode === m.code}
              onClick={() => choisirMode(m.code)}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${tw.focusRing} ${mode === m.code ? `${tw.bgPrimarySolidHover} text-white` : `${tw.surfaceSubtle} ${tw.textMuted} ${tw.hoverSurfaceSubtleStrong}`}`}
            >
              {m.libelle}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === "RATTACHER" && (
            <div className="space-y-2">
              <p className={`text-xs ${tw.textMuted}`}>
                Le libellé demandé devient une autre écriture d'un(e) {vocabulaire.cible} : il sera reconnu automatiquement.
              </p>
              {demande.proches?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-[11px] ${tw.textMuted}`}>Entrées proches :</span>
                  {demande.proches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setEntree({ id: p.id, libelle: p.libelle })}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${entree?.id === p.id ? `${tw.bgPrimarySolidHover} text-white` : `${tw.surfaceSubtle} ${tw.textMuted700} ${tw.hoverSurfaceSubtleStrong}`}`}
                    >
                      {p.libelle}
                    </button>
                  ))}
                </div>
              )}
              <label htmlFor="recherche-entree" className={`text-xs font-medium ${tw.textMuted} block`}>Chercher une autre entrée</label>
              <input id="recherche-entree" className={inputClass} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
              {resultats.length > 0 && (
                <ul className={`max-h-40 overflow-y-auto divide-y ${tw.divideBase} border ${tw.borderSubtle} rounded-lg`}>
                  {resultats.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setEntree({ id: r.id, libelle: r.libelle })} className={`w-full text-left px-3 py-2 text-sm ${tw.rowHover}`}>
                        <span className={tw.textStrong}>{r.libelle}</span>
                        {r.detail && <span className={`block text-[11px] ${tw.textMuted}`}>{r.detail}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {entree && <p className={`text-xs font-semibold ${tw.textStrong}`}>Rattacher à : {entree.libelle}</p>}
            </div>
          )}

          {mode === "ACCEPTER" && (
            <div className="space-y-3">
              <p className={`text-xs ${tw.textMuted}`}>Crée une nouvelle entrée officielle, proposée dans les listes de choix.</p>
              <div>
                <label htmlFor="libelle-accepte" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Libellé (corrigeable) *</label>
                <input id="libelle-accepte" maxLength={120} className={inputClass} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
              </div>
              {demande.type !== "COMPETENCE" && (
                <div>
                  <label htmlFor="parent-accepte" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>{vocabulaire.parentLabel} *</label>
                  <Select
                    inputId="parent-accepte"
                    options={optionsParent}
                    value={parent}
                    placeholder={parents ? "Choisir…" : "Chargement…"}
                    isClearable
                    onChange={(opt) => { setParent(opt); setFiliere(null); }}
                    styles={selectStylesTeal}
                  />
                </div>
              )}
              {estSpecialite && optionsFiliere.length > 0 && (
                <div>
                  <label htmlFor="filiere-acceptee" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Filière (facultatif)</label>
                  <Select inputId="filiere-acceptee" options={optionsFiliere} value={filiere} isClearable onChange={setFiliere} styles={selectStylesTeal} placeholder="Choisir…" />
                </div>
              )}
              {estSpecialite && (
                <div>
                  <label htmlFor="diplomes-acceptes" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Diplômes concernés (facultatif)</label>
                  <Select inputId="diplomes-acceptes" options={optionsDiplomes} value={diplomes} isMulti onChange={(opts) => setDiplomes(opts || [])} styles={selectStylesTeal} placeholder="Choisir…" />
                </div>
              )}
            </div>
          )}

          {mode === "REFUSER" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {MOTIFS_RAPIDES.map((m) => (
                  <button key={m} type="button" onClick={() => setMotif(m)} className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${tw.surfaceSubtle} ${tw.textMuted700} ${tw.hoverSurfaceSubtleStrong}`}>
                    {m}
                  </button>
                ))}
              </div>
              <label htmlFor="motif-refus-demande" className={`text-xs font-medium ${tw.textMuted} block`}>Motif (envoyé au demandeur) *</label>
              <textarea id="motif-refus-demande" rows={3} maxLength={MOTIF_MAX} className={inputClass} value={motif} onChange={(e) => setMotif(e.target.value)} />
            </div>
          )}

          {erreur && <p role="alert" className="text-xs font-medium text-red-600">{erreur}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={fermer} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong}`}>Annuler</button>
            <button
              type="button"
              onClick={lockSubmit(decider)}
              disabled={submitBusy || !pret}
              className={`flex-1 py-2.5 ${mode === "REFUSER" ? tw.buttonDangerSolid : `${tw.bgPrimarySolidHover} text-white`} text-sm font-semibold rounded-lg disabled:opacity-50`}
            >
              {libelleBouton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionDemandeModal;
