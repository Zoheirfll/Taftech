import { libelleUsage } from "../utils/suggestionStats";

const FAMILLES = { "D-LIC": "Licence", "D-MAS": "Master", "D-DOC": "Doctorat" };

// Suggestions de diplômes d'après l'usage réel (candidats/offres du même métier). Les variantes
// d'une même famille (Licence académique / non précisée…) sont regroupées sous un en-tête
// qui porte le % de la famille ; chaque variante reste ajoutable séparément.
export default function SuggestionsDiplomes({ diplomes, dejaAjoutes, onAjouter, elargi }) {
  const restants = (diplomes || []).filter((d) => !dejaAjoutes.some((a) => String(a.id) === String(d.id)));
  if (restants.length === 0) return null;
  const groupes = new Map();
  restants.forEach((d) => {
    const cle = FAMILLES[d.famille] ? d.famille : `__${d.id}`;
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(d);
  });
  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-slate-500 mb-1.5">
        Diplômes les plus déclarés pour ce métier{elargi ? " (métiers voisins)" : ""} — cliquez pour ajouter :
      </p>
      <div className="space-y-2">
        {[...groupes.entries()].map(([cle, items]) => (
          <div key={cle} className="flex flex-wrap items-center gap-2">
            {FAMILLES[cle] && items[0].pct_famille != null && (
              <span className="text-[11px] font-bold text-slate-700">
                {FAMILLES[cle]} : {items[0].pct_famille} % des candidats
              </span>
            )}
            {items.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onAjouter(d)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600"
              >
                + {d.libelle}
                {libelleUsage(d) && <span className="text-[10px] font-semibold text-indigo-600">{libelleUsage(d)}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
