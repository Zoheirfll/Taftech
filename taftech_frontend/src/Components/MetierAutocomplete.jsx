import React, { useEffect, useRef, useState } from "react";
import { jobsService } from "../Services/jobsService";
import { tw } from "../theme";

/**
 * Recherche libre de métier (référentiel v2 client) — cherche sur les appellations de
 * poste (7428 entrées), retourne un `metier_id` déjà résolu vers son métier canonique
 * (redirections) et le libellé précis de l'appellation trouvée à conserver tel quel
 * (une fiche métier peut regrouper plusieurs postes distincts).
 *
 * Props :
 *  - value: libellé actuellement affiché dans le champ (ex: metier_libelle déjà connu)
 *  - onSelect({ metier_id, metier_libelle, appellation_libelle }): appelé au choix d'une suggestion
 *  - placeholder
 */
export const MetierAutocomplete = ({ value = "", onSelect, placeholder = "Ex: Développeur web, Chargé de recrutement..." }) => {
  const [texte, setTexte] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => setTexte(value), [value]);

  const handleChange = (val) => {
    setTexte(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setOuvert(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const data = await jobsService.searchMetiers(val.trim());
      setSuggestions(data);
      setOuvert(data.length > 0);
    }, 300);
  };

  const handleSelect = (item) => {
    setTexte(item.appellation_libelle);
    setOuvert(false);
    onSelect?.(item);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={texte}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      {ouvert && (
        <ul className={`absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg shadow-lg ${tw.autocompleteDropdown}`}>
          {suggestions.map((item) => (
            <li
              key={item.metier_id}
              className={`px-4 py-2 cursor-pointer text-sm ${tw.autocompleteItem}`}
              onMouseDown={() => handleSelect(item)}
            >
              <div className={tw.autocompleteItemTitle}>{item.appellation_libelle}</div>
              {item.appellation_libelle !== item.metier_libelle && (
                <div className={`text-xs ${tw.autocompleteItemSubtitle}`}>{item.metier_libelle}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MetierAutocomplete;
