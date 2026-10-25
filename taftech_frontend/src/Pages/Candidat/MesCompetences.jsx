import React, { useState, useEffect } from "react";
import { notifier } from "../../utils/notifier";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { Star, Trash2, Pencil, Plus, X } from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import FieldError from "../../Components/FieldError";
import { useErreursChamps } from "../../utils/useErreursChamps";
import CompetencesSuggerees from "../../Components/CompetencesSuggerees";
import BadgeCompetenceSuggeree from "../../Components/BadgeCompetenceSuggeree";
import { idsMetiers } from "../../utils/competencesSuggerees";
import { useCompetencesSuggerees } from "../../utils/useCompetencesSuggerees";

const INPUT_CLASS = `w-full px-4 py-3 rounded-xl text-base ${tw.inputColorsMuted}`;

const NIVEAUX = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
  { value: "CONFIRME", label: "Confirmé" },
];

const NIVEAU_STYLE = {
  DEBUTANT: tw.statusNeutralSoft,
  INTERMEDIAIRE: tw.statusBlueSoft,
  AVANCE: tw.statusOrangeSoft,
  CONFIRME: tw.scoreHigh,
};

const MesCompetences = () => {
  const [competences, setCompetences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [nouvelle, setNouvelle] = useState({ label: "", niveau: "INTERMEDIAIRE" });
  const [editingId, setEditingId] = useState(null);
  const [metierIds, setMetierIds] = useState([]);
  const { erreurs, exiger, depuisReponse, definir, effacer, attributs } = useErreursChamps();
  const suggestionsMetier = useCompetencesSuggerees(metierIds, competences);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await jobsService.getMesCompetencesDetail();
        setCompetences(data);
      } catch (error) {
        notifier.echec("Chargement impossible", error);
        reportError("ECHEC_CHARGEMENT_MES_COMPETENCES", error);
      } finally {
        setIsLoading(false);
      }
      // Suggestions facultatives : leur échec ne doit jamais empêcher d'utiliser la page.
      try {
        const profil = await jobsService.getProfilCandidat();
        setMetierIds(
          idsMetiers(profil?.metier_souhaite, profil?.metier, (profil?.experiences_detail || []).map((e) => e.metier)),
        );
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_METIERS_SUGGESTIONS_COMPETENCES", error);
      }
    };
    fetchData();
  }, []);

  // Ajout d'une compétence proposée pour le métier : niveau Débutant, que le candidat peut ensuite corriger.
  const ajouterSuggestion = async (label) => {
    try {
      const saved = await jobsService.ajouterCompetence(label, "DEBUTANT", "SUGGESTION");
      setCompetences((prev) => (prev.some((c) => c.id === saved.id) ? prev : [saved, ...prev]));
      notifier.succes("Compétence ajoutée", "Niveau Débutant : vous pouvez le modifier.");
    } catch (error) {
      reportError("ECHEC_AJOUT_COMPETENCE_SUGGEREE_UI", error);
      notifier.echec("Ajout impossible", error);
    }
  };

  const handleSearchChange = async (value) => {
    setNouvelle((prev) => ({ ...prev, label: value }));
    effacer("label");
    if (value.trim().length < 2) return setSuggestions([]);
    try {
      const results = await jobsService.searchCompetences(value);
      setSuggestions(results.slice(0, 6));
    } catch (error) {
      reportError("ECHEC_SEARCH_COMPETENCES_MODAL", error);
    }
  };

  const handleAjouter = async (e) => {
    e.preventDefault();
    if (exiger(nouvelle, { label: "Le nom de la compétence est obligatoire." })) return;
    try {
      // Le backend fait un update_or_create sur (profil, label) — soumettre le même
      // libellé qu'une compétence existante met à jour son niveau en place au lieu d'en
      // créer une seconde, ce qui permet de réutiliser ce même flux pour "Modifier".
      const saved = await jobsService.ajouterCompetence(nouvelle.label.trim(), nouvelle.niveau);
      setCompetences((prev) => {
        const existe = prev.some((c) => c.id === saved.id);
        return existe ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
      });
      notifier.succes(editingId ? "Compétence mise à jour" : "Compétence ajoutée");
      closeModal();
    } catch (error) {
      reportError("ECHEC_AJOUT_COMPETENCE_UI", error);
      depuisReponse(error);
      notifier.echec("Enregistrement impossible", error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNouvelle({ label: "", niveau: "INTERMEDIAIRE" });
    setSuggestions([]);
    definir({});
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setNouvelle({ label: c.label, niveau: c.niveau });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer cette compétence ?", async () => {
      try {
        await jobsService.supprimerCompetence(id);
        setCompetences((prev) => prev.filter((c) => c.id !== id));
        notifier.succes("Compétence supprimée");
      } catch (error) {
        notifier.echec("Suppression impossible", error);
        reportError("ECHEC_SUPPRESSION_COMPETENCE_UI", error);
      }
    });
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.borderPrimary}`}></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={tw.pageTitleGrand}>Mes compétences</h1>
          <p className={`${tw.bodyTextGrand} mt-0.5`}>
            Déclarez votre niveau pour chaque compétence.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-sm font-bold rounded-xl transition-colors shadow-sm`}
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <InfoBanner storageKey="mes_competences" title="Pourquoi déclarer un niveau ?">
        Un niveau précis par compétence améliore vos recommandations et aide les recruteurs à mieux
        évaluer votre profil. Ces compétences alimentent automatiquement votre profil candidat.
      </InfoBanner>

      <CompetencesSuggerees suggestions={suggestionsMetier} onAjouter={ajouterSuggestion} />

      <div className={`${tw.card} rounded-2xl overflow-hidden`}>
        {competences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${tw.emptyStateIconCircle}`}>
              <Star size={24} />
            </div>
            <h3 className={`text-sm font-semibold ${tw.textStrong} mb-1`}>Aucune compétence</h3>
            <p className={`text-xs ${tw.textMuted700} max-w-xs`}>
              Ajoutez vos compétences pour compléter votre profil.
            </p>
          </div>
        ) : (
          <div className={`divide-y ${tw.divideBase}`}>
            {competences.map((c) => (
              <div key={c.id} className="flex justify-between items-center px-5 py-4">
                <div>
                  <p className={`text-sm font-semibold ${tw.textStrong}`}>{c.label}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${NIVEAU_STYLE[c.niveau] || tw.statusNeutralSoft}`}>
                    {NIVEAUX.find((n) => n.value === c.niveau)?.label || c.niveau}
                  </span>
                  {c.origine === "SUGGESTION" && (
                    <span className={`ml-1.5 text-[10px] ${tw.textMuted}`}><BadgeCompetenceSuggeree /></span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className={`p-1.5 rounded-lg transition-colors ${tw.editIconButton || "text-slate-500 hover:bg-slate-100"}`}
                    title="Modifier le niveau"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className={`p-1.5 rounded-lg transition-colors ${tw.deleteIconButton}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${tw.modalOverlayLight}`}>
          <div className={`${tw.surface} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden`}>
            <div className={`flex justify-between items-center px-6 py-4 border-b ${tw.borderSubtle}`}>
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier le niveau" : "Ajouter une compétence"}</h3>
              <button
                onClick={closeModal}
                className={`p-1.5 rounded-lg transition-colors ${tw.modalCloseButton}`}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAjouter} noValidate className="p-6 space-y-4">
              <div className="relative">
                <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Compétence *</label>
                <input
                  type="text"
                  className={`${INPUT_CLASS} ${editingId ? "opacity-60 cursor-not-allowed" : ""}`}
                  value={nouvelle.label}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  autoComplete="off"
                  disabled={!!editingId}
                  required
                  {...attributs("label")}
                />
                <FieldError id="err-label" message={erreurs.label} />
                {suggestions.length > 0 && (
                  <div className={`absolute z-10 mt-1 w-full rounded-xl ${tw.surface} border ${tw.borderBase} shadow-lg overflow-hidden`}>
                    {suggestions.map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => {
                          setNouvelle((prev) => ({ ...prev, label: s }));
                          setSuggestions([]);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${tw.textStrong} hover:bg-slate-50`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Niveau</label>
                <select
                  className={INPUT_CLASS}
                  value={nouvelle.niveau}
                  onChange={(e) => setNouvelle({ ...nouvelle, niveau: e.target.value })}
                >
                  {NIVEAUX.map((n) => (
                    <option key={n.value} value={n.value}>{n.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 py-3 text-base font-semibold rounded-xl transition-colors ${tw.buttonCancelSoft}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-base font-bold rounded-xl transition-colors`}
                >
                  {editingId ? "Mettre à jour" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesCompetences;
