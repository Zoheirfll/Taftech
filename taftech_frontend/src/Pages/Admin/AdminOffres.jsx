import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import {
  Search,
  Download,
  Eye,
  Pencil,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";

const getBadge = (offre) => {
  if (offre.est_cloturee)
    return (
      <span className="px-2.5 py-1 bg-slate-800 text-white text-[10px] font-semibold rounded-full">
        🔒 Clôturée
      </span>
    );
  if (offre.statut_moderation === "APPROUVEE")
    return (
      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-full">
        En ligne
      </span>
    );
  if (offre.statut_moderation === "REJETEE")
    return (
      <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold rounded-full">
        Rejetée
      </span>
    );
  return (
    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold rounded-full">
      En attente
    </span>
  );
};

const renderScoreBadge = (cand) => {
  if (cand.est_rapide)
    return <span className="text-[10px] text-slate-400 italic">Rapide ⚡</span>;
  if (!cand.score_matching || parseFloat(cand.score_matching) === 0)
    return <span className="text-[10px] text-slate-400">En attente</span>;
  const num = parseFloat(cand.score_matching);
  const style =
    num >= 70
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : num >= 40
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
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

  const chargerOffres = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminOffres(currentPage, searchTerm);
      if (data.results) {
        setOffres(data.results);
        setTotalPages(Math.ceil(data.count / 5));
      } else setOffres(data);
    } catch (err) {
      toast.error("Erreur d'accès aux offres.");
      reportError("ECHEC_CHARGEMENT_OFFRES_ADMIN", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const delay = setTimeout(() => chargerOffres(), 300);
    return () => clearTimeout(delay);
  }, [chargerOffres]);

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

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500";
  const modalClass =
    "fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4";

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Modération des offres
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Approuvez, rejetez ou corrigez les offres publiées.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download size={15} /> Exporter
          </button>
          <div className="relative flex-1 md:w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Rechercher un poste..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              <th className="px-5 py-3">Offre & Entreprise</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && offres.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="py-12 text-center text-sm text-indigo-600 animate-pulse font-medium"
                >
                  Chargement...
                </td>
              </tr>
            ) : offres.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="py-12 text-center text-sm text-slate-400 italic"
                >
                  Aucune offre trouvée.
                </td>
              </tr>
            ) : (
              offres.map((offre) => (
                <tr
                  key={offre.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {offre.titre}
                    </p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      {offre.entreprise?.nom_entreprise || "Inconnue"}
                    </p>
                    {offre.motif_rejet && (
                      <p className="text-[10px] text-red-500 mt-1 bg-red-50 inline-block px-2 py-0.5 rounded italic">
                        Motif : {offre.motif_rejet}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500 font-medium">
                    {new Date(offre.date_publication).toLocaleDateString(
                      "fr-FR",
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
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        title="Voir"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setEditingOffre(offre)}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Corriger"
                      >
                        <Pencil size={14} />
                      </button>
                      {offre.statut_moderation !== "APPROUVEE" &&
                        !offre.est_cloturee && (
                          <button
                            onClick={() => handleApprouver(offre.id)}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                            title="Approuver"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                      {offre.statut_moderation !== "REJETEE" &&
                        !offre.est_cloturee && (
                          <button
                            onClick={() => setRejectingOffre(offre)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Rejeter"
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
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              ← Précédent
            </button>
            <span className="text-xs font-medium text-slate-600">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* MODAL DÉTAILS */}
      {selectedOffre && (
        <div className={modalClass}>
          <div className="bg-white rounded-2xl p-7 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedOffre.titre}
                </h2>
                <p className="text-sm text-indigo-600 mt-0.5">
                  {selectedOffre.entreprise?.nom_entreprise} ·{" "}
                  {selectedOffre.wilaya}
                </p>
              </div>
              <button
                onClick={() => setSelectedOffre(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Contrat", value: selectedOffre.type_contrat },
                {
                  label: "Expérience",
                  value: selectedOffre.experience_requise,
                },
                {
                  label: "Salaire",
                  value: selectedOffre.salaire_propose || "N/P",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center"
                >
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-4 mb-5">
              {[
                {
                  label: "Diplôme / Spécialité",
                  value: `${selectedOffre.diplome} - ${selectedOffre.specialite}`,
                  bg: "bg-slate-50",
                },
                {
                  label: "Description",
                  value: selectedOffre.description,
                  bg: "bg-slate-50",
                },
                {
                  label: "Missions",
                  value: selectedOffre.missions,
                  bg: "bg-indigo-50",
                },
              ].map(
                ({ label, value, bg }) =>
                  value && (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        {label}
                      </p>
                      <p
                        className={`text-sm ${bg} p-4 rounded-lg border border-slate-100 text-slate-600 whitespace-pre-line leading-relaxed`}
                      >
                        {value}
                      </p>
                    </div>
                  ),
              )}
            </div>

            <div className="border-t border-slate-200 pt-5">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-slate-900">
                  Candidatures ({selectedOffre.candidatures?.length || 0})
                </p>
                <button
                  onClick={() => setShowTop5Only(!showTop5Only)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${showTop5Only ? "bg-violet-600 text-white border-violet-600" : "bg-white text-violet-700 border-violet-200 hover:bg-violet-50"}`}
                >
                  {showTop5Only ? "Voir tout" : "🤖 Top 5 IA"}
                </button>
              </div>
              {selectedOffre.candidatures?.length > 0 ? (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="px-3 py-2.5">Nom</th>
                        <th className="px-3 py-2.5 text-center">Score IA</th>
                        <th className="px-3 py-2.5 text-center">Note</th>
                        <th className="px-3 py-2.5 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(() => {
                        let list = [...selectedOffre.candidatures].sort(
                          (a, b) =>
                            (b.score_matching || 0) - (a.score_matching || 0),
                        );
                        if (showTop5Only)
                          list = list
                            .filter(
                              (c) => !c.est_rapide && c.score_matching !== null,
                            )
                            .slice(0, 5);
                        if (list.length === 0)
                          return (
                            <tr>
                              <td
                                colSpan="4"
                                className="py-6 text-center text-slate-400 italic"
                              >
                                Aucun candidat.
                              </td>
                            </tr>
                          );
                        return list.map((cand) => (
                          <tr
                            key={cand.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {cand.est_rapide
                                ? `${cand.nom_rapide} ${cand.prenom_rapide}`
                                : `${cand.candidat?.last_name || ""} ${cand.candidat?.first_name || ""}`}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {renderScoreBadge(cand)}
                            </td>
                            <td className="px-3 py-2.5 text-center text-violet-600 font-medium">
                              {cand.note_globale ? (
                                `${cand.note_globale}/20`
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span
                                className={`text-[10px] font-medium ${
                                  cand.statut === "RETENU"
                                    ? "text-emerald-600"
                                    : cand.statut === "REFUSE"
                                      ? "text-red-500"
                                      : cand.statut === "ENTRETIEN"
                                        ? "text-orange-500"
                                        : cand.statut === "EN_COURS"
                                          ? "text-blue-600"
                                          : "text-amber-600"
                                }`}
                              >
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
                <p className="text-xs italic text-slate-400 text-center py-4">
                  Aucun candidat n'a postulé.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÉDITION */}
      {editingOffre && (
        <div className={modalClass}>
          <div className="bg-white rounded-2xl p-7 max-w-xl w-full shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-5">
              Corriger l'offre
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
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
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
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
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
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
          <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-red-600 mb-1">
              Rejeter l'offre
            </h2>
            <p className="text-xs text-slate-500 mb-4">
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
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuserSubmit}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
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
