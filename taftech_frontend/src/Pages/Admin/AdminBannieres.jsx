import { useSubmitLock } from "../../utils/useSubmitLock";
import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Image as ImageIcon, GalleryHorizontal } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { mediaUrl } from "../../utils/mediaUrl";
import { apiErrMsg } from "../../utils/apiErrMsg";
import ImageCropperModal from "../../Components/ImageCropperModal";
import AdminPageHeader from "../../Components/AdminPageHeader";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const ANNONCE_VIDE = { texte: "", lien_url: "", lien_label: "", type_annonce: "INFO", actif: false };
const BANNIERE_VIDE = { titre: "", lien_url: "", ordre: 0, actif: true, image: null };

// Même rendu que le bandeau public (SiteAnnonceBar) — l'admin voit la couleur réelle.
const TYPES_ANNONCE = {
  INFO: { label: "Info", classe: "bg-indigo-600 text-white", pastille: "bg-indigo-100 text-indigo-800" },
  WARNING: { label: "Avertissement", classe: "bg-amber-500 text-white", pastille: "bg-amber-100 text-amber-800" },
  SUCCESS: { label: "Succès", classe: "bg-emerald-600 text-white", pastille: "bg-emerald-100 text-emerald-800" },
};

const AdminBannieres = () => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [onglet, setOnglet] = useState("annonce");
  const [annonces, setAnnonces] = useState([]);
  const [bannieres, setBannieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formAnnonce, setFormAnnonce] = useState(ANNONCE_VIDE);
  const [formBanniere, setFormBanniere] = useState(BANNIERE_VIDE);
  const [previewImage, setPreviewImage] = useState(null);
  const [cropperFile, setCropperFile] = useState(null);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchTout = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        jobsService.getAdminSiteAnnonces(),
        jobsService.getAdminBannieresAccueil(),
      ]);
      setAnnonces(Array.isArray(a) ? a : a?.results || []);
      setBannieres(Array.isArray(b) ? b : b?.results || []);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_BANNIERES", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTout();
  }, []);

  const fermerModal = useCallback(() => setShowModal(false), []);
  useEchapPourFermer(showModal && !cropperFile, fermerModal);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormAnnonce(ANNONCE_VIDE);
    setFormBanniere(BANNIERE_VIDE);
    setPreviewImage(null);
    setShowModal(true);
  };

  const handleOpenEditAnnonce = (a) => {
    setEditingId(a.id);
    setFormAnnonce({ texte: a.texte, lien_url: a.lien_url || "", lien_label: a.lien_label || "", type_annonce: a.type_annonce, actif: a.actif });
    setShowModal(true);
  };

  const handleOpenEditBanniere = (b) => {
    setEditingId(b.id);
    setFormBanniere({ titre: b.titre || "", lien_url: b.lien_url || "", ordre: b.ordre, actif: b.actif, image: null });
    setPreviewImage(mediaUrl(b.image));
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropperFile(file);
  };

  const appliquerImageRecadree = (fichierRecadre) => {
    setCropperFile(null);
    setFormBanniere((f) => ({ ...f, image: fichierRecadre }));
    setPreviewImage(URL.createObjectURL(fichierRecadre));
  };

  const handleSubmitAnnonce = async (e) => {
    e.preventDefault();
    if (!formAnnonce.texte.trim()) return toast.error("Le texte est obligatoire.");
    if (formAnnonce.lien_label.trim() && !formAnnonce.lien_url.trim())
      return toast.error("Un libellé de lien nécessite une URL.");
    try {
      if (editingId) {
        await jobsService.updateSiteAnnonce(editingId, formAnnonce);
        toast.success("Annonce mise à jour !");
      } else {
        await jobsService.createSiteAnnonce(formAnnonce);
        toast.success("Annonce créée !");
      }
      setShowModal(false);
      fetchTout();
    } catch (err) {
      reportError("ECHEC_SAVE_SITE_ANNONCE", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    }
  };

  const handleSubmitBanniere = async (e) => {
    e.preventDefault();
    if (!editingId && !formBanniere.image) return toast.error("L'image est obligatoire.");
    const payload = { ...formBanniere, ordre: Number(formBanniere.ordre) || 0 };
    if (!payload.image) delete payload.image;
    try {
      if (editingId) {
        await jobsService.updateBanniereAccueil(editingId, payload);
        toast.success("Bannière mise à jour !");
      } else {
        await jobsService.createBanniereAccueil(payload);
        toast.success("Bannière ajoutée !");
      }
      setShowModal(false);
      fetchTout();
    } catch (err) {
      reportError("ECHEC_SAVE_BANNIERE", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    }
  };

  const handleDeleteAnnonce = (id) => {
    confirmToast("Supprimer cette annonce ?", async () => {
      try {
        await jobsService.deleteSiteAnnonce(id);
        setAnnonces((prev) => prev.filter((a) => a.id !== id));
        toast.success("Annonce supprimée.");
      } catch (err) {
        reportError("ECHEC_DELETE_SITE_ANNONCE", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  const handleDeleteBanniere = (id) => {
    confirmToast("Supprimer cette bannière ?", async () => {
      try {
        await jobsService.deleteBanniereAccueil(id);
        setBannieres((prev) => prev.filter((b) => b.id !== id));
        toast.success("Bannière supprimée.");
      } catch (err) {
        reportError("ECHEC_DELETE_BANNIERE", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  const annonceActive = annonces.find((a) => a.actif);
  const bannieresTriees = [...bannieres].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={GalleryHorizontal}
        color="teal"
        title="Bannières"
        subtitle="Bandeau d'annonce du site et carrousel promotionnel de la page d'accueil."
        aideKey="bannieres"
        aide={[
          "Bandeau d'annonce : une ligne de texte affichée en haut de toutes les pages publiques. Une seule annonce peut être active : en activer une désactive automatiquement les autres.",
          "Le visiteur peut fermer le bandeau ; il réapparaît à sa prochaine visite (session suivante).",
          "Carrousel : images qui défilent sur la page d'accueil, dans l'ordre d'affichage croissant. Privilégiez des images larges (format paysage), recadrées au format 2:1.",
          "Le lien est facultatif. Tapez simplement « taftech.dz/offres » : le https:// est ajouté automatiquement.",
        ]}
        actions={
          <button onClick={handleOpenCreate} className={`flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}>
            <Plus size={16} /> {onglet === "annonce" ? "Nouvelle annonce" : "Nouvelle bannière"}
          </button>
        }
      />

      <div className={`flex gap-1 border-b ${tw.borderSubtle}`} role="tablist" aria-label="Type de bannière">
        {[
          { id: "annonce", label: "Bandeau d'annonce" },
          { id: "carrousel", label: "Carrousel accueil" },
        ].map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${onglet === o.id ? `border-teal-600 ${tw.textPrimaryStrong}` : "border-transparent text-slate-600 hover:text-slate-900"}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === "annonce" && annonceActive && (
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${tw.textMuted} mb-1.5`}>Aperçu — actuellement affiché sur le site</p>
          <div className={`rounded-lg px-4 py-2.5 text-sm font-medium text-center ${TYPES_ANNONCE[annonceActive.type_annonce]?.classe || TYPES_ANNONCE.INFO.classe}`}>
            {annonceActive.texte}
            {annonceActive.lien_url && <span className="underline ml-2">{annonceActive.lien_label || "En savoir plus"} →</span>}
          </div>
        </div>
      )}

      {onglet === "annonce" && (
        <div className={`${tw.card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
                <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                  <th className="px-5 py-3">Texte</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3 text-center">Statut</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tw.divideBase}`}>
                {loading ? (
                  <SkeletonTableRows columns={4} />
                ) : annonces.length === 0 ? (
                  <tr><td colSpan="4"><AdminVide icon={GalleryHorizontal} titre="Aucune annonce configurée." /></td></tr>
                ) : (
                  annonces.map((a) => (
                    <tr key={a.id} className={tw.rowHover}>
                      <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong} max-w-sm truncate`} title={a.texte}>{a.texte}</p></td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${TYPES_ANNONCE[a.type_annonce]?.pastille || tw.badgeNeutral}`}>
                          {TYPES_ANNONCE[a.type_annonce]?.label || a.type_annonce}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${a.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                          {a.actif ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenEditAnnonce(a)} aria-label={`Modifier l'annonce ${a.texte}`} title="Modifier" className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteAnnonce(a.id)} aria-label={`Supprimer l'annonce ${a.texte}`} title="Supprimer" className={`p-2 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {onglet === "carrousel" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />)
          ) : bannieresTriees.length === 0 ? (
            <div className={`${tw.card} col-span-full`}>
              <AdminVide icon={ImageIcon} titre="Aucune bannière configurée." texte="Le carrousel est masqué sur la page d'accueil tant qu'aucune bannière n'est active." />
            </div>
          ) : (
            bannieresTriees.map((b) => (
              <div key={b.id} className={`${tw.card} rounded-xl overflow-hidden ${b.actif ? "" : "opacity-60"}`}>
                <img src={mediaUrl(b.image)} alt={b.titre || ""} className="w-full h-32 object-cover" />
                <div className="p-3">
                  <p className={`text-sm font-semibold ${tw.textStrong} truncate`}>{b.titre || "(sans titre)"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${b.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {b.actif ? "Active" : "Inactive"}
                      </span>
                      <span className={`text-[10px] ${tw.textMuted}`}>Ordre {b.ordre}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEditBanniere(b)} aria-label={`Modifier la bannière ${b.titre || b.id}`} title="Modifier" className={`p-1.5 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteBanniere(b.id)} aria-label={`Supprimer la bannière ${b.titre || b.id}`} title="Supprimer" className={`p-1.5 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && onglet === "annonce" && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerModal()}>
          <div role="dialog" aria-modal="true" aria-label={editingId ? "Modifier l'annonce" : "Nouvelle annonce"} className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier l'annonce" : "Nouvelle annonce"}</h3>
              <button onClick={fermerModal} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleSubmitAnnonce)} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Texte *</label>
                <input required maxLength={200} className={inputClass} value={formAnnonce.texte} onChange={(e) => setFormAnnonce({ ...formAnnonce, texte: e.target.value })} />
                <p className={`text-[11px] ${tw.textMuted} mt-1 text-right tabular-nums`}>{formAnnonce.texte.length}/200</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Lien (URL)</label>
                  <input className={inputClass} value={formAnnonce.lien_url} onChange={(e) => setFormAnnonce({ ...formAnnonce, lien_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Libellé du lien</label>
                  <input className={inputClass} value={formAnnonce.lien_label} onChange={(e) => setFormAnnonce({ ...formAnnonce, lien_label: e.target.value })} placeholder="En savoir plus" />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Type</label>
                <select className={inputClass} value={formAnnonce.type_annonce} onChange={(e) => setFormAnnonce({ ...formAnnonce, type_annonce: e.target.value })}>
                  <option value="INFO">Info (bleu)</option>
                  <option value="WARNING">Avertissement (ambre)</option>
                  <option value="SUCCESS">Succès (vert)</option>
                </select>
              </div>
              {formAnnonce.texte.trim() && (
                <div className={`rounded-lg px-4 py-2 text-xs font-medium text-center ${TYPES_ANNONCE[formAnnonce.type_annonce]?.classe}`}>
                  {formAnnonce.texte}
                  {formAnnonce.lien_url && <span className="underline ml-2">{formAnnonce.lien_label || "En savoir plus"} →</span>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="annonce_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={formAnnonce.actif} onChange={(e) => setFormAnnonce({ ...formAnnonce, actif: e.target.checked })} />
                <label htmlFor="annonce_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Active (l'activer désactive automatiquement les autres)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fermerModal} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" disabled={submitBusy} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>{editingId ? "Mettre à jour" : "Créer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && onglet === "carrousel" && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerModal()}>
          <div role="dialog" aria-modal="true" aria-label={editingId ? "Modifier la bannière" : "Nouvelle bannière"} className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier la bannière" : "Nouvelle bannière"}</h3>
              <button onClick={fermerModal} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleSubmitBanniere)} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Image {!editingId && "*"}</label>
                {previewImage && <img src={previewImage} alt="Aperçu" className="w-full h-32 object-cover rounded-lg mb-2" />}
                <label className={`flex items-center gap-2 px-4 py-2.5 border ${tw.borderBase} rounded-lg text-sm cursor-pointer w-fit ${tw.hoverSurfaceSubtle}`}>
                  <ImageIcon size={15} /> {previewImage ? "Changer l'image" : "Choisir une image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
                </label>
                <p className={`text-[11px] ${tw.textMuted} mt-1`}>JPG, PNG ou WebP, 5 Mo maximum — recadrage au format 2:1.</p>
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Titre affiché</label>
                <input className={inputClass} value={formBanniere.titre} onChange={(e) => setFormBanniere({ ...formBanniere, titre: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Lien (URL)</label>
                <input className={inputClass} value={formBanniere.lien_url} onChange={(e) => setFormBanniere({ ...formBanniere, lien_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Ordre d'affichage</label>
                <input type="number" min="0" className={inputClass} value={formBanniere.ordre} onChange={(e) => setFormBanniere({ ...formBanniere, ordre: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="banniere_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={formBanniere.actif} onChange={(e) => setFormBanniere({ ...formBanniere, actif: e.target.checked })} />
                <label htmlFor="banniere_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Visible dans le carrousel</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fermerModal} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" disabled={submitBusy} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>{editingId ? "Mettre à jour" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cropperFile && (
        <ImageCropperModal
          file={cropperFile}
          aspect={2}
          cropShape="rect"
          onCancel={() => setCropperFile(null)}
          onValidate={appliquerImageRecadree}
        />
      )}
    </div>
  );
};

export default AdminBannieres;
