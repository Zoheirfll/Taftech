import React, { useRef } from "react";
import { Sparkles } from "lucide-react";
import { tw } from "../../../../theme";

export const StepUploadCV = ({ parserLoading, uploadCV, skipStep }) => {
  const inputRef = useRef(null);

  const onChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) uploadCV(file);
  };

  return (
    <div className="text-center">
      <h3 className={`${tw.pageTitlePetit} mb-2`}>Facilitez la création de votre profil</h3>
      <p className={`${tw.bodyText} mb-6`}>Importez votre CV, vos informations se rempliront automatiquement.</p>
      <div className={`rounded-xl p-10 text-center relative cursor-pointer transition-colors ${tw.dropzonePrimary}`}>
        <input
          ref={inputRef}
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".pdf,.docx,.doc"
          onChange={onChange}
          disabled={parserLoading}
        />
        {parserLoading ? (
          <div>
            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${tw.borderPrimary} mx-auto mb-3`} />
            <p className={`text-sm font-semibold ${tw.textPrimaryStrong}`}>Extraction de votre CV…</p>
          </div>
        ) : (
          <div>
            <Sparkles size={28} className={`${tw.textPrimary} mx-auto mb-3`} />
            <p className={`text-sm font-semibold ${tw.textStrong}`}>Cliquez pour choisir un fichier</p>
            <p className={`text-xs ${tw.textMuted} mt-1`}>PDF, DOC ou DOCX — 5 Mo max</p>
          </div>
        )}
      </div>
      <button type="button" onClick={skipStep} disabled={parserLoading} className={`${tw.linkPrimary} text-sm font-semibold mt-6 disabled:opacity-50`}>
        Passer cette étape
      </button>
    </div>
  );
};
