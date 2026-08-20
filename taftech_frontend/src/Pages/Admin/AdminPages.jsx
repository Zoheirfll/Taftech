import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import RichTextEditor from "../../Components/RichTextEditor";

const FORM_VIDE = { slug: "", titre: "", contenu_html: "" };

const AdminPages = () => {
  const [vue, setVue] = useState("liste");
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchPages = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminPages();
      setPages(data);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_PAGES", err);
      toast.error("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(FORM_VIDE);
    setVue("form");
  };

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setForm({ slug: p.slug, titre: p.titre, contenu_html: p.contenu_html });
    setVue("form");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return toast.error("Le titre est obligatoire.");
    if (!form.slug.trim()) return toast.error("Le slug (URL) est obligatoire.");
    if (!form.contenu_html || form.contenu_html === "<p></p>") return toast.error("Le contenu ne peut pas être vide.");
    setSaving(true);
    try {
      if (editingId) {
        await jobsService.updatePageStatique(editingId, form);
        toast.success("Page mise à jour !");
      } else {
        await jobsService.createPageStatique(form);
        toast.success("Page créée !");
      }
      setVue("liste");
      fetchPages();
    } catch (err) {
      reportError("ECHEC_SAVE_PAGE_STATIQUE", err);
      toast.error(err.response?.data?.slug?.[0] || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer cette page ?", async () => {
      try {
        await jobsService.deletePageStatique(id);
        setPages(pages.filter((p) => p.id !== id));
        toast.success("Page supprimée.");
      } catch (err) {
        reportError("ECHEC_DELETE_PAGE_STATIQUE", err);
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  const PAGES_FIXES = ["cgu", "confidentialite", "qui-sommes-nous"];

  if (vue === "form") {
    return (
      <div className="space-y-5 max-w-3xl">
        <button onClick={() => setVue("liste")} className={`flex items-center gap-2 text-sm font-medium ${tw.textMuted} hover:${tw.textStrong}`}>
          <ArrowLeft size={15} /> Retour à la liste
        </button>
        <h1 className={tw.pageTitle}>{editingId ? "Modifier la page" : "Nouvelle page"}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Titre *</label>
            <input required className={inputClass} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </div>
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
              Slug (URL) * {!PAGES_FIXES.includes(form.slug) && form.slug && <span className="text-slate-400">— accessible sur /pages/{form.slug}</span>}
            </label>
            <input required className={inputClass} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} disabled={PAGES_FIXES.includes(form.slug) && !!editingId} />
            {PAGES_FIXES.includes(form.slug) && (
              <p className={`text-xs ${tw.textMuted} mt-1`}>Page système — le slug ne peut pas être modifié.</p>
            )}
          </div>
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Contenu *</label>
            <RichTextEditor value={form.contenu_html} onChange={(html) => setForm({ ...form, contenu_html: html })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setVue("liste")} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
            <button type="submit" disabled={saving} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60`}>
              {saving ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer la page"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>Pages du site</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>CGU, Politique de confidentialité, Qui sommes-nous, et toute page libre supplémentaire.</p>
        </div>
        <button onClick={handleOpenCreate} className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}>
          <Plus size={16} /> Nouvelle page
        </button>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Titre</th>
                <th className="px-5 py-3">URL</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <tr><td colSpan="3" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : pages.length === 0 ? (
                <tr><td colSpan="3" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucune page.</td></tr>
              ) : (
                pages.map((p) => (
                  <tr key={p.id} className={tw.rowHover}>
                    <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong}`}>{p.titre}</p></td>
                    <td className={`px-5 py-3 text-xs ${tw.textMuted}`}>
                      {PAGES_FIXES.includes(p.slug) ? `/${p.slug}` : `/pages/${p.slug}`}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(p)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={14} /></button>
                        {!PAGES_FIXES.includes(p.slug) && (
                          <button onClick={() => handleDelete(p.id)} className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPages;
