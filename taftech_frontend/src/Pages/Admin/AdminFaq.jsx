import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";

const CATEGORIES = [
  { value: "GENERAL", label: "Général (page Contact)" },
  { value: "RECRUTEUR", label: "Recruteur (landing)" },
  { value: "PREMIUM", label: "Premium" },
];

const ITEM_VIDE = { categorie: "GENERAL", question: "", reponse: "", ordre: 0, actif: true };

const AdminFaq = () => {
  const [items, setItems] = useState([]);
  const [filtreCategorie, setFiltreCategorie] = useState("TOUTES");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(ITEM_VIDE);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminFaq();
      setItems(data);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_FAQ", err);
      toast.error("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const itemsAffiches = filtreCategorie === "TOUTES" ? items : items.filter((i) => i.categorie === filtreCategorie);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ ...ITEM_VIDE, categorie: filtreCategorie === "TOUTES" ? "GENERAL" : filtreCategorie });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setForm({ categorie: item.categorie, question: item.question, reponse: item.reponse, ordre: item.ordre, actif: item.actif });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question.trim()) return toast.error("La question est obligatoire.");
    if (!form.reponse.trim()) return toast.error("La réponse est obligatoire.");
    const payload = { ...form, ordre: Number(form.ordre) || 0 };
    try {
      if (editingId) {
        await jobsService.updateFaqItem(editingId, payload);
        toast.success("Question mise à jour !");
      } else {
        await jobsService.createFaqItem(payload);
        toast.success("Question ajoutée !");
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      reportError("ECHEC_SAVE_FAQ_ITEM", err);
      toast.error("Erreur lors de la sauvegarde.");
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer cette question ?", async () => {
      try {
        await jobsService.deleteFaqItem(id);
        setItems(items.filter((i) => i.id !== id));
        toast.success("Question supprimée.");
      } catch (err) {
        reportError("ECHEC_DELETE_FAQ_ITEM", err);
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  const labelCategorie = (v) => CATEGORIES.find((c) => c.value === v)?.label || v;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>FAQ</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Questions/réponses affichées sur les pages Contact, Espace recruteur et Premium.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}
        >
          <Plus size={16} /> Ajouter une question
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["TOUTES", ...CATEGORIES.map((c) => c.value)].map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltreCategorie(cat)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${filtreCategorie === cat ? "bg-teal-600 border-teal-600 text-white" : `${tw.surface} ${tw.borderBase} ${tw.textMuted} ${tw.hoverSurfaceSubtle}`}`}
          >
            {cat === "TOUTES" ? "Toutes" : labelCategorie(cat)}
          </button>
        ))}
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Catégorie</th>
                <th className="px-5 py-3">Question</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : itemsAffiches.length === 0 ? (
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucune question configurée.</td></tr>
              ) : (
                itemsAffiches.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-medium rounded-full`}>
                        {labelCategorie(item.categorie)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className={`text-sm font-medium ${tw.textStrong} max-w-md`}>{item.question}</p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${item.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {item.actif ? "Actif" : "Inactif"}
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
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier la question" : "Ajouter une question"}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Catégorie *</label>
                <select required className={inputClass} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Question *</label>
                <input required className={inputClass} placeholder="Ex: L'inscription est-elle gratuite ?" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Réponse *</label>
                <textarea required rows={4} className={inputClass} value={form.reponse} onChange={(e) => setForm({ ...form, reponse: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Ordre d'affichage</label>
                <input type="number" min="0" className={inputClass} value={form.ordre} onChange={(e) => setForm({ ...form, ordre: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="faq_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                <label htmlFor="faq_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Question visible</label>
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

export default AdminFaq;
