// Bloc "Formation requise" : diplômes acceptés et spécialités acceptées (deux listes indépendantes) + suggestions du métier.
import Select from "react-select";
import { GraduationCap, X } from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import { aplatirGroupes } from "../../../utils/familleFormation";
import { libelleUsage } from "../../../utils/suggestionStats";
import SuggestionsDiplomes from "../../../Components/SuggestionsDiplomes";

const BlocFormationRequise = ({ job }) => {
  const {
    diplomesGroupes, specialitesGroupes, draftDiplomeId, setDraftDiplomeId, draftSpecialiteId, setDraftSpecialiteId,
    diplomesRequis, specialitesRequises, ajouterDiplomeRequis, retirerDiplomeRequis, ajouterDiplomeSuggere,
    ajouterSpecialiteRequise, retirerSpecialiteRequise, ajouterSpecialiteSuggeree, suggestionsPourMetier,
  } = job;

  return (
    <div className="mt-5 border border-slate-200 rounded-xl p-5 bg-slate-50/60">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap size={14} className={`${tw.textTeal} shrink-0`} />
        <p className={`text-sm font-bold ${tw.textStrong}`}>
          Formation requise <span className="font-normal text-slate-500">(optionnel)</span>
        </p>
      </div>
      <p className="text-xs text-slate-600 mb-4">
        Le diplôme et la spécialité ci-dessous sont deux critères indépendants (jamais un couple imposé) : laisser "Spécialités acceptées" vide accepte toute spécialité pour les diplômes choisis. Cette liste alimente aussi le filtre "Diplôme" de la recherche publique d'offres.
      </p>

      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-700 mb-1.5">Diplômes acceptés</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
          <Select
            options={diplomesGroupes}
            value={aplatirGroupes(diplomesGroupes).find((o) => String(o.value) === String(draftDiplomeId)) || null}
            onChange={(opt) => setDraftDiplomeId(opt ? opt.value : "")}
            styles={selectStylesTeal}
            placeholder="Sélectionner un type de diplôme..."
            isClearable
          />
          <button
            type="button"
            onClick={ajouterDiplomeRequis}
            disabled={!draftDiplomeId}
            className={`${tw.buttonSecondary} h-fit px-4 py-2.5 disabled:opacity-50`}
          >
            Ajouter
          </button>
        </div>
        {diplomesRequis.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {diplomesRequis.map((d) => (
              <span key={d.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
                {d.libelle}
                <button type="button" onClick={() => retirerDiplomeRequis(d.id)} className="hover:text-red-600">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <SuggestionsDiplomes
          diplomes={suggestionsPourMetier.diplomes}
          dejaAjoutes={diplomesRequis}
          elargi={suggestionsPourMetier.elargi}
          onAjouter={ajouterDiplomeSuggere}
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-1.5">Spécialités acceptées (optionnel — vide = toute spécialité)</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
          <Select
            options={specialitesGroupes}
            value={aplatirGroupes(specialitesGroupes).find((o) => String(o.value) === String(draftSpecialiteId)) || null}
            onChange={(opt) => setDraftSpecialiteId(opt ? opt.value : "")}
            styles={selectStylesTeal}
            placeholder="Sélectionner une spécialité..."
            isClearable
          />
          <button
            type="button"
            onClick={ajouterSpecialiteRequise}
            disabled={!draftSpecialiteId}
            className={`${tw.buttonSecondary} h-fit px-4 py-2.5 disabled:opacity-50`}
          >
            Ajouter
          </button>
        </div>
        {specialitesRequises.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {specialitesRequises.map((s) => (
              <span key={s.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
                {s.libelle}
                <button type="button" onClick={() => retirerSpecialiteRequise(s.id)} className="hover:text-red-600">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {suggestionsPourMetier.specialites.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-medium text-slate-500 mb-1.5">
            Suggéré pour ce métier — cliquez pour ajouter la spécialité :
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestionsPourMetier.specialites
              .filter((s) => !specialitesRequises.some((sp) => String(sp.id) === String(s.id)))
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => ajouterSpecialiteSuggeree(s)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed ${tw.borderBase} hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600`}
                >
                  + {s.libelle}
                  {s.famille_libelle && <span className="text-[10px] text-slate-500">({s.famille_libelle})</span>}
                  {libelleUsage(s) && <span className="text-[10px] font-semibold text-indigo-600">{libelleUsage(s)}</span>}
                </button>
              ))}
          </div>
          {suggestionsPourMetier.avertissement && (
            <p className="text-[11px] text-slate-500 italic mt-2">{suggestionsPourMetier.avertissement}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BlocFormationRequise;
