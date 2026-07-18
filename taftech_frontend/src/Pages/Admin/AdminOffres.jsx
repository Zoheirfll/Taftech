import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { Link } from "react-router-dom";
import DomaineLabel from "../../Components/DomaineLabel";
import {
  Search,
  Download,
  Eye,
  Pencil,
  CheckCircle,
  XCircle,
  X,
  Building2,
  Users,
} from "lucide-react";
import { tw } from "../../theme";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import SortableTh from "../../Components/SortableTh";

const getBadge = (offre) => {
  if (offre.est_cloturee)
    return (
      <span className={`px-2.5 py-1 ${tw.bgSlate800} text-white text-[10px] font-semibold rounded-full`}>
        🔒 Clôturée
      </span>
    );
  if (offre.statut_moderation === "APPROUVEE")
    return (
      <span className={`px-2.5 py-1 ${tw.scoreHigh} border text-[10px] font-semibold rounded-full`}>
        En ligne
      </span>
    );
  if (offre.statut_moderation === "REJETEE")
    return (
      <span className={`px-2.5 py-1 ${tw.scoreLow} border text-[10px] font-semibold rounded-full`}>
        Rejetée
      </span>
    );
  return (
    <span className={`px-2.5 py-1 ${tw.scoreMid} border text-[10px] font-semibold rounded-full`}>
      En attente
    </span>
  );
};

const renderScoreBadge = (cand) => {
  if (cand.est_rapide)
    return <span className={`text-[10px] ${tw.textMuted} italic`}>Rapide ⚡</span>;
  if (!cand.score_matching || parseFloat(cand.score_matching) === 0)
    return <span className={`text-[10px] ${tw.textMuted}`}>En attente</span>;
  const num = parseFloat(cand.score_matching);
  const style = num >= 70 ? tw.scoreHigh : num >= 40 ? tw.scoreMid : tw.scoreLow;
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}
    >
      {num}%
    </span>
  );
};

const AdminOffres = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingOffre, setEditingOffre] = useState(null);
  const [rejectingOffre, setRejectingOffre] = useState(null);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [motifRejet, setMotifRejet] = useState("");
  const [showTop5Only, setShowTop5Only] = useState(false);
  const [statutFiltre, setStatutFiltre] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [ordering, setOrdering] = useState("-date_publication");

  const chargerOffres = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminOffres(currentPage, searchTerm, statutFiltre, ordering);
      if (data.results) {
        setOffres(data.results);
        setTotalPages(Math.ceil(data.count / 5));
      } else setOffres(data);
      setSelectedIds([]);
    } catch (err) {
      toast.error("Erreur d'accès aux offres.");
      reportError("ECHEC_CHARGEMENT_OFFRES_ADMIN", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statutFiltre, ordering]);

  const handleSort = (field) => {
    setOrdering((prev) => (prev === field ? `-${field}` : prev === `-${field}` ? field : `-${field}`));
    setCurrentPage(1);
  };

  useEffect(() => {
    const delay = setTimeout(() => chargerOffres(), 300);
    return () => clearTimeout(delay);
  }, [chargerOffres]);

  const offresSelectionnables = offres.filter((o) => o.statut_moderation !== "APPROUVEE" && !o.est_cloturee);
  const toutSelectionne = offresSelectionnables.length > 0 && offresSelectionnables.every((o) => selectedIds.includes(o.id));

  const toggleSelectAll = () => {
    setSelectedIds(toutSelectionne ? [] : offresSelectionnables.map((o) => o.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleApprouverSelection = async () => {
    if (!window.confirm(`Approuver ${selectedIds.length} offre(s) sélectionnée(s) ?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          jobsService.moderateOffre(id, { statut_moderation: "APPROUVEE", motif_rejet: "" })
        )
      );
      toast.success(`${selectedIds.length} offre(s) approuvée(s) !`);
      chargerOffres();
    } catch (err) {
      toast.error("Erreur lors de l'approbation groupée.");
      reportError("ECHEC_APPROBATION_GROUPEE_OFFRES", err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleApprouver = async (id) => {
    if (window.confirm("Publier cette offre en ligne ?")) {
      try {
        await jobsService.moderateOffre(id, {
          statut_moderation: "APPROUVEE",
          motif_rejet: "",
        });
        chargerOffres();
        toast.success("Offre approuvée !");
      } catch (err) {
        toast.error("Erreur lors de l'approbation.");
        reportError("ECHEC_APPROBATION_OFFRE", err);
      }
    }
  };

  const handleRefuserSubmit = async () => {
    if (!motifRejet.trim()) return toast.error("Veuillez saisir un motif.");
    try {
      await jobsService.moderateOffre(rejectingOffre.id, {
        statut_moderation: "REJETEE",
        motif_rejet: motifRejet,
      });
      setRejectingOffre(null);
      setMotifRejet("");
      chargerOffres();
      toast.success("Offre rejetée.");
    } catch (err) {
      toast.error("Erreur lors du rejet.");
      reportError("ECHEC_REJET_OFFRE", err);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await jobsService.moderateOffre(editingOffre.id, {
        titre: editingOffre.titre,
        description: editingOffre.description,
      });
      setEditingOffre(null);
      chargerOffres();
      toast.success("Offre corrigée !");
    } catch (err) {
      toast.error("Erreur lors de la modification.");
      reportError("ECHEC_MODIFICATION_OFFRE", err);
    }
  };

  const handleExport = async () => {
    const toastId = toast.loading("Génération du fichier...");
    try {
      const blob = await jobsService.exportOffres();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "offres_taftech.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Téléchargement réussi !");
    } catch (err) {
      toast.error("Erreur lors de l'exportation.");
      reportError("ECHEC_EXPORT_EXCEL_OFFRES", err);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const inputClass = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;
  const modalClass = `${tw.modalOverlay} p-4`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>
            Modération des offres
          </h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Approuvez, rejetez ou corrigez les offres publiées.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2.5 ${tw.buttonSuccessSolid} text-sm font-semibold rounded-lg transition-colors shadow-sm`}
          >
            <Download size={15} /> Exporter
          </button>
          <select
            value={statutFiltre}
            onChange={(e) => { setStatutFiltre(e.target.value); setCurrentPage(1); }}
            className={`${tw.inputColorsWhite} rounded-lg text-sm px-3 py-2.5`}
          >
            <option value="">Tous statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="APPROUVEE">Approuvées</option>
            <option value="REJETEE">Rejetées</option>
            <option value="CLOTUREE">Clôturées</option>
          </select>
          <div className="relative flex-1 md:w-72">
            <Search
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`}
            />
            <input
              type="text"
              placeholder="Rechercher un poste..."
              className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsWhite} rounded-lg text-sm`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className={`flex items-center justify-between ${tw.bgPrimarySoft} border border-indigo-200 rounded-xl px-4 py-3`}>
          <p className={`text-sm font-semibold ${tw.textPrimaryStrong}`}>
            {selectedIds.length} offre(s) sélectionnée(s)
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
              className={`flex items-center gap-2 px-3 py-1.5 ${tw.buttonSuccessSolid} text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${tw.focusRing}`}
            >
              <CheckCircle size={14} /> Approuver la sélection
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
                  disabled={offresSelectionnables.length === 0}
                  className={`rounded ${tw.focusRing}`}
                  aria-label="Sélectionner toutes les offres modérables"
                />
              </th>
              <SortableTh field="titre" label="Offre & Entreprise" ordering={ordering} onSort={handleSort} className="px-5 py-3" />
              <SortableTh field="date_publication" label="Date" ordering={ordering} onSort={handleSort} className="px-5 py-3" />
              <SortableTh field="date_expiration" label="Expiration" ordering={ordering} onSort={handleSort} className="px-5 py-3" />
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase}`}>
            {loading && offres.length === 0 ? (
              <SkeletonTableRows columns={6} />
            ) : offres.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className={`py-12 text-center text-sm ${tw.textMuted} italic`}
                >
                  Aucune offre trouvée.
                </td>
              </tr>
            ) : (
              offres.map((offre) => (
                <tr
                  key={offre.id}
                  className={tw.rowHover}
                >
                  <td className="px-4 py-4">
                    {offre.statut_moderation !== "APPROUVEE" && !offre.est_cloturee && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(offre.id)}
                        onChange={() => toggleSelectOne(offre.id)}
                        className={`rounded ${tw.focusRing}`}
                        aria-label={`Sélectionner l'offre ${offre.titre}`}
                      />
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className={`text-sm font-semibold ${tw.textStrong}`}>
                      {offre.titre}
                      {offre.nombre_postes > 1 && (
                        <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-[10px] font-semibold rounded-full align-middle`}>
                          <Users size={10} /> {offre.nombre_postes} postes
                        </span>
                      )}
                    </p>
                    {offre.entreprise?.slug ? (
                      <Link
                        to={`/entreprise/${offre.entreprise.slug}`}
                        target="_blank"
                        className={`text-xs ${tw.textPrimary} hover:underline mt-0.5 inline-flex items-center gap-1`}
                      >
                        <Building2 size={11} /> {offre.entreprise?.nom_entreprise || "Inconnue"}
                      </Link>
                    ) : (
                      <p className={`text-xs ${tw.textPrimary} mt-0.5`}>
                        {offre.entreprise?.nom_entreprise || "Inconnue"}
                      </p>
                    )}
                    {(offre.wilaya || offre.commune) && (
                      <p className={`text-[10px] ${tw.textMuted} mt-0.5`}>
                        📍 {offre.wilaya}{offre.commune ? ` · ${offre.commune}` : ""}
                      </p>
                    )}
                    {offre.motif_rejet && (
                      <p className={`text-[10px] ${tw.textErrorMuted} mt-1 ${tw.bgErrorSoft} inline-block px-2 py-0.5 rounded italic`}>
                        Motif : {offre.motif_rejet}
                      </p>
                    )}
                  </td>
                  <td className={`px-5 py-4 text-xs ${tw.textMuted700} font-medium`}>
                    {new Date(offre.date_publication).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {offre.date_expiration ? (
                      (() => {
                        const jours = Math.max(0, Math.ceil((new Date(offre.date_expiration) - new Date()) / 86400000));
                        const style = jours <= 7 ? `${tw.bgErrorSoft} ${tw.textError}` : jours <= 30 ? `${tw.bgWarningSoft} ${tw.textWarning}` : jours <= 60 ? `${tw.bgTealSoft} ${tw.textTeal}` : `${tw.bgSuccessSoft} ${tw.textSuccess}`;
                        return (
                          <span className={`px-2 py-1 rounded-full font-semibold ${style}`}>
                            {jours === 0 ? "Expire aujourd'hui" : `${jours}j`}
                          </span>
                        );
                      })()
                    ) : (
                      <span className={tw.textSubtle}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">{getBadge(offre)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedOffre(offre);
                          setShowTop5Only(false);
                        }}
                        className={`p-2 ${tw.bgPrimarySoft} ${tw.textPrimary} rounded-lg ${tw.bgIndigoHover100} transition-colors ${tw.focusRing}`}
                        title="Voir"
                        aria-label="Voir l'offre"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setEditingOffre(offre)}
                        className={`p-2 ${tw.surfaceSubtle} ${tw.textMuted} rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors ${tw.focusRing}`}
                        title="Corriger"
                        aria-label="Corriger l'offre"
                      >
                        <Pencil size={14} />
                      </button>
                      {offre.statut_moderation !== "APPROUVEE" &&
                        !offre.est_cloturee && (
                          <button
                            onClick={() => handleApprouver(offre.id)}
                            className={`p-2 ${tw.bgSuccessSoft} ${tw.textSuccess} rounded-lg ${tw.hoverSuccessSoft} transition-colors ${tw.focusRing}`}
                            title="Approuver"
                            aria-label="Approuver l'offre"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                      {offre.statut_moderation !== "REJETEE" &&
                        !offre.est_cloturee && (
                          <button
                            onClick={() => setRejectingOffre(offre)}
                            className={`p-2 ${tw.bgErrorSoft} ${tw.textError} rounded-lg ${tw.hoverErrorSoft} transition-colors ${tw.focusRing}`}
                            title="Rejeter"
                            aria-label="Rejeter l'offre"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className={`px-4 py-3 border-t ${tw.borderSubtle} flex items-center justify-between ${tw.surfaceMuted}`}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || loading}
              className={`px-3 py-1.5 ${tw.surface} border ${tw.borderBase} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle} transition-colors`}
            >
              ← Précédent
            </button>
            <span className={`text-xs font-medium ${tw.textMuted}`}>
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              className={`px-3 py-1.5 ${tw.surface} border ${tw.borderBase} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle} transition-colors`}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* MODAL DÉTAILS */}
      {selectedOffre && (
        <div className={modalClass}>
          <div className={`${tw.surfaceSubtle} rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>

            {/* BANDEAU EN-TÊTE */}
            <div className={`${tw.bannerGradientPrimary} rounded-t-2xl px-6 py-6 relative`}>
              <button
                onClick={() => setSelectedOffre(null)}
                className={`absolute top-4 right-4 p-1.5 ${tw.closeButtonOnDark} rounded-lg transition-colors`}
              >
                <X size={18} />
              </button>
              <div className="pr-8">
                <div className="flex items-center gap-2 mb-1">
                  {getBadge(selectedOffre)}
                  {selectedOffre.est_cloturee && null}
                </div>
                <h2 className={`text-xl font-extrabold ${tw.textOnDark} mt-2`}>{selectedOffre.titre}</h2>
                {selectedOffre.entreprise?.slug ? (
                  <Link
                    to={`/entreprise/${selectedOffre.entreprise.slug}`}
                    target="_blank"
                    className={`${tw.textPrimaryOnDark} text-sm mt-0.5 hover:underline inline-flex items-center gap-1`}
                  >
                    <Building2 size={13} /> {selectedOffre.entreprise?.nom_entreprise}
                  </Link>
                ) : (
                  <p className={`${tw.textPrimaryOnDark} text-sm mt-0.5`}>{selectedOffre.entreprise?.nom_entreprise}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedOffre.wilaya && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${tw.badgeOnGradient} text-xs font-medium rounded-full`}>
                      📍 {selectedOffre.wilaya}{selectedOffre.commune ? ` · ${selectedOffre.commune}` : ""}
                    </span>
                  )}
                  {selectedOffre.nombre_postes > 1 && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${tw.badgeOnGradient} text-xs font-medium rounded-full`}>
                      👥 {selectedOffre.nombre_postes} postes
                    </span>
                  )}
                  {selectedOffre.type_contrat && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${tw.badgeOnGradient} text-xs font-medium rounded-full`}>
                      💼 {selectedOffre.type_contrat}
                    </span>
                  )}
                  {selectedOffre.salaire_propose && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${tw.badgeOnGradient} text-xs font-medium rounded-full`}>
                      💰 {selectedOffre.salaire_propose}
                    </span>
                  )}
                  {selectedOffre.date_expiration && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${tw.badgeOnGradient} text-xs font-medium rounded-full`}>
                      ⏱ Expire le {new Date(selectedOffre.date_expiration).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              </div>
              {/* Critères */}
              <div className={`flex flex-wrap gap-6 mt-4 pt-4 border-t ${tw.borderOnDark20}`}>
                {selectedOffre.experience_requise && (
                  <div>
                    <p className={`text-[10px] font-semibold ${tw.textPrimaryOnDark} uppercase tracking-wider`}>Expérience</p>
                    <p className={`text-sm font-semibold ${tw.textOnDark} mt-0.5`}>{selectedOffre.experience_requise}</p>
                  </div>
                )}
                {selectedOffre.diplome && (
                  <div>
                    <p className={`text-[10px] font-semibold ${tw.textPrimaryOnDark} uppercase tracking-wider`}>Diplôme</p>
                    <p className={`text-sm font-semibold ${tw.textOnDark} mt-0.5`}>{selectedOffre.diplome}</p>
                  </div>
                )}
                {selectedOffre.specialite && (
                  <div>
                    <p className={`text-[10px] font-semibold ${tw.textPrimaryOnDark} uppercase tracking-wider`}>Spécialité</p>
                    <p className={`text-sm font-semibold ${tw.textAmberOnDark} mt-0.5`}><DomaineLabel code={selectedOffre.specialite} /></p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* ACTIONS MODÉRATION */}
              {!selectedOffre.est_cloturee && (
                <div className={`${tw.card} p-4`}>
                  <p className={`text-xs font-bold ${tw.textMuted700} uppercase tracking-wider mb-3`}>Décision de modération</p>
                  {selectedOffre.statut_moderation === "EN_ATTENTE" ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => { handleApprouver(selectedOffre.id); setSelectedOffre(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 ${tw.buttonSuccessSolid} text-sm font-semibold rounded-lg transition-colors`}
                      >
                        <CheckCircle size={15} /> Approuver
                      </button>
                      <button
                        onClick={() => { setRejectingOffre(selectedOffre); setSelectedOffre(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 ${tw.buttonDangerSolid} text-sm font-semibold rounded-lg transition-colors`}
                      >
                        <XCircle size={15} /> Rejeter
                      </button>
                    </div>
                  ) : selectedOffre.statut_moderation === "APPROUVEE" ? (
                    <div className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgSuccessSoft} border ${tw.borderSuccess} rounded-lg`}>
                      <CheckCircle size={15} className={tw.textSuccessIcon} />
                      <span className={`text-sm font-medium ${tw.textSuccess}`}>Offre approuvée et en ligne</span>
                      <button onClick={() => { setRejectingOffre(selectedOffre); setSelectedOffre(null); }} className={`ml-auto text-xs ${tw.textError} hover:underline font-medium`}>Retirer</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgErrorSoft} border ${tw.borderError} rounded-lg`}>
                        <XCircle size={15} className={tw.textError} />
                        <span className={`text-sm font-medium ${tw.textErrorStrong}`}>Offre rejetée</span>
                        {selectedOffre.motif_rejet && <span className={`text-xs ${tw.textErrorMuted} ml-1`}>— {selectedOffre.motif_rejet}</span>}
                      </div>
                      <button onClick={() => { handleApprouver(selectedOffre.id); setSelectedOffre(null); }} className={`w-full py-2 ${tw.buttonSuccessSolid} text-sm font-semibold rounded-lg transition-colors`}>
                        Approuver quand même
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CONTENU */}
              {selectedOffre.description && (
                <div className={`${tw.card} p-5`}>
                  <h3 className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                    <span className={`w-2 h-4 ${tw.bgPrimary} rounded-full`} /> Description du poste
                  </h3>
                  <p className={`text-sm ${tw.textMuted700} leading-relaxed whitespace-pre-line`}>{selectedOffre.description}</p>
                </div>
              )}
              {selectedOffre.missions && (
                <div className={`${tw.card} p-5`}>
                  <h3 className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                    <span className={`w-2 h-4 ${tw.dotAmber500} rounded-full`} /> Missions principales
                  </h3>
                  <p className={`text-sm ${tw.textMuted700} leading-relaxed whitespace-pre-line`}>{selectedOffre.missions}</p>
                </div>
              )}
              {selectedOffre.profil_recherche && (
                <div className={`${tw.card} p-5`}>
                  <h3 className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                    <span className={`w-2 h-4 ${tw.dotEmerald500} rounded-full`} /> Profil recherché
                  </h3>
                  <p className={`text-sm ${tw.textMuted700} leading-relaxed whitespace-pre-line`}>{selectedOffre.profil_recherche}</p>
                </div>
              )}

              {/* QUESTIONNAIRE */}
              {selectedOffre.questionnaire && (
                <div className={`${tw.card} p-5`}>
                  <h3 className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                    <span className={`w-2 h-4 ${tw.dotAmber400} rounded-full`} /> Questionnaire — {selectedOffre.questionnaire.titre}
                  </h3>
                  <div className="space-y-2">
                    {selectedOffre.questionnaire.questions?.map((q, i) => (
                      <div key={q.id} className={`${tw.bgWarningSoft} border ${tw.borderWarningLight} rounded-lg px-4 py-2.5 flex items-start gap-2`}>
                        <span className={`text-xs font-bold ${tw.textWarningStrong2} shrink-0 mt-0.5`}>{i + 1}.</span>
                        <div>
                          <p className={`text-sm ${tw.textSlate800}`}>{q.texte}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-[10px] ${tw.textMuted700} font-medium`}>{q.type_question}</span>
                            {q.requis && <span className={`text-[10px] ${tw.textErrorMuted} font-medium`}>Obligatoire</span>}
                            {q.disqualifiant && <span className={`text-[10px] ${tw.textOrangeStrong} font-medium`}>⚠ Disqualifiant</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CANDIDATURES */}
              <div className={`${tw.card} p-5`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`text-xs font-bold ${tw.textMuted} uppercase tracking-wider flex items-center gap-2`}>
                    <span className={`w-2 h-4 ${tw.dotViolet500} rounded-full`} /> Candidatures ({selectedOffre.candidatures?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowTop5Only(!showTop5Only)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${showTop5Only ? tw.chipVioletActive : tw.chipVioletInactive}`}
                  >
                    {showTop5Only ? "Voir tout" : "🤖 Top 5 IA"}
                  </button>
                </div>
                {selectedOffre.candidatures?.length > 0 ? (
                  <div className={`overflow-x-auto border ${tw.borderSubtle} rounded-xl`}>
                    <table className="w-full text-xs text-left">
                      <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
                        <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                          <th className="px-3 py-2.5">Nom</th>
                          <th className="px-3 py-2.5 text-center">Score IA</th>
                          <th className="px-3 py-2.5 text-center">Note</th>
                          <th className="px-3 py-2.5 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${tw.divideSubtle}`}>
                        {(() => {
                          let list = [...selectedOffre.candidatures].sort((a, b) => (b.score_matching || 0) - (a.score_matching || 0));
                          if (showTop5Only) list = list.filter((c) => !c.est_rapide && c.score_matching !== null).slice(0, 5);
                          if (list.length === 0)
                            return (
                              <tr>
                                <td colSpan="4" className={`py-6 text-center ${tw.textMuted700} italic`}>Aucun candidat.</td>
                              </tr>
                            );
                          return list.map((cand) => (
                            <tr key={cand.id} className={tw.rowHover}>
                              <td className={`px-3 py-2.5 font-medium ${tw.textSlate800}`}>
                                {cand.est_rapide ? `${cand.nom_rapide} ${cand.prenom_rapide}` : `${cand.candidat?.last_name || ""} ${cand.candidat?.first_name || ""}`}
                              </td>
                              <td className="px-3 py-2.5 text-center">{renderScoreBadge(cand)}</td>
                              <td className={`px-3 py-2.5 text-center ${tw.textVioletStrong2} font-medium`}>
                                {cand.note_globale ? `${cand.note_globale}/20` : <span className={tw.textSubtle}>—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <span className={`text-[10px] font-medium ${tw.candStatutColors[cand.statut] || tw.candStatutColors.DEFAULT}`}>
                                  {cand.statut.replace("_", " ")}
                                </span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={`text-xs italic ${tw.textMuted700} text-center py-4`}>Aucun candidat n'a postulé.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÉDITION */}
      {editingOffre && (
        <div className={modalClass}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-xl w-full shadow-2xl`}>
            <h2 className={`text-lg font-bold ${tw.textStrong} mb-5`}>
              Corriger l'offre
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
                  Titre
                </label>
                <input
                  type="text"
                  value={editingOffre.titre}
                  className={inputClass}
                  onChange={(e) =>
                    setEditingOffre({ ...editingOffre, titre: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
                  Description
                </label>
                <textarea
                  rows="5"
                  value={editingOffre.description}
                  className={inputClass + " resize-none"}
                  onChange={(e) =>
                    setEditingOffre({
                      ...editingOffre,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOffre(null)}
                  className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REJET */}
      {rejectingOffre && (
        <div className={modalClass}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-md w-full shadow-2xl`}>
            <h2 className={`text-lg font-bold ${tw.textError} mb-1`}>
              Rejeter l'offre
            </h2>
            <p className={`text-xs ${tw.textMuted700} mb-4`}>
              Précisez le motif pour le recruteur
            </p>
            <textarea
              rows="4"
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              placeholder="Ex: Le titre n'est pas clair ou le salaire est manquant..."
              className={inputClass + " resize-none mb-4"}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectingOffre(null)}
                className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}
              >
                Annuler
              </button>
              <button
                onClick={handleRefuserSubmit}
                className={`flex-1 py-2.5 ${tw.buttonDangerSolid} text-sm font-semibold rounded-lg transition-colors`}
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOffres;
