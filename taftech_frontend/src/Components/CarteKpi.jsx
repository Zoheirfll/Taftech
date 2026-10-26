import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { tw } from "../theme";
import { TooltipIcon } from "./Tooltip";

export const nombre = (n) => new Intl.NumberFormat("fr-DZ").format(n ?? 0);
export const montant = (n) => `${nombre(n)} DA`;
export const pourcent = (n) => (n === null || n === undefined ? "—" : `${String(n).replace(".", ",")} %`);

// `moinsEstMieux` : une baisse est une bonne nouvelle (échecs, offres sans candidature) -> couleurs inversées.
export const Variation = ({ valeur, moinsEstMieux }) => {
  if (valeur === null || valeur === undefined) {
    return (
      <span className={`text-xs ${tw.textMuted}`} title="Aucune donnée sur la période précédente : pas de comparaison possible.">
        —
      </span>
    );
  }
  const hausse = valeur >= 0;
  const favorable = moinsEstMieux ? !hausse : hausse;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
        favorable ? `${tw.bgSuccessSoft} ${tw.textSuccessIcon}` : `${tw.bgErrorSoft} ${tw.textError}`
      }`}
      title="Variation par rapport à la période précédente de même durée."
    >
      {hausse ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {hausse ? "+" : ""}
      {String(valeur).replace(".", ",")} %
    </span>
  );
};

const valeurAffichee = (donnees, format) =>
  donnees?.valeur === null || donnees?.valeur === undefined ? "—" : format(donnees.valeur);

const precedenteAffichee = (donnees, format) =>
  donnees.precedente === null || donnees.precedente === undefined ? "—" : format(donnees.precedente);

/**
 * Carte d'un indicateur. `donnees` = { valeur, precedente, variation_pct } ; sans `precedente`
 * (indicateur d'état, sans comparaison), seule la valeur s'affiche.
 * `grande` : chiffre clé en tête de page (chiffre plus grand, comparaison détaillée dessous).
 */
const CarteKpi = ({ label, icon: Icone, color = "indigo", format = nombre, donnees, info, moinsEstMieux = false, grande = false }) => {
  const comparable = donnees && "precedente" in donnees;

  const entete = (
    <p className={`text-[11px] font-semibold ${tw.textMuted} uppercase tracking-wider flex items-center gap-1 min-w-0`}>
      <span className="truncate">{label}</span>
      {info && <TooltipIcon text={info} />}
    </p>
  );
  const icone = (
    <div
      className={`${grande ? "w-10 h-10" : "w-8 h-8"} rounded-lg flex items-center justify-center shrink-0 ${tw.kpiIconBg[color]} text-white`}
      aria-hidden="true"
    >
      <Icone size={grande ? 18 : 15} />
    </div>
  );

  if (grande) {
    return (
      <div className={`${tw.surface} border ${tw.borderSubtle} rounded-2xl p-5 shadow-sm flex flex-col gap-3`}>
        <div className="flex items-start justify-between gap-3">
          {entete}
          {icone}
        </div>
        <p className={`text-4xl font-extrabold ${tw.textStrong} tabular-nums leading-none`}>{valeurAffichee(donnees, format)}</p>
        {comparable && (
          <div className={`flex items-center gap-2 pt-3 border-t ${tw.borderSubtle}`}>
            <Variation valeur={donnees.variation_pct} moinsEstMieux={moinsEstMieux} />
            <span className={`text-[11px] ${tw.textMuted}`}>vs {precedenteAffichee(donnees, format)} avant</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${tw.surface} border ${tw.borderSubtle} rounded-xl p-4 shadow-sm flex flex-col gap-2`}>
      <div className="flex items-center gap-2.5">
        {icone}
        {entete}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-2xl font-bold ${tw.textStrong} tabular-nums leading-none`}>{valeurAffichee(donnees, format)}</p>
        {comparable && <Variation valeur={donnees.variation_pct} moinsEstMieux={moinsEstMieux} />}
      </div>
      {comparable && <p className={`text-[11px] ${tw.textMuted}`}>vs {precedenteAffichee(donnees, format)} avant</p>}
    </div>
  );
};

export default CarteKpi;
