import { useSubmitLock } from "../../utils/useSubmitLock";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Search, Tags } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import AdminPagination from "../../Components/AdminPagination";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const ITEM_VIDE = { label: "", synonymes: "", actif: true };

const AdminCompetences = () => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(ITEM_VIDE);
  // Minuteur de recherche local au composant (avant : variable globale window._competenceSearchTimer).
  const searchTimer = useRef(null);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchItems = async (s = "", p = 1) => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminCompetences(s, p);
      setItems(data.results || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_COMPETENCES", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    return () => clearTimeout(searchTimer.current);
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchItems(val, 1), 400);
  };

  const handlePage = (p) => {
    setPage(p);
    fetchItems(search, p);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(ITEM_VIDE);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setForm({ label: item.label, synonymes: item.synonymes || "", actif: item.actif });
    setShowModal(true);
  };

  const fermerModal = useCallback(() => setShowModal(false), []);
  useEchapPourFermer(showModal, fermerModal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) return toast.error("Le libellé est obligatoire.");
    try {
      if (editingId) {
        await jobsService.updateCompetence(editingId, form);
        toast.success("Compétence mise à jour !");
      } else {
        await jobsService.createCompetence(form);
        toast.success("Compétence ajoutée !");
      }
      setShowModal(false);
      fetchItems(search, page);
    } catch (err) {
      reportError("ECHEC_SAVE_COMPETENCE", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    }
  };

  const handleDelete = (id) => {
    // CASCADE côté modèle : supprimer une compétence retire aussi ses liens avec les métiers du
    // référentiel (suggestions "compétences pour ce métier" des recruteurs).
    confirmToast(
      "Supprimer cette compétence ? Ses liens avec les métiers du référentiel seront aussi supprimés. Pour seulement la retirer des suggestions, décochez plutôt « Suggérée ».",
      async () => {
        try {
          await jobsService.deleteCompetence(id);
          setItems((prev) => prev.filter((i) => i.id !== id));
          setTotalCount((c) => Math.max(0, c - 1));
          toast.success("Compétence supprimée.");
        } catch (err) {
          reportError("ECHEC_DELETE_COMPETENCE", err);
          toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
        }
      },
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Tags}
        color="violet"
        title="Référentiel compétences"
        subtitle="Suggestions proposées aux candidats et recruteurs quand ils saisissent une compétence."
        aideKey="competences"
        aide={[
          "Le champ « Compétences » reste libre pour les utilisateurs : ce référentiel sert à proposer des suggestions et à normaliser les saisies.",
          "Synonymes : une compétence extraite d'un CV sous l'un de ces intitulés (ex. « Project Management ») est automatiquement ramenée au libellé principal.",
          "« Masquée » retire la compétence des suggestions sans rien supprimer. C'est l'option à privilégier.",
          "La génération d'offre par IA ne choisit ses compétences que dans ce référentiel (compétences suggérées uniquement).",
        ]}
        actions={
          <button
            onClick={handleOpenCreate}
            className={`flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}
          >
            <Plus size={16} /> Ajouter une compétence
          </button>
        }
      />

      <div className="relative">
        <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
        <input
          type="text"
          placeholder="Rechercher une compétence..."
          value={search}
          onChange={handleSearch}
          aria-label="Rechercher une compétence"
          className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsWhite} rounded-xl text-sm`}
        />
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Compétence</th>
                <th className="px-5 py-3">Synonymes</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={4} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <AdminVide icon={Tags} titre="Aucune compétence trouvée." texte={search ? "Essayez un autre mot-clé." : undefined} />
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong}`}>{item.label}</p></td>
                    <td className="px-5 py-3">
                      <p className={`text-xs ${tw.textMuted} max-w-xs truncate`} title={item.synonymes || ""}>
                        {item.synonymes || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${item.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {item.actif ? "Suggérée" : "Masquée"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(item)} aria-label={`Modifier ${item.label}`} title="Modifier" className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} aria-label={`Supprimer ${item.label}`} title="Supprimer" className={`p-2 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} totalCount={totalCount} onChange={handlePage} disabled={loading} />
      </div>

      {showModal && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerModal()}>
          <div role="dialog" aria-modal="true" aria-label={editingId ? "Modifier la compétence" : "Ajouter une compétence"} className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier la compétence" : "Ajouter une compétence"}</h3>
              <button onClick={fermerModal} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Libellé *</label>
                <input required className={inputClass} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Synonymes / traductions</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={form.synonymes}
                  onChange={(e) => setForm({ ...form, synonymes: e.target.value })}
                />
                <p className={`text-[11px] ${tw.textMuted} mt-1`}>
                  Séparés par des virgules. Une compétence extraite d'un CV portant l'un de ces intitulés (ou très proche) sera automatiquement remplacée par "{form.label || "ce libellé"}".
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="competence_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                <label htmlFor="competence_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Suggérée (visible dans l'autocomplete)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fermerModal} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" disabled={submitBusy} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>{editingId ? "Mettre à jour" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCompetences;
