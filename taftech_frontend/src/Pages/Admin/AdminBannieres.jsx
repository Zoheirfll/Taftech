import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Image as ImageIcon } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { mediaUrl } from "../../utils/mediaUrl";
import ImageCropperModal from "../../Components/ImageCropperModal";

const ANNONCE_VIDE = { texte: "", lien_url: "", lien_label: "", type_annonce: "INFO", actif: false };
const BANNIERE_VIDE = { titre: "", lien_url: "", ordre: 0, actif: true, image: null };

const AdminBannieres = () => {
  const [onglet, setOnglet] = useState("annonce");
  const [annonces, setAnnonces] = useState([]);
  const [bannieres, setBannieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formAnnonce, setFormAnnonce] = useState(ANNONCE_VIDE);
  const [formBanniere, setFormBanniere] = useState(BANNIERE_VIDE);
  const [previewImage, setPreviewImage] = useState(null);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchTout = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        jobsService.getAdminSiteAnnonces(),
        jobsService.getAdminBannieresAccueil(),
      ]);
      setAnnonces(a);
      setBannieres(b);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_BANNIERES", err);
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

  const [cropperFile, setCropperFile] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropperFile(file);
  };

  const appliquerImageRecadree = (fichierRecadre) => {
    setCropperFile(null);
    setFormBanniere({ ...formBanniere, image: fichierRecadre });
    setPreviewImage(URL.createObjectURL(fichierRecadre));
  };

  const handleSubmitAnnonce = async (e) => {
    e.preventDefault();
    if (!formAnnonce.texte.trim()) return toast.error("Le texte est obligatoire.");
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
      toast.error("Erreur lors de la sauvegarde.");
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
      toast.error("Erreur lors de la sauvegarde.");
    }
  };

  const handleDeleteAnnonce = (id) => {
    confirmToast("Supprimer cette annonce ?", async () => {
      try {
        await jobsService.deleteSiteAnnonce(id);
        setAnnonces(annonces.filter((a) => a.id !== id));
        toast.success("Annonce supprimée.");
      } catch (err) {
        reportError("ECHEC_DELETE_SITE_ANNONCE", err);
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  const handleDeleteBanniere = (id) => {
    confirmToast("Supprimer cette bannière ?", async () => {
      try {
        await jobsService.deleteBanniereAccueil(id);
        setBannieres(bannieres.filter((b) => b.id !== id));
        toast.success("Bannière supprimée.");
      } catch (err) {
        reportError("ECHEC_DELETE_BANNIERE", err);
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>Bannières</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>Bandeau d'annonce du site et carrousel promotionnel de la page d'accueil.</p>
        </div>
        <button onClick={handleOpenCreate} className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}>
          <Plus size={16} /> {onglet === "annonce" ? "Nouvelle annonce" : "Nouvelle bannière"}
        </button>
      </div>

      <div className={`flex gap-1 border-b ${tw.borderSubtle}`}>
        {[
          { id: "annonce", label: "Bandeau d'annonce" },
          { id: "carrousel", label: "Carrousel accueil" },
        ].map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${onglet === o.id ? `border-teal-600 ${tw.textPrimaryStrong}` : `border-transparent ${tw.textMuted} hover:${tw.textStrong}`}`}
          >
            {o.label}
          </button>
        ))}
      </div>

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
                  <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
                ) : annonces.length === 0 ? (
                  <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucune annonce configurée.</td></tr>
                ) : (
                  annonces.map((a) => (
                    <tr key={a.id} className={tw.rowHover}>
                      <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong} max-w-sm truncate`}>{a.texte}</p></td>
                      <td className="px-5 py-3 text-xs">{a.type_annonce}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${a.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                          {a.actif ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenEditAnnonce(a)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteAnnonce(a.id)} className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={14} /></button>
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
            <p className={`text-sm ${tw.textMuted}`}>Chargement...</p>
          ) : bannieres.length === 0 ? (
            <p className={`text-sm ${tw.textMuted} italic`}>Aucune bannière configurée.</p>
          ) : (
            bannieres.map((b) => (
              <div key={b.id} className={`${tw.card} rounded-xl overflow-hidden`}>
                <img src={mediaUrl(b.image)} alt={b.titre || ""} className="w-full h-32 object-cover" />
                <div className="p-3">
                  <p className={`text-sm font-semibold ${tw.textStrong} truncate`}>{b.titre || "(sans titre)"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${b.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                      {b.actif ? "Active" : "Inactive"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEditBanniere(b)} className={`p-1.5 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteBanniere(b.id)} className={`p-1.5 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && onglet === "annonce" && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier l'annonce" : "Nouvelle annonce"}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitAnnonce} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Texte *</label>
                <input required maxLength={200} className={inputClass} value={formAnnonce.texte} onChange={(e) => setFormAnnonce({ ...formAnnonce, texte: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              <div className="flex items-center gap-2">
                <input type="checkbox" id="annonce_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={formAnnonce.actif} onChange={(e) => setFormAnnonce({ ...formAnnonce, actif: e.target.checked })} />
                <label htmlFor="annonce_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Active (l'activer désactive automatiquement les autres)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>{editingId ? "Mettre à jour" : "Créer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && onglet === "carrousel" && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier la bannière" : "Nouvelle bannière"}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitBanniere} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Image {!editingId && "*"}</label>
                {previewImage && <img src={previewImage} alt="Aperçu" className="w-full h-32 object-cover rounded-lg mb-2" />}
                <label className={`flex items-center gap-2 px-4 py-2.5 border ${tw.borderBase} rounded-lg text-sm cursor-pointer w-fit ${tw.hoverSurfaceSubtle}`}>
                  <ImageIcon size={15} /> Choisir une image
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
                </label>
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
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>{editingId ? "Mettre à jour" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cropperFile && (
        <ImageCropperModal
          file={cropperFile}
          aspect={21 / 9}
          cropShape="rect"
          onCancel={() => setCropperFile(null)}
          onValidate={appliquerImageRecadree}
        />
      )}
    </div>
  );
};

export default AdminBannieres;
