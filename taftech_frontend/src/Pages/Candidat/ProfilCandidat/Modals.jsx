// Point d'entrée des modales du profil candidat : distribue les props aux 6 modales (une par fichier).
import { ModalInfos } from "./ModalInfos";
import { ModalPreferences } from "./ModalPreferences";
import { ModalLiens } from "./ModalLiens";
import { ModalCV } from "./ModalCV";
import { ModalExperience } from "./ModalExperience";
import { ModalFormation } from "./ModalFormation";

export const Modals = (props) => (
  <>
    <ModalInfos {...props} />
    <ModalPreferences {...props} />
    <ModalLiens {...props} />
    <ModalCV {...props} />
    <ModalExperience {...props} />
    <ModalFormation {...props} />
  </>
);
