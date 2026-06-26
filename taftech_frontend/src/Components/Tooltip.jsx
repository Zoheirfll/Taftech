import React, { useState } from "react";
import { HelpCircle } from "lucide-react";

const Tooltip = ({ text, children, position = "top" }) => {
  const [show, setShow] = useState(false);

  const posClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800",
  };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span role="tooltip" className={`absolute ${posClasses[position]} z-50 w-56 text-xs bg-slate-800 text-white rounded-lg px-3 py-2 shadow-xl pointer-events-none`}>
          {text}
          <span className={`absolute border-4 ${arrowClasses[position]}`} />
        </span>
      )}
    </span>
  );
};

export const TooltipIcon = ({ text, position = "top" }) => (
  <Tooltip text={text} position={position}>
    <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help ml-1 shrink-0" />
  </Tooltip>
);

export default Tooltip;
