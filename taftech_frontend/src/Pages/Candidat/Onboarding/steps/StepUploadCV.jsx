import React, { useRef, useState } from "react";
import { Sparkles, FileText } from "lucide-react";
import { tw } from "../../../../theme";
import QuotaIABadge from "../../../../Components/QuotaIABadge";
import { ApercuDonneesIA } from "../../../../Components/ApercuDonneesIA";

export const StepUploadCV = ({ parserLoading, uploadCV, skipStep, profil, quotaParserCV }) => {
  const inputRef = useRef(null);
  // Le fichier choisi n'est plus analysé tout de suite : le candidat peut d'abord voir les
  // données qui seront transmises à l'IA, puis lance l'analyse lui-même.
  const [fichierEnAttente, setFichierEnAttente] = useState(null);

  const onChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) setFichierEnAttente(file);
  };

  // Un nouveau fichier choisi REMPLACE l'ancien CV à l'écran : on n'affiche plus l'ancien ni son bouton d'analyse.
  const ancienCvAffiche = !!profil?.cv_pdf && !fichierEnAttente;

  return (
    <div className="text-center">
      <h3 className={`${tw.pageTitlePetit} mb-2`}>Facilitez la création de votre profil</h3>
      <p className={`${tw.bodyText} mb-4`}>Importez votre CV, vos informations se rempliront automatiquement.</p>
      {quotaParserCV && (
        <div className="flex justify-center mb-4">
          <QuotaIABadge quota={quotaParserCV} />
        </div>
      )}

      {ancienCvAffiche && (
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

      {ancienCvAffiche && (
        <div className="mb-4">
          <ApercuDonneesIA fonction="PARSER_CV" />
        </div>
      )}

      {ancienCvAffiche && (
        <button
          type="button"
          onClick={() => uploadCV(null)}
          disabled={parserLoading || quotaParserCV?.disponible === false}
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

      {ancienCvAffiche && (
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className={`text-xs ${tw.textMuted}`}>ou téléversez un nouveau CV</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
      )}

      {fichierEnAttente && (
        <div className="mb-4 space-y-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm font-semibold truncate ${tw.textStrong}`}>{fichierEnAttente.name}</p>
            {profil?.cv_pdf && (
              <button
                type="button"
                onClick={() => setFichierEnAttente(null)}
                disabled={parserLoading}
                className={`${tw.linkPrimary} shrink-0 text-xs font-semibold disabled:opacity-50`}
              >
                Annuler
              </button>
            )}
          </div>
          <ApercuDonneesIA fonction="PARSER_CV" fichier={fichierEnAttente} />
          <button
            type="button"
            onClick={() => uploadCV(fichierEnAttente)}
            disabled={parserLoading || quotaParserCV?.disponible === false}
            className={`${tw.buttonPrimary} w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60`}
          >
            <Sparkles size={16} /> Analyser mon CV
          </button>
        </div>
      )}

      <div className={`rounded-xl p-10 text-center relative cursor-pointer transition-colors ${tw.dropzonePrimary}`}>
        <input
          ref={inputRef}
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".pdf,.docx,.doc"
          onChange={onChange}
          disabled={parserLoading || quotaParserCV?.disponible === false}
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
