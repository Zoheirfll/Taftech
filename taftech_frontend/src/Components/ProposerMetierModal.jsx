import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { jobsService } from "../Services/jobsService";
import { apiErrMsg } from "../utils/apiErrMsg";
import { tw } from "../theme";
import useEchapPourFermer from "../utils/useEchapPourFermer";
import { useSubmitLock } from "../utils/useSubmitLock";

// Fenêtre « Je ne trouve pas mon métier » : envoie une proposition à l'équipe (validée ou rejetée
// par l'admin). Elle n'ajoute rien à la liste, au profil ni à l'offre : l'utilisateur choisit en
// attendant le métier le plus proche dans la liste.
const ProposerMetierModal = ({ open, libelleInitial = "", onClose, onProposed }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [libelle, setLibelle] = useState(libelleInitial);
  const [contexte, setContexte] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (open) {
      setLibelle(libelleInitial);
      setContexte("");
      setErreur("");
    }
  }, [open, libelleInitial]);

  const fermer = useCallback(() => onClose?.(), [onClose]);
  useEchapPourFermer(open, fermer);

  if (!open) return null;

  const inputClass = `w-full px-4 py-2.5 rounded-lg text-sm ${tw.inputColorsMuted}`;

  // Pas de <form> : cette fenêtre s'ouvre depuis des formulaires qui ont déjà le leur (un <form>
  // imbriqué est invalide et ferait soumettre le formulaire parent).
  const envoyer = async () => {
    setErreur("");
    try {
      const reponse = await jobsService.creerDemandeAjout("METIER", libelle.trim(), contexte.trim());
      if (onProposed) {
        // Écran du candidat : la proposition reste sélectionnée sur son profil en attendant la décision.
        onProposed({ id: reponse.id, libelle: libelle.trim() });
        toast.success("Proposition envoyée : elle reste sélectionnée en attendant la décision de notre équipe.");
      } else {
        toast.success(reponse.message || "Votre proposition a été envoyée.");
      }
      fermer();
    } catch (err) {
      setErreur(apiErrMsg(err, "Impossible d'envoyer la proposition."));
    }
  };

  return createPortal(
    <div className={`${tw.modalOverlay} p-4`} role="dialog" aria-modal="true" aria-label="Proposer un métier">
      <div className={`${tw.surface} rounded-2xl w-full max-w-md shadow-2xl`}>
        <div className={`px-6 py-4 border-b ${tw.borderSubtle} flex justify-between items-center`}>
          <h3 className={`text-base font-bold ${tw.textStrong}`}>Je ne trouve pas mon métier</h3>
          <button type="button" onClick={fermer} aria-label="Fermer" className={`p-1.5 ${tw.modalCloseButton} rounded-lg`}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className={`text-xs ${tw.textMuted}`}>
            {onProposed
              ? "Notre équipe examine votre proposition. Elle reste sélectionnée sur votre profil, mais ne compte pas dans le calcul de vos offres tant qu'elle n'est pas validée."
              : "Notre équipe examine votre proposition. En attendant, choisissez le métier le plus proche dans la liste."}
          </p>
          <div>
            <label htmlFor="proposition-metier-libelle" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
              Intitulé du métier *
            </label>
            <input
              id="proposition-metier-libelle"
              required
              minLength={3}
              maxLength={120}
              className={inputClass}
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="proposition-metier-contexte" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
              Précision (secteur, mission…)
            </label>
            <textarea
              id="proposition-metier-contexte"
              rows={2}
              maxLength={300}
              className={inputClass}
              value={contexte}
              onChange={(e) => setContexte(e.target.value)}
            />
          </div>
          {erreur && <p role="alert" className="text-xs font-medium text-red-600">{erreur}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={fermer} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg ${tw.buttonSecondary}`}>
              Annuler
            </button>
            <button
              type="button"
              onClick={lockSubmit(envoyer)}
              disabled={submitBusy || libelle.trim().length < 3}
              className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg disabled:opacity-50 ${tw.focusRing}`}
            >
              {submitBusy ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ProposerMetierModal;
