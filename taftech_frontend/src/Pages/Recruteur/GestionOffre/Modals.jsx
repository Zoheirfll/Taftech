import React from "react";
import { X, Calendar } from "lucide-react";
import { tw } from "../../../theme";

const RatingRow = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
    <span className={`text-sm font-medium ${tw.textMuted700}`}>{label}</span>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${value >= num ? tw.ratingActive : tw.ratingInactive}`}
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
            <div className={`${tw.modalOverlay} p-4`}>
              <div className={`${tw.surface} rounded-2xl p-6 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]`}>
                <div className="flex justify-between items-center mb-5">
                  <h3 className={`text-base font-bold ${tw.textStrong}`}>
                    Comparaison candidats
                  </h3>
                  <button
                    onClick={() => setShowCompare(false)}
                    className={`p-1.5 ${tw.iconButtonHoverSlate} rounded-lg`}
                  >
                    <X size={18} />
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={`text-left text-xs ${tw.textMuted} font-medium pb-3 w-1/3`}>
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
                  <tbody className={`divide-y ${tw.divideBase}`}>
                    <tr>
                      <td className={`py-3 text-xs font-semibold ${tw.textMuted}`}>
                        Score global
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`text-sm font-bold ${parseFloat(c1.score_matching) >= 80 ? tw.scoreTextSuccess : parseFloat(c1.score_matching) >= 60 ? tw.scoreTextWarning : tw.scoreTextDanger}`}
                        >
                          {parseFloat(c1.score_matching || 0)}%
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`text-sm font-bold ${parseFloat(c2.score_matching) >= 80 ? tw.scoreTextSuccess : parseFloat(c2.score_matching) >= 60 ? tw.scoreTextWarning : tw.scoreTextDanger}`}
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
                          <td className={`py-3 text-xs ${tw.textMuted700}`}>
                            {label}
                          </td>
                          <td className="py-3 text-center">
                            <div>
                              <span
                                className={`text-xs font-semibold ${v1 > v2 ? tw.scoreTextSuccess : v1 < v2 ? tw.scoreTextDanger : tw.textMuted700}`}
                              >
                                {v1}/{max}
                              </span>
                              <div className={`w-full h-1 ${tw.surfaceSubtle} rounded-full overflow-hidden mt-1`}>
                                <div
                                  className={`h-full rounded-full ${v1 >= max ? tw.scoreFillSuccess : v1 >= max / 2 ? tw.scoreFillWarning : tw.scoreFillDanger}`}
                                  style={{ width: `${(v1 / max) * 100}%` }}
                                />
                              </div>
                              {c1.details_matching?.explications?.[key] && (
                                <p className={`text-[9px] ${tw.textMuted} mt-0.5 leading-tight`}>
                                  {c1.details_matching.explications[key]}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <div>
                              <span
                                className={`text-xs font-semibold ${v2 > v1 ? tw.scoreTextSuccess : v2 < v1 ? tw.scoreTextDanger : tw.textMuted700}`}
                              >
                                {v2}/{max}
                              </span>
                              <div className={`w-full h-1 ${tw.surfaceSubtle} rounded-full overflow-hidden mt-1`}>
                                <div
                                  className={`h-full rounded-full ${v2 >= max ? tw.scoreFillSuccess : v2 >= max / 2 ? tw.scoreFillWarning : tw.scoreFillDanger}`}
                                  style={{ width: `${(v2 / max) * 100}%` }}
                                />
                              </div>
                              {c2.details_matching?.explications?.[key] && (
                                <p className={`text-[9px] ${tw.textMuted} mt-0.5 leading-tight`}>
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
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { c: c1, nom: nom1 },
                    { c: c2, nom: nom2 },
                  ].map(({ c, nom }) => (
                    <div key={nom}>
                      <p className={`text-xs font-bold ${tw.textMuted700} mb-2 truncate`}>
                        {nom}
                      </p>
                      {c.details_matching?.highlights?.points_forts?.length >
                        0 && (
                        <div className={`${tw.compareFortsBox} rounded-xl p-3 mb-2`}>
                          <p className={`text-[10px] font-bold ${tw.compareFortsLabel} uppercase mb-1.5`}>
                            ✓ Points forts
                          </p>
                          {c.details_matching.highlights.points_forts.map(
                            (p, i) => (
                              <p
                                key={i}
                                className={`text-[10px] ${tw.compareFortsText} mb-1`}
                              >
                                • {p}
                              </p>
                            ),
                          )}
                        </div>
                      )}
                      {c.details_matching?.highlights?.ecarts?.length > 0 && (
                        <div className={`${tw.compareEcartsBox} rounded-xl p-3`}>
                          <p className={`text-[10px] font-bold ${tw.compareEcartsLabel} uppercase mb-1.5`}>
                            ⚠ Écarts
                          </p>
                          {c.details_matching.highlights.ecarts.map((e, i) => (
                            <p
                              key={i}
                              className={`text-[10px] ${tw.compareEcartsText} mb-1`}
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
                    className={`flex-1 py-2.5 ${tw.cancelPillGray} text-sm font-medium rounded-lg transition-colors`}
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => {
                      setShowCompare(false);
                      setCompareIds([]);
                    }}
                    className={`flex-1 py-2.5 ${tw.bgTealSolid} text-sm font-semibold rounded-lg transition-colors`}
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
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-8 max-w-md w-full shadow-2xl`}>
            <h3 className={`text-lg font-bold ${tw.textStrong} mb-1`}>
              Programmer un entretien
            </h3>
            <p className={`text-sm ${tw.textMuted700} mb-6`}>
              Un email d'invitation sera envoyé automatiquement.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`${tw.sectionLabel} mb-1.5 block`}>
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
                    className={`w-full px-4 py-2.5 rounded-lg text-sm ${tw.modalInputTeal}`}
                  />
                </div>
                <div>
                  <label className={`${tw.sectionLabel} mb-1.5 block`}>
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
                    className={`w-full px-4 py-2.5 rounded-lg text-sm ${tw.modalInputTeal}`}
                  />
                </div>
              </div>
              <div>
                <label className={`${tw.sectionLabel} mb-1.5 block`}>
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
                  className={`w-full px-4 py-2.5 rounded-lg text-sm resize-none ${tw.modalInputTeal}`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() =>
                    setModalEntretien({ isOpen: false, candId: null })
                  }
                  className={`flex-1 py-2.5 ${tw.cancelPillGray} text-sm font-medium rounded-lg transition-colors`}
                >
                  Annuler
                </button>
                <button
                  onClick={validerEntretien}
                  className={`flex-1 py-2.5 ${tw.bgTealSolid} text-sm font-semibold rounded-lg transition-colors`}
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
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-8 max-w-md w-full shadow-2xl`}>
            <h3 className={`text-lg font-bold ${tw.textStrong} mb-1`}>
              Évaluation post-entretien
            </h3>
            <p className={`text-sm ${tw.textMuted700} mb-6`}>
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
              <label className={`${tw.sectionLabel} mb-1.5 block`}>
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
                className={`w-full px-4 py-2.5 rounded-lg text-sm resize-none ${tw.modalInputTeal}`}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setModalEval({ isOpen: false, candidature: null })
                }
                className={`flex-1 py-2.5 ${tw.cancelPillGray} text-sm font-medium rounded-lg transition-colors`}
              >
                Annuler
              </button>
              <button
                onClick={soumettreEvaluation}
                className={`flex-1 py-2.5 ${tw.bgTealSolid} text-sm font-semibold rounded-lg transition-colors`}
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
