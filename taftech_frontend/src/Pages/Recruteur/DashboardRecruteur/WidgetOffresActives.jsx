// Widget « Mes offres d'emploi actives » : tableau des 5 offres les plus récentes avec statut.
import { Link } from "react-router-dom";
import { tw } from "../../../theme";

export const WidgetOffresActives = ({ offres }) => (
  <div className={`${tw.cardColors} rounded-2xl p-5 overflow-hidden`}>
    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
      <h2 className={`text-sm font-bold ${tw.textStrong}`}>Mes offres d'emploi actives</h2>
      <Link to="/offres-emploi" className={`text-xs font-semibold ${tw.textTeal}`}>Voir toutes</Link>
    </div>
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left min-w-[280px]">
        <thead>
          <tr className={`text-[10px] uppercase tracking-wide font-semibold ${tw.textMuted}`}>
            <th className="px-1 py-1.5">Poste</th>
            <th className="px-1 py-1.5 text-center">Cand.</th>
            <th className="px-1 py-1.5 text-center">Entret.</th>
            <th className="px-1 py-1.5 text-right">Statut</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${tw.divideBase}`}>
          {[...offres].sort((a, b) => new Date(b.date_publication) - new Date(a.date_publication)).slice(0, 5).map((o) => {
            const nbCand = o.candidatures?.length || 0;
            const nbEnt = o.candidatures?.filter((c) => c.statut === "ENTRETIEN").length || 0;
            return (
              <tr key={o.id} className={tw.rowHover}>
                <td className="px-1 py-2 text-xs font-medium truncate max-w-[110px]">{o.titre}</td>
                <td className="px-1 py-2 text-xs text-center">{nbCand}</td>
                <td className="px-1 py-2 text-xs text-center">{nbEnt}</td>
                <td className="px-1 py-2 text-right">
                  {(() => {
                    const { label, cls } = o.est_cloturee
                      ? { label: "Clôturée", cls: tw.tagSlateSoft }
                      : o.statut_moderation === "EN_ATTENTE"
                      ? { label: "En attente", cls: "bg-amber-100 text-amber-700" }
                      : o.statut_moderation === "REJETEE"
                      ? { label: "Rejetée", cls: "bg-red-100 text-red-700" }
                      : { label: "Active", cls: "bg-emerald-100 text-emerald-700" };
                    return (
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${cls}`}>
                        {label}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
