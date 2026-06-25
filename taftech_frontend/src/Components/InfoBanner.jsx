import React, { useState } from "react";
import { X, Info } from "lucide-react";

const InfoBanner = ({ storageKey, title, children, icon: Icon = Info, color = "indigo" }) => {
  const [visible, setVisible] = useState(() => !localStorage.getItem(`banner_${storageKey}`));

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(`banner_${storageKey}`, "1");
    setVisible(false);
  };

  const colors = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900 [&_svg]:text-indigo-500",
    teal:   "bg-teal-50 border-teal-200 text-teal-900 [&_svg]:text-teal-500",
    amber:  "bg-amber-50 border-amber-200 text-amber-900 [&_svg]:text-amber-500",
    slate:  "bg-slate-50 border-slate-200 text-slate-800 [&_svg]:text-slate-400",
  };

  return (
    <div className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${colors[color] || colors.indigo}`}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold mb-0.5">{title}</p>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
        title="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default InfoBanner;
