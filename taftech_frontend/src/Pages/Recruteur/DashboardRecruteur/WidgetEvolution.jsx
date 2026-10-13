// Widget « Évolution » : courbe/barres des candidatures et recrutements, comparaison et taux de conversion.
import { TrendingUp, LineChart, BarChart3, History, Percent } from "lucide-react";
import MiniAreaChart from "../../../Components/MiniAreaChart";
import { tw } from "../../../theme";

export const WidgetEvolution = ({
  evolution,
  evolutionPrevValues,
  chartType,
  setChartType,
  showComparaison,
  setShowComparaison,
  showConversion,
  setShowConversion,
}) => (
  <div className={`${tw.cardColors} rounded-2xl p-5`}>
    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
      <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2`}>
        <TrendingUp size={15} className={tw.textTeal} /> Évolution
      </h2>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setChartType("area")}
          title="Courbe"
          className={`p-1.5 rounded-lg border ${tw.borderBase} ${chartType === "area" ? tw.bgTealSoft + " " + tw.textTeal : `${tw.surface} ${tw.textMuted}`}`}
        >
          <LineChart size={14} />
        </button>
        <button
          type="button"
          onClick={() => setChartType("bar")}
          title="Barres"
          className={`p-1.5 rounded-lg border ${tw.borderBase} ${chartType === "bar" ? tw.bgTealSoft + " " + tw.textTeal : `${tw.surface} ${tw.textMuted}`}`}
        >
          <BarChart3 size={14} />
        </button>
      </div>
    </div>
    <div className="flex items-center gap-3 flex-wrap mb-3">
      <label className={`flex items-center gap-1.5 text-xs font-medium ${chartType === "bar" ? "opacity-40" : "cursor-pointer"} ${tw.textMuted700}`}>
        <input
          type="checkbox"
          checked={showComparaison}
          disabled={chartType === "bar"}
          onChange={(e) => setShowComparaison(e.target.checked)}
          className="rounded"
        />
        <History size={12} /> Comparer à la période précédente
      </label>
      <label className={`flex items-center gap-1.5 text-xs font-medium ${chartType === "bar" ? "opacity-40" : "cursor-pointer"} ${tw.textMuted700}`}>
        <input
          type="checkbox"
          checked={showConversion}
          disabled={chartType === "bar"}
          onChange={(e) => setShowConversion(e.target.checked)}
          className="rounded"
        />
        <Percent size={12} /> Taux de conversion
      </label>
    </div>
    <MiniAreaChart
      data={evolution}
      height={190}
      chartType={chartType}
      exportTitle="evolution-candidatures"
      series={[
        { key: "candidatures", color: "#204883", label: "Candidatures reçues" },
        { key: "recrutements", color: "#059669", label: "Recrutements" },
      ]}
      compareValues={evolutionPrevValues}
      secondarySeries={showConversion && chartType !== "bar" ? { key: "tauxConversion", color: "#ea580c", label: "Taux de conversion (%)" } : null}
    />
  </div>
);
