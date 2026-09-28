import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, ArrowLeft, FileEdit, ExternalLink, Lock } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import RichTextEditor from "../../Components/RichTextEditor";
import { apiErrMsg } from "../../utils/apiErrMsg";
import AdminPageHeader from "../../Components/AdminPageHeader";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";

const FORM_VIDE = { slug: "", titre: "", contenu_html: "" };
// Pages système : liées en dur dans les footers, slug non modifiable, jamais supprimables.
const PAGES_FIXES = ["cgu", "confidentialite", "qui-sommes-nous"];
const urlPublique = (slug) => (PAGES_FIXES.includes(slug) ? `/${slug}` : `/pages/${slug}`);

const AdminPages = () => {
  const [vue, setVue] = useState("liste");
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  // Formulaire tel qu'ouvert — sert à détecter des modifications non enregistrées.
  const [formInitial, setFormInitial] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchPages = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminPages();
      setPages(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_PAGES", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const ouvrirFormulaire = (id, valeurs) => {
    setEditingId(id);
    setForm(valeurs);
    setFormInitial(valeurs);
    setVue("form");
  };

  const handleOpenCreate = () => ouvrirFormulaire(null, FORM_VIDE);

  const handleOpenEdit = (p) =>
    ouvrirFormulaire(p.id, { slug: p.slug, titre: p.titre, contenu_html: p.contenu_html || "" });

  const modifie =
    form.titre !== formInitial.titre || form.slug !== formInitial.slug || form.contenu_html !== formInitial.contenu_html;

  // Quitter le formulaire avec des changements non enregistrés demande confirmation (avant :
  // "Retour"/"Annuler" jetaient le contenu rédigé sans prévenir).
  const retourListe = () => {
    if (!modifie) return setVue("liste");
    confirmToast("Quitter sans enregistrer ? Les modifications de cette page seront perdues.", () => setVue("liste"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return toast.error("Le titre est obligatoire.");
    if (!form.slug.trim()) return toast.error("Le slug (URL) est obligatoire.");
    if (!editingId && PAGES_FIXES.includes(form.slug)) return toast.error("Ce slug est réservé à une page système.");
    if (!form.contenu_html || form.contenu_html === "<p></p>") return toast.error("Le contenu ne peut pas être vide.");
    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug.replace(/^-+|-+$/g, "") };
      if (editingId) {
        await jobsService.updatePageStatique(editingId, payload);
        toast.success("Page mise à jour !");
      } else {
        await jobsService.createPageStatique(payload);
        toast.success("Page créée !");
      }
      setVue("liste");
      fetchPages();
    } catch (err) {
      reportError("ECHEC_SAVE_PAGE_STATIQUE", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer cette page ? Son lien dans le pied de page du site disparaîtra aussi.", async () => {
      try {
        await jobsService.deletePageStatique(id);
        setPages((prev) => prev.filter((p) => p.id !== id));
        toast.success("Page supprimée.");
      } catch (err) {
        reportError("ECHEC_DELETE_PAGE_STATIQUE", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  if (vue === "form") {
    const slugVerrouille = PAGES_FIXES.includes(form.slug) && !!editingId;
    return (
      <div className="space-y-5 max-w-3xl">
        <button onClick={retourListe} className={`flex items-center gap-2 text-sm font-medium ${tw.textMuted} hover:text-slate-900 ${tw.focusRing} rounded`}>
          <ArrowLeft size={15} /> Retour à la liste
        </button>
        <AdminPageHeader
          icon={FileEdit}
          color="teal"
          title={editingId ? "Modifier la page" : "Nouvelle page"}
          subtitle={form.slug ? `Adresse publique : ${urlPublique(form.slug)}` : "Choisissez un titre et une adresse (slug)."}
        />

        <form onSubmit={handleSubmit} className={`${tw.card} p-6 space-y-5`}>
          <div>
            <label htmlFor="page-titre" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Titre *</label>
            <input id="page-titre" required className={inputClass} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </div>
          <div>
            <label htmlFor="page-slug" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
              Slug (URL) *
            </label>
            <input
              id="page-slug"
              required
              className={inputClass}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              disabled={slugVerrouille}
              placeholder="ex : partenaires"
            />
            <p className={`text-xs ${tw.textMuted} mt-1`}>
              {slugVerrouille
                ? "Page système — le slug ne peut pas être modifié."
                : "Lettres minuscules, chiffres et tirets uniquement. Les nouvelles pages apparaissent automatiquement dans la colonne « Légal » du pied de page."}
            </p>
          </div>
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Contenu *</label>
            <RichTextEditor value={form.contenu_html} onChange={(html) => setForm({ ...form, contenu_html: html })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={retourListe} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
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
      <AdminPageHeader
        icon={FileEdit}
        color="teal"
        title="Pages du site"
        subtitle="CGU, Politique de confidentialité, Qui sommes-nous, et toute page libre supplémentaire."
        aideKey="pages"
        aide={[
          "Les 3 pages système (cadenas) sont liées en permanence dans le pied de page : leur contenu est modifiable, mais pas leur adresse, et elles ne peuvent pas être supprimées.",
          "Une page libre créée ici s'ajoute automatiquement dans la colonne « Légal » du pied de page candidat et recruteur, à l'adresse /pages/<slug>.",
          "Le contenu est nettoyé à l'enregistrement (balises dangereuses retirées) : le rendu public peut légèrement différer d'un copier-coller externe.",
          "Mettez à jour la date de dernière modification dans le texte des CGU/confidentialité à chaque changement juridique.",
        ]}
        actions={
          <button onClick={handleOpenCreate} className={`flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}>
            <Plus size={16} /> Nouvelle page
          </button>
        }
      />

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
                <SkeletonTableRows columns={3} />
              ) : pages.length === 0 ? (
                <tr><td colSpan="3"><AdminVide icon={FileEdit} titre="Aucune page." /></td></tr>
              ) : (
                pages.map((p) => (
                  <tr key={p.id} className={tw.rowHover}>
                    <td className="px-5 py-3">
                      <p className={`text-sm font-medium ${tw.textStrong} flex items-center gap-1.5`}>
                        {PAGES_FIXES.includes(p.slug) && <Lock size={12} className="text-slate-400" aria-label="Page système" />}
                        {p.titre}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={urlPublique(p.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs ${tw.textPrimary} hover:underline inline-flex items-center gap-1 font-mono`}
                      >
                        {urlPublique(p.slug)} <ExternalLink size={11} />
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(p)} aria-label={`Modifier la page ${p.titre}`} title="Modifier" className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Pencil size={14} /></button>
                        {!PAGES_FIXES.includes(p.slug) && (
                          <button onClick={() => handleDelete(p.id)} aria-label={`Supprimer la page ${p.titre}`} title="Supprimer" className={`p-2 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={14} /></button>
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
