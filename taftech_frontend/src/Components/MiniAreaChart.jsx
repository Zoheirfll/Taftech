import React, { useState, useRef } from "react";
import { Download, ChevronDown } from "lucide-react";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Graphique évolution/pipeline (recharts ComposedChart) — jusqu'à N séries sur un
// même axe temporel, courbe optionnelle "période précédente" en pointillé, et une
// série secondaire optionnelle sur un axe droit indépendant (ex: taux de conversion %).
// data: [{ label, [seriesKey]: number, ... }]
// series: [{ key, color, label }]
const CustomTooltip = ({ active, payload, label, series, secondarySeries, compareValues, compareLabel, data }) => {
  if (!active || !payload?.length) return null;
  const idx = data.findIndex((d) => d.label === label);
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {series.map((s) => (
        <p key={s.key} className="font-medium" style={{ color: s.color }}>
          {s.label} : {data[idx]?.[s.key] || 0}
        </p>
      ))}
      {compareValues && (
        <p className="font-medium text-slate-500">
          {compareLabel} : {compareValues[idx] || 0}
        </p>
      )}
      {secondarySeries && (
        <p className="font-medium" style={{ color: secondarySeries.color }}>
          {secondarySeries.label} : {data[idx]?.[secondarySeries.key] || 0}%
        </p>
      )}
    </div>
  );
};

const MiniAreaChart = ({
  data,
  series,
  height = 160,
  chartType = "area",
  compareValues = null,
  compareLabel = "Période précédente",
  secondarySeries = null,
  secondaryMax = 100,
  exportTitle = "graphique",
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const containerRef = useRef(null);
  const exportMenuRef = useRef(null);

  React.useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  const chartData = data.map((d, i) => ({
    ...d,
    __compare: compareValues ? compareValues[i] || 0 : undefined,
  }));

  const exportExcel = async () => {
    setShowExportMenu(false);
    const cols = ["Période", ...series.map((s) => s.label), ...(secondarySeries ? [secondarySeries.label] : [])];
    const rows = data.map((d) => [
      d.label,
      ...series.map((s) => d[s.key] || 0),
      ...(secondarySeries ? [d[secondarySeries.key] || 0] : []),
    ]);
    try {
      await jobsService.exporterGraphiqueExcel(exportTitle, cols, rows);
    } catch (err) {
      toast.error("Erreur lors de l'export Excel.");
    }
  };

  const exportPNG = () => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;
    const { width, height: h } = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", width);
    clone.setAttribute("height", h);
    const svgStr = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `${exportTitle}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      });
    };
    img.src = url;
    setShowExportMenu(false);
  };

  const isBar = chartType === "bar";

  return (
    <div className="w-full">
      <div className="flex justify-end mb-1 relative" ref={exportMenuRef}>
        <button
          type="button"
          onClick={() => setShowExportMenu((p) => !p)}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-50"
        >
          <Download size={12} /> Exporter <ChevronDown size={11} />
        </button>
        {showExportMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden min-w-[120px]">
            <button type="button" onClick={exportPNG} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50">
              Image (PNG)
            </button>
            <button type="button" onClick={exportExcel} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50">
              Données (Excel)
            </button>
          </div>
        )}
      </div>

      <div ref={containerRef} style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: secondarySeries ? 8 : 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b", fontWeight: 500 }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            {secondarySeries && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, secondaryMax]}
                tick={{ fontSize: 9, fill: secondarySeries.color, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
            )}
            <Tooltip
              content={
                <CustomTooltip
                  series={series}
                  secondarySeries={secondarySeries}
                  compareValues={compareValues}
                  compareLabel={compareLabel}
                  data={data}
                />
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 11, fontWeight: 500, color: "#475569" }}
              iconType="circle"
              iconSize={8}
            />

            {isBar
              ? series.map((s) => (
                  <Bar key={s.key} yAxisId="left" dataKey={s.key} name={s.label} fill={s.color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                ))
              : series.map((s) => (
                  <Area
                    key={s.key}
                    yAxisId="left"
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.08}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                ))}

            {!isBar && compareValues && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="__compare"
                name={compareLabel}
                stroke={series[0]?.color || "#94a3b8"}
                strokeWidth={1.75}
                strokeDasharray="4 3"
                dot={false}
                opacity={0.55}
                isAnimationActive={false}
              />
            )}

            {!isBar && secondarySeries && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={secondarySeries.key}
                name={secondarySeries.label}
                stroke={secondarySeries.color}
                strokeWidth={2}
                strokeDasharray="2 2"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MiniAreaChart;
