import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, TrendingUp, ExternalLink, RefreshCw } from "lucide-react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";

const AdminSeo = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = async () => {
    setLoading(true);
    setErreur("");
    try {
      const res = await jobsService.getAdminSeoStats();
      setData(res);
    } catch (err) {
      reportError("ECHEC_CHARGEMENT_ADMIN_SEO", err);
      setErreur("Impossible de charger les données SEO.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const pages = data?.pages || [];
  const nbOk = pages.filter((p) => p.ok).length;
  const toutOk = pages.length > 0 && nbOk === pages.length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={tw.pageTitle}>SEO</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            URLs générées automatiquement et pages réellement indexables, calculées en direct.
          </p>
        </div>
        <button
          onClick={charger}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {erreur && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-sm text-red-700">
          {erreur}
        </div>
      )}

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Type de page</th>
                <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Exemple d'URL</th>
                <th className={`text-right px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Pages indexables</th>
                <th className={`text-right px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">
                    Chargement...
                  </td>
                </tr>
              )}
              {pages.map(({ type, url, nb_pages_indexables, ok }) => (
                <tr key={type} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">{type}</td>
                  <td className="px-5 py-3 text-sm text-indigo-600 font-mono break-all">
                    {url || <span className="text-slate-400 italic">Aucune page publiée</span>}
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-slate-700 font-semibold">{nb_pages_indexables}</td>
                  <td className="px-5 py-3 text-right">
                    {ok ? (
                      <CheckCircle2 size={18} className="text-emerald-600 inline-block" />
                    ) : (
                      <AlertTriangle size={18} className="text-amber-500 inline-block" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && (
        <div className={`${tw.card} px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm`}>
          <a
            href={data.sitemap_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-indigo-600 font-semibold hover:underline"
          >
            <ExternalLink size={14} /> Voir le sitemap.xml
          </a>
          <a
            href={data.robots_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-indigo-600 font-semibold hover:underline"
          >
            <ExternalLink size={14} /> Voir robots.txt
          </a>
          <span className="text-slate-600">
            <span className="font-semibold text-slate-900">{data.total_urls_sitemap}</span> URLs au total dans le sitemap
          </span>
        </div>
      )}

      {data && (
        <div
          className={`rounded-xl px-5 py-4 flex items-center gap-4 border ${
            toutOk ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
          }`}
        >
          {toutOk ? (
            <TrendingUp size={22} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={22} className="text-amber-600 shrink-0" />
          )}
          <p className={`text-sm ${toutOk ? "text-emerald-800" : "text-amber-800"}`}>
            {toutOk
              ? "Toutes les pages importantes ont une URL propre et au moins une page publiée, pour un meilleur référencement sur Google."
              : `${nbOk}/${pages.length} types de page ont du contenu publié — les types marqués ⚠️ n'ont aucune page à indexer pour l'instant.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminSeo;
