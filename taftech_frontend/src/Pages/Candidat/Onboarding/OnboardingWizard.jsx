import React from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle2 } from "lucide-react";
import { tw } from "../../../theme";
import { useOnboardingWizard } from "./useOnboardingWizard";
import { StepUploadCV } from "./steps/StepUploadCV";
import { StepInfos } from "./steps/StepInfos";
import { StepExperiences } from "./steps/StepExperiences";
import { StepFormations } from "./steps/StepFormations";
import { StepLangues } from "./steps/StepLangues";
import { StepCompetences } from "./steps/StepCompetences";

const STEP_LABELS = [
  "Upload CV",
  "Infos personnelles",
  "Expériences",
  "Formations",
  "Langues",
  "Compétences",
  "Terminé",
];

const OnboardingWizard = ({ mode = "page", onClose }) => {
  const navigate = useNavigate();
  const wizard = useOnboardingWizard();
  const { step, loading } = wizard;

  const handleFinish = () => {
    if (mode === "modal" && onClose) onClose();
    else navigate("/dashboard-candidat");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${tw.borderPrimary}`} />
      </div>
    );
  }

  return (
    <div className={mode === "page" ? `min-h-screen ${tw.authPageBg} flex items-center justify-center p-4` : ""}>
      <div className={`max-w-2xl w-full ${tw.surface} rounded-2xl shadow-xl p-8 relative`}>
        {mode === "modal" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${tw.modalCloseButton}`}
          >
            <X size={18} />
          </button>
        )}

        {/* STEPPER */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step > n ? tw.progressBadgeDone : step === n ? `${tw.bgPrimary} ${tw.textOnDark}` : `${tw.surfaceSubtle} ${tw.textMuted}`
                  }`}>
                    {step > n ? <CheckCircle2 size={14} /> : n}
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${step >= n ? tw.textEmphasis800 : tw.textMuted}`}>{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && <div className={`w-4 h-px shrink-0 ${step > n ? tw.progressConnectorDone : tw.bgSlate200}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {step === 1 && <StepUploadCV parserLoading={wizard.parserLoading} uploadCV={wizard.uploadCV} skipStep={wizard.skipStep} />}
        {step === 2 && (
          <StepInfos
            infosForm={wizard.infosForm}
            setInfosForm={wizard.setInfosForm}
            infosMode={wizard.infosMode}
            setInfosMode={wizard.setInfosMode}
            saveInfosStep={wizard.saveInfosStep}
            skipStep={wizard.skipStep}
            constants={wizard.constants}
            profil={wizard.profil}
          />
        )}
        {step === 3 && (
          <StepExperiences
            pendingExperiences={wizard.pendingExperiences}
            setPendingExperiences={wizard.setPendingExperiences}
            experiencesMode={wizard.experiencesMode}
            setExperiencesMode={wizard.setExperiencesMode}
            saveExperiencesStep={wizard.saveExperiencesStep}
            skipStep={wizard.skipStep}
            profil={wizard.profil}
          />
        )}
        {step === 4 && (
          <StepFormations
            pendingFormations={wizard.pendingFormations}
            setPendingFormations={wizard.setPendingFormations}
            formationsMode={wizard.formationsMode}
            setFormationsMode={wizard.setFormationsMode}
            saveFormationsStep={wizard.saveFormationsStep}
            skipStep={wizard.skipStep}
            profil={wizard.profil}
          />
        )}
        {step === 5 && (
          <StepLangues
            pendingLangues={wizard.pendingLangues}
            setPendingLangues={wizard.setPendingLangues}
            languesMode={wizard.languesMode}
            setLanguesMode={wizard.setLanguesMode}
            saveLanguesStep={wizard.saveLanguesStep}
            skipStep={wizard.skipStep}
            profil={wizard.profil}
          />
        )}
        {step === 6 && (
          <StepCompetences
            pendingCompetences={wizard.pendingCompetences}
            setPendingCompetences={wizard.setPendingCompetences}
            competencesMode={wizard.competencesMode}
            setCompetencesMode={wizard.setCompetencesMode}
            saveCompetencesStep={wizard.saveCompetencesStep}
            skipStep={wizard.skipStep}
            profil={wizard.profil}
          />
        )}
        {step === 7 && (
          <div className="text-center">
            <div className={`w-16 h-16 ${tw.bgSuccessSoft} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle2 size={32} className={tw.textSuccess} />
            </div>
            <h3 className={`${tw.pageTitlePetit} mb-2`}>Félicitations !</h3>
            <p className={`${tw.bodyText} mb-6`}>Votre profil est complété à {wizard.completionPercent}%.</p>
            <button type="button" onClick={handleFinish} className={`${tw.buttonPrimary} px-8 py-2.5`}>
              {mode === "modal" ? "Fermer" : "Continuer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
