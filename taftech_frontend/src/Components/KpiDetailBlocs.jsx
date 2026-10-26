import React from "react";
import { tw, colors } from "../theme";
import { TooltipIcon } from "./Tooltip";
import { EvolutionChart } from "./StatsPeriodeGraphiques";
import { nombre } from "./CarteKpi";

const COULEURS_SERIES = [colors.primary[600], colors.info, colors.success, colors.accent[500]];

const pct = (n) => `${String(n).replace(".", ",")} %`;

export const Bloc = ({ titre, info, note, children }) => (
  <section className={`${tw.card} overflow-hidden`}>
    <div className={`px-5 py-3.5 border-b ${tw.borderSubtle}`}>
      <h3 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5`}>
        {titre}
        {info && <TooltipIcon text={info} />}
      </h3>
    </div>
    <div className="p-5 space-y-3">{children}</div>
    {note && <p className={`px-5 pb-4 text-[11px] leading-relaxed ${tw.textMuted}`}>{note}</p>}
  </section>
);

const Vide = ({ texte = "Aucune donnée sur la période." }) => <p className={`text-xs ${tw.textMuted}`}>{texte}</p>;

/** Courbes mensuelles : une courbe par unité (les dinars ne se tracent pas avec des effectifs). */
export const BlocEvolution = ({ evolution }) => {
  const groupes = [];
  evolution.series.forEach((serie, i) => {
    const unite = serie.unite || "";
    let groupe = groupes.find((g) => g.unite === unite);
    if (!groupe) {
      groupe = { unite, series: [] };
      groupes.push(groupe);
    }
    groupe.series.push({ cle: serie.cle, label: serie.label, couleur: COULEURS_SERIES[i % COULEURS_SERIES.length] });
  });
  return (
    <div className={`grid grid-cols-1 ${groupes.length > 1 ? "lg:grid-cols-2" : ""} gap-6`}>
      {groupes.map((g) => (
        <Bloc key={g.unite || "effectifs"} titre={g.unite ? `Évolution mensuelle (${g.unite})` : "Évolution mensuelle"}>
          <EvolutionChart
            data={evolution.lignes}
            series={g.series}
            unite={g.unite}
            ariaLabel={`Évolution mensuelle : ${g.series.map((s) => s.label).join(", ")}`}
          />
        </Bloc>
      ))}
    </div>
  );
};

/** Barres horizontales : valeur et part du total sur chaque ligne (lisible sans survol, au clavier comme à l'écran). */
export const BlocRepartition = ({ repartition }) => {
  const maxi = Math.max(1, ...repartition.lignes.map((l) => l.nb));
  return (
    <Bloc titre={repartition.titre} note={repartition.note}>
      {repartition.lignes.length === 0 || repartition.total === 0 ? (
        <Vide />
      ) : (
        <ul className="space-y-2.5">
          {repartition.lignes.map((l) => (
            <li key={l.libelle}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className={`${tw.textMuted700} truncate`} title={l.libelle}>
                  {l.libelle}
                </span>
                <span className={`font-semibold ${tw.textStrong} tabular-nums shrink-0`}>
                  {nombre(l.nb)}
                  <span className={`ml-1.5 font-normal ${tw.textMuted}`}>{pct(Math.round((l.nb / repartition.total) * 1000) / 10)}</span>
                </span>
              </div>
              <div className={`mt-1 h-2 rounded-full ${tw.surfaceMuted}`} aria-hidden="true">
                <div className="h-2 rounded-full" style={{ width: `${(l.nb / maxi) * 100}%`, background: colors.primary[500] }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Bloc>
  );
};

export const BlocClassement = ({ classement }) => (
  <Bloc titre={classement.titre} note={classement.note}>
    {classement.lignes.length === 0 ? (
      <Vide />
    ) : (
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs">
          <thead>
            <tr className={`${tw.surfaceMuted} text-[10px] ${tw.textMuted} uppercase tracking-wider`}>
              <th className="px-3 py-2 text-left w-8">#</th>
              {classement.colonnes.map((c, i) => (
                <th key={c} className={`px-3 py-2 ${i === 0 ? "text-left" : "text-right"}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase}`}>
            {classement.lignes.map((ligne, rang) => (
              <tr key={`${rang}-${ligne[0]}`} className={tw.rowHover}>
                <td className={`px-3 py-2 tabular-nums ${tw.textMuted}`}>{rang + 1}</td>
                {ligne.map((valeur, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 ${i === 0 ? `text-left font-semibold ${tw.textStrong}` : "text-right tabular-nums"}`}
                  >
                    {typeof valeur === "number" ? nombre(valeur) : valeur}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Bloc>
);

/** Entonnoir : une barre par étape (largeur = part de la première étape) + taux de passage depuis l'étape précédente. */
export const BlocEntonnoir = ({ entonnoir }) => (
  <Bloc titre={entonnoir.titre} note={entonnoir.note}>
    {entonnoir.etapes.length === 0 || entonnoir.etapes[0].nb === 0 ? (
      <Vide />
    ) : (
      <ol className="space-y-3">
        {entonnoir.etapes.map((etape, i) => (
          <li key={etape.libelle}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className={tw.textMuted700}>{etape.libelle}</span>
              <span className={`font-semibold ${tw.textStrong} tabular-nums`}>
                {nombre(etape.nb)}
                <span className={`ml-1.5 font-normal ${tw.textMuted}`}>
                  {i === 0 ? "" : `${pct(etape.pct_du_total)} du départ`}
                  {etape.taux_passage !== null && i > 0 ? ` · ${pct(etape.taux_passage)} de l'étape précédente` : ""}
                </span>
              </span>
            </div>
            <div className={`mt-1 h-3 rounded ${tw.surfaceMuted}`} aria-hidden="true">
              <div className="h-3 rounded" style={{ width: `${etape.pct_du_total}%`, background: colors.primary[600], opacity: 1 - i * 0.12 }} />
            </div>
          </li>
        ))}
        {entonnoir.refusees !== null && entonnoir.refusees !== undefined && (
          <li className={`flex justify-between text-xs pt-2 border-t ${tw.borderSubtle}`}>
            <span className={tw.textMuted700}>Refusées</span>
            <span className={`font-semibold ${tw.textStrong} tabular-nums`}>{nombre(entonnoir.refusees)}</span>
          </li>
        )}
      </ol>
    )}
  </Bloc>
);

/** Détail complet d'un thème : évolution, entonnoirs, répartitions, classements. */
const KpiDetail = ({ detail }) => (
  <div className="space-y-6">
    <BlocEvolution evolution={detail.evolution} />
    {detail.entonnoirs.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {detail.entonnoirs.map((e) => (
          <BlocEntonnoir key={e.cle} entonnoir={e} />
        ))}
      </div>
    )}
    {detail.repartitions.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {detail.repartitions.map((r) => (
          <BlocRepartition key={r.cle} repartition={r} />
        ))}
      </div>
    )}
    {detail.classements.length > 0 && (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {detail.classements.map((c) => (
          <BlocClassement key={c.cle} classement={c} />
        ))}
      </div>
    )}
  </div>
);

export default KpiDetail;
