// Sélecteur de période (dates début/fin) et bouton de téléchargement du rapport.
import { Calendar, FileDown } from "lucide-react";
import { tw } from "../../../theme";

export const BarrePeriodeRapport = ({ dateDebut, setDateDebut, dateFin, setDateFin, handleTelechargerRapport }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
    <div className="flex items-center gap-2">
      <Calendar size={14} className={tw.textMuted} />
      <input
        type="date"
        value={dateDebut}
        onChange={(e) => setDateDebut(e.target.value)}
        className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5`}
      />
      <span className={`text-xs ${tw.textMuted}`}>→</span>
      <input
        type="date"
        value={dateFin}
        onChange={(e) => setDateFin(e.target.value)}
        className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5`}
      />
    </div>
    <button
      type="button"
      onClick={handleTelechargerRapport}
      className={`inline-flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-xs font-semibold rounded-lg transition-colors ${tw.surface} ${tw.textMuted700} ${tw.hoverSurfaceMuted}`}
    >
      <FileDown size={14} /> Télécharger le rapport
    </button>
  </div>
);
