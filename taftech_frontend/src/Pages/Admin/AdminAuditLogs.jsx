import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/axiosConfig";
import { ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminErreurChargement, AdminVide } from "../../Components/AdminEtat";
import SkeletonTableRows from "../../Components/SkeletonTableRows";

const ACTION_LABELS = {
  APPROUVER_OFFRE: { label: "Approuver offre", color: tw.auditActionSuccess },
  REFUSER_OFFRE: { label: "Refuser offre", color: tw.auditActionDanger },
  APPROUVER_ENTREPRISE: { label: "Approuver entreprise", color: tw.auditActionSuccess },
  REFUSER_ENTREPRISE: { label: "Refuser entreprise", color: tw.auditActionDanger },
  SUPPRIMER_USER: { label: "Bloquer/Débloquer user", color: tw.auditActionWarning },
  SUPPRIMER_OFFRE: { label: "Supprimer offre", color: tw.auditActionDanger },
  ACTIVER_ABONNEMENT: { label: "Activer abonnement", color: tw.auditActionSuccess },
  MODIFIER_PRIX_PALIER: { label: "Modifier prix palier", color: tw.auditActionWarning },
  STATUT_COMPETENCE: { label: "Statut compétence", color: tw.auditActionWarning },
  SUPPRIMER_ADMIN: { label: "Supprimer compte admin", color: tw.auditActionDanger },
  MODIFIER_PROMPT_IA: { label: "Modifier prompt IA", color: tw.auditActionWarning },
  MODIFIER_CONFIG_IA: { label: "Modifier config IA", color: tw.auditActionWarning },
  MODIFIER_INFOS_SOCIETE: { label: "Modifier infos société", color: tw.auditActionWarning },
  AUTRE: { label: "Autre", color: tw.auditActionNeutral },
};

const PAGE_SIZE = 20;

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [search, setSearch] = useState("");
  // Recherche "appliquée" (après debounce) — la page et la recherche pilotent un seul effet de
  // chargement. Avant : deux effets séparés, dont l'un lisait l'ancienne valeur de `page` :
  // rechercher depuis la page 3 interrogeait la page 3 des résultats filtrés.
  const [searchApplique, setSearchApplique] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setErreur(false);
    try {
      const res = await api.get(
        `jobs/admin/audit-logs/?page=${page}&page_size=${PAGE_SIZE}&search=${encodeURIComponent(searchApplique)}`,
      );
      setLogs(res.data.results || []);
      setTotalCount(res.data.count || 0);
      setHasNext(!!res.data.next);
      setHasPrev(!!res.data.previous);
    } catch (err) {
      reportError("ECHEC_GET_AUDIT_LOGS_ADMIN", err);
      setLogs([]);
      setErreur(true);
    } finally {
      setLoading(false);
    }
  }, [page, searchApplique]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setSearchApplique(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(delay);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={ShieldCheck}
        color="slate"
        title="Journal d'audit"
        subtitle={totalCount > 0 ? `${totalCount} action${totalCount > 1 ? "s" : ""} d'administration tracée${totalCount > 1 ? "s" : ""}` : "Traçabilité des actions d'administration"}
        aideKey="audit"
        aide={[
          "Chaque action sensible d'un admin (approbation/refus d'offre ou d'entreprise, blocage d'utilisateur, suppression d'offre…) est enregistrée avec son auteur, sa date et l'adresse IP.",
          "Ce journal est en lecture seule : il ne peut pas être modifié ni vidé depuis le panel (exigence de traçabilité, loi 18-07).",
          "La recherche porte sur le nom de l'admin, le type d'action et le détail.",
        ]}
        actions={
          <button
            onClick={fetchLogs}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${tw.borderSubtle} bg-white text-xs font-semibold ${tw.textMuted700} hover:bg-slate-50 transition-colors ${tw.focusRing}`}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
        }
      />

      <div className="relative">
        <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
        <input
          type="text"
          placeholder="Rechercher par admin, action, détail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher dans le journal d'audit"
          className={`w-full pl-9 pr-4 py-2.5 ${tw.inputColorsWhite} rounded-lg text-sm`}
        />
      </div>

      {erreur ? (
        <AdminErreurChargement message="Impossible de charger le journal d'audit." onRetry={fetchLogs} />
      ) : (
        <div className={`${tw.card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle} ${tw.textMuted} text-[10px] uppercase tracking-wider font-semibold`}>
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Admin</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Détail</th>
                  <th className="px-4 py-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tw.divideBase}`}>
                {loading && logs.length === 0 ? (
                  <SkeletonTableRows columns={5} />
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <AdminVide
                        icon={ShieldCheck}
                        titre="Aucun log trouvé."
                        texte={searchApplique ? "Aucune action ne correspond à cette recherche." : "Les actions d'administration apparaîtront ici."}
                      />
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const meta = ACTION_LABELS[log.action] || ACTION_LABELS.AUTRE;
                    return (
                      <tr key={log.id} className={tw.rowHover}>
                        <td className={`px-4 py-3 ${tw.textMuted700} whitespace-nowrap text-xs`}>{log.date}</td>
                        <td className={`px-4 py-3 font-medium ${tw.textStrong}`}>{log.admin}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${tw.textMuted700} text-xs`}>{log.detail}</td>
                        <td className={`px-4 py-3 ${tw.textMuted} font-mono text-xs`}>{log.ip || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={`flex items-center justify-between px-4 py-3 border-t ${tw.borderSubtle} ${tw.surfaceMuted}`}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev || loading}
                className={`flex items-center gap-1 px-3 py-1.5 ${tw.surface} border ${tw.borderBase} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle}`}
              >
                <ChevronLeft size={14} /> Précédent
              </button>
              <span className={`text-xs font-medium ${tw.textMuted}`}>
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext || loading}
                className={`flex items-center gap-1 px-3 py-1.5 ${tw.surface} border ${tw.borderBase} text-xs font-medium rounded-lg disabled:opacity-40 ${tw.hoverSurfaceSubtle}`}
              >
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
