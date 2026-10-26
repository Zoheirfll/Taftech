import React from "react";
import { X } from "lucide-react";
import { tw } from "../theme";
import useEchapPourFermer from "../utils/useEchapPourFermer";

// Fiche en lecture seule ouverte au clic sur une ligne d'une liste admin (gabarit commun).
// `lignes` : [{ libelle, valeur }] — une valeur vide s'affiche « — ».
// `actions` : [{ libelle, Icone, onClick, primaire }] — les actions passent par les modales existantes de la page.
const FicheAdminModal = ({ titre, sousTitre, badge, lignes, actions = [], onClose }) => {
  useEchapPourFermer(true, onClose);

  return (
    <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={titre} className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="flex justify-between items-start gap-3 mb-5">
          <div className="min-w-0">
            <h3 className={`text-base font-bold ${tw.textStrong} break-words`}>{titre}</h3>
            {sousTitre && <p className={`text-xs ${tw.textMuted} mt-1`}>{sousTitre}</p>}
            {badge && <span className={`inline-block mt-2 px-2.5 py-1 text-[10px] font-semibold rounded-full ${badge.classe}`}>{badge.libelle}</span>}
          </div>
          <button onClick={onClose} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
        </div>
        <dl className="space-y-4">
          {lignes.map(({ libelle, valeur }) => (
            <div key={libelle}>
              <dt className={`text-xs font-medium ${tw.textMuted} mb-1`}>{libelle}</dt>
              <dd className={`text-sm ${tw.textStrong} whitespace-pre-wrap break-words`}>{valeur === undefined || valeur === null || valeur === "" ? "—" : valeur}</dd>
            </div>
          ))}
        </dl>
        {actions.length > 0 && (
          <div className="flex gap-3 pt-6">
            {actions.map(({ libelle, Icone, onClick, primaire }) => (
              <button
                key={libelle}
                type="button"
                onClick={onClick}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg inline-flex items-center justify-center gap-2 transition-colors ${primaire ? tw.buttonPrimary : `${tw.surfaceSubtle} ${tw.textMuted} ${tw.hoverSurfaceSubtleStrong}`}`}
              >
                {Icone && <Icone size={14} />} {libelle}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FicheAdminModal;
