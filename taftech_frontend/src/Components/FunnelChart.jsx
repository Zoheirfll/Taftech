import React from "react";
import {
  FunnelChart as RFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700">{d.label}</p>
      <p className="text-slate-600">
        {d.count} candidature{d.count > 1 ? "s" : ""} ({d.pct}%)
      </p>
    </div>
  );
};

/**
 * Pipeline de recrutement (recharts Funnel, responsive) — même API que
 * l'ancienne version en divs empilés. etapes: [{ label, count, pct, couleur }]
 */
const FunnelChart = ({ etapes = [] }) => {
  if (!etapes.length) return null;
  const height = Math.max(180, etapes.length * 46 + 10);
  // Plancher visuel : une étape à 0 (Présélection/Retenu/Refusé souvent vides)
  // reste une bande lisible avec son libellé au lieu d'un fil invisible —
  // seule la largeur affichée est plancherée, count/pct affichés restent réels.
  const maxCount = Math.max(1, ...etapes.map((e) => e.count || 0));
  const data = etapes.map((e) => ({ ...e, name: e.label, value: Math.max(e.count || 0, maxCount * 0.35) }));

  return (
    <div className="w-full" style={{ height }} role="img" aria-label="Pipeline de recrutement">
      <ResponsiveContainer width="100%" height="100%">
        <RFunnelChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <Tooltip content={<CustomTooltip />} />
          {/* lastShapeType="rectangle" : sans ça, recharts referme la dernière étape
              en pointe (largeur 0) — son libellé se retrouve écrasé/illisible. */}
          <Funnel dataKey="value" data={data} lastShapeType="rectangle" isAnimationActive={false}>
            <LabelList
              position="center"
              fill="#fff"
              stroke="none"
              fontSize={11}
              fontWeight={600}
              dataKey={(d) => `${d.label} · ${d.count}`}
            />
            {data.map((d) => (
              <Cell key={d.label} fill={d.couleur} />
            ))}
          </Funnel>
        </RFunnelChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FunnelChart;
