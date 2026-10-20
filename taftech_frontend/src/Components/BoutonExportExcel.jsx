// Bouton « Exporter Excel » des pages d'administration : un seul comportement pour toutes les listes
// (chargement, erreur lisible, téléchargement du classeur, pas de double clic).
// `params` = les filtres de la liste affichée : le serveur applique les mêmes, l'export contient ce que l'on voit.
import { useState } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from "../Services/adminService";
import { reportError } from "../utils/errorReporter";
import { apiErrMsg } from "../utils/apiErrMsg";
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
    const toastId = toast.loading("Génération du fichier...");
    try {
      const contenu = await adminService.exporterListe(ressource, params);
      telecharger(contenu, `${nomFichier}.xlsx`);
      toast.success("Téléchargement réussi !");
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de l'exportation."));
      reportError(`ECHEC_EXPORT_EXCEL_${ressource.toUpperCase().replace(/-/g, "_")}`, err);
    } finally {
      toast.dismiss(toastId);
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
