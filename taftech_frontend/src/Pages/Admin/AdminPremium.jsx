import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { PREMIUM_ICON_MAP } from "../Recruteur/Portal/PremiumPage";

const ICONES_DISPONIBLES = Object.keys(PREMIUM_ICON_MAP);

const PLAN_VIDE = { nb_mois: "", label: "", prix_da: "", populaire: false, actif: true, ordre: 0 };
const AVANTAGE_VIDE = { icone: "Star", titre: "", description: "", ordre: 0, actif: true };

const AdminPremium = () => {
  const [onglet, setOnglet] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [avantages, setAvantages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formPlan, setFormPlan] = useState(PLAN_VIDE);
  const [formAvantage, setFormAvantage] = useState(AVANTAGE_VIDE);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchTout = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        jobsService.getAdminPremiumPlans(),
        jobsService.getAdminPremiumAvantages(),
      ]);
      setPlans(p);
      setAvantages(a);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_PREMIUM", err);
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
    setFormPlan(PLAN_VIDE);
    setFormAvantage(AVANTAGE_VIDE);
    setShowModal(true);
  };

  const handleOpenEditPlan = (p) => {
    setEditingId(p.id);
    setFormPlan({ nb_mois: p.nb_mois, label: p.label, prix_da: p.prix_da, populaire: p.populaire, actif: p.actif, ordre: p.ordre });
    setShowModal(true);
  };

  const handleOpenEditAvantage = (a) => {
    setEditingId(a.id);
    setFormAvantage({ icone: a.icone, titre: a.titre, description: a.description, ordre: a.ordre, actif: a.actif });
    setShowModal(true);
  };

  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    if (!formPlan.nb_mois || Number(formPlan.nb_mois) <= 0) return toast.error("Durée invalide.");
    if (!formPlan.label.trim()) return toast.error("Le libellé est obligatoire.");
    if (!formPlan.prix_da || Number(formPlan.prix_da) <= 0) return toast.error("Le prix doit être supérieur à 0.");
    const payload = { ...formPlan, nb_mois: Number(formPlan.nb_mois), prix_da: Number(formPlan.prix_da), ordre: Number(formPlan.ordre) || 0 };
    try {
      if (editingId) {
        await jobsService.updatePremiumPlan(editingId, payload);
        toast.success("Palier mis à jour !");
      } else {
        await jobsService.createPremiumPlan(payload);
        toast.success("Palier ajouté !");
      }
      setShowModal(false);
      fetchTout();
    } catch (err) {
      reportError("ECHEC_SAVE_PREMIUM_PLAN", err);
      toast.error(err.response?.data?.nb_mois?.[0] || "Erreur lors de la sauvegarde.");
    }
  };

  const handleSubmitAvantage = async (e) => {
    e.preventDefault();
    if (!formAvantage.titre.trim()) return toast.error("Le titre est obligatoire.");
    if (!formAvantage.description.trim()) return toast.error("La description est obligatoire.");
    const payload = { ...formAvantage, ordre: Number(formAvantage.ordre) || 0 };
    try {
      if (editingId) {
        await jobsService.updatePremiumAvantage(editingId, payload);
        toast.success("Avantage mis à jour !");
      } else {
        await jobsService.createPremiumAvantage(payload);
        toast.success("Avantage ajouté !");
      }
      setShowModal(false);
      fetchTout();
    } catch (err) {
      reportError("ECHEC_SAVE_PREMIUM_AVANTAGE", err);
      toast.error("Erreur lors de la sauvegarde.");
    }
  };

  const handleDeletePlan = (id) => {
    confirmToast("Supprimer ce palier d'abonnement ?", async () => {
      try {
        await jobsService.deletePremiumPlan(id);
        setPlans(plans.filter((p) => p.id !== id));
        toast.success("Palier supprimé.");
      } catch (err) {
        reportError("ECHEC_DELETE_PREMIUM_PLAN", err);
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  const handleDeleteAvantage = (id) => {
    confirmToast("Supprimer cet avantage ?", async () => {
      try {
        await jobsService.deletePremiumAvantage(id);
        setAvantages(avantages.filter((a) => a.id !== id));
        toast.success("Avantage supprimé.");
      } catch (err) {
        reportError("ECHEC_DELETE_PREMIUM_AVANTAGE", err);
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>Config. Premium</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Prix des abonnements et avantages affichés sur la page Premium — sans toucher au code.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}
        >
          <Plus size={16} /> {onglet === "plans" ? "Ajouter un palier" : "Ajouter un avantage"}
        </button>
      </div>

      <div className={`flex gap-1 border-b ${tw.borderSubtle}`}>
        {[
          { id: "plans", label: "Abonnements" },
          { id: "avantages", label: "Avantages" },
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

      {onglet === "plans" && (
        <div className={`${tw.card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
                <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                  <th className="px-5 py-3">Durée</th>
                  <th className="px-5 py-3">Libellé</th>
                  <th className="px-5 py-3">Prix</th>
                  <th className="px-5 py-3 text-center">Populaire</th>
                  <th className="px-5 py-3 text-center">Statut</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tw.divideBase}`}>
                {loading ? (
                  <tr><td colSpan="6" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
                ) : plans.length === 0 ? (
                  <tr><td colSpan="6" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun palier configuré.</td></tr>
                ) : (
                  plans.map((p) => (
                    <tr key={p.id} className={tw.rowHover}>
                      <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong}`}>{p.nb_mois} mois</p></td>
                      <td className="px-5 py-3 text-sm">{p.label}</td>
                      <td className="px-5 py-3 text-sm font-semibold">{p.prix_da.toLocaleString("fr-FR")} DA</td>
                      <td className="px-5 py-3 text-center">
                        {p.populaire && <span className={`px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-medium rounded-full`}>Populaire</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${p.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                          {p.actif ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenEditPlan(p)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={14} /></button>
                          <button onClick={() => handleDeletePlan(p.id)} className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={14} /></button>
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

      {onglet === "avantages" && (
        <div className={`${tw.card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
                <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                  <th className="px-5 py-3">Icône</th>
                  <th className="px-5 py-3">Titre</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-center">Statut</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tw.divideBase}`}>
                {loading ? (
                  <tr><td colSpan="5" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
                ) : avantages.length === 0 ? (
                  <tr><td colSpan="5" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun avantage configuré.</td></tr>
                ) : (
                  avantages.map((a) => {
                    const Icon = PREMIUM_ICON_MAP[a.icone];
                    return (
                      <tr key={a.id} className={tw.rowHover}>
                        <td className="px-5 py-3">{Icon && <Icon size={16} className="text-teal-700" />}</td>
                        <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong}`}>{a.titre}</p></td>
                        <td className={`px-5 py-3 text-xs ${tw.textMuted} max-w-xs truncate`}>{a.description}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${a.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                            {a.actif ? "Actif" : "Inactif"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleOpenEditAvantage(a)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteAvantage(a.id)} className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && onglet === "plans" && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier le palier" : "Ajouter un palier"}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitPlan} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Durée (mois) *</label>
                <input required type="number" min="1" className={inputClass} value={formPlan.nb_mois} onChange={(e) => setFormPlan({ ...formPlan, nb_mois: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Libellé *</label>
                <input required className={inputClass} placeholder="Ex: 6 mois" value={formPlan.label} onChange={(e) => setFormPlan({ ...formPlan, label: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Prix final (DA) *</label>
                <input required type="number" min="1" className={inputClass} placeholder="Ex: 11040" value={formPlan.prix_da} onChange={(e) => setFormPlan({ ...formPlan, prix_da: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Ordre d'affichage</label>
                <input type="number" min="0" className={inputClass} value={formPlan.ordre} onChange={(e) => setFormPlan({ ...formPlan, ordre: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="populaire" className={`${tw.accentPrimary} w-4 h-4`} checked={formPlan.populaire} onChange={(e) => setFormPlan({ ...formPlan, populaire: e.target.checked })} />
                <label htmlFor="populaire" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Badge "Populaire"</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="plan_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={formPlan.actif} onChange={(e) => setFormPlan({ ...formPlan, actif: e.target.checked })} />
                <label htmlFor="plan_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Palier actif (visible/achetable)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>{editingId ? "Mettre à jour" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && onglet === "avantages" && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier l'avantage" : "Ajouter un avantage"}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitAvantage} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Icône *</label>
                <select required className={inputClass} value={formAvantage.icone} onChange={(e) => setFormAvantage({ ...formAvantage, icone: e.target.value })}>
                  {ICONES_DISPONIBLES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Titre *</label>
                <input required className={inputClass} placeholder="Ex: Coordonnées candidats" value={formAvantage.titre} onChange={(e) => setFormAvantage({ ...formAvantage, titre: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Description *</label>
                <textarea required rows={3} className={inputClass} value={formAvantage.description} onChange={(e) => setFormAvantage({ ...formAvantage, description: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Ordre d'affichage</label>
                <input type="number" min="0" className={inputClass} value={formAvantage.ordre} onChange={(e) => setFormAvantage({ ...formAvantage, ordre: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="avantage_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={formAvantage.actif} onChange={(e) => setFormAvantage({ ...formAvantage, actif: e.target.checked })} />
                <label htmlFor="avantage_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Avantage visible</label>
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

export default AdminPremium;
