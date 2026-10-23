// Bloc "Formation requise" : diplômes acceptés et spécialités acceptées (deux listes indépendantes) + suggestions du métier.
import { useState } from "react";
import Select from "react-select";
import { GraduationCap, X } from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import { aplatirGroupes } from "../../../utils/familleFormation";
import { libelleUsage } from "../../../utils/suggestionStats";
import SuggestionsDiplomes from "../../../Components/SuggestionsDiplomes";
import ProposerEntreeModal from "../../../Components/ProposerEntreeModal";
import DomaineSpecialites from "./DomaineSpecialites";
import { enrichirSpecialites, phraseFormation } from "../../../utils/phraseFormation";
import { regrouperDiplomes } from "../../../utils/groupesDiplomes";

const BlocFormationRequise = ({ job }) => {
  // Type de demande d'ajout en cours (« DIPLOME » ou « SPECIALITE »), null quand la fenêtre est fermée.
  const [demandeEnCours, setDemandeEnCours] = useState(null);
  const {
    diplomesGroupes, draftDiplomeId, setDraftDiplomeId,
    diplomesRequis, specialitesRequises, ajouterDiplomeRequis, retirerDiplomeRequis, ajouterDiplomeSuggere,
    retirerSpecialiteRequise, ajouterSpecialiteSuggeree, suggestionsPourMetier,
    domainesFormation = [], famillesFormation, specialitesFiltrees = [], ajouterSpecialitesRequises,
  } = job;
  // Aperçu de la phrase que le candidat lira sur l'offre publiée (même logique que la page publique).
  const apercu = phraseFormation({
    diplomes: diplomesRequis,
    specialites: enrichirSpecialites(specialitesRequises, specialitesFiltrees, domainesFormation),
  });
  const suggestionsRestantes = suggestionsPourMetier.specialites.filter(
    (s) => !specialitesRequises.some((sp) => String(sp.id) === String(s.id)),
  );

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
        <button
          type="button"
          onClick={() => setDemandeEnCours("DIPLOME")}
          className="mt-1.5 text-xs font-medium text-teal-700 hover:underline"
        >
          Autre, préciser
        </button>
        {diplomesRequis.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {regrouperDiplomes(diplomesRequis).map((e) => (
              <span key={e.cle} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
                {e.libelle}
                <button type="button" onClick={() => e.ids.forEach((id) => retirerDiplomeRequis(id))} className="hover:text-red-600">
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
        {ajouterSpecialitesRequises && (
          <DomaineSpecialites
            domaines={domainesFormation}
            familles={famillesFormation}
            specialites={specialitesFiltrees}
            specialitesRequises={specialitesRequises}
            onAjouter={ajouterSpecialitesRequises}
            onRetirer={retirerSpecialiteRequise}
          />
        )}
        <button
          type="button"
          onClick={() => setDemandeEnCours("SPECIALITE")}
          className="mt-1.5 text-xs font-medium text-teal-700 hover:underline"
        >
          Autre, préciser
        </button>
      </div>

      {suggestionsPourMetier.specialites.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <p className="text-[11px] font-medium text-slate-500">
              Suggéré pour ce métier — cliquez pour ajouter la spécialité :
            </p>
            {suggestionsRestantes.length > 1 && ajouterSpecialitesRequises && (
              <button
                type="button"
                onClick={() => ajouterSpecialitesRequises(suggestionsRestantes)}
                className="text-[11px] font-semibold text-teal-700 hover:underline"
              >
                {`Tout ajouter (${suggestionsRestantes.length})`}
              </button>
            )}
          </div>
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

      {apercu && (
        <p className="mt-4 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold">Ce que le candidat lira : </span>
          {apercu}
        </p>
      )}

      <ProposerEntreeModal
        open={demandeEnCours !== null}
        type={demandeEnCours || "DIPLOME"}
        onClose={() => setDemandeEnCours(null)}
      />
    </div>
  );
};

export default BlocFormationRequise;
