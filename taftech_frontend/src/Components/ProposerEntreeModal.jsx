import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { jobsService } from "../Services/jobsService";
import { apiErrMsg } from "../utils/apiErrMsg";
import { tw } from "../theme";
import useEchapPourFermer from "../utils/useEchapPourFermer";
import { useSubmitLock } from "../utils/useSubmitLock";

// Fenêtre « Je ne trouve pas mon diplôme / ma spécialité » : envoie une demande d'ajout à l'équipe (acceptée,
// rattachée à une entrée existante ou refusée par l'admin). Elle n'ajoute rien à la liste, au profil ni à
// l'offre : l'utilisateur choisit en attendant l'entrée la plus proche dans la liste.
const TEXTES = {
  DIPLOME: {
    titre: "Je ne trouve pas mon diplôme",
    libelle: "Intitulé du type de diplôme *",
    contexte: "Précision (niveau, domaine…)",
    aria: "Demander l'ajout d'un type de diplôme",
  },
  SPECIALITE: {
    titre: "Je ne trouve pas ma spécialité",
    libelle: "Intitulé de la spécialité *",
    contexte: "Précision (diplôme concerné, domaine…)",
    aria: "Demander l'ajout d'une spécialité",
  },
};

const ProposerEntreeModal = ({ open, type = "DIPLOME", libelleInitial = "", contexteInitial = "", onClose }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [libelle, setLibelle] = useState(libelleInitial);
  const [contexte, setContexte] = useState(contexteInitial);
  const [erreur, setErreur] = useState("");
  const textes = TEXTES[type] || TEXTES.DIPLOME;

  useEffect(() => {
    if (open) {
      setLibelle(libelleInitial);
      setContexte(contexteInitial);
      setErreur("");
    }
  }, [open, libelleInitial, contexteInitial]);

  const fermer = useCallback(() => onClose?.(), [onClose]);
  useEchapPourFermer(open, fermer);

  if (!open) return null;

  const inputClass = `w-full px-4 py-2.5 rounded-lg text-sm ${tw.inputColorsMuted}`;

  // Pas de <form> : cette fenêtre s'ouvre depuis des formulaires qui ont déjà le leur (un <form>
  // imbriqué est invalide et ferait soumettre le formulaire parent).
  const envoyer = async () => {
    setErreur("");
    try {
      const reponse = await jobsService.creerDemandeAjout(type, libelle.trim(), contexte.trim());
      toast.success(reponse.message || "Votre demande a été envoyée.");
      fermer();
    } catch (err) {
      setErreur(apiErrMsg(err, "Impossible d'envoyer la demande."));
    }
  };

  return createPortal(
    <div className={`${tw.modalOverlay} p-4`} role="dialog" aria-modal="true" aria-label={textes.aria}>
      <div className={`${tw.surface} rounded-2xl w-full max-w-md shadow-2xl`}>
        <div className={`px-6 py-4 border-b ${tw.borderSubtle} flex justify-between items-center`}>
          <h3 className={`text-base font-bold ${tw.textStrong}`}>{textes.titre}</h3>
          <button type="button" onClick={fermer} aria-label="Fermer" className={`p-1.5 ${tw.modalCloseButton} rounded-lg`}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className={`text-xs ${tw.textMuted}`}>
            Notre équipe examine votre demande. En attendant, choisissez l'entrée la plus proche dans la liste.
          </p>
          <div>
            <label htmlFor="demande-ajout-libelle" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
              {textes.libelle}
            </label>
            <input
              id="demande-ajout-libelle"
              required
              minLength={3}
              maxLength={120}
              className={inputClass}
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="demande-ajout-contexte" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
              {textes.contexte}
            </label>
            <textarea
              id="demande-ajout-contexte"
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

export default ProposerEntreeModal;
