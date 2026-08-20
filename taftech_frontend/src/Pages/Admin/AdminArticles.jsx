import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, ArrowLeft, Image as ImageIcon, X } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { mediaUrl } from "../../utils/mediaUrl";
import RichTextEditor from "../../Components/RichTextEditor";

const FORM_VIDE = { titre: "", categorie: "", extrait: "", contenu_html: "", statut: "BROUILLON", image_couverture: null };

const AdminArticles = () => {
  const [vue, setVue] = useState("liste"); // "liste" | "form"
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [previewImage, setPreviewImage] = useState(null);
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");
  const [saving, setSaving] = useState(false);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchTout = async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        jobsService.getAdminArticles(),
        jobsService.getAdminArticleCategories(),
      ]);
      setArticles(a);
      setCategories(c);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_ARTICLES", err);
      toast.error("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTout();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(FORM_VIDE);
    setPreviewImage(null);
    setVue("form");
  };

  const handleOpenEdit = async (a) => {
    try {
      const detail = await jobsService.getAdminArticle(a.id);
      setEditingId(a.id);
      setForm({
        titre: detail.titre,
        categorie: detail.categorie || "",
        extrait: detail.extrait,
        contenu_html: detail.contenu_html,
        statut: detail.statut,
        image_couverture: null,
      });
      setPreviewImage(detail.image_couverture ? mediaUrl(detail.image_couverture) : null);
      setVue("form");
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_ARTICLE", err);
      toast.error("Erreur de chargement de l'article.");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm({ ...form, image_couverture: file });
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleAjouterCategorie = async () => {
    if (!nouvelleCategorie.trim()) return;
    try {
      const created = await jobsService.createArticleCategory({ label: nouvelleCategorie.trim() });
      setCategories([...categories, created]);
      setForm({ ...form, categorie: created.id });
      setNouvelleCategorie("");
      toast.success("Catégorie ajoutée !");
    } catch (err) {
      reportError("ECHEC_CREATE_ARTICLE_CATEGORY", err);
      toast.error("Erreur — cette catégorie existe peut-être déjà.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return toast.error("Le titre est obligatoire.");
    if (!form.extrait.trim()) return toast.error("L'extrait est obligatoire.");
    if (!form.contenu_html || form.contenu_html === "<p></p>") return toast.error("Le contenu ne peut pas être vide.");
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.categorie) delete payload.categorie;
      if (!payload.image_couverture) delete payload.image_couverture;
      if (editingId) {
        await jobsService.updateArticle(editingId, payload);
        toast.success("Article mis à jour !");
      } else {
        await jobsService.createArticle(payload);
        toast.success("Article créé !");
      }
      setVue("liste");
      fetchTout();
    } catch (err) {
      reportError("ECHEC_SAVE_ARTICLE", err);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer cet article ?", async () => {
      try {
        await jobsService.deleteArticle(id);
        setArticles(articles.filter((a) => a.id !== id));
        toast.success("Article supprimé.");
      } catch (err) {
        reportError("ECHEC_DELETE_ARTICLE", err);
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  if (vue === "form") {
    return (
      <div className="space-y-5 max-w-3xl">
        <button onClick={() => setVue("liste")} className={`flex items-center gap-2 text-sm font-medium ${tw.textMuted} hover:${tw.textStrong}`}>
          <ArrowLeft size={15} /> Retour à la liste
        </button>
        <h1 className={tw.pageTitle}>{editingId ? "Modifier l'article" : "Nouvel article"}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Titre *</label>
            <input required className={inputClass} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Catégorie</label>
            <div className="flex gap-2">
              <select className={inputClass} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                <option value="">— Aucune —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input
                placeholder="Nouvelle catégorie..."
                className={inputClass + " max-w-[200px]"}
                value={nouvelleCategorie}
                onChange={(e) => setNouvelleCategorie(e.target.value)}
              />
              <button type="button" onClick={handleAjouterCategorie} className={`px-4 py-2.5 text-sm font-semibold rounded-lg ${tw.bgPrimarySolidHover} text-white shrink-0`}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Extrait / résumé *</label>
            <textarea required rows={2} maxLength={300} className={inputClass} value={form.extrait} onChange={(e) => setForm({ ...form, extrait: e.target.value })} placeholder="Affiché dans la liste du blog et comme description SEO." />
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Image de couverture</label>
            {previewImage && (
              <img src={previewImage} alt="Aperçu" className="w-full max-h-56 object-cover rounded-lg mb-2" />
            )}
            <label className={`flex items-center gap-2 px-4 py-2.5 border ${tw.borderBase} rounded-lg text-sm cursor-pointer w-fit ${tw.hoverSurfaceSubtle}`}>
              <ImageIcon size={15} /> Choisir une image
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
            </label>
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Contenu *</label>
            <RichTextEditor value={form.contenu_html} onChange={(html) => setForm({ ...form, contenu_html: html })} />
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Statut</label>
            <select className={inputClass} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
              <option value="BROUILLON">Brouillon (non visible)</option>
              <option value="PUBLIE">Publié</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setVue("liste")} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
            <button type="submit" disabled={saving} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60`}>
              {saving ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer l'article"}
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
          <h1 className={tw.pageTitle}>Blog / Articles</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>Articles publiés sur /blog — visibles publiquement une fois le statut passé à "Publié".</p>
        </div>
        <button onClick={handleOpenCreate} className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}>
          <Plus size={16} /> Nouvel article
        </button>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Titre</th>
                <th className="px-5 py-3">Catégorie</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : articles.length === 0 ? (
                <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun article pour l'instant.</td></tr>
              ) : (
                articles.map((a) => (
                  <tr key={a.id} className={tw.rowHover}>
                    <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong}`}>{a.titre}</p></td>
                    <td className="px-5 py-3">
                      {a.categorie_label && (
                        <span className={`px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-medium rounded-full`}>{a.categorie_label}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${a.statut === "PUBLIE" ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : "bg-amber-50 text-amber-700"}`}>
                        {a.statut === "PUBLIE" ? "Publié" : "Brouillon"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(a)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(a.id)} className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={14} /></button>
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

export default AdminArticles;
