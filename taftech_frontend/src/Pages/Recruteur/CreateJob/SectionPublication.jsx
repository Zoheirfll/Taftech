// Section "Paramètres de publication" : durée d'affichage de l'offre (30/60/90 jours ou date libre).
import { Calendar, Clock } from "lucide-react";
import { tw } from "../../../theme";
import { Section, Field, inputClass } from "./formUi";

const SectionPublication = ({ job }) => {
  const { formData, setFormData } = job;
  return (
    <Section icon={Calendar} title="Paramètres de publication">
      <Field label="Durée d'affichage de l'offre">
        <div className="flex flex-wrap gap-2">
          {[30, 60, 90].map((days) => {
            const addDays = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().split("T")[0]; };
            const isSelected = (() => {
              if (!formData.date_expiration) return false;
              const t = new Date(); t.setDate(t.getDate() + days);
              return Math.abs(Math.round((new Date(formData.date_expiration) - t) / 86400000)) <= 1;
            })();
            return (
              <button
                key={days}
                type="button"
                onClick={() => setFormData({ ...formData, date_expiration: addDays(days) })}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${isSelected ? tw.chipTealActive : tw.chipTealInactive}`}
              >
                <Clock size={13} className="inline mr-1 mb-0.5" />{days} jours
              </button>
            );
          })}
          <input
            type="date"
            value={formData.date_expiration}
            onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })}
            className={inputClass + " w-auto"}
            min={new Date().toISOString().split("T")[0]}
          />
          {formData.date_expiration && (
            <button type="button" onClick={() => setFormData({ ...formData, date_expiration: "" })} className={`text-xs transition-colors ${tw.textMutedHoverDanger}`}>
              × Sans limite
            </button>
          )}
        </div>
        <p className={`text-xs mt-1.5 ${tw.textMuted}`}>L'offre sera clôturée automatiquement à cette date. Laissez vide pour pas de limite.</p>
      </Field>
    </Section>
  );
};

export default SectionPublication;
