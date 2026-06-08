import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Trash2, Pencil, X, GripVertical } from "lucide-react";

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

const Questionnaires = () => {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ titre: "", questions: [questionVide()] });

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await jobsService.getQuestionnaires();
        setQuestionnaires(data);
      } catch (err) {
        reportError("ECHEC_GET_QUESTIONNAIRES", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ titre: "", questions: [questionVide()] });
    setShowModal(true);
  };

  const handleOpenEdit = (q) => {
    setEditingId(q.id);
    setForm({
      titre: q.titre,
      questions: q.questions.map((qq) => ({
        texte: qq.texte,
        type_question: qq.type_question,
        requis: qq.requis,
        disqualifiant: qq.disqualifiant,
        choix: qq.choix.length > 0 ? qq.choix : [{ texte: "" }, { texte: "" }],
      })),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return toast.error("Le titre est obligatoire.");
    if (form.questions.some((q) => !q.texte.trim()))
      return toast.error("Toutes les questions doivent avoir un texte.");
    try {
      if (editingId) {
        const updated = await jobsService.updateQuestionnaire(editingId, form);
        setQuestionnaires(
          questionnaires.map((q) => (q.id === editingId ? updated : q)),
        );
        toast.success("Questionnaire mis à jour !");
      } else {
        const created = await jobsService.createQuestionnaire(form);
        setQuestionnaires([...questionnaires, created]);
        toast.success("Questionnaire créé !");
      }
      setShowModal(false);
    } catch (err) {
      reportError("ECHEC_SAVE_QUESTIONNAIRE", err);
      toast.error("Erreur lors de la sauvegarde.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce questionnaire ?")) return;
    try {
      await jobsService.deleteQuestionnaire(id);
      setQuestionnaires(questionnaires.filter((q) => q.id !== id));
      toast.success("Questionnaire supprimé.");
    } catch (err) {
      reportError("ECHEC_DELETE_QUESTIONNAIRE", err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const addQuestion = () =>
    setForm({ ...form, questions: [...form.questions, questionVide()] });

  const removeQuestion = (i) =>
    setForm({
      ...form,
      questions: form.questions.filter((_, idx) => idx !== i),
    });

  const updateQuestion = (i, field, value) => {
    const questions = [...form.questions];
    questions[i] = { ...questions[i], [field]: value };
    setForm({ ...form, questions });
  };

  const addChoix = (i) => {
    const questions = [...form.questions];
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

  const hasChoix = (type) =>
    type === "CHOIX_UNIQUE" || type === "CHOIX_MULTIPLE";

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Questionnaires</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Créez des questionnaires à associer à vos offres.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Nouveau questionnaire
        </button>
      </div>

      {questionnaires.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-900 mb-1">
            Aucun questionnaire
          </p>
          <p className="text-xs text-slate-500">
            Créez votre premier questionnaire pour filtrer vos candidats.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questionnaires.map((q) => (
            <div
              key={q.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {q.titre}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {q.questions.length} question(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(q)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-slate-900">
                {editingId
                  ? "Modifier le questionnaire"
                  : "Nouveau questionnaire"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Titre du questionnaire *
                </label>
                <input
                  required
                  className={inputClass}
                  placeholder="Ex: Questionnaire Développeur React"
                  value={form.titre}
                  onChange={(e) => setForm({ ...form, titre: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Le titre est utilisé comme titre du modèle, non visible par
                  les candidats.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Questions ({form.questions.length}/10)
                  </p>
                </div>

                {form.questions.map((q, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical
                        size={16}
                        className="text-slate-300 flex-shrink-0"
                      />
                      <p className="text-xs font-semibold text-slate-600">
                        Question {i + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeQuestion(i)}
                        className="ml-auto p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <select
                        value={q.type_question}
                        onChange={(e) =>
                          updateQuestion(i, "type_question", e.target.value)
                        }
                        className={inputClass + " flex-shrink-0 w-48"}
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      className={inputClass}
                      placeholder="Texte de la question *"
                      value={q.texte}
                      onChange={(e) =>
                        updateQuestion(i, "texte", e.target.value)
                      }
                    />

                    {hasChoix(q.type_question) && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">
                          Réponses possibles
                        </p>
                        {q.choix.map((c, ci) => (
                          <div key={ci} className="flex gap-2">
                            <input
                              className={inputClass}
                              placeholder={`Choix ${ci + 1}`}
                              value={c.texte}
                              onChange={(e) =>
                                updateChoix(i, ci, e.target.value)
                              }
                            />
                            {q.choix.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeChoix(i, ci)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addChoix(i)}
                          className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} /> Ajouter une option
                        </button>
                      </div>
                    )}

                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          className="accent-indigo-600"
                          checked={q.requis}
                          onChange={(e) =>
                            updateQuestion(i, "requis", e.target.checked)
                          }
                        />
                        Requis
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          className="accent-red-500"
                          checked={q.disqualifiant}
                          onChange={(e) =>
                            updateQuestion(i, "disqualifiant", e.target.checked)
                          }
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
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Ajouter une question
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingId ? "Mettre à jour" : "Créer le questionnaire"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Questionnaires;
