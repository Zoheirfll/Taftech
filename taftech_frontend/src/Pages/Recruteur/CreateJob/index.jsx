// Page "Publier une offre" (orchestrateur) : assemble les sections du formulaire à partir du hook useCreateJob.
import { Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { tw } from "../../../theme";
import InfoBanner from "../../../Components/InfoBanner";
import { CreateQuestionnaireModal } from "../../../Components/CreateQuestionnaireModal";
import { useCreateJob } from "./useCreateJob";
import SectionInfosPoste from "./SectionInfosPoste";
import SectionProfil from "./SectionProfil";
import SectionLocalisation from "./SectionLocalisation";
import SectionMission from "./SectionMission";
import SectionQuestionnaire from "./SectionQuestionnaire";
import SectionPublication from "./SectionPublication";

const CreateJob = () => {
  const job = useCreateJob();
  const {
    navigate, loading, isPremium, handleSubmit, showCreateQuestionnaire, setShowCreateQuestionnaire,
    setQuestionnaires, setFormData, modalPrefillQuestions, formData,
  } = job;

  return (
    <div className={`min-h-screen ${tw.surfaceSubtle} pb-24 sm:pb-0`}>
      {/* Header */}
      <div className={`${tw.surface} border-b ${tw.borderBase} px-6 py-4`}>
        <div className="max-w-4xl mx-auto">
          <Link to="/dashboard" className={`inline-flex items-center gap-1.5 text-sm font-medium mb-2 transition-colors ${tw.textMutedHoverTeal}`}>
            <ArrowLeft size={15} /> Retour au dashboard
          </Link>
          <h1 className={`text-xl font-bold ${tw.textStrong}`}>Publier une offre d'emploi</h1>
          <p className={`text-sm mt-0.5 ${tw.bodyText}`}>Remplissez les informations pour attirer les bons candidats.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Fix 7 : InfoBanner dans le form */}
        <InfoBanner storageKey="creer_offre" title="Conseils pour une offre efficace" color="teal">
          Un titre précis et un profil recherché détaillé améliorent la qualité du matching IA.
          Renseignez la <strong>spécialité</strong> et le <strong>diplôme</strong> requis pour que l'algorithme propose votre offre aux candidats les plus pertinents.
          {isPremium && <> Saisissez simplement le <strong>titre du poste</strong> et cliquez sur <strong>✨ Générer l'offre avec l'IA</strong> pour rédiger automatiquement description, missions, profil recherché, compétences et questions d'entretien.</>}
        </InfoBanner>

        <div className={`${tw.bgWarningSoft} border ${tw.borderWarning} rounded-xl p-4`}>
          <p className={`text-sm ${tw.textWarning900}`}>
            ⚠️ Cette offre sera <strong>examinée par l'équipe TafTech</strong> avant d'être visible publiquement.
            Vous serez informé par email dès sa validation.
          </p>
        </div>

        <SectionInfosPoste job={job} />
        <SectionProfil job={job} />
        <SectionLocalisation job={job} />
        <SectionMission job={job} />
        <SectionQuestionnaire job={job} />

        <CreateQuestionnaireModal
          open={showCreateQuestionnaire}
          onClose={() => setShowCreateQuestionnaire(false)}
          onCreated={(created) => {
            setQuestionnaires((prev) => [...prev, created]);
            setFormData((prev) => ({ ...prev, questionnaire: created.id }));
          }}
          initialQuestions={modalPrefillQuestions}
          initialTitre={modalPrefillQuestions ? `Entretien — ${formData.titre}` : ""}
        />

        <SectionPublication job={job} />

        {/* Fix 4 : boutons desktop */}
        <div className="hidden sm:flex items-center justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${tw.buttonNeutralSoft}`}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm ${tw.bgTealSolid}`}
          >
            <Send size={15} />
            {loading ? "Publication..." : "Publier l'offre"}
          </button>
        </div>
      </form>

      {/* Fix 4 : boutons sticky mobile */}
      <div className={`fixed bottom-0 left-0 right-0 sm:hidden ${tw.surface} border-t ${tw.borderBase} px-4 py-3 flex gap-3 z-40`}>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${tw.buttonNeutralSoft}`}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${tw.bgTealSolid}`}
        >
          <Send size={15} />
          {loading ? "Publication..." : "Publier l'offre"}
        </button>
      </div>
    </div>
  );
};

export default CreateJob;
