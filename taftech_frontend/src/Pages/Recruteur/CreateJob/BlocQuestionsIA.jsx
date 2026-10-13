// Bloc "Questions d'entretien suggérées par l'IA" : liste des questions + bouton de création de questionnaire.
import { Sparkles } from "lucide-react";
import { tw } from "../../../theme";
import { TYPE_QUESTION_LABELS } from "./formUi";

const BlocQuestionsIA = ({ job }) => {
  const { questionsEntretien, setModalPrefillQuestions, setShowCreateQuestionnaire } = job;
  if (questionsEntretien.length === 0) return null;

  return (
    <div className={`p-4 rounded-lg border ${tw.borderTeal200} ${tw.bgTealSoft}`}>
      <p className={`text-sm font-semibold flex items-center gap-1.5 ${tw.textTeal}`}>
        <Sparkles size={14} /> Questions d'entretien suggérées par l'IA
      </p>
      <ul className="mt-2 space-y-2">
        {questionsEntretien.map((q, i) => (
          <li key={i} className="text-sm">
            <div className={`${tw.textMuted700} flex items-start gap-2`}>
              <span className={`${tw.textTeal} font-bold shrink-0`}>{i + 1}.</span>
              <span>
                {q.texte}
                <span className={`ml-1.5 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${tw.tagSlateSoft700}`}>
                  {TYPE_QUESTION_LABELS[q.type_question] || q.type_question}
                </span>
              </span>
            </div>
            {q.choix?.length > 0 && (
              <ul className="mt-1 ml-5 space-y-0.5">
                {q.choix.map((c, ci) => (
                  <li key={ci} className={`text-xs ${tw.textMuted} flex items-center gap-1.5`}>
                    <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => { setModalPrefillQuestions(questionsEntretien); setShowCreateQuestionnaire(true); }}
        className={`mt-3 text-sm font-semibold transition-colors ${tw.linkTeal}`}
      >
        Créer un questionnaire avec ces questions →
      </button>
    </div>
  );
};

export default BlocQuestionsIA;
