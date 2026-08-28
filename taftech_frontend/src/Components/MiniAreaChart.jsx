import React, { useState, useRef } from "react";
import { Download, ChevronDown } from "lucide-react";

// Petit graphique en aire/barres (SVG inline, sans librairie) — jusqu'à N séries sur un même axe temporel.
// data: [{ label, [seriesKey]: number, ... }]
// series: [{ key, color, label }]
// compareValues (optionnel) : tableau de nombres aligné sur data (même longueur), série[0] de la période précédente, tracée en pointillé
// secondarySeries (optionnel) : { key, color, label } tracée sur un axe droit indépendant 0-secondaryMax (ex: taux de conversion %)
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
  const [hoverIdx, setHoverIdx] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const svgRef = useRef(null);
  const exportMenuRef = useRef(null);

  const H = height,
    padLeft = 30,
    padRight = secondarySeries ? 30 : 16,
    padY = 16;
  // Largeur adaptée au nombre de points : peu de points (vue 6m/12m) tient sur un écran mobile
  // sans scroll forcé, beaucoup de points (vue 7j/30j) déclenche un scroll horizontal volontaire.
  const W = Math.max(320, data.length * 30);
  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => series.map((s) => d[s.key] || 0)),
    ...(compareValues || []),
  );
  const stepX = data.length > 1 ? (W - padLeft - padRight) / (data.length - 1) : 0;
  const scaleY = (v) => H - padY - (v / maxVal) * (H - padY * 2);
  const scaleY2 = (v) => H - padY - (v / secondaryMax) * (H - padY * 2);
  const scaleX = (i) => padLeft + i * stepX;

  // Lissage Catmull-Rom → Bézier : adoucit les angles vifs (ex. un seul mois avec de
  // l'activité entouré de zéros) sans librairie externe. Les points de contrôle sont
  // clampés dans la zone du graphique pour éviter tout dépassement visuel (overshoot)
  // au-dessus du max ou en dessous de la ligne 0.
  const clampY = (y) => Math.min(H - padY, Math.max(padY, y));
  const smoothPath = (pts) => {
    if (pts.length < 2) return "";
    if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = clampY(p1.y + (p2.y - p0.y) / 6);
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = clampY(p2.y - (p3.y - p1.y) / 6);
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
    }
    return d;
  };

  React.useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  const exportCSV = () => {
    const cols = ["Période", ...series.map((s) => s.label), ...(secondarySeries ? [secondarySeries.label] : [])];
    const rows = data.map((d) => [
      d.label,
      ...series.map((s) => d[s.key] || 0),
      ...(secondarySeries ? [d[secondarySeries.key] || 0] : []),
    ]);
    const csv = [cols, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportTitle}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportPNG = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("width", W);
    clone.setAttribute("height", H + 22);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.removeAttribute("class");
    const svgStr = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = (H + 22) * scale;
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
  const groupW = stepX * 0.6;
  const barW = isBar && series.length > 0 ? (groupW - 2 * (series.length - 1)) / series.length : 0;

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
            <button type="button" onClick={exportCSV} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50">
              Données (CSV)
            </button>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H + 22}`} className="w-full" style={{ minWidth: Math.min(W, 400) }}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line
                x1={padLeft}
                x2={W - padRight}
                y1={scaleY(maxVal * f)}
                y2={scaleY(maxVal * f)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            </g>
          ))}

          {hoverIdx !== null && (
            <line
              x1={scaleX(hoverIdx)}
              x2={scaleX(hoverIdx)}
              y1={padY}
              y2={H - padY}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}

          {isBar
            ? series.map((s, si) => (
                <g key={s.key}>
                  {data.map((d, i) => {
                    const val = d[s.key] || 0;
                    const x = scaleX(i) - groupW / 2 + si * (barW + 2);
                    const y = scaleY(val);
                    return (
                      <rect
                        key={i}
                        x={x}
                        y={y}
                        width={Math.max(1, barW)}
                        height={Math.max(0, H - padY - y)}
                        fill={s.color}
                        opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.35}
                        onMouseEnter={() => setHoverIdx(i)}
                        onMouseLeave={() => setHoverIdx(null)}
                        onClick={() => setHoverIdx((h) => (h === i ? null : i))}
                        style={{ cursor: "pointer" }}
                        rx="2"
                      />
                    );
                  })}
                </g>
              ))
            : series.map((s) => {
                const pts = data.map((d, i) => ({ x: scaleX(i), y: scaleY(d[s.key] || 0) }));
                const linePath = smoothPath(pts);
                const areaPath = `${linePath} L ${scaleX(data.length - 1)},${scaleY(0)} L ${scaleX(0)},${scaleY(0)} Z`;
                return (
                  <g key={s.key}>
                    <path d={areaPath} fill={s.color} fillOpacity="0.08" stroke="none" />
                    <path
                      d={linePath}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {data.map((d, i) => (
                      <g
                        key={i}
                        onMouseEnter={() => setHoverIdx(i)}
                        onMouseLeave={() => setHoverIdx(null)}
                        onClick={() => setHoverIdx((h) => (h === i ? null : i))}
                        style={{ cursor: "pointer" }}
                      >
                        <circle cx={scaleX(i)} cy={scaleY(d[s.key] || 0)} r={hoverIdx === i ? 5 : 3} fill={s.color} />
                        <circle cx={scaleX(i)} cy={scaleY(d[s.key] || 0)} r="10" fill="transparent" />
                      </g>
                    ))}
                  </g>
                );
              })}

          {!isBar && compareValues && (
            <polyline
              points={compareValues.map((v, i) => `${scaleX(i)},${scaleY(v || 0)}`).join(" ")}
              fill="none"
              stroke={series[0]?.color || "#94a3b8"}
              strokeWidth="1.75"
              strokeDasharray="4,3"
              strokeLinecap="round"
              opacity="0.55"
            />
          )}

          {!isBar && secondarySeries && (
            <polyline
              points={data.map((d, i) => `${scaleX(i)},${scaleY2(d[secondarySeries.key] || 0)}`).join(" ")}
              fill="none"
              stroke={secondarySeries.color}
              strokeWidth="2"
              strokeDasharray="2,2"
              strokeLinecap="round"
            />
          )}

          {data.map((d, i) => (
            <text key={i} x={scaleX(i)} y={H + 14} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="500">
              {d.label}
            </text>
          ))}

          {/* Labels d'axe Y rendus en dernier (au-dessus des lignes/points) — un fond blanc
              derrière chaque chiffre évite qu'il se confonde avec une courbe posée pile sur
              cette graduation (typiquement la ligne à 0). */}
          {[0, 0.5, 1].map((f) => (
            <g key={`ylabel-${f}`}>
              <rect x={padLeft - 22} y={scaleY(maxVal * f) - 7} width="20" height="12" fill="white" />
              <text x={padLeft - 6} y={scaleY(maxVal * f) + 3} textAnchor="end" fontSize="9" fill="#64748b" fontWeight="600">
                {Math.round(maxVal * f)}
              </text>
              {secondarySeries && (
                <React.Fragment>
                  <rect x={W - padRight + 2} y={scaleY(maxVal * f) - 7} width="26" height="12" fill="white" />
                  <text x={W - padRight + 6} y={scaleY(maxVal * f) + 3} textAnchor="start" fontSize="9" fill={secondarySeries.color} fontWeight="600">
                    {Math.round(secondaryMax * f)}%
                  </text>
                </React.Fragment>
              )}
            </g>
          ))}
        </svg>
      </div>

      {hoverIdx !== null && (
        <div className="mt-1.5 px-1 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700">{data[hoverIdx].label} :</span>
          {series.map((s) => (
            <span key={s.key} className="font-medium" style={{ color: s.color }}>
              {s.label} : {data[hoverIdx][s.key] || 0}
            </span>
          ))}
          {compareValues && (
            <span className="font-medium text-slate-500">
              {compareLabel} : {compareValues[hoverIdx] || 0}
            </span>
          )}
          {secondarySeries && (
            <span className="font-medium" style={{ color: secondarySeries.color }}>
              {secondarySeries.label} : {data[hoverIdx][secondarySeries.key] || 0}%
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 mt-1.5 px-1 flex-wrap">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-slate-600 font-medium">{s.label}</span>
          </div>
        ))}
        {compareValues && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0 border-t-2 border-dashed shrink-0" style={{ borderColor: series[0]?.color || "#94a3b8" }} />
            <span className="text-xs text-slate-500 font-medium">{compareLabel}</span>
          </div>
        )}
        {secondarySeries && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: secondarySeries.color }} />
            <span className="text-xs text-slate-600 font-medium">{secondarySeries.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniAreaChart;
