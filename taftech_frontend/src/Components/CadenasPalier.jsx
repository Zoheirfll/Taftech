import React from "react";
import { Lock } from "lucide-react";
import { tw } from "../theme";

// Petit cadenas affiché à côté d'une entrée de menu que le palier d'abonnement ne donne pas.
// L'entrée reste visible et cliquable : la page affiche l'écran « palier requis ».
const CadenasPalier = ({ size = 13, className = "", raison = "Palier supérieur requis" }) => (
  <span title={raison} aria-label={raison} className={`shrink-0 ${className}`}>
    <Lock size={size} className={tw.textMuted} />
  </span>
);

export default CadenasPalier;
