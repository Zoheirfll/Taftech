import React, { useState } from "react";
import { X, Info } from "lucide-react";
import { tw } from "../theme";

const InfoBanner = ({ storageKey, title, children, icon: Icon = Info, color = "indigo" }) => {
  const [visible, setVisible] = useState(() => !localStorage.getItem(`banner_${storageKey}`));

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(`banner_${storageKey}`, "1");
    setVisible(false);
  };

  const colors = tw.bannerColors;

  return (
    <div role="alert" className={`border rounded-xl px-4 py-3 flex items-start gap-3 animate-[fadeInDown_0.2s_ease] ${colors[color] || colors.indigo}`}>
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
