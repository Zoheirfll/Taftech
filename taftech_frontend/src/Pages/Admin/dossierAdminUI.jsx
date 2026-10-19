import React, { useEffect, useState } from "react";
import { tw } from "../../theme";

// Éléments communs aux dossiers des fiches recruteur et administrateur (page Utilisateurs de l'admin).
// Définis ici, hors de tout composant à state, pour ne pas être recréés à chaque rendu.

export const date = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");
export const dateHeure = (iso) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Jamais";
export const oui = (valeur) => (valeur ? "Oui" : "Non");

export const Titre = ({ children }) => (
  <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wider mb-2`}>{children}</p>
);

export const Chiffre = ({ libelle, valeur, detail }) => (
  <div className={`${tw.surfaceMuted} p-3 rounded-lg border ${tw.borderSubtle}`}>
    <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase`}>{libelle}</p>
    <p className={`text-lg font-bold ${tw.textStrong} mt-1`}>{valeur}</p>
    {detail && <p className={`text-[11px] ${tw.textMuted} mt-0.5`}>{detail}</p>}
  </div>
);

export const Ligne = ({ libelle, valeur }) => (
  <div className="flex justify-between gap-3 text-xs py-1">
    <span className={tw.textMuted}>{libelle}</span>
    <span className={`font-semibold text-right ${tw.textSlate800}`}>{valeur}</span>
  </div>
);

export const Pastilles = ({ entrees }) => (
  <div className="flex flex-wrap gap-2">
    {entrees.map(([nom, nombre]) => (
      <span key={nom} className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border ${tw.borderSubtle} ${tw.textSlate800}`}>
        {nom} : {nombre}
      </span>
    ))}
  </div>
);

// Charge un dossier à l'ouverture de la fiche et à chaque changement de compte.
export const useDossier = (charger, userId) => {
  const [dossier, setDossier] = useState(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let annule = false;
    setDossier(null);
    setErreur(false);
    charger(userId)
      .then((donnees) => {
        if (!annule) setDossier(donnees);
      })
      .catch(() => {
        if (!annule) setErreur(true);
      });
    return () => {
      annule = true;
    };
  }, [charger, userId]);

  return { dossier, erreur };
};

export const EtatChargement = ({ erreur }) => (
  <p className={`text-xs ${erreur ? tw.textError : tw.textMuted}`}>
    {erreur ? "Impossible de charger le dossier détaillé." : "Chargement du dossier…"}
  </p>
);
