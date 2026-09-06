import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

const DEFAULT_CRITERES = [
  { key: "specialite", label: "Spécialité", max: 25 },
  { key: "diplome", label: "Diplôme", max: 20 },
  { key: "experience", label: "Expérience", max: 20 },
  { key: "competences", label: "Compétences", max: 15 },
  { key: "region", label: "Localisation & mobilité", max: 20 },
];

/**
 * Radar de matching (recharts) — remplace les 2 implémentations SVG faites
 * main (candidat MesCandidatures + recruteur DetailCandidature). Chaque
 * critère est normalisé en % de son max pour partager une seule échelle
 * 0-100, la couleur du contour bascule selon le score total réel (pas le %).
 */
const MatchingRadarChart = ({ scores, criteres = DEFAULT_CRITERES, height = 220 }) => {
  const total = criteres.reduce((acc, c) => acc + (scores?.[c.key] ?? 0), 0);
  const color = total >= 80 ? "#059669" : total >= 60 ? "#d97706" : "#dc2626";
  const data = criteres.map((c) => ({
    label: c.label,
    pct: Math.round(Math.min((scores?.[c.key] ?? 0) / c.max, 1) * 100),
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fontSize: 10, fontWeight: 600, fill: "#475569" }}
          />
          <Radar
            dataKey="pct"
            stroke={color}
            fill={color}
            fillOpacity={0.18}
            strokeWidth={2}
            isAnimationActive={false}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MatchingRadarChart;
