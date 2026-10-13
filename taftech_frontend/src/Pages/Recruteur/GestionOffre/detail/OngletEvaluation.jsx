// Onglet « Évaluation » : note globale /20 avec modification/suppression, ou invitation à évaluer le candidat.
import { Star, Trash2 } from "lucide-react";
import { authService } from "../../../../Services/authService";
import { TooltipIcon } from "../../../../Components/Tooltip";
import { tw } from "../../../../theme";

export const OngletEvaluation = ({
  selectedCandidature,
  setModalEval,
  setEvalForm,
  supprimerEvaluation,
}) => (
  <div className="p-6 overflow-y-auto max-h-[calc(100vh-220px)]">
    {selectedCandidature.note_globale ? (
      <div className="text-center">
        <p className={`text-5xl font-bold ${tw.textTeal} tabular-nums mb-1 flex items-center justify-center gap-1`}>
          {selectedCandidature.note_globale}
          <span className={`text-xl ${tw.textMuted}`}>/20</span>
          <TooltipIcon text="Note calculée sur 4 critères /5 chacun : Technique, Communication, Motivation, Expérience. Total = moyenne × 4." position="right" />
        </p>
        {selectedCandidature.commentaire_evaluation && (
          <p className={`text-sm ${tw.textMuted700} italic mt-2`}>
            "{selectedCandidature.commentaire_evaluation}"
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => {
              setEvalForm({
                note_technique: selectedCandidature.note_technique || 0,
                note_communication: selectedCandidature.note_communication || 0,
                note_motivation: selectedCandidature.note_motivation || 0,
                note_experience: selectedCandidature.note_experience || 0,
                commentaire_evaluation: selectedCandidature.commentaire_evaluation || "",
              });
              setModalEval({ isOpen: true, candidature: selectedCandidature });
            }}
            className={`flex items-center gap-1.5 px-4 py-2 ${tw.surfaceSubtle} ${tw.textMuted700} text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors`}
          >
            <Star size={12} /> Modifier la note
          </button>
          {authService.peutFaire("UTILISATEUR") && (
            <button
              onClick={() => supprimerEvaluation(selectedCandidature.id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={12} /> Supprimer
            </button>
          )}
        </div>
      </div>
    ) : (
      <div className="text-center py-4">
        <Star size={32} className={`${tw.textSubtle} mx-auto mb-3`} />
        <p className={`text-sm font-medium ${tw.textStrong} mb-1`}>
          Aucune évaluation
        </p>
        <p className={`text-xs ${tw.textMuted700} mb-4`}>
          Notez ce candidat après l'entretien.
        </p>
        {authService.peutFaire("UTILISATEUR") && (
          <button
            onClick={() => {
              setEvalForm({
                note_technique: 0,
                note_communication: 0,
                note_motivation: 0,
                note_experience: 0,
                commentaire_evaluation: "",
              });
              setModalEval({
                isOpen: true,
                candidature: selectedCandidature,
              });
            }}
            className={`px-4 py-2.5 ${tw.bgTealSolid} text-sm font-semibold rounded-lg transition-colors`}
          >
            Évaluer ce candidat
          </button>
        )}
      </div>
    )}
  </div>
);
