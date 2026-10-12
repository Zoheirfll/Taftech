// Modale « Inviter à postuler » : choix de l'offre à proposer au candidat recommandé.
import { tw } from "../../../theme";

export const ModalInvitation = ({
  inviterCandidat,
  setInviterCandidat,
  offres,
  offreInvitation,
  setOffreInvitation,
  envoiInvitation,
  handleEnvoyerInvitation,
}) => (
  <div className={`${tw.modalOverlay} p-4`}>
    <div className={`${tw.surface} rounded-2xl p-6 max-w-md w-full shadow-2xl`}>
      <h3 className={`text-base font-bold ${tw.textStrong} mb-4`}>
        Inviter {inviterCandidat.candidat?.first_name || "ce candidat"} à postuler
      </h3>
      <select
        value={offreInvitation}
        onChange={(e) => setOffreInvitation(e.target.value)}
        className={`w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm mb-4`}
      >
        <option value="" disabled>Choisir une offre</option>
        {offres.filter((o) => o.est_active && !o.est_cloturee && o.statut_moderation === "APPROUVEE").map((o) => (
          <option key={o.id} value={o.id}>{o.titre}</option>
        ))}
      </select>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setInviterCandidat(null)}
          className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg`}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!offreInvitation || envoiInvitation}
          onClick={handleEnvoyerInvitation}
          className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg disabled:opacity-50`}
        >
          {envoiInvitation ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </div>
  </div>
);
