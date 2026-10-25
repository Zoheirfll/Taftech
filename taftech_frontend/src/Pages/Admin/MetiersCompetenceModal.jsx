// Fenêtre « Métiers » d'une compétence officielle : les métiers auxquels elle est suggérée (publication d'offre,
// profil et assistant d'import du candidat). Les liens du classeur du client sont affichés mais ne se retirent pas ici.
import React, { useCallback, useEffect, useState } from "react";
import AsyncSelect from "react-select/async";
import { X } from "lucide-react";
import { adminService } from "../../Services/adminService";
import { notifier } from "../../utils/notifier";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { confirmToast } from "../../utils/confirmToast";
import { selectStylesTeal, tw } from "../../theme";
import useEchapPourFermer from "../../utils/useEchapPourFermer";
import { useSubmitLock } from "../../utils/useSubmitLock";
import { useChercherMetiers } from "../../utils/useChercherMetiers";

const MetiersCompetenceModal = ({ competence, onClose, onChange }) => {
  const [metiers, setMetiers] = useState(null); // null : chargement en cours
  const [choix, setChoix] = useState([]);
  const [erreur, setErreur] = useState("");
  const [submitBusy, lockSubmit] = useSubmitLock();
  const chercherMetiers = useChercherMetiers();
  const fermer = useCallback(() => onClose?.(), [onClose]);
  useEchapPourFermer(true, fermer);

  useEffect(() => {
    let annule = false;
    adminService.getMetiersCompetence(competence.id)
      .then((r) => { if (!annule) setMetiers(r.metiers || []); })
      .catch(() => { if (!annule) setErreur("Impossible de charger les métiers."); });
    return () => { annule = true; };
  }, [competence.id]);

  const appliquer = (liste) => {
    setMetiers(liste);
    onChange?.(liste.length);
  };

  const ajouter = async () => {
    setErreur("");
    try {
      const r = await adminService.lierMetiersCompetence(competence.id, choix.map((c) => c.value));
      appliquer(r.metiers || []);
      setChoix([]);
      notifier.succes("Métiers liés", r.ajoutes ? `${r.ajoutes} lien(s) ajouté(s).` : "Ces liens existaient déjà.");
    } catch (err) {
      setErreur(apiErrMsg(err, "Ajout impossible."));
    }
  };

  const retirer = (metier) => {
    confirmToast(`Retirer « ${metier.libelle} » de cette compétence ?`, async () => {
      try {
        const r = await adminService.retirerMetierCompetence(competence.id, metier.id);
        appliquer(r.metiers || []);
        notifier.succes("Lien retiré");
      } catch (err) {
        notifier.echec("Retrait impossible", err);
      }
    });
  };

  return (
    <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermer()}>
      <div role="dialog" aria-modal="true" aria-label={`Métiers de ${competence.label}`} className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-1">
          <h3 className={`text-base font-bold ${tw.textStrong}`}>Métiers de « {competence.label} »</h3>
          <button type="button" onClick={fermer} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg ${tw.focusRing}`}><X size={18} /></button>
        </div>
        <p className={`text-xs ${tw.textMuted} mb-4`}>
          La compétence est proposée (jamais ajoutée d'office) à ceux qui choisissent ces métiers : publication d'offre, profil et import du CV.
        </p>

        {metiers === null && !erreur && <p className={`text-xs ${tw.textMuted}`}>Chargement…</p>}
        {metiers?.length === 0 && (
          <p className={`text-xs ${tw.textMuted} mb-4`}>Aucun métier : cette compétence n'apparaît dans aucune liste de suggestions.</p>
        )}
        {metiers?.length > 0 && (
          <ul className={`divide-y ${tw.divideBase} border ${tw.borderSubtle} rounded-lg mb-4 max-h-56 overflow-y-auto`}>
            {metiers.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className={`block text-sm ${tw.textStrong} truncate`}>{m.libelle}</span>
                  {m.groupe && <span className={`block text-[11px] ${tw.textMuted} truncate`}>{m.groupe}</span>}
                </span>
                {m.retirable ? (
                  <button type="button" onClick={() => retirer(m)} aria-label={`Retirer ${m.libelle}`} className={`p-1.5 ${tw.textMuted} hover:text-red-600 rounded-lg ${tw.focusRing}`}><X size={14} /></button>
                ) : (
                  <span className={`text-[10px] ${tw.textMuted}`} title="Lien du classeur du client : il ne se retire pas ici.">Classeur</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <label htmlFor="metiers-a-lier" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Ajouter des métiers</label>
        <AsyncSelect
          inputId="metiers-a-lier"
          isMulti
          cacheOptions
          value={choix}
          loadOptions={chercherMetiers}
          onChange={(opts) => setChoix(opts || [])}
          styles={selectStylesTeal}
          placeholder="Chercher un métier…"
          noOptionsMessage={({ inputValue }) => (inputValue.trim().length < 2 ? "Tapez au moins 2 lettres" : "Aucun métier")}
          loadingMessage={() => "Recherche…"}
        />

        {erreur && <p role="alert" className="text-xs font-medium text-red-600 mt-3">{erreur}</p>}

        <div className="flex gap-3 pt-5">
          <button type="button" onClick={fermer} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong}`}>Fermer</button>
          <button
            type="button"
            onClick={lockSubmit(ajouter)}
            disabled={submitBusy || choix.length === 0}
            className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg disabled:opacity-50`}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetiersCompetenceModal;
