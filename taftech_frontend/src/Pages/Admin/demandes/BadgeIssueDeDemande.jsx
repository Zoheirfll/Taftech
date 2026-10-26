import React from "react";
import { tw } from "../../../theme";

/** Repère une entrée du référentiel créée en acceptant une demande d'ajout (champ `issue_de_demande`). */
const BadgeIssueDeDemande = () => (
  <span
    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap ${tw.bgSuccessSoft} ${tw.textSuccess}`}
    title="Cette entrée a été ajoutée au référentiel en acceptant une demande d'utilisateur."
  >
    Issue d'une demande
  </span>
);

export default BadgeIssueDeDemande;
