// Widget « Sources des candidatures » : donut + légende, avec sélecteur de période indépendant.
import DonutChart from "../../../Components/DonutChart";
import { tw } from "../../../theme";
import { PERIODES_EVOLUTION } from "./constantes";

export const WidgetSources = ({ sourcesDonut, periodeSources, setPeriodeSources }) => (
  <div className={`${tw.cardColors} rounded-2xl p-5`}>
    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
      <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2`}>
        Sources des candidatures
      </h2>
      <select
        value={periodeSources}
        onChange={(e) => setPeriodeSources(e.target.value)}
        className={`${tw.inputColorsWhite} rounded-lg text-xs px-2.5 py-1.5`}
      >
        {PERIODES_EVOLUTION.map((p) => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </select>
    </div>
    <div className="flex items-center gap-4">
      <DonutChart data={sourcesDonut} />
      <div className="flex-1 space-y-2.5 min-w-0">
        {sourcesDonut.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.couleur }} />
            <span className={`text-xs flex-1 truncate ${tw.textMuted700}`}>{s.label}</span>
            <span className={`text-xs font-bold shrink-0 ${tw.textStrong}`}>{s.count}</span>
            <span className={`text-[10px] w-9 text-right shrink-0 ${tw.textMuted}`}>{s.count > 0 ? `${s.pct}%` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
