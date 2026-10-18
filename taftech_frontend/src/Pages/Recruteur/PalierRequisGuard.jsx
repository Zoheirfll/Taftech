import React, { useEffect, useState } from "react";
import { jobsService } from "../../Services/jobsService";
import EcranPalierRequis from "../../Components/EcranPalierRequis";

// Enveloppe une page que le palier d'abonnement peut ne pas donner (CVthèque, Mon équipe) :
// si le droit vaut explicitement `false`, l'écran « palier requis » remplace la page — qui n'est
// alors jamais montée, donc ne lance aucun appel voué au 403. `droit` est une clé renvoyée par
// `mon-abonnement/` (acces_cvtheque, acces_equipe…). Si la lecture échoue, on laisse la page :
// le serveur reste le vrai garde (403 PALIER_INSUFFISANT sur chaque route).
const PalierRequisGuard = ({ droit, titre, message, children }) => {
  const [droits, setDroits] = useState(null);

  useEffect(() => {
    let actif = true;
    jobsService
      .getMonAbonnement()
      .then((d) => actif && setDroits(d))
      .catch(() => actif && setDroits({}));
    return () => {
      actif = false;
    };
  }, []);

  if (droits === null) {
    return <div className="py-20 text-center text-sm text-slate-600 animate-pulse">Chargement...</div>;
  }
  if (droits[droit] === false) return <EcranPalierRequis titre={titre} message={message} />;
  return children;
};

export default PalierRequisGuard;
