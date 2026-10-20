// Carte "Préférences de recrutement" : métier souhaité, salaire, mobilité, situation.
import { Pencil } from "lucide-react";
import { tw } from "../../../theme";
import { SECTION_CLASS, SECTION_TITLE, EDIT_BTN } from "./profilUi";

const SectionPreferences = ({ profil, formatText, setShowPrefForm }) => (
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-start mb-4">
              <h2 className={SECTION_TITLE}>Préférences de recrutement</h2>
              <button onClick={() => setShowPrefForm(true)} className={EDIT_BTN}>
                <Pencil size={12} /> Modifier
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: "Métier souhaité",
                  value: profil.metier_souhaite_appellation_libelle || profil.metier_souhaite_libelle || "Non renseigné",
                },
                {
                  label: "Salaire souhaité",
                  value: profil.salaire_souhaite || "À discuter",
                },
                { label: "Mobilité", value: formatText(profil.mobilite) },
                {
                  label: "Situation actuelle",
                  value: formatText(profil.situation_actuelle),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className={`p-3 rounded-lg ${tw.prefCardSoft}`}
                >
                  <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wide mb-1`}>
                    {label}
                  </p>
                  <p className={`text-sm font-semibold ${tw.textPrimary}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
);

export default SectionPreferences;
