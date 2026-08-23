import React from "react";

/**
 * Donut SVG compact — segments empilés via stroke-dasharray, centré sur le total.
 * data: [{ key, label, count, pct, couleur }]
 */
const DonutChart = ({ data = [], size = 96, strokeWidth = 14 }) => {
  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumule = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Répartition des sources de candidatures">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      {total > 0 &&
        data
          .filter((d) => d.count > 0)
          .map((d) => {
            const fraction = d.count / total;
            const longueur = fraction * circumference;
            const decalage = -(cumule / total) * circumference;
            cumule += d.count;
            return (
              <circle
                key={d.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.couleur}
                strokeWidth={strokeWidth}
                strokeDasharray={`${longueur} ${circumference - longueur}`}
                strokeDashoffset={decalage}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
              />
            );
          })}
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="16" fontWeight="700" fill="#0f172a">
        {total}
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9" fill="#64748b">
        total
      </text>
    </svg>
  );
};

export default DonutChart;
