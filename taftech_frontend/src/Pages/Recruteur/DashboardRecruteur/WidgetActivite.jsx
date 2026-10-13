// Widget « Activité récente » : les 5 dernières actions de l'équipe avec emoji et temps relatif.
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { tw } from "../../../theme";
import { ACTIVITE_EMOJIS, formatTempsRelatif } from "./constantes";

export const WidgetActivite = ({ activite }) => (
  <div className={`${tw.cardColors} rounded-2xl p-5`}>
    <div className="flex items-center justify-between mb-4">
      <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-2`}>
        <Activity size={15} className={tw.textTeal} /> Activité récente
      </h2>
      {activite.length > 5 && (
        <Link to="/activite" className={`text-xs font-semibold ${tw.textTeal}`}>Voir tout</Link>
      )}
    </div>
    {activite.length === 0 ? (
      <p className={`text-xs italic ${tw.textMuted}`}>Aucune activité récente.</p>
    ) : (
      <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {activite.slice(0, 5).map((a) => (
          <li key={a.id} className="flex items-start gap-2.5">
            <span className={`w-7 h-7 rounded-full ${tw.surfaceSubtle} flex items-center justify-center text-sm shrink-0`}>
              {ACTIVITE_EMOJIS[a.action] || ACTIVITE_EMOJIS.AUTRE}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs ${tw.textMuted700}`}>{a.phrase}</p>
              <p className={`text-[10px] mt-0.5 ${tw.textMuted}`}>{formatTempsRelatif(a.date)}</p>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);
