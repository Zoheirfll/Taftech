import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import { AlertTriangle, RefreshCw, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";

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
      setLogs(res.data.results);
      setTotal(res.data.count);
      setTotalPages(res.data.total_pages);
      setPage(res.data.page);
    } catch (err) {
      reportError("ADMIN_SYSTEM_LOGS_FETCH", err);
      toast.error("Impossible de charger les erreurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(1); }, []);

  const handleClearAll = async () => {
    if (!window.confirm("Supprimer tous les logs d'erreurs ? Cette action est irréversible.")) return;
    try {
      await api.delete("/accounts/admin/system-logs/");
      toast.success("Logs supprimés.");
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } catch (err) {
      reportError("ADMIN_SYSTEM_LOGS_DELETE", err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const formatDate = (ts) => new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <AlertTriangle size={22} className="text-red-500" />
            Erreurs Système
          </h1>
          <p className="text-sm text-slate-500 mt-1">{total} erreur{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchLogs(page)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium"
          >
            <RefreshCw size={14} /> Actualiser
          </button>
          {total > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
            >
              <Trash2 size={14} /> Tout effacer
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune erreur enregistrée — tout va bien !</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Message</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                  <td className="px-4 py-3 text-slate-900 font-medium max-w-xs truncate">{log.message}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{log.url}</td>
                  <td className="px-4 py-3 text-slate-500">{log.user ? log.user : <span className="text-slate-300">Anonyme</span>}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(log)}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      Détail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Préc.
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40"
            >
              Suiv. <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-900">Détail de l'erreur</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Date</p>
                <p className="text-slate-700">{formatDate(selected.timestamp)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Message</p>
                <p className="text-slate-900 font-medium">{selected.message}</p>
              </div>
              {selected.details && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Détails</p>
                  <p className="text-slate-700">{selected.details}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">URL</p>
                <p className="text-slate-700 break-all">{selected.url}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Utilisateur</p>
                <p className="text-slate-700">{selected.user || "Anonyme"}</p>
              </div>
              {selected.stack_trace && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Stack Trace</p>
                  <pre className="bg-slate-900 text-emerald-400 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                    {selected.stack_trace}
                  </pre>
                </div>
              )}
              {selected.user_agent && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">User Agent</p>
                  <p className="text-slate-500 text-xs break-all">{selected.user_agent}</p>
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
