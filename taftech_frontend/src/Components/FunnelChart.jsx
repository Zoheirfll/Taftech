import React from "react";

/**
 * Funnel SVG : trapèzes empilés, largeur proportionnelle au count de la première étape.
 * etapes: [{ label, count, pct, couleur }]
 * viewBox fixe + width="100%" pour rester responsive (évite le rognage sur mobile
 * qu'un <svg width="320"> figé provoquait quand le conteneur était plus étroit).
 */
const FunnelChart = ({ etapes = [] }) => {
  if (!etapes.length) return null;
  const largeurMax = 320;
  const largeurMin = 80;
  const hauteurEtape = 42;
  const total = etapes[0]?.count || 1;

  const largeurPour = (count) => {
    const ratio = total ? count / total : 0;
    return Math.max(largeurMin, largeurMax * ratio);
  };

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-[320px] mx-auto" role="img" aria-label="Pipeline de recrutement">
      {etapes.map((etape, i) => {
        const wActuelle = largeurPour(etape.count);
        const wSuivante = i < etapes.length - 1 ? largeurPour(etapes[i + 1].count) : wActuelle;
        const xActuelle = (largeurMax - wActuelle) / 2;
        const xSuivante = (largeurMax - wSuivante) / 2;
        return (
          <svg
            key={etape.label}
            viewBox={`0 0 ${largeurMax} ${hauteurEtape}`}
            width="100%"
            height={hauteurEtape}
            preserveAspectRatio="xMidYMid meet"
          >
            <polygon
              points={`${xActuelle},0 ${xActuelle + wActuelle},0 ${xSuivante + wSuivante},${hauteurEtape - 4} ${xSuivante},${hauteurEtape - 4}`}
              fill={etape.couleur}
            />
            <text x={largeurMax / 2} y={hauteurEtape / 2 - 2} textAnchor="middle" fontSize="12" fontWeight="600" fill="white">
              {etape.label}  {etape.count}  ({etape.pct}%)
            </text>
          </svg>
        );
      })}
    </div>
  );
};

export default FunnelChart;
