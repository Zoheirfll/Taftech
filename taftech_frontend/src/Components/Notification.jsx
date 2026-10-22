import React from "react";
import { CheckCircle2, XCircle, Info, Loader2, X } from "lucide-react";
import { tw } from "../theme";

const VARIANTES = {
  success: { Icone: CheckCircle2, bordure: tw.notifSucces, icone: tw.notifIconeSucces },
  error: { Icone: XCircle, bordure: tw.notifErreur, icone: tw.notifIconeErreur },
  loading: { Icone: Loader2, bordure: tw.notifNeutre, icone: tw.notifIconeChargement },
  blank: { Icone: Info, bordure: tw.notifNeutre, icone: tw.notifIconeNeutre },
};

/**
 * Carte de notification : filet de couleur à gauche, titre court, détail facultatif, bouton de fermeture.
 * Rendue par `NotificationsHost` pour TOUTE notification ; `toast` est l'objet fourni par react-hot-toast
 * (`type`, `message`, `visible`). Le message est « Titre » ou « Titre\nDétail » (voir `utils/notifier.js`).
 */
export const Notification = ({ toast, onClose }) => {
  const variante = VARIANTES[toast.type] || VARIANTES.blank;
  const { Icone } = variante;
  const message = typeof toast.message === "function" ? toast.message(toast) : toast.message;
  const [titre, ...suite] = typeof message === "string" ? message.split("\n") : [message];
  const detail = suite.join("\n").trim();

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`${tw.notifCarte} ${variante.bordure} ${toast.visible ? tw.notifVisible : tw.notifMasquee}`}
    >
      <Icone size={18} aria-hidden="true" className={variante.icone} />
      <div className="min-w-0 flex-1">
        <p className={tw.notifTitre}>{titre}</p>
        {detail && <p className={tw.notifDetail}>{detail}</p>}
      </div>
      {toast.type !== "loading" && (
        <button type="button" onClick={onClose} aria-label="Fermer la notification" className={tw.notifFermer}>
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Notification;
