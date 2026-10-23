// Autres types de contrat acceptés par une offre (« CDD ou Stage / PFE »). Ils s'ajoutent au contrat principal :
// affichés sur l'offre et trouvés par le filtre « Type de contrat ». Le principal n'est jamais reproposé, 3 au plus
// (mêmes règles que le serveur).
import { MAX_CONTRATS_SUPPLEMENTAIRES } from "../../../utils/lieuxContrats";

const ContratsSupplementaires = ({ options, principal, selection, onChange }) => {
  const disponibles = options.filter((option) => option.value !== principal);
  const choisis = selection.filter((code) => code !== principal);
  const complet = choisis.length >= MAX_CONTRATS_SUPPLEMENTAIRES;
  const basculer = (code) => onChange(choisis.includes(code) ? choisis.filter((c) => c !== code) : [...choisis, code]);

  return (
    <fieldset className="mt-4">
      <legend className="text-xs font-semibold text-slate-700 mb-1.5">
        Autres types de contrat acceptés <span className="font-normal text-slate-500">(optionnel, {MAX_CONTRATS_SUPPLEMENTAIRES} au plus)</span>
      </legend>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {disponibles.map((option) => (
          <label key={option.value} className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={choisis.includes(option.value)}
              disabled={!choisis.includes(option.value) && complet}
              onChange={() => basculer(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default ContratsSupplementaires;
