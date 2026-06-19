import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import { ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { reportError } from "../../utils/errorReporter";

const ACTION_LABELS = {
  APPROUVER_OFFRE: { label: "Approuver offre", color: "bg-green-100 text-green-700" },
  REFUSER_OFFRE: { label: "Refuser offre", color: "bg-red-100 text-red-700" },
  APPROUVER_ENTREPRISE: { label: "Approuver entreprise", color: "bg-green-100 text-green-700" },
  REFUSER_ENTREPRISE: { label: "Refuser entreprise", color: "bg-red-100 text-red-700" },
  SUPPRIMER_USER: { label: "Bloquer/Débloquer user", color: "bg-orange-100 text-orange-700" },
  SUPPRIMER_OFFRE: { label: "Supprimer offre", color: "bg-red-100 text-red-700" },
  AUTRE: { label: "Autre", color: "bg-slate-100 text-slate-600" },
};

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);
  const PAGE_SIZE = 20;

  const fetchLogs = async (url = null) => {
    setLoading(true);
    try {
      const res = url
        ? await api.get(url)
        : await api.get(`jobs/admin/audit-logs/?page=${page}&page_size=${PAGE_SIZE}`);
      setLogs(res.data.results || []);
      setTotalCount(res.data.count || 0);
      setNextUrl(res.data.next);
      setPrevUrl(res.data.previous);
    } catch (err) {
      reportError("ECHEC_GET_AUDIT_LOGS_ADMIN", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const handleNext = () => { setPage((p) => p + 1); };
  const handlePrev = () => { setPage((p) => Math.max(1, p - 1)); };

  const filtered = logs.filter((l) =>
    search === "" ||
    l.admin.toLowerCase().includes(search.toLowerCase()) ||
    l.detail.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} className="text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-800">Journal d'audit</h1>
          {totalCount > 0 && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {totalCount} entrées
            </span>
          )}
        </div>
        <button
          onClick={() => { setPage(1); fetchLogs(); }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition"
        >
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      <input
        type="text"
        placeholder="Rechercher par admin, action, détail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />

      {loading ? (
        <p className="text-slate-600 text-sm">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-600 text-sm">Aucun log trouvé.</p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Admin</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Détail</th>
                  <th className="px-4 py-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => {
                  const meta = ACTION_LABELS[log.action] || ACTION_LABELS.AUTRE;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{log.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{log.admin}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.detail}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{log.ip || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-700">
                Page {page} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  disabled={!prevUrl}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  <ChevronLeft size={14} /> Précédent
                </button>
                <button
                  onClick={handleNext}
                  disabled={!nextUrl}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  Suivant <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminAuditLogs;
