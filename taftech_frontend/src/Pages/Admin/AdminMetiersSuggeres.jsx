import React, { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { Briefcase, Check, Ban, X } from "lucide-react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { selectStylesTeal, tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import { MetierAutocomplete } from "../../Components/MetierAutocomplete";
import useEchapPourFermer from "../../utils/useEchapPourFermer";
import { useSubmitLock } from "../../utils/useSubmitLock";

// Cycle d'un métier proposé par un utilisateur (correction client n°23), comme les compétences :
// Suggéré -> Validé | Rejeté ; Rejeté -> Validé (réexamen). Rien n'entre dans le référentiel sans décision.
const STATUTS = {
  SUGGEREE: { libelle: "À examiner", classe: "bg-amber-50 text-amber-700" },
  VALIDEE: { libelle: "Validé", classe: `${tw.bgSuccessSoft} ${tw.textSuccess}` },
  REJETEE: { libelle: "Rejeté", classe: tw.badgeErrorLight },
};
const ONGLETS = [
  { code: "", libelle: "Toutes", compteur: "TOUTES" },
  { code: "SUGGEREE", libelle: "À examiner", compteur: "SUGGEREE" },
  { code: "VALIDEE", libelle: "Validées", compteur: "VALIDEE" },
  { code: "REJETEE", libelle: "Rejetées", compteur: "REJETEE" },
];
const ORIGINES = { RECRUTEUR: "Recruteur", CANDIDAT: "Candidat" };
const ISSUES = { RATTACHEE: "Rattaché à", CREEE: "Nouveau métier" };

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

const AdminMetiersSuggeres = () => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [items, setItems] = useState([]);
  const [compteurs, setCompteurs] = useState({});
  const [statutFiltre, setStatutFiltre] = useState("SUGGEREE");
  const [loading, setLoading] = useState(true);
  const [aValider, setAValider] = useState(null);
  const [aRejeter, setARejeter] = useState(null);
  const [mode, setMode] = useState("RATTACHER");
  const [metierCible, setMetierCible] = useState(null);
  const [groupes, setGroupes] = useState([]);
  const [groupeId, setGroupeId] = useState("");
  const [motif, setMotif] = useState("");

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const charger = useCallback(async (statut) => {
    setLoading(true);
    try {
      const data = await jobsService.getPropositionsMetier(statut);
      setItems(data.results || []);
      setCompteurs(data.compteurs || {});
    } catch (err) {
      reportError("ECHEC_GET_PROPOSITIONS_METIER_PAGE", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger("SUGGEREE");
  }, [charger]);

  const choisirOnglet = (code) => {
    setStatutFiltre(code);
    charger(code);
  };

  const ouvrirValidation = (item) => {
    setAValider(item);
    setMode("RATTACHER");
    setMetierCible(null);
    setGroupeId("");
  };

  const fermerValidation = useCallback(() => setAValider(null), []);
  const fermerRejet = useCallback(() => setARejeter(null), []);
  useEchapPourFermer(!!aValider, fermerValidation);
  useEchapPourFermer(!!aRejeter, fermerRejet);

  // Les groupes (≈ 700) ne sont chargés que si l'admin choisit de créer un nouveau métier.
  const choisirMode = async (nouveau) => {
    setMode(nouveau);
    if (nouveau === "CREER" && groupes.length === 0) {
      try {
        const data = await jobsService.getPropositionsMetier(statutFiltre, true);
        setGroupes(data.groupes || []);
      } catch (err) {
        reportError("ECHEC_GET_GROUPES_METIER", err);
        toast.error(apiErrMsg(err, "Impossible de charger les groupes."));
      }
    }
  };

  const validationPrete = mode === "RATTACHER" ? !!metierCible : !!groupeId;

  const valider = async () => {
    const corps = mode === "RATTACHER" ? { mode, metier_id: metierCible.metier_id } : { mode, groupe_id: Number(groupeId) };
    try {
      await jobsService.validerPropositionMetier(aValider.id, corps);
      toast.success(mode === "RATTACHER" ? "Intitulé rattaché au métier." : "Nouveau métier créé.");
      fermerValidation();
      charger(statutFiltre);
    } catch (err) {
      reportError("ECHEC_VALIDER_PROPOSITION_METIER_PAGE", err);
      toast.error(apiErrMsg(err, "Impossible de valider."));
    }
  };

  const ouvrirRejet = (item) => {
    setARejeter(item);
    setMotif("");
  };

  const rejeter = async () => {
    try {
      await jobsService.rejeterPropositionMetier(aRejeter.id, motif.trim());
      toast.success("Proposition rejetée. Le proposant en est informé.");
      fermerRejet();
      charger(statutFiltre);
    } catch (err) {
      reportError("ECHEC_REJETER_PROPOSITION_METIER_PAGE", err);
      toast.error(apiErrMsg(err, "Impossible de rejeter."));
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Briefcase}
        color="violet"
        title="Métiers suggérés"
        subtitle="Métiers proposés par les candidats et les recruteurs qui ne trouvent pas le leur dans la liste."
        aideKey="metiers-suggeres"
        aide={[
          "Cycle : Suggéré → Validé ou Rejeté ; un métier rejeté peut être réexaminé et validé.",
          "Une proposition n'a aucun effet tant que vous ne l'avez pas validée : elle ne rattache aucun profil ni aucune offre et ne change aucun score.",
          "Valider : « Rattacher » ajoute l'intitulé comme appellation d'un métier existant (le plus courant, aucun doublon) ; « Créer un nouveau métier » ajoute un métier officiel dans le groupe choisi, sans compétences ni formations suggérées.",
          "Rejeter demande un motif, envoyé au proposant. Un intitulé rejeté ne peut pas être proposé de nouveau.",
          "Le nombre de demandeurs distincts vous aide à juger si un métier manque réellement.",
        ]}
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par statut">
        {ONGLETS.map((onglet) => {
          const actif = statutFiltre === onglet.code;
          return (
            <button
              key={onglet.code || "toutes"}
              role="tab"
              aria-selected={actif}
              onClick={() => choisirOnglet(onglet.code)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${tw.focusRing} ${actif ? `${tw.bgPrimarySolidHover} text-white` : `${tw.surfaceSubtle} ${tw.textMuted} ${tw.hoverSurfaceSubtleStrong}`}`}
            >
              {onglet.libelle}
              <span className="ml-1.5 opacity-80">({compteurs[onglet.compteur] ?? 0})</span>
            </button>
          );
        })}
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-190">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Métier proposé</th>
                <th className="px-5 py-3">Demandé par</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={4} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <AdminVide icon={Briefcase} titre="Aucune proposition de métier." />
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3">
                      <p className={`text-sm font-medium ${tw.textStrong}`}>{item.libelle}</p>
                      {item.contexte && <p className={`text-xs ${tw.textMuted} max-w-sm`}>{item.contexte}</p>}
                      {item.issue && item.metier_resultat_libelle && (
                        <p className={`text-[11px] ${tw.textMuted}`}>{ISSUES[item.issue]} : {item.metier_resultat_libelle}</p>
                      )}
                      {item.statut === "REJETEE" && item.motif_rejet && (
                        <p className={`text-[11px] ${tw.textErrorMuted}`}>Motif : {item.motif_rejet}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className={`text-xs ${tw.textMuted700}`}>
                        {ORIGINES[item.origine] || item.origine} · {item.nb_demandeurs} demandeur(s)
                      </p>
                      <p className={`text-[11px] ${tw.textMuted}`}>{item.proposee_par_email || "compte supprimé"} · {formatDate(item.date_creation)}</p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${STATUTS[item.statut]?.classe || ""}`}>
                        {STATUTS[item.statut]?.libelle || item.statut}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.transitions_possibles.includes("VALIDEE") && (
                          <button
                            onClick={() => ouvrirValidation(item)}
                            aria-label={`Valider ${item.libelle}`}
                            title={item.statut === "REJETEE" ? "Valider (réexamen)" : "Valider"}
                            className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {item.transitions_possibles.includes("REJETEE") && (
                          <button
                            onClick={() => ouvrirRejet(item)}
                            aria-label={`Rejeter ${item.libelle}`}
                            title="Rejeter"
                            className={`p-2 ${tw.iconButtonHoverDanger} rounded-lg transition-colors ${tw.focusRing}`}
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {aValider && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerValidation()}>
          <div role="dialog" aria-modal="true" aria-label="Valider la proposition" className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Valider « {aValider.libelle} »</h3>
              <button onClick={fermerValidation} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <fieldset className="space-y-2">
                <legend className={`text-xs font-medium ${tw.textMuted} mb-1`}>Que doit devenir cet intitulé ?</legend>
                <label className={`flex items-start gap-2 text-sm ${tw.textMuted700} cursor-pointer`}>
                  <input type="radio" name="mode-validation" checked={mode === "RATTACHER"} onChange={() => choisirMode("RATTACHER")} className="mt-1" />
                  <span>Le rattacher à un métier existant <span className={`block text-[11px] ${tw.textMuted}`}>Recommandé : aucun doublon, le métier garde ses compétences et formations suggérées.</span></span>
                </label>
                <label className={`flex items-start gap-2 text-sm ${tw.textMuted700} cursor-pointer`}>
                  <input type="radio" name="mode-validation" checked={mode === "CREER"} onChange={() => choisirMode("CREER")} className="mt-1" />
                  <span>Créer un nouveau métier <span className={`block text-[11px] ${tw.textMuted}`}>Le nouveau métier n'a ni compétences ni formations suggérées.</span></span>
                </label>
              </fieldset>

              {mode === "RATTACHER" ? (
                <div className="space-y-2">
                  <label className={`text-xs font-medium ${tw.textMuted} block`}>Métier existant *</label>
                  <MetierAutocomplete
                    value={metierCible?.metier_libelle || ""}
                    onSelect={(item) => setMetierCible({ metier_id: item.metier_id, metier_libelle: item.metier_libelle })}
                  />
                  {aValider.metiers_proches?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className={`text-[11px] ${tw.textMuted}`}>Métiers proches :</span>
                      {aValider.metiers_proches.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMetierCible({ metier_id: m.id, metier_libelle: m.libelle })}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${tw.surfaceSubtle} ${tw.textMuted700} ${tw.hoverSurfaceSubtleStrong}`}
                        >
                          {m.libelle}
                        </button>
                      ))}
                    </div>
                  )}
                  {metierCible && (
                    <p className={`text-xs font-semibold ${tw.textStrong}`}>Rattacher à : {metierCible.metier_libelle}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className={`text-xs font-medium ${tw.textMuted} block`}>Groupe du nouveau métier *</label>
                  <Select
                    options={groupes.map((g) => ({ value: g.id, label: g.parent_libelle ? `${g.parent_libelle} › ${g.libelle}` : g.libelle }))}
                    placeholder={groupes.length === 0 ? "Chargement…" : "Choisir un groupe"}
                    isClearable
                    onChange={(opt) => setGroupeId(opt ? String(opt.value) : "")}
                    styles={selectStylesTeal}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fermerValidation} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong}`}>Annuler</button>
                <button
                  type="button"
                  onClick={lockSubmit(valider)}
                  disabled={submitBusy || !validationPrete}
                  className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg disabled:opacity-50`}
                >
                  {mode === "RATTACHER" ? "Rattacher" : "Créer le métier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {aRejeter && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerRejet()}>
          <div role="dialog" aria-modal="true" aria-label="Rejeter la proposition" className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Rejeter « {aRejeter.libelle} »</h3>
              <button onClick={fermerRejet} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="motif-rejet-metier" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Motif (envoyé au proposant) *</label>
                <textarea id="motif-rejet-metier" rows={3} maxLength={500} className={inputClass} value={motif} onChange={(e) => setMotif(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={fermerRejet} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong}`}>Annuler</button>
                <button
                  type="button"
                  onClick={lockSubmit(rejeter)}
                  disabled={submitBusy || motif.trim().length < 5}
                  className={`flex-1 py-2.5 ${tw.buttonDangerSolid} text-sm font-semibold rounded-lg disabled:opacity-50`}
                >
                  Rejeter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMetiersSuggeres;
