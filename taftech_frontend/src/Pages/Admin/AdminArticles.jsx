import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, ArrowLeft, Image as ImageIcon, Newspaper, ExternalLink } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { mediaUrl } from "../../utils/mediaUrl";
import RichTextEditor from "../../Components/RichTextEditor";
import ImageCropperModal from "../../Components/ImageCropperModal";
import AdminPageHeader from "../../Components/AdminPageHeader";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";

const FORM_VIDE = { titre: "", categorie: "", extrait: "", contenu_html: "", statut: "BROUILLON", image_couverture: null };
const EXTRAIT_MAX = 300;

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

const AdminArticles = () => {
  const [vue, setVue] = useState("liste"); // "liste" | "form"
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  // Formulaire tel qu'ouvert — détecte les modifications non enregistrées avant de quitter.
  const [formInitial, setFormInitial] = useState(FORM_VIDE);
  const [previewImage, setPreviewImage] = useState(null);
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");
  const [saving, setSaving] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState("TOUS");
  const [cropperFile, setCropperFile] = useState(null);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchTout = async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        jobsService.getAdminArticles(),
        jobsService.getAdminArticleCategories(),
      ]);
      setArticles(Array.isArray(a) ? a : a?.results || []);
      setCategories(Array.isArray(c) ? c : c?.results || []);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_ARTICLES", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTout();
  }, []);

  const ouvrirFormulaire = (id, valeurs, apercu) => {
    setEditingId(id);
    setForm(valeurs);
    setFormInitial(valeurs);
    setPreviewImage(apercu);
    setVue("form");
  };

  const handleOpenCreate = () => ouvrirFormulaire(null, FORM_VIDE, null);

  const handleOpenEdit = async (a) => {
    try {
      const detail = await jobsService.getAdminArticle(a.id);
      ouvrirFormulaire(
        a.id,
        {
          titre: detail.titre || "",
          categorie: detail.categorie || "",
          extrait: detail.extrait || "",
          contenu_html: detail.contenu_html || "",
          statut: detail.statut,
          image_couverture: null,
        },
        detail.image_couverture ? mediaUrl(detail.image_couverture) : null,
      );
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_ARTICLE", err);
      toast.error(apiErrMsg(err, "Erreur de chargement de l'article."));
    }
  };

  const modifie = JSON.stringify({ ...form, image_couverture: !!form.image_couverture }) !==
    JSON.stringify({ ...formInitial, image_couverture: !!formInitial.image_couverture });

  const retourListe = () => {
    if (!modifie) return setVue("liste");
    confirmToast("Quitter sans enregistrer ? Les modifications de cet article seront perdues.", () => setVue("liste"));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropperFile(file);
  };

  const appliquerImageRecadree = (fichierRecadre) => {
    setCropperFile(null);
    setForm((f) => ({ ...f, image_couverture: fichierRecadre }));
    setPreviewImage(URL.createObjectURL(fichierRecadre));
  };

  const handleAjouterCategorie = async () => {
    if (!nouvelleCategorie.trim()) return;
    try {
      const created = await jobsService.createArticleCategory({ label: nouvelleCategorie.trim() });
      setCategories((prev) => [...prev, created]);
      setForm((f) => ({ ...f, categorie: created.id }));
      setNouvelleCategorie("");
      toast.success("Catégorie ajoutée !");
    } catch (err) {
      reportError("ECHEC_CREATE_ARTICLE_CATEGORY", err);
      toast.error(apiErrMsg(err, "Erreur — cette catégorie existe peut-être déjà."));
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
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer cet article ? Il disparaîtra définitivement du blog.", async () => {
      try {
        await jobsService.deleteArticle(id);
        setArticles((prev) => prev.filter((a) => a.id !== id));
        toast.success("Article supprimé.");
      } catch (err) {
        reportError("ECHEC_DELETE_ARTICLE", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  if (vue === "form") {
    return (
      <div className="space-y-5 max-w-3xl">
        <button onClick={retourListe} className={`flex items-center gap-2 text-sm font-medium ${tw.textMuted} hover:text-slate-900 ${tw.focusRing} rounded`}>
          <ArrowLeft size={15} /> Retour à la liste
        </button>
        <AdminPageHeader
          icon={Newspaper}
          color="teal"
          title={editingId ? "Modifier l'article" : "Nouvel article"}
          subtitle={form.statut === "PUBLIE" ? "Statut : publié (visible sur /blog)" : "Statut : brouillon (non visible)"}
        />

        <form onSubmit={handleSubmit} className={`${tw.card} p-6 space-y-5`}>
          <div>
            <label htmlFor="article-titre" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Titre *</label>
            <input id="article-titre" required className={inputClass} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </div>

          <div>
            <label htmlFor="article-categorie" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Catégorie</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select id="article-categorie" className={inputClass} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                <option value="">— Aucune —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <div className="flex gap-2 sm:w-72 shrink-0">
                <input
                  placeholder="Nouvelle catégorie..."
                  aria-label="Nom de la nouvelle catégorie"
                  className={inputClass}
                  value={nouvelleCategorie}
                  onChange={(e) => setNouvelleCategorie(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAjouterCategorie(); } }}
                />
                <button type="button" onClick={handleAjouterCategorie} aria-label="Ajouter la catégorie" title="Ajouter la catégorie" className={`px-4 py-2.5 text-sm font-semibold rounded-lg ${tw.bgPrimarySolidHover} text-white shrink-0 ${tw.focusRing}`}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Extrait / résumé *</label>
            <textarea required rows={2} maxLength={EXTRAIT_MAX} className={inputClass} value={form.extrait} onChange={(e) => setForm({ ...form, extrait: e.target.value })} placeholder="Affiché dans la liste du blog et comme description SEO." />
            <p className={`text-[11px] mt-1 text-right tabular-nums ${form.extrait.length > 160 ? "text-amber-600" : tw.textMuted}`}>
              {form.extrait.length}/{EXTRAIT_MAX}
              {form.extrait.length > 160 && " — Google n'affiche qu'environ 160 caractères"}
            </p>
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Image de couverture</label>
            {previewImage && (
              <img src={previewImage} alt="Aperçu" className="w-full max-h-56 object-cover rounded-lg mb-2" />
            )}
            <label className={`flex items-center gap-2 px-4 py-2.5 border ${tw.borderBase} rounded-lg text-sm cursor-pointer w-fit ${tw.hoverSurfaceSubtle}`}>
              <ImageIcon size={15} /> {previewImage ? "Changer l'image" : "Choisir une image"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
            </label>
            <p className={`text-[11px] ${tw.textMuted} mt-1`}>Format 16:9 recadré automatiquement, 5 Mo maximum. Sans image, un bandeau coloré est affiché.</p>
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Contenu *</label>
            <RichTextEditor value={form.contenu_html} onChange={(html) => setForm((f) => ({ ...f, contenu_html: html }))} />
          </div>

          <div>
            <label htmlFor="article-statut" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Statut</label>
            <select id="article-statut" className={inputClass} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
              <option value="BROUILLON">Brouillon (non visible)</option>
              <option value="PUBLIE">Publié</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={retourListe} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
            <button type="submit" disabled={saving} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60`}>
              {saving ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer l'article"}
            </button>
          </div>
        </form>
        {cropperFile && (
          <ImageCropperModal
            file={cropperFile}
            aspect={16 / 9}
            cropShape="rect"
            onCancel={() => setCropperFile(null)}
            onValidate={appliquerImageRecadree}
          />
        )}
      </div>
    );
  }

  const nbPublies = articles.filter((a) => a.statut === "PUBLIE").length;
  const articlesAffiches = filtreStatut === "TOUS" ? articles : articles.filter((a) => a.statut === filtreStatut);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Newspaper}
        color="teal"
        title="Blog / Articles"
        subtitle={"Articles publiés sur /blog — visibles publiquement une fois le statut passé à \"Publié\"."}
        aideKey="articles"
        aide={[
          "Un article en « Brouillon » n'est visible nulle part : vous pouvez le préparer tranquillement avant de le publier.",
          "L'extrait sert à la fois d'aperçu dans la liste du blog et de description pour Google : 1 à 2 phrases, 160 caractères idéalement.",
          "Les articles publiés sont ajoutés automatiquement au sitemap (référencement).",
          "Créez une catégorie directement depuis le formulaire d'article (champ « Nouvelle catégorie… » puis +).",
        ]}
        actions={
          <button onClick={handleOpenCreate} className={`flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}>
            <Plus size={16} /> Nouvel article
          </button>
        }
      />

      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrer par statut">
        {[
          { key: "TOUS", label: `Tous (${articles.length})` },
          { key: "PUBLIE", label: `Publiés (${nbPublies})` },
          { key: "BROUILLON", label: `Brouillons (${articles.length - nbPublies})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltreStatut(f.key)}
            aria-pressed={filtreStatut === f.key}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${tw.focusRing} ${filtreStatut === f.key ? "bg-teal-600 border-teal-600 text-white" : `${tw.surface} ${tw.borderBase} ${tw.textMuted} ${tw.hoverSurfaceSubtle}`}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Titre</th>
                <th className="px-5 py-3">Catégorie</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={5} />
              ) : articlesAffiches.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <AdminVide
                      icon={Newspaper}
                      titre={articles.length === 0 ? "Aucun article pour l'instant." : "Aucun article dans ce filtre."}
                      texte={articles.length === 0 ? "Publiez des conseils carrière et recrutement pour faire vivre le blog." : undefined}
                    />
                  </td>
                </tr>
              ) : (
                articlesAffiches.map((a) => (
                  <tr key={a.id} className={tw.rowHover}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {a.image_couverture ? (
                          <img src={mediaUrl(a.image_couverture)} alt="" loading="lazy" width={48} height={32} className="w-12 h-8 object-cover rounded shrink-0" />
                        ) : (
                          <div className="w-12 h-8 rounded bg-linear-to-br from-indigo-100 to-teal-100 shrink-0" aria-hidden="true" />
                        )}
                        <p className={`text-sm font-medium ${tw.textStrong}`}>{a.titre}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {a.categorie_label ? (
                        <span className={`px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-medium rounded-full`}>{a.categorie_label}</span>
                      ) : (
                        <span className={`text-xs ${tw.textMuted}`}>—</span>
                      )}
                    </td>
                    <td className={`px-5 py-3 text-xs ${tw.textMuted700} whitespace-nowrap`}>
                      {a.statut === "PUBLIE" ? formatDate(a.date_publication) : `Créé le ${formatDate(a.date_creation)}`}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${a.statut === "PUBLIE" ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : "bg-amber-50 text-amber-700"}`}>
                        {a.statut === "PUBLIE" ? "Publié" : "Brouillon"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {a.statut === "PUBLIE" && a.slug && (
                          <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Voir l'article ${a.titre}`} title="Voir sur le site" className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}>
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button onClick={() => handleOpenEdit(a)} aria-label={`Modifier l'article ${a.titre}`} title="Modifier" className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(a.id)} aria-label={`Supprimer l'article ${a.titre}`} title="Supprimer" className={`p-2 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={14} /></button>
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
