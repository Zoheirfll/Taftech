import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Pencil, X } from "lucide-react";
import { tw } from "../../theme";

const NOM_LABELS = { STARTER: "Starter", PRO: "Pro", BUSINESS: "Business", ENTERPRISE: "Enterprise" };

const AdminPaliers = () => {
  const [paliers, setPaliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchPaliers = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminPaliers();
      setPaliers(data);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_PALIERS", err);
      toast.error("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaliers();
  }, []);

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setForm({ ...p });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      prix_mensuel_da: form.prix_mensuel_da === "" ? null : Number(form.prix_mensuel_da),
      prix_annuel_da: form.prix_annuel_da === "" ? null : Number(form.prix_annuel_da),
      limite_offres: form.limite_offres === "" ? null : Number(form.limite_offres),
      limite_cv_mois: form.limite_cv_mois === "" ? null : Number(form.limite_cv_mois),
      ordre: Number(form.ordre) || 0,
    };
    try {
      await jobsService.updatePalier(editingId, payload);
      toast.success("Palier mis à jour !");
      setShowModal(false);
      fetchPaliers();
    } catch (err) {
      reportError("ECHEC_UPDATE_PALIER", err);
      toast.error("Erreur lors de la sauvegarde.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className={tw.pageTitle}>Config. Paliers</h1>
        <p className={`${tw.pageSubtitle} mt-0.5`}>
          Prix, limites et accès des 4 formules d'abonnement recruteur — sans toucher au code.
        </p>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Palier</th>
                <th className="px-5 py-3">Prix mensuel</th>
                <th className="px-5 py-3">Prix annuel</th>
                <th className="px-5 py-3">Limite offres</th>
                <th className="px-5 py-3">Limite CV/mois</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <tr><td colSpan="7" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
              ) : paliers.length === 0 ? (
                <tr><td colSpan="7" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun palier configuré.</td></tr>
              ) : (
                paliers.map((p) => (
                  <tr key={p.id} className={tw.rowHover}>
                    <td className="px-5 py-3"><p className={`text-sm font-bold ${tw.textStrong}`}>{NOM_LABELS[p.nom] || p.nom}</p></td>
                    <td className="px-5 py-3 text-sm">{p.prix_mensuel_da != null ? `${p.prix_mensuel_da.toLocaleString("fr-FR")} DA` : "Sur devis"}</td>
                    <td className="px-5 py-3 text-sm">{p.prix_annuel_da != null ? `${p.prix_annuel_da.toLocaleString("fr-FR")} DA` : "—"}</td>
                    <td className="px-5 py-3 text-sm">{p.limite_offres != null ? p.limite_offres : "Illimité"}</td>
                    <td className="px-5 py-3 text-sm">{p.limite_cv_mois != null ? p.limite_cv_mois : "Illimité"}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${p.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {p.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button aria-label={`Modifier ${NOM_LABELS[p.nom] || p.nom}`} onClick={() => handleOpenEdit(p)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors`}><Pencil size={14} /></button>
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
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Modifier {NOM_LABELS[form.nom] || form.nom}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="prix_mensuel_da" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Prix mensuel (DA) — vide = "Sur devis"</label>
                <input id="prix_mensuel_da" type="number" min="1" className={inputClass} value={form.prix_mensuel_da ?? ""} onChange={(e) => setForm({ ...form, prix_mensuel_da: e.target.value })} />
              </div>
              <div>
                <label htmlFor="prix_annuel_da" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Prix annuel (DA)</label>
                <input id="prix_annuel_da" type="number" min="1" className={inputClass} value={form.prix_annuel_da ?? ""} onChange={(e) => setForm({ ...form, prix_annuel_da: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remise_annuelle_active" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.remise_annuelle_active} onChange={(e) => setForm({ ...form, remise_annuelle_active: e.target.checked })} />
                <label htmlFor="remise_annuelle_active" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Afficher la remise annuelle</label>
              </div>
              <div>
                <label htmlFor="limite_offres" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Limite offres actives (vide = illimité)</label>
                <input id="limite_offres" type="number" min="1" className={inputClass} value={form.limite_offres ?? ""} onChange={(e) => setForm({ ...form, limite_offres: e.target.value })} />
              </div>
              <div>
                <label htmlFor="limite_cv_mois" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Limite CV/mois (vide = illimité)</label>
                <input id="limite_cv_mois" type="number" min="1" className={inputClass} value={form.limite_cv_mois ?? ""} onChange={(e) => setForm({ ...form, limite_cv_mois: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="acces_coordonnees" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.acces_coordonnees} onChange={(e) => setForm({ ...form, acces_coordonnees: e.target.checked })} />
                <label htmlFor="acces_coordonnees" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Coordonnées candidats visibles</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="acces_ia_recommandes" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.acces_ia_recommandes} onChange={(e) => setForm({ ...form, acces_ia_recommandes: e.target.checked })} />
                <label htmlFor="acces_ia_recommandes" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Candidats recommandés (IA)</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="acces_ia_avancee" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.acces_ia_avancee} onChange={(e) => setForm({ ...form, acces_ia_avancee: e.target.checked })} />
                <label htmlFor="acces_ia_avancee" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Recherche/filtres/stats IA avancés</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="acces_equipe" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.acces_equipe} onChange={(e) => setForm({ ...form, acces_equipe: e.target.checked })} />
                <label htmlFor="acces_equipe" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Gestion d'équipe multi-utilisateurs</label>
              </div>
              <div>
                <label htmlFor="support_label" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Support (texte libre)</label>
                <input id="support_label" className={inputClass} value={form.support_label ?? ""} onChange={(e) => setForm({ ...form, support_label: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="palier_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={!!form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                <label htmlFor="palier_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Palier actif (visible/achetable)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>Mettre à jour</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaliers;
