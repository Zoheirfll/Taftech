import { useSubmitLock } from "../../utils/useSubmitLock";
import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { notifier } from "../../utils/notifier";
import { Pencil, X, Layers } from "lucide-react";
import { tw } from "../../theme";
import { confirmToast } from "../../utils/confirmToast";
import AdminPageHeader from "../../Components/AdminPageHeader";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import useEchapPourFermer from "../../utils/useEchapPourFermer";
import { CARACTERISTIQUES_PALIER, formaterQuotaIA, remiseAnnuellePct } from "../../utils/paliersAffichage";

const NOM_LABELS = { STARTER: "Starter", PRO: "Pro", BUSINESS: "Business", ENTERPRISE: "Enterprise" };
const COULEUR_PALIER = {
  STARTER: "bg-sky-50 text-sky-700 border-sky-200",
  PRO: "bg-indigo-50 text-indigo-700 border-indigo-200",
  BUSINESS: "bg-violet-50 text-violet-700 border-violet-200",
  ENTERPRISE: "bg-amber-50 text-amber-800 border-amber-200",
};
const CHAMPS_NUMERIQUES = [
  "prix_mensuel_da", "prix_annuel_da", "limite_offres", "credits_mois",
  "quota_generation_offre_jour", "quota_generation_offre_mois",
  "quota_analyse_recruteur_jour", "quota_analyse_recruteur_mois",
];
const fmtDA = (v) => `${Number(v).toLocaleString("fr-FR")} DA`;
const nombreOuNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

const AdminPaliers = () => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [paliers, setPaliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [palierOriginal, setPalierOriginal] = useState(null);

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchPaliers = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminPaliers();
      setPaliers(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_PALIERS", err);
      notifier.echec("Chargement impossible", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaliers();
  }, []);

  const fermerModal = useCallback(() => setShowModal(false), []);
  useEchapPourFermer(showModal, fermerModal);

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setForm({ ...p });
    setPalierOriginal(p);
    setShowModal(true);
  };

  const enregistrer = async (payload) => {
    try {
      await jobsService.updatePalier(editingId, payload);
      notifier.succes("Palier mis à jour");
      setShowModal(false);
      fetchPaliers();
    } catch (err) {
      reportError("ECHEC_UPDATE_PALIER", err);
      notifier.echec("Enregistrement impossible", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, ordre: Number(form.ordre) || 0 };
    CHAMPS_NUMERIQUES.forEach((champ) => {
      payload[champ] = nombreOuNull(form[champ]);
    });
    // Un changement de prix s'applique immédiatement aux prochains paiements de tous les
    // recruteurs : confirmation explicite avec l'ancien et le nouveau tarif.
    const prixChange =
      palierOriginal &&
      (nombreOuNull(palierOriginal.prix_mensuel_da) !== payload.prix_mensuel_da ||
        nombreOuNull(palierOriginal.prix_annuel_da) !== payload.prix_annuel_da);
    if (prixChange) {
      const ancien = palierOriginal.prix_mensuel_da != null ? fmtDA(palierOriginal.prix_mensuel_da) : "Sur devis";
      const nouveau = payload.prix_mensuel_da != null ? fmtDA(payload.prix_mensuel_da) : "Sur devis";
      confirmToast(
        `Changer le tarif ${NOM_LABELS[form.nom] || form.nom} (mensuel : ${ancien} → ${nouveau}) ? Le nouveau prix s'applique aux prochains paiements ; les abonnements déjà payés ne changent pas.`,
        () => enregistrer(payload),
      );
      return;
    }
    await enregistrer(payload);
  };

  const remiseCalculee = (() => {
    const m = Number(form.prix_mensuel_da);
    const a = Number(form.prix_annuel_da);
    if (!m || !a) return null;
    return Math.round((1 - a / (m * 12)) * 100);
  })();

  const caseACocher = (id, label, aide) => (
    <div className="flex items-start gap-2">
      <input type="checkbox" id={id} className={`${tw.accentPrimary} w-4 h-4 mt-0.5`} checked={!!form[id]} onChange={(e) => setForm({ ...form, [id]: e.target.checked })} />
      <label htmlFor={id} className={`text-sm font-medium ${tw.textMuted700} cursor-pointer`}>
        {label}
        {aide && <span className={`block text-[11px] font-normal ${tw.textMuted}`}>{aide}</span>}
      </label>
    </div>
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        compact
        icon={Layers}
        color="emerald"
        title="Paliers d'abonnement"
        subtitle="Prix, limites et accès des 4 formules recruteur — sans toucher au code."
        aideKey="paliers"
        aide={[
          "Les 4 paliers sont fixes (pas d'ajout ni de suppression) : vous ajustez leurs prix, limites et accès.",
          "Prix mensuel vide = « Sur devis » (paiement en ligne désactivé pour ce palier, contact commercial).",
          "Champ vide = illimité (offres actives, crédits CVthèque, quotas IA). 0 = fonctionnalité bloquée pour ce palier.",
          "Un palier décoché « actif » n'est plus proposé à l'achat ; les entreprises déjà abonnées le conservent jusqu'à expiration.",
          "Sans abonnement, une entreprise est en « Gratuit » : 1 offre active, pas de CVthèque.",
        ]}
      />

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1180px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-5 py-3">Palier</th>
                <th className="px-5 py-3">Prix mensuel</th>
                <th className="px-5 py-3">Prix annuel</th>
                <th className="px-5 py-3">Offres actives</th>
                <th className="px-5 py-3">Crédits CVthèque / mois</th>
                <th className="px-5 py-3">Accès inclus</th>
                <th className="px-5 py-3">Quotas IA</th>
                <th className="px-5 py-3">Support</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {loading ? (
                <SkeletonTableRows columns={10} />
              ) : paliers.length === 0 ? (
                <tr><td colSpan="10"><AdminVide icon={Layers} titre="Aucun palier configuré." /></td></tr>
              ) : (
                paliers.map((p) => (
                  <tr key={p.id} className={tw.rowHover}>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${COULEUR_PALIER[p.nom] || tw.badgeNeutral}`}>{NOM_LABELS[p.nom] || p.nom}</span>
                    </td>
                    <td className={`px-5 py-3 text-sm font-semibold ${tw.textStrong} tabular-nums`}>{p.prix_mensuel_da != null ? fmtDA(p.prix_mensuel_da) : "Sur devis"}</td>
                    <td className="px-5 py-3 text-sm tabular-nums">
                      {p.prix_annuel_da != null ? fmtDA(p.prix_annuel_da) : "—"}
                      {remiseAnnuellePct(p) != null && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full ${tw.bgSuccessSoft} ${tw.textSuccess} text-[10px] font-bold`}>-{remiseAnnuellePct(p)}%</span>}
                    </td>
                    <td className="px-5 py-3 text-sm">{p.limite_offres != null ? p.limite_offres : "Illimité"}</td>
                    <td className="px-5 py-3 text-sm">{p.credits_mois != null ? p.credits_mois : "Illimité"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {CARACTERISTIQUES_PALIER.filter((c) => c.type === "booleen" && c.valeur(p)).map((c) => (
                          <span key={c.id} className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${tw.bgSuccessSoft} ${tw.textSuccess}`}>{c.label}</span>
                        ))}
                        {!CARACTERISTIQUES_PALIER.some((c) => c.type === "booleen" && c.valeur(p)) && <span className={`text-xs ${tw.textMuted}`}>Aucun</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <div className="space-y-0.5">
                        <p><span className={tw.textMuted}>Génération d'offre :</span> <span className="font-semibold">{formaterQuotaIA(p.quota_generation_offre_jour, p.quota_generation_offre_mois).texte}</span></p>
                        <p><span className={tw.textMuted}>Analyse candidature :</span> <span className="font-semibold">{formaterQuotaIA(p.quota_analyse_recruteur_jour, p.quota_analyse_recruteur_mois).texte}</span></p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs">{p.support_label || "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${p.actif ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                        {p.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button aria-label={`Modifier ${NOM_LABELS[p.nom] || p.nom}`} title="Modifier" onClick={() => handleOpenEdit(p)} className={`p-2 ${tw.iconButtonHoverPrimary} rounded-lg transition-colors ${tw.focusRing}`}><Pencil size={14} /></button>
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
          <div role="dialog" aria-modal="true" aria-label={`Modifier ${NOM_LABELS[form.nom] || form.nom}`} className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Modifier {NOM_LABELS[form.nom] || form.nom}</h3>
              <button onClick={fermerModal} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleSubmit)} className="space-y-5">
              <fieldset className="space-y-3">
                <legend className={`text-xs font-bold uppercase tracking-wider ${tw.textMuted} mb-2`}>Tarif</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="prix_mensuel_da" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Prix mensuel (DA)</label>
                    <input id="prix_mensuel_da" type="number" min="1" placeholder="Sur devis" className={inputClass} value={form.prix_mensuel_da ?? ""} onChange={(e) => setForm({ ...form, prix_mensuel_da: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="prix_annuel_da" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Prix annuel (DA)</label>
                    <input id="prix_annuel_da" type="number" min="1" className={inputClass} value={form.prix_annuel_da ?? ""} onChange={(e) => setForm({ ...form, prix_annuel_da: e.target.value })} />
                  </div>
                </div>
                {remiseCalculee !== null && (
                  <p className={`text-[11px] ${remiseCalculee < 0 ? "text-red-600 font-semibold" : tw.textMuted}`}>
                    {remiseCalculee < 0
                      ? `⚠️ Le prix annuel est plus cher que 12 mois au prix mensuel (${fmtDA(form.prix_mensuel_da * 12)}).`
                      : `Remise annuelle : ${remiseCalculee}% par rapport à 12 × le prix mensuel (${fmtDA(form.prix_mensuel_da * 12)}).`}
                  </p>
                )}
                {caseACocher("remise_annuelle_active", "Afficher la remise annuelle", "Badge « -X% » affiché sur la carte du palier en facturation annuelle.")}
              </fieldset>

              <fieldset className="space-y-3 border-t border-slate-200 pt-4">
                <legend className={`text-xs font-bold uppercase tracking-wider ${tw.textMuted} mb-2`}>Limites</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="limite_offres" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Offres actives max.</label>
                    <input id="limite_offres" type="number" min="1" placeholder="Illimité" className={inputClass} value={form.limite_offres ?? ""} onChange={(e) => setForm({ ...form, limite_offres: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="credits_mois" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Crédits CVthèque / mois</label>
                    <input id="credits_mois" type="number" min="1" placeholder="Illimité" className={inputClass} value={form.credits_mois ?? ""} onChange={(e) => setForm({ ...form, credits_mois: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3 border-t border-slate-200 pt-4">
                <legend className={`text-xs font-bold uppercase tracking-wider ${tw.textMuted} mb-2`}>Accès inclus</legend>
                {caseACocher("acces_coordonnees", "« Inviter à postuler » depuis la CVthèque", "Les coordonnées candidats, elles, se débloquent toujours avec 1 crédit (quel que soit ce réglage).")}
                {caseACocher("acces_ia_recommandes", "Candidats recommandés (IA)", "Page « Candidats recommandés » et tri CVthèque par compatibilité avec une offre.")}
                {caseACocher("acces_ia_avancee", "Recherche avancée & statistiques IA", "Filtres CVthèque langues/compétences/niveau/service militaire + répartition par score.")}
                {caseACocher("acces_equipe", "Gestion d'équipe multi-utilisateurs", "Inviter des collègues (Admin, Utilisateur, Invité) sur le compte entreprise.")}
              </fieldset>

              <fieldset className="border-t border-slate-200 pt-4">
                <legend className={`text-xs font-bold uppercase tracking-wider ${tw.textMuted} mb-2`}>Quotas IA (vide = illimité, 0 = bloqué)</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="quota_generation_offre_jour" className={`text-[11px] font-medium ${tw.textMuted} mb-1 block`}>Génération d'offre — /jour</label>
                    <input id="quota_generation_offre_jour" type="number" min="0" className={inputClass} placeholder="Illimité" value={form.quota_generation_offre_jour ?? ""} onChange={(e) => setForm({ ...form, quota_generation_offre_jour: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="quota_generation_offre_mois" className={`text-[11px] font-medium ${tw.textMuted} mb-1 block`}>Génération d'offre — /mois</label>
                    <input id="quota_generation_offre_mois" type="number" min="0" className={inputClass} placeholder="Illimité" value={form.quota_generation_offre_mois ?? ""} onChange={(e) => setForm({ ...form, quota_generation_offre_mois: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="quota_analyse_recruteur_jour" className={`text-[11px] font-medium ${tw.textMuted} mb-1 block`}>Analyse IA candidature — /jour</label>
                    <input id="quota_analyse_recruteur_jour" type="number" min="0" className={inputClass} placeholder="Illimité" value={form.quota_analyse_recruteur_jour ?? ""} onChange={(e) => setForm({ ...form, quota_analyse_recruteur_jour: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="quota_analyse_recruteur_mois" className={`text-[11px] font-medium ${tw.textMuted} mb-1 block`}>Analyse IA candidature — /mois</label>
                    <input id="quota_analyse_recruteur_mois" type="number" min="0" className={inputClass} placeholder="Illimité" value={form.quota_analyse_recruteur_mois ?? ""} onChange={(e) => setForm({ ...form, quota_analyse_recruteur_mois: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3 border-t border-slate-200 pt-4">
                <legend className={`text-xs font-bold uppercase tracking-wider ${tw.textMuted} mb-2`}>Affichage</legend>
                <div>
                  <label htmlFor="support_label" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Niveau de support (texte affiché)</label>
                  <input id="support_label" className={inputClass} value={form.support_label ?? ""} onChange={(e) => setForm({ ...form, support_label: e.target.value })} />
                </div>
                {caseACocher("actif", "Palier actif (visible et achetable)")}
              </fieldset>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fermerModal} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" disabled={submitBusy} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>Mettre à jour</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaliers;
