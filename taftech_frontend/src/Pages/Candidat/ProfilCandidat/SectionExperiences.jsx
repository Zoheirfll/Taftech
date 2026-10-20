// Carte "Expériences professionnelles" : frise chronologique avec ajout, modification, suppression.
import { Plus, Pencil, Trash2 } from "lucide-react";
import { tw } from "../../../theme";
import { SECTION_CLASS, SECTION_TITLE, ICON_ACTION_BTN } from "./profilUi";

const SectionExperiences = ({ profil, formatDate, setEditingExpId, setNewExp, setShowExpForm, handleEditExp, handleDeleteExp }) => (
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={SECTION_TITLE}>Expériences professionnelles</h2>
              <button
                onClick={() => {
                  setEditingExpId(null);
                  setNewExp({
                    titre_poste: "",
                    entreprise: "",
                    date_debut: "",
                    date_fin: "",
                    description: "",
                  });
                  setShowExpForm(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${tw.addButtonSoft}`}
              >
                <Plus size={13} /> Ajouter
              </button>
            </div>
            <div className="space-y-5">
              {profil.experiences_detail?.length === 0 && (
                <div className={`text-center py-6 border border-dashed ${tw.borderBase} rounded-xl`}>
                  <p className={`text-sm ${tw.textMuted700} mb-2`}>Aucune expérience renseignée.</p>
                  <button
                    onClick={() => setShowExpForm(true)}
                    className={`text-xs font-semibold hover:underline flex items-center gap-1 mx-auto ${tw.textPrimary}`}
                  >
                    <Plus size={11} /> Ajouter une expérience
                  </button>
                </div>
              )}
              {profil.experiences_detail?.map((exp) => (
                <div
                  key={exp.id}
                  className={`relative group pl-5 border-l-2 ${tw.timelineBorderPrimary}`}
                >
                  <div className={`absolute -left-2 top-1 w-3.5 h-3.5 rounded-full ${tw.timelineDotPrimary}`} />
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-base font-semibold ${tw.textStrong}`}>
                        {exp.titre_poste}
                      </h4>
                      <p className={`text-xs ${tw.textPrimary} font-medium`}>
                        {exp.entreprise}
                        {(exp.appellation_libelle || exp.metier_libelle) && (
                          <span className={`ml-2 ${tw.textMuted} font-normal`}>· {exp.appellation_libelle || exp.metier_libelle}</span>
                        )}
                      </p>
                      <p className={`text-xs ${tw.textMuted} mt-1`}>
                        {formatDate(exp.date_debut, exp.date_debut_precision)} —{" "}
                        {exp.date_fin ? formatDate(exp.date_fin, exp.date_fin_precision) : "Aujourd'hui"}
                      </p>
                    </div>
                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditExp(exp)}
                        aria-label={`Modifier l'expérience ${exp.titre_poste}`}
                        className={`${ICON_ACTION_BTN} ${tw.hoverIconActionPrimary}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteExp(exp.id)}
                        aria-label={`Supprimer l'expérience ${exp.titre_poste}`}
                        className={`${ICON_ACTION_BTN} ${tw.deleteIconButton}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {exp.description && (
                    <p className={`text-xs ${tw.textMuted} mt-2 leading-relaxed whitespace-pre-line`}>
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
);

export default SectionExperiences;
