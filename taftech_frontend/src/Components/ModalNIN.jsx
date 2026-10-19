import React, { useCallback, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { tw } from "../theme";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import { useErreursChamps } from "../utils/useErreursChamps";
import FieldError from "./FieldError";

const NIN_VALIDE = /^\d{18}$/;

// Modale « Votre NIN est exigé pour postuler » : le NIN n'est pas demandé à l'inscription, il est
// saisi une seule fois, à la première candidature (exigence ANEM). Il n'est jamais communiqué aux
// recruteurs.
export const ModalNIN = ({ ouvert, onFermer, onEnregistre }) => {
  const [nin, setNin] = useState("");
  const [enCours, setEnCours] = useState(false);
  const { erreurs, definir, depuisReponse, effacer, attributs } = useErreursChamps();

  if (!ouvert) return null;

  const soumettre = async (e) => {
    e.preventDefault();
    const valeur = nin.trim();
    if (!NIN_VALIDE.test(valeur)) {
      definir({ nin: "Le NIN doit contenir exactement 18 chiffres." });
      return;
    }
    setEnCours(true);
    try {
      await jobsService.enregistrerNIN(valeur);
      setNin("");
      definir({});
      onEnregistre();
    } catch (err) {
      reportError("ECHEC_ENREGISTRER_NIN_MODALE", err);
      // Le serveur répond soit par une erreur de champ (format), soit par un message générique
      // (NIN non enregistrable) : jamais le détail de la raison.
      if (!depuisReponse(err, ["nin"])) {
        definir({ nin: err.response?.data?.error || "Impossible d'enregistrer le NIN pour le moment." });
      }
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className={tw.modalOverlay} role="dialog" aria-modal="true" aria-label="NIN obligatoire pour postuler">
      <form onSubmit={soumettre} noValidate className={`${tw.modalPanel} w-full max-w-md p-6`}>
        <div className="flex items-start justify-between mb-3">
          <h3 className={`${tw.sectionHeading} flex items-center gap-2`}>
            <ShieldCheck size={18} className={tw.textSuccess} /> Votre NIN est nécessaire pour postuler
          </h3>
          <button type="button" onClick={onFermer} aria-label="Fermer" className={`p-1 rounded ${tw.modalCloseButton}`}>
            <X size={18} />
          </button>
        </div>
        <p className={`text-sm ${tw.bodyText} mb-4`}>
          Le Numéro d'Identification Nationale est exigé par l'ANEM pour toute candidature. Il est enregistré une
          seule fois, n'est jamais communiqué aux recruteurs, et ne pourra être modifié ensuite que par le
          support TafTech.
        </p>
        <label htmlFor="champ-nin" className={tw.formLabel}>
          NIN (18 chiffres)
        </label>
        <input
          id="champ-nin"
          name="nin"
          inputMode="numeric"
          autoComplete="off"
          maxLength={18}
          className={tw.input}
          value={nin}
          onChange={(e) => {
            setNin(e.target.value.replace(/\D/g, ""));
            effacer("nin");
          }}
          {...attributs("nin")}
        />
        <FieldError id="err-nin" message={erreurs.nin} />
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onFermer} className={tw.buttonSecondary} disabled={enCours}>
            Annuler
          </button>
          <button type="submit" className={tw.buttonPrimary} disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer et postuler"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Hook partagé par tous les écrans qui envoient une candidature avec compte : quand le serveur répond
// NIN_REQUIS, l'écran appelle `demanderNIN(reprise)` ; la modale s'ouvre et, une fois le NIN
// enregistré, `reprise` est rejouée automatiquement (la candidature part sans que le candidat
// ait à recommencer). `modaleNIN` est à placer dans le rendu de l'écran.
export const useModaleNIN = () => {
  const [ouvert, setOuvert] = useState(false);
  const reprise = useRef(null);

  const demanderNIN = useCallback((action) => {
    reprise.current = action;
    setOuvert(true);
  }, []);

  const fermer = useCallback(() => {
    reprise.current = null;
    setOuvert(false);
  }, []);

  const apresEnregistrement = useCallback(() => {
    const action = reprise.current;
    reprise.current = null;
    setOuvert(false);
    if (action) action();
  }, []);

  const modaleNIN = <ModalNIN ouvert={ouvert} onFermer={fermer} onEnregistre={apresEnregistrement} />;
  return { demanderNIN, modaleNIN };
};

export const reponseNinRequis = (err) => err?.response?.data?.code === "NIN_REQUIS";
