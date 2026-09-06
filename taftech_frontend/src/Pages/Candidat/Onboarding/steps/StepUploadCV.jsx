import React, { useRef } from "react";
import { Sparkles, FileText } from "lucide-react";
import { tw } from "../../../../theme";

export const StepUploadCV = ({ parserLoading, uploadCV, skipStep, profil }) => {
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

      {profil?.cv_pdf && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border text-left mb-4 ${tw.bgSuccessSoft} border-emerald-200`}>
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <FileText size={18} className={tw.textSuccess} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${tw.textSuccess}`}>
              CV actuellement sur votre profil
            </p>
            <p className={`text-sm font-semibold truncate ${tw.textStrong}`}>
              {profil.cv_pdf.split("/").pop()}
            </p>
            {profil.cv_pdf_maj_le && (
              <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                Mis à jour le {new Date(profil.cv_pdf_maj_le).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      )}

      {profil?.cv_pdf && (
        <button
          type="button"
          onClick={() => uploadCV(null)}
          disabled={parserLoading}
          className={`${tw.buttonPrimary} w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60 mb-4`}
        >
          {parserLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Sparkles size={16} /> Analyser ce CV
            </>
          )}
        </button>
      )}

      {profil?.cv_pdf && (
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className={`text-xs ${tw.textMuted}`}>ou téléversez un nouveau CV</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
      )}

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
