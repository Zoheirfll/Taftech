import { useSubmitLock } from "../../utils/useSubmitLock";
import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, FolderLock } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminVide } from "../../Components/AdminEtat";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const ITEM_VIDE = { label: "", ordre: 0, actif: true };

const AdminTypesDocuments = () => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(ITEM_VIDE);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminTypesDocuments();
      setItems(data);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_TYPES_DOCUMENTS_UI", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fermerModal = React.useCallback(() => setShowModal(false), []);
  useEchapPourFermer(showModal, fermerModal);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(ITEM_VIDE);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setForm({ label: item.label, ordre: item.ordre, actif: item.actif });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) return toast.error("Le libellé est obligatoire.");
    const payload = { ...form, ordre: Number(form.ordre) || 0 };
    try {
      if (editingId) {
        await jobsService.modifierAdminTypeDocument(editingId, payload);
        toast.success("Type mis à jour !");
      } else {
        await jobsService.creerAdminTypeDocument(payload);
        toast.success("Type ajouté !");
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      reportError("ECHEC_SAVE_ADMIN_TYPE_DOCUMENT", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    }
  };

  const handleDelete = (id) => {
    // SET_NULL côté modèle : les documents déjà classés dans ce type perdent leur catégorie.
    confirmToast("Supprimer ce type de document ? Les documents des candidats déjà classés dans ce type deviendront « sans catégorie ». Pour simplement le masquer, décochez plutôt « Type visible ».", async () => {
      try {
        await jobsService.supprimerAdminTypeDocument(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        toast.success("Type supprimé.");
      } catch (err) {
        reportError("ECHEC_DELETE_ADMIN_TYPE_DOCUMENT", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={FolderLock}
        color="rose"
        title="Types de documents"
        subtitle="Catégories proposées aux candidats dans « Mes documents » (documents privés)."
        aideKey="types-documents"
        aide={[
          "Le candidat choisit l'un de ces types quand il ajoute un document privé (diplôme, attestation…). Il ne peut déposer qu'un document par type.",
          "« Ordre d'affichage » : plus le nombre est petit, plus le type apparaît haut dans la liste du candidat.",
          "Pour retirer un type, décochez « Type visible » plutôt que de le supprimer : la suppression retire la catégorie des documents déjà déposés.",
          "Ces documents sont privés : un recruteur ne les voit que si le candidat les partage explicitement avec son entreprise.",
        ]}
        actions={
          <button
            onClick={handleOpenCreate}
            className={`flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}
          >
            <Plus size={16} /> Ajouter un type
          </button>
        }
      />

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Libellé</th>
                <th className="px-5 py-3">Ordre</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={4} />
              ) : items.length === 0 ? (
                <tr><td colSpan="4"><AdminVide icon={FolderLock} titre="Aucun type configuré." texte="Ajoutez au moins un type pour que les candidats puissent classer leurs documents." /></td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3 text-sm font-medium">{item.label}</td>
                    <td className="px-5 py-3 text-sm">{item.ordre}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${item.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {item.actif ? "Actif" : "Inactif"}
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
      </div>

      {showModal && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerModal()}>
          <div role="dialog" aria-modal="true" aria-label={editingId ? "Modifier le type" : "Ajouter un type"} className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier le type" : "Ajouter un type"}</h3>
              <button onClick={fermerModal} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Libellé *</label>
                <input required className={inputClass} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Ordre d'affichage</label>
                <input type="number" min="0" className={inputClass} value={form.ordre} onChange={(e) => setForm({ ...form, ordre: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="type_doc_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                <label htmlFor="type_doc_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Type visible</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" disabled={submitBusy} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>{editingId ? "Mettre à jour" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTypesDocuments;
