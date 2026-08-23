import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { Star, Trash2, Plus, X } from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await jobsService.getMesCompetencesDetail();
        setCompetences(data);
      } catch (error) {
        toast.error("Erreur lors du chargement.");
        reportError("ECHEC_CHARGEMENT_MES_COMPETENCES", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearchChange = async (value) => {
    setNouvelle((prev) => ({ ...prev, label: value }));
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
    if (!nouvelle.label.trim()) return toast.error("Le nom de la compétence est obligatoire.");
    try {
      const created = await jobsService.ajouterCompetence(nouvelle.label.trim(), nouvelle.niveau);
      setCompetences((prev) => [created, ...prev]);
      toast.success("Compétence ajoutée !");
      setIsModalOpen(false);
      setNouvelle({ label: "", niveau: "INTERMEDIAIRE" });
      setSuggestions([]);
    } catch (error) {
      reportError("ECHEC_AJOUT_COMPETENCE_UI", error);
      toast.error("Impossible d'ajouter cette compétence.");
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer cette compétence ?", async () => {
      try {
        await jobsService.supprimerCompetence(id);
        setCompetences((prev) => prev.filter((c) => c.id !== id));
        toast.success("Compétence supprimée.");
      } catch (error) {
        toast.error("Erreur lors de la suppression.");
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
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className={`p-1.5 rounded-lg transition-colors ${tw.deleteIconButton}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${tw.modalOverlayLight}`}>
          <div className={`${tw.surface} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden`}>
            <div className={`flex justify-between items-center px-6 py-4 border-b ${tw.borderSubtle}`}>
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Ajouter une compétence</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${tw.modalCloseButton}`}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAjouter} className="p-6 space-y-4">
              <div className="relative">
                <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Compétence *</label>
                <input
                  type="text"
                  placeholder="Ex: React, Gestion de projet..."
                  className={INPUT_CLASS}
                  value={nouvelle.label}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  autoComplete="off"
                  required
                />
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
                  onClick={() => setIsModalOpen(false)}
                  className={`flex-1 py-3 text-base font-semibold rounded-xl transition-colors ${tw.buttonCancelSoft}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-base font-bold rounded-xl transition-colors`}
                >
                  Enregistrer
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
