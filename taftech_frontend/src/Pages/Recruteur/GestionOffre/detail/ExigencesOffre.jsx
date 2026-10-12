// Exigences impératives de l'offre (S12) : statut déclaré par le candidat + vérification manuelle par le recruteur.
import { authService } from "../../../../Services/authService";

export const ExigencesOffre = ({ reponsesExigences, exigenceOverrides, handleVerifierExigence }) => (
  <div>
    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Exigences de l'offre</h4>
    <div className="space-y-2">
      {reponsesExigences.map((r0) => {
        const r = { ...r0, statut: exigenceOverrides[r0.exigence_id] || r0.statut };
        const styles = {
          SATISFAIT: "bg-emerald-50 text-emerald-700 border-emerald-200",
          NON_SATISFAIT: "bg-red-50 text-red-700 border-red-200",
          INCONNU: "bg-amber-50 text-amber-700 border-amber-200",
        };
        const labels = { SATISFAIT: "Satisfait", NON_SATISFAIT: "Non satisfait", INCONNU: "À vérifier" };
        return (
          <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded-lg">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">{r.exigence_label}</p>
              {r.justificatif_url && (
                <a href={r.justificatif_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-teal-700 hover:underline">
                  Voir le justificatif
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${styles[r.statut]}`}>{labels[r.statut]}</span>
              {authService.peutFaire("UTILISATEUR") && r.statut === "INCONNU" && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleVerifierExigence(r.exigence_id, "SATISFAIT")}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleVerifierExigence(r.exigence_id, "NON_SATISFAIT")}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold bg-red-100 text-red-800 hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
