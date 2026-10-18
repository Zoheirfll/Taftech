import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { colors } from "../theme";

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// « 2026-03 » → « mars 26 » (sans passer par Date : évite les décalages de fuseau).
export const libelleMois = (cle) => {
  const [annee, mois] = String(cle).split("-");
  const nom = MOIS_COURTS[Number(mois) - 1];
  return nom ? `${nom} ${annee.slice(2)}` : cle;
};

const AXE = { fontSize: 11, fill: colors.neutral[500] };

/**
 * Courbes mensuelles. series: [{ cle, label, couleur }] ; data: [{ mois, [cle]: nombre }].
 * `unite` s'ajoute aux valeurs de l'infobulle (ex. « DA »).
 */
export const EvolutionChart = ({ data = [], series = [], ariaLabel, unite = "", hauteur = 220 }) => (
  <div className="w-full" style={{ height: hauteur }} role="img" aria-label={ariaLabel}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.neutral[200]} />
        <XAxis dataKey="mois" tickFormatter={libelleMois} tick={AXE} minTickGap={16} />
        <YAxis tick={AXE} allowDecimals={false} />
        <Tooltip
          labelFormatter={libelleMois}
          formatter={(valeur, nom) => [`${valeur}${unite ? ` ${unite}` : ""}`, nom]}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s) => (
          <Line
            key={s.cle}
            type="monotone"
            dataKey={s.cle}
            name={s.label}
            stroke={s.couleur}
            strokeWidth={2}
            dot={data.length <= 12}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

/** Histogramme de répartition. data: [{ tranche, nb }]. */
export const DistributionChart = ({ data = [], ariaLabel, couleur = colors.primary[600], hauteur = 200 }) => (
  <div className="w-full" style={{ height: hauteur }} role="img" aria-label={ariaLabel}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.neutral[200]} />
        <XAxis dataKey="tranche" tick={AXE} />
        <YAxis tick={AXE} allowDecimals={false} />
        <Tooltip formatter={(valeur) => [valeur, "Candidatures"]} />
        <Bar dataKey="nb" fill={couleur} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
