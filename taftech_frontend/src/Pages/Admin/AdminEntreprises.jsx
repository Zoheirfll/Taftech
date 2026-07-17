import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { Search, Download, X } from "lucide-react";
import { tw } from "../../theme";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import SortableTh from "../../Components/SortableTh";

const AdminEntreprises = () => {
  const [entreprises, setEntreprises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [ordering, setOrdering] = useState("-id");

  const chargerEntreprises = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminEntreprises(currentPage, searchTerm, ordering);
      setEntreprises(data.results || []);
      setTotalPages(Math.ceil(data.count / 5) || 1);
      setSelectedIds([]);
    } catch (err) {
      toast.error("Erreur de chargement.");
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

  const handleApprouverSelection = async () => {
    if (!window.confirm(`Approuver ${selectedIds.length} entreprise(s) sélectionnée(s) ?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => jobsService.moderateEntreprise(id, { est_approuvee: true })));
      toast.success(`${selectedIds.length} entreprise(s) approuvée(s) !`);
      chargerEntreprises();
    } catch (err) {
      toast.error("Erreur lors de l'approbation groupée.");
      reportError("ECHEC_APPROBATION_GROUPEE_ENTREPRISES", err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleTogglePremium = async (id, statutActuel) => {
    try {
      await jobsService.moderateEntreprise(id, { est_premium: !statutActuel });
      chargerEntreprises();
      toast.success(statutActuel ? "Premium retiré." : "Compte Premium activé !");
    } catch (err) {
      toast.error("Erreur lors de la modification.");
      reportError("ECHEC_TOGGLE_PREMIUM", err);
    }
  };

  const handleToggleApprobation = async (id, statutActuel) => {
    if (window.confirm(`Voulez-vous vraiment ${statutActuel ? "suspendre" : "approuver"} cette entreprise ?`)) {
      try {
        await jobsService.moderateEntreprise(id, { est_approuvee: !statutActuel });
        chargerEntreprises();
        toast.success("Statut mis à jour !");
      } catch (err) {
        toast.error("Erreur lors de la modification.");
        reportError("ECHEC_MODERATION_ENTREPRISE", err);
      }
    }
  };

  const handleExport = async () => {
    const toastId = toast.loading("Génération du fichier...");
    try {
      const blob = await jobsService.exportEntreprises();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "entreprises_taftech.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Téléchargement réussi !");
    } catch (err) {
      toast.error("Erreur lors de l'exportation.");
      reportError("ECHEC_EXPORT_EXCEL_ENTREPRISES", err);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const Pagination = () =>
    totalPages > 1 ? (
      <div className={`flex items-center justify-between px-4 py-3 ${tw.surfaceMuted} border-t ${tw.borderSubtle}`}>
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1 || loading}
          className={`px-3 py-1.5 ${tw.surface} border ${tw.borderBase} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle} transition-colors`}
        >
          ← Précédent
        </button>
        <span className={`text-xs font-medium ${tw.textMuted}`}>Page {currentPage} / {totalPages}</span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || loading}
          className={`px-3 py-1.5 ${tw.surface} border ${tw.borderBase} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle} transition-colors`}
        >
          Suivant →
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>Validation des entreprises</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Approuvez ou suspendez les entreprises inscrites. Les paiements Premium sont gérés automatiquement via Chargily Pay — consultez le journal d'audit.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2.5 ${tw.buttonSuccessSolid} text-sm font-semibold rounded-lg transition-colors shadow-sm`}
          >
            <Download size={15} /> Exporter
          </button>
          <div className="relative flex-1 md:w-72">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
            <input
              type="text"
              placeholder="Rechercher par nom ou RC..."
              className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsWhite} rounded-lg text-sm`}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
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
        <table className="w-full text-left">
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
              <th className="px-5 py-3">Premium</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase}`}>
            {loading && entreprises.length === 0 ? (
              <SkeletonTableRows columns={6} />
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
                    <p className={`text-xs ${tw.textMuted} mt-0.5`}>{ent.secteur_activite}</p>
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
                    {ent.est_premium ? (
                      <span className={`px-2.5 py-1 ${tw.bgWarningSoft} ${tw.textWarning} border ${tw.borderWarning} text-[10px] font-semibold rounded-full`}>⭐ Premium</span>
                    ) : (
                      <span className={`px-2.5 py-1 ${tw.surfaceMuted} ${tw.textMuted} border ${tw.borderBase} text-[10px] font-semibold rounded-full`}>Standard</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
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
                    {/* Bouton premium : permet à l'admin de retirer le premium si besoin (ex: fraude) */}
                    {ent.est_premium && (
                      <button
                        onClick={() => handleTogglePremium(ent.id, ent.est_premium)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tw.focusRing} ${tw.pillAmberSoft}`}
                      >
                        ⭐ Retirer
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination />
      </div>

      {selectedEntreprise && (
        <div className={tw.modalOverlay + " p-4"}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-xl w-full shadow-2xl`}>
            <div className={`flex justify-between items-start mb-5 pb-4 border-b ${tw.borderSubtle}`}>
              <div>
                <h2 className={`text-lg font-bold ${tw.textStrong}`}>{selectedEntreprise.nom_entreprise}</h2>
                <p className={`text-sm ${tw.textPrimary} mt-0.5`}>
                  📍 {selectedEntreprise.wilaya_siege}
                  {selectedEntreprise.commune_siege ? ` · ${selectedEntreprise.commune_siege}` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedEntreprise(null)}
                className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}
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
                <p className={`text-xs font-medium ${tw.textMuted} mt-2`}>{selectedEntreprise.secteur_activite}</p>
              </div>
              <div className={`${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle}`}>
                <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wider mb-2`}>Contact recruteur</p>
                <p className={`text-sm font-semibold ${tw.textStrong}`}>{selectedEntreprise.last_name} {selectedEntreprise.first_name}</p>
                <p className={`text-xs ${tw.textPrimary} mt-1`}>{selectedEntreprise.email}</p>
                <p className={`text-xs ${tw.textMuted700} mt-1`}>{selectedEntreprise.telephone}</p>
              </div>
            </div>
            <div>
              <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wider mb-2`}>Présentation</p>
              <p className={`text-sm ${tw.textMuted} ${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle} leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line`}>
                {selectedEntreprise.description || "Aucune présentation fournie."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEntreprises;
