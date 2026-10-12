// Barre d'onglets du détail candidature + boutons de documents (CV, documents partagés, suppression).
import { FileText, Zap, Trash2 } from "lucide-react";
import { authService } from "../../../../Services/authService";
import { candidatFichierUrl, documentPartageFichierUrl } from "../../../../utils/mediaUrl";
import { tw } from "../../../../theme";
import { confirmToast } from "../../../../utils/confirmToast";

export const BarreOnglets = ({
  selectedCandidature,
  offre,
  candidatData,
  candidatUserId,
  activeDetailTab,
  setActiveDetailTab,
  supprimerCandidature,
  documentsPartages,
}) => (
  <div className={`flex flex-wrap border-b ${tw.borderSubtle}`}>
    {[
      "profil",
      "ia",
      "evaluation",
      ...(offre.questionnaire ? ["questionnaire"] : []),
    ].map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveDetailTab(tab)}
        className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${activeDetailTab === tab ? `border-teal-700 ${tw.textTeal}` : `border-transparent ${tw.textMuted700} hover:text-slate-900`}`}
      >
        {tab === "profil" && "Profil"}
        {tab === "ia" && "Analyse IA"}
        {tab === "evaluation" && "Évaluation"}
        {tab === "questionnaire" && "Questionnaire"}
      </button>
    ))}
    <div className="ml-auto flex flex-wrap items-center justify-end px-4 py-1.5 gap-2 max-w-full">
      {candidatData?.cv_pdf && (
        <a
          href={candidatFichierUrl(candidatUserId, "cv")}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.pillTeal} text-xs font-medium rounded-lg transition-colors shrink-0`}
        >
          <FileText size={12} /> CV PDF
        </a>
      )}
      {selectedCandidature.cv_rapide_url && (
        <a
          href={selectedCandidature.cv_rapide_url}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.pillAmberSoft} text-xs font-medium rounded-lg transition-colors shrink-0`}
        >
          <Zap size={12} /> CV Rapide
        </a>
      )}
      {documentsPartages.map((doc) => (
        <a
          key={doc.id}
          href={documentPartageFichierUrl(candidatUserId, doc.id)}
          target="_blank"
          rel="noreferrer"
          title={`${doc.nom_personnalise || doc.type_document || "Document partagé"} · Partagé par le candidat le ${new Date(doc.date_partage).toLocaleDateString("fr-FR")}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors min-w-0 max-w-40"
        >
          <FileText size={12} className="shrink-0" />
          <span className="truncate">{doc.nom_personnalise || doc.type_document || "Document partagé"}</span>
        </a>
      ))}
      {selectedCandidature.statut === "REFUSE" && authService.peutFaire("UTILISATEUR") && (
        <button
          onClick={() =>
            confirmToast("Supprimer définitivement cette candidature ?", () =>
              supprimerCandidature(selectedCandidature.id),
            )
          }
          title="Supprimer la candidature"
          className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.dangerPillSoft} text-xs font-medium rounded-lg transition-colors`}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  </div>
);
