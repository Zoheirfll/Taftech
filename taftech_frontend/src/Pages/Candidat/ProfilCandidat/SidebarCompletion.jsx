// Colonne latérale : jauge de complétion du profil et checklist cliquable par catégorie.
import { Check, ChevronRight } from "lucide-react";
import RadialGauge from "../../../Components/RadialGauge";
import { TooltipIcon } from "../../../Components/Tooltip";
import { tw } from "../../../theme";
import { SIDEBAR_SECTION_CLASS, SIDEBAR_TITLE } from "./profilUi";

const SidebarCompletion = ({ completionPercent, categoriesAvecPct, handleChampManquantClick }) => (
          <div className={SIDEBAR_SECTION_CLASS}>
            <div className="flex items-center justify-between mb-4">
              <p className={SIDEBAR_TITLE}>Profil complété</p>
              <TooltipIcon text="Moyenne de 6 catégories : informations personnelles, CV, expériences, formations, compétences et langues." position="left" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <RadialGauge
                value={completionPercent}
                size={80}
                strokeWidth={9}
                thresholdHigh={101}
                thresholdMid={101}
                colorLow="#204883"
                labelClassName={`text-xl font-extrabold ${tw.textStrong}`}
              />
              <p className={`text-xs leading-relaxed ${tw.textMuted700}`}>
                {completionPercent === 100
                  ? "Profil complet — vous maximisez vos chances !"
                  : "Cliquez sur une catégorie pour la compléter."}
              </p>
            </div>
            <div className="space-y-1 pt-3 border-t border-slate-100">
              {categoriesAvecPct.map((cat) => {
                const isComplete = cat.pct === 100;
                const actionLabel = cat.pct === 0 ? cat.actionLabelZero : "Compléter";
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleChampManquantClick(cat.action)}
                    disabled={isComplete}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                      isComplete ? "cursor-default" : "hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs font-semibold ${tw.textStrong}`}>{cat.label}</span>
                        <span className={`text-[10px] font-bold shrink-0 ${tw.textMuted700}`}>{cat.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cat.pct === 100 ? "bg-emerald-500" : cat.pct >= 50 ? "bg-amber-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${cat.pct}%` }}
                        />
                      </div>
                    </div>
                    {isComplete ? (
                      <Check size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 whitespace-nowrap">
                        {actionLabel} <ChevronRight size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
);

export default SidebarCompletion;
