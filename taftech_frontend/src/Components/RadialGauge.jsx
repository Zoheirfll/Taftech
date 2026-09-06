import React from "react";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

/**
 * Jauge circulaire compacte (recharts RadialBarChart) — remplace les anneaux
 * SVG faits main (ProfilCandidat, CandidatDashboard). value en 0-100, la
 * couleur bascule automatiquement selon des seuils (par défaut succès ≥80,
 * attention ≥40, sinon couleur de marque) — mêmes seuils que l'ancien code.
 */
const RadialGauge = ({
  value = 0,
  size = 64,
  strokeWidth = 9,
  thresholdHigh = 80,
  thresholdMid = 40,
  colorHigh = "#059669",
  colorMid = "#d97706",
  colorLow = "#4f46e5",
  trackColor = "#f1f5f9",
  label,
  labelClassName = "text-sm font-extrabold text-slate-900",
}) => {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= thresholdHigh ? colorHigh : pct >= thresholdMid ? colorMid : colorLow;
  const data = [{ value: pct, fill: color }];

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <RadialBarChart
        width={size}
        height={size}
        cx="50%"
        cy="50%"
        innerRadius={size / 2 - strokeWidth}
        outerRadius={size / 2}
        barSize={strokeWidth}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
        <RadialBar
          background={{ fill: trackColor }}
          dataKey="value"
          cornerRadius={strokeWidth / 2}
          isAnimationActive={false}
        />
      </RadialBarChart>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={labelClassName}>{label ?? `${Math.round(pct)}%`}</span>
      </div>
    </div>
  );
};

export default RadialGauge;
