import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";

const ITEM_VIDE = { label: "", actif: true };

const AdminCompetences = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(ITEM_VIDE);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchItems = async (s = "") => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminCompetences(s);
      setItems(data);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_COMPETENCES", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(window._competenceSearchTimer);
    window._competenceSearchTimer = setTimeout(() => fetchItems(val), 400);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(ITEM_VIDE);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setForm({ label: item.label, actif: item.actif });
    setShowModal(true);
  };

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
      fetchItems(search);
    } catch (err) {
      reportError("ECHEC_SAVE_COMPETENCE", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer cette compétence ?", async () => {
      try {
        await jobsService.deleteCompetence(id);
        setItems(items.filter((i) => i.id !== id));
        toast.success("Compétence supprimée.");
      } catch (err) {
        reportError("ECHEC_DELETE_COMPETENCE", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>Référentiel compétences</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Suggestions affichées quand un candidat tape dans le champ "Compétences" — le champ reste libre, ceci ne fait qu'aider la saisie.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}
        >
          <Plus size={16} /> Ajouter une compétence
        </button>
      </div>

      <div className="relative">
        <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
        <input
          type="text"
          placeholder="Rechercher une compétence..."
          value={search}
          onChange={handleSearch}
          className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsWhite} rounded-xl text-sm`}
        />
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Compétence</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <tr><td colSpan="3" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="3" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucune compétence trouvée.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong}`}>{item.label}</p></td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${item.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {item.actif ? "Suggérée" : "Masquée"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(item)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier la compétence" : "Ajouter une compétence"}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Libellé *</label>
                <input required className={inputClass} placeholder="Ex: Gestion de projet" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="competence_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                <label htmlFor="competence_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Suggérée (visible dans l'autocomplete)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>{editingId ? "Mettre à jour" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCompetences;
