import React, { useEffect, useState } from "react";

// Saisie d'une date dont le candidat choisit la précision (année seule, mois/année,
// date complète). La valeur échangée reste une date ISO complète (YYYY-MM-DD) pour le
// tri et le calcul de durée côté serveur ; le jour/mois non saisi y vaut "01" (valeur
// technique, jamais affichée : l'affichage suit `precision`, voir formatDatePrecise).
const OPTIONS = [
  { value: "ANNEE", label: "Année" },
  { value: "MOIS", label: "Mois" },
  { value: "JOUR", label: "Date complète" },
];

const anneeDe = (iso) => (iso ? String(iso).slice(0, 4) : "");

export default function DatePrecisionInput({
  value,
  precision = "JOUR",
  onChange,
  className = "",
  required = false,
  ariaLabel = "Date",
}) {
  const [anneeTexte, setAnneeTexte] = useState(anneeDe(value));

  // Resynchronise le texte de l'année quand la valeur change de l'extérieur
  // (ouverture d'une autre fiche, import de CV).
  useEffect(() => {
    if (anneeDe(value) !== anneeTexte && (value || anneeTexte.length === 4)) {
      setAnneeTexte(anneeDe(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const changerPrecision = (nouvelle) => {
    if (!value) return onChange("", nouvelle);
    const [y, m] = String(value).split("-");
    if (nouvelle === "ANNEE") return onChange(`${y}-01-01`, nouvelle);
    if (nouvelle === "MOIS") return onChange(`${y}-${m || "01"}-01`, nouvelle);
    return onChange(value, nouvelle);
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <select
        aria-label={`${ariaLabel} — précision`}
        value={precision}
        onChange={(e) => changerPrecision(e.target.value)}
        className={`${className} w-full`}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {precision === "ANNEE" && (
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="AAAA"
          aria-label={ariaLabel}
          required={required}
          value={anneeTexte}
          onChange={(e) => {
            const t = e.target.value.replace(/\D/g, "").slice(0, 4);
            setAnneeTexte(t);
            onChange(t.length === 4 ? `${t}-01-01` : "", "ANNEE");
          }}
          className={`${className} w-full min-w-0`}
        />
      )}

      {precision === "MOIS" && (
        <input
          type="month"
          aria-label={ariaLabel}
          required={required}
          value={value ? String(value).slice(0, 7) : ""}
          onChange={(e) => onChange(e.target.value ? `${e.target.value}-01` : "", "MOIS")}
          className={`${className} w-full min-w-0`}
        />
      )}

      {precision === "JOUR" && (
        <input
          type="date"
          aria-label={ariaLabel}
          required={required}
          value={value || ""}
          onChange={(e) => onChange(e.target.value, "JOUR")}
          className={`${className} w-full min-w-0`}
        />
      )}
    </div>
  );
}
