// Spécialités acceptées d'une offre, présentées PAR DOMAINE de formation (celui du référentiel, tel quel).
// Pourquoi : le référentiel compte ~970 spécialités très voisines ; en choisir une à une exclut sans le savoir
// toutes les autres. Le recruteur choisit un domaine (toutes ses spécialités sont ajoutées), le domaine
// s'affiche en UNE pastille « Domaine (n/total) » et un clic en déplie les spécialités, à décocher ou recocher.
// Aucun regroupement maison : un essai de « champs d'étude » (23/10/2026) a rangé des métiers de services dans
// « Sécurité » ; on suit donc le domaine du référentiel, présenté par niveau comme les autres listes.
import { useState } from "react";
import Select from "react-select";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import { grouperParFamille } from "../../../utils/familleFormation";

const memeId = (a, b) => String(a) === String(b);

const DomaineSpecialites = ({ domaines, familles, specialites, specialitesRequises, onAjouter, onRetirer }) => {
  const [ouverts, setOuverts] = useState([]);

  const specialitesDuDomaine = (id) => specialites.filter((s) => memeId(s.domaine_id, id));
  const avecSpecialites = (domaines || []).filter((d) => specialitesDuDomaine(d.id).length > 0);
  // Nomenclature absente : on n'affiche rien, sauf des spécialités déjà choisies (jamais cachées au recruteur).
  if (avecSpecialites.length === 0 && specialitesRequises.length === 0) return null;

  const estChoisie = (s) => specialitesRequises.some((r) => memeId(r.id, s.id));
  const groupes = grouperParFamille(avecSpecialites, familles, (d) => ({
    value: d.id,
    label: `${d.libelle} (${specialitesDuDomaine(d.id).length})`,
  }));
  const domainesChoisis = avecSpecialites.filter((d) => specialitesDuDomaine(d.id).some(estChoisie));
  // Spécialités choisies que aucun domaine connu ne porte (ex. ajoutée avant un nettoyage) : jamais perdues.
  const orphelines = specialitesRequises.filter((r) => !avecSpecialites.some((d) => specialitesDuDomaine(d.id).some((s) => memeId(s.id, r.id))));

  const choisirDomaine = (opt) => {
    if (!opt) return;
    onAjouter(specialitesDuDomaine(opt.value).filter((s) => !estChoisie(s)));
  };
  const basculerOuvert = (id) => setOuverts((prev) => (prev.some((x) => memeId(x, id)) ? prev.filter((x) => !memeId(x, id)) : [...prev, id]));
  const retirerDomaine = (id) => specialitesDuDomaine(id).filter(estChoisie).forEach((s) => onRetirer(s.id));
  const basculerSpecialite = (s) => (estChoisie(s) ? onRetirer(s.id) : onAjouter([s]));

  return (
    <div className="mt-2">
      {avecSpecialites.length > 0 && (
        <>
          <label htmlFor="domaine-formation" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Ajouter un domaine de formation
          </label>
          <Select
            inputId="domaine-formation"
            options={groupes}
            value={null}
            onChange={choisirDomaine}
            styles={selectStylesTeal}
            placeholder="Choisir un domaine de formation..."
          />
        </>
      )}

      {(domainesChoisis.length > 0 || orphelines.length > 0) && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {domainesChoisis.map((d) => {
              const total = specialitesDuDomaine(d.id).length;
              const choisies = specialitesDuDomaine(d.id).filter(estChoisie).length;
              const ouvert = ouverts.some((x) => memeId(x, d.id));
              const Chevron = ouvert ? ChevronDown : ChevronRight;
              return (
                <span key={d.id} className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
                  <button type="button" aria-expanded={ouvert} onClick={() => basculerOuvert(d.id)} className="inline-flex items-center gap-1">
                    <Chevron size={12} />
                    {`${d.libelle} (${choisies}/${total})`}
                  </button>
                  <button type="button" aria-label={`Retirer le domaine ${d.libelle}`} onClick={() => retirerDomaine(d.id)} className="hover:text-red-600">
                    <X size={12} />
                  </button>
                </span>
              );
            })}
            {orphelines.map((s) => (
              <span key={s.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
                {s.libelle}
                <button type="button" aria-label={`Retirer ${s.libelle}`} onClick={() => onRetirer(s.id)} className="hover:text-red-600">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {domainesChoisis.filter((d) => ouverts.some((x) => memeId(x, d.id))).map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-semibold text-slate-500 mb-2">{d.libelle}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 max-h-56 overflow-y-auto pr-1">
                {specialitesDuDomaine(d.id).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={estChoisie(s)} onChange={() => basculerSpecialite(s)} />
                    {s.libelle}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DomaineSpecialites;
