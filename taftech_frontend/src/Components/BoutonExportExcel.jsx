// Bouton « Exporter Excel » des pages d'administration : un seul comportement pour toutes les listes
// (chargement, erreur lisible, téléchargement du classeur, pas de double clic).
// `params` = les filtres de la liste affichée : le serveur applique les mêmes, l'export contient ce que l'on voit.
import { useState } from "react";
import { Download } from "lucide-react";
import { notifier } from "../utils/notifier";
import { adminService } from "../Services/adminService";
import { reportError } from "../utils/errorReporter";
import { tw } from "../theme";

const telecharger = (contenu, nomFichier) => {
  const url = window.URL.createObjectURL(new Blob([contenu]));
  const lien = document.createElement("a");
  lien.href = url;
  lien.setAttribute("download", nomFichier);
  document.body.appendChild(lien);
  lien.click();
  lien.parentNode.removeChild(lien);
  window.URL.revokeObjectURL(url);
};

const BoutonExportExcel = ({ ressource, params = {}, nomFichier, libelle = "Exporter Excel" }) => {
  const [enCours, setEnCours] = useState(false);

  const exporter = async () => {
    if (enCours) return;
    setEnCours(true);
    const toastId = notifier.chargement("Génération du fichier en cours");
    try {
      const contenu = await adminService.exporterListe(ressource, params);
      telecharger(contenu, `${nomFichier}.xlsx`);
      notifier.succes("Téléchargement terminé");
    } catch (err) {
      notifier.echec("Exportation impossible", err);
      reportError(`ECHEC_EXPORT_EXCEL_${ressource.toUpperCase().replace(/-/g, "_")}`, err);
    } finally {
      notifier.fermer(toastId);
      setEnCours(false);
    }
  };

  return (
    <button
      type="button"
      onClick={exporter}
      disabled={enCours}
      className={`flex items-center gap-2 px-4 py-2 ${tw.buttonSuccessSolid} text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-60 ${tw.focusRing}`}
    >
      <Download size={15} /> {libelle}
    </button>
  );
};

export default BoutonExportExcel;
