import React from "react";
import { X, Calendar } from "lucide-react";

const RatingRow = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${value >= num ? "bg-teal-700 text-white shadow-sm" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
        >
          {num}
        </button>
      ))}
    </div>
  </div>
);

const CRITERES_COMPARATEUR = [
  { label: "Spécialité", key: "specialite", max: 25 },
  { label: "Diplôme", key: "diplome", max: 20 },
  { label: "Expérience", key: "experience", max: 20 },
  { label: "Région", key: "region", max: 20 },
  { label: "Compétences", key: "competences", max: 15 },
];

export const Modals = ({
  offre,
  getCandidatData,
  // Entretien
  modalEntretien,
  setModalEntretien,
  entretienForm,
  setEntretienForm,
  validerEntretien,
  // Évaluation
  modalEval,
  setModalEval,
  evalForm,
  setEvalForm,
  soumettreEvaluation,
  // Comparateur
  showCompare,
  setShowCompare,
  compareIds,
  setCompareIds,
}) => {
  return (
    <>
      {/* MODALE COMPARATEUR */}
      {showCompare &&
        compareIds.length === 2 &&
        (() => {
          const c1 = offre.candidatures.find((c) => c.id === compareIds[0]);
          const c2 = offre.candidatures.find((c) => c.id === compareIds[1]);
          const d1 = c1?.details_matching?.scores || c1?.details_matching || {};
          const d2 = c2?.details_matching?.scores || c2?.details_matching || {};
          const nom1 = getCandidatData(c1)
            ? `${getCandidatData(c1).last_name} ${getCandidatData(c1).first_name}`
            : `${c1.nom_rapide} ${c1.prenom_rapide}`;
          const nom2 = getCandidatData(c2)
            ? `${getCandidatData(c2).last_name} ${getCandidatData(c2).first_name}`
            : `${c2.nom_rapide} ${c2.prenom_rapide}`;
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-base font-bold text-slate-900">
                    Comparaison candidats
                  </h3>
                  <button
                    onClick={() => setShowCompare(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-xs text-slate-400 font-medium pb-3 w-1/3">
                        Critère
                      </th>
                      <th className="text-center text-xs font-semibold text-teal-800 pb-3 w-1/3 truncate">
                        {nom1}
                      </th>
                      <th className="text-center text-xs font-semibold text-teal-800 pb-3 w-1/3 truncate">
                        {nom2}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 text-xs font-semibold text-slate-600">
                        Score global
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`text-sm font-bold ${parseFloat(c1.score_matching) >= 80 ? "text-emerald-600" : parseFloat(c1.score_matching) >= 60 ? "text-amber-600" : "text-red-500"}`}
                        >
                          {parseFloat(c1.score_matching || 0)}%
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`text-sm font-bold ${parseFloat(c2.score_matching) >= 80 ? "text-emerald-600" : parseFloat(c2.score_matching) >= 60 ? "text-amber-600" : "text-red-500"}`}
                        >
                          {parseFloat(c2.score_matching || 0)}%
                        </span>
                      </td>
                    </tr>
                    {CRITERES_COMPARATEUR.map(({ label, key, max }) => {
                      const v1 = d1[key] ?? 0;
                      const v2 = d2[key] ?? 0;
                      return (
                        <tr key={key}>
                          <td className="py-3 text-xs text-slate-500">
                            {label}
                          </td>
                          <td className="py-3 text-center">
                            <div>
                              <span
                                className={`text-xs font-semibold ${v1 > v2 ? "text-emerald-600" : v1 < v2 ? "text-red-500" : "text-slate-500"}`}
                              >
                                {v1}/{max}
                              </span>
                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full ${v1 >= max ? "bg-emerald-500" : v1 >= max / 2 ? "bg-amber-400" : "bg-red-400"}`}
                                  style={{ width: `${(v1 / max) * 100}%` }}
                                />
                              </div>
                              {c1.details_matching?.explications?.[key] && (
                                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                                  {c1.details_matching.explications[key]}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <div>
                              <span
                                className={`text-xs font-semibold ${v2 > v1 ? "text-emerald-600" : v2 < v1 ? "text-red-500" : "text-slate-500"}`}
                              >
                                {v2}/{max}
                              </span>
                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full ${v2 >= max ? "bg-emerald-500" : v2 >= max / 2 ? "bg-amber-400" : "bg-red-400"}`}
                                  style={{ width: `${(v2 / max) * 100}%` }}
                                />
                              </div>
                              {c2.details_matching?.explications?.[key] && (
                                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                                  {c2.details_matching.explications[key]}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Points forts & écarts */}
                <div className="mt-5 grid grid-cols-2 gap-4">
                  {[
                    { c: c1, nom: nom1 },
                    { c: c2, nom: nom2 },
                  ].map(({ c, nom }) => (
                    <div key={nom}>
                      <p className="text-xs font-bold text-slate-700 mb-2 truncate">
                        {nom}
                      </p>
                      {c.details_matching?.highlights?.points_forts?.length >
                        0 && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-2">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1.5">
                            ✓ Points forts
                          </p>
                          {c.details_matching.highlights.points_forts.map(
                            (p, i) => (
                              <p
                                key={i}
                                className="text-[10px] text-emerald-800 mb-1"
                              >
                                • {p}
                              </p>
                            ),
                          )}
                        </div>
                      )}
                      {c.details_matching?.highlights?.ecarts?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-amber-700 uppercase mb-1.5">
                            ⚠ Écarts
                          </p>
                          {c.details_matching.highlights.ecarts.map((e, i) => (
                            <p
                              key={i}
                              className="text-[10px] text-amber-800 mb-1"
                            >
                              • {e}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => setShowCompare(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => {
                      setShowCompare(false);
                      setCompareIds([]);
                    }}
                    className="flex-1 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* MODALE ENTRETIEN */}
      {modalEntretien.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Programmer un entretien
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Un email d'invitation sera envoyé automatiquement.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={entretienForm.date}
                    onChange={(e) =>
                      setEntretienForm({
                        ...entretienForm,
                        date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Heure *
                  </label>
                  <input
                    type="time"
                    value={entretienForm.heure}
                    onChange={(e) =>
                      setEntretienForm({
                        ...entretienForm,
                        heure: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Message & lieu
                </label>
                <textarea
                  rows="3"
                  placeholder="Lien Google Meet, adresse..."
                  value={entretienForm.message}
                  onChange={(e) =>
                    setEntretienForm({
                      ...entretienForm,
                      message: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() =>
                    setModalEntretien({ isOpen: false, candId: null })
                  }
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={validerEntretien}
                  className="flex-1 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors"
                >
                  Envoyer l'invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ÉVALUATION */}
      {modalEval.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Évaluation post-entretien
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Notez le candidat sur 4 critères (total sur 20).
            </p>
            <div className="mb-6">
              <RatingRow
                label="Compétence technique"
                value={evalForm.note_technique}
                onChange={(v) =>
                  setEvalForm({ ...evalForm, note_technique: v })
                }
              />
              <RatingRow
                label="Communication"
                value={evalForm.note_communication}
                onChange={(v) =>
                  setEvalForm({ ...evalForm, note_communication: v })
                }
              />
              <RatingRow
                label="Motivation"
                value={evalForm.note_motivation}
                onChange={(v) =>
                  setEvalForm({ ...evalForm, note_motivation: v })
                }
              />
              <RatingRow
                label="Expérience pertinente"
                value={evalForm.note_experience}
                onChange={(v) =>
                  setEvalForm({ ...evalForm, note_experience: v })
                }
              />
            </div>
            <div className="mb-6">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Commentaire privé (optionnel)
              </label>
              <textarea
                rows="2"
                placeholder="Points forts, points faibles..."
                value={evalForm.commentaire_evaluation}
                onChange={(e) =>
                  setEvalForm({
                    ...evalForm,
                    commentaire_evaluation: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setModalEval({ isOpen: false, candidature: null })
                }
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={soumettreEvaluation}
                className="flex-1 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
