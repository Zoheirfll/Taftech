// Filtres partagés des graphiques : choix de l'offre et de la période d'évolution.
import { SlidersHorizontal } from "lucide-react";
import { tw } from "../../../theme";
import { PERIODES_EVOLUTION } from "./constantes";

export const FiltresGraphiques = ({ offres, filtreOffreId, setFiltreOffreId, periodeEvolution, setPeriodeEvolution }) => (
  <div className="flex flex-wrap items-center gap-2 mb-3">
    <SlidersHorizontal size={13} className={tw.textMuted} />
    <select
      value={filtreOffreId}
      onChange={(e) => setFiltreOffreId(e.target.value)}
      className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5 max-w-[220px]`}
    >
      <option value="toutes">Toutes les offres</option>
      {offres.map((o) => (
        <option key={o.id} value={o.id}>{o.titre}</option>
      ))}
    </select>
    <select
      value={periodeEvolution}
      onChange={(e) => setPeriodeEvolution(e.target.value)}
      className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5`}
    >
      {PERIODES_EVOLUTION.map((p) => (
        <option key={p.key} value={p.key}>{p.label}</option>
      ))}
    </select>
  </div>
);
