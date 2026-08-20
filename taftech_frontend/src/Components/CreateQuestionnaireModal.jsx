import React, { useState, useEffect } from "react";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, X, GripVertical } from "lucide-react";
import { tw } from "../theme";

const TYPE_OPTIONS = [
  { value: "COURT", label: "Réponse courte" },
  { value: "LONG", label: "Réponse longue" },
  { value: "NUMERIQUE", label: "Numérique" },
  { value: "CHOIX_UNIQUE", label: "Choix unique" },
  { value: "CHOIX_MULTIPLE", label: "Choix multiple" },
];

const questionVide = () => ({
  texte: "",
  type_question: "CHOIX_UNIQUE",
  requis: false,
  disqualifiant: false,
  choix: [{ texte: "" }, { texte: "" }],
});

const MAX_CHOIX = 6;

// Modale de création rapide de questionnaire, réutilisable partout où on a besoin d'en créer
// un sans quitter la page (ex: en cours de publication d'une offre). Création uniquement —
// pas d'édition/suppression, pour ça la page dédiée Questionnaires.jsx reste la référence.
export const CreateQuestionnaireModal = ({ open, onClose, onCreated, initialTitre = "", initialQuestions = null }) => {
  const [form, setForm] = useState({ titre: "", questions: [questionVide()] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Pré-remplissage : suggestions de questions d'entretien générées par l'IA (CreateJob).
  // Chaque suggestion peut être une simple chaîne (texte libre) ou un objet enrichi
  // { texte, type_question, choix } quand l'IA a proposé un QCM/numérique adapté à la question.
  useEffect(() => {
    if (!open) return;
    if (initialQuestions && initialQuestions.length > 0) {
      setForm({
        titre: initialTitre,
        questions: initialQuestions.map((q) => {
          const question = typeof q === "string" ? { texte: q } : q;
          const type = TYPE_OPTIONS.some((t) => t.value === question.type_question) ? question.type_question : "COURT";
          const hasChoixType = type === "CHOIX_UNIQUE" || type === "CHOIX_MULTIPLE";
          const choixIA = Array.isArray(question.choix) ? question.choix.filter((c) => c && c.trim()) : [];
          const choix = hasChoixType && choixIA.length >= 2
            ? choixIA.map((texte) => ({ texte }))
            : [{ texte: "" }, { texte: "" }];
          return {
            texte: question.texte || "",
            type_question: hasChoixType && choixIA.length < 2 ? "COURT" : type,
            requis: false,
            disqualifiant: false,
            choix,
          };
        }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const inputClass = `w-full px-4 py-2.5 rounded-xl text-sm ${tw.inputTeal}`;

  const addQuestion = () =>
    setForm({ ...form, questions: [...form.questions, questionVide()] });

  const removeQuestion = (i) =>
    setForm({ ...form, questions: form.questions.filter((_, idx) => idx !== i) });

  const updateQuestion = (i, field, value) => {
    const questions = [...form.questions];
    questions[i] = { ...questions[i], [field]: value };
    setForm({ ...form, questions });
  };

  const addChoix = (i) => {
    const questions = [...form.questions];
    if (questions[i].choix.length >= MAX_CHOIX) return;
    questions[i].choix = [...questions[i].choix, { texte: "" }];
    setForm({ ...form, questions });
  };

  const removeChoix = (qi, ci) => {
    const questions = [...form.questions];
    questions[qi].choix = questions[qi].choix.filter((_, idx) => idx !== ci);
    setForm({ ...form, questions });
  };

  const updateChoix = (qi, ci, value) => {
    const questions = [...form.questions];
    questions[qi].choix[ci] = { texte: value };
    setForm({ ...form, questions });
  };

  const hasChoix = (type) => type === "CHOIX_UNIQUE" || type === "CHOIX_MULTIPLE";

  const handleClose = () => {
    setForm({ titre: "", questions: [questionVide()] });
    setErrors({});
    onClose();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const newErrors = {};
    if (!form.titre.trim()) newErrors.titre = true;
    form.questions.forEach((q, i) => {
      if (!q.texte.trim()) newErrors[`q_${i}`] = true;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const created = await jobsService.createQuestionnaire(form);
      toast.success("Questionnaire créé !");
      onCreated(created);
      handleClose();
    } catch (err) {
      reportError("ECHEC_CREATE_QUESTIONNAIRE_MODAL", err);
      toast.error("Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${tw.modalOverlay} p-4`}>
      <div className={`${tw.surface} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className={`px-6 py-4 border-b ${tw.borderSubtle} flex justify-between items-center sticky top-0 ${tw.surface} z-10`}>
          <h3 className={`text-base font-bold ${tw.textStrong}`}>Nouveau questionnaire</h3>
          <button onClick={handleClose} className={`p-1.5 ${tw.modalCloseButton} rounded-lg transition-colors`}>
            <X size={18} />
          </button>
        </div>

        {/* div (pas form) : cette modale peut s'ouvrir dans une page qui a déjà son propre
            <form> (ex: Publier une offre) — un <form> imbriqué est invalide en HTML et fait
            soumettre le formulaire parent au lieu du bon */}
        <div className="p-6 space-y-5">
          <div>
            <label className={`text-sm font-semibold ${tw.textMuted} mb-2 block`}>
              Titre du questionnaire *
            </label>
            <input
              required
              className={inputClass + (errors.titre ? ` ${tw.inputErrorRing}` : "")}
              placeholder="Ex: Questionnaire Développeur React"
              value={form.titre}
              onChange={(e) => {
                setForm({ ...form, titre: e.target.value });
                setErrors((p) => ({ ...p, titre: false }));
              }}
            />
            {errors.titre && <p className={`text-xs ${tw.textErrorMuted} mt-1`}>Le titre est obligatoire.</p>}
          </div>

          <div className="space-y-4">
            <p className={tw.sectionLabel}>Questions ({form.questions.length}/10)</p>

            {form.questions.map((q, i) => (
              <div key={i} className={`${tw.surfaceMuted} border ${tw.borderBase} rounded-xl p-4 space-y-3`}>
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className={`${tw.textSubtle} shrink-0`} />
                  <p className={`text-xs font-semibold ${tw.textMuted}`}>Question {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeQuestion(i)}
                    className={`ml-auto p-1 ${tw.textMuted} hover:text-red-500 transition-colors`}
                  >
                    <X size={14} />
                  </button>
                </div>

                <select
                  value={q.type_question}
                  onChange={(e) => updateQuestion(i, "type_question", e.target.value)}
                  className={inputClass + " shrink-0 w-48"}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <input
                  className={inputClass + (errors[`q_${i}`] ? ` ${tw.inputErrorRing}` : "")}
                  placeholder="Texte de la question *"
                  value={q.texte}
                  onChange={(e) => {
                    updateQuestion(i, "texte", e.target.value);
                    setErrors((p) => ({ ...p, [`q_${i}`]: false }));
                  }}
                />
                {errors[`q_${i}`] && <p className={`text-xs ${tw.textErrorMuted}`}>Le texte de la question est obligatoire.</p>}

                {hasChoix(q.type_question) && (
                  <div className="space-y-2">
                    <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase`}>Réponses possibles</p>
                    {q.choix.map((c, ci) => (
                      <div key={ci} className="flex gap-2">
                        <input
                          className={inputClass}
                          placeholder={`Choix ${ci + 1}`}
                          value={c.texte}
                          onChange={(e) => updateChoix(i, ci, e.target.value)}
                        />
                        {q.choix.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeChoix(i, ci)}
                            className={`p-2 ${tw.textMuted} hover:text-red-500 transition-colors shrink-0`}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {q.choix.length < MAX_CHOIX ? (
                      <button
                        type="button"
                        onClick={() => addChoix(i)}
                        className={`text-xs ${tw.textTeal} font-medium hover:underline flex items-center gap-1`}
                      >
                        <Plus size={12} /> Ajouter une option
                      </button>
                    ) : (
                      <p className={`text-[10px] ${tw.textMuted} italic`}>Maximum {MAX_CHOIX} options atteint.</p>
                    )}
                  </div>
                )}

                <div className="flex gap-4 pt-1">
                  <label className={`flex items-center gap-2 cursor-pointer text-xs font-medium ${tw.textMuted700}`}>
                    <input
                      type="checkbox"
                      className={tw.accentTeal}
                      checked={q.requis}
                      onChange={(e) => updateQuestion(i, "requis", e.target.checked)}
                    />
                    Requis
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer text-xs font-medium ${tw.textMuted700}`}>
                    <input
                      type="checkbox"
                      className={tw.accentRed}
                      checked={q.disqualifiant}
                      onChange={(e) => updateQuestion(i, "disqualifiant", e.target.checked)}
                    />
                    Disqualifiant
                  </label>
                </div>
              </div>
            ))}

            {form.questions.length < 10 && (
              <button
                type="button"
                onClick={addQuestion}
                className={`w-full py-2.5 border-2 border-dashed ${tw.borderBase} ${tw.textMuted700} text-sm font-medium rounded-xl hover:border-teal-400 hover:text-teal-700 transition-colors flex items-center justify-center gap-2`}
              >
                <Plus size={16} /> Ajouter une question
              </button>
            )}
          </div>

          <div className={`flex gap-3 pt-2 border-t ${tw.borderSubtle}`}>
            <button
              type="button"
              onClick={handleClose}
              className={`flex-1 py-2.5 ${tw.cancelPillGray} text-sm font-semibold rounded-xl transition-colors`}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className={`flex-1 py-2.5 ${tw.bgTealSolid} text-sm font-semibold rounded-xl transition-colors disabled:opacity-60`}
            >
              {saving ? "Création..." : "Créer le questionnaire"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
