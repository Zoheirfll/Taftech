import React from "react";
import { PieChart, Pie, Cell } from "recharts";

/**
 * Donut compact (recharts) — segments = sources de candidatures, centré sur
 * le total. Même API que l'ancienne version SVG faite main.
 * data: [{ key, label, count, pct, couleur }]
 */
const DonutChart = ({ data = [], size = 96, strokeWidth = 14 }) => {
  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);
  const segments = data.filter((d) => d.count > 0);
  const innerRadius = size / 2 - strokeWidth;
  const outerRadius = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label="Répartition des sources de candidatures">
      <PieChart width={size} height={size}>
        <Pie
          data={segments.length ? segments : [{ key: "vide", count: 1, couleur: "#e2e8f0" }]}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={90}
          endAngle={-270}
          stroke="none"
          isAnimationActive={false}
        >
          {(segments.length ? segments : [{ key: "vide", couleur: "#e2e8f0" }]).map((d) => (
            <Cell key={d.key} fill={d.couleur} />
          ))}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-base font-bold text-slate-900 leading-none">{total}</span>
        <span className="text-[9px] text-slate-500 mt-0.5">total</span>
      </div>
    </div>
  );
};

export default DonutChart;
