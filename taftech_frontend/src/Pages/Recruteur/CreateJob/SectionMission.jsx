// Section "Détails de la mission" : bandeau de génération IA, description, missions, profil, compétences, questions IA.
import { FileText, Sparkles } from "lucide-react";
import { tw } from "../../../theme";
import QuotaIABadge from "../../../Components/QuotaIABadge";
import { Section, Field, textareaClass } from "./formUi";
import BlocCompetences from "./BlocCompetences";
import BlocQuestionsIA from "./BlocQuestionsIA";

const SectionMission = ({ job }) => {
  const { iaReady, isPremium, quotaGenerationOffre, iaLoading, handleGenererIA, formData, handleChange } = job;
  return (
    <Section icon={FileText} title="Détails de la mission">
      <div className="space-y-4">
        {/* Fix 5 : bouton IA avec état "Prêt" */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border ${iaReady ? tw.amberReadyBanner : `${tw.surfaceMuted} ${tw.borderBase}`}`}>
          <div>
            <p className={`text-sm font-semibold flex items-center flex-wrap gap-1.5 ${iaReady ? tw.textWarning800 : tw.textMuted}`}>
              <Sparkles size={14} className={iaReady ? tw.textAmber500 : tw.textMuted} />
              Générer l'offre avec l'IA
              {iaReady && <span className={`px-2 py-0.5 ${tw.badgeSuccessSolid100} text-[10px] font-bold rounded-full`}>Prêt</span>}
            </p>
            <p className={`text-xs mt-0.5 ${iaReady ? tw.textWarning : tw.textLight}`}>
              {isPremium
                ? (iaReady ? "Description, missions, profil, compétences et questions d'entretien." : "Saisissez le titre du poste pour activer.")
                : "Fonctionnalité réservée aux comptes Premium ⭐"}
            </p>
            {isPremium && <QuotaIABadge quota={quotaGenerationOffre} className="mt-1" />}
          </div>
          {isPremium ? (
            <button
              type="button"
              onClick={() => handleGenererIA()}
              disabled={iaLoading || !iaReady || quotaGenerationOffre?.disponible === false}
              title={!iaReady ? "Saisissez le titre du poste d'abord" : ""}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 w-full sm:w-auto text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${iaReady ? tw.bgAmberSolidHover : tw.bgSlate300}`}
            >
              <Sparkles size={14} />
              {iaLoading ? "Génération..." : "Générer l'offre avec l'IA"}
            </button>
          ) : (
            <span className={`text-xs font-semibold ${tw.badgeAmberSolid100} px-3 py-1.5 rounded-lg shrink-0 self-start`}>Premium uniquement</span>
          )}
        </div>

        {/* Fix 6 : description rows=5 */}
        <Field label="Description générale">
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className={textareaClass}
            placeholder="Présentez le contexte, l'entreprise et les enjeux du poste..."
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Missions & Tâches">
            <textarea
              name="missions"
              value={formData.missions}
              onChange={handleChange}
              rows={6}
              className={textareaClass}
            />
          </Field>
          <Field label="Profil recherché">
            <textarea
              name="profil_recherche"
              value={formData.profil_recherche}
              onChange={handleChange}
              rows={6}
              className={textareaClass}
            />
          </Field>
        </div>
        <BlocCompetences job={job} />
        <BlocQuestionsIA job={job} />
      </div>
    </Section>
  );
};

export default SectionMission;
