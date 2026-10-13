// Modale "Inviter à postuler" : choix d'une offre active à proposer au candidat.
import React from "react";
import { tw } from "../../../theme";

export const ModaleInvitation = ({
  candidat,
  offresActives,
  offreInvitation,
  setOffreInvitation,
  envoiInvitation,
  onAnnuler,
  onEnvoyer,
}) => (
  <div className={`${tw.modalOverlay} p-4`}>
    <div className={`${tw.surface} rounded-2xl p-6 max-w-md w-full shadow-2xl`}>
      <h3 className={`text-base font-bold ${tw.textStrong} mb-4`}>
        Inviter {candidat.first_name || candidat.titre_professionnel || "ce candidat"} à postuler
      </h3>
      <select
        value={offreInvitation}
        onChange={(e) => setOffreInvitation(e.target.value)}
        className={`w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm mb-4`}
      >
        <option value="" disabled>Choisir une offre</option>
        {offresActives.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAnnuler}
          className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg`}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!offreInvitation || envoiInvitation}
          onClick={onEnvoyer}
          className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg disabled:opacity-50`}
        >
          {envoiInvitation ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </div>
  </div>
);
