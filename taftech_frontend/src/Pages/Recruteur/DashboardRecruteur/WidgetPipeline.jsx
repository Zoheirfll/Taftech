// Widget « Pipeline de recrutement » : funnel 4 étapes + barres de répartition par statut.
import { GitBranch } from "lucide-react";
import FunnelChart from "../../../Components/FunnelChart";
import { tw } from "../../../theme";
import { PIPELINE_STAGES } from "./constantes";

export const WidgetPipeline = ({ funnelEtapes, pipeline }) => (
  <div className={`${tw.cardColors} rounded-2xl p-5`}>
    <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2 mb-4`}>
      <GitBranch size={15} className={tw.textTeal} /> Pipeline de recrutement
    </h2>
    <div className="flex justify-center mb-4">
      <FunnelChart etapes={funnelEtapes} />
    </div>
    <div className="space-y-2.5">
      {PIPELINE_STAGES.map((stage) => {
        const count = pipeline.counts[stage.key];
        const pct = (count / pipeline.max) * 100;
        const pctTotal = pipeline.total > 0 ? Math.round((count / pipeline.total) * 100) : 0;
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <span className={`text-xs w-24 shrink-0 ${tw.textMuted700}`}>{stage.label}</span>
            <div className={`flex-1 h-2.5 ${tw.surfaceSubtle} rounded-full overflow-hidden`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: stage.color }}
              />
            </div>
            <span className={`text-xs font-bold w-8 text-right shrink-0 ${tw.textStrong}`}>{count}</span>
            <span className={`text-[10px] w-9 text-right shrink-0 ${tw.textMuted}`}>{count > 0 ? `${pctTotal}%` : ""}</span>
          </div>
        );
      })}
    </div>
  </div>
);
