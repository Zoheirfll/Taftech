import React from "react";
import { Send, Inbox, Search, ListChecks, Users, CheckCircle2, XCircle } from "lucide-react";
import { tw } from "../theme";

const STAGES = [
  { key: "ENVOYEE", label: "Envoyée", icon: Send },
  { key: "RECUE", label: "Reçue", icon: Inbox },
  { key: "EN_COURS", label: "En cours d'étude", icon: Search },
  { key: "PRESELECTION", label: "Présélection", icon: ListChecks },
  { key: "ENTRETIEN", label: "Entretien", icon: Users },
  { key: "DECISION", label: "Décision", icon: CheckCircle2 },
];

const STATUT_STAGE_INDEX = {
  RECUE: 1,
  EN_COURS: 2,
  PRESELECTION: 3,
  ENTRETIEN: 4,
  RETENU: 5,
  REFUSE: 5,
};

const CandidatureTimeline = ({ statut }) => {
  const currentIndex = STATUT_STAGE_INDEX[statut] ?? 1;
  const isRefuse = statut === "REFUSE";
  const isRetenu = statut === "RETENU";
  const decisionRendue = isRefuse || isRetenu;

  return (
    <div className="flex items-start w-full overflow-x-auto pb-1 -mx-1 px-1">
      {STAGES.map((stage, i) => {
        const isDecision = stage.key === "DECISION";
        const isLast = i === STAGES.length - 1;
        const segmentDone = i < currentIndex;

        let nodeClass = tw.timelineNodePending;
        let Icon = stage.icon;
        let label = stage.label;

        if (isDecision) {
          if (isRetenu) {
            nodeClass = tw.timelineNodeSuccess;
            label = "Retenu(e)";
          } else if (isRefuse) {
            nodeClass = tw.timelineNodeDanger;
            Icon = XCircle;
            label = "Refusé(e)";
          }
        } else if (i < currentIndex) {
          nodeClass = tw.timelineNodeDone;
        } else if (i === currentIndex) {
          nodeClass = tw.timelineNodeCurrent;
        }

        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center shrink-0 w-16">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${nodeClass}`}
              >
                <Icon size={14} />
              </div>
              <span
                className={`text-[10px] font-medium text-center mt-1.5 leading-tight ${
                  i === currentIndex || (isDecision && decisionRendue)
                    ? tw.textStrong
                    : tw.textMuted
                }`}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mt-4 min-w-[16px] ${segmentDone ? tw.timelineLineDone : tw.timelineLinePending}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default CandidatureTimeline;
