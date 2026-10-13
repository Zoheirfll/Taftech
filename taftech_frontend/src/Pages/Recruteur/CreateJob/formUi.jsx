// Petits éléments d'interface partagés par les sections du formulaire "Publier une offre"
// (cadre de section, champ avec libellé, classes d'inputs, libellés de niveaux/types).
import { tw } from "../../../theme";

export const NIVEAU_LABELS = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
  CONFIRME: "Confirmé / Expert",
};

export const TYPE_QUESTION_LABELS = {
  COURT: "Texte court",
  LONG: "Texte long",
  NUMERIQUE: "Numérique",
  CHOIX_UNIQUE: "Choix unique",
  CHOIX_MULTIPLE: "Choix multiple",
};

export const Section = ({ icon: Icon, title, children }) => (
  <div className={`${tw.card} p-6`}>
    <div className="flex items-center gap-2 mb-5">
      <Icon size={16} className={`${tw.textTeal} shrink-0`} />
      <h3 className={`text-sm font-bold ${tw.textStrong} uppercase tracking-wider`}>{title}</h3>
    </div>
    {children}
  </div>
);

export const Field = ({ label, required, children }) => (
  <div>
    <label className={`text-sm font-semibold ${tw.textMuted} mb-1.5 block`}>
      {label} {required && <span className={tw.textErrorMuted}>*</span>}
    </label>
    {children}
  </div>
);

export const inputClass = `w-full px-4 py-2.5 rounded-lg text-sm transition-colors ${tw.inputColorsMutedTeal}`;
export const textareaClass = `w-full px-4 py-3 rounded-lg text-sm transition-colors resize-none leading-relaxed ${tw.inputColorsMutedTeal}`;
