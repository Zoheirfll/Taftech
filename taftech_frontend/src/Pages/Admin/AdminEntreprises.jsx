import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { Search, Download, X, Building2 } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import SortableTh from "../../Components/SortableTh";
import { mediaUrl } from "../../utils/mediaUrl";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminVide } from "../../Components/AdminEtat";
import AdminPagination from "../../Components/AdminPagination";
import { ADMIN_PAGE_SIZE } from "../../Services/adminService";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const AdminEntreprises = () => {
  const [entreprises, setEntreprises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [ordering, setOrdering] = useState("-id");

  const chargerEntreprises = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminEntreprises(currentPage, searchTerm, ordering);
      setEntreprises(data.results || []);
      setTotalPages(Math.ceil((data.count || 0) / ADMIN_PAGE_SIZE) || 1);
      setTotalCount(data.count || 0);
      setSelectedIds([]);
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur de chargement."));
      reportError("ECHEC_CHARGEMENT_ENTREPRISES_ADMIN", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, ordering]);

  const handleSort = (field) => {
    setOrdering((prev) => (prev === field ? `-${field}` : prev === `-${field}` ? field : `-${field}`));
    setCurrentPage(1);
  };

  useEffect(() => {
    const delay = setTimeout(() => chargerEntreprises(), 300);
    return () => clearTimeout(delay);
  }, [chargerEntreprises]);

  const entreprisesSelectionnables = entreprises.filter((e) => !e.est_approuvee);
  const toutSelectionne = entreprisesSelectionnables.length > 0 && entreprisesSelectionnables.every((e) => selectedIds.includes(e.id));

  const toggleSelectAll = () => {
    setSelectedIds(toutSelectionne ? [] : entreprisesSelectionnables.map((e) => e.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleApprouverSelection = () => {
    confirmToast(`Approuver ${selectedIds.length} entreprise(s) sélectionnée(s) ?`, async () => {
      setBulkLoading(true);
      // allSettled : une entreprise en échec ne doit pas masquer celles réellement approuvées
      // (Promise.all affichait "Erreur" alors qu'une partie était déjà passée).
      const resultats = await Promise.allSettled(
        selectedIds.map((id) => jobsService.moderateEntreprise(id, { est_approuvee: true })),
      );
      const echecs = resultats.filter((r) => r.status === "rejected");
      const reussites = resultats.length - echecs.length;
      if (reussites > 0) toast.success(`${reussites} entreprise(s) approuvée(s) !`);
      if (echecs.length > 0) {
        toast.error(apiErrMsg(echecs[0].reason, `${echecs.length} approbation(s) en échec.`));
        reportError("ECHEC_APPROBATION_GROUPEE_ENTREPRISES", echecs[0].reason);
      }
      setBulkLoading(false);
      chargerEntreprises();
    });
  };

  const handleToggleMiseEnAvant = async (id, statutActuel) => {
    try {
      await jobsService.moderateEntreprise(id, { mise_en_avant_accueil: !statutActuel });
      chargerEntreprises();
      toast.success(statutActuel ? "Retirée des clients mis en avant." : "Ajoutée aux clients mis en avant !");
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la modification."));
      reportError("ECHEC_TOGGLE_MISE_EN_AVANT", err);
    }
  };

  const fermerFiche = useCallback(() => setSelectedEntreprise(null), []);
  useEchapPourFermer(!!selectedEntreprise, fermerFiche);

  const handleToggleApprobation = (id, statutActuel) => {
    confirmToast(`Voulez-vous vraiment ${statutActuel ? "suspendre" : "approuver"} cette entreprise ?`, async () => {
      try {
        await jobsService.moderateEntreprise(id, { est_approuvee: !statutActuel });
        chargerEntreprises();
        setSelectedEntreprise((sel) => (sel && sel.id === id ? { ...sel, est_approuvee: !statutActuel } : sel));
        toast.success(statutActuel ? "Entreprise suspendue." : "Entreprise approuvée — le recruteur est prévenu par email.");
      } catch (err) {
        toast.error(apiErrMsg(err, "Erreur lors de la modification."));
        reportError("ECHEC_MODERATION_ENTREPRISE", err);
      }
    });
  };

  const handleExport = async () => {
    const toastId = toast.loading("Génération du fichier...");
    try {
      const blob = await jobsService.exportEntreprises();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "entreprises_taftech.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Téléchargement réussi !");
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de l'exportation."));
      reportError("ECHEC_EXPORT_EXCEL_ENTREPRISES", err);
    } finally {
      toast.dismiss(toastId);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Building2}
        color="amber"
        title="Validation des entreprises"
        subtitle="Approuvez, suspendez ou mettez en avant les entreprises inscrites."
        aideKey="entreprises"
        aide={[
          "Une entreprise « En attente » ne peut ni publier d'offre, ni accéder à la CVthèque, ni souscrire un abonnement tant qu'elle n'est pas approuvée.",
          "Approuver envoie automatiquement un email au recruteur. Cochez plusieurs entreprises en attente pour les approuver en une fois.",
          "« Bloquer » suspend une entreprise déjà validée ; ses offres ne sont pas supprimées.",
          "« Mettre en avant » affiche le logo dans « Ils nous font confiance » sur la page Abonnements recruteur.",
          "« Voir » ouvre la fiche complète (légal, contact, présentation, photos). Échap ou un clic à l'extérieur la ferme.",
        ]}
        actions={
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 ${tw.buttonSuccessSolid} text-sm font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}
          >
            <Download size={15} /> Exporter Excel
          </button>
        }
      />
      <div className="flex">
          <div className="relative w-full md:w-80">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
            <input
              type="text"
              placeholder="Rechercher par nom ou RC..."
              className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsWhite} rounded-lg text-sm`}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              aria-label="Rechercher une entreprise"
            />
          </div>
      </div>

      {selectedIds.length > 0 && (
        <div className={`flex items-center justify-between ${tw.bgPrimarySoft} border border-indigo-200 rounded-xl px-4 py-3`}>
          <p className={`text-sm font-semibold ${tw.textPrimaryStrong}`}>
            {selectedIds.length} entreprise(s) sélectionnée(s)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${tw.surface} ${tw.textMuted} ${tw.hoverSurfaceSubtleStrong} transition-colors ${tw.focusRing}`}
            >
              Annuler
            </button>
            <button
              onClick={handleApprouverSelection}
              disabled={bulkLoading}
              className={`px-3 py-1.5 ${tw.buttonSuccessSolid} text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${tw.focusRing}`}
            >
              Approuver la sélection
            </button>
          </div>
        </div>
      )}

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
            <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={toutSelectionne}
                  onChange={toggleSelectAll}
                  disabled={entreprisesSelectionnables.length === 0}
                  className={`rounded ${tw.focusRing}`}
                  aria-label="Sélectionner toutes les entreprises en attente"
                />
              </th>
              <SortableTh field="nom_entreprise" label="Entreprise" ordering={ordering} onSort={handleSort} className="px-5 py-3" />
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3">Abonnement</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase}`}>
            {loading && entreprises.length === 0 ? (
              <SkeletonTableRows columns={6} />
            ) : entreprises.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <AdminVide
                    icon={Building2}
                    titre={searchTerm ? "Aucune entreprise ne correspond à cette recherche" : "Aucune entreprise inscrite"}
                    texte={searchTerm ? "Vérifiez l'orthographe ou cherchez par numéro de registre de commerce." : undefined}
                  />
                </td>
              </tr>
            ) : (
              entreprises.map((ent) => (
                <tr key={ent.id} className={tw.rowHover}>
                  <td className="px-4 py-4">
                    {!ent.est_approuvee && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ent.id)}
                        onChange={() => toggleSelectOne(ent.id)}
                        className={`rounded ${tw.focusRing}`}
                        aria-label={`Sélectionner ${ent.nom_entreprise}`}
                      />
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className={`text-sm font-semibold ${tw.textStrong}`}>{ent.nom_entreprise}</p>
                    <p className={`text-xs ${tw.textMuted} mt-0.5`}>{ent.secteur_activite_libelle || ent.secteur_activite}</p>
                    <p className={`text-xs font-mono ${tw.textMuted} mt-0.5`}>RC: {ent.registre_commerce}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className={`text-sm font-medium ${tw.textSlate800}`}>{ent.last_name} {ent.first_name}</p>
                    <p className={`text-xs ${tw.textPrimary} mt-0.5`}>{ent.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    {ent.est_approuvee ? (
                      <span className={`px-2.5 py-1 ${tw.scoreHigh} border text-[10px] font-semibold rounded-full`}>✓ Vérifiée</span>
                    ) : (
                      <span className={`px-2.5 py-1 ${tw.bgWarningSoft} ${tw.textWarning} border ${tw.borderWarning} text-[10px] font-semibold rounded-full`}>⏳ En attente</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {ent.palier_actif ? (
                      <span className={`px-2.5 py-1 ${tw.bgWarningSoft} ${tw.textWarning} border ${tw.borderWarning} text-[10px] font-semibold rounded-full`}>⭐ {ent.palier_actif}</span>
                    ) : (
                      <span className={`px-2.5 py-1 ${tw.surfaceMuted} ${tw.textMuted} border ${tw.borderBase} text-[10px] font-semibold rounded-full`}>Gratuit</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                   <div className="flex items-center justify-end gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedEntreprise(ent)}
                      className={`px-3 py-1.5 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-semibold rounded-lg ${tw.bgIndigoHover100} transition-colors ${tw.focusRing}`}
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleToggleApprobation(ent.id, ent.est_approuvee)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tw.focusRing} ${ent.est_approuvee ? tw.dangerPillSoft : tw.buttonSuccessSolid}`}
                    >
                      {ent.est_approuvee ? "Bloquer" : "Approuver"}
                    </button>
                    {ent.est_approuvee && (
                      <button
                        onClick={() => handleToggleMiseEnAvant(ent.id, ent.mise_en_avant_accueil)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tw.focusRing} ${ent.mise_en_avant_accueil ? tw.pillAmberSoft : tw.bgPrimarySoft}`}
                        title='Afficher/retirer dans "Ils nous font confiance" (page Abonnements)'
                      >
                        {ent.mise_en_avant_accueil ? "Client mis en avant ✓" : "Mettre en avant"}
                      </button>
                    )}
                   </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <AdminPagination page={currentPage} totalPages={totalPages} totalCount={totalCount} onChange={setCurrentPage} disabled={loading} />
      </div>

      {selectedEntreprise && (
        <div className={tw.modalOverlay + " p-4"} onClick={(e) => e.target === e.currentTarget && fermerFiche()}>
          <div role="dialog" aria-modal="true" aria-label={`Fiche ${selectedEntreprise.nom_entreprise}`} className={`${tw.surface} rounded-2xl p-7 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {selectedEntreprise.banniere && (
              <img src={mediaUrl(selectedEntreprise.banniere)} alt="Bannière" className="w-full h-32 object-cover rounded-xl mb-4" />
            )}
            <div className={`flex justify-between items-start mb-5 pb-4 border-b ${tw.borderSubtle}`}>
              <div className="flex items-center gap-3">
                {selectedEntreprise.logo && (
                  <img src={mediaUrl(selectedEntreprise.logo)} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-slate-200 shrink-0" />
                )}
                <div>
                  <h2 className={`text-lg font-bold ${tw.textStrong}`}>{selectedEntreprise.nom_entreprise}</h2>
                  <p className={`text-sm ${tw.textPrimary} mt-0.5`}>
                    📍 {selectedEntreprise.wilaya_siege}
                    {selectedEntreprise.commune_siege ? ` · ${selectedEntreprise.commune_siege}` : ""}
                  </p>
                  {selectedEntreprise.adresse_complete && (
                    <p className={`text-xs ${tw.textMuted700} mt-0.5`}>{selectedEntreprise.adresse_complete}</p>
                  )}
                </div>
              </div>
              <button
                onClick={fermerFiche}
                aria-label="Fermer la fiche"
                className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className={`${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle}`}>
                <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wider mb-2`}>Informations légales</p>
                <p className={`text-xs font-mono ${tw.textSlate800} ${tw.surface} border ${tw.borderBase} px-2 py-1.5 rounded`}>
                  RC: {selectedEntreprise.registre_commerce}
                </p>
                <p className={`text-xs font-medium ${tw.textMuted} mt-2`}>{selectedEntreprise.secteur_activite_libelle || selectedEntreprise.secteur_activite}</p>
                {selectedEntreprise.taille_entreprise && (
                  <p className={`text-xs ${tw.textMuted700} mt-1`}>Taille : {selectedEntreprise.taille_entreprise}</p>
                )}
                {selectedEntreprise.annee_creation && (
                  <p className={`text-xs ${tw.textMuted700} mt-1`}>Créée en {selectedEntreprise.annee_creation}</p>
                )}
              </div>
              <div className={`${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle}`}>
                <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wider mb-2`}>Contact recruteur</p>
                <p className={`text-sm font-semibold ${tw.textStrong}`}>{selectedEntreprise.last_name} {selectedEntreprise.first_name}</p>
                <p className={`text-xs ${tw.textPrimary} mt-1`}>{selectedEntreprise.email}</p>
                <p className={`text-xs ${tw.textMuted700} mt-1`}>{selectedEntreprise.telephone}</p>
                {(selectedEntreprise.site_web || selectedEntreprise.linkedin) && (
                  <div className="flex flex-col gap-1 mt-2">
                    {selectedEntreprise.site_web && (
                      <a href={selectedEntreprise.site_web} target="_blank" rel="noopener noreferrer" className={`text-xs ${tw.textPrimary} hover:underline`}>🔗 Site web</a>
                    )}
                    {selectedEntreprise.linkedin && (
                      <a href={selectedEntreprise.linkedin} target="_blank" rel="noopener noreferrer" className={`text-xs ${tw.textPrimary} hover:underline`}>🔗 LinkedIn</a>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wider mb-2`}>Présentation</p>
              <p className={`text-sm ${tw.textMuted} ${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle} leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line`}>
                {selectedEntreprise.description || "Aucune présentation fournie."}
              </p>
            </div>
            {selectedEntreprise.culture_entreprise && (
              <div className="mt-4">
                <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wider mb-2`}>Culture d'entreprise</p>
                <p className={`text-sm ${tw.textMuted} ${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle} leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line`}>
                  {selectedEntreprise.culture_entreprise}
                </p>
              </div>
            )}
            {selectedEntreprise.photos?.length > 0 && (
              <div className="mt-4">
                <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wider mb-2`}>Photos ({selectedEntreprise.photos.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedEntreprise.photos.map((p) => (
                    <img key={p.id} src={mediaUrl(p.image)} alt={p.legende || "Photo entreprise"} className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                  ))}
                </div>
              </div>
            )}
            <div className={`flex flex-wrap justify-end gap-2 mt-6 pt-4 border-t ${tw.borderSubtle}`}>
              {selectedEntreprise.slug && selectedEntreprise.est_approuvee && (
                <a
                  href={`/entreprise/${selectedEntreprise.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 text-sm font-semibold rounded-lg ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} ${tw.focusRing}`}
                >
                  Voir la page publique
                </a>
              )}
              <button
                onClick={() => handleToggleApprobation(selectedEntreprise.id, selectedEntreprise.est_approuvee)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tw.focusRing} ${selectedEntreprise.est_approuvee ? tw.dangerPillSoft : tw.buttonSuccessSolid}`}
              >
                {selectedEntreprise.est_approuvee ? "Bloquer l'entreprise" : "Approuver l'entreprise"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEntreprises;
