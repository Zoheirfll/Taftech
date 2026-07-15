import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import { ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";

const ACTION_LABELS = {
  APPROUVER_OFFRE: { label: "Approuver offre", color: tw.auditActionSuccess },
  REFUSER_OFFRE: { label: "Refuser offre", color: tw.auditActionDanger },
  APPROUVER_ENTREPRISE: { label: "Approuver entreprise", color: tw.auditActionSuccess },
  REFUSER_ENTREPRISE: { label: "Refuser entreprise", color: tw.auditActionDanger },
  SUPPRIMER_USER: { label: "Bloquer/Débloquer user", color: tw.auditActionWarning },
  SUPPRIMER_OFFRE: { label: "Supprimer offre", color: tw.auditActionDanger },
  AUTRE: { label: "Autre", color: tw.auditActionNeutral },
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
          <ShieldCheck size={22} className={tw.textPrimary} />
          <h1 className={`${tw.pageTitlePetit}`}>Journal d'audit</h1>
          {totalCount > 0 && (
            <span className={`text-xs ${tw.badgeNeutral} rounded-full`}>
              {totalCount} entrées
            </span>
          )}
        </div>
        <button
          onClick={() => { setPage(1); fetchLogs(); }}
          className={`flex items-center gap-2 text-sm ${tw.textMutedHoverPrimary} transition`}
        >
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      <input
        type="text"
        placeholder="Rechercher par admin, action, détail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`w-full mb-4 ${tw.input} px-4 py-2`}
      />

      {loading ? (
        <p className={`${tw.textMuted} text-sm`}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className={`${tw.textMuted} text-sm`}>Aucun log trouvé.</p>
      ) : (
        <>
          <div className={`${tw.surface} rounded-xl shadow-sm ${tw.borderSubtle} border overflow-hidden`}>
            <table className="w-full text-sm">
              <thead className={`${tw.surfaceMuted} ${tw.textMuted} text-xs uppercase tracking-wide`}>
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Admin</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Détail</th>
                  <th className="px-4 py-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody className={tw.divideBase}>
                {filtered.map((log) => {
                  const meta = ACTION_LABELS[log.action] || ACTION_LABELS.AUTRE;
                  return (
                    <tr key={log.id} className={tw.rowHover}>
                      <td className={`px-4 py-3 ${tw.textMuted700} whitespace-nowrap`}>{log.date}</td>
                      <td className={`px-4 py-3 font-medium ${tw.textMuted700}`}>{log.admin}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${tw.textMuted}`}>{log.detail}</td>
                      <td className={`px-4 py-3 ${tw.textMuted} font-mono text-xs`}>{log.ip || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className={`text-sm ${tw.textMuted700}`}>
                Page {page} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  disabled={!prevUrl}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm ${tw.borderBase} border rounded-lg disabled:opacity-40 ${tw.rowHover}`}
                >
                  <ChevronLeft size={14} /> Précédent
                </button>
                <button
                  onClick={handleNext}
                  disabled={!nextUrl}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm ${tw.borderBase} border rounded-lg disabled:opacity-40 ${tw.rowHover}`}
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
