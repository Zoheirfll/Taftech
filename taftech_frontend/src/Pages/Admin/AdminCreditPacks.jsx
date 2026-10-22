import { useSubmitLock } from "../../utils/useSubmitLock";
import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { notifier } from "../../utils/notifier";
import { Plus, Pencil, Trash2, X, Coins } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const prixParCredit = (prix, credits) => (credits > 0 ? Math.round(prix / credits) : null);

const PACK_VIDE = { nom: "", credits: "", prix_da: "", ordre: 0, actif: true };

const AdminCreditPacks = () => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(PACK_VIDE);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminCreditPacks();
      setItems(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_CREDIT_PACKS", err);
      notifier.echec("Chargement impossible", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fermerModal = React.useCallback(() => setShowModal(false), []);
  useEchapPourFermer(showModal, fermerModal);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(PACK_VIDE);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setForm({ nom: item.nom, credits: item.credits, prix_da: item.prix_da, ordre: item.ordre, actif: item.actif });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return notifier.erreur("Nom manquant", "Le nom est obligatoire.");
    if (!(Number(form.credits) >= 1)) return notifier.erreur("Nombre de crédits invalide", "Un pack doit contenir au moins 1 crédit.");
    if (!(Number(form.prix_da) >= 1)) return notifier.erreur("Prix invalide", "Le prix doit être d'au moins 1 DA.");
    const payload = {
      ...form,
      credits: Number(form.credits) || 0,
      prix_da: Number(form.prix_da) || 0,
      ordre: Number(form.ordre) || 0,
    };
    try {
      if (editingId) {
        await jobsService.updateCreditPack(editingId, payload);
        notifier.succes("Pack mis à jour");
      } else {
        await jobsService.createCreditPack(payload);
        notifier.succes("Pack ajouté");
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      reportError("ECHEC_SAVE_CREDIT_PACK", err);
      notifier.echec("Enregistrement impossible", err);
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer ce pack ? Les crédits déjà achetés par les recruteurs restent valables. Pour seulement le retirer de la vente, décochez plutôt « Pack visible ».", async () => {
      try {
        await jobsService.deleteCreditPack(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        notifier.succes("Pack supprimé");
      } catch (err) {
        reportError("ECHEC_DELETE_CREDIT_PACK", err);
        notifier.echec("Suppression impossible", err);
      }
    });
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        compact
        icon={Coins}
        color="emerald"
        title="Packs de crédits CVthèque"
        subtitle="Crédits achetables par les recruteurs quand leur quota mensuel est épuisé."
        aideKey="credit-packs"
        aide={[
          "1 crédit = débloquer les coordonnées et le CV d'un candidat pour toute l'équipe de l'entreprise, tant que le candidat laisse son profil actif et visible (il peut le masquer ou supprimer son compte).",
          "Les crédits achetés n'expirent jamais ; ils sont utilisés après le quota mensuel inclus dans le palier.",
          "Le prix par crédit aide à rendre les gros packs plus avantageux que les petits.",
          "Paiement par Chargily : le montant facturé est exactement le prix indiqué ici.",
        ]}
        actions={
          <button
            onClick={handleOpenCreate}
            className={`flex items-center gap-2 px-4 py-2 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}
          >
            <Plus size={16} /> Ajouter un pack
          </button>
        }
      />

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Nom</th>
                <th className="px-5 py-3">Crédits</th>
                <th className="px-5 py-3">Prix</th>
                <th className="px-5 py-3">Prix / crédit</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={6} />
              ) : items.length === 0 ? (
                <tr><td colSpan="6"><AdminVide icon={Coins} titre="Aucun pack configuré." texte="Sans pack actif, un recruteur au quota épuisé ne peut plus débloquer de profil avant le mois suivant." /></td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={tw.rowHover}>
                    <td className="px-5 py-3"><p className={`text-sm font-medium ${tw.textStrong}`}>{item.nom}</p></td>
                    <td className="px-5 py-3 text-sm tabular-nums">{item.credits}</td>
                    <td className={`px-5 py-3 text-sm font-semibold ${tw.textStrong} tabular-nums`}>{Number(item.prix_da).toLocaleString("fr-FR")} DA</td>
                    <td className={`px-5 py-3 text-xs ${tw.textMuted700} tabular-nums`}>
                      {prixParCredit(item.prix_da, item.credits) != null ? `${prixParCredit(item.prix_da, item.credits).toLocaleString("fr-FR")} DA` : "—"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${item.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {item.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(item)} aria-label={`Modifier le pack ${item.nom}`} title="Modifier" className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} aria-label={`Supprimer le pack ${item.nom}`} title="Supprimer" className={`p-2 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={14} /></button>
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
          <div role="dialog" aria-modal="true" aria-labelledby="titre-modal-pack" className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 id="titre-modal-pack" className={`text-base font-bold ${tw.textStrong}`}>{editingId ? "Modifier le pack" : "Ajouter un pack"}</h3>
              <button onClick={fermerModal} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label htmlFor="pack_nom" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Nom *</label>
                <input id="pack_nom" required className={inputClass} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
              <div>
                <label htmlFor="pack_credits" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Crédits *</label>
                <input id="pack_credits" type="number" min="1" required className={inputClass} value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
              </div>
              <div>
                <label htmlFor="pack_prix" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Prix (DA) *</label>
                <input id="pack_prix" type="number" min="1" required className={inputClass} value={form.prix_da} onChange={(e) => setForm({ ...form, prix_da: e.target.value })} />
                {Number(form.credits) >= 1 && Number(form.prix_da) >= 1 && (
                  <p className={`text-[11px] ${tw.textMuted} mt-1`}>
                    Soit {prixParCredit(Number(form.prix_da), Number(form.credits)).toLocaleString("fr-FR")} DA par crédit.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="pack_ordre" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Ordre d'affichage</label>
                <input id="pack_ordre" type="number" min="0" className={inputClass} value={form.ordre} onChange={(e) => setForm({ ...form, ordre: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pack_actif" className={`${tw.accentPrimary} w-4 h-4`} checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                <label htmlFor="pack_actif" className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>Pack visible/achetable</label>
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

export default AdminCreditPacks;
