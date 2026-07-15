import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import { tw } from "../theme";

const Tooltip = ({ text, children, position = "top" }) => {
  const [show, setShow] = useState(false);

  const posClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = tw.tooltipArrow;

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span role="tooltip" className={`absolute ${posClasses[position]} ${tw.tooltipPanel}`}>
          {text}
          <span className={`absolute border-4 ${arrowClasses[position]}`} />
        </span>
      )}
    </span>
  );
};

export const TooltipIcon = ({ text, position = "top" }) => (
  <Tooltip text={text} position={position}>
    <HelpCircle size={14} className={tw.tooltipIconTrigger} />
  </Tooltip>
);

export default Tooltip;
