import { useSubmitLock } from "../../utils/useSubmitLock";
import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, HelpCircle } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

// Catégories réellement affichées sur le site (FaqItem.CATEGORIE_CHOICES). "PALIERS" est lue
// par la page Abonnements recruteur ; elle manquait ici (seule "PREMIUM", page supprimée le
// 27/08/2026, était proposée) — les questions de la page Abonnements étaient ingérables.
const CATEGORIES = [
  { value: "GENERAL", label: "Général (page Contact)", couleur: "bg-indigo-50 text-indigo-700" },
  { value: "RECRUTEUR", label: "Recruteur (landing)", couleur: "bg-teal-50 text-teal-700" },
  { value: "PALIERS", label: "Abonnements (tarifs recruteur)", couleur: "bg-amber-50 text-amber-800" },
];

const ITEM_VIDE = { categorie: "GENERAL", question: "", reponse: "", ordre: 0, actif: true };

const AdminFaq = () => {
  const [submitBusy, lockSubmit] = useSubmitLock();
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
      setItems(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_FAQ", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const categoriesFiltre = CATEGORIES;

  const itemsAffiches = (filtreCategorie === "TOUTES" ? items : items.filter((i) => i.categorie === filtreCategorie))
    .slice()
    .sort((a, b) => (a.categorie === b.categorie ? (a.ordre || 0) - (b.ordre || 0) : a.categorie.localeCompare(b.categorie)));

  const handleOpenCreate = () => {
    setEditingId(null);
    const categorieParDefaut = CATEGORIES.some((c) => c.value === filtreCategorie) ? filtreCategorie : "GENERAL";
    setForm({ ...ITEM_VIDE, categorie: categorieParDefaut });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setForm({ categorie: item.categorie, question: item.question, reponse: item.reponse, ordre: item.ordre, actif: item.actif });
    setShowModal(true);
  };

  const fermerModal = useCallback(() => setShowModal(false), []);
  useEchapPourFermer(showModal, fermerModal);

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
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer cette question ?", async () => {
      try {
        await jobsService.deleteFaqItem(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        toast.success("Question supprimée.");
      } catch (err) {
        reportError("ECHEC_DELETE_FAQ_ITEM", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  const infoCategorie = (v) => CATEGORIES.find((c) => c.value === v) || { label: v, couleur: tw.badgeNeutral };
  const nbParCategorie = (v) => items.filter((i) => i.categorie === v).length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={HelpCircle}
        color="teal"
        title="FAQ"
        subtitle="Questions/réponses affichées sur les pages Contact, Espace recruteur et Abonnements."
        aideKey="faq"
        aide={[
          "Chaque catégorie correspond à une page du site : Général → page Contact, Recruteur → page d'accueil recruteur, Abonnements → page des tarifs recruteur.",
          "« Ordre d'affichage » : les questions s'affichent de la plus petite valeur à la plus grande dans leur catégorie.",
          "Décochez « Question visible » pour retirer temporairement une question sans la supprimer.",
          "Les modifications sont visibles sur le site en moins d'une heure (cache).",
        ]}
        actions={
          <button
            onClick={handleOpenCreate}
            className={`flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}
          >
            <Plus size={16} /> Ajouter une question
          </button>
        }
      />

      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrer par catégorie">
        {["TOUTES", ...categoriesFiltre.map((c) => c.value)].map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltreCategorie(cat)}
            aria-pressed={filtreCategorie === cat}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${tw.focusRing} ${filtreCategorie === cat ? "bg-teal-600 border-teal-600 text-white" : `${tw.surface} ${tw.borderBase} ${tw.textMuted} ${tw.hoverSurfaceSubtle}`}`}
          >
            {cat === "TOUTES" ? `Toutes (${items.length})` : `${infoCategorie(cat).label} (${nbParCategorie(cat)})`}
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
                <th className="px-5 py-3 text-center">Ordre</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={5} />
              ) : itemsAffiches.length === 0 ? (
                <tr><td colSpan="5"><AdminVide icon={HelpCircle} titre="Aucune question configurée." /></td></tr>
              ) : (
                itemsAffiches.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 ${infoCategorie(item.categorie).couleur} text-xs font-medium rounded-full whitespace-nowrap`}>
                        {infoCategorie(item.categorie).label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className={`text-sm font-medium ${tw.textStrong} max-w-md`}>{item.question}</p>
                      <p className={`text-xs ${tw.textMuted} max-w-md truncate mt-0.5`} title={item.reponse}>{item.reponse}</p>
                    </td>
                    <td className={`px-5 py-3 text-center text-sm ${tw.textMuted700} tabular-nums`}>{item.ordre}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${item.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {item.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(item)} aria-label={`Modifier la question ${item.question}`} title="Modifier" className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} aria-label={`Supprimer la question ${item.question}`} title="Supprimer" className={`p-2 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={14} /></button>
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
          <div role="dialog" aria-modal="true" aria-label={editingId ? "Modifier la question" : "Ajouter une question"} className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier la question" : "Ajouter une question"}</h3>
              <button onClick={fermerModal} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Catégorie *</label>
                <select required className={inputClass} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Question *</label>
                <input required maxLength={300} className={inputClass} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Réponse *</label>
                <textarea required rows={5} className={inputClass} value={form.reponse} onChange={(e) => setForm({ ...form, reponse: e.target.value })} />
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

export default AdminFaq;
