import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Graphiques de la page Statistiques recruteur (recharts, même approche que les
// composants Stat* du projet SOMIZ) : tooltip commun, aire multi-séries, donut avec
// total au centre, histogramme, mini-courbe pour les cartes KPI.

const AXIS_TICK = { fontSize: 11, fill: "#475569", fontFamily: "inherit" };

export const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label !== undefined && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-1.5 text-slate-700">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.color || p.payload?.fill }}
          />
          {p.name} : <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export const StatSparkline = ({ data, dataKey, color }) => (
  <div className="h-10 -mx-1" aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// series: [{ key, label, color }] — data: [{ label, [key]: n }]
export const StatAreaChart = ({ data, series, height = 260 }) => (
  <div style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontFamily: "inherit" }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// data: [{ nom, count, color? }] — légende maison à droite, hauteur fixe scrollable.
export const StatDonutChart = ({ data, height = 200 }) => {
  const filtered = (data || []).filter((d) => d.count > 0);
  if (filtered.length === 0) {
    return <p className="text-sm text-slate-600 text-center py-8">Aucune donnée sur cette période.</p>;
  }
  const total = filtered.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex items-center gap-4" style={{ minHeight: height }}>
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="count"
              nameKey="nom"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {filtered.map((d, i) => (
                <Cell key={d.nom} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{total}</span>
          <span className="text-[11px] text-slate-600">au total</span>
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-1.5 overflow-y-auto" style={{ maxHeight: height }}>
        {filtered.map((d) => (
          <li key={d.nom} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
            <span className="truncate text-slate-700 font-medium">{d.nom}</span>
            <span className="ml-auto font-mono tabular-nums text-slate-600">
              {d.count} <span className="text-slate-400">({Math.round((d.count / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// data: [{ label, count, color? }] — histogramme vertical.
export const StatHistogram = ({ data, height = 220, color = "#3a8226" }) => (
  <div style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="count" name="Candidatures" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color || color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);
