// Bloc « Pourquoi ce score ? » : détail par critère, avertissement de complétude, points forts et écarts.
import { HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { tw } from "../../../../theme";
import { criteresNonDemandes } from "../../../../utils/criteresMatching";

const CRITERES_LABELS = {
  specialite: "Spécialité", diplome: "Diplôme", experience: "Expérience",
  region: "Localisation & mobilité", competences: "Compétences",
};

const CRITERES_BARRES = [
  { key: "specialite", label: "Spécialité", max: 25 },
  { key: "diplome", label: "Diplôme", max: 20 },
  { key: "experience", label: "Expérience", max: 20 },
  { key: "region", label: "Localisation & mobilité", max: 20 },
  { key: "competences", label: "Compétences", max: 15 },
];

export const DetailScoreMatching = ({ detailsMatching }) => {
  const DM = detailsMatching;
  const scores = DM.scores || DM;
  const explics = DM.explications || {};
  const nonDemandes = criteresNonDemandes(DM, CRITERES_BARRES.map((c) => c.key));
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 -mb-1">
        <HelpCircle size={14} className={tw.textTeal} />
        <span className={`text-xs font-bold ${tw.textStrong} uppercase tracking-wide`}>
          Pourquoi ce score ?
        </span>
        <Link to="/comment-fonctionne-matching" className="ml-auto text-xs font-semibold text-teal-700 underline">Comment est calculé le score ?</Link>
      </div>
      {typeof DM.completude === "number" && DM.completude < 1 && (
        <p className={`text-xs ${tw.textMuted700}`}>
          Score calculé sur des informations incomplètes ({Math.round(DM.completude * 100)}% des
          critères évalués — {(DM.criteres_manquants || []).map((c) => CRITERES_LABELS[c] || c).join(", ")} non renseigné(s) côté candidat.
        </p>
      )}
      {CRITERES_BARRES.map(({ key, label, max }) => {
        const nonDemande = nonDemandes.includes(key);
        const val = scores[key] || 0;
        const pct = (val / max) * 100;
        const color =
          pct >= 100
            ? tw.progressBarSuccess
            : pct >= 50
              ? tw.progressBarWarning
              : tw.progressBarDanger;
        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1.5">
              <span className={`text-xs font-semibold ${tw.textMuted700}`}>
                {label}
              </span>
              <span className={`text-xs font-bold ${tw.textStrong}`}>
                {nonDemande ? "Non demandé" : `${val}/${max}`}
              </span>
            </div>
            {!nonDemande && (
              <div className={`w-full ${tw.progressTrack}`}>
                <div
                  className={`${color} duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            {explics[key] && (
              <p className={`text-xs ${tw.textMuted700} mt-1`}>
                {explics[key]}
              </p>
            )}
          </div>
        );
      })}
      {DM.highlights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className={`text-xs font-semibold ${tw.textSuccess} mb-2`}>
              Points forts
            </p>
            {DM.highlights.points_forts?.length > 0 ? (
              <ul className="space-y-1.5">
                {DM.highlights.points_forts.map((pf, i) => (
                  <li
                    key={i}
                    className={`text-xs ${tw.textMuted} flex items-start gap-1.5`}
                  >
                    <span className="text-emerald-500 mt-0.5">
                      •
                    </span>
                    {pf}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`text-xs ${tw.textMuted} italic`}>
                Aucun.
              </p>
            )}
          </div>
          <div>
            <p className={`text-xs font-semibold ${tw.textError} mb-2`}>
              Écarts détectés
            </p>
            {DM.highlights.ecarts?.length > 0 ? (
              <ul className="space-y-1.5">
                {DM.highlights.ecarts.map((ec, i) => (
                  <li
                    key={i}
                    className={`text-xs ${tw.textMuted} flex items-start gap-1.5`}
                  >
                    <span className="text-red-400 mt-0.5">
                      •
                    </span>
                    {ec}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`text-xs ${tw.textMuted} italic`}>
                Aucun.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
