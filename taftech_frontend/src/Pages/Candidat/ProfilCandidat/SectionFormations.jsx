// Carte "Formations et diplômes" : frise chronologique avec ajout, modification, suppression.
import { Plus, Pencil, Trash2 } from "lucide-react";
import { tw } from "../../../theme";
import { SECTION_CLASS, SECTION_TITLE, ICON_ACTION_BTN } from "./profilUi";

const SectionFormations = ({ profil, formatText, formatDate, setEditingFormId, setNewForm, setShowFormForm, handleEditFormation, handleDeleteForm }) => (
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={SECTION_TITLE}>Formations et diplômes</h2>
              <button
                onClick={() => {
                  setEditingFormId(null);
                  setNewForm({
                    diplome: "",
                    etablissement: "",
                    date_debut: "",
                    date_fin: "",
                    description: "",
                  });
                  setShowFormForm(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${tw.addButtonSoft}`}
              >
                <Plus size={13} /> Ajouter
              </button>
            </div>
            <div className="space-y-5">
              {profil.formations_detail?.length === 0 && (
                <div className={`text-center py-6 border border-dashed ${tw.borderBase} rounded-xl`}>
                  <p className={`text-sm ${tw.textMuted700} mb-2`}>Aucune formation renseignée.</p>
                  <button
                    onClick={() => setShowFormForm(true)}
                    className={`text-xs font-semibold hover:underline flex items-center gap-1 mx-auto ${tw.textPrimary}`}
                  >
                    <Plus size={11} /> Ajouter une formation
                  </button>
                </div>
              )}
              {profil.formations_detail?.map((f) => (
                <div
                  key={f.id}
                  className={`relative group pl-5 border-l-2 ${tw.timelineBorderNeutral}`}
                >
                  <div className={`absolute -left-2 top-1 w-3.5 h-3.5 rounded-full ${tw.timelineDotNeutral}`} />
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-base font-semibold ${tw.textStrong}`}>
                        {f.diplome || "Diplôme non précisé"}
                      </h4>
                      {(f.diplome_ref_libelle || f.specialite_ref_libelle) && (
                        <p className={`text-xs ${tw.textMuted} mt-1 flex flex-wrap items-center gap-1`}>
                          {f.diplome_ref_libelle && (
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${tw.bgPrimarySoft} ${tw.textPrimaryStrong}`}>
                              {f.diplome_ref_libelle}
                            </span>
                          )}
                          {f.specialite_ref_libelle && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-teal-50 text-teal-700">
                              {f.specialite_ref_libelle}
                            </span>
                          )}
                          {f.statut && f.statut !== "OBTENU" && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700">
                              {formatText(f.statut)}
                            </span>
                          )}
                        </p>
                      )}
                      {f.description && (
                        <p className={`text-xs ${tw.textPrimary} font-medium mt-1`}>
                          {f.description}
                        </p>
                      )}
                      <p className={`text-xs ${tw.textMuted} font-medium`}>
                        {f.etablissement}
                      </p>
                      <p className={`text-xs ${tw.textMuted} mt-1`}>
                        {f.date_debut ? `${formatDate(f.date_debut, f.date_debut_precision)} — ` : ""}
                        {f.statut === "EN_COURS" && !f.date_fin
                          ? "En cours"
                          : f.date_fin_prevue && !f.date_fin
                          ? `Fin prévue ${formatDate(f.date_fin_prevue)}`
                          : f.date_fin
                          ? formatDate(f.date_fin, f.date_fin_precision)
                          : "En cours"}
                      </p>
                    </div>
                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditFormation(f)}
                        aria-label={`Modifier la formation ${f.diplome || ""}`}
                        className={`${ICON_ACTION_BTN} ${tw.hoverIconActionPrimary}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteForm(f.id)}
                        aria-label={`Supprimer la formation ${f.diplome || ""}`}
                        className={`${ICON_ACTION_BTN} ${tw.deleteIconButton}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
);

export default SectionFormations;
