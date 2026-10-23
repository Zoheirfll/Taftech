// Autres lieux de travail d'une offre (« Oran, Mostaganem »). Ils s'ajoutent au lieu principal (wilaya + commune) :
// affichés sur l'offre, trouvés par la recherche « l'un ou l'autre », et le score retient le meilleur lieu du candidat.
// Jamais de doublon (le lieu principal compte aussi), 5 au plus : mêmes règles que le serveur.
import { useState } from "react";
import Select from "react-select";
import { X } from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import communesAlgerie from "../../../data/communes.json";
import { MAX_LIEUX_SUPPLEMENTAIRES, lieuTexte } from "../../../utils/lieuxContrats";

const cle = (lieu) => `${(lieu.wilaya || "").trim().toLowerCase()}|${(lieu.commune || "").trim().toLowerCase()}`;

const LieuxSupplementaires = ({ wilayas, principal, lieux, onChange }) => {
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");

  const communes = wilaya
    ? communesAlgerie
        .filter((c) => c.wilaya_code === wilaya.split(" - ")[0])
        .map((c) => ({ value: c.commune_name_ascii, label: c.commune_name_ascii }))
    : [];
  const dejaPresent = Boolean(wilaya) && [principal, ...lieux].some((lieu) => lieu && cle(lieu) === cle({ wilaya, commune }));
  const complet = lieux.length >= MAX_LIEUX_SUPPLEMENTAIRES;

  const ajouter = () => {
    onChange([...lieux, { wilaya, commune }]);
    setWilaya("");
    setCommune("");
  };
  const retirer = (index) => onChange(lieux.filter((_, i) => i !== index));

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-700 mb-1.5">
        Autres lieux de travail <span className="font-normal text-slate-500">(optionnel, {MAX_LIEUX_SUPPLEMENTAIRES} au plus)</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <Select
          aria-label="Wilaya de l'autre lieu"
          options={wilayas}
          value={wilayas.find((w) => w.value === wilaya) || null}
          onChange={(opt) => { setWilaya(opt ? opt.value : ""); setCommune(""); }}
          placeholder="Wilaya..."
          isClearable
          isDisabled={complet}
          styles={selectStylesTeal}
        />
        <Select
          aria-label="Commune de l'autre lieu"
          options={communes}
          value={communes.find((c) => c.value === commune) || null}
          onChange={(opt) => setCommune(opt ? opt.value : "")}
          placeholder={wilaya ? "Commune (optionnel)..." : "Choisir d'abord la wilaya"}
          isClearable
          isDisabled={!wilaya || communes.length === 0}
          styles={selectStylesTeal}
        />
        <button
          type="button"
          onClick={ajouter}
          disabled={!wilaya || dejaPresent || complet}
          className={`${tw.buttonSecondary} h-fit px-4 py-2.5 disabled:opacity-50`}
        >
          Ajouter ce lieu
        </button>
      </div>
      {dejaPresent && <p className="text-xs mt-1.5 text-slate-600">Ce lieu est déjà dans l'offre.</p>}
      {lieux.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {lieux.map((lieu, index) => (
            <span key={cle(lieu)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
              {lieuTexte(lieu)}
              <button type="button" aria-label={`Retirer ${lieuTexte(lieu)}`} onClick={() => retirer(index)} className="hover:text-red-600">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default LieuxSupplementaires;
