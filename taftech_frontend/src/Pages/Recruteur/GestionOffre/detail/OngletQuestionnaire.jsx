// Onglet « Questionnaire » : questions de l'offre et réponses données par le candidat.
import { tw } from "../../../../theme";

export const OngletQuestionnaire = ({ offre, selectedCandidature }) => (
  <div className="p-6 overflow-y-auto max-h-[calc(100vh-220px)] space-y-4">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-2 h-4 ${tw.bgTeal} rounded-full`} />
      <p className={`text-sm font-semibold ${tw.textStrong}`}>
        {offre.questionnaire.titre}
      </p>
    </div>
    {offre.questionnaire.questions?.map((q) => {
      const reponse = selectedCandidature?.reponses?.find(
        (r) => r.question === q.id,
      );
      return (
        <div
          key={q.id}
          className={`${tw.surfaceMuted} border ${tw.borderBase} rounded-lg p-4`}
        >
          <p className={`${tw.sectionLabel} mb-1`}>
            {q.texte}
            {q.requis && <span className={`${tw.textErrorMuted} ml-1`}>*</span>}
            {q.disqualifiant && (
              <span className={`ml-2 px-1.5 py-0.5 ${tw.badgeErrorLight} text-[10px] rounded`}>
                Disqualifiant
              </span>
            )}
          </p>
          {reponse ? (
            <p className="text-sm text-slate-800 font-medium">
              {reponse.reponse || "—"}
            </p>
          ) : (
            <p className={`text-sm ${tw.textMuted} italic`}>
              Pas de réponse
            </p>
          )}
        </div>
      );
    })}
  </div>
);
