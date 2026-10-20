import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import { AlertTriangle, RefreshCw, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";
import AdminPageHeader from "../../Components/AdminPageHeader";
import BoutonExportExcel from "../../Components/BoutonExportExcel";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const AdminSystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/accounts/admin/system-logs/?page=${p}`);
      setLogs(res.data.results || []);
      setTotal(res.data.count || 0);
      setTotalPages(res.data.total_pages || 1);
      setPage(res.data.page || p);
    } catch (err) {
      reportError("ADMIN_SYSTEM_LOGS_FETCH", err);
      toast.error(apiErrMsg(err, "Impossible de charger les erreurs."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(1); }, []);

  const fermerDetail = React.useCallback(() => setSelected(null), []);
  useEchapPourFermer(!!selected, fermerDetail);

  const handleClearAll = () => {
    confirmToast("Supprimer tous les logs d'erreurs ? Cette action est irréversible.", async () => {
      try {
        await api.delete("/accounts/admin/system-logs/");
        toast.success("Logs supprimés.");
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
      } catch (err) {
        reportError("ADMIN_SYSTEM_LOGS_DELETE", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  const formatDate = (ts) => new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={AlertTriangle}
        color="red"
        title="Erreurs système"
        subtitle={`${total} erreur${total > 1 ? "s" : ""} enregistrée${total > 1 ? "s" : ""}`}
        aideKey="erreurs-systeme"
        aide={[
          "Chaque erreur rencontrée par un utilisateur dans le navigateur (échec d'appel API, plantage d'écran) est remontée ici automatiquement.",
          "« Détail » affiche la page concernée, l'utilisateur, le navigateur et la trace technique : transmettez-la au développeur pour corriger.",
          "Beaucoup d'erreurs identiques d'un coup signalent souvent une panne (serveur, IA, email) plutôt qu'un bug isolé.",
          "« Tout effacer » vide la liste une fois les problèmes traités. Ce journal technique n'est pas le journal d'audit.",
        ]}
        actions={
          <>
            <BoutonExportExcel ressource="erreurs-systeme" nomFichier="erreurs_systeme_taftech" />
            <button
              onClick={() => fetchLogs(page)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${tw.borderSubtle} bg-white text-xs font-semibold ${tw.textMuted700} hover:bg-slate-50 transition-colors ${tw.focusRing}`}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
            </button>
            {total > 0 && (
              <button
                onClick={handleClearAll}
                className={`inline-flex items-center gap-1.5 px-3 py-2 ${tw.dangerPillSoft} rounded-lg text-xs font-semibold ${tw.focusRing}`}
              >
                <Trash2 size={14} /> Tout effacer
              </button>
            )}
          </>
        }
      />

      {/* Tableau */}
      <div className={`${tw.card} overflow-hidden`}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={22} />
            </div>
            <p className={`text-sm font-semibold ${tw.textStrong}`}>Aucune erreur enregistrée — tout va bien !</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr>
                <th className={`text-left px-4 py-3 text-xs font-semibold ${tw.textMuted} uppercase`}>Date</th>
                <th className={`text-left px-4 py-3 text-xs font-semibold ${tw.textMuted} uppercase`}>Message</th>
                <th className={`text-left px-4 py-3 text-xs font-semibold ${tw.textMuted} uppercase`}>URL</th>
                <th className={`text-left px-4 py-3 text-xs font-semibold ${tw.textMuted} uppercase`}>User</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase}`}>
              {logs.map((log) => (
                <tr key={log.id} className={tw.rowHover}>
                  <td className={`px-4 py-3 ${tw.textMuted700} whitespace-nowrap`}>{formatDate(log.timestamp)}</td>
                  <td className={`px-4 py-3 ${tw.textStrong} font-medium max-w-xs truncate`}>{log.message}</td>
                  <td className={`px-4 py-3 ${tw.textMuted700} max-w-xs truncate`}>{log.url}</td>
                  <td className={`px-4 py-3 ${tw.textMuted700}`}>{log.user ? log.user : <span className={tw.textMuted}>Anonyme</span>}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(log)}
                      className={`text-xs ${tw.textPrimary} hover:underline font-medium ${tw.focusRing} rounded`}
                    >
                      Détail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between text-sm ${tw.textMuted700}`}>
          <span>Page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1}
              className={`flex items-center gap-1 px-3 py-1.5 ${tw.surfaceMuted} rounded-lg ${tw.hoverSurfaceSubtleStrong} disabled:opacity-40`}
            >
              <ChevronLeft size={14} /> Préc.
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages}
              className={`flex items-center gap-1 px-3 py-1.5 ${tw.surfaceMuted} rounded-lg ${tw.hoverSurfaceSubtleStrong} disabled:opacity-40`}
            >
              Suiv. <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <div className={tw.modalOverlay + " p-4"} onClick={(e) => e.target === e.currentTarget && fermerDetail()}>
          <div role="dialog" aria-modal="true" aria-label="Détail de l'erreur" className={`${tw.surface} rounded-xl border ${tw.borderBase} w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${tw.borderSubtle}`}>
              <h2 className={`font-bold ${tw.textStrong}`}>Détail de l'erreur</h2>
              <button onClick={fermerDetail} aria-label="Fermer" className={`${tw.iconButtonHoverNeutral} rounded-lg p-1 ${tw.focusRing}`}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div>
                <p className={`text-xs font-semibold ${tw.textMuted} uppercase mb-1`}>Date</p>
                <p className={tw.textMuted700}>{formatDate(selected.timestamp)}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold ${tw.textMuted} uppercase mb-1`}>Message</p>
                <p className={`${tw.textStrong} font-medium`}>{selected.message}</p>
              </div>
              {selected.details && (
                <div>
                  <p className={`text-xs font-semibold ${tw.textMuted} uppercase mb-1`}>Détails</p>
                  <p className={tw.textMuted700}>{selected.details}</p>
                </div>
              )}
              <div>
                <p className={`text-xs font-semibold ${tw.textMuted} uppercase mb-1`}>URL</p>
                <p className={`${tw.textMuted700} break-all`}>{selected.url}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold ${tw.textMuted} uppercase mb-1`}>Utilisateur</p>
                <p className={tw.textMuted700}>{selected.user || "Anonyme"}</p>
              </div>
              {selected.stack_trace && (
                <div>
                  <p className={`text-xs font-semibold ${tw.textMuted} uppercase mb-1`}>Stack Trace</p>
                  <pre className="bg-slate-900 text-emerald-400 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                    {selected.stack_trace}
                  </pre>
                </div>
              )}
              {selected.user_agent && (
                <div>
                  <p className={`text-xs font-semibold ${tw.textMuted} uppercase mb-1`}>User Agent</p>
                  <p className={`${tw.textMuted700} text-xs break-all`}>{selected.user_agent}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemLogs;
