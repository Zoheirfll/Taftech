// Fenêtre de refus en masse des demandes d'ajout sélectionnées : le même motif (obligatoire, envoyé aux demandeurs)
// pour toutes. La liste des demandes concernées est montrée avant de valider (règle des suppressions en masse).
import React, { useState } from "react";
import { X } from "lucide-react";
import { adminService } from "../../../Services/adminService";
import { apiErrMsg } from "../../../utils/apiErrMsg";
import { notifier } from "../../../utils/notifier";
import { tw } from "../../../theme";
import useEchapPourFermer from "../../../utils/useEchapPourFermer";
import { useSubmitLock } from "../../../utils/useSubmitLock";
import { MOTIFS_RAPIDES, MOTIF_MAX, MOTIF_MIN } from "./demandesAjoutUi";

const RefusMasseModal = ({ demandes, onClose, onRefusees }) => {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState("");
  const [submitBusy, lockSubmit] = useSubmitLock();
  useEchapPourFermer(!submitBusy, onClose);

  const pret = motif.trim().length >= MOTIF_MIN;

  const refuser = async () => {
    setErreur("");
    try {
      const resultat = await adminService.refuserDemandesEnMasse(demandes.map((d) => d.id), motif.trim());
      const ignorees = resultat.ignorees?.length || 0;
      if (ignorees > 0) {
        notifier.info(
          `${resultat.refusees} demande(s) refusée(s)`,
          `${ignorees} déjà traitée(s) : ${resultat.ignorees.map((i) => i.libelle).join(", ")}.`,
        );
      } else {
        notifier.succes(`${resultat.refusees} demande(s) refusée(s)`);
      }
      onRefusees?.();
      onClose();
    } catch (err) {
      setErreur(apiErrMsg(err, "Refus impossible."));
    }
  };

  return (
    <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && !submitBusy && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Refus en masse" className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-base font-bold ${tw.textStrong}`}>Refuser {demandes.length} demande(s)</h3>
          <button type="button" onClick={onClose} disabled={submitBusy} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg ${tw.focusRing}`}><X size={18} /></button>
        </div>

        <p className={`text-xs ${tw.textMuted} mb-2`}>Demandes concernées :</p>
        <ul className={`max-h-40 overflow-y-auto mb-4 rounded-lg border ${tw.borderSubtle} divide-y ${tw.divideBase}`}>
          {demandes.map((d) => (
            <li key={d.id} className={`px-3 py-1.5 text-sm ${tw.textStrong}`}>{d.libelle}</li>
          ))}
        </ul>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {MOTIFS_RAPIDES.map((m) => (
              <button key={m} type="button" onClick={() => setMotif(m)} className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${tw.surfaceSubtle} ${tw.textMuted700} ${tw.hoverSurfaceSubtleStrong}`}>
                {m}
              </button>
            ))}
          </div>
          <label htmlFor="motif-refus-masse" className={`text-xs font-medium ${tw.textMuted} block`}>Motif (envoyé aux demandeurs) *</label>
          <textarea
            id="motif-refus-masse"
            rows={3}
            maxLength={MOTIF_MAX}
            className={`w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
        </div>

        {erreur && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{erreur}</p>}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} disabled={submitBusy} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong}`}>Annuler</button>
          <button
            type="button"
            onClick={lockSubmit(refuser)}
            disabled={submitBusy || !pret}
            className={`flex-1 py-2.5 ${tw.buttonDangerSolid} text-sm font-semibold rounded-lg disabled:opacity-50`}
          >
            Refuser {demandes.length} demande(s)
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefusMasseModal;
