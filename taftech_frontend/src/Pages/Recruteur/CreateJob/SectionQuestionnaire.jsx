// Section "Questionnaire (optionnel)" : association d'un questionnaire existant ou création d'un nouveau.
import Select from "react-select";
import { ClipboardList } from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import { Section } from "./formUi";

const SectionQuestionnaire = ({ job }) => {
  const { questionnaires, formData, setFormData, setModalPrefillQuestions, setShowCreateQuestionnaire } = job;
  return (
    <Section icon={ClipboardList} title="Questionnaire (optionnel)">
      {questionnaires.length === 0 ? (
        <div className={`flex items-center justify-between p-3 rounded-lg ${tw.surfaceMuted} border ${tw.borderBase}`}>
          <p className={tw.bodyText}>Vous n'avez aucun questionnaire créé.</p>
          <button
            type="button"
            onClick={() => { setModalPrefillQuestions(null); setShowCreateQuestionnaire(true); }}
            className={`text-sm font-semibold transition-colors shrink-0 ${tw.linkTeal}`}
          >
            Créer un questionnaire →
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                name="questionnaire"
                options={questionnaires.map((q) => ({ value: q.id, label: `${q.titre} (${q.questions.length} questions)` }))}
                onChange={(opt) => setFormData({ ...formData, questionnaire: opt ? opt.value : "" })}
                value={questionnaires.map((q) => ({ value: q.id, label: `${q.titre} (${q.questions.length} questions)` })).find((o) => o.value === formData.questionnaire) || null}
                placeholder="Associer un questionnaire à cette offre..."
                isClearable
                styles={selectStylesTeal}
              />
            </div>
            <button
              type="button"
              onClick={() => { setModalPrefillQuestions(null); setShowCreateQuestionnaire(true); }}
              className={`text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${tw.linkTeal}`}
            >
              + Nouveau
            </button>
          </div>
          <p className={`text-xs mt-2 ${tw.textMuted700}`}>Les candidats devront répondre avant de postuler.</p>
        </>
      )}
    </Section>
  );
};

export default SectionQuestionnaire;
