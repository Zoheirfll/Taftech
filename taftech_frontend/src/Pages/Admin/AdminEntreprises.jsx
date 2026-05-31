import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { Search, Download, X } from "lucide-react";

const AdminEntreprises = () => {
  const [entreprises, setEntreprises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const chargerEntreprises = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminEntreprises(
        currentPage,
        searchTerm,
      );
      setEntreprises(data.results || []);
      setTotalPages(Math.ceil(data.count / 5) || 1);
    } catch (err) {
      toast.error("Erreur de chargement.");
      reportError("ECHEC_CHARGEMENT_ENTREPRISES_ADMIN", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const delay = setTimeout(() => chargerEntreprises(), 300);
    return () => clearTimeout(delay);
  }, [chargerEntreprises]);

  const handleToggleApprobation = async (id, statutActuel) => {
    if (
      window.confirm(
        `Voulez-vous vraiment ${statutActuel ? "suspendre" : "approuver"} cette entreprise ?`,
      )
    ) {
      try {
        await jobsService.moderateEntreprise(id, {
          est_approuvee: !statutActuel,
        });
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
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1 || loading}
          className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
        >
          ← Précédent
        </button>
        <span className="text-xs font-medium text-slate-600">
          Page {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || loading}
          className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
        >
          Suivant →
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Validation des entreprises
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Approuvez ou suspendez les entreprises inscrites.
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
              placeholder="Rechercher par nom ou RC..."
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
              <th className="px-5 py-3">Entreprise</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && entreprises.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="py-12 text-center text-sm text-indigo-600 animate-pulse font-medium"
                >
                  Chargement...
                </td>
              </tr>
            ) : (
              entreprises.map((ent) => (
                <tr
                  key={ent.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {ent.nom_entreprise}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ent.secteur_activite}
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      RC: {ent.registre_commerce}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-800">
                      {ent.last_name} {ent.first_name}
                    </p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      {ent.email}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {ent.est_approuvee ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-full">
                        ✓ Vérifiée
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold rounded-full">
                        ⏳ En attente
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedEntreprise(ent)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() =>
                        handleToggleApprobation(ent.id, ent.est_approuvee)
                      }
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ent.est_approuvee ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                    >
                      {ent.est_approuvee ? "Bloquer" : "Approuver"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination />
      </div>

      {selectedEntreprise && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 max-w-xl w-full shadow-2xl">
            <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedEntreprise.nom_entreprise}
                </h2>
                <p className="text-sm text-indigo-600 mt-0.5">
                  📍 {selectedEntreprise.wilaya_siege}
                  {selectedEntreprise.commune_siege
                    ? ` · ${selectedEntreprise.commune_siege}`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedEntreprise(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Informations légales
                </p>
                <p className="text-xs font-mono text-slate-800 bg-white border border-slate-200 px-2 py-1.5 rounded">
                  RC: {selectedEntreprise.registre_commerce}
                </p>
                <p className="text-xs font-medium text-slate-600 mt-2">
                  {selectedEntreprise.secteur_activite}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Contact recruteur
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedEntreprise.last_name} {selectedEntreprise.first_name}
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  {selectedEntreprise.email}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedEntreprise.telephone}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Présentation
              </p>
              <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line">
                {selectedEntreprise.description ||
                  "Aucune présentation fournie."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEntreprises;
