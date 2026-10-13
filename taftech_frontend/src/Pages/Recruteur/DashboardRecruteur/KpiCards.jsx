// Cartes KPI (offres actives, candidatures, entretiens, recrutements, conversion) avec variation et sparkline.
import { Building2, Users, Calendar, CheckCircle, TrendingUp } from "lucide-react";
import { StatSparkline } from "../../../Components/StatCharts";
import { tw } from "../../../theme";

const KPI_DEFS = [
  { cle: "offres_actives", label: "Offres actives", icon: Building2 },
  { cle: "candidatures_recues", label: "Candidatures reçues", icon: Users, spark: "candidatures", couleur: "#204883" },
  { cle: "candidats_entretien", label: "Candidats en entretien", icon: Calendar },
  { cle: "recrutements", label: "Recrutements", icon: CheckCircle, spark: "recrutements", couleur: "#059669" },
  { cle: "taux_conversion", label: "Taux de conversion", icon: TrendingUp, suffixe: "%", spark: "tauxConversion", couleur: "#3a8226" },
];

export const KpiCards = ({ kpis, evolution }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-5">
    {KPI_DEFS.map(({ cle, label, icon: Icon, suffixe, spark, couleur }) => {
      const kpi = kpis[cle];
      if (!kpi) return null;
      const variation = kpi.variation_pct;
      return (
        <div key={cle} className={`${tw.cardColors} rounded-2xl p-4 flex flex-col gap-1.5 overflow-hidden`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
            <span className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Icon size={15} className="text-teal-700" />
            </span>
          </div>
          <p className={`text-3xl font-extrabold tabular-nums ${tw.textStrong}`}>{kpi.valeur}{suffixe || ""}</p>
          {variation !== null && variation !== undefined ? (
            <p className={`text-xs font-semibold ${variation >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {variation >= 0 ? "↗" : "↘"} {Math.abs(variation)}% vs période précédente
            </p>
          ) : (
            <p className="text-xs text-slate-500">Pas de période comparable</p>
          )}
          {spark && evolution.length >= 2 && (
            <StatSparkline data={evolution} dataKey={spark} color={couleur} />
          )}
        </div>
      );
    })}
  </div>
);
