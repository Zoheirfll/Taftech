import React from "react";

/**
 * Funnel en divs (pas de SVG) — chaque étape est une barre centrée dont la largeur
 * est proportionnelle à son count vs la 1ère étape, avec un plancher minWidth pour
 * que le libellé reste toujours lisible (l'ancienne version SVG coupait le texte
 * quand le conteneur devenait plus étroit que le viewBox fixe).
 * etapes: [{ label, count, pct, couleur }]
 */
const FunnelChart = ({ etapes = [] }) => {
  if (!etapes.length) return null;
  const total = etapes[0]?.count || 1;
  const largeurMinPct = 46;

  return (
    <div className="flex flex-col items-center gap-1.5 w-full" role="img" aria-label="Pipeline de recrutement">
      {etapes.map((etape) => {
        const ratio = total ? etape.count / total : 0;
        const largeurPct = Math.max(largeurMinPct, Math.round(ratio * 100));
        return (
          <div
            key={etape.label}
            title={`${etape.label} — ${etape.count} (${etape.pct}%)`}
            className="h-9 flex items-center justify-center rounded-lg text-white text-xs font-semibold px-2 min-w-0 truncate"
            style={{ width: `${largeurPct}%`, backgroundColor: etape.couleur }}
          >
            {etape.label} · {etape.count} ({etape.pct}%)
          </div>
        );
      })}
    </div>
  );
};

export default FunnelChart;
